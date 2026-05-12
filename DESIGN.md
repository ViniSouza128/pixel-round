# Pixel Round — Design System

> Living reference. Update whenever a visual or behavioural rule changes.
> All Rights Reserved — see `LICENSE`.

---

## 1. Brand

- **Name:** Pixel Round (covers all 4 shapes: circle, ellipse, sphere, ellipsoid)
- **Tagline:** "Pixel-perfect rounded shapes, made simple."
- **Logo:** filled dot + concentric ring in the accent color
- **Voice:** direct, technically-friendly. Microcopy describes the action
  ("Download PNG", not "Click here"). No emoji in app UI.

---

## 2. Colors (tokens)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f2ede2` | `#0b0b0f` | app background |
| `--surface` | `#fbf6e9` | `#13131c` | cards, slider boxes, pill rows |
| `--surface-hi` | `#ece7d8` | `#1e1e2c` | segmented bg, mode-strip |
| `--border` | `#d8d1bc` | `#2a2a36` | 1px separators |
| `--text` | `#1F1F23` | `#F0F0F5` | body text |
| `--text-muted` | `#4E4E58` | `#B4B4C8` | labels, sub copy (~9:1) |
| `--accent` | `#cc2020` | `#e03030` | CTA, active, pixel color |
| `--accent-light` | `#dd4444` | `#ee5050` | slider thumb border |
| `--accent-dim` | `rgba(204,32,32,.14)` | `rgba(224,48,48,.18)` | hover/active bg |
| `--overlay` | `#7a1040` | `#ff9bbc` | perfect-circle overlay (contrasting) |
| `--grid` | `rgba(80,40,30,.12)` | `rgba(255,255,255,.06)` | canvas grid lines |
| `--center` | `rgba(100,30,30,.22)` | `rgba(200,140,140,.18)` | center guide bars |

**Critical:** the overlay color is INTENTIONALLY contrasting to the pixel
color — purple-ish on light, pink-ish on dark. They must never be the same,
or the comparison overlay becomes invisible against the pixel shape.

---

## 3. Typography

- **Display:** Inter 800, -1% letter-spacing, 28-42px
- **H2 / section headings:** Inter 800, 18-22px
- **Body:** Inter 400/500, 14-15px, 1.7 line-height
- **Mono (values):** JetBrains Mono 700, 13-14px — only for numeric output
- **Labels:** Inter 700, uppercase, 12-14px, .04em–.12em letter-spacing

Font sizes are ~15% larger than the previous iteration. Section title was
24→28px; body was 13→14-15px; slider label was 11→12px; etc.

---

## 4. Spacing

8px grid. Multiples: 4, 8, 12, 16, 24, 32, 48, 64. Card padding ≥16; gap
between cards 12–16; section margin 24–32.

---

## 5. Border radius

- Tight: 6px (chips, small buttons)
- Default: 12px (cards, inputs, slider boxes)
- Round: 50% (slider thumb)
- Pill: 999px (capsule controls — none currently in use)

---

## 6. Unified Topbar (NEW)

Single topbar across all viewport sizes (no separate mob-topbar). Layout:

```
[ logo-icon + Pixel Round ]   [ 2D|3D · Circle|Ellipse ]   [ ☼ ⓘ ⚙ ]
       brand (left)                center (toggles)            actions (right)
```

- **Brand:** clickable, returns to the Tool route.
- **Center:** mode toggle (2D/3D) + shape toggle (Circle/Ellipse, dynamically
  re-labels to Sphere/Ellipsoid in 3D mode).
- **Actions:** theme cycle, **Info** (route to Info page), **Settings**
  (route to Settings page). Info and Settings are icon buttons that gain an
  `.active` state when their route is current.
- **Mobile (≤640px):** center row wraps below the brand+actions row.

Removed in this iteration: separate mob-topbar, drawer, gallery route,
in-tool info-modal button, info modal entirely.

---

## 7. Tool layout rules

### Per-mode visibility

| Mode + Shape | Size | W | H | D | Cut | Algo pills | Style3D pills |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 2D Circle    | ✅ |    |    |    |    | ✅ |    |
| 2D Ellipse   |    | ✅ | ✅ |    |    | ✅ |    |
| 3D Sphere    | ✅ |    |    |    | ✅ |    | ✅ |
| 3D Ellipsoid |    | ✅ | ✅ | ✅ | ✅ |    | ✅ |

Render pills (Filled / Thin / Thick) are visible in ALL combinations.

### Canvas corner buttons

| Button | 2D | 3D | Notes |
|---|:-:|:-:|---|
| Grid    | ✅ | ✅ | 2D: toggles cell grid · 3D: toggles per-voxel edge overlay |
| Download | ✅ | ✅ | 2D: high-res PNG · 3D: WebGL framebuffer PNG |
| Center  | ✅ | ❌ | 1 cell for odd diameters, 2 cells for even |
| Overlay | ✅ | ❌ | Mathematical ellipse in overlay color |
| Zoom    | ✅ | ❌ | Toggle on/off · zooms into top-left quadrant |
| Info    | ✅ | ✅ | Info chip: D / R, Area + Algo in 2D, Vol + Style in 3D |

### Sliders (uniform sizing)

- Height: 52px desktop / 46px mobile
- Track: 9px, radius 5
- Thumb: 30×30 circle, accent with accent-light border
- `cursor: grab` on thumb (changes to `grabbing` on press)
- Cut slider: `max` equals current axis range — `Dx`, `Dy`, or
  `Dx + Dy` for the diagonal axis

### Cut row

- Visible only in 3D
- Toggle `X | Y | ⟋` switches the axis:
  - **X** — slice perpendicular to the X axis (test: `x ≥ cut`).
  - **Y** — slice perpendicular to the Y axis (test: `y ≥ cut`).
  - **⟋** — 45° diagonal slice in the x+y plane (test: `x + y ≥ cut`).
- Switching axis preserves the **proportional** cut: a 50% cut stays
  50% on the new axis. The slider max scales to the chosen axis —
  `Dx`, `Dy`, or `Dx + Dy` for diagonal.
- At max = no cut. At 0 = everything cut.
- The 3D camera re-fits (`autoZoom3D`) on every axis switch so the
  visible portion stays centred.

### Center guides

- 1 cell wide for odd diameters (center crosses a single cell)
- 2 cells wide for even diameters (center sits between cells)
- Extends across the FULL canvas (not just the shape bounds)
- Color: `var(--center)`

### Grid

- Full canvas coverage (extends past shape bounds)
- Drawn BEHIND the pixel cells (no overlap competition)
- Default ON

---

## 8. Algorithms (visually distinct)

Three implementations in `js/algorithms.js`, each producing a different
pixel pattern:

- **Euclidean** — distance test at pixel centers. Smoothest, most "ideal".
- **Bresenham** — integer midpoint algorithm. Stair-stepped pixel-art look.
  Handles both true circles and ellipses with separate code paths.
- **Threshold** — corner coverage. Any cell with a corner inside the
  ellipse fills. Chunkiest, biggest silhouette at a given size.

Switching algorithm visibly changes the drawn shape. If two algorithms look
identical for your test size, change the size — small diameters magnify the
differences.

---

## 9. 3D styles

`state.style3d` drives how voxels are shaded:

- **Classic** — strong face contrast (default)
- **Smooth** — lower face contrast, more even shading
- **Blocks** — visible grooves between voxels (slight inset)

In 3D the canvas Grid button toggles `state.edges3d` — a black edge
overlay on every voxel (default ON), independent of `style3d`. There
is no longer a separate "Wire" style.

---

## 10. Animations

| Name | Spec | Use |
|---|---|---|
| Micro hover/click | 120–150ms ease-out | pills, buttons |
| Theme transition | instant (var swap) | no fade |
| Canvas pulse | 150ms ease · scale 1→1.012→1 | slider input feedback |
| Pinch zoom / rotate | real-time | 3D camera updates per frame |

Respects `prefers-reduced-motion` — caps all animations at 0.01ms.

---

## 11. Sounds

Synthesized via WebAudio (`js/audio.js`). All sine waves, gain ≤.035.

| Name | Spec | Use |
|---|---|---|
| click | 620Hz sine 50ms gain .025 | any button/pill |
| hover | 1100Hz sine 20ms gain .012 | desktop only |
| open  | 480→640Hz arpeggio | (currently unused — no modals/drawers) |
| close | 640→480Hz arpeggio | (idem) |
| ok    | 520→720→920Hz | reset, download |
| pop   | 680+980Hz duo | mode/shape toggle, theme cycle |
| tick  | 1300Hz sine 12ms | every 4th slider step |
| error | 200Hz sine 160ms | invalid action |

---

## 12. Keyboard shortcuts

- `G` Grid (2D) / edge overlay (3D)
- `C` Center guides
- `D` Download PNG
- `T` Theme cycle (light ↔ dark)
- `I` Info chip on canvas
- `M` Toggle 2D / 3D (recorded in history)
- `S` Sounds on/off
- `Ctrl+Z` Undo · `Ctrl+Y` / `Ctrl+Shift+Z` / `Ctrl+Alt+Z` Redo

---

## 13. Accessibility

- Text contrast ≥ 9:1 on both themes (well above AA 4.5:1)
- Visible focus: 2px accent outline + 2px offset
- `prefers-reduced-motion` disables transitions > 200ms
- Touch targets ≥ 44px (slider thumbs 30px + 7px padding each side)
- Keyboard navigation: native focus + slider arrow keys

---

## 14. Internationalisation (i18n)

`js/i18n.js` is the single source of truth for every user-facing
string. Seven locales ship out of the box:

| Code   | Language              | Audience       |
|--------|-----------------------|----------------|
| en-US  | English (US)          | base / fallback |
| es-ES  | Español               | ~500 M speakers |
| pt-BR  | Português (Brasil)    | ~210 M speakers |
| fr-FR  | Français              | ~300 M speakers |
| de-DE  | Deutsch               | ~130 M speakers |
| zh-CN  | 简体中文              | ~1.1 B speakers |
| ja-JP  | 日本語                | ~125 M speakers |

`en-US` is the canonical key set — every other locale must mirror
exactly those keys. Missing keys fall back to English silently;
missing English keys return the literal key (so untranslated strings
stay visible during development).

- `AVAILABLE_LOCALES` — declarative list. Adding a locale = appending
  one entry plus a mirrored `TR[code]` block.
- `t(key)` — returns the current-locale string, falling back to
  English, then to the literal key (untranslated strings stay
  visible during development).
- `setLocale(code)` — persists to `localStorage` under `pr_locale`,
  rewrites `<html lang>`, document title, meta description, every
  `[data-i18n]` / `[data-i18n-title]` / `[data-i18n-aria]` node, the
  info-chip labels (Area / Algo in 2D vs Vol / Style in 3D), the
  Info page tree, and the Settings locale `<select>`.
- Topbar pill `[data-act="lang"]` cycles locales in order.
- Locale is the **only** preference that survives a reload —
  everything else is session-only. Resetting the language to English
  on every visit would be hostile, so this exception is intentional.
- **Canonical maps** (`SHAPE_LABELS`, `ALGO_FULL_NAME`,
  `STYLE3D_FULL_NAME`) live on `window` in [js/state.js](js/state.js)
  so the i18n module (which lives inside an IIFE) can reach them as
  `window.<NAME>`. Top-level `const` in a classic script does NOT go
  on `window` — declaring them as `const` alone silently breaks
  shape-button / info-chip translation.

DOs and DON'Ts:

- DO add `data-i18n="key"` to any text node a user reads.
- DO add `data-i18n-title="key"` (mirrors to `aria-label` if present)
  to any element with a `title` attribute.
- DO add new locale-specific names for algorithms / 3D styles by
  extending `ALGO_FULL_NAME` and `STYLE3D_FULL_NAME` lookups inside
  `_applyAlgoStyleNames()`.
- DO NOT hard-code English strings in toasts — go through
  `window.t('key')`.
- DO NOT translate the brand name "Pixel Round".

---

## 15. Undo / Redo

Two-stack history in `js/ui.js`, capped at 50 entries, with JSON
serialisation for cheap dedupe.

- `HIST_FIELDS` — only the fields that change the **figure**:
  `mode, shape, render, algo, style3d, size, width, height, depth,
  cut, cutPct, axis`. Camera angle, edge overlay, theme, sound and
  grid toggles are deliberately excluded — they would create a
  surprising "undo" experience (Ctrl+Z eats your camera angle).
- `pushHistory()` — immediate. Used on discrete clicks (render /
  algo / style3d / mode / shape / axis pills, M key, reset).
- `pushHistoryDebounced()` — 250 ms tail. Used on slider input so
  one drag = one undo step instead of fifty.
- `_applyHistory()` — restores state + rehydrates every UI control
  (sliders, pills, axis buttons, value labels), calls `syncShape()`,
  re-fits the 3D camera if in 3D mode, then `redraw()`s.
- Keyboard: `Ctrl+Z` undo; `Ctrl+Y`, `Ctrl+Shift+Z`, `Ctrl+Alt+Z`
  all redo. Three redo bindings cover muscle memory from Office,
  Photoshop and Linux DEs / IDEs.
- The undo stack is seeded at the end of `setupUI()` with the
  initial state, so users can undo all the way back to "as opened".

---

## 16. Don'ts

- DO NOT use Press Start 2P in Pixel Round — that's the Block Round font
- DO NOT make the grid color same as the pixel color
- DO NOT make the overlay color same as the pixel color
- DO NOT keep the cut slider max at 64 when the axis dim is smaller
- DO NOT stack 4 sliders on mobile without hiding the ones irrelevant to
  the current mode/shape
- DO NOT make the title bar clickable for mode/shape switch — that lives
  only in the toolbar toggles
- DO NOT show Algorithm pills in 3D nor 3D-style pills in 2D
- DO NOT use saturated red `#FF4D4D` — it reads "dry / flat". Use the
  warmer `#cc2020` (light) / `#e03030` (dark).
- DO NOT zoom the 2D canvas from the center on the zoom button — it zooms
  into the top-left quadrant (a corner snapshot for inspection)
- DO NOT use cumulative zoom on the canvas Zoom button — it's a toggle
  (on/off), not "zoom in more on every click"
