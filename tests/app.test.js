import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const code = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('app.js never injects HTML', () => {
  for (const forbidden of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write']) {
    assert.ok(!code.includes(forbidden), `${forbidden} must not appear in app.js`);
  }
});

test('app.js opens WhatsApp links with a safe rel', () => {
  assert.match(code, /\.rel\s*=\s*'noopener noreferrer'/);
});

test('app.js revalidates the menu on every visit', () => {
  assert.match(code, /fetch\(MENU_URL,\s*\{\s*cache:\s*'no-cache'\s*\}\)/);
});

test('app.js sets loading before src so lazy loading is honored', () => {
  assert.ok(code.indexOf("photo.loading = 'lazy'") !== -1);
  assert.ok(code.indexOf("photo.loading = 'lazy'") < code.indexOf('photo.src ='));
});
