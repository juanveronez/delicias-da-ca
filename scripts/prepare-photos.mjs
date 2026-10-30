// Converts the original photos (default: fotos-originais/) into the optimized WebP files of
// img/. For each photo it drops black screenshot bars, shrinks the longest side to the limit
// WITHOUT ever enlarging, writes a WebP (quality 80) and checks size and metadata.
//
// Usage: node scripts/prepare-photos.mjs [sourceDir] [--out <dir>] [--dry-run]
//
// Needs macOS `sips` (reads the sources, crops, resizes) and `cwebp` (`brew install webp`).
// Source files are named after the cake id (banana.jpg) or `hero` (hero.jpg); they are never
// modified. Everything else is documented in docs/superpowers/specs/.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  HERO_ID,
  MAX_SIDE,
  SOURCE_EXTENSIONS,
  WEBP_QUALITY,
  checkWebp,
  findContentBox,
  imageIdFromFileName,
  needsResize,
  parseBmp,
} from './photo-lib.mjs';

const USAGE = 'Usage: node scripts/prepare-photos.mjs [sourceDir] [--out <dir>] [--dry-run] [--no-crop[=<id>,<id>...]]';
const OPTIONS = `Options:
  sourceDir            folder with the original photos (default: fotos-originais)
  --out <dir>          folder for the WebP files (default: img)
  --dry-run            show what would be done and write nothing
  --no-crop            do not remove black bars from any photo
  --no-crop=<id>,...   do not remove black bars from these ids only (a near-black background
                       looks like a bar to the detector)
  --help               show this text`;
const CWEBP_MISSING =
  "cwebp not found. Install it in a regular Terminal tab (Homebrew cannot run inside Claude Code's sandbox): brew install webp";
const SIPS_MISSING = 'sips not found. This tool needs macOS: sips is the built-in image tool it relies on.';
const REMINDER = 'Open each output and check flavor, rotation and crop before committing.';

// --- command line and external tools -------------------------------------------------

function parseArgs(args) {
  const options = { sourceDir: 'fotos-originais', outDir: 'img', dryRun: false, noCropAll: false, noCropIds: new Set() };
  let sawSourceDir = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--out') {
      i += 1;
      if (i >= args.length || args[i].startsWith('--')) return { error: '--out needs a folder' };
      options.outDir = args[i];
    } else if (arg === '--no-crop') {
      options.noCropAll = true;
    } else if (arg.startsWith('--no-crop=')) {
      const ids = arg.slice('--no-crop='.length).split(',').map((id) => id.trim());
      if (ids.some((id) => id === '')) return { error: '--no-crop= needs one or more ids, for example --no-crop=banana,hero' };
      for (const id of ids) options.noCropIds.add(id);
    } else if (arg === '--help' || arg === '-h') {
      return { help: true };
    } else if (arg.startsWith('-')) {
      return { error: `Unknown option ${arg}` };
    } else if (sawSourceDir) {
      return { error: `Unexpected extra argument ${arg}` };
    } else {
      options.sourceDir = arg;
      sawSourceDir = true;
    }
  }
  return { options };
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// A tool is missing when the system cannot find or start it; any other failure means it
// exists (sips, for one, exits non-zero for some invocations).
function isMissing(error) {
  return error.code === 'ENOENT' || error.code === 'EACCES';
}

function checkTools() {
  try {
    run('sips', ['--help']);
  } catch (error) {
    if (isMissing(error)) {
      console.error(SIPS_MISSING);
      return 2;
    }
  }
  try {
    run('cwebp', ['-version']);
  } catch (error) {
    console.error(isMissing(error) ? CWEBP_MISSING : `cwebp could not run: ${describeError(error)}`);
    return 2;
  }
  return 0;
}

function describeError(error) {
  const detail = [error.stderr, error.stdout].map((text) => String(text ?? '').trim()).find(Boolean);
  return (detail ?? error.message).split('\n')[0];
}

function readDimensions(file) {
  const report = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  const width = Number(/pixelWidth:\s*(\d+)/.exec(report)?.[1]);
  const height = Number(/pixelHeight:\s*(\d+)/.exec(report)?.[1]);
  if (!width || !height) throw new Error(`could not read the size of ${path.basename(file)}`);
  return { width, height };
}

// --- listing the sources ---------------------------------------------------------------

function listSources(sourceDir, ids) {
  const matched = [];
  const skipped = [];
  for (const fileName of fs.readdirSync(sourceDir).sort()) {
    if (fileName.startsWith('.')) continue; // .DS_Store and friends are not photos
    const file = path.resolve(sourceDir, fileName); // absolute, so sips never mistakes it for an option
    let isFile = false;
    try {
      isFile = fs.statSync(file).isFile();
    } catch {
      // a broken link is not a photo
    }
    if (!isFile) continue;

    const id = imageIdFromFileName(fileName, ids);
    if (id !== null) {
      matched.push({ fileName, file, id });
      continue;
    }
    const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
    const nameIsRight = imageIdFromFileName(`${baseName}.jpg`, ids) !== null;
    skipped.push({
      fileName,
      hint: nameIsRight
        ? `extension not supported: use ${SOURCE_EXTENSIONS.map((extension) => `.${extension}`).join(', ')}`
        : 'rename to <id>.jpg',
    });
  }
  return { matched, skipped };
}

function findDuplicates(matched) {
  const byId = new Map();
  for (const { id, fileName } of matched) byId.set(id, [...(byId.get(id) ?? []), fileName]);
  return [...byId].filter(([, fileNames]) => fileNames.length > 1);
}

// --- one photo -----------------------------------------------------------------------------

const sizeText = ({ width, height }) => `${width}x${height}`;
const cropSkippedNote = (plan) => (plan.skipCrop ? 'crop skipped (--no-crop)' : null);

// Decodes the source once, as a BMP, and decides what to do with it. The BMP is what every
// later step reads instead of the original file, for two reasons that are both wanted here:
// - sips applies the EXIF orientation of phone photos when it writes a BMP. A PNG written by
//   sips keeps the orientation tag without applying it, and cwebp then drops the tag, so a
//   portrait photo would come out on its side. Going through the BMP keeps the photo upright,
//   and the pixels analysed for bars are the pixels that get cropped.
// - sips decodes to an sRGB BMP, converting other profiles (such as the Display P3 of iPhone
//   photos) to sRGB. cwebp drops ICC profiles and browsers read the WebP as sRGB, so this is
//   the conversion the colors need anyway.
// Nothing is written outside `workDir`.
function planPhoto(photo, workDir, options) {
  const base = path.join(workDir, 'decoded.bmp');
  // sips exits 0 without writing anything for an empty file, and fails for a corrupt one.
  try {
    run('sips', ['-s', 'format', 'bmp', photo.file, '--out', base]);
  } catch {
    // reported below, with a message that does not leak sips' temporary paths
  }
  if (!fs.existsSync(base)) throw new Error('sips could not decode the file (empty or corrupt?)');
  const parsed = parseBmp(fs.readFileSync(base));

  const skipCrop = options.noCropAll || options.noCropIds.has(photo.id);
  const box = skipCrop ? { top: 0, left: 0, width: parsed.width, height: parsed.height, cropped: false } : findContentBox(parsed);
  const maxSide = photo.id === HERO_ID ? MAX_SIDE.hero : MAX_SIDE.cake;
  const resize = needsResize(box.width, box.height, maxSide);
  return { base, source: { width: parsed.width, height: parsed.height }, box, skipCrop, maxSide, resize };
}

// Crops the black bars and shrinks the longest side when it is too large (never enlarging),
// as a PNG in `workDir`. Returns the file and its measured size: sips decides how it rounds.
function renderPhoto(plan, workDir) {
  let current = plan.base;
  if (plan.box.cropped) {
    // sips has two crop bugs: an offset of (0, 0) is read as "none" and silently becomes a
    // center crop, and a rectangle whose corner is the image's bottom-left corner is ignored
    // (the whole image comes back). Padding 1px on every side first and cropping at offset
    // +1 keeps the rectangle away from both cases, and gives exactly the same pixels.
    const padded = path.join(workDir, 'padded.png');
    run('sips', [
      '-s', 'format', 'png',
      '--padToHeightWidth', String(plan.source.height + 2), String(plan.source.width + 2),
      '--padColor', '000000',
      current, '--out', padded,
    ]);
    // Crop straight into a PNG: a JPEG here would recompress the photo.
    const cropped = path.join(workDir, 'cropped.png');
    // sips offsets are (row, column) from the top-left corner.
    run('sips', [
      '-s', 'format', 'png',
      '--cropToHeightWidth', String(plan.box.height), String(plan.box.width),
      '--cropOffset', String(plan.box.top + 1), String(plan.box.left + 1),
      padded, '--out', cropped,
    ]);
    const got = readDimensions(cropped);
    if (got.width !== plan.box.width || got.height !== plan.box.height) {
      throw new Error(`crop gave ${sizeText(got)}, expected ${sizeText(plan.box)}`);
    }
    current = cropped;
  }

  const rendered = path.join(workDir, 'rendered.png');
  const shrink = plan.resize ? ['-Z', String(plan.maxSide)] : []; // -Z would also enlarge, so only when needed
  run('sips', [...shrink, '-s', 'format', 'png', current, '--out', rendered]);
  return { file: rendered, size: readDimensions(rendered) };
}

// Encodes the rendered PNG as a WebP in `workDir` and checks it.
function encodePhoto(photo, rendered, workDir) {
  // cwebp drops EXIF/XMP metadata unless asked to keep it.
  const webp = path.join(workDir, `${photo.id}.webp`);
  run('cwebp', ['-quiet', '-q', String(WEBP_QUALITY), rendered.file, '-o', webp]);

  const bytes = fs.readFileSync(webp);
  const problems = checkWebp(bytes);
  if (problems.length > 0) throw new Error(problems.join('; '));
  return { webp, bytes: bytes.length, final: readDimensions(webp) };
}

// Copies `source` next to `destination` and renames it over the destination. The rename is atomic
// on the same filesystem, never leaves a half-written photo, and replaces a symlink at the
// destination instead of writing through it. The temporary file never outlives the call.
function writeAtomically(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.tmp-${process.pid}`);
  try {
    fs.copyFileSync(source, temporary);
    fs.renameSync(temporary, destination);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

// Returns the table row of one photo; `failed` is true when the photo could not be converted.
function processPhoto(photo, options, tempRoot) {
  const workDir = path.join(tempRoot, photo.id);
  fs.mkdirSync(workDir, { recursive: true });
  const destination = path.join(options.outDir, `${photo.id}.webp`);
  const existed = fs.lstatSync(destination, { throwIfNoEntry: false }) !== undefined; // a link counts, even a dangling one
  let sourceText = '?';

  try {
    const plan = planPhoto(photo, workDir, options);
    sourceText = sizeText(plan.source);
    const rendered = renderPhoto(plan, workDir);

    if (options.dryRun) {
      const cropText = plan.box.cropped
        ? `top ${plan.box.top}, left ${plan.box.left}, ${sizeText(plan.box)}`
        : 'none';
      const steps = [plan.box.cropped ? 'crop' : cropSkippedNote(plan), plan.resize ? 'resize' : 'keep size', existed ? 'would replace existing' : null];
      return { failed: false, cells: [photo.id, sourceText, cropText, sizeText(rendered.size), steps.filter(Boolean).join(', ')] };
    }

    // The new file only reaches the output folder once it passed the checks, so a bad
    // conversion never destroys an output that was already good.
    const converted = encodePhoto(photo, rendered, workDir);
    writeAtomically(converted.webp, destination);
    const notes = [plan.box.cropped ? 'cropped bars' : cropSkippedNote(plan), plan.resize ? 'resized' : 'kept size', existed ? 'replaced existing' : null];
    return {
      failed: false,
      cells: [photo.id, sourceText, sizeText(converted.final), (converted.bytes / 1024).toFixed(1), notes.filter(Boolean).join(', ')],
    };
  } catch (error) {
    return { failed: true, cells: [photo.id, sourceText, '-', '-', `FAILED: ${describeError(error)}`] };
  }
}

// --- output ----------------------------------------------------------------------------------

function formatTable(headers, rows) {
  const widths = headers.map((header, i) => Math.max(header.length, ...rows.map((row) => row[i].length)));
  const line = (cells) =>
    cells.map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i]))).join('  ');
  return [line(headers), ...rows.map(line)].join('\n');
}

function printSkipped(skipped) {
  if (skipped.length === 0) return;
  console.log('Skipped (name is not a cake id or hero):');
  for (const { fileName, hint } of skipped) console.log(`  ${fileName}  (${hint})`);
  console.log('');
}

// --- main ---------------------------------------------------------------------------------------

function main(args) {
  const parsedArgs = parseArgs(args);
  if (parsedArgs.help) {
    console.log(`${USAGE}\n\n${OPTIONS}`);
    return 0;
  }
  if (parsedArgs.error) {
    console.error(`${parsedArgs.error}\n${USAGE}\nRun with --help for the options.`);
    return 2;
  }
  const options = parsedArgs.options;

  const toolsStatus = checkTools();
  if (toolsStatus !== 0) return toolsStatus;

  const menu = JSON.parse(fs.readFileSync(new URL('../data/menu.json', import.meta.url), 'utf8'));
  const ids = menu.map((cake) => cake.id);

  let listing;
  try {
    listing = listSources(options.sourceDir, ids);
  } catch (error) {
    console.error(`Cannot read the source folder "${options.sourceDir}": ${error.message}`);
    return 2;
  }
  const { matched, skipped } = listing;

  const unknownIds = [...options.noCropIds].filter((id) => !matched.some((photo) => photo.id === id));
  if (unknownIds.length > 0) {
    console.error(
      `--no-crop: ${unknownIds.map((id) => `"${id}"`).join(', ')} not among the photos of this run (${[...new Set(matched.map((photo) => photo.id))].join(', ') || 'none'}). Nothing was converted.`,
    );
    return 2;
  }

  const duplicates = findDuplicates(matched);
  if (duplicates.length > 0) {
    console.error('More than one source file for the same id. Nothing was converted; keep one file per id:');
    for (const [id, fileNames] of duplicates) console.error(`  ${id}: ${fileNames.join(', ')}`);
    return 1;
  }

  printSkipped(skipped);
  if (matched.length === 0) {
    console.log(`No photo to convert in "${options.sourceDir}".`);
    return 0;
  }

  console.log(
    `${options.dryRun ? 'Dry run, nothing will be written. ' : ''}${matched.length} photo(s): ${options.sourceDir} -> ${options.outDir}\n`,
  );

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-photos-'));
  const rows = [];
  let failed = 0;
  try {
    for (const photo of matched) {
      const result = processPhoto(photo, options, tempRoot);
      if (result.failed) failed += 1;
      rows.push(result.cells);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  const headers = options.dryRun
    ? ['id', 'source', 'crop box', 'target', 'plan']
    : ['id', 'source', 'final', 'KB', 'notes'];
  console.log(formatTable(headers, rows));
  console.log('');
  console.log(
    options.dryRun
      ? `Dry run: ${rows.length - failed} photo(s) would be converted, ${failed} failed, ${skipped.length} skipped.`
      : `Done: ${rows.length - failed} converted, ${failed} failed, ${skipped.length} skipped.`,
  );
  console.log(REMINDER);
  return failed > 0 ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
