/* =============================================================================
   Pixel Round — js/canvas3d.js
   All Rights Reserved.

   Three.js voxel renderer.

   Render mode (state.render) drives WHICH voxels are emitted:
     filled → every kept voxel with at least one exposed face (incl. cut face)
     thin   → only outer ellipsoid surface (1-cell shell)
     thick  → ellipsoid surface + 1 inward layer

   3D style (state.style3d) drives HOW the voxels look:
     classic → strong face contrast (Lambert with shadeHex per face)
     smooth  → low face contrast, more even shading
     blocks  → slight inset between voxels (visual grooves)

   state.edges3d (boolean, default true) adds a black LineSegments
   overlay tracing the 12 cube edges of every voxel — gives crisp
   block outlines so the figure is easy to count when copying into MC.
   Toggled by the Grid button in the canvas corner (3D mode).

   Public API:
     init3D(canvas) · update3D() · resize3D() · destroy3D()
   Live state used by ui.js for pinch / wheel / drag:
     distance3D, theta3D, phi3D · updateCamera3D() · autoZoom3D() · resetCamera3D()
   ============================================================================ */

let scene3D = null, camera3D = null, renderer3D = null, voxelMesh3D = null;
let voxelEdges3D = null;
let centerCross3D = null;
/* Snapshot of the voxel set + figure-center offsets the last time the mesh
   was rebuilt. Used by toggleEdges3D so the user can flip the edge overlay
   without re-running voxelShell(). */
let _lastVoxels3D = null, _lastDims3D = null;

/* Geometry signature — every state field that should force a mesh rebuild
   when it changes. Anything outside this list (camera ops, edges/center
   toggles, focus events, …) does NOT rebuild. */
let _lastGeomSig3D = null;
function _geomSig3D(){
  return [
    state.shape, state.size, state.width, state.height, state.depth,
    state.cut, state.axis, state.render, state.algo, state.style3d, state.mode
  ].join('|');
}
let distance3D = 70;
let theta3D = Math.PI / 4;
let phi3D = Math.PI / 3;
let _frame3DReady = false;
let _animPending = false;

function styleParams(){
  switch (state.style3d){
    case 'smooth': return { faceContrast: .12, inset: 0    };
    case 'blocks': return { faceContrast: .35, inset: 0.06 };
    case 'classic':
    default:       return { faceContrast: .30, inset: 0    };
  }
}

function init3D(canvas){
  if (_frame3DReady) return true;
  if (typeof THREE === 'undefined' || !canvas) return false;

  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));

  renderer3D = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer3D.setSize(w, h, false);

  scene3D = new THREE.Scene();
  scene3D.background = null;

  camera3D = new THREE.PerspectiveCamera(35, w / h, 0.1, 2000);
  updateCamera3D();

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(50, 80, 50);
  scene3D.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-40, 20, -30);
  scene3D.add(fill);
  scene3D.add(new THREE.AmbientLight(0xffffff, 0.25));

  _frame3DReady = true;
  scheduleRender3D();
  return true;
}

function updateCamera3D(){
  if (!camera3D) return;
  camera3D.position.x = distance3D * Math.sin(phi3D) * Math.cos(theta3D);
  camera3D.position.y = distance3D * Math.cos(phi3D);
  camera3D.position.z = distance3D * Math.sin(phi3D) * Math.sin(theta3D);
  camera3D.lookAt(0, 0, 0);
  scheduleRender3D();
}

function resetCamera3D(){
  theta3D = Math.PI / 4;
  phi3D   = Math.PI / 3;
  autoZoom3D();
}

/* autoZoom3D — fit the figure's projected silhouette into the camera
   viewport. We project all 8 bounding-box corners onto the camera's
   right + up basis at the current orbit angle (theta/phi), then size
   the distance so the larger of the two extents exactly fills the FOV.
   This is tighter than using the bounding sphere (which is the
   rotation-worst-case) so flat ellipsoids — e.g. 16 × 9 × 16 — fill
   the frame instead of getting lost in the middle. */
function autoZoom3D(){
  if (!camera3D) return;
  const isEllipse = state.shape === 'ellipse';
  const Dx = isEllipse ? state.width : state.size;
  const Dy = isEllipse ? state.height : state.size;
  const Dz = isEllipse ? state.depth : state.size;

  // Camera-space right/up basis at the current orbit angle.
  const dir = new THREE.Vector3(
    Math.sin(phi3D) * Math.cos(theta3D),
    Math.cos(phi3D),
    Math.sin(phi3D) * Math.sin(theta3D)
  ); // camera position direction (normalised)
  const view = dir.clone().negate();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(view, worldUp);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0); // looking straight up/down
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, view).normalize();

  const hx = Dx / 2, hy = Dy / 2, hz = Dz / 2;
  let maxR = 0, maxU = 0;
  const corner = new THREE.Vector3();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]){
    corner.set(sx * hx, sy * hy, sz * hz);
    const r = Math.abs(corner.dot(right));
    const u = Math.abs(corner.dot(up));
    if (r > maxR) maxR = r;
    if (u > maxU) maxU = u;
  }

  const vFov = camera3D.fov * Math.PI / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera3D.aspect);
  const distV = maxU / Math.tan(vFov / 2);
  const distH = maxR / Math.tan(hFov / 2);
  distance3D = Math.max(2, Math.max(distV, distH) * 1.15);
  updateCamera3D();
}

function disposeVoxelMesh(){
  if (voxelMesh3D){
    scene3D.remove(voxelMesh3D);
    voxelMesh3D.geometry?.dispose?.();
    if (Array.isArray(voxelMesh3D.material)) voxelMesh3D.material.forEach(m => m.dispose());
    else voxelMesh3D.material?.dispose?.();
    voxelMesh3D = null;
  }
  if (voxelEdges3D){
    scene3D.remove(voxelEdges3D);
    voxelEdges3D.geometry?.dispose?.();
    voxelEdges3D.material?.dispose?.();
    voxelEdges3D = null;
  }
}

/* Build a single LineSegments mesh containing the 12 cube edges of every
   voxel. Used by the "Edges" 3D style — gives the user crisp block
   outlines on top of the regular shaded faces, so they can read the
   structure cell-by-cell when copying it into Minecraft. */
function buildVoxelEdges3D(voxels, cx, cy, cz){
  const E = [
    [-.5,-.5,-.5,  .5,-.5,-.5], [-.5,-.5, .5,  .5,-.5, .5],
    [-.5,-.5,-.5, -.5,-.5, .5], [ .5,-.5,-.5,  .5,-.5, .5],
    [-.5, .5,-.5,  .5, .5,-.5], [-.5, .5, .5,  .5, .5, .5],
    [-.5, .5,-.5, -.5, .5, .5], [ .5, .5,-.5,  .5, .5, .5],
    [-.5,-.5,-.5, -.5, .5,-.5], [ .5,-.5,-.5,  .5, .5,-.5],
    [-.5,-.5, .5, -.5, .5, .5], [ .5,-.5, .5,  .5, .5, .5],
  ];
  const positions = new Float32Array(voxels.length * 12 * 2 * 3);
  let p = 0;
  for (const v of voxels){
    const ox = v.x - cx, oy = v.y - cy, oz = v.z - cz;
    for (const e of E){
      positions[p++] = e[0] + ox; positions[p++] = e[1] + oy; positions[p++] = e[2] + oz;
      positions[p++] = e[3] + ox; positions[p++] = e[4] + oy; positions[p++] = e[5] + oz;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.45,
  });
  return new THREE.LineSegments(geo, mat);
}

function disposeCenterCross(){
  if (!centerCross3D) return;
  scene3D.remove(centerCross3D);
  centerCross3D.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  centerCross3D = null;
}

/* Builds three translucent yellow bars along X / Y / Z through the figure
   centre. Each bar is one voxel thick and slightly longer than the figure
   so it pokes out and reads as a guide. Matches the original project's
   center-cross of glow blocks. */
/* Each axis bar is 1 cube wide × 1 cube tall when the perpendicular
   dimensions are odd (so a single voxel sits dead-center). When a perp
   dim is even, the center falls between two voxels and the bar widens
   to 2 along that direction so it shines through the four central
   cells. The bar length stays huge so the axes read as "infinite". */
function buildCenterCross3D(Dx, Dy, Dz){
  disposeCenterCross();
  centerCross3D = new THREE.Group();
  const L = 1500;
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(getAccentColor()),
    transparent: true, opacity: 0.28, depthWrite: false,
  });
  const wx = (Dx % 2 === 0) ? 2 : 1;
  const wy = (Dy % 2 === 0) ? 2 : 1;
  const wz = (Dz % 2 === 0) ? 2 : 1;
  // barX runs along X; cross-section uses the Y and Z parities.
  const barX = new THREE.Mesh(new THREE.BoxGeometry(L,  wy, wz), mat);
  const barY = new THREE.Mesh(new THREE.BoxGeometry(wx, L,  wz), mat);
  const barZ = new THREE.Mesh(new THREE.BoxGeometry(wx, wy, L ), mat);
  centerCross3D.add(barX, barY, barZ);
  scene3D.add(centerCross3D);
}

function update3D(){
  if (!_frame3DReady) return;
  // Skip the rebuild when geometry hasn't actually changed — protects
  // against accidental triggers (clicks, focus events) erasing state.
  const sig = _geomSig3D();
  if (_lastGeomSig3D === sig && voxelMesh3D){
    scheduleRender3D();
    return;
  }
  _lastGeomSig3D = sig;

  disposeVoxelMesh();
  disposeCenterCross();

  const isEllipse = state.shape === 'ellipse';
  const Dx = isEllipse ? state.width     : state.size;
  const Dy = isEllipse ? state.height     : state.size;
  const Dz = isEllipse ? state.depth : state.size;

  // Cut max equals the axis dim — anything < axis dim slices in
  const maxAxis = state.axis === 'x' ? Dx : Dy;
  const cutLimit = state.cut < maxAxis ? state.cut : maxAxis + 1;
  const voxels = voxelShell(Dx, Dy, Dz, state.render, state.axis, cutLimit);
  if (voxels.length === 0){ scheduleRender3D(); return; }

  const { faceContrast, inset } = styleParams();

  // All styles emit a textured/shaded InstancedMesh — there's no longer a
  // dedicated wireframe style. The Grid corner button instead toggles
  // state.edges3d, which adds a line overlay on top of the regular faces.
  const cube = new THREE.BoxGeometry(1 - inset * 2, 1 - inset * 2, 1 - inset * 2);
  const accent = getAccentColor();
  const mats = [
    new THREE.MeshLambertMaterial({ color: shadeRgb(accent, 1.0) }),
    new THREE.MeshLambertMaterial({ color: shadeRgb(accent, 1 - faceContrast) }),
    new THREE.MeshLambertMaterial({ color: shadeRgb(accent, 1 + faceContrast * .3) }),
    new THREE.MeshLambertMaterial({ color: shadeRgb(accent, 1 - faceContrast * 1.2) }),
    new THREE.MeshLambertMaterial({ color: shadeRgb(accent, 1 - faceContrast * .5) }),
    new THREE.MeshLambertMaterial({ color: shadeRgb(accent, 1 - faceContrast * .5) }),
  ];
  const inst = new THREE.InstancedMesh(cube, mats, voxels.length);
  const dummy = new THREE.Object3D();
  const cx = (Dx - 1) / 2, cy = (Dy - 1) / 2, cz = (Dz - 1) / 2;
  for (let i = 0; i < voxels.length; i++){
    const v = voxels[i];
    dummy.position.set(v.x - cx, v.y - cy, v.z - cz);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  scene3D.add(inst);
  voxelMesh3D = inst;

  _lastVoxels3D = voxels;
  _lastDims3D   = { cx, cy, cz };

  if (state.edges3d){
    voxelEdges3D = buildVoxelEdges3D(voxels, cx, cy, cz);
    scene3D.add(voxelEdges3D);
  }

  if (state.center) buildCenterCross3D(Dx, Dy, Dz);
  scheduleRender3D();
}

/* Add or remove the edges overlay without rebuilding the voxel mesh — so
   any in-progress operation (e.g. an inspection rotation, a click on the
   button) doesn't tear down meshes that are already in their final state. */
function toggleEdges3D(){
  if (!_frame3DReady || !_lastVoxels3D) return;
  if (voxelEdges3D){
    scene3D.remove(voxelEdges3D);
    voxelEdges3D.geometry?.dispose?.();
    voxelEdges3D.material?.dispose?.();
    voxelEdges3D = null;
  }
  if (state.edges3d){
    const { cx, cy, cz } = _lastDims3D;
    voxelEdges3D = buildVoxelEdges3D(_lastVoxels3D, cx, cy, cz);
    scene3D.add(voxelEdges3D);
  }
  scheduleRender3D();
}

function shadeRgb(hex, factor){
  return new THREE.Color(shadeHex(hex, factor));
}

function scheduleRender3D(){
  if (_animPending || !_frame3DReady) return;
  _animPending = true;
  requestAnimationFrame(() => {
    _animPending = false;
    if (renderer3D && scene3D && camera3D) renderer3D.render(scene3D, camera3D);
  });
}

function resize3D(){
  if (!_frame3DReady || !renderer3D || !camera3D) return;
  const canvas = renderer3D.domElement;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  renderer3D.setSize(w, h, false);
  camera3D.aspect = w / h;
  camera3D.updateProjectionMatrix();
  scheduleRender3D();
}

function destroy3D(){
  disposeVoxelMesh();
  renderer3D?.dispose?.();
  renderer3D = null;
  scene3D = null;
  camera3D = null;
  _frame3DReady = false;
}
