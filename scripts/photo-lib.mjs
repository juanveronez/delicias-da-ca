// Pure helpers for the photo converter (scripts/prepare-photos.mjs).
// Nothing here touches the disk or spawns processes, so it can be unit tested.

// Largest accepted WebP file, in bytes. Keep in sync with MAX_BYTES in tests/photos.test.js
// (tests/photo-lib.test.js fails when the two drift apart).
export const MAX_BYTES = 200 * 1024;

// Longest side, in pixels, of the converted photos. Photos are only ever shrunk to it.
export const MAX_SIDE = { cake: 800, hero: 1200 };

export const WEBP_QUALITY = 80;

// Extensions (lower case, without the dot) accepted for the source photos.
export const SOURCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic'];

// Base name of the photo shown at the top of the page, in addition to the cake ids.
export const HERO_ID = 'hero';

/**
 * True only when the longest side is strictly larger than `maxSide`.
 * Photos are never enlarged, and a side of exactly `maxSide` is left alone.
 */
export function needsResize(width, height, maxSide) {
  return Math.max(width, height) > maxSide;
}

const BMP_FILE_HEADER_BYTES = 14;
const BMP_INFO_HEADER_BYTES = 40;
const BI_RGB = 0;
const BI_BITFIELDS = 3;

/**
 * Reads an uncompressed 24-bit or 32-bit BMP (BITMAPINFOHEADER or later; 32-bit files may
 * also use BI_BITFIELDS with the usual BGRA masks, which is what sips writes for images
 * with transparency) and returns the mean and maximum luminance (0.299 R + 0.587 G +
 * 0.114 B, 0..255) of every row and every column. Rows and columns are numbered from the
 * top-left corner of the picture, whether the file is stored bottom-up (positive height)
 * or top-down (negative height). The alpha channel of 32-bit files is ignored.
 */
export function parseBmp(buffer) {
  if (buffer.length < 2 || buffer[0] !== 0x42 || buffer[1] !== 0x4d) {
    throw new Error('Not a BMP file (bad signature)');
  }
  if (buffer.length < BMP_FILE_HEADER_BYTES + BMP_INFO_HEADER_BYTES) {
    throw new Error('BMP is truncated: the header is incomplete');
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const dataOffset = view.getUint32(10, true);
  const headerSize = view.getUint32(14, true);
  const width = view.getInt32(18, true);
  const signedHeight = view.getInt32(22, true);
  const bitsPerPixel = view.getUint16(28, true);
  const compression = view.getUint32(30, true);

  if (headerSize < BMP_INFO_HEADER_BYTES) {
    throw new Error(`Unsupported BMP: ${headerSize}-byte header (BITMAPINFOHEADER or later is required)`);
  }
  if (compression !== BI_RGB && compression !== BI_BITFIELDS) {
    throw new Error(`Unsupported BMP: compressed pixel data (compression type ${compression})`);
  }
  if (bitsPerPixel !== 24 && bitsPerPixel !== 32) {
    throw new Error(`Unsupported BMP: ${bitsPerPixel} bits per pixel (only 24 and 32 are supported)`);
  }
  if (compression === BI_BITFIELDS) {
    // sips writes this for images with an alpha channel: 32 bits with explicit channel masks.
    if (bitsPerPixel !== 32) {
      throw new Error('Unsupported BMP: BI_BITFIELDS is only supported with 32 bits per pixel');
    }
    if (buffer.length < BMP_FILE_HEADER_BYTES + BMP_INFO_HEADER_BYTES + 12) {
      throw new Error('BMP is truncated: the channel masks are missing');
    }
    const [red, green, blue] = [54, 58, 62].map((at) => view.getUint32(at, true));
    if (red !== 0x00ff0000 || green !== 0x0000ff00 || blue !== 0x000000ff) {
      throw new Error(
        `Unsupported BMP: unusual channel masks (red ${red.toString(16)}, green ${green.toString(16)}, blue ${blue.toString(16)}); only BGRA is supported`,
      );
    }
  }
  if (width <= 0 || signedHeight === 0) {
    throw new Error(`Invalid BMP dimensions: ${width}x${signedHeight}`);
  }

  const height = Math.abs(signedHeight);
  const topDown = signedHeight < 0;
  const bytesPerPixel = bitsPerPixel / 8;
  const stride = Math.floor((bitsPerPixel * width + 31) / 32) * 4; // rows are padded to 4 bytes
  const required = dataOffset + stride * height;
  if (buffer.length < required) {
    throw new Error(`BMP is truncated: pixel data needs ${required} bytes but the file has ${buffer.length}`);
  }

  const rowSums = new Float64Array(height);
  const rowMaxes = new Float64Array(height);
  const colSums = new Float64Array(width);
  const colMaxes = new Float64Array(width);
  for (let y = 0; y < height; y += 1) {
    let position = dataOffset + (topDown ? y : height - 1 - y) * stride;
    let rowSum = 0;
    let rowMax = 0;
    for (let x = 0; x < width; x += 1) {
      // Pixels are stored as blue, green, red (and alpha for 32 bits).
      const luminance = 0.299 * buffer[position + 2] + 0.587 * buffer[position + 1] + 0.114 * buffer[position];
      position += bytesPerPixel;
      rowSum += luminance;
      colSums[x] += luminance;
      if (luminance > rowMax) rowMax = luminance;
      if (luminance > colMaxes[x]) colMaxes[x] = luminance;
    }
    rowSums[y] = rowSum;
    rowMaxes[y] = rowMax;
  }

  return {
    width,
    height,
    rowMeans: Array.from(rowSums, (sum) => sum / width),
    colMeans: Array.from(colSums, (sum) => sum / height),
    rowMaxes: Array.from(rowMaxes),
    colMaxes: Array.from(colMaxes),
  };
}

const DEFAULT_BOX_OPTIONS = {
  darkMean: 30, // a line is dark when its mean luminance is below this...
  darkMax: 70, // ...and its brightest pixel is below this (a dark photo has bright pixels)
  minBar: 8, // a run of dark lines shorter than this is not a bar
  margin: 4, // pixels trimmed inside the bright content next to each bar
  minContentRatio: 0.25, // give up when less than this share of a dimension would be left
};

// Returns the [start, end) range of the lines to keep along one axis, or null when every
// line is dark. A side without a bar of at least `minBar` lines keeps its edge.
function trimAxis(means, maxes, { darkMean, darkMax, minBar, margin }) {
  const length = means.length;
  const isDark = (index) => means[index] < darkMean && maxes[index] < darkMax;
  let leading = 0;
  while (leading < length && isDark(leading)) leading += 1;
  if (leading === length) return null;
  let trailing = 0;
  while (isDark(length - 1 - trailing)) trailing += 1;
  return {
    start: leading >= minBar ? leading + margin : 0,
    end: trailing >= minBar ? length - trailing - margin : length,
  };
}

/**
 * Finds the box that remains after removing black letterbox/pillarbox bars (typical of
 * phone screenshots). `parsed` is the result of parseBmp. The box starts `margin` pixels
 * inside the first bright line next to each bar, which drops the anti-aliased edge lines.
 * Returns the full image with `cropped: false` when there is no bar, when the image is
 * all dark, or when less than `minContentRatio` of a dimension would be left.
 * Rows and columns are judged independently of each other.
 */
export function findContentBox(parsed, options = {}) {
  const settings = { ...DEFAULT_BOX_OPTIONS, ...options };
  const { width, height } = parsed;
  const fullImage = { top: 0, left: 0, width, height, cropped: false };

  const rows = trimAxis(parsed.rowMeans, parsed.rowMaxes, settings);
  const cols = trimAxis(parsed.colMeans, parsed.colMaxes, settings);
  if (rows === null || cols === null) return fullImage;

  const top = rows.start;
  const left = cols.start;
  const contentHeight = rows.end - rows.start;
  const contentWidth = cols.end - cols.start;
  const untouched = contentHeight === height && contentWidth === width;
  const tooSmall =
    contentHeight < height * settings.minContentRatio || contentWidth < width * settings.minContentRatio;
  if (untouched || tooSmall) return fullImage;

  return { top, left, width: contentWidth, height: contentHeight, cropped: true };
}

/**
 * Returns the id a source file name stands for, or null. The file must not be hidden, must
 * have one of SOURCE_EXTENSIONS (any case), and its base name, normalized to NFC (macOS may
 * hand out decomposed accents) and lower-cased, must EQUAL one of `ids` or HERO_ID.
 */
export function imageIdFromFileName(fileName, ids) {
  if (fileName.startsWith('.')) return null;
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return null;
  if (!SOURCE_EXTENSIONS.includes(fileName.slice(dot + 1).toLowerCase())) return null;
  const baseName = fileName.slice(0, dot).normalize('NFC').toLowerCase();
  if (baseName === HERO_ID) return HERO_ID;
  return ids.find((id) => id === baseName) ?? null;
}

const RIFF_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const IMAGE_CHUNKS = ['VP8 ', 'VP8L', 'VP8X'];
const METADATA_CHUNKS = [
  { tag: 'EXIF', label: 'EXIF' },
  { tag: 'XMP ', label: 'XMP' },
];

function ascii(bytes, start, length) {
  let text = '';
  for (let i = start; i < start + length; i += 1) text += String.fromCharCode(bytes[i]);
  return text;
}

function uint32LE(bytes, at) {
  return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}

// Walks the RIFF container: "RIFF", a size, "WEBP", then chunks made of a 4-character tag,
// a little-endian size and the payload, padded to an even length.
function readWebpChunks(bytes) {
  const result = { isWebp: false, tags: [], problems: [] };
  if (bytes.length < RIFF_HEADER_BYTES || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    return result;
  }
  result.isWebp = true;

  let limit = 8 + uint32LE(bytes, 4);
  let truncated = false;
  if (limit > bytes.length) {
    result.problems.push(`truncated: the RIFF header declares ${limit} bytes but the file has ${bytes.length}`);
    limit = bytes.length;
    truncated = true;
  } else if (limit < bytes.length) {
    result.problems.push(`${bytes.length - limit} trailing byte(s) after the end of the RIFF data`);
  }

  let offset = RIFF_HEADER_BYTES;
  while (offset < limit) {
    if (offset + CHUNK_HEADER_BYTES > limit) {
      result.problems.push(`${limit - offset} stray byte(s) after the last chunk`);
      break;
    }
    const tag = ascii(bytes, offset, 4);
    const size = uint32LE(bytes, offset + 4);
    const dataEnd = offset + CHUNK_HEADER_BYTES + size;
    result.tags.push(tag);
    if (dataEnd > limit) {
      if (!truncated) {
        result.problems.push(`chunk "${tag}" is truncated: it declares ${size} bytes but only ${limit - offset - CHUNK_HEADER_BYTES} remain`);
      }
      break;
    }
    const paddedEnd = dataEnd + (size % 2);
    if (paddedEnd > limit) {
      result.problems.push(`chunk "${tag}" is missing its padding byte (truncated file)`);
      break;
    }
    offset = paddedEnd;
  }
  return result;
}

/** Lists the chunk tags of a WebP file, in order. Empty when `bytes` is not a RIFF/WEBP file. */
export function webpChunkTags(bytes) {
  return readWebpChunks(bytes).tags;
}

/**
 * Validates a WebP file and returns the list of problems found (empty means OK): not a
 * RIFF/WEBP container, damaged chunk sizes, EXIF or XMP metadata, no image chunk, or more
 * than `maxBytes` bytes.
 */
export function checkWebp(bytes, options = {}) {
  const { maxBytes = MAX_BYTES } = options;
  const { isWebp, tags, problems: containerProblems } = readWebpChunks(bytes);
  const problems = [];

  if (!isWebp) {
    problems.push('not a RIFF/WEBP file');
  } else {
    problems.push(...containerProblems);
    for (const { tag, label } of METADATA_CHUNKS) {
      if (tags.includes(tag)) problems.push(`contains ${label} metadata (chunk "${tag}")`);
    }
    if (!tags.some((tag) => IMAGE_CHUNKS.includes(tag))) {
      problems.push(`no image chunk (${IMAGE_CHUNKS.map((tag) => `"${tag}"`).join(', ')}) found`);
    }
  }
  if (bytes.length > maxBytes) {
    problems.push(`larger than the limit of ${maxBytes} bytes (it has ${bytes.length})`);
  }
  return problems;
}
