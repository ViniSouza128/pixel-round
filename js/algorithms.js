/* =============================================================================
   Pixel Round — js/algorithms.js
   All Rights Reserved.

   Three DISTINCT 2D rasterisation algorithms:
     • Euclidean — distance test at pixel centres (smoothest output)
     • Bresenham — integer midpoint algorithm (stair-stepped retro look)
     • Threshold — corner-coverage (any cell with any corner inside fills)

   computeFilled(Gx, Gy, cx, cy, rx, ry, algo) returns a 2D Uint8Array grid
   where [j][i] = 1 iff cell (i,j) is filled. applyRenderMode(f, mode) then
   collapses the grid to 'filled' / 'thin' / 'thick'.

   For 3D, voxelShell(Dx, Dy, Dz, mode, cutAxis, cutLimit) returns the list
   of (x,y,z) voxels visible under the chosen render mode + cut.
   ============================================================================ */

/* ---------- 2D ---------------------------------------------------------- */

function fillEuclidean(Gx, Gy, cx, cy, rx, ry, f){
  const rx2 = rx * rx, ry2 = ry * ry;
  for (let j = 0; j < Gy; j++){
    const dy = j + 0.5 - cy, dy2 = dy * dy;
    if (dy2 / ry2 >= 1) continue;
    const dxM = rx * Math.sqrt(1 - dy2 / ry2);
    const lo = Math.max(0, Math.ceil(cx - dxM - 0.5));
    const hi = Math.min(Gx - 1, Math.floor(cx + dxM - 0.5));
    for (let i = lo; i <= hi; i++) f[j][i] = 1;
  }
}

function fillBresenham(Gx, Gy, cx, cy, rx, ry, f){
  const isCircle = Math.abs(rx - ry) < 0.01;
  const isEX = (cx === Math.floor(cx));
  const isEY = (cy === Math.floor(cy));

  if (isCircle){
    const iR = Math.floor(rx);
    if (iR === 0){
      if (!isEX){
        const pi = Math.floor(cx), pj = Math.floor(cy);
        if (pi >= 0 && pi < Gx && pj >= 0 && pj < Gy) f[pj][pi] = 1;
      }
      return;
    }
    const rMin = new Int32Array(Gy).fill(Gx);
    const rMax = new Int32Array(Gy).fill(-1);
    const span = (row, lo, hi) => {
      if (row < 0 || row >= Gy || lo > hi) return;
      const l = Math.max(0, lo), r = Math.min(Gx - 1, hi);
      if (l > r) return;
      if (l < rMin[row]) rMin[row] = l;
      if (r > rMax[row]) rMax[row] = r;
    };
    let x = 0, y = iR, d = 1 - iR;
    while (x <= y){
      if (isEX){
        span(cy - y,       cx - x, cx + x - 1);
        span(cy + y - 1,   cx - x, cx + x - 1);
        span(cy - x - 1,   cx - y, cx + y - 1);
        span(cy + x,       cx - y, cx + y - 1);
      } else {
        const gcx = Math.floor(cx), gcy = Math.floor(cy);
        span(gcy + y, gcx - x, gcx + x);
        span(gcy - y, gcx - x, gcx + x);
        span(gcy + x, gcx - y, gcx + y);
        span(gcy - x, gcx - y, gcx + y);
      }
      if (d < 0) d += 2 * x + 3;
      else { d += 2 * (x - y) + 5; y--; }
      x++;
    }
    for (let j = 0; j < Gy; j++)
      for (let i = rMin[j]; i <= rMax[j]; i++)
        if (i >= 0 && i < Gx) f[j][i] = 1;
    return;
  }

  // Ellipse path: midpoint ellipse algorithm in two regions.
  // Use FLOOR (not round) so an odd-height ellipse with ry = 6.5 still
  // gets b = 6 — otherwise rounding to 7 adds a row at j=0 and j=Gy-1
  // that's outside the requested bounding box.
  const a = Math.floor(rx), b = Math.floor(ry);
  if (a < 1 || b < 1) return;
  const a2 = a * a, b2 = b * b;
  const rMin = Array.from({length: Gy}, () => Gx);
  const rMax = Array.from({length: Gy}, () => -1);
  const addSpan = (row, lo, hi) => {
    const rr = Math.floor(row);
    if (rr < 0 || rr >= Gy) return;
    const l = Math.max(0, Math.floor(lo));
    const h = Math.min(Gx - 1, Math.floor(hi));
    if (l > h) return;
    if (l < rMin[rr]) rMin[rr] = l;
    if (h > rMax[rr]) rMax[rr] = h;
  };
  const plot = (dx, dy) => {
    let xl, xr, rowT, rowB;
    if (isEX){ xl = cx - dx; xr = cx + dx - 1; }
    else     { xl = Math.floor(cx) - dx; xr = Math.floor(cx) + dx; }
    if (isEY){ rowT = cy - dy; rowB = cy + dy - 1; }
    else     { rowT = Math.floor(cy) - dy; rowB = Math.floor(cy) + dy; }
    addSpan(rowT, xl, xr);
    if (rowT !== rowB) addSpan(rowB, xl, xr);
  };
  let x = 0, y = b;
  let p = Math.round(b2 - (a2 * b) + (a2 / 4));
  while (2 * b2 * x < 2 * a2 * y){
    plot(x, y);
    if (p < 0){ x++; p += 2 * b2 * x + b2; }
    else      { x++; y--; p += 2 * b2 * x - 2 * a2 * y + b2; }
  }
  p = Math.round(b2 * (x + 0.5) * (x + 0.5) + a2 * (y - 1) * (y - 1) - a2 * b2);
  while (y >= 0){
    plot(x, y);
    if (p > 0){ y--; p -= 2 * a2 * y + a2; }
    else      { y--; x++; p += 2 * b2 * x - 2 * a2 * y + a2; }
  }
  for (let j = 0; j < Gy; j++)
    for (let i = rMin[j]; i <= rMax[j]; i++)
      if (i >= 0 && i < Gx) f[j][i] = 1;
}

function fillThreshold(Gx, Gy, cx, cy, rx, ry, f){
  // Inclusion when the cell center sits inside the ellipse OR the cell's
  // nearest-corner distance is appreciably under 1 (tightened to kill the
  // 1px tangent spike at the four cardinal extremes).
  for (let j = 0; j < Gy; j++)
    for (let i = 0; i < Gx; i++){
      const ccx = i + 0.5, ccy = j + 0.5;
      const dxC = (ccx - cx) / rx, dyC = (ccy - cy) / ry;
      const centerIn = dxC*dxC + dyC*dyC <= 1;
      const nx = Math.max(i, Math.min(i + 1, cx));
      const ny = Math.max(j, Math.min(j + 1, cy));
      const dxN = (nx - cx) / rx, dyN = (ny - cy) / ry;
      const cornerIn = dxN*dxN + dyN*dyN <= 0.94;
      if (centerIn || cornerIn) f[j][i] = 1;
    }
}

function computeFilled(Gx, Gy, cx, cy, rx, ry, algo){
  const f = Array.from({length: Gy}, () => new Uint8Array(Gx));
  if (algo === 'euclidean')      fillEuclidean(Gx, Gy, cx, cy, rx, ry, f);
  else if (algo === 'bresenham') fillBresenham(Gx, Gy, cx, cy, rx, ry, f);
  else                           fillThreshold(Gx, Gy, cx, cy, rx, ry, f);
  return f;
}

function applyRenderMode(f, Gx, Gy, mode){
  if (mode === 'filled') return f;

  // outline = cell with at least one out-of-shape neighbour
  const b = Array.from({length: Gy}, () => new Uint8Array(Gx));
  for (let j = 0; j < Gy; j++)
    for (let i = 0; i < Gx; i++){
      if (!f[j][i]) continue;
      if (j === 0 || !f[j-1][i] ||
          j === Gy-1 || !f[j+1][i] ||
          i === 0 || !f[j][i-1] ||
          i === Gx-1 || !f[j][i+1]) b[j][i] = 1;
    }
  if (mode === 'thin') return b;

  // thick = outline + cells that bridge an H + a V neighbour outline
  const t = Array.from({length: Gy}, () => new Uint8Array(Gx));
  for (let j = 0; j < Gy; j++)
    for (let i = 0; i < Gx; i++){
      if (!f[j][i]) continue;
      if (b[j][i]){ t[j][i] = 1; continue; }
      const hH = (i > 0 && b[j][i-1]) || (i < Gx-1 && b[j][i+1]);
      const hV = (j > 0 && b[j-1][i]) || (j < Gy-1 && b[j+1][i]);
      if (hH && hV) t[j][i] = 1;
    }
  return t;
}

function area2D(diam, w, h, isEllipse, algo){
  const Gx = (isEllipse ? w : diam) + 2;
  const Gy = (isEllipse ? h : diam) + 2;
  const cx = Gx / 2, cy = Gy / 2;
  const rx = (isEllipse ? w : diam) / 2;
  const ry = (isEllipse ? h : diam) / 2;
  const f = computeFilled(Gx, Gy, cx, cy, rx, ry, algo);
  let n = 0;
  for (let j = 0; j < Gy; j++) for (let i = 0; i < Gx; i++) if (f[j][i]) n++;
  return n;
}

/* ---------- 3D ---------------------------------------------------------- */
/* voxelShell returns voxels visible under the chosen render mode + cut.
     • filled: every kept voxel with at least one neighbour outside the kept
       region (so the cut face shows the solid interior).
     • thin:   only voxels on the ellipsoid surface (1-cell shell).
     • thick:  slice-based thick — every axis-aligned slice (XY / XZ / YZ)
       is run through the 2D thick algorithm; union across the three axes
       gives the smallest set of corners that plug the diagonals without
       doubling the shell thickness. This matches the original project's
       computeThick3D and the user's "water tightness" intuition: only
       voxels that bridge two adjacent shell cells get added.
*/
function voxelShell(Dx, Dy, Dz, mode, cutAxis, cutLimit){
  const rx = Dx / 2, ry = Dy / 2, rz = Dz / 2;
  const cx = Dx / 2, cy = Dy / 2, cz = Dz / 2;
  const inEllip = (x, y, z) => {
    const ax = (x + 0.5 - cx) / rx;
    const ay = (y + 0.5 - cy) / ry;
    const az = (z + 0.5 - cz) / rz;
    return ax*ax + ay*ay + az*az <= 1;
  };
  const inKept = (x, y, z) => {
    if (x < 0 || x >= Dx || y < 0 || y >= Dy || z < 0 || z >= Dz) return false;
    if (!inEllip(x, y, z)) return false;
    // Cut axes:
    //   'x' / 'y' — straight slice perpendicular to the axis.
    //   'diag'    — 45° slice through the XY plane (x + y ≥ cut).
    //               Cut max for diag is (Dx + Dy); cut = (Dx+Dy) keeps
    //               everything, cut = 0 excludes everything.
    if (cutAxis === 'x'    && x >= cutLimit) return false;
    if (cutAxis === 'y'    && y >= cutLimit) return false;
    if (cutAxis === 'diag' && (x + y) >= cutLimit) return false;
    return true;
  };

  // Bounds-safe set helpers — naive multiplicative keys collide across the
  // out-of-bounds boundary (e.g. kkey(1, -1, z) === kkey(0, Dy-1, z)), which
  // would let a "neighbour" check find a voxel that doesn't really exist.
  // Wrap every lookup with an explicit range check.
  const kept = new Set();
  const kkey = (x, y, z) => x * Dy * Dz + y * Dz + z;
  const keptHas = (x, y, z) => {
    if (x < 0 || x >= Dx || y < 0 || y >= Dy || z < 0 || z >= Dz) return false;
    return kept.has(kkey(x, y, z));
  };
  for (let x = 0; x < Dx; x++)
    for (let y = 0; y < Dy; y++)
      for (let z = 0; z < Dz; z++)
        if (inKept(x, y, z)) kept.add(kkey(x, y, z));

  if (mode === 'filled'){
    const result = [];
    for (const k of kept){
      const x = Math.floor(k / (Dy * Dz));
      const y = Math.floor((k % (Dy * Dz)) / Dz);
      const z = k % Dz;
      const visible =
        !keptHas(x-1, y, z) || !keptHas(x+1, y, z) ||
        !keptHas(x, y-1, z) || !keptHas(x, y+1, z) ||
        !keptHas(x, y, z-1) || !keptHas(x, y, z+1);
      if (visible) result.push({x, y, z});
    }
    return result;
  }

  // For thin/thick we treat the ellipsoid (without cut) so the cap on a
  // sliced figure still shows as the cross-section of the same shell.
  const inSphereSet = new Set();
  const sphereHas = (x, y, z) => {
    if (x < 0 || x >= Dx || y < 0 || y >= Dy || z < 0 || z >= Dz) return false;
    return inSphereSet.has(kkey(x, y, z));
  };
  for (let x = 0; x < Dx; x++)
    for (let y = 0; y < Dy; y++)
      for (let z = 0; z < Dz; z++)
        if (inEllip(x, y, z)) inSphereSet.add(kkey(x, y, z));

  const isEllipSurface = (x, y, z) => {
    if (!sphereHas(x, y, z)) return false;
    return !sphereHas(x-1, y, z) || !sphereHas(x+1, y, z)
        || !sphereHas(x, y-1, z) || !sphereHas(x, y+1, z)
        || !sphereHas(x, y, z-1) || !sphereHas(x, y, z+1);
  };

  if (mode === 'thin'){
    const result = [];
    for (const k of kept){
      const x = Math.floor(k / (Dy * Dz));
      const y = Math.floor((k % (Dy * Dz)) / Dz);
      const z = k % Dz;
      if (isEllipSurface(x, y, z)) result.push({x, y, z});
    }
    return result;
  }

  // ---- THICK: slice-based corner plugging across the three axes ----
  const fkey = (a, b) => a * 4096 + b;
  const sliceZ = new Map(), sliceY = new Map(), sliceX = new Map();
  for (const k of inSphereSet){
    const x = Math.floor(k / (Dy * Dz));
    const y = Math.floor((k % (Dy * Dz)) / Dz);
    const z = k % Dz;
    if (!sliceZ.has(z)) sliceZ.set(z, new Set()); sliceZ.get(z).add(fkey(x, y));
    if (!sliceY.has(y)) sliceY.set(y, new Set()); sliceY.get(y).add(fkey(x, z));
    if (!sliceX.has(x)) sliceX.set(x, new Set()); sliceX.get(x).add(fkey(y, z));
  }

  /* For one 2D slice: keep boundary voxels and add voxels that have both a
     horizontal- and a vertical-boundary neighbour (diagonal corner bridge). */
  function thickAxisSlice(slice, addToResult){
    if (slice.size === 0) return;
    const boundary = new Set();
    slice.forEach(k => {
      const a = Math.floor(k / 4096), b = k % 4096;
      if (!slice.has(fkey(a-1, b)) || !slice.has(fkey(a+1, b)) ||
          !slice.has(fkey(a, b-1)) || !slice.has(fkey(a, b+1))){
        boundary.add(k);
      }
    });
    boundary.forEach(addToResult);
    slice.forEach(k => {
      if (boundary.has(k)) return;
      const a = Math.floor(k / 4096), b = k % 4096;
      const hH = boundary.has(fkey(a-1, b)) || boundary.has(fkey(a+1, b));
      const hV = boundary.has(fkey(a, b-1)) || boundary.has(fkey(a, b+1));
      if (hH && hV) addToResult(k);
    });
  }

  const thickSet = new Set();
  sliceZ.forEach((slice, z) => thickAxisSlice(slice, fk => {
    const x = Math.floor(fk / 4096), y = fk % 4096;
    thickSet.add(kkey(x, y, z));
  }));
  sliceY.forEach((slice, y) => thickAxisSlice(slice, fk => {
    const x = Math.floor(fk / 4096), z = fk % 4096;
    thickSet.add(kkey(x, y, z));
  }));
  sliceX.forEach((slice, x) => thickAxisSlice(slice, fk => {
    const y = Math.floor(fk / 4096), z = fk % 4096;
    thickSet.add(kkey(x, y, z));
  }));

  // Intersect with the cut-respecting kept set.
  const result = [];
  for (const k of thickSet){
    if (!kept.has(k)) continue;
    const x = Math.floor(k / (Dy * Dz));
    const y = Math.floor((k % (Dy * Dz)) / Dz);
    const z = k % Dz;
    result.push({x, y, z});
  }
  return result;
}

function voxelVolume(Dx, Dy, Dz){
  const rx = Dx / 2, ry = Dy / 2, rz = Dz / 2;
  const cx = Dx / 2, cy = Dy / 2, cz = Dz / 2;
  let n = 0;
  for (let z = 0; z < Dz; z++)
  for (let y = 0; y < Dy; y++)
  for (let x = 0; x < Dx; x++){
    const ax = (x + 0.5 - cx) / rx;
    const ay = (y + 0.5 - cy) / ry;
    const az = (z + 0.5 - cz) / rz;
    if (ax*ax + ay*ay + az*az <= 1) n++;
  }
  return n;
}

/* ---------- BACK-COMPAT (older callers in mockup/etc) ------------------- */
/* canvas2d.js previously called isInside2D/isOutline2D/isThick2D as helpers.
   Keep them as thin wrappers so any straggler reference still works. */
function isInside2D(i, j, cx, cy, rx, ry, algo){
  const dx = (i + 0.5 - cx) / rx;
  const dy = (j + 0.5 - cy) / ry;
  if (algo === 'threshold') return dx*dx + dy*dy <= 1.05;
  return dx*dx + dy*dy <= 1.0;
}
function isOutline2D(i, j, cx, cy, rx, ry, algo){
  if (!isInside2D(i, j, cx, cy, rx, ry, algo)) return false;
  return !isInside2D(i-1, j, cx, cy, rx, ry, algo)
      || !isInside2D(i+1, j, cx, cy, rx, ry, algo)
      || !isInside2D(i, j-1, cx, cy, rx, ry, algo)
      || !isInside2D(i, j+1, cx, cy, rx, ry, algo);
}
function isThick2D(i, j, cx, cy, rx, ry, algo){
  if (!isInside2D(i, j, cx, cy, rx, ry, algo)) return false;
  if (isOutline2D(i, j, cx, cy, rx, ry, algo)) return true;
  return !isInside2D(i-1, j-1, cx, cy, rx, ry, algo)
      || !isInside2D(i+1, j-1, cx, cy, rx, ry, algo)
      || !isInside2D(i-1, j+1, cx, cy, rx, ry, algo)
      || !isInside2D(i+1, j+1, cx, cy, rx, ry, algo);
}

/* Hex color helper */
function shadeHex(hex, factor){
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(m[1],16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(m[2],16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(m[3],16) * factor)));
  return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
}
