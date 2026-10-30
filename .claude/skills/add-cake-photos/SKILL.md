---
name: add-cake-photos
description: Use when the user adds, replaces or mentions new cake photos or the hero photo for the Delicias da Cá site - image files dropped in the project root or in fotos-originais/, "coloca as fotos no site", JPEG/PNG/HEIC that must become WebP, or a cake card that still has no photo.
---

# Adding cake photos

Originals live in `fotos-originais/` (git-ignored), named by cake `id`. `scripts/prepare-photos.mjs` turns them into `img/<id>.webp`. Only `img/` is ever committed. File names are hints; the picture decides which cake it is.

## Steps

1. **Find the new files** with `git status --short` (usually the project root). Never commit originals, never `git add .`.
2. **Match each file to an `id`** from `data/menu.json`, or to `hero`. Open every image (the Read tool displays them) and check that the content fits the flavor.
3. **Ask the user before converting a photo** when: the name names no flavor; the picture does not match its name; it looks like a copy or crop of a photo already in `img/`; its `id` already has a photo (a replacement); or two files claim one `id`. Convert the clear ones meanwhile. If the picture can neither confirm nor contradict the name (similar flavors, such as milho and fubá), go with the name and ask for confirmation in the report.
4. **File the originals.** Clear ones: move to `fotos-originais/<id>.<ext>`. Doubtful ones: move to `fotos-originais/pendentes/` keeping their original names (the tool ignores subfolders). Never delete, never invent other folders.
5. **Convert only the new files.** Running the tool on all of `fotos-originais/` rewrites published photos. Copy just the new ones into a `mktemp -d` folder, run `node scripts/prepare-photos.mjs <tmpdir> --dry-run`, then the same without `--dry-run` (output goes to `img/`), then `rm -r` that folder. A cake on a near-black backdrop needs `--no-crop=<id>`.
   If `cwebp` is missing, ask the user to run `brew install webp` in a regular Terminal tab (Homebrew cannot run inside this sandbox). Do not touch sandbox settings or allowlists.
6. **Look at every output** in `img/`: right flavor, upright, no black bars, the cake still reads in a centered square (cards show 112px squares), nothing private (faces, addresses, documents).
7. **Run `npm test`.** It lists the cakes that still have no photo.
8. **Commit only the new files, by path:** `git add img/<id>.webp ...`. Message in Portuguese, e.g. `feat: fotos dos bolos de fubá e de limão`. Do not edit the spec, plan or README for a photo batch. Do not push.
9. **Report in Portuguese:** what was published, what is waiting (with the question for each), and which cakes still have no photo.

When the owner later says a published or parked photo belongs to another cake: rename its original to the right `id` and redo step 5 for it. If it was already published under the wrong `id`, `git rm` that `img/` file in the same commit (the card goes back to having no photo until a right one arrives).

## Common mistakes

| Mistake | Why it hurts |
|---|---|
| Trusting the file name | The tool maps names to ids, so a mislabeled file silently lands on the wrong card |
| Running the tool on the whole folder | Rewrites published photos (`laranja` changes by 2 px) |
| `sips -Z 800` by hand | Upscales small photos; use the tool |
| Calling it done without opening the outputs | Rotation, bars and a wrong cake go unnoticed |
| Editing docs or inventing folders | Out of scope for a photo batch |
