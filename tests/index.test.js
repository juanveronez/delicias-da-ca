import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GENERAL_LINK } from '../js/whatsapp.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('every WhatsApp link in index.html is the general link', () => {
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]*)"/g)].map((m) => m[1]);
  assert.ok(links.length >= 2, 'expected at least the hero button and the footer link');
  for (const link of links) {
    assert.equal(link, GENERAL_LINK);
  }
});

test('links that open in a new tab use a safe rel', () => {
  const opened = [...html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
  assert.ok(opened.length > 0);
  for (const tag of opened) {
    assert.match(tag, /rel="noopener noreferrer"/);
  }
});

test('index.html has a title, description and preview tags', () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<meta property="og:title" content="[^"]+">/);
  assert.match(html, /<meta property="og:description" content="[^"]+">/);
});

test('index.html has the menu mount point and the error notice', () => {
  assert.match(html, /id="menu-list"/);
  assert.match(html, /id="menu-notice"/);
});
