import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function load() {
  const text = await readFile(new URL('../data/menu.json', import.meta.url), 'utf8');
  return JSON.parse(text);
}

test('menu.json is valid JSON containing a list', async () => {
  const cakes = await load();
  assert.ok(Array.isArray(cakes));
});

// Update this number when you add or remove a flavor on purpose.
const EXPECTED_COUNT = 18;

test('menu.json has the expected number of cakes', async () => {
  const cakes = await load();
  assert.equal(
    cakes.length,
    EXPECTED_COUNT,
    `found ${cakes.length} cakes, expected ${EXPECTED_COUNT}. If you added or removed a flavor on purpose, update EXPECTED_COUNT in tests/menu.test.js`,
  );
});

test('every cake has a valid id, name, price and photo named after its id', async () => {
  const cakes = await load();
  for (const cake of cakes) {
    assert.match(cake.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `invalid id: ${cake.id}`);
    assert.equal(typeof cake.name, 'string', `invalid name in ${cake.id}`);
    assert.ok(cake.name.trim().length > 0, `empty name in ${cake.id}`);
    assert.equal(typeof cake.price, 'number', `invalid price in ${cake.id}`);
    assert.ok(Number.isFinite(cake.price) && cake.price > 0, `price must be > 0 in ${cake.id}`);
    assert.equal(cake.photo, `${cake.id}.webp`, `photo must be ${cake.id}.webp in ${cake.id}`);
  }
});

test('ids are unique', async () => {
  const cakes = await load();
  const ids = cakes.map((cake) => cake.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, [], `duplicate ids: ${duplicates.join(', ')}`);
});
