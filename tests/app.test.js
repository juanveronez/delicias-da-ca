import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('app.js never injects HTML', () => {
  for (const forbidden of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write']) {
    assert.ok(!code.includes(forbidden), `${forbidden} must not appear in app.js`);
  }
});

test('app.js opens WhatsApp links with a safe rel', () => {
  assert.match(code, /\.rel\s*=\s*'noopener noreferrer'/);
});
