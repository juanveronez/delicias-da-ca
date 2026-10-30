<div align="center">

<a href="https://delicias-da-ca.netlify.app/">
  <img src="og-image.jpg" alt="Five homemade ring cakes lined up on a kitchen counter" width="720">
</a>

# Delicias da Cá

**A mobile-first online menu for homemade ring cakes in Campinas/SP, where every cake has an "order on WhatsApp" button.**

[delicias-da-ca.netlify.app](https://delicias-da-ca.netlify.app/)

[![Node 22](https://img.shields.io/badge/Node-22-339933)](#-getting-started)
[![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)](package.json)
[![Tests: node:test](https://img.shields.io/badge/tests-node%3Atest-blue)](#-testing)
[![Hosted on Netlify](https://img.shields.io/badge/hosted%20on-Netlify-00C7B7)](#-deployment)

</div>

## Table of contents

- [About](#-about)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [Project structure](#-project-structure)
- [Getting started](#-getting-started)
- [Editing the menu](#-editing-the-menu)
- [Photos](#-photos)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Conventions](#-conventions)
- [Known gaps](#-known-gaps)

## 🍰 About

Delicias da Cá sells homemade cakes, mostly *bolos de forma* (ring cakes), with delivery in Campinas/SP. This repository is its online menu: one page that shows the flavours, prices and photos and hands the customer over to WhatsApp, where the order is settled. There is no cart, checkout or payment on the site.

It is plain HTML, CSS and JavaScript on purpose. The menu is a JSON file edited by a single person, so there is no build step, no framework to keep up to date and no dependencies to break. Changing a price means editing one line and pushing.

The site itself is written in Brazilian Portuguese; this README is in English.

## ✨ Features

- One "order on WhatsApp" button per cake, opening a chat with a prefilled Portuguese message that names the cake and its price, plus a general order button at the top.
- The 18 flavours come from [`data/menu.json`](data/menu.json), in display order, with prices formatted by `Intl.NumberFormat('pt-BR')`.
- WebP photos with lazy loading. A cake without a photo (or a photo that fails to load) falls back to a plain brown block instead of a broken image.
- Works without JavaScript or when the menu fails to load: a notice with a WhatsApp button replaces the list.
- Mobile first and accessible: one column on phones and two or three on larger screens, touch targets of at least 44px, button labels that start with their visible text, and a layout that survives enlarged text.
- The menu is revalidated on every visit (`cache: 'no-cache'`), so a new price shows up right after a deploy.
- Link previews for WhatsApp and Instagram through Open Graph tags and [`og-image.jpg`](og-image.jpg).
- 125 tests that need no installed dependencies, including a check that the Netlify build publishes only the site files.

## 🧰 Tech stack

| Area | Choice |
|---|---|
| Page | HTML5, CSS3 and JavaScript ES modules, no framework and no bundler |
| Data | [`data/menu.json`](data/menu.json), read with `fetch` |
| Tests | Node's built-in test runner (`node --test`), Node 22 |
| Images | WebP, converted with `sips` (macOS) and `cwebp` by [`scripts/prepare-photos.mjs`](scripts/prepare-photos.mjs) |
| Local server | `python3 -m http.server` (any static server works) |
| Hosting | [Netlify](https://www.netlify.com/) free plan, configured by [`netlify.toml`](netlify.toml) |

## 📁 Project structure

```text
.
├── index.html                  # the single page: header, notices, menu mount point, how to order
├── favicon.svg                 # tab icon: a ring cake drawn in SVG
├── og-image.jpg                # 1200x630 link-preview image (also the banner above)
├── netlify.toml                # what Netlify builds and publishes
├── package.json                # name, "type": "module" and the test script; no dependencies
├── css/
│   └── style.css               # styles, mobile first
├── js/
│   ├── app.js                  # fetches the menu and renders the cards (uses the DOM)
│   └── whatsapp.js             # pure functions: price format, message and WhatsApp link
├── data/
│   └── menu.json               # the cakes, in display order
├── img/                        # optimised WebP photos: <id>.webp and hero.webp
├── scripts/
│   ├── prepare-photos.mjs      # command that turns fotos-originais/ into img/*.webp
│   └── photo-lib.mjs           # pure helpers used by the command
├── tests/                      # node:test suites (*.test.js)
├── docs/superpowers/           # design spec and implementation plan (in Portuguese)
├── .claude/skills/
│   └── add-cake-photos/        # Claude Code skill for adding photos to the site
└── fotos-originais/            # original photos; git-ignored, exists only on the owner's machine
```

## 🚀 Getting started

Prerequisites:

- Node 22, to run the tests and the photo converter. The site itself needs no Node.
- Python 3 (or any static file server) to view the site.
- Only for photo conversion: macOS with `sips` (already there) and `cwebp` (`brew install webp`).

There is nothing to install: do not run `npm install`.

```bash
git clone <repository-url>
cd delicias-da-ca
python3 -m http.server 8000
```

Open <http://localhost:8000>.

A local server is required. Opening `index.html` by double click does not work: browsers block `fetch` and ES modules on `file://` pages, so the page would show the "Cardápio" title and no cakes.

Run the tests with:

```bash
npm test
```

## 📝 Editing the menu

Edit only [`data/menu.json`](data/menu.json). Each cake is one entry:

```json
{ "id": "cenoura-vulcao", "name": "Cenoura vulcão", "price": 50, "photo": "cenoura-vulcao.webp" }
```

| Field | Rule |
|---|---|
| `id` | Unique, lowercase, no accents or spaces, words joined by hyphens. It is also the base name of the photo. |
| `name` | Shown on the card and in the WhatsApp message. |
| `price` | A positive number in reais, without the `R$` symbol. |
| `photo` | Always `<id>.webp`, a file in [`img/`](img/). |

After editing, run `npm test`. It catches broken JSON (a stray comma, for example), a `photo` that is not `<id>.webp` and duplicated ids. When you add or remove a flavour on purpose, the test `menu.json has the expected number of cakes` fails: update the `EXPECTED_COUNT` constant in [`tests/menu.test.js`](tests/menu.test.js).

A new flavour also needs its photo (see below). Without it nothing breaks: the card shows a brown block and `npm test` lists the cake as missing a photo.

## 📸 Photos

Rules for the published files: one photo per cake at `img/<id>.webp`, long side up to 800px (`img/hero.webp`, the photo at the top of the page, up to 1200px), at most 200 KB and no EXIF or XMP metadata.

Workflow:

1. Put the originals in `fotos-originais/` (git-ignored), one file per photo, named after the cake id: `cenoura-vulcao.jpg`. The top photo is `hero.jpg`. `.jpg`, `.jpeg`, `.png` and `.heic` work.
2. Convert:

```bash
node scripts/prepare-photos.mjs --dry-run   # show the plan, write nothing
node scripts/prepare-photos.mjs             # convert fotos-originais/ into img/
```

3. Open every file in `img/` and check the flavour, the rotation and the crop before committing.

For each photo the command crops black bars from screenshots (only bars of 4px or more), applies the rotation stored in the metadata, never upscales, and writes a WebP at quality 80 without metadata. It refuses a result over 200 KB or with EXIF/XMP, skips files whose name is not a cake id, stops before converting anything if two files claim the same id, and never changes the originals. Writes are atomic, so an interrupted run leaves no half-written photo.

| Option | Effect |
|---|---|
| `[sourceDir]` | Folder with the originals (default `fotos-originais`). |
| `--out <dir>` | Folder for the WebP files (default `img`). |
| `--dry-run` | Show what would be done and write nothing. |
| `--no-crop` | Do not remove black bars from any photo. |
| `--no-crop=<id>,<id>` | Same, for the listed ids only. Use it when the background is near black (a cake on a dark cloth looks like a bar to the detector). |

The exit code is 0 when nothing failed, 1 when a photo failed or an id is duplicated, and 2 for usage errors or missing tools. `node scripts/prepare-photos.mjs --help` lists everything.

Running the command on the whole folder rewrites photos that are already published. To convert only new ones, copy them to a temporary folder and use it as the source:

```bash
NEW=$(mktemp -d)
cp fotos-originais/fuba.jpg "$NEW"
node scripts/prepare-photos.mjs "$NEW"
rm -r "$NEW"
```

To have Claude Code do all of this, drop the new photos in the project root or in `fotos-originais/` and ask it to put them on the site. The project skill [`add-cake-photos`](.claude/skills/add-cake-photos/SKILL.md) matches each picture to a cake, converts only the new files, checks the result and commits them by path.

## ✅ Testing

```bash
npm test                          # the whole suite
node --test tests/menu.test.js    # a single file
```

The suite has 125 tests and uses only Node's standard library.

| File | What it covers |
|---|---|
| [`tests/whatsapp.test.js`](tests/whatsapp.test.js) | Price formatting, the WhatsApp message and link (number, encoding of accents and spaces). |
| [`tests/menu.test.js`](tests/menu.test.js) | `data/menu.json`: valid JSON, fields of each cake, number of cakes, unique ids. |
| [`tests/index.test.js`](tests/index.test.js) | `index.html`: WhatsApp links, safe `rel` on external links, error notice and `noscript` fallback, favicon, and the link-preview tags (the `og:image` URL, its file, format, size under 300 KB and declared dimensions). |
| [`tests/app.test.js`](tests/app.test.js) | `js/app.js` never injects HTML, uses a safe `rel`, revalidates the menu and sets `loading` before `src`. |
| [`tests/photos.test.js`](tests/photos.test.js) | Every file in `img/` is a known cake photo (or the hero) and a valid WebP under 200 KB without metadata. |
| [`tests/photo-lib.test.js`](tests/photo-lib.test.js), [`tests/prepare-photos.test.js`](tests/prepare-photos.test.js) | The photo converter: its pure helpers, and the command end to end on synthetic images. |
| [`tests/netlify.test.js`](tests/netlify.test.js) | The Netlify publish list (see [Deployment](#-deployment)). |

Two groups of tests skip themselves, with the reason, instead of failing: the converter end-to-end tests when `sips` or `cwebp` is missing, and the build test when `sh` or Git is missing.

The photos test never fails because a photo is missing. It prints a diagnostic line instead, such as `8 cake(s) without a photo yet: cenoura, cenoura-vulcao, ...; hero.webp present`.

## 🌐 Deployment

The site is hosted on Netlify (free plan) at <https://delicias-da-ca.netlify.app/>.

First time, with the repository on GitHub:

1. In Netlify: **Add new site** -> **Import an existing project** -> **GitHub** -> pick the `delicias-da-ca` repository.
2. The build settings come from [`netlify.toml`](netlify.toml): there is nothing to type. Confirm the deploy.
3. The site name is `delicias-da-ca`, so the address is `https://delicias-da-ca.netlify.app/` (**Site configuration** -> **Change site name** changes it). The `og:url` and `og:image` tags in [`index.html`](index.html) must use exactly this address: WhatsApp fetches the preview image from the URL written there, so if the name ever changes, change both tags.

From then on every push to `main` deploys by itself.

**What is published.** The repository root also holds `docs/`, `tests/`, `scripts/`, `.claude/` and `package.json`, which must not be served. So `netlify.toml` publishes a `dist/` folder that the build fills with the site files only:

```toml
[build]
  command = "mkdir -p dist && cp -R index.html favicon.svg og-image.jpg css js data img dist/"
  publish = "dist"
```

`dist/` is created by the build and is git-ignored. What is served is exactly the `cp -R` list: if the page ever needs another top-level file or folder, add it there. [`tests/netlify.test.js`](tests/netlify.test.js) catches a miss, and also a typo in the list, an internal folder that sneaks in, and a `publish` that differs from the copy destination. It even runs the build command on a temporary copy of the repository and checks the resulting `dist/`.

**Link preview.** [`og-image.jpg`](og-image.jpg) is what WhatsApp and Instagram show when the link is shared. It is a 1200x630 JPEG of about 230 KB, cropped from `img/hero.webp` (a WebP is not reliable for previews). To replace it, keep the format, the 1200x630 size and a weight under 300 KB: `npm test` checks all three and the `og:image:width`/`og:image:height` tags. The steps used to generate it are in Task 9 of the [implementation plan](docs/superpowers/plans/2026-10-29-cardapio-online.md).

To test a preview, send the link to yourself on WhatsApp. WhatsApp caches previews, so to test again after a change append `?v=2` to the link (`https://delicias-da-ca.netlify.app/?v=2`). The Facebook Sharing Debugger is an optional second opinion.

## 📐 Conventions

- Code, comments, test titles and messages, JSON keys, CSS classes and file names are in English.
- Text that the site visitor sees (page copy, `alt` and `aria-label`, meta tags, the WhatsApp message and the cake names) is in Portuguese.
- Deliberate exception: cake `id`s and the photo names derived from them follow the product name in Portuguese (`cenoura-vulcao`, `cenoura-vulcao.webp`).
- Commit messages are in Portuguese.
- The documents in [`docs/`](docs/superpowers) are in Portuguese. This README is in English because it is the project's page on GitHub.

## 🧩 Known gaps

- Photos are still missing for 8 of the 18 cakes (`cenoura`, `cenoura-vulcao`, `chocolate`, `chocolate-chocolate`, `fuba`, `fuba-cremoso`, `milho` and `pacoca`). Their cards show a brown block. The current list is always printed by `npm test`.
- The opening hours shown on the page and the spelling "Delicias" (without the accent) are waiting for the owner's confirmation.
