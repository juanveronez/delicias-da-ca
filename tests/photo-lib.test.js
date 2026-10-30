import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BYTES,
  MAX_SIDE,
  WEBP_QUALITY,
  SOURCE_EXTENSIONS,
  HERO_ID,
  needsResize,
  parseBmp,
  findContentBox,
  imageIdFromFileName,
  checkWebp,
  webpChunkTags,
} from '../scripts/photo-lib.mjs';

// ---------------------------------------------------------------------------
// Helpers that build synthetic inputs
// ---------------------------------------------------------------------------

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message ?? 'value'}: expected ${expected}, got ${actual}`);
}

// Builds an uncompressed BMP with a BITMAPINFOHEADER. `pixel(x, y)` returns
// [r, g, b] for the column x and the row y in image order (y = 0 is the top).
// Row padding bytes are filled with 0xFF so a parser that reads them gets wrong numbers.
// With `bitfields` it writes the 124-byte BITMAPV5HEADER and the channel masks that sips
// produces for images with an alpha channel (32 bits, compression BI_BITFIELDS).
function buildBmp({ width, height, bitsPerPixel = 24, topDown = false, bitfields = false, pixel }) {
  const bytesPerPixel = bitsPerPixel / 8;
  const stride = Math.ceil((width * bitsPerPixel) / 32) * 4;
  const dataOffset = bitfields ? 14 + 124 : 54;
  const buffer = Buffer.alloc(dataOffset + stride * height, 0xff);
  buffer.write('BM', 0, 'ascii');
  buffer.writeUInt32LE(buffer.length, 2);
  buffer.writeUInt32LE(0, 6);
  buffer.writeUInt32LE(dataOffset, 10);
  buffer.writeUInt32LE(bitfields ? 124 : 40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(topDown ? -height : height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(bitsPerPixel, 28);
  buffer.writeUInt32LE(bitfields ? 3 : 0, 30);
  buffer.writeUInt32LE(stride * height, 34);
  if (bitfields) {
    buffer.writeUInt32LE(0x00ff0000, 54); // red mask
    buffer.writeUInt32LE(0x0000ff00, 58); // green mask
    buffer.writeUInt32LE(0x000000ff, 62); // blue mask
    buffer.writeUInt32LE(0xff000000, 66); // alpha mask
  }
  for (let y = 0; y < height; y += 1) {
    const fileRow = topDown ? y : height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      const at = dataOffset + fileRow * stride + x * bytesPerPixel;
      buffer[at] = b;
      buffer[at + 1] = g;
      buffer[at + 2] = r;
      if (bytesPerPixel === 4) buffer[at + 3] = 77; // alpha: must be ignored
    }
  }
  return buffer;
}

const gray = (value) => [value, value, value];

// Per-line statistics for findContentBox. `spans` is a list of [from, to, { mean, max }]
// (inclusive); every line not covered by a span is bright content.
const DARK = { mean: 0, max: 0 };
const BRIGHT = { mean: 180, max: 255 };

function axis(length, spans = []) {
  const means = new Array(length).fill(BRIGHT.mean);
  const maxes = new Array(length).fill(BRIGHT.max);
  for (const [from, to, line] of spans) {
    for (let i = from; i <= to; i += 1) {
      means[i] = line.mean;
      maxes[i] = line.max;
    }
  }
  return { means, maxes };
}

function statsFor({ width, height, rowSpans = [], colSpans = [] }) {
  const rows = axis(height, rowSpans);
  const cols = axis(width, colSpans);
  return {
    width,
    height,
    rowMeans: rows.means,
    rowMaxes: rows.maxes,
    colMeans: cols.means,
    colMaxes: cols.maxes,
  };
}

const FULL = (width, height) => ({ top: 0, left: 0, width, height, cropped: false });

// A minimal WebP: RIFF container whose chunks are built by the caller. The chunk
// payloads are never decoded, so zero-filled payloads are enough.
function chunk(tag, payloadSize) {
  const header = Buffer.alloc(8);
  header.write(tag, 0, 'ascii');
  header.writeUInt32LE(payloadSize, 4);
  return Buffer.concat([header, Buffer.alloc(payloadSize + (payloadSize % 2))]);
}

function webp(...chunks) {
  const body = Buffer.concat([Buffer.from('WEBP', 'ascii'), ...chunks]);
  const header = Buffer.alloc(8);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

const hasProblem = (problems, pattern) => problems.some((problem) => pattern.test(problem));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

test('constants hold the agreed limits', () => {
  assert.equal(MAX_BYTES, 200 * 1024);
  assert.deepEqual(MAX_SIDE, { cake: 800, hero: 1200 });
  assert.equal(WEBP_QUALITY, 80);
  assert.deepEqual(SOURCE_EXTENSIONS, ['jpg', 'jpeg', 'png', 'heic']);
  assert.equal(HERO_ID, 'hero');
});

// ---------------------------------------------------------------------------
// needsResize
// ---------------------------------------------------------------------------

test('needsResize never resizes a longest side of exactly the limit, or a smaller photo', () => {
  assert.equal(needsResize(800, 600, 800), false);
  assert.equal(needsResize(600, 800, 800), false);
  assert.equal(needsResize(720, 688, 800), false);
});

test('needsResize resizes from one pixel above the limit', () => {
  assert.equal(needsResize(801, 600, 800), true);
  assert.equal(needsResize(1125, 1077, 800), true);
});

test('needsResize treats portrait and landscape the same way', () => {
  assert.equal(needsResize(600, 1000, 800), needsResize(1000, 600, 800));
  assert.equal(needsResize(601, 801, MAX_SIDE.cake), true);
  assert.equal(needsResize(1100, 900, MAX_SIDE.hero), false);
});

// ---------------------------------------------------------------------------
// parseBmp
// ---------------------------------------------------------------------------

test('parseBmp reads a bottom-up 24-bit BMP and reports rows from the top', () => {
  // 2x3 image. Top row white, middle row mid gray, bottom row black.
  const rows = [gray(255), gray(100), gray(0)];
  const bmp = buildBmp({ width: 2, height: 3, pixel: (_x, y) => rows[y] });
  const parsed = parseBmp(bmp);
  assert.equal(parsed.width, 2);
  assert.equal(parsed.height, 3);
  assertClose(parsed.rowMeans[0], 255, 'top row mean');
  assertClose(parsed.rowMeans[1], 100, 'middle row mean');
  assertClose(parsed.rowMeans[2], 0, 'bottom row mean');
  assert.deepEqual(parsed.rowMaxes.map(Math.round), [255, 100, 0]);
});

test('parseBmp reads a top-down 24-bit BMP (negative height) with the same result', () => {
  const rows = [gray(255), gray(100), gray(0)];
  const pixel = (_x, y) => rows[y];
  const bottomUp = parseBmp(buildBmp({ width: 2, height: 3, pixel }));
  const topDown = parseBmp(buildBmp({ width: 2, height: 3, topDown: true, pixel }));
  assert.equal(topDown.height, 3);
  assert.deepEqual(topDown, bottomUp);
});

test('parseBmp reads a 32-bit BMP and ignores the alpha channel', () => {
  const bmp = buildBmp({ width: 3, height: 2, bitsPerPixel: 32, pixel: (_x, y) => gray(y === 0 ? 200 : 40) });
  const parsed = parseBmp(bmp);
  assert.equal(parsed.width, 3);
  assert.equal(parsed.height, 2);
  assertClose(parsed.rowMeans[0], 200, 'top row mean');
  assertClose(parsed.rowMeans[1], 40, 'bottom row mean');
  assertClose(parsed.colMeans[1], 120, 'column mean');
});

test('parseBmp weights the channels as 0.299 R + 0.587 G + 0.114 B', () => {
  const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
  const parsed = parseBmp(buildBmp({ width: 3, height: 1, pixel: (x) => colors[x] }));
  assertClose(parsed.colMeans[0], 0.299 * 255, 'red');
  assertClose(parsed.colMeans[1], 0.587 * 255, 'green');
  assertClose(parsed.colMeans[2], 0.114 * 255, 'blue');
});

test('parseBmp skips the row padding when the width is not a multiple of 4', () => {
  // 5 pixels of 24 bits = 15 bytes per row, padded to 16 with 0xFF bytes.
  const bmp = buildBmp({ width: 5, height: 2, pixel: (_x, y) => gray(y === 0 ? 10 : 20) });
  const parsed = parseBmp(bmp);
  assert.equal(parsed.width, 5);
  assertClose(parsed.rowMeans[0], 10, 'top row mean');
  assertClose(parsed.rowMeans[1], 20, 'bottom row mean');
  assertClose(parsed.rowMaxes[0], 10, 'top row max');
  assert.deepEqual(parsed.colMeans.map(Math.round), [15, 15, 15, 15, 15]);
});

test('parseBmp reports per-column mean and max luminance', () => {
  // Columns: black, white, a column with one white and one black pixel.
  const pixels = [
    [gray(0), gray(255), gray(255)],
    [gray(0), gray(255), gray(0)],
  ];
  const parsed = parseBmp(buildBmp({ width: 3, height: 2, pixel: (x, y) => pixels[y][x] }));
  assert.deepEqual(parsed.colMeans.map(Math.round), [0, 255, 128]);
  assert.deepEqual(parsed.colMaxes.map(Math.round), [0, 255, 255]);
});

test('parseBmp rejects data that is not a BMP', () => {
  const bmp = buildBmp({ width: 2, height: 2, pixel: () => gray(0) });
  bmp.write('XX', 0, 'ascii');
  assert.throws(() => parseBmp(bmp), /signature/i);
  assert.throws(() => parseBmp(Buffer.from('not an image')), /BMP/);
  assert.throws(() => parseBmp(Buffer.alloc(0)), /BMP/);
});

test('parseBmp rejects compressed BMPs', () => {
  const bmp = buildBmp({ width: 2, height: 2, pixel: () => gray(0) });
  bmp.writeUInt32LE(1, 30); // BI_RLE8
  assert.throws(() => parseBmp(bmp), /compress/i);
});

test('parseBmp reads the 32-bit BI_BITFIELDS BMP with a V5 header that sips writes for images with alpha', () => {
  const bmp = buildBmp({
    width: 3,
    height: 2,
    bitsPerPixel: 32,
    bitfields: true,
    topDown: true,
    pixel: (_x, y) => gray(y === 0 ? 200 : 40),
  });
  const parsed = parseBmp(bmp);
  assert.equal(parsed.width, 3);
  assert.equal(parsed.height, 2);
  assertClose(parsed.rowMeans[0], 200, 'top row mean');
  assertClose(parsed.rowMeans[1], 40, 'bottom row mean');
});

test('parseBmp rejects BI_BITFIELDS BMPs with unusual channel masks or fewer than 32 bits', () => {
  const swapped = buildBmp({ width: 2, height: 2, bitsPerPixel: 32, bitfields: true, pixel: () => gray(0) });
  swapped.writeUInt32LE(0x000000ff, 54); // red and blue masks swapped
  swapped.writeUInt32LE(0x00ff0000, 62);
  assert.throws(() => parseBmp(swapped), /mask/i);

  const narrow = buildBmp({ width: 2, height: 2, bitsPerPixel: 32, bitfields: true, pixel: () => gray(0) });
  narrow.writeUInt16LE(24, 28);
  assert.throws(() => parseBmp(narrow), /BI_BITFIELDS/);
});

test('parseBmp rejects BMPs with fewer than 24 bits per pixel', () => {
  for (const bitsPerPixel of [1, 8, 16]) {
    const bmp = buildBmp({ width: 2, height: 2, pixel: () => gray(0) });
    bmp.writeUInt16LE(bitsPerPixel, 28);
    assert.throws(() => parseBmp(bmp), /bits per pixel/i, `${bitsPerPixel} bpp`);
  }
});

test('parseBmp rejects a BMP whose pixel data is cut short', () => {
  const bmp = buildBmp({ width: 4, height: 4, pixel: () => gray(0) });
  assert.throws(() => parseBmp(bmp.subarray(0, bmp.length - 10)), /truncated/i);
});

// ---------------------------------------------------------------------------
// findContentBox
// ---------------------------------------------------------------------------

test('findContentBox crops the 540x1158 phone screenshot with a 4px margin (reference case, stats)', () => {
  // Black rows 0-322 and 835-1157. Rows 323 (mean 87) and 834 (mean 61) are
  // anti-aliased transition rows, which are NOT dark. Bright photo: rows 324-833.
  const parsed = statsFor({
    width: 540,
    height: 1158,
    rowSpans: [
      [0, 322, DARK],
      [323, 323, { mean: 87, max: 255 }],
      [834, 834, { mean: 61, max: 200 }],
      [835, 1157, DARK],
    ],
  });
  // The first non-dark row is 323, so top = 323 + 4. The last is 834, so the box
  // ends before row 834 - 4 + 1 = 831 (exclusive): height = 831 - 327.
  assert.deepEqual(findContentBox(parsed), { top: 327, left: 0, width: 540, height: 504, cropped: true });
});

test('findContentBox crops the same reference case read from a real BMP', () => {
  const width = 540;
  const height = 1158;
  const pixel = (x, y) => {
    if (y <= 322 || y >= 835) return gray(0);
    if (y === 323) return gray(87);
    if (y === 834) return gray(61);
    return gray(92 + ((x * 7 + y * 3) % 164)); // non-uniform bright photo, 92..255
  };
  const parsed = parseBmp(buildBmp({ width, height, pixel }));
  assertClose(parsed.rowMeans[322], 0, 'row 322');
  assertClose(parsed.rowMeans[323], 87, 'row 323');
  assertClose(parsed.rowMeans[834], 61, 'row 834');
  assertClose(parsed.rowMeans[835], 0, 'row 835');
  assert.ok(parsed.rowMeans[324] >= 92 && parsed.rowMeans[833] >= 92, 'photo rows are bright');
  assert.deepEqual(findContentBox(parsed), { top: 327, left: 0, width: 540, height: 504, cropped: true });
});

test('findContentBox leaves an image without bars untouched', () => {
  assert.deepEqual(findContentBox(statsFor({ width: 720, height: 688 })), FULL(720, 688));
});

test('findContentBox ignores a bar shorter than minBar (4) and accepts one of exactly minBar', () => {
  const shortBar = statsFor({ width: 100, height: 100, rowSpans: [[0, 2, DARK]] });
  assert.deepEqual(findContentBox(shortBar), FULL(100, 100));
  const exactBar = statsFor({ width: 100, height: 100, rowSpans: [[0, 3, DARK]] });
  assert.deepEqual(findContentBox(exactBar), { top: 8, left: 0, width: 100, height: 92, cropped: true });
});

test('findContentBox crops the thin black strips of the real hero photo (13 rows on top, 5 at the bottom)', () => {
  // Measured on the 1323x1189 hero screenshot: row 12 is almost black, row 13 is the first photo
  // row, row 1183 is a transition row and rows 1184-1188 are black. The 5-row strip is what
  // minBar 8 used to leave behind.
  const parsed = statsFor({
    width: 1323,
    height: 1189,
    rowSpans: [
      [0, 11, { mean: 1, max: 5 }],
      [12, 12, { mean: 17, max: 31 }],
      [1183, 1183, { mean: 55, max: 105 }],
      [1184, 1188, { mean: 1.5, max: 10 }],
    ],
  });
  // First non-dark row 13 -> top 17; last non-dark row 1183 -> the box ends before 1184 - 4 = 1180.
  assert.deepEqual(findContentBox(parsed), { top: 17, left: 0, width: 1323, height: 1163, cropped: true });
});

test('findContentBox does not treat a dark photo with bright pixels as a bar', () => {
  // Mean is far below darkMean but some pixels reach 200: this is a dark photo.
  const parsed = statsFor({ width: 100, height: 100, rowSpans: [[0, 29, { mean: 12, max: 200 }]] });
  assert.deepEqual(findContentBox(parsed), FULL(100, 100));
});

test('findContentBox needs both a low mean and a low max for a dark line', () => {
  const brightMean = statsFor({ width: 100, height: 100, rowSpans: [[0, 29, { mean: 30, max: 40 }]] });
  assert.deepEqual(findContentBox(brightMean), FULL(100, 100), 'mean equal to darkMean is not dark');
  const brightMax = statsFor({ width: 100, height: 100, rowSpans: [[0, 29, { mean: 5, max: 70 }]] });
  assert.deepEqual(findContentBox(brightMax), FULL(100, 100), 'max equal to darkMax is not dark');
  const darkEnough = statsFor({ width: 100, height: 100, rowSpans: [[0, 29, { mean: 29, max: 69 }]] });
  assert.equal(findContentBox(darkEnough).cropped, true);
});

test('findContentBox returns the full box for an all-dark image', () => {
  const parsed = statsFor({
    width: 100,
    height: 100,
    rowSpans: [[0, 99, DARK]],
    colSpans: [[0, 99, DARK]],
  });
  assert.deepEqual(findContentBox(parsed), FULL(100, 100));
});

test('findContentBox returns the full box when what is left is smaller than minContentRatio', () => {
  // 100 rows with only 10 bright ones in the middle: 10% of the height.
  const parsed = statsFor({ width: 100, height: 100, rowSpans: [[0, 44, DARK], [55, 99, DARK]] });
  assert.deepEqual(findContentBox(parsed), FULL(100, 100));
  // The same strip passes when the caller accepts a smaller share and a smaller margin.
  const lenient = findContentBox(parsed, { minContentRatio: 0.05, margin: 1 });
  assert.deepEqual(lenient, { top: 46, left: 0, width: 100, height: 8, cropped: true });
});

test('findContentBox also checks minContentRatio on the dimension that was not trimmed', () => {
  // Rows are fine, but the columns leave only 10 of 100 bright columns.
  const parsed = statsFor({ width: 100, height: 100, colSpans: [[0, 44, DARK], [55, 99, DARK]] });
  assert.deepEqual(findContentBox(parsed), FULL(100, 100));
});

test('findContentBox crops pillarbox bars on the columns', () => {
  const parsed = statsFor({ width: 600, height: 400, colSpans: [[0, 99, DARK], [500, 599, DARK]] });
  // First bright column 100 -> left 104; last bright column 499 -> end (exclusive) 496.
  assert.deepEqual(findContentBox(parsed), { top: 0, left: 104, width: 392, height: 400, cropped: true });
});

test('findContentBox crops bars on one side only and leaves the other side alone', () => {
  const topOnly = statsFor({ width: 100, height: 400, rowSpans: [[0, 49, DARK]] });
  assert.deepEqual(findContentBox(topOnly), { top: 54, left: 0, width: 100, height: 346, cropped: true });
  const bottomOnly = statsFor({ width: 100, height: 400, rowSpans: [[350, 399, DARK]] });
  assert.deepEqual(findContentBox(bottomOnly), { top: 0, left: 0, width: 100, height: 346, cropped: true });
  const leftOnly = statsFor({ width: 400, height: 100, colSpans: [[0, 49, DARK]] });
  assert.deepEqual(findContentBox(leftOnly), { top: 0, left: 54, width: 346, height: 100, cropped: true });
  const rightOnly = statsFor({ width: 400, height: 100, colSpans: [[350, 399, DARK]] });
  assert.deepEqual(findContentBox(rightOnly), { top: 0, left: 0, width: 346, height: 100, cropped: true });
});

test('findContentBox crops letterbox and pillarbox bars together', () => {
  const parsed = statsFor({
    width: 600,
    height: 400,
    rowSpans: [[0, 29, DARK], [370, 399, DARK]],
    colSpans: [[0, 49, DARK], [550, 599, DARK]],
  });
  // Rows: first bright 30 -> top 34, last bright 369 -> end 366. Columns: 50 -> 54, 549 -> end 546.
  assert.deepEqual(findContentBox(parsed), { top: 34, left: 54, width: 492, height: 332, cropped: true });
});

test('findContentBox accepts partial options and keeps the other defaults', () => {
  const reference = statsFor({
    width: 540,
    height: 1158,
    rowSpans: [
      [0, 322, DARK],
      [323, 323, { mean: 87, max: 255 }],
      [834, 834, { mean: 61, max: 200 }],
      [835, 1157, DARK],
    ],
  });
  assert.deepEqual(findContentBox(reference, { margin: 0 }), { top: 323, left: 0, width: 540, height: 512, cropped: true });
  assert.deepEqual(findContentBox(reference, { minBar: 400 }), FULL(540, 1158));
  assert.deepEqual(findContentBox(reference, { margin: 10 }), { top: 333, left: 0, width: 540, height: 492, cropped: true });
});

// ---------------------------------------------------------------------------
// imageIdFromFileName
// ---------------------------------------------------------------------------

// No real id has an accent; the accented one only exercises the NFC normalization.
const IDS = ['banana', 'cenoura-vulcao', 'pa\u00e7oca'];

test('imageIdFromFileName matches an id for every supported extension', () => {
  for (const extension of SOURCE_EXTENSIONS) {
    assert.equal(imageIdFromFileName(`banana.${extension}`, IDS), 'banana', extension);
  }
});

test('imageIdFromFileName ignores the case of the name and of the extension', () => {
  assert.equal(imageIdFromFileName('BANANA.JPG', IDS), 'banana');
  assert.equal(imageIdFromFileName('Banana.Jpeg', IDS), 'banana');
  assert.equal(imageIdFromFileName('banana.JPEG', IDS), 'banana');
  assert.equal(imageIdFromFileName('Cenoura-Vulcao.PNG', IDS), 'cenoura-vulcao');
  assert.equal(imageIdFromFileName('banana.HEIC', IDS), 'banana');
});

test('imageIdFromFileName accepts hero in any supported extension', () => {
  assert.equal(imageIdFromFileName('hero.png', IDS), 'hero');
  assert.equal(imageIdFromFileName('HERO.JPG', IDS), 'hero');
  assert.equal(imageIdFromFileName('hero.heic', []), 'hero');
});

test('imageIdFromFileName treats a decomposed (NFD) name as its composed (NFC) id', () => {
  const composedName = 'pa\u00e7oca'; // precomposed c with cedilla
  const decomposedName = 'pac\u0327oca'; // c + combining cedilla, as macOS may store it
  assert.notEqual(decomposedName, composedName, 'the input really is decomposed');
  assert.equal(decomposedName.normalize('NFC'), composedName);
  assert.equal(imageIdFromFileName(`${decomposedName}.JPG`, IDS), composedName);
  assert.equal(imageIdFromFileName(`${composedName}.jpg`, IDS), composedName);
});

test('imageIdFromFileName ignores hidden files', () => {
  assert.equal(imageIdFromFileName('.banana.jpg', IDS), null);
  assert.equal(imageIdFromFileName('._banana.jpg', IDS), null);
  assert.equal(imageIdFromFileName('.DS_Store', IDS), null);
  assert.equal(imageIdFromFileName('.hero.png', IDS), null);
});

test('imageIdFromFileName rejects unknown or missing extensions', () => {
  for (const name of ['banana.webp', 'banana.gif', 'banana.txt', 'banana', 'banana.', 'banana.jpg ']) {
    assert.equal(imageIdFromFileName(name, IDS), null, name);
  }
});

test('imageIdFromFileName requires an exact name, not a near miss', () => {
  const nearMisses = [
    'banana-2.jpg',
    'bananas.jpg',
    'banan.jpg',
    'banana copy.jpg',
    ' banana.jpg',
    'banana.jpg.jpg',
    'IMG_1234.jpg',
    'cenoura.jpg', // not in IDS, even though cenoura-vulcao is
    'pac\u00f3ca.jpg', // o with acute accent: a different word
    'heroes.png',
  ];
  for (const name of nearMisses) {
    assert.equal(imageIdFromFileName(name, IDS), null, name);
  }
});

// ---------------------------------------------------------------------------
// webpChunkTags and checkWebp
// ---------------------------------------------------------------------------

test('webpChunkTags lists the chunk tags in order', () => {
  const bytes = webp(chunk('VP8X', 10), chunk('VP8 ', 20), chunk('EXIF', 4));
  assert.deepEqual(webpChunkTags(bytes), ['VP8X', 'VP8 ', 'EXIF']);
});

test('webpChunkTags skips the padding byte of an odd-sized chunk', () => {
  const bytes = webp(chunk('VP8 ', 5), chunk('XMP ', 3), chunk('EXIF', 2));
  assert.deepEqual(webpChunkTags(bytes), ['VP8 ', 'XMP ', 'EXIF']);
});

test('webpChunkTags returns an empty list for data that is not a WebP', () => {
  assert.deepEqual(webpChunkTags(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1])), []);
  assert.deepEqual(webpChunkTags(Buffer.alloc(0)), []);
});

test('checkWebp accepts a minimal valid WebP', () => {
  assert.deepEqual(checkWebp(webp(chunk('VP8 ', 10))), []);
  assert.deepEqual(checkWebp(webp(chunk('VP8L', 10))), []);
  assert.deepEqual(checkWebp(webp(chunk('VP8X', 10), chunk('VP8 ', 10))), []);
});

test('checkWebp accepts a Uint8Array as well as a Buffer', () => {
  assert.deepEqual(checkWebp(new Uint8Array(webp(chunk('VP8 ', 10)))), []);
});

test('checkWebp rejects JPEG bytes', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00]);
  assert.ok(hasProblem(checkWebp(jpeg), /not a RIFF\/WEBP/i));
});

test('checkWebp rejects empty and tiny buffers', () => {
  assert.ok(hasProblem(checkWebp(Buffer.alloc(0)), /not a RIFF\/WEBP/i));
  assert.ok(hasProblem(checkWebp(Buffer.from('RIFF')), /not a RIFF\/WEBP/i));
});

test('checkWebp rejects a RIFF container that is not a WebP', () => {
  const wave = webp(chunk('VP8 ', 10));
  wave.write('WAVE', 8, 'ascii');
  assert.ok(hasProblem(checkWebp(wave), /not a RIFF\/WEBP/i));
});

test('checkWebp reports a truncated file', () => {
  const whole = webp(chunk('VP8 ', 100));
  const problems = checkWebp(whole.subarray(0, whole.length - 30));
  assert.ok(hasProblem(problems, /truncated/i), problems.join('; '));
});

test('checkWebp reports a chunk whose size runs past the end of the file', () => {
  const bytes = webp(chunk('VP8 ', 10));
  bytes.writeUInt32LE(5000, 16); // chunk size field: far more than the file holds
  const problems = checkWebp(bytes);
  assert.ok(hasProblem(problems, /truncated/i), problems.join('; '));
});

test('checkWebp reports a RIFF size that disagrees with the file length', () => {
  const trailing = Buffer.concat([webp(chunk('VP8 ', 10)), Buffer.from('junk-after-the-end')]);
  assert.ok(hasProblem(checkWebp(trailing), /trailing/i));
});

test('checkWebp reports a missing padding byte after an odd-sized last chunk', () => {
  const padded = webp(chunk('VP8 ', 5));
  const unpadded = padded.subarray(0, padded.length - 1);
  unpadded.writeUInt32LE(unpadded.length - 8, 4); // keep the RIFF size consistent with the file
  const problems = checkWebp(unpadded);
  assert.ok(hasProblem(problems, /padding|truncated/i), problems.join('; '));
});

test('checkWebp enforces the size limit, which is inclusive', () => {
  const atLimit = webp(chunk('VP8 ', MAX_BYTES - 20));
  assert.equal(atLimit.length, MAX_BYTES);
  assert.deepEqual(checkWebp(atLimit), []);
  const overLimit = webp(chunk('VP8 ', MAX_BYTES - 18));
  assert.equal(overLimit.length, MAX_BYTES + 2);
  assert.ok(hasProblem(checkWebp(overLimit), /larger than/i));
});

test('checkWebp honours a custom maxBytes', () => {
  const small = webp(chunk('VP8 ', 100));
  assert.deepEqual(checkWebp(small, { maxBytes: 1000 }), []);
  assert.ok(hasProblem(checkWebp(small, { maxBytes: 50 }), /larger than/i));
  assert.deepEqual(checkWebp(small, {}), []);
});

test('checkWebp rejects EXIF metadata', () => {
  const problems = checkWebp(webp(chunk('VP8X', 10), chunk('VP8 ', 10), chunk('EXIF', 8)));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /EXIF/);
});

test('checkWebp rejects XMP metadata', () => {
  const problems = checkWebp(webp(chunk('VP8X', 10), chunk('VP8 ', 10), chunk('XMP ', 8)));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /XMP/);
});

test('checkWebp reports each kind of metadata that is present', () => {
  const problems = checkWebp(webp(chunk('VP8 ', 10), chunk('EXIF', 8), chunk('XMP ', 8)));
  assert.ok(hasProblem(problems, /EXIF/));
  assert.ok(hasProblem(problems, /XMP/));
});

test('checkWebp finds metadata that follows an odd-sized chunk', () => {
  const problems = checkWebp(webp(chunk('VP8 ', 5), chunk('EXIF', 2)));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /EXIF/);
});

test('checkWebp requires an image chunk', () => {
  assert.ok(hasProblem(checkWebp(webp(chunk('ALPH', 10))), /no image chunk/i));
  assert.ok(hasProblem(checkWebp(webp()), /no image chunk/i));
});
