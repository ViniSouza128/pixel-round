/* =============================================================================
   Pixel Round — js/canvas2d.js
   All Rights Reserved.

   2D renderer:
     - Real distinct algorithms via computeFilled() + applyRenderMode()
     - Grid covers the FULL canvas (extends past the shape bounds)
     - Perfect-overlay drawn in a CONTRASTING color (not the pixel color)
     - Center guides at 1 or 2 cells depending on diameter parity
     - Zoom (canvas button) crops/zooms into the TOP-LEFT quadrant
     - downloadPNG exports at high resolution (4000px on the major axis)
   ============================================================================ */

function getAccentColor(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  return v || '#cc2020';
}
function getOverlayColor(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--overlay').trim();
  return v || '#7a1040';
}
function getGridColor(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
  return v || 'rgba(0,0,0,.07)';
}
function getCenterColor(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--center').trim();
  return v || 'rgba(100,30,30,.22)';
}

/* Snap to half-pixel for 1-px stroke crispness */
function snap(v){ return Math.floor(v) + 0.5; }

/* Draw grid lines across the FULL canvas (extends past the shape bounds) */
function drawFullGrid(ctx, ps, ox, oy, cW, cH){
  ctx.save();
  ctx.strokeStyle = getGridColor();
  ctx.lineWidth = 1;
  ctx.beginPath();
  const sx = ((ox % ps) + ps) % ps - ps;
  const sy = ((oy % ps) + ps) % ps - ps;
  for (let x = sx; x <= cW + ps; x += ps){
    const v = snap(x);
    ctx.moveTo(v, 0);
    ctx.lineTo(v, cH);
  }
  for (let y = sy; y <= cH + ps; y += ps){
    const v = snap(y);
    ctx.moveTo(0, v);
    ctx.lineTo(cW, v);
  }
  ctx.stroke();
  ctx.restore();
}

/* Center guides: 1 cell for odd diameters, 2 cells for even (extends past
   the shape bounds across the whole canvas, just like the grid). */
function drawCenterGuides(ctx, cx, cy, ps, ox, oy, cW, cH){
  const isEX = (cx === Math.floor(cx));
  const isEY = (cy === Math.floor(cy));
  ctx.save();
  ctx.fillStyle = getCenterColor();
  const pw = Math.ceil(ps), ph = Math.ceil(ps);
  // Vertical band(s)
  if (isEX){
    ctx.fillRect(Math.floor(ox + (Math.floor(cx) - 1) * ps), 0, pw, cH);
    ctx.fillRect(Math.floor(ox + Math.floor(cx) * ps), 0, pw, cH);
  } else {
    ctx.fillRect(Math.floor(ox + Math.floor(cx) * ps), 0, pw, cH);
  }
  // Horizontal band(s) — drawn in segments so the vertical band stays solid
  const drawRow = (ry) => {
    if (isEX){
      const c1 = Math.floor(ox + (Math.floor(cx) - 1) * ps);
      const c2 = Math.floor(ox + Math.floor(cx) * ps);
      ctx.fillRect(0, ry, c1, ph);
      ctx.fillRect(c1 + pw, ry, c2 - c1 - pw, ph);
      ctx.fillRect(c2 + pw, ry, cW - c2 - pw, ph);
    } else {
      const c1 = Math.floor(ox + Math.floor(cx) * ps);
      ctx.fillRect(0, ry, c1, ph);
      ctx.fillRect(c1 + pw, ry, cW - c1 - pw, ph);
    }
  };
  if (isEY){
    drawRow(Math.floor(oy + (Math.floor(cy) - 1) * ps));
    drawRow(Math.floor(oy + Math.floor(cy) * ps));
  } else {
    drawRow(Math.floor(oy + Math.floor(cy) * ps));
  }
  ctx.restore();
}

/* Perfect mathematical ellipse — single-pixel dotted overlay in a
   CONTRASTING color so it's visible against the pixel shape. */
function drawPerfectOverlay(ctx, cx, cy, rx, ry, ps, ox, oy){
  const scrCX = ox + cx * ps, scrCY = oy + cy * ps;
  const srX = rx * ps, srY = ry * ps;
  if (srX < 1 || srY < 1) return;
  const steps = Math.ceil(2 * Math.PI * Math.max(srX, srY) * 8);
  const seen = new Set();
  ctx.fillStyle = getOverlayColor();
  for (let s = 0; s < steps; s++){
    const a = (s / steps) * Math.PI * 2;
    const sx = Math.floor(scrCX + Math.cos(a) * srX);
    const sy = Math.floor(scrCY + Math.sin(a) * srY);
    const k = sx * 65536 + sy;
    if (!seen.has(k)){ seen.add(k); ctx.fillRect(sx, sy, 1, 1); }
  }
}

/* ---------- ENTRY POINT --------------------------------------------------- */
function draw2D(canvas){
  if (!canvas) return;
  const cw = canvas.clientWidth  || 300;
  const ch = canvas.clientHeight || 220;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.max(1, Math.floor(cw * dpr));
  canvas.height = Math.max(1, Math.floor(ch * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cw, ch);

  const isEllipse = state.shape === 'ellipse';
  const D  = state.size;
  const Wd = isEllipse ? state.width : D;
  const Hd = isEllipse ? state.height : D;
  // pad around the shape so the figure has breathing room from the canvas edge
  const pad = 2;
  const Gx = Wd + pad * 2;
  const Gy = Hd + pad * 2;
  const cx = Gx / 2, cy = Gy / 2;
  const rx = Wd / 2, ry = Hd / 2;

  // Compute fit ps from current canvas size + figure dimensions, then
  // apply the user's wheel/pinch zoom so cells (and the grid) scale together.
  const zoom = state.zoom2D || 1;
  let ps = Math.min(cw / Gx, ch / Gy) * zoom;
  let ox = (cw - Gx * ps) / 2;
  let oy = (ch - Gy * ps) / 2;

  // ZOOM (top-left quadrant): re-fit so only the top-left of the shape is in view
  if (state.zoomBtn && !isEllipse){
    const m = 1;
    const srcSpan = Math.max((cx + m) - (pad - m), (cy + m) - (pad - m));
    const zps = Math.min(cw, ch) / srcSpan;
    ps = zps;
    ox = -(pad - m) * zps;
    oy = -(pad - m) * zps;
  }

  // 1. Fill cells — run REAL algorithm
  const fRaw = computeFilled(Gx, Gy, cx, cy, rx, ry, state.algo);
  const f    = applyRenderMode(fRaw, Gx, Gy, state.render);
  ctx.fillStyle = getAccentColor();
  for (let j = 0; j < Gy; j++){
    for (let i = 0; i < Gx; i++){
      if (!f[j][i]) continue;
      const x = Math.floor(ox + i * ps);
      const y = Math.floor(oy + j * ps);
      const w = Math.floor(ox + (i + 1) * ps) - x;
      const h = Math.floor(oy + (j + 1) * ps) - y;
      ctx.fillRect(x, y, w, h);
    }
  }

  // 2. Center guides drawn OVER the figure as a translucent glow
  if (state.center) drawCenterGuides(ctx, cx, cy, ps, ox, oy, cw, ch);

  // 3. Grid drawn OVER the figure so cells read as individual pixels
  if (state.grid) drawFullGrid(ctx, ps, ox, oy, cw, ch);

  // 4. Perfect overlay (contrasting color, on top of everything)
  if (state.overlay) drawPerfectOverlay(ctx, cx, cy, rx, ry, ps, ox, oy);
}

/* ---------- INFO CHIP --------------------------------------------------- */
function updateInfoChip(){
  const host = dom.canvasFrame;
  if (!host) return;
  const diamEl = host.querySelector('[data-info-diam]');
  const radEl  = host.querySelector('[data-info-rad]');
  const areaEl = host.querySelector('[data-info-area]');
  const algoEl = host.querySelector('[data-info-algo]');
  if (!diamEl) return;

  const isEllipse = state.shape === 'ellipse';
  if (state.mode === '2d'){
    if (isEllipse){
      diamEl.textContent = `${state.width}×${state.height}`;
      radEl.textContent  = `${(state.width/2)}×${(state.height/2)}`;
    } else {
      diamEl.textContent = state.size;
      radEl.textContent  = (state.size / 2);
    }
    areaEl.textContent = area2D(state.size, state.width, state.height, isEllipse, state.algo);
    algoEl.textContent = ALGO_FULL_NAME[state.algo] || state.algo;
  } else {
    if (isEllipse){
      diamEl.textContent = `${state.width}×${state.height}×${state.depth}`;
      radEl.textContent  = `${state.width/2}×${state.height/2}×${state.depth/2}`;
    } else {
      diamEl.textContent = state.size;
      radEl.textContent  = (state.size / 2);
    }
    const Dx = isEllipse ? state.width : state.size;
    const Dy = isEllipse ? state.height : state.size;
    const Dz = isEllipse ? state.depth : state.size;
    areaEl.textContent = voxelVolume(Dx, Dy, Dz);
    algoEl.textContent = ({classic:'Classic',smooth:'Smooth',blocks:'Blocks'})[state.style3d] || state.style3d;
  }
}

/* ---------- DOWNLOAD PNG ------------------------------------------------- */
/* Export at high resolution: target ≥1024px on the major axis. The 2D path
   renders fresh into an offscreen canvas at large size; 3D exports the
   visible three.js framebuffer (which is already DPR-scaled). */
function downloadPNG(){
  const isEllipse = state.shape === 'ellipse';

  if (state.mode === '2d'){
    const Wd = isEllipse ? state.width : state.size;
    const Hd = isEllipse ? state.height : state.size;
    const Gx = Wd + 2, Gy = Hd + 2;
    const target = 2048;
    const ps = Math.floor(target / Math.max(Gx, Gy));
    const W = Gx * ps, H = Gy * ps;
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const cx = Gx / 2, cy = Gy / 2;
    const rx = Wd / 2, ry = Hd / 2;
    const fRaw = computeFilled(Gx, Gy, cx, cy, rx, ry, state.algo);
    const f    = applyRenderMode(fRaw, Gx, Gy, state.render);
    ctx.fillStyle = getAccentColor();
    for (let j = 0; j < Gy; j++)
      for (let i = 0; i < Gx; i++)
        if (f[j][i]) ctx.fillRect(i * ps, j * ps, ps, ps);

    off.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = isEllipse
        ? `pixel-round-ellipse-${state.width}x${state.height}-${state.algo}-${state.render}.png`
        : `pixel-round-circle-d${state.size}-${state.algo}-${state.render}.png`;
      a.href = url;
      a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  } else {
    // 3D — use visible three.js canvas
    if (!dom.canvas3D || !renderer3D) return;
    // Force a re-render so the framebuffer is up-to-date
    if (scene3D && camera3D) renderer3D.render(scene3D, camera3D);
    const name = state.shape === 'ellipse'
      ? `pixel-round-ellipsoid-${state.width}x${state.height}x${state.depth}-${state.render}.png`
      : `pixel-round-sphere-d${state.size}-${state.render}.png`;
    dom.canvas3D.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }
}
