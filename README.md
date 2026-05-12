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

The interface speaks **English (US)** and **Português (Brasil)** out
of the box. Switch via the locale pill in the topbar or the picker in
Settings; the choice is auto-detected from `navigator.language` on
first visit and remembered in `localStorage` (`pr_locale`).

Adding a locale only touches `js/i18n.js` — append an entry to
`AVAILABLE_LOCALES` and mirror the `en-US` keys under a new `TR`
block.

## Session-only state

All preferences except the chosen **language** are session-only —
every reload starts at the defaults so URLs are sharable as-is.
Locale is persisted on purpose: it'd be hostile to reset the
interface to English on every visit.

## Tech

Vanilla JavaScript + Canvas 2D + three.js. No framework, no build
step. Loads as a single static HTML file. Works offline (PWA).

## License & notices

- **Code, layout, design system:** All Rights Reserved — see `LICENSE`
- **Third-party attributions:** see `NOTICE.md`

## Companion project

A Minecraft-flavoured variant of this tool lives at
[Block Round](https://github.com/ViniSouza128/block-round) — same
algorithms, Minecraft block textures instead of solid pixels.
