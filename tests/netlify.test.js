import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Netlify publishes the folder named in netlify.toml, and the build command
// decides what goes into it. These tests keep that list in sync with what the
// page really loads, and keep the repo's other folders (docs, tests, ...) out.

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');

const toml = await read('netlify.toml').catch(() => '');
const html = await read('index.html');
const appSource = await read('js/app.js');

// No TOML library (the tests need no installed package): netlify.toml only needs
// two string keys, so small regexes read them.
const command = /^\s*command\s*=\s*"([^"\n]*)"/m.exec(toml)?.[1];
const publish = /^\s*publish\s*=\s*"([^"\n]*)"/m.exec(toml)?.[1];

// "cp -R <sources...> <destination>/": everything after cp -R, up to the end of the command.
const copyArgs =
  /\bcp\s+-R\s+([^&;|]+)/
    .exec(command ?? '')?.[1]
    .trim()
    .split(/\s+/) ?? [];
const destination = copyArgs.at(-1)?.replace(/\/+$/, '');
const copied = copyArgs.slice(0, -1);

// "./css/style.css?v=2" -> "css": the top-level entry of the repo that holds the path.
function firstSegment(value) {
  return value
    .split(/[?#]/)[0]
    .replace(/^(?:\.?\/)+/, '')
    .split('/')[0];
}

const copiedSegments = new Set(copied.map(firstSegment));

function assertCovered(references, what) {
  assert.ok(references.length > 0, `found no ${what}; the test may be out of date`);
  const missing = references.filter(({ path: ref }) => !copiedSegments.has(firstSegment(ref)));
  assert.deepEqual(
    missing,
    [],
    `${what} not copied by the build command in netlify.toml (add the top-level file or folder to "cp -R"): ${JSON.stringify(missing)}`,
  );
}

test('netlify.toml publishes dist and the build command copies into that same folder', () => {
  assert.ok(command, 'netlify.toml needs a [build] command = "..."');
  assert.ok(publish, 'netlify.toml needs a [build] publish = "..."');
  assert.equal(publish, 'dist');
  assert.ok(copied.length > 0, `expected "cp -R <files> ${publish}/" in the build command, got: ${command}`);
  assert.equal(
    destination,
    publish,
    `the build command copies into "${destination}", but netlify.toml publishes "${publish}"`,
  );
});

test('every path copied by the build command exists in the repo', () => {
  assert.ok(copied.length > 0, 'no paths found after "cp -R" in the build command');
  const missing = copied.filter((entry) => !existsSync(path.join(root, entry)));
  assert.deepEqual(missing, [], `the build command copies paths that do not exist: ${missing.join(', ')}`);
});

test('the build command copies everything index.html references', () => {
  const references = [];
  for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    // Skip external links (https:, mailto:, ...), protocol-relative URLs and in-page anchors.
    if (value && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) {
      references.push({ from: 'index.html', path: value });
    }
  }
  // The preview image is an absolute URL on the site's own origin: strip the origin.
  const ogImage = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  assert.ok(ogImage, 'expected an og:image tag in index.html');
  references.push({ from: 'og:image', path: new URL(ogImage).pathname });
  assertCovered(references, 'local files referenced by index.html');
});

test('the build command copies the files js/app.js fetches and the modules js/*.js import', async () => {
  const references = [];
  for (const name of ['MENU_URL', 'PHOTOS_DIR']) {
    const value = new RegExp(`\\b${name}\\s*=\\s*'([^']+)'`).exec(appSource)?.[1];
    assert.ok(value, `expected ${name} = '...' in js/app.js`);
    // These are resolved against the page (index.html is at the site root).
    references.push({ from: `js/app.js ${name}`, path: value });
  }
  const scripts = (await readdir(path.join(root, 'js'))).filter((name) => name.endsWith('.js'));
  assert.ok(scripts.length > 0);
  for (const script of scripts) {
    const source = await read(`js/${script}`);
    for (const [, specifier] of source.matchAll(/\bfrom\s+'(\.{1,2}\/[^']+)'/g)) {
      // Imports are resolved against the importing file, which lives in js/.
      references.push({ from: `js/${script}`, path: path.posix.join('js', specifier) });
    }
  }
  assert.ok(
    references.some(({ path: ref }) => ref.startsWith('js/')),
    'expected js/app.js to import another module',
  );
  assertCovered(references, 'files used by the scripts');
});

test('the build command does not copy the repo internals', () => {
  assert.ok(copied.length > 0, 'no paths found after "cp -R" in the build command');
  const forbidden = ['docs', 'tests', 'scripts', '.claude', 'fotos-originais', 'node_modules', 'package.json', '.git'];
  const leaked = copied.filter((entry) => forbidden.includes(firstSegment(entry)));
  assert.deepEqual(leaked, [], `the build command must not publish: ${leaked.join(', ')}`);
  // Copying "." or a glob would publish all of the above.
  const wholeRepo = copied.filter((entry) => /^(?:\.{0,2}\/?|\*|\.\*)$/.test(entry));
  assert.deepEqual(wholeRepo, [], `list the files one by one instead of: ${wholeRepo.join(', ')}`);
});

// The files that would be in the repo: tracked ones plus new ones that are not git-ignored.
function listRepoFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
    });
    return output.split('\0').filter((file) => file && existsSync(path.join(root, file)));
  } catch {
    return null;
  }
}

const hasShell = spawnSync('sh', ['-c', 'exit 0']).status === 0;
const repoFiles = hasShell ? listRepoFiles() : null;
const skipBuild = !hasShell
  ? 'sh is not available'
  : !repoFiles
    ? 'git is not available or this is not a Git checkout'
    : false;

test('the build command, run on a copy of the repo, produces a dist/ with only the site', {
  skip: skipBuild,
}, async (t) => {
  assert.ok(command && publish, 'netlify.toml needs a [build] command and publish');
  const cwd = await mkdtemp(path.join(tmpdir(), 'netlify-build-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));

  for (const file of repoFiles) {
    await mkdir(path.dirname(path.join(cwd, file)), { recursive: true });
    await copyFile(path.join(root, file), path.join(cwd, file));
  }

  execFileSync('sh', ['-c', command], { cwd, stdio: 'pipe' });

  const dist = path.join(cwd, publish);
  for (const file of [
    'index.html',
    'favicon.svg',
    'og-image.jpg',
    'css/style.css',
    'js/app.js',
    'js/whatsapp.js',
    'data/menu.json',
    'img/hero.webp',
  ]) {
    assert.ok(existsSync(path.join(dist, file)), `${publish}/${file} is missing after the build`);
  }
  const published = await readdir(dist);
  for (const name of ['docs', 'tests']) {
    assert.ok(!published.includes(name), `${publish}/${name} must not be published`);
  }
  assert.deepEqual(published.sort(), [...copied].sort(), `${publish}/ should hold exactly the copied entries`);
});
