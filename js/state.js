/* =============================================================================
   Pixel Round — js/state.js
   All Rights Reserved.

   Global state + DOM references. Loaded first so other modules can read it.
   All `let` declarations at the top of this script live in the shared global
   scope of all non-module scripts loaded in the page.
   ============================================================================ */

/* ---------- State -------------------------------------------------------- */
let state = {
  // navigation
  route: 'tool',

  // mode / shape
  mode:  '2d',          // '2d' | '3d'
  shape: 'circle',      // 'circle' | 'ellipse'

  // render
  render: 'filled',     // 'filled' | 'thin' | 'thick'
  algo:   'euclidean',  // 'euclidean' | 'bresenham' | 'threshold'
  style3d:'classic',    // 'classic' | 'smooth' | 'blocks'
  edges3d: true,        // grid btn in 3D toggles a black edge overlay on
                        // every voxel; default ON so the user can count
                        // blocks when copying the figure into Minecraft.

  // dimensions
  size:   16,
  width:  20,
  height: 12,
  depth:  14,

  // 3D cut — cutPct stores the slider as a fraction [0..1] of the axis size,
  // so when Size changes the cut remains proportional ("keep cutting 50%").
  // cut is the absolute value derived from cutPct each redraw.
  cut:    16,
  cutPct: 1.0,
  axis:  'y',           // 'x' | 'y' — default Y (horizontal slice)

  // toggles
  grid:    true,        // ON by default (matches original)
  center:  false,
  overlay: false,
  zoomBtn: false,
  info:    false,

  // 2D canvas CSS scale via pinch
  zoom2D: 1,
};

/* ---------- Theme ------------------------------------------------------- */
function getTheme(){ return document.documentElement.dataset.theme || 'light'; }
function setTheme(theme){
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0F0F14' : '#FAFAF7');
  /* theme is session-only — not persisted */
  document.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
}

/* ---------- Persistence (intentionally a no-op) ------------------------- */
/* The app always starts at its defaults on every page load. Settings are
   session-only; nothing is stored across reloads. */
function loadPrefs(){ /* no-op */ }
function savePrefs(){ /* no-op */ }

/* ---------- DOM refs (filled in main.js after DOMContentLoaded) ---------- */
let dom = {};
function captureDom(){
  dom = {
    app:        document.querySelector('.app'),
    canvas2D:   document.getElementById('c2d'),
    canvas3D:   document.getElementById('c3d'),
    canvasFrame:document.querySelector('.canvas-frame'),
    toolGrid:   document.querySelector('.tool-grid'),
    infoChip:   document.querySelector('.info-chip'),
    drawer:     document.querySelector('.drawer'),
    drawerBd:   document.querySelector('.drawer-bd'),
    modalBd:    document.querySelector('.modal-bd'),
    toastHost:  document.querySelector('.toast-host'),
  };
}

/* ---------- Slider visual fill (--pct CSS var) -------------------------- */
function setSliderPct(input){
  const min = +input.min || 0, max = +input.max || 64, v = +input.value;
  const pct = max === min ? 0 : ((v - min) / (max - min)) * 100;
  input.style.setProperty('--pct', pct + '%');
}

/* ---------- Shape / algo / style labels (canonical maps) -----------------
   These three lookups are mutated by js/i18n.js when the locale changes,
   so they MUST be reachable as `window.<NAME>` properties.

   Top-level `const` / `let` in classic (non-module) scripts becomes a
   script-scope binding — it's visible as a bare identifier from other
   <script> tags but does NOT show up on the `window` object. The i18n
   module reads them via `window.SHAPE_LABELS` etc. to decide whether
   to apply translations, so we assign explicitly here. Without this
   the shape toggle stays in English forever (visible: Sphere /
   Ellipsoid never translate to Esfera / Elipsoide on PT-BR).

   Keep `const`-style bare names too so existing call sites
   (`SHAPE_LABELS[...]`) keep working — the bare names alias the
   `window.*` slots, so a mutation through either path is visible to
   the other. */
window.SHAPE_LABELS = {
  circle:  { '2d': 'Circle',  '3d': 'Sphere'    },
  ellipse: { '2d': 'Ellipse', '3d': 'Ellipsoid' },
};
window.ALGO_FULL_NAME = {
  euclidean: 'Euclidean',
  bresenham: 'Bresenham',
  threshold: 'Threshold',
};
window.STYLE3D_FULL_NAME = {
  classic: 'Classic',
  smooth:  'Smooth',
  blocks:  'Blocks',
};
const SHAPE_LABELS      = window.SHAPE_LABELS;
const ALGO_FULL_NAME    = window.ALGO_FULL_NAME;
const STYLE3D_FULL_NAME = window.STYLE3D_FULL_NAME;
