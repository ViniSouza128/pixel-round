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

/* Reserved — kept for older callsites that reference prevStyle3D. */
let prevStyle3D = 'classic';

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

/* ---------- Shape labels (canonical map) -------------------------------- */
const SHAPE_LABELS = {
  circle:  { '2d':'Circle',  '3d':'Sphere' },
  ellipse: { '2d':'Ellipse', '3d':'Ellipsoid' },
};
const ALGO_FULL_NAME = {
  euclidean: 'Euclidean',
  bresenham: 'Bresenham',
  threshold: 'Threshold',
};
const STYLE3D_FULL_NAME = {
  classic: 'Classic',
  smooth:  'Smooth',
  blocks:  'Blocks',
};
