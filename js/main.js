/* =============================================================================
   Pixel Round — js/main.js
   All Rights Reserved.

   Bootstrap. Runs once DOM is ready.
   ============================================================================ */

function applyLoadedPrefsToUI(){
  document.querySelectorAll('input[type=range]').forEach(s => {
    const k = s.dataset.slider;
    if (k && (k in state)) s.value = state[k];
    setSliderPct(s);
  });
  document.querySelectorAll('[data-pref]').forEach(p => {
    const k = p.dataset.pref;
    if (k === 'sound'){ p.checked = Sfx.isEnabled(); return; }
    if (k in state) p.checked = !!state[k];
  });
  // Pill active states for render / algo
  ['render','algo'].forEach(k =>
    document.querySelectorAll(`[data-${k}]`).forEach(p => p.classList.toggle('active', p.dataset[k] === state[k]))
  );
  // 3D style pills use data-3dstyle (different dataset name)
  document.querySelectorAll('[data-3dstyle]').forEach(p =>
    p.classList.toggle('active', p.dataset['3dstyle'] === state.style3d)
  );
  // Cut X/Y toggle
  document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('active', b.dataset.axis === state.axis));
  // Slider value labels
  document.querySelectorAll('[data-val]').forEach(v => {
    const k = v.dataset.val;
    if (k && k in state) v.textContent = state[k];
  });
  // Canvas-corner button states
  document.querySelectorAll('[data-act=grid]').forEach(b => b.classList.toggle('active',
    state.mode === '3d' ? state.edges3d : state.grid));
  document.querySelectorAll('[data-act=center]').forEach(b => b.classList.toggle('active', state.center));
  document.querySelectorAll('[data-act=overlay]').forEach(b => b.classList.toggle('active', state.overlay));
  document.querySelectorAll('[data-act=zoom]').forEach(b => b.classList.toggle('active', state.zoomBtn));
  // Theme buttons
  document.querySelectorAll('[data-theme]').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === getTheme())
  );
  // Initial route highlight (icon-btn active state)
  document.querySelectorAll('.icon-btn[data-route]').forEach(b =>
    b.classList.toggle('active', b.dataset.route === state.route)
  );
}

window.addEventListener('DOMContentLoaded', () => {
  captureDom();
  Sfx.loadPref();
  loadPrefs();

  applyLoadedPrefsToUI();

  if (typeof initI18N === 'function') initI18N();

  setupUI();
  syncShape();

  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (state.mode === '3d'){
      if (init3D(dom.canvas3D)){ resize3D(); autoZoom3D(); update3D(); }
    } else {
      redraw();
    }
  }));

  if (dom.canvasFrame){
    let _ro = null;
    new ResizeObserver(() => {
      if (_ro) cancelAnimationFrame(_ro);
      _ro = requestAnimationFrame(() => {
        _ro = null;
        if (state.mode === '3d') resize3D();
        else if (state.route === 'tool') redraw();
      });
    }).observe(dom.canvasFrame);
  }

  window.addEventListener('resize', () => {
    if (state.mode === '3d') resize3D();
    else if (state.route === 'tool') redraw();
  });

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {});
  }
});
