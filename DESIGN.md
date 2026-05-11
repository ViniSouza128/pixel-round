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
| Grid    | ✅ | ✅ | 2D: toggles cell grid · 3D: toggles wireframe style |
| Download | ✅ | ✅ | 2D: high-res PNG · 3D: WebGL framebuffer PNG |
| Center  | ✅ | ❌ | 1 cell for odd diameters, 2 cells for even |
| Overlay | ✅ | ❌ | Mathematical ellipse in overlay color |
| Zoom    | ✅ | ❌ | Toggle on/off · zooms into top-left quadrant |
| Info    | ✅ | ✅ | Toggles info chip with D / R / Area / Algo |

### Sliders (uniform sizing)

- Height: 52px desktop / 46px mobile
- Track: 9px, radius 5
- Thumb: 30×30 circle, accent with accent-light border
- `cursor: grab` on thumb (changes to `grabbing` on press)
- Cut slider: `max` equals current axis dim (Dx or Dy)

### Cut row

- Visible only in 3D
- Toggle `X | Y` switches the axis. Switching axis:
  1. Updates Cut slider max to the new axis dim
  2. Resets Cut to full (max value)
- Slider goes 0 → axis-dim. At full = no cut.

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
- **Wire** — wireframe only (toggled by the canvas Grid button in 3D)

The grid button doubles as the wire toggle in 3D mode. `prevStyle3D`
remembers the last non-wire style so toggling wire off restores it.

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

- `G` Grid (or wireframe in 3D)
- `C` Center guides
- `D` Download PNG
- `T` Theme cycle (light ↔ dark)
- `I` Info chip on canvas
- `M` Toggle 2D / 3D
- `S` Sounds on/off

---

## 13. Accessibility

- Text contrast ≥ 9:1 on both themes (well above AA 4.5:1)
- Visible focus: 2px accent outline + 2px offset
- `prefers-reduced-motion` disables transitions > 200ms
- Touch targets ≥ 44px (slider thumbs 30px + 7px padding each side)
- Keyboard navigation: native focus + slider arrow keys

---

## 14. Don'ts

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
