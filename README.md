# Pixel Round

A pixel-perfect generator for **circles, ellipses, spheres and
ellipsoids** in pixel art. Browser-based, no installation, no account,
no backend. Exports as PNG.

**Live:** *(GitHub Pages URL — set after deployment)*

## What it does

| Mode        | Shape     | Inputs              |
| ----------- | --------- | ------------------- |
| 2D · Circle    | Round     | Size                |
| 2D · Ellipse   | Oval      | Width + Height      |
| 3D · Sphere    | Voxel     | Size + Cut          |
| 3D · Ellipsoid | Voxel     | Width + Height + Depth + Cut |

Three classic 2D algorithms are available: **Euclidean distance**,
**Bresenham midpoint**, and **Threshold**. Three 3D rendering styles:
**Classic**, **Smooth**, **Blocks**. A separate **Edges** overlay
(toggled by the Grid button in 3D, on by default) draws crisp black
outlines around every voxel — useful when copying the figure
block-by-block into Minecraft.

## Controls

- Toolbar toggles: **2D / 3D** and **Circle / Ellipse** (or Sphere /
  Ellipsoid in 3D)
- **Mouse wheel** on the canvas zooms; in 3D, **drag** rotates and
  **double-click** resets the camera; in 2D, **double-click** resets
  the zoom to 1×
- **Double-click any slider** to snap it back to its default value
  (Cut returns to "no cut" / 100%)
- Cut is **proportional**: 50% stays 50% even when Size changes.
  Default axis = **Y** (horizontal slice). A third axis **⟋** is a
  45° diagonal in the x+y plane; its slider ranges over `Dx + Dy`.
- Pinch on touch screens for zoom + rotation
- **Grid corner button** in 3D toggles the **edge overlay** on all
  voxels (default ON). In 2D it toggles the cell grid.
- **Center guides** in 3D draw a translucent cross along all three
  axes; bar thickness is **1 block** if the perpendicular axis is
  odd-sized, **2 blocks** if even — so it always shines through the
  voxel(s) at the figure's true center. Bars extend far past the
  figure so the alignment reads as axis lines.
- Clicking a tool toggle while on **Info** or **Settings** returns to
  the canvas automatically.
- **Undo / Redo:** every figure-changing edit (mode, shape, render,
  algorithm, 3D style, size sliders, cut, axis, reset) is recorded.
  `Ctrl+Z` undoes; `Ctrl+Y`, `Ctrl+Shift+Z` and `Ctrl+Alt+Z` all redo.
  Slider drags collapse to a single history step. Visual-only
  toggles (camera, edges, theme, sound, grid) are deliberately
  excluded.
- Keyboard: `G` grid · `C` center guides · `D` download · `T` theme
  · `I` info · `M` 2D/3D · `S` sound · `Ctrl+Z` undo · `Ctrl+Y` redo

## Languages

Nine locales ship out of the box (~5.0 billion native speakers
combined):

| Locale | Language               | Native name           |
| ------ | ---------------------- | --------------------- |
| `en-US`| English (US)           | English (US)          |
| `es-ES`| Spanish                | Español               |
| `pt-BR`| Portuguese (Brazil)    | Português (Brasil)    |
| `fr-FR`| French                 | Français              |
| `de-DE`| German                 | Deutsch               |
| `zh-CN`| Chinese (Simplified)   | 简体中文               |
| `ja-JP`| Japanese               | 日本語                 |
| `ru-RU`| Russian                | Русский               |
| `ko-KR`| Korean                 | 한국어                 |

Switch via the locale pill in the topbar (cycles) or the picker in
Settings (direct). The choice is auto-detected from
`navigator.language` on first visit and remembered in `localStorage`
(`pr_locale`).

Adding a locale only touches [js/i18n.js](js/i18n.js) — append an
entry to `AVAILABLE_LOCALES` and mirror the `en-US` keys under a new
`TR` block. ES / FR / DE / ZH / JA used machine translation as a
starting point; native-speaker proofreading is welcome via issues
or PRs.

## Session-only state

All preferences except the chosen **language** are session-only —
every reload starts at the defaults so URLs are sharable as-is.
Locale is persisted on purpose: it'd be hostile to reset the
interface to English on every visit.

## Tech

Vanilla JavaScript + Canvas 2D + three.js. No framework, no build
step. Loads as a single static HTML file. Works offline (PWA).

## Documentation

Two complete documentation sets live in this repo, both rendered as
PDF in nine locales (en-US, es-ES, pt-BR, fr-FR, de-DE, zh-CN, ja-JP,
ru-RU, ko-KR):

- [`docs_math/`](docs_math/) — **technical math companion.** Implicit
  equations, the three rasterization algorithms (Euclidean,
  Bresenham, threshold) with derivations, voxelization, planar cuts,
  3D camera in spherical coordinates, auto-zoom by bounding sphere,
  Lambertian shading approximation, 12-tone audio synthesis.
  Source: shared XeLaTeX template + per-locale translation tables.
- [`docs_aula/`](docs_aula/) — **classroom lesson plans.** Four-period
  sequence aligned to each country's curriculum (BNCC for Brazil,
  Common Core for the US, LOMLOE for Spain, BO for France, KMK for
  Germany, 2017 课标 for China, 学習指導要領 for Japan, ФГОС for
  Russia, 2022 개정 교육과정 for Korea), with figures captured from
  the app, cross-references, and adaptations for low-resource
  classrooms.

Math PDFs build via `cd docs_math && python build.py`. Lesson plans
compile per locale with `xelatex Plano_de_Aula_<locale>.tex`
(two passes for TOC + cross-refs).

## Author & License

Authored by **Vinicius Souza** ([@ViniSouza128](https://github.com/ViniSouza128)).
Copyright © 2026 Vinicius Souza. **All Rights Reserved.**

- **Code, layout, design system, documents:** All Rights Reserved —
  see [`LICENSE`](LICENSE).
- **Third-party attributions:** see [`NOTICE.md`](NOTICE.md).

## Companion project

A Minecraft-flavoured variant of this tool lives at
[Block Round](https://github.com/ViniSouza128/block-round) — same
algorithms, Minecraft block textures instead of solid pixels.
