/* =============================================================================
   Pixel Round — js/ui.js
   All Rights Reserved.

   Wires interactions:
     - Route nav via icon-btns ([data-route]) and brand logo (back to tool)
     - Mode/shape toggles in topbar center
     - Render/algo/style3d pills
     - Sliders (Size, W, H, D, Cut) — Cut.max is dynamic per axis
     - Cut X|Y toggle resets the other axis
     - Theme cycle (T or theme button); Settings prefs (data-pref)
     - Canvas corner buttons:
         grid    → toggles 2D grid OR 3D edge overlay (mode-aware)
         center  → toggles center guides
         overlay → toggles perfect-circle overlay (2D only)
         zoom    → toggles top-left quadrant zoom (2D only)
         info    → toggles info chip
         download→ PNG export
     - Pinch (2D: CSS scale; 3D: distance + midpoint rotation)
     - Wheel zoom + click-drag rotation in 3D
     - Keyboard: G C D T I M S
   ============================================================================ */

/* ---------- ROUTE NAVIGATION ---------------------------------------------- */
function goRoute(route){
  state.route = route;
  document.querySelectorAll('.route').forEach(r => {
    r.hidden = (r.dataset.route !== route);
  });
  // Icon button active states (info / settings)
  document.querySelectorAll('.icon-btn[data-route]').forEach(b => {
    b.classList.toggle('active', b.dataset.route === route);
  });
  if (route === 'tool') requestAnimationFrame(() => { resize3D(); redraw(); });
  Sfx.click();
}

/* ---------- THEME --------------------------------------------------------- */
function cycleTheme(){
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  redraw();
  Sfx.pop();
}

/* ---------- SYNCSHAPE (visibility by mode/shape) ------------------------- */
function syncShape(){
  // Slider visibility
  const showSize  = state.shape === 'circle';
  const showW     = state.shape === 'ellipse';
  const showH     = state.shape === 'ellipse';
  const showDepth = state.shape === 'ellipse' && state.mode === '3d';
  document.querySelector('[data-dim=size]').hidden   = !showSize;
  document.querySelector('[data-dim=width]').hidden  = !showW;
  document.querySelector('[data-dim=height]').hidden = !showH;
  document.querySelector('[data-dim=depth]').hidden  = !showDepth;

  // 2D shows algorithm pills; 3D shows style pills
  document.querySelectorAll('.algo-pill').forEach(b => b.hidden = state.mode === '3d');
  document.querySelectorAll('.style-pill').forEach(b => b.hidden = state.mode !== '3d');

  // Cut row only in 3D
  document.querySelector('.tool-grid').classList.toggle('has-cut', state.mode === '3d');

  // Update Cut slider max based on selected axis
  syncCutMax();

  // Mode/shape button labels (Circle↔Sphere, Ellipse↔Ellipsoid)
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
  document.querySelectorAll('.shape-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.shape === state.shape);
    const lbl = SHAPE_LABELS[b.dataset.shape]?.[state.mode];
    if (lbl) b.textContent = lbl;
  });

  // Canvas-corner buttons that don't apply to current mode
  const overlayBtn = document.querySelector('[data-act=overlay]');
  const zoomBtn    = document.querySelector('[data-act=zoom]');
  if (overlayBtn) overlayBtn.hidden = state.mode === '3d';
  if (zoomBtn)    zoomBtn.hidden    = state.mode === '3d';

  // Body class drives canvas visibility (CSS)
  document.body.classList.toggle('mode3d', state.mode === '3d');
}

/* Cut slider max = current axis dimension. So you can never cut past the
   figure (a Cut of 14 on axis X with width 14 means "cut everything"). */
/* Cut is stored as a fraction (cutPct ∈ [0..1]) of the chosen axis size.
   When size changes the cut stays proportional — e.g. cutPct=0.5 always
   removes half the figure, snapping to the nearest integer voxel. */
function syncCutMax(){
  const cs = document.querySelector('[data-slider=cut]');
  if (!cs) return;
  const isEllipse = state.shape === 'ellipse';
  const Dx = isEllipse ? state.width : state.size;
  const Dy = isEllipse ? state.height : state.size;
  // Cut max scales with the chosen axis. Diagonal (x+y >= cut) covers
  // the full Dx+Dy range so the slider can reach "remove nothing".
  const maxVal = state.axis === 'x' ? Dx
               : state.axis === 'y' ? Dy
               : /* 'diag' */         (Dx + Dy);
  cs.max = maxVal;
  cs.min = 0;
  const pct = (state.cutPct == null) ? 1 : state.cutPct;
  const absVal = Math.round(pct * maxVal);
  cs.value = Math.max(0, Math.min(maxVal, absVal));
  state.cut = +cs.value;
  setSliderPct(cs);
  const cv = document.querySelector('[data-val=cut]');
  if (cv) cv.textContent = cs.value;
}

/* ---------- UNDO / REDO HISTORY -----------------------------------------
   Lightweight time-travel for figure-changing edits. Snapshots only the
   fields that change the figure (mode/shape/render/algo/style3d/sizes/
   cut/axis). Camera angle, edge overlay, theme, sound, info-chip and
   other purely visual flags are deliberately excluded.

   Two stacks: undo and redo, stored as JSON strings so duplicate
   consecutive snapshots are cheap to detect. Slider input uses
   pushHistoryDebounced (commits 250 ms after the last input) so a drag
   becomes one history entry, not 50. Discrete clicks call pushHistory
   immediately. Capped at 50 entries. */
const HIST_FIELDS = [
  'mode', 'shape', 'render', 'algo', 'style3d',
  'size', 'width', 'height', 'depth',
  'cut', 'cutPct', 'axis',
];
const HIST_MAX = 50;
let _histStack = [];
let _histPos = -1;
let _histDebounce = null;
let _histApplying = false;     // re-entrancy guard during _applyHistory

function _histSnap(){
  const o = {};
  HIST_FIELDS.forEach(k => o[k] = state[k]);
  return JSON.stringify(o);
}
function pushHistory(){
  if (_histApplying) return;
  const snap = _histSnap();
  if (_histPos >= 0 && _histStack[_histPos] === snap) return;
  // Drop everything after current pos (the redo branch is now invalid).
  _histStack = _histStack.slice(0, _histPos + 1);
  _histStack.push(snap);
  _histPos = _histStack.length - 1;
  if (_histStack.length > HIST_MAX){
    _histStack.shift();
    _histPos--;
  }
}
function pushHistoryDebounced(){
  if (_histDebounce) clearTimeout(_histDebounce);
  _histDebounce = setTimeout(() => { _histDebounce = null; pushHistory(); }, 250);
}
function _applyHistory(snap){
  _histApplying = true;
  const o = JSON.parse(snap);
  Object.assign(state, o);
  // Rehydrate every UI control that reflects a snapshotted field.
  document.querySelectorAll('input[type=range]').forEach(s => {
    const k = s.dataset.slider;
    if (k && (k in state)) s.value = state[k];
    setSliderPct(s);
  });
  ['render','algo'].forEach(k =>
    document.querySelectorAll(`[data-${k}]`).forEach(p => p.classList.toggle('active', p.dataset[k] === state[k]))
  );
  document.querySelectorAll('[data-3dstyle]').forEach(p =>
    p.classList.toggle('active', p.dataset['3dstyle'] === state.style3d)
  );
  document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('active', b.dataset.axis === state.axis));
  document.querySelectorAll('[data-val]').forEach(v => {
    const k = v.dataset.val;
    if (k && k in state) v.textContent = state[k];
  });
  syncShape();
  /* syncShape() → syncCutMax() recomputes state.cut from cutPct * max
     and could round it ±1 away from the snapshot. Restore the exact
     snapshotted cut so undo is byte-faithful, and re-sync the slider /
     value label. */
  if ('cut' in o){
    state.cut = o.cut;
    const cs = document.querySelector('[data-slider=cut]');
    if (cs){
      cs.value = state.cut;
      setSliderPct(cs);
      const cv = document.querySelector('[data-val=cut]');
      if (cv) cv.textContent = cs.value;
    }
  }
  if (state.mode === '3d' && typeof autoZoom3D === 'function') autoZoom3D();
  redraw();
  _histApplying = false;
}
function undo(){
  if (_histPos <= 0) return false;
  _histPos--;
  _applyHistory(_histStack[_histPos]);
  return true;
}
function redo(){
  if (_histPos >= _histStack.length - 1) return false;
  _histPos++;
  _applyHistory(_histStack[_histPos]);
  return true;
}

/* ---------- REDRAW ------------------------------------------------------- */
let _redrawRaf = null;
function redraw(){
  if (_redrawRaf) cancelAnimationFrame(_redrawRaf);
  _redrawRaf = requestAnimationFrame(() => {
    _redrawRaf = null;
    if (state.mode === '2d'){
      draw2D(dom.canvas2D);
    } else {
      if (init3D(dom.canvas3D)) update3D();
    }
    updateInfoChip();
    savePrefs();
  });
}

/* ---------- CANVAS PULSE -------------------------------------------------- */
let _pulseTimer = null;
function pulseCanvas(){
  if (!dom.canvasFrame) return;
  dom.canvasFrame.classList.remove('pulse');
  void dom.canvasFrame.offsetWidth;
  dom.canvasFrame.classList.add('pulse');
  clearTimeout(_pulseTimer);
  _pulseTimer = setTimeout(() => dom.canvasFrame.classList.remove('pulse'), 200);
}

/* ---------- TOAST -------------------------------------------------------- */
function toast(msg, kind = ''){
  if (!dom.toastHost) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  dom.toastHost.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, 1700);
}

/* ---------- RESET -------------------------------------------------------- */
function resetState(){
  Object.assign(state, {
    mode:'2d', shape:'circle', render:'filled', algo:'euclidean', style3d:'classic',
    size:16, width:20, height:12, depth:14, cut:16, cutPct:1.0, axis:'y',
    grid:true, center:false, overlay:false, zoomBtn:false, info:false, zoom2D:1,
    edges3d:true,
  });
  document.querySelectorAll('input[type=range]').forEach(s => {
    const k = s.dataset.slider;
    if (k && (k in state)) s.value = state[k];
    setSliderPct(s);
  });
  // Sound isn't in `state` — it lives in Sfx. "Restore all settings"
  // is meaningless if mute survives, so flip it back to the default
  // ON state and reflect that in the Settings checkbox.
  Sfx.setEnabled(true);
  document.querySelectorAll('[data-pref]').forEach(p => {
    const pk = p.dataset.pref;
    if (pk === 'sound')        p.checked = true;
    else if (pk === 'locale')  return;             // locale is intentionally not reset
    else if (pk in state)      p.checked = !!state[pk];
  });
  ['render','algo'].forEach(k =>
    document.querySelectorAll(`[data-${k}]`).forEach(p => p.classList.toggle('active', p.dataset[k] === state[k]))
  );
  document.querySelectorAll('[data-3dstyle]').forEach(p =>
    p.classList.toggle('active', p.dataset['3dstyle'] === state.style3d)
  );
  document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('active', b.dataset.axis === state.axis));
  document.querySelectorAll('[data-val]').forEach(v => {
    const k = v.dataset.val;
    if (k && k in state) v.textContent = state[k];
  });
  document.querySelectorAll('[data-act=grid],[data-act=center],[data-act=overlay],[data-act=zoom]').forEach(b => {
    const act = b.dataset.act === 'zoom' ? 'zoomBtn' : b.dataset.act;
    b.classList.toggle('active', !!state[act]);
  });
  state.zoom2D = 1;
  syncShape();
  if (state.mode === '3d') resetCamera3D();
  redraw();
  // Record the reset as a single history entry so Ctrl+Z restores
  // whatever the user had before clicking Reset.
  pushHistory();
  Sfx.ok();
  toast(t('reset'), 'ok');
}

/* Returns true if `el` is a non-navigation tool toggle — render/algo/style
   pills, mode/shape/axis buttons, canvas-corner buttons, reset/download
   icon-btns. We use this to auto-leave Info/Settings the moment the user
   touches anything that would change the figure: clicking a toggle while
   on an inspector route should snap us back to the canvas. */
function isToolToggle(el){
  if (!el) return false;
  if (el.dataset.route || el.dataset.act === 'logo' || el.dataset.act === 'theme') return false;
  if (el.dataset.act === 'info-chip' || el.dataset.act === 'lang') return false;
  // Reset lives in the Settings page itself — clicking it should NOT
  // teleport the user out of Settings before the reset toast appears.
  if (el.dataset.act === 'reset') return false;
  return !!(el.dataset.render || el.dataset.algo || el.dataset['3dstyle']
         || el.dataset.mode   || el.dataset.shape|| el.dataset.axis
         || el.dataset.act);
}

/* ---------- CLICK DELEGATION --------------------------------------------- */
function setupClickDelegation(){
  document.body.addEventListener('click', e => {
    /* `[data-route]` is scoped to .icon-btn because the `.route` containers
       themselves carry data-route="info" / "settings". Without the scope,
       any click inside the Info or Settings page would bubble up to the
       container, match the selector, and treat it as a "click Info while
       on Info" toggle — kicking the user back to the tool route. */
    const t = e.target.closest('[data-act],.icon-btn[data-route],[data-render],[data-algo],[data-3dstyle],[data-mode],[data-shape],[data-axis],[data-theme]');
    if (!t) return;

    // Route nav (icon-btns + brand logo). Clicking the same route again
    // toggles back to tool, so info/settings act like inspectors.
    if (t.dataset.route){
      const next = (state.route === t.dataset.route && t.dataset.route !== 'tool') ? 'tool' : t.dataset.route;
      goRoute(next);
      return;
    }

    // If we're on Info or Settings and the user touches a tool toggle,
    // return to the canvas first so the change is visible.
    if (state.route !== 'tool' && isToolToggle(t)){
      goRoute('tool');
    }

    const a = t.dataset.act;
    /* Brand is a real <a href="#"> for keyboard / a11y; preventDefault
       stops the browser from scrolling to top and appending "#" to the URL. */
    if (a === 'logo'){ e.preventDefault(); goRoute('tool'); return; }
    if (a === 'theme'){ cycleTheme(); return; }
    if (a === 'lang'){ if (typeof cycleLocale === 'function') cycleLocale(); Sfx.click(); return; }

    if (a === 'info-chip'){
      const chip = document.querySelector('.info-chip');
      chip?.classList.toggle('open');
      Sfx.hover();
      return;
    }

    if (a === 'grid'){
      if (state.mode === '3d'){
        state.edges3d = !state.edges3d;
        t.classList.toggle('active', state.edges3d);
        Sfx.click();
        if (typeof toggleEdges3D === 'function') toggleEdges3D();
        else update3D();
        toast(window.t(state.edges3d ? 'edges_on' : 'edges_off'));
      } else {
        state.grid = !state.grid;
        t.classList.toggle('active', state.grid);
        const inp = document.querySelector('[data-pref=grid]');
        if (inp) inp.checked = state.grid;
        Sfx.click(); redraw(); toast(window.t(state.grid ? 'grid_on' : 'grid_off'));
      }
      return;
    }

    if (a === 'center'){
      state.center = !state.center;
      t.classList.toggle('active', state.center);
      const inp = document.querySelector('[data-pref=center]');
      if (inp) inp.checked = state.center;
      Sfx.click();
      if (state.mode === '3d') update3D(); else redraw();
      return;
    }

    if (a === 'overlay'){
      state.overlay = !state.overlay;
      t.classList.toggle('active', state.overlay);
      Sfx.click(); redraw(); return;
    }

    if (a === 'zoom'){
      // Toggle on/off (not cumulative)
      state.zoomBtn = !state.zoomBtn;
      t.classList.toggle('active', state.zoomBtn);
      Sfx.click(); redraw(); return;
    }

    if (a === 'download'){ downloadPNG(); Sfx.ok(); toast(window.t('png_saved'), 'ok'); return; }
    if (a === 'reset'){ resetState(); return; }

    // Pills
    if (t.dataset.render){
      state.render = t.dataset.render;
      document.querySelectorAll('[data-render]').forEach(p => p.classList.toggle('active', p === t));
      Sfx.click(); redraw(); pushHistory(); return;
    }
    if (t.dataset.algo){
      state.algo = t.dataset.algo;
      document.querySelectorAll('[data-algo]').forEach(p => p.classList.toggle('active', p === t));
      Sfx.click(); redraw(); pushHistory(); return;
    }
    if (t.dataset['3dstyle']){
      state.style3d = t.dataset['3dstyle'];
      document.querySelectorAll('[data-3dstyle]').forEach(p => p.classList.toggle('active', p === t));
      Sfx.click(); update3D(); pushHistory(); return;
    }

    if (t.dataset.mode){
      if (state.mode === t.dataset.mode) return;
      state.mode = t.dataset.mode;
      // Grid button reflects different state per mode: in 2D it's the cell
      // grid toggle; in 3D it's the edge-overlay toggle (default ON).
      const gridBtn = document.querySelector('[data-act=grid]');
      if (gridBtn) gridBtn.classList.toggle('active',
        state.mode === '3d' ? state.edges3d : state.grid);
      syncShape();
      if (state.mode === '3d'){
        if (init3D(dom.canvas3D)){ resize3D(); autoZoom3D(); update3D(); }
      } else {
        redraw();
      }
      Sfx.pop(); pushHistory(); return;
    }
    if (t.dataset.shape){
      if (state.shape === t.dataset.shape) return;
      state.shape = t.dataset.shape;
      syncShape();
      if (state.mode === '3d'){ autoZoom3D(); update3D(); }
      else { redraw(); }
      Sfx.pop(); pushHistory(); return;
    }
    if (t.dataset.axis){
      if (state.axis === t.dataset.axis) return;
      state.axis = t.dataset.axis;
      // Switching axis keeps the same percentage cut on the new axis.
      syncCutMax();
      document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('active', b === t));
      // Switching axis shifts which side of the figure is trimmed; re-fit
      // so the visible portion stays centred on the canvas.
      Sfx.click();
      if (typeof autoZoom3D === 'function') autoZoom3D();
      update3D();
      pushHistory();
      return;
    }

    if (t.dataset.theme){ setTheme(t.dataset.theme); redraw(); Sfx.pop(); return; }
  });
}

/* ---------- SLIDERS ------------------------------------------------------ */
/* Each <input type=range> carries its baseline in the HTML `value="…"`
   attribute (mirrored on input.defaultValue). Double-clicking the slider
   snaps it back to that value, re-fires the input handler, and (for Cut)
   restores the "no cut" / 100% position. */
function setupSliders(){
  document.querySelectorAll('input[type=range]').forEach(sl => {
    sl.addEventListener('dblclick', () => {
      const k = sl.dataset.slider;
      if (k === 'cut'){
        state.cutPct = 1.0;
        sl.value = sl.max;
      } else {
        sl.value = sl.defaultValue;
      }
      sl.dispatchEvent(new Event('input', { bubbles: true }));
      Sfx.pop();
    });
    sl.addEventListener('input', () => {
      const k = sl.dataset.slider;
      if (!k) return;
      // Touching a slider while on Info/Settings snaps us back to the tool
      // so the change can be seen.
      if (state.route !== 'tool') goRoute('tool');
      state[k] = +sl.value;
      const valEl = document.querySelector(`[data-val=${k}]`);
      if (valEl) valEl.textContent = sl.value;
      setSliderPct(sl);
      if (k === 'cut'){
        const max = +sl.max || 1;
        state.cutPct = max > 0 ? (+sl.value / max) : 1;
        // Re-fit the camera every cut step — without it the remaining
        // figure drifts off-centre as voxels are trimmed away.
        if (state.mode === '3d'){ autoZoom3D(); update3D(); }
      } else {
        syncCutMax();
        if (state.mode === '3d'){ autoZoom3D(); update3D(); }
        else { redraw(); pulseCanvas(); }
      }
      if (+sl.value % 4 === 0) Sfx.tick();
      // Slider drags fire many input events — debounce the history
      // snapshot so one drag becomes one undo step.
      pushHistoryDebounced();
    });
  });
}

/* ---------- PREFS (settings toggles) ------------------------------------ */
function setupPrefs(){
  /* Maps a pref key to the i18n key prefix for its on/off toast. */
  const TOAST_PREFIX = { sound:'sounds', grid:'grid', center:'center' };
  document.querySelectorAll('[data-pref]').forEach(el => {
    el.addEventListener('change', () => {
      const k = el.dataset.pref;
      if (k === 'locale'){
        if (typeof setLocale === 'function') setLocale(el.value);
        return;
      }
      if (k === 'sound'){
        Sfx.setEnabled(el.checked);
      } else if (k in state){
        state[k] = el.checked;
        // Sync canvas-corner buttons
        const btn = document.querySelector(`[data-act=${k}]`);
        if (btn) btn.classList.toggle('active', el.checked);
        redraw();
      }
      const pfx = TOAST_PREFIX[k];
      if (pfx) toast(window.t(`${pfx}_${el.checked ? 'on' : 'off'}`));
      Sfx.click();
      savePrefs();
    });
  });
}

/* ---------- 3D POINTER INPUT (mouse + touch single-finger) -------------- */
let _drag = null;
function setup3DPointer(){
  const frame = dom.canvasFrame;
  if (!frame) return;

  frame.addEventListener('wheel', e => {
    e.preventDefault();
    if (state.mode === '3d'){
      distance3D *= e.deltaY > 0 ? 1.08 : 0.93;
      distance3D = Math.max(20, Math.min(400, distance3D));
      updateCamera3D();
    } else {
      const nz = (state.zoom2D || 1) * (e.deltaY > 0 ? 0.92 : 1.09);
      state.zoom2D = Math.max(0.5, Math.min(8, nz));
      redraw();
    }
  }, { passive: false });

  frame.addEventListener('dblclick', () => {
    if (state.mode === '3d'){ resetCamera3D(); }
    else { state.zoom2D = 1; redraw(); }
  });

  frame.addEventListener('mousedown', e => {
    if (state.mode !== '3d') return;
    _drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mousemove', e => {
    if (!_drag) return;
    const dx = e.clientX - _drag.x;
    const dy = e.clientY - _drag.y;
    _drag.x = e.clientX; _drag.y = e.clientY;
    theta3D += dx * 0.005;
    phi3D   -= dy * 0.005;
    phi3D = Math.max(0.05, Math.min(Math.PI - 0.05, phi3D));
    // Only re-orient the camera; never re-fit during a drag. Any
    // user-applied zoom (wheel, pinch) must survive a rotation —
    // double-click resets the zoom explicitly.
    updateCamera3D();
  });
  /* Multiple release paths so a drag that ends outside the window
     (mouseup off the document, OS reclaiming focus, tab switch) still
     clears _drag. Without all three, releasing outside leaves _drag
     set and re-entering the page resumes rotation under the cursor
     without a fresh click. */
  window.addEventListener('mouseup',     () => { _drag = null; });
  window.addEventListener('blur',        () => { _drag = null; });
  window.addEventListener('pointercancel',() => { _drag = null; });
  document.addEventListener('mouseleave',() => { _drag = null; });

  frame.addEventListener('touchstart', e => {
    if (state.mode !== '3d') return;
    if (e.touches.length === 1){
      _drag = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });
  frame.addEventListener('touchmove', e => {
    if (!_drag || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - _drag.x;
    const dy = e.touches[0].clientY - _drag.y;
    _drag.x = e.touches[0].clientX; _drag.y = e.touches[0].clientY;
    theta3D += dx * 0.005;
    phi3D   -= dy * 0.005;
    phi3D = Math.max(0.05, Math.min(Math.PI - 0.05, phi3D));
    // Rotation only — never re-fit on drag (preserves user zoom).
    updateCamera3D();
  }, { passive: true });
  frame.addEventListener('touchend',   () => { _drag = null; });
  frame.addEventListener('touchcancel',() => { _drag = null; });
}

/* ---------- PINCH ZOOM (2D + 3D) ---------------------------------------- */
function setupPinch(){
  const frame = dom.canvasFrame;
  if (!frame) return;

  let pinchStartDist = 0;
  let pinchStart3D = 70;
  let pinchStart2DZoom = 1;
  let pinchPrevMid = { x:0, y:0 };
  let isPinching = false;

  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const mid  = (a, b) => ({ x:(a.clientX + b.clientX)/2, y:(a.clientY + b.clientY)/2 });

  frame.addEventListener('touchstart', e => {
    if (e.touches.length === 2){
      isPinching = true;
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStart3D = distance3D;
      pinchStart2DZoom = state.zoom2D || 1;
      pinchPrevMid = mid(e.touches[0], e.touches[1]);
      _drag = null;
      e.preventDefault();
    }
  }, { passive: false });

  frame.addEventListener('touchmove', e => {
    if (!isPinching || e.touches.length !== 2) return;
    e.preventDefault();
    const d = dist(e.touches[0], e.touches[1]);
    if (pinchStartDist <= 0) return;
    const ratio = d / pinchStartDist;
    const m = mid(e.touches[0], e.touches[1]);
    const dx = m.x - pinchPrevMid.x;
    const dy = m.y - pinchPrevMid.y;
    pinchPrevMid = m;

    if (state.mode === '3d'){
      let nd = pinchStart3D / ratio;
      nd = Math.max(20, Math.min(400, nd));
      distance3D = nd;
      theta3D += dx * 0.005;
      phi3D   -= dy * 0.005;
      phi3D = Math.max(0.05, Math.min(Math.PI - 0.05, phi3D));
      updateCamera3D();
    } else {
      let nz = pinchStart2DZoom * ratio;
      nz = Math.max(0.5, Math.min(8, nz));
      state.zoom2D = nz;
      redraw();
    }
  }, { passive: false });

  const endPinch = e => {
    if (e.touches.length < 2){
      isPinching = false;
      pinchStartDist = 0;
    }
  };
  frame.addEventListener('touchend', endPinch);
  frame.addEventListener('touchcancel', endPinch);
}

/* ---------- KEYBOARD ----------------------------------------------------- */
function setupKeyboard(){
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    const tag = e.target.tagName;
    const typing = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
    // Undo / Redo is ALWAYS available — including while focus is on a
    // slider (the most common state right after a drag) and while the
    // locale <select> has focus. Three redo bindings cover muscle memory
    // from Office (Ctrl+Y), Photoshop / web editors (Ctrl+Shift+Z) and
    // some Linux DEs / IDEs (Ctrl+Alt+Z). Plain Ctrl+Z is always undo.
    if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'y')){
      e.preventDefault();
      const wantRedo = (k === 'y') || (k === 'z' && (e.shiftKey || e.altKey));
      const did = wantRedo ? redo() : undo();
      if (did) toast(window.t(wantRedo ? 'redo' : 'undo'));
      return;
    }
    // Everything else (G/C/D/T/I/M/S) is suppressed while the user is
    // typing into a form control — keeps the locale <select>'s
    // type-to-jump behaviour from spuriously toggling sound, mode, etc.
    if (typing) return;
    if (k === 'g'){
      const btn = document.querySelector('[data-act=grid]');
      btn?.click();
    }
    else if (k === 'c'){
      state.center = !state.center;
      document.querySelector('[data-act=center]')?.classList.toggle('active', state.center);
      const inp = document.querySelector('[data-pref=center]');
      if (inp) inp.checked = state.center;
      redraw();
      toast(window.t(state.center ? 'center_on' : 'center_off'));
    }
    else if (k === 'd'){ downloadPNG(); toast(window.t('png_saved'), 'ok'); }
    else if (k === 't'){ cycleTheme(); }
    else if (k === 'i'){ document.querySelector('.info-chip')?.classList.toggle('open'); }
    else if (k === 'm'){
      state.mode = state.mode === '2d' ? '3d' : '2d';
      syncShape();
      if (state.mode === '3d'){
        if (init3D(dom.canvas3D)){ resize3D(); autoZoom3D(); update3D(); }
      } else redraw();
      Sfx.pop();
      pushHistory();
    }
    else if (k === 's'){
      Sfx.setEnabled(!Sfx.isEnabled());
      const inp = document.querySelector('[data-pref=sound]');
      if (inp) inp.checked = Sfx.isEnabled();
      toast(window.t(Sfx.isEnabled() ? 'sounds_on' : 'sounds_off'));
    }
  });
}

function setupUI(){
  setupClickDelegation();
  setupSliders();
  setupPrefs();
  setup3DPointer();
  setupPinch();
  setupKeyboard();
  // Seed the undo stack with the initial state so the user can undo
  // all the way back to the moment they opened the page.
  pushHistory();
}
