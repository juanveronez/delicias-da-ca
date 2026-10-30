import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// The page has no runtime dependencies, and `npm test` must keep working without `npm install`.
// So there is no YAML/TOML parser here: small regexes read the few keys that matter.
// These tests pin what the npm scripts, the CI workflow, Biome and Netlify have to agree on.

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

const packageJson = JSON.parse(await read('package.json'));
const biomeConfig = JSON.parse(await read('biome.json').catch(() => '{}'));
const netlifyToml = await read('netlify.toml').catch(() => '');
// Comment lines are dropped, so a "# npm ci" note is never mistaken for a step.
const workflow = (await read('.github/workflows/ci.yml').catch(() => '')).replace(/^\s*#.*$/gm, '');

// "run: npm ci" lines, in file order. The workflow keeps every command on a single line.
const commands = [...workflow.matchAll(/^\s*(?:-\s+)?run:\s*(.+?)\s*$/gm)].map(([, command]) => command);

// The entries under every "permissions:" key, for example ["contents: read"].
function permissionEntries(yaml) {
  const lines = yaml.split('\n');
  const entries = [];
  lines.forEach((line, index) => {
    const match = /^(\s*)permissions:\s*(.*)$/.exec(line);
    if (!match) return;
    // "permissions: write-all" or "permissions: {}" on the same line.
    if (match[2]) {
      entries.push(`permissions: ${match[2]}`);
      return;
    }
    for (const next of lines.slice(index + 1)) {
      if (next.trim() === '') continue;
      if (next.length - next.trimStart().length <= match[1].length) break;
      entries.push(next.trim());
    }
  });
  return entries;
}

const globTokens = { '**/': '(?:.*/)?', '**': '.*', '*': '[^/]*' };

// Biome's files.includes: patterns are read in order and a leading "!" removes what matched.
// A pattern without "/" is tried at any depth, which only makes this check stricter.
function isLinted(file, includes) {
  if (!Array.isArray(includes)) return true;
  let linted = false;
  for (const pattern of includes) {
    const negated = pattern.startsWith('!');
    const glob = negated ? pattern.slice(1) : pattern;
    const source = glob.replace(/\*\*\/|\*\*|\*|[.+^${}()|[\]\\]/g, (token) => globTokens[token] ?? `\\${token}`);
    const matches = new RegExp(glob.includes('/') ? `^${source}$` : `(?:^|/)${source}$`).test(file);
    if (matches) linted = !negated;
  }
  return linted;
}

test('.nvmrc holds a bare Node version', async () => {
  const version = (await read('.nvmrc')).trim();
  assert.match(version, /^\d+(\.\d+){0,2}$/, `.nvmrc should look like "22" or "22.15.0", got "${version}"`);
});

test('package.json has the test, lint and lint:fix scripts', () => {
  const scripts = packageJson.scripts ?? {};
  for (const name of ['test', 'lint', 'lint:fix']) {
    assert.ok(scripts[name], `package.json needs a "${name}" script`);
  }
  assert.match(scripts.test, /\bnode --test\b/);
  assert.match(scripts.lint, /\bbiome check\b/);
  assert.doesNotMatch(scripts.lint, /--write|--fix/, '"lint" must only read: CI should fail, not rewrite files');
  assert.match(scripts['lint:fix'], /\bbiome check\b.*--write\b/);
});

test('package.json pins Biome to an exact version', () => {
  const version = packageJson.devDependencies?.['@biomejs/biome'];
  assert.match(
    String(version),
    /^\d+\.\d+\.\d+$/,
    `expected "@biomejs/biome": "x.y.z" in devDependencies, got ${version}`,
  );
});

test('package.json has no runtime dependencies', () => {
  assert.equal('dependencies' in packageJson, false, 'the page needs no npm package: use devDependencies for tools');
});

test('the CI workflow takes Node from .nvmrc', () => {
  assert.ok(workflow.trim(), '.github/workflows/ci.yml is missing or empty');
  assert.match(workflow, /^\s*node-version-file:\s*["']?\.nvmrc["']?\s*$/m);
});

test('the CI workflow runs npm ci, then npm run lint, then npm test', () => {
  const [install, lint, tests] = ['npm ci', 'npm run lint', 'npm test'].map((command) => commands.indexOf(command));
  assert.deepEqual(
    [install >= 0, lint >= 0, tests >= 0],
    [true, true, true],
    `the workflow needs "run: npm ci", "run: npm run lint" and "run: npm test" steps, found: ${commands.join(' | ')}`,
  );
  assert.ok(install < lint, '"npm ci" must come before "npm run lint"');
  assert.ok(install < tests, '"npm ci" must come before "npm test"');
});

test('the CI workflow grants only read access to the repository contents and uses no secrets', () => {
  assert.ok(workflow.trim(), '.github/workflows/ci.yml is missing or empty');
  assert.match(workflow, /^permissions:/m, 'set permissions at the top level, otherwise the repo default applies');
  const entries = permissionEntries(workflow);
  assert.deepEqual([...new Set(entries)], ['contents: read'], `unexpected permissions: ${entries.join(', ')}`);
  assert.doesNotMatch(workflow, /\bsecrets\./, 'CI only reads and tests the code: it needs no secrets');
});

test('biome.json skips git-ignored files and does not lint index.html', () => {
  assert.equal(biomeConfig.vcs?.enabled, true, 'biome.json needs "vcs.enabled": true');
  assert.equal(biomeConfig.vcs?.clientKind, 'git');
  assert.equal(biomeConfig.vcs?.useIgnoreFile, true, 'node_modules/, dist/ and fotos-originais/ come from .gitignore');
  const includes = biomeConfig.files?.includes;
  assert.ok(Array.isArray(includes) && includes.length > 0, 'biome.json needs a "files.includes" list');
  assert.equal(isLinted('index.html', includes), false, 'index.html is not checked by Biome');
  for (const file of [
    'js/app.js',
    'scripts/photo-lib.mjs',
    'tests/tooling.test.js',
    'css/style.css',
    'data/menu.json',
  ]) {
    assert.equal(isLinted(file, includes), true, `${file} should be checked by Biome`);
  }
});

test('netlify.toml keeps the dev tools out of the Netlify build', () => {
  const environment = /^\[build\.environment\]([^[]*)/m.exec(netlifyToml)?.[1] ?? '';
  assert.match(
    environment,
    /^\s*NPM_FLAGS\s*=\s*"--omit=dev"\s*$/m,
    'expected NPM_FLAGS = "--omit=dev" under [build.environment]',
  );
});
