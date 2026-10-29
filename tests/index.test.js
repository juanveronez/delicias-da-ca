import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GENERAL_LINK } from '../js/whatsapp.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

// hero button, error notice, noscript fallback and footer
const EXPECTED_WHATSAPP_LINK_COUNT = 4;

test('every WhatsApp link in index.html is the general link', () => {
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]*)"/g)].map((m) => m[1]);
  assert.equal(
    links.length,
    EXPECTED_WHATSAPP_LINK_COUNT,
    `expected ${EXPECTED_WHATSAPP_LINK_COUNT} WhatsApp links (hero, error notice, noscript, footer), found ${links.length}. If you added or removed one on purpose, update EXPECTED_WHATSAPP_LINK_COUNT in tests/index.test.js`,
  );
  for (const link of links) {
    assert.equal(link, GENERAL_LINK);
  }
});

test('links that open in a new tab use a safe rel', () => {
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0]);
  const opened = anchors.filter((tag) => /target\s*=\s*["']?_blank/i.test(tag));
  assert.ok(opened.length > 0);
  for (const tag of opened) {
    const rel = /rel\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
    const tokens = rel.split(/\s+/);
    assert.ok(
      tokens.includes('noopener') && tokens.includes('noreferrer'),
      `missing rel="noopener noreferrer" in: ${tag}`,
    );
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

test('the error notice is hidden by default and the noscript fallback offers WhatsApp', () => {
  // js/app.js reveals the notice with `notice.hidden = false` when the menu fails to load.
  assert.match(html, /<div id="menu-notice"[^>]*\bhidden\b/);
  assert.match(html, /<noscript>[\s\S]*https:\/\/wa\.me\/[\s\S]*<\/noscript>/);
});
