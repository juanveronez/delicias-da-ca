import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const MAX_BYTES = 200 * 1024;
const HERO_FILE = 'hero.webp';

const cakes = JSON.parse(
  await readFile(new URL('../data/menu.json', import.meta.url), 'utf8'),
);
const imgDir = new URL('../img/', import.meta.url);
const present = (await readdir(imgDir).catch(() => [])).filter((name) => !name.startsWith('.'));
const known = new Set([HERO_FILE, ...cakes.map((cake) => cake.photo)]);

for (const file of present) {
  test(`img/${file} is a known, valid and light WebP`, async () => {
    assert.ok(known.has(file), `${file} is not referenced by data/menu.json and is not ${HERO_FILE}`);
    const bytes = await readFile(new URL(file, imgDir));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', 'not a WebP file');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', 'not a WebP file');
    assert.ok(bytes.length <= MAX_BYTES, `${file} has ${bytes.length} bytes; the limit is ${MAX_BYTES}`);
  });
}

test('lists the cakes that still have no photo', (t) => {
  const missing = cakes.filter((cake) => !present.includes(cake.photo)).map((cake) => cake.id);
  const hero = present.includes(HERO_FILE) ? 'present' : 'missing';
  t.diagnostic(`${missing.length} cake(s) without a photo yet: ${missing.join(', ') || 'none'}; ${HERO_FILE} ${hero}`);
});
