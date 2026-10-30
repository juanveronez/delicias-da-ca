import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomFillSync } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { checkWebp, findContentBox, parseBmp } from '../scripts/photo-lib.mjs';

// End-to-end tests of scripts/prepare-photos.mjs. The script needs the macOS `sips` and
// Homebrew's `cwebp`, so the tests that run it are skipped where those are missing.

const SCRIPT = fileURLToPath(new URL('../scripts/prepare-photos.mjs', import.meta.url));
const REMINDER = 'Open each output and check flavor, rotation and crop before committing.';
const CWEBP_MISSING =
  "cwebp not found. Install it in a regular Terminal tab (Homebrew cannot run inside Claude Code's sandbox): brew install webp";

function toolWorks(command, args) {
  return !spawnSync(command, args, { stdio: 'ignore' }).error;
}

const missingTool = !toolWorks('sips', ['--help'])
  ? 'sips is not available (this tool needs macOS)'
  : !toolWorks('cwebp', ['-version'])
    ? 'cwebp is not available (brew install webp)'
    : false;

// --- helpers ---------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// An 8-bit RGB PNG. `pixel(x, y)` returns [r, g, b]; y = 0 is the top row.
function makePng(width, height, pixel) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: RGB
  const rows = Buffer.alloc(height * (1 + width * 3)); // every row starts with filter type 0
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    for (let x = 0; x < width; x += 1) {
      rows.set(pixel(x, y), rowStart + 1 + x * 3);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Smooth, non-uniform and always bright (luminance well above 90), like a photo.
const brightPhoto = (x, y) => [
  Math.round(170 + 60 * Math.sin(x / 23)),
  Math.round(150 + 60 * Math.sin(y / 31)),
  Math.round(130 + 50 * Math.sin((x + y) / 41)),
];

const flatPhoto = (width, height) => makePng(width, height, brightPhoto);

// A phone-screenshot look-alike: pure black bars (in pixels) around a bright photo.
function photoWithBars(width, height, { top = 0, bottom = 0, left = 0, right = 0 }) {
  return makePng(width, height, (x, y) =>
    y < top || y >= height - bottom || x < left || x >= width - right ? [0, 0, 0] : brightPhoto(x, y),
  );
}

// Rewrites a JPEG written by sips so that its only Exif entry is Orientation = `orientation`
// (6 means: rotate 90 degrees clockwise to display it upright).
function withExifOrientation(jpeg, orientation) {
  // biome-ignore format: the bytes are grouped as in the TIFF layout, one comment per group
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian header, first IFD at offset 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation, SHORT
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const exifSegment = Buffer.concat([
    Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]),
    payload,
  ]);
  const kept = [jpeg.subarray(0, 2)]; // start of image
  let position = 2;
  while (jpeg[position] === 0xff && jpeg[position + 1] !== 0xda) {
    const end = position + 2 + jpeg.readUInt16BE(position + 2);
    if (jpeg[position + 1] !== 0xe1) kept.push(jpeg.subarray(position, end)); // drop the old Exif
    position = end;
  }
  return Buffer.concat([...kept, exifSegment, jpeg.subarray(position)]);
}

// A cake on a near-black (5, 5, 5) backdrop: the rows above and below it look exactly like bars.
function cakeOnDarkBackdrop(width, height) {
  return makePng(width, height, (x, y) =>
    x >= 100 && x < width - 100 && y >= 80 && y < height - 80 ? brightPhoto(x, y) : [5, 5, 5],
  );
}

async function makeWorkspace(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'prepare-photos-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sources = path.join(root, 'src');
  await mkdir(sources);
  return { root, sources, out: path.join(root, 'out') };
}

function runCli(args, { cwd, env } = {}) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env, encoding: 'utf8' });
  assert.equal(result.error, undefined, `could not run the script: ${result.error}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function dimensionsOf(file) {
  const report = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  const width = Number(report.match(/pixelWidth: (\d+)/)[1]);
  const height = Number(report.match(/pixelHeight: (\d+)/)[1]);
  return `${width}x${height}`;
}

// Decodes an image through sips (BMP) and returns its per-row and per-column luminance stats.
function pixelStats(file, scratchDir) {
  const bmp = path.join(scratchDir, `${path.basename(file)}.bmp`);
  execFileSync('sips', ['-s', 'format', 'bmp', file, '--out', bmp], { stdio: 'ignore' });
  return parseBmp(readFileSync(bmp));
}

const listDir = async (dir) => (existsSync(dir) ? (await readdir(dir)).sort() : []);

// --- tests that run the whole pipeline ------------------------------------------

test('converts photos: crops black bars, shrinks only when too large, never enlarges', {
  skip: missingTool,
}, async (t) => {
  const { root, sources } = await makeWorkspace(t);
  const files = {
    'banana.png': photoWithBars(600, 1000, { top: 250, bottom: 250 }), // bars on top and bottom, smaller than 800
    'limao.png': flatPhoto(700, 350), // already small: must keep its size
    'cenoura.png': flatPhoto(1000, 500), // 1000 > 800: shrinks to 800x400
    'hero.png': flatPhoto(1600, 800), // hero limit is 1200: shrinks to 1200x600
  };
  for (const [name, bytes] of Object.entries(files)) await writeFile(path.join(sources, name), bytes);

  // Relative paths resolve against the working directory, which holds no data/menu.json.
  const { status, stdout, stderr } = runCli(['src', '--out', 'out'], { cwd: root });
  assert.equal(status, 0, `${stdout}\n${stderr}`);

  const out = path.join(root, 'out');
  assert.deepEqual(await listDir(out), ['banana.webp', 'cenoura.webp', 'hero.webp', 'limao.webp']);
  for (const file of await listDir(out)) {
    const bytes = await readFile(path.join(out, file));
    assert.deepEqual(checkWebp(bytes), [], `${file} should be a clean, light WebP`);
  }

  // 600x1000 with 250 black rows at each end: the first bright row is 250, so the box
  // starts at 250 + 4 = 254 and ends before 750 - 4 = 746: 492 rows, full width, no resize.
  assert.equal(dimensionsOf(path.join(out, 'banana.webp')), '600x492');
  // The crop must keep the photo, not just the right number of rows: the first and last
  // rows of the output are bright and a second pass finds no bar to remove.
  const cropped = pixelStats(path.join(out, 'banana.webp'), root);
  assert.ok(cropped.rowMeans[0] > 60, `first row mean ${cropped.rowMeans[0]}`);
  assert.ok(cropped.rowMeans.at(-1) > 60, `last row mean ${cropped.rowMeans.at(-1)}`);
  assert.equal(findContentBox(cropped).cropped, false);
  assert.equal(dimensionsOf(path.join(out, 'limao.webp')), '700x350');
  assert.equal(dimensionsOf(path.join(out, 'cenoura.webp')), '800x400');
  assert.equal(dimensionsOf(path.join(out, 'hero.webp')), '1200x600');

  assert.match(stdout, /^banana\s+600x1000\s+600x492\s+\S+\s+cropped bars, kept size$/m);
  assert.match(stdout, /^limao\s+700x350\s+700x350\s+\S+\s+kept size$/m);
  assert.match(stdout, /^cenoura\s+1000x500\s+800x400\s+\S+\s+resized$/m);
  assert.match(stdout, /^hero\s+1600x800\s+1200x600\s+\S+\s+resized$/m);
  assert.equal(stdout.trimEnd().split('\n').at(-1), REMINDER);

  // The sources are left exactly as they were.
  assert.deepEqual(await listDir(sources), Object.keys(files).sort());
  for (const [name, bytes] of Object.entries(files)) {
    assert.ok((await readFile(path.join(sources, name))).equals(bytes), `${name} was modified`);
  }
});

test('crops a bar on a single side at the exact place, even where sips itself gets it wrong', {
  skip: missingTool,
}, async (t) => {
  // sips center-crops when the offset is (0, 0) and ignores a crop whose rectangle starts at
  // the image's bottom-left corner, so a bar on one side only is the hard case: a bar at the
  // bottom or on the right leaves the box at (0, 0), and a bar on top leaves it at the corner.
  const { root, sources, out } = await makeWorkspace(t);
  const cases = [
    { id: 'banana', bars: { top: 60 }, box: { top: 64, left: 0, width: 400, height: 236 } },
    { id: 'limao', bars: { bottom: 60 }, box: { top: 0, left: 0, width: 400, height: 236 } },
    { id: 'cenoura', bars: { left: 60 }, box: { top: 0, left: 64, width: 336, height: 300 } },
    { id: 'fuba', bars: { right: 60 }, box: { top: 0, left: 0, width: 336, height: 300 } },
    { id: 'milho', bars: { top: 60, left: 60 }, box: { top: 64, left: 64, width: 336, height: 236 } },
    { id: 'pacoca', bars: { bottom: 60, right: 60 }, box: { top: 0, left: 0, width: 336, height: 236 } },
  ];
  for (const { id, bars } of cases) await writeFile(path.join(sources, `${id}.png`), photoWithBars(400, 300, bars));

  const result = runCli([sources, '--out', out]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const close = (actual, expected, label) =>
    assert.ok(Math.abs(actual - expected) < 6, `${label}: ${actual} vs ${expected}`);
  for (const { id, box } of cases) {
    const output = path.join(out, `${id}.webp`);
    assert.equal(dimensionsOf(output), `${box.width}x${box.height}`, id);
    const got = pixelStats(output, root);
    assert.equal(findContentBox(got).cropped, false, `${id}: a black bar is left in the output`);

    // Compare the edges with the picture the box should hold, drawn straight from the formula.
    const expectedFile = path.join(root, `expected-${id}.png`);
    await writeFile(
      expectedFile,
      makePng(box.width, box.height, (x, y) => brightPhoto(x + box.left, y + box.top)),
    );
    const want = pixelStats(expectedFile, root);
    for (const [label, actual, expected] of [
      ['first row', got.rowMeans[0], want.rowMeans[0]],
      ['last row', got.rowMeans.at(-1), want.rowMeans.at(-1)],
      ['first column', got.colMeans[0], want.colMeans[0]],
      ['last column', got.colMeans.at(-1), want.colMeans.at(-1)],
    ]) {
      close(actual, expected, `${id} ${label}`);
    }
  }
});

test('applies the EXIF rotation of a phone photo instead of losing it', { skip: missingTool }, async (t) => {
  const { root, sources, out } = await makeWorkspace(t);
  // 400x200, dark left half and bright right half, stored sideways with Orientation = 6.
  const pngFile = path.join(root, 'sideways.png');
  const jpegFile = path.join(root, 'sideways.jpg');
  await writeFile(
    pngFile,
    makePng(400, 200, (x) => (x < 200 ? [90, 90, 90] : [200, 200, 200])),
  );
  execFileSync('sips', ['-s', 'format', 'jpeg', pngFile, '--out', jpegFile], { stdio: 'ignore' });
  await writeFile(path.join(sources, 'banana.jpg'), withExifOrientation(await readFile(jpegFile), 6));

  const { status, stdout, stderr } = runCli([sources, '--out', out]);
  assert.equal(status, 0, `${stdout}\n${stderr}`);
  // Rotated 90 degrees clockwise, the left half ends up on top.
  assert.equal(dimensionsOf(path.join(out, 'banana.webp')), '200x400');
  const got = pixelStats(path.join(out, 'banana.webp'), root);
  assert.ok(got.rowMeans[0] < 120, `top row mean ${got.rowMeans[0]}`);
  assert.ok(got.rowMeans.at(-1) > 170, `bottom row mean ${got.rowMeans.at(-1)}`);
});

test('overwrites an existing output and says so', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), flatPhoto(300, 200));
  await mkdir(out);
  await writeFile(path.join(out, 'banana.webp'), 'stale file');

  const { status, stdout } = runCli([sources, '--out', out]);
  assert.equal(status, 0, stdout);
  assert.match(stdout, /^banana\s.*kept size, replaced existing$/m);
  assert.deepEqual(checkWebp(await readFile(path.join(out, 'banana.webp'))), []);
});

test('replaces an existing output in one step and leaves no temporary file behind', {
  skip: missingTool,
}, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), flatPhoto(300, 200));
  await writeFile(path.join(sources, 'limao.png'), flatPhoto(300, 200));
  await mkdir(out);
  await writeFile(path.join(out, 'banana.webp'), 'stale file');

  for (let run = 1; run <= 2; run += 1) {
    const { status, stdout, stderr } = runCli([sources, '--out', out]);
    assert.equal(status, 0, `run ${run}: ${stdout}\n${stderr}`);
    assert.deepEqual(await listDir(out), ['banana.webp', 'limao.webp'], `run ${run}: only the photos, no .tmp files`);
    assert.deepEqual(checkWebp(await readFile(path.join(out, 'banana.webp'))), []);
  }
});

test('replaces a symlink in the output folder instead of writing through it', { skip: missingTool }, async (t) => {
  const { root, sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), flatPhoto(300, 200));
  const elsewhere = path.join(root, 'elsewhere.webp');
  await writeFile(elsewhere, 'precious: must stay untouched');
  await mkdir(out);
  await symlink(elsewhere, path.join(out, 'banana.webp'));

  const { status, stdout, stderr } = runCli([sources, '--out', out]);
  assert.equal(status, 0, `${stdout}\n${stderr}`);
  assert.match(stdout, /^banana\s.*replaced existing$/m);
  assert.equal(
    lstatSync(path.join(out, 'banana.webp')).isSymbolicLink(),
    false,
    'the link was replaced by a regular file',
  );
  assert.deepEqual(checkWebp(await readFile(path.join(out, 'banana.webp'))), []);
  assert.equal(await readFile(elsewhere, 'utf8'), 'precious: must stay untouched', 'the link target was not written');
  assert.deepEqual(await listDir(out), ['banana.webp']);
});

test('cleans up its temporary file when the output cannot be replaced', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), flatPhoto(300, 200));
  await writeFile(path.join(sources, 'limao.png'), flatPhoto(300, 200));
  await mkdir(path.join(out, 'banana.webp'), { recursive: true }); // a folder cannot be replaced by a file

  const { status, stdout } = runCli([sources, '--out', out]);
  assert.equal(status, 1);
  assert.match(stdout, /^banana\s.*FAILED/m);
  assert.match(stdout, /^limao\s.*kept size$/m);
  assert.deepEqual(await listDir(out), ['banana.webp', 'limao.webp'], 'no .tmp file is left next to the photos');
});

test('--no-crop keeps the full size of every photo', { skip: missingTool }, async (t) => {
  const { root, sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), photoWithBars(400, 300, { top: 60, bottom: 60 }));
  await writeFile(path.join(sources, 'cenoura.png'), photoWithBars(400, 300, { top: 60, bottom: 60 }));

  const { status, stdout, stderr } = runCli([sources, '--out', out, '--no-crop']);
  assert.equal(status, 0, `${stdout}\n${stderr}`);
  assert.equal(dimensionsOf(path.join(out, 'banana.webp')), '400x300');
  assert.equal(dimensionsOf(path.join(out, 'cenoura.webp')), '400x300');
  assert.match(stdout, /^banana\s+400x300\s+400x300\s+\S+\s+crop skipped \(--no-crop\), kept size$/m);
  assert.match(stdout, /^cenoura\s+400x300\s+400x300\s+\S+\s+crop skipped \(--no-crop\), kept size$/m);
  assert.doesNotMatch(stdout, /cropped bars/);
  assert.ok(pixelStats(path.join(out, 'banana.webp'), root).rowMeans[0] < 30, 'the black bar is still there');
});

test('--no-crop=<id> skips the crop only for the listed ids', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), photoWithBars(400, 300, { top: 60, bottom: 60 }));
  await writeFile(path.join(sources, 'cenoura.png'), photoWithBars(400, 300, { top: 60, bottom: 60 }));
  await writeFile(path.join(sources, 'limao.png'), photoWithBars(400, 300, { top: 60, bottom: 60 }));

  const { status, stdout, stderr } = runCli([sources, '--out', out, '--no-crop=banana,limao']);
  assert.equal(status, 0, `${stdout}\n${stderr}`);
  assert.equal(dimensionsOf(path.join(out, 'banana.webp')), '400x300');
  assert.equal(dimensionsOf(path.join(out, 'limao.webp')), '400x300');
  // bars of 60 rows: the box starts at 60 + 4 and ends before 240 - 4, so 172 rows are left
  assert.equal(dimensionsOf(path.join(out, 'cenoura.webp')), '400x172');
  assert.match(stdout, /^banana\s.*crop skipped \(--no-crop\)/m);
  assert.match(stdout, /^limao\s.*crop skipped \(--no-crop\)/m);
  assert.match(stdout, /^cenoura\s.*cropped bars/m);
});

test('--no-crop rejects ids that are not among the sources of this run and writes nothing', {
  skip: missingTool,
}, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), flatPhoto(200, 100));

  for (const option of ['--no-crop=nope', '--no-crop=banana,nope', '--no-crop=limao']) {
    const { status, stderr } = runCli([sources, '--out', out, option]);
    assert.equal(status, 2, option);
    assert.match(stderr, /--no-crop: .* not among the photos of this run/, option);
    assert.match(stderr, new RegExp(option.split(',').at(-1).replace('--no-crop=', '')), option);
    assert.equal(existsSync(out), false, `${option}: nothing may be written`);
  }
  for (const option of ['--no-crop=', '--no-crop=banana,']) {
    const { status, stderr } = runCli([sources, '--out', out, option]);
    assert.equal(status, 2, option);
    assert.match(stderr, /needs one or more ids/, option);
  }
});

test('a cake on a near-black backdrop is cropped by default and kept whole with --no-crop', {
  skip: missingTool,
}, async (t) => {
  // The backdrop rows are indistinguishable from bars, which is what --no-crop is for.
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), cakeOnDarkBackdrop(400, 300));

  let result = runCli([sources, '--out', out]);
  assert.equal(result.status, 0, result.stdout);
  // Backdrop of 80 rows above and below and 100 columns on each side: the box is the cake plus 4px
  // inside it, 192x132, and the backdrop is gone.
  assert.equal(dimensionsOf(path.join(out, 'banana.webp')), '192x132');
  assert.match(result.stdout, /cropped bars/);

  result = runCli([sources, '--out', out, '--no-crop=banana']);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(dimensionsOf(path.join(out, 'banana.webp')), '400x300');
});

test('recognizes source names regardless of case and extension', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'Banana.PNG'), flatPhoto(200, 100));

  const { status, stdout } = runCli([sources, '--out', out]);
  assert.equal(status, 0, stdout);
  assert.deepEqual(await listDir(out), ['banana.webp']);
});

test('reports names that are not a cake id or hero as skipped and does not convert them', {
  skip: missingTool,
}, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), flatPhoto(200, 100));
  await writeFile(path.join(sources, 'IMG_1.png'), flatPhoto(200, 100));
  await writeFile(path.join(sources, 'banana-2.png'), flatPhoto(200, 100));
  await writeFile(path.join(sources, '.DS_Store'), 'hidden');

  const { status, stdout } = runCli([sources, '--out', out]);
  assert.equal(status, 0, 'skipped names are warnings only');
  assert.match(stdout, /Skipped \(name is not a cake id or hero\)/);
  assert.match(stdout, /IMG_1\.png.*rename to <id>\.jpg/);
  assert.match(stdout, /banana-2\.png.*rename to <id>\.jpg/);
  assert.doesNotMatch(stdout, /\.DS_Store/);
  assert.deepEqual(await listDir(out), ['banana.webp']);
});

test('fails before converting anything when two sources map to the same id', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), flatPhoto(200, 100));
  await writeFile(path.join(sources, 'Banana.JPG'), 'not even an image: it must never be read');
  await writeFile(path.join(sources, 'limao.png'), flatPhoto(200, 100)); // would convert fine

  const { status, stderr } = runCli([sources, '--out', out]);
  assert.equal(status, 1);
  assert.match(stderr, /banana/);
  assert.match(stderr, /banana\.png/);
  assert.match(stderr, /Banana\.JPG/);
  assert.deepEqual(await listDir(out), [], 'nothing may be written');
});

test('--dry-run reports the plan and writes nothing', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), photoWithBars(600, 1000, { top: 250, bottom: 250 }));
  await writeFile(path.join(sources, 'cenoura.png'), flatPhoto(1000, 500));
  await writeFile(path.join(sources, 'IMG_1.png'), flatPhoto(200, 100));

  const { status, stdout } = runCli([sources, '--out', out, '--dry-run']);
  assert.equal(status, 0, stdout);
  assert.match(stdout, /dry run/i);
  assert.match(stdout, /^banana\s+600x1000\s+top 254, left 0, 600x492\s+600x492\s+crop, keep size$/m);
  assert.match(stdout, /^cenoura\s+1000x500\s+none\s+800x400\s+resize$/m);
  assert.match(stdout, /IMG_1\.png/);
  assert.equal(stdout.trimEnd().split('\n').at(-1), REMINDER);
  assert.equal(existsSync(out), false, 'the output folder must not be created');
  assert.deepEqual(await listDir(sources), ['IMG_1.png', 'banana.png', 'cenoura.png']);
});

test('--dry-run honours --no-crop', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), photoWithBars(600, 1000, { top: 250, bottom: 250 }));
  await writeFile(path.join(sources, 'cenoura.png'), photoWithBars(600, 1000, { top: 250, bottom: 250 }));

  const { status, stdout } = runCli([sources, '--out', out, '--dry-run', '--no-crop=banana']);
  assert.equal(status, 0, stdout);
  assert.match(stdout, /^banana\s+600x1000\s+none\s+480x800\s+crop skipped \(--no-crop\), resize$/m);
  assert.match(stdout, /^cenoura\s+600x1000\s+top 254, left 0, 600x492\s+600x492\s+crop, keep size$/m);
  assert.equal(existsSync(out), false);
});

test('marks an unreadable photo as failed, keeps going and exits 1', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.png'), 'this is not an image');
  await writeFile(path.join(sources, 'limao.png'), flatPhoto(200, 100));

  const { status, stdout } = runCli([sources, '--out', out]);
  assert.equal(status, 1);
  assert.match(stdout, /^banana\s.*FAILED/m);
  assert.match(stdout, /^limao\s.*kept size$/m);
  assert.deepEqual(await listDir(out), ['limao.webp']);
});

test('explains an empty source file without exposing temporary paths, and converts the others', {
  skip: missingTool,
}, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'banana.jpg'), '');
  await writeFile(path.join(sources, 'limao.png'), flatPhoto(200, 100));

  const { status, stdout, stderr } = runCli([sources, '--out', out]);
  assert.equal(status, 1);
  assert.match(stdout, /^banana\s.*FAILED: sips could not decode the file \(empty or corrupt\?\)$/m);
  const bananaRow = stdout.split('\n').find((line) => line.startsWith('banana'));
  assert.doesNotMatch(
    `${bananaRow}\n${stderr}`,
    /ENOENT|\.bmp|\/(var|tmp|private)\//i,
    'no temporary path in the message',
  );
  assert.match(stdout, /^limao\s.*kept size$/m);
  assert.deepEqual(await listDir(out), ['limao.webp']);
});

test('fails a photo whose WebP is over 200 KB and keeps the previous output', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  const noise = Buffer.alloc(700 * 700 * 3);
  randomFillSync(noise);
  await writeFile(
    path.join(sources, 'banana.png'),
    makePng(700, 700, (x, y) => noise.subarray((y * 700 + x) * 3, (y * 700 + x) * 3 + 3)),
  );
  await mkdir(out);
  await writeFile(path.join(out, 'banana.webp'), 'previous good output');

  const { status, stdout } = runCli([sources, '--out', out]);
  assert.equal(status, 1);
  assert.match(stdout, /^banana\s.*FAILED.*larger than/m);
  assert.equal(await readFile(path.join(out, 'banana.webp'), 'utf8'), 'previous good output');
  assert.deepEqual(await listDir(out), ['banana.webp']);
});

test('does nothing and exits 0 when the folder has no photo with a valid name', { skip: missingTool }, async (t) => {
  const { sources, out } = await makeWorkspace(t);
  await writeFile(path.join(sources, 'IMG_1.png'), flatPhoto(200, 100));

  const { status, stdout } = runCli([sources, '--out', out]);
  assert.equal(status, 0);
  assert.match(stdout, /Skipped/);
  assert.match(stdout, /no photo to convert/i);
  assert.deepEqual(await listDir(out), []);
});

test('exits 2 when the source folder does not exist', { skip: missingTool }, async (t) => {
  const { root, out } = await makeWorkspace(t);
  const { status, stderr } = runCli([path.join(root, 'nope'), '--out', out]);
  assert.equal(status, 2);
  assert.match(stderr, /not found|does not exist|cannot read/i);
});

// --- usage and tool checks ---------------------------------------------------------

test('exits 2 with a usage message for unknown options and missing values', async (t) => {
  const { sources } = await makeWorkspace(t);
  for (const args of [
    [sources, '--bogus'],
    [sources, '--out'],
    [sources, 'second-folder'],
    [sources, '--no-crop='],
  ]) {
    const { status, stderr } = runCli(args);
    assert.equal(status, 2, args.join(' '));
    assert.match(stderr, /Usage: node scripts\/prepare-photos\.mjs/, args.join(' '));
  }
});

test('--help describes every option and exits 0', () => {
  const { status, stdout } = runCli(['--help']);
  assert.equal(status, 0);
  for (const option of ['--out', '--dry-run', '--no-crop'])
    assert.ok(stdout.includes(option), `--help should mention ${option}`);
});

test('exits 2 and says the tool needs macOS when sips is missing', async (t) => {
  const { root, sources } = await makeWorkspace(t);
  const emptyBin = path.join(root, 'empty-bin');
  await mkdir(emptyBin);
  const { status, stderr } = runCli([sources], { env: { PATH: emptyBin } });
  assert.equal(status, 2);
  assert.match(stderr, /macOS/);
  assert.match(stderr, /sips/);
});

test('exits 2 with the install hint when cwebp is missing', {
  skip: !toolWorks('sips', ['--help']) && 'sips is not available',
}, async (t) => {
  const { root, sources } = await makeWorkspace(t);
  const onlySips = path.join(root, 'only-sips');
  await mkdir(onlySips);
  await symlink('/usr/bin/sips', path.join(onlySips, 'sips'));
  const { status, stderr } = runCli([sources], { env: { PATH: onlySips } });
  assert.equal(status, 2);
  assert.equal(stderr.trim(), CWEBP_MISSING);
});
