import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
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

test('index.html links a favicon that exists', async () => {
  const href = /<link rel="icon" href="([^"]+)"/.exec(html)?.[1];
  assert.ok(href, 'expected a <link rel="icon" href="..."> in index.html');
  await access(new URL(`../${href}`, import.meta.url));
});

// WhatsApp and Instagram fetch the preview image by its absolute URL, so the
// tests check that URL, the file behind it and the size declared in the tags.
const PREVIEW_IMAGE_MAX_BYTES = 300 * 1024;
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function metaContent(property) {
  return new RegExp(`<meta property="${property}" content="([^"]*)">`).exec(html)?.[1];
}

function startsWith(bytes, magic) {
  return magic.every((byte, i) => bytes[i] === byte);
}

// Width and height without any dependency. A PNG keeps them in the first chunk
// (IHDR, bytes 16 to 23). A JPEG is a chain of marker segments; the Start Of
// Frame segment (SOF0 baseline, SOF1 or SOF2 progressive) has them after the
// marker (2 bytes), the length (2) and the precision (1).
function readImageSize(bytes) {
  if (startsWith(bytes, PNG_MAGIC)) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  let offset = 2; // skip the start-of-image marker (FF D8)
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return null;
}

async function loadPreviewImage() {
  const image = metaContent('og:image');
  assert.ok(image, 'expected <meta property="og:image" content="..."> in index.html');
  const bytes = await readFile(new URL(`..${new URL(image).pathname}`, import.meta.url));
  return { image, bytes };
}

test('og:url is an absolute https URL that ends with a slash', () => {
  const pageUrl = metaContent('og:url');
  assert.ok(pageUrl, 'expected <meta property="og:url" content="..."> in index.html');
  assert.equal(new URL(pageUrl).protocol, 'https:');
  assert.ok(pageUrl.endsWith('/'), `og:url should end with "/", got ${pageUrl}`);
});

test('og:image is absolute, on the same origin as og:url, and points to a file in the repo', async () => {
  const pageUrl = metaContent('og:url');
  const image = metaContent('og:image');
  assert.ok(pageUrl && image, 'expected og:url and og:image in index.html');
  assert.match(image, /^https:\/\//, `og:image should be an absolute https URL, got ${image}`);
  assert.equal(new URL(image).origin, new URL(pageUrl).origin, 'og:image and og:url are on different origins');
  await loadPreviewImage(); // throws if the file is missing at the repo root
});

test('the preview image is a JPEG or PNG of at most 300 KB', async () => {
  const { image, bytes } = await loadPreviewImage();
  assert.ok(
    startsWith(bytes, JPEG_MAGIC) || startsWith(bytes, PNG_MAGIC),
    `${image} is not a JPEG or PNG (WhatsApp may ignore other formats, such as WebP)`,
  );
  assert.ok(
    bytes.length <= PREVIEW_IMAGE_MAX_BYTES,
    `${image} has ${bytes.length} bytes; WhatsApp may drop images above ${PREVIEW_IMAGE_MAX_BYTES}`,
  );
});

test('og:image:width and og:image:height are the real size of the preview image', async () => {
  const { bytes } = await loadPreviewImage();
  const width = metaContent('og:image:width');
  const height = metaContent('og:image:height');
  assert.match(width ?? '', /^\d+$/, `og:image:width should be a number, got ${width}`);
  assert.match(height ?? '', /^\d+$/, `og:image:height should be a number, got ${height}`);
  assert.deepEqual({ width: Number(width), height: Number(height) }, readImageSize(bytes));
});

test('og:image:alt is not empty', () => {
  assert.match(metaContent('og:image:alt') ?? '', /\S/);
});
