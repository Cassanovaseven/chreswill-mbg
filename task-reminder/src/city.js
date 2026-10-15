import * as THREE from 'three';

const FH = 0.5; // tinggi satu lantai
const ACCENT = 0x3ec99a;
const TIER_W = [2.6, 2.25, 1.95, 1.65, 1.35];

export const SATELLITES = [
  { at: 1, ang: 200, w: 1.5, d: 1.3, f: 1, col: '#e9e1d2', kind: 'shop' },
  { at: 3, ang: 340, w: 1.5, d: 1.4, f: 2, col: '#dde7e4' },
  { at: 6, ang: 150, w: 1.6, d: 1.4, f: 3, col: '#ece5d8' },
  { at: 10, ang: 30, w: 1.6, d: 1.5, f: 4, col: '#dfe5ee' },
  { at: 16, ang: 250, w: 1.7, d: 1.5, f: 5, col: '#e8e4dc' },
  { at: 24, ang: 290, w: 1.6, d: 1.6, f: 6, col: '#dbe4e8' },
  { at: 35, ang: 110, w: 1.6, d: 1.5, f: 7, col: '#ebe6dc' },
  { at: 50, ang: 70, w: 1.6, d: 1.6, f: 8, col: '#dfe6e6' },
];

const outElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * 2 * Math.PI) / 3) + 1);
const outBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCity(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfdcec);
  scene.fog = new THREE.Fog(0xbfdcec, 38, 90);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 260);

  /* ---------- lampu ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6d7a6a, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 24, bottom: -10, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  /* ---------- tekstur jendela ---------- */
  function windowTextures() {
    const mapC = document.createElement('canvas');
    mapC.width = 256; mapC.height = 64;
    const mc = mapC.getContext('2d');
    mc.fillStyle = '#ffffff'; mc.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 4; i++) {
      mc.fillStyle = '#58788d';
      mc.fillRect(i * 64 + 10, 16, 44, 30);
      mc.fillStyle = 'rgba(255,255,255,.35)';
      mc.fillRect(i * 64 + 10, 16, 44, 7);
    }
    const map = new THREE.CanvasTexture(mapC);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const emits = [];
    const r = rng(7);
    for (let v = 0; v < 4; v++) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, 256, 64);
      for (let i = 0; i < 4; i++) {
        if (r() > 0.42) { x.fillStyle = r() > 0.5 ? '#ffe2a8' : '#fff1d0'; x.fillRect(i * 64 + 10, 16, 44, 30); }
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      emits.push(t);
    }
    return { map, emits };
  }
  const WT = windowTextures();
  const wallMats = new Map();
  function wallMat(col, v) {
    const key = col + v;
    if (!wallMats.has(key)) {
      wallMats.set(key, new THREE.MeshStandardMaterial({
        color: col, map: WT.map, emissive: 0xffffff, emissiveMap: WT.emits[v % 4],
        emissiveIntensity: 0.1, roughness: 0.62, metalness: 0.02,
      }));
    }
    return wallMats.get(key);
  }
  const flat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
  const M = {
    slab: flat(0xcfd2d0), dark: flat(0x2a303a, { roughness: 0.5 }), glass: flat(0x9ec3d4, { roughness: 0.2, metalness: 0.2 }),
    accent: flat(ACCENT, { emissive: ACCENT, emissiveIntensity: 0.35 }), roof: flat(0xb9b2a4),
    grass: flat(0xa9c79a), soil: flat(0x8a7761), road: flat(0x474d57, { roughness: 0.95 }), line: flat(0xe8e6df),
    trunk: flat(0x7b5f45), leafA: flat(0x6fae7e), leafB: flat(0x8cc08a), leafC: flat(0x5d9a70),
    white: flat(0xf5f5f2), cloud: flat(0xffffff, { roughness: 1 }),
    gold: flat(0xe3b85c, { metalness: 0.5, roughness: 0.35, emissive: 0x6b4a10, emissiveIntensity: 0.25 }),
  };

  const geoCache = new Map();
  const box = (w, h, d) => {
    const k = `${w}|${h}|${d}`;
    if (!geoCache.has(k)) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); geoCache.set(k, g); }
    return geoCache.get(k);
  };
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ---------- pulau ---------- */
  const island = new THREE.Group();
  scene.add(island);
  const plate = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(8.8, 8.2, 1.1, 64), M.grass));
  plate.position.y = -0.55; plate.castShadow = false;
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 6.2, 2.4, 48), M.soil);
  soil.position.y = -2.3;
  const road = new THREE.Mesh(new THREE.RingGeometry(5.95, 6.85, 96), M.road);
  road.rotation.x = -Math.PI / 2; road.position.y = 0.012; road.receiveShadow = true;
  const dash = new THREE.Mesh(new THREE.RingGeometry(6.37, 6.43, 96, 1), M.line);
  dash.rotation.x = -Math.PI / 2; dash.position.y = 0.02;
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(5.6, 64), flat(0xb8d3a8));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.008; lawn.receiveShadow = true;
  island.add(plate, soil, lawn, road, dash);

  /* ---------- plakat nama ---------- */
  const signC = document.createElement('canvas');
  signC.width = 1024; signC.height = 256;
  const signTex = new THREE.CanvasTexture(signC);
  signTex.colorSpace = THREE.SRGBColorSpace;
  signTex.anisotropy = 4;
  let companyName = 'Perusahaan Saya';
  function drawSign() {
    const c = signC.getContext('2d');
    c.fillStyle = '#20252d'; c.fillRect(0, 0, 1024, 256);
    c.fillStyle = '#3ec99a'; c.fillRect(0, 0, 22, 256);
    c.fillStyle = '#f2f1ec';
    let size = 108;
    c.font = `600 ${size}px "Outfit Variable", system-ui, sans-serif`;
    while (c.measureText(companyName).width > 840 && size > 40) { size -= 4; c.font = `600 ${size}px "Outfit Variable", system-ui, sans-serif`; }
    c.textBaseline = 'middle';
    c.fillText(companyName, 70, 128);
    signTex.needsUpdate = true;
  }
  drawSign();
  document.fonts?.load('600 60px "Outfit Variable"').then(drawSign).catch(() => {});
  const sign = new THREE.Group();
  const board = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 0.12), M.dark));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.625), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
  face.position.z = 0.065;
  const legL = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), M.dark));
  const legR = legL.clone();
  legL.position.set(-1.0, -0.55, 0); legR.position.set(1.0, -0.55, 0);
  sign.add(board, face, legL, legR);
  sign.position.set(0, 0.85, 4.75);
  island.add(sign);

  /* ---------- tween ---------- */
  const tweens = [];
  const tween = (dur, fn, delay = 0, done) => tweens.push({ t: -delay, dur, fn, done });
  function updateTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) { tweens.splice(i, 1); tw.done?.(); }
    }
  }
  function popIn(obj, delay = 0, dur = 0.9, easing = outElastic, to = 1) {
    obj.scale.setScalar(0.0001);
    tween(dur, (k) => obj.scale.setScalar(Math.max(0.0001, easing(k) * to)), delay);
  }

  /* ---------- menara utama ---------- */
  const tower = new THREE.Group();
  island.add(tower);
  const floors = []; // {g, mesh}
  const crown = new THREE.Group();
  tower.add(crown);
  let beacon = null;
  const interactive = [];

  function floorDims(i) {
    const tier = Math.min(4, Math.floor(i / 8));
    return { w: TIER_W[tier], d: TIER_W[tier] * 0.88 };
  }
  function makeFloor(i) {
    const { w, d } = floorDims(i);
    const g = new THREE.Group();
    const mesh = shadowed(new THREE.Mesh(box(w, FH - 0.07, d), wallMat('#f4f1ea', i % 4)));
    const ledge = shadowed(new THREE.Mesh(box(w + 0.1, 0.07, d + 0.1), M.slab));
    ledge.position.y = FH - 0.07;
    g.add(mesh, ledge);
    if (i === 0) {
      const door = new THREE.Mesh(box(0.7, 0.34, 0.03), M.dark);
      door.position.set(0, 0, d / 2 + 0.005);
      const canopy = shadowed(new THREE.Mesh(box(1.0, 0.04, 0.3), M.accent));
      canopy.position.set(0, 0.36, d / 2 + 0.1);
      g.add(door, canopy);
    }
    g.position.y = i * FH;
    g.userData.root = tower;
    mesh.userData.root = tower;
    return { g, mesh };
  }
  function buildCrown(n) {
    while (crown.children.length) crown.remove(crown.children[0]);
    beacon = null;
    const { w, d } = floorDims(n - 1);
    if (n <= 2) {
      const roof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, 0.7, 4), M.roof));
      roof.rotation.y = Math.PI / 4; roof.position.y = 0.35; roof.scale.z = d / w;
      crown.add(roof);
    } else {
      const slab = shadowed(new THREE.Mesh(box(w + 0.14, 0.1, d + 0.14), M.slab));
      const unit = shadowed(new THREE.Mesh(box(w * 0.34, 0.26, d * 0.3), M.white)); unit.position.set(-w * 0.22, 0.1, d * 0.12);
      const unit2 = shadowed(new THREE.Mesh(box(w * 0.22, 0.18, d * 0.22), M.glass)); unit2.position.set(w * 0.25, 0.1, -d * 0.18);
      crown.add(slab, unit, unit2);
      if (n >= 6) {
        const mastH = 0.55 + Math.min(n, 36) * 0.035;
        const mast = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, mastH, 8), M.dark));
        mast.position.set(w * 0.2, 0.1 + mastH / 2, d * 0.18);
        beacon = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff6b5e }));
        beacon.position.set(w * 0.2, 0.1 + mastH + 0.05, d * 0.18);
        crown.add(mast, beacon);
      }
      if (n >= 18) {
        const dish = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.white));
        dish.rotation.x = -Math.PI / 3; dish.position.set(-w * 0.1, 0.5, -d * 0.2);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), M.dark); stem.position.set(-w * 0.1, 0.25, -d * 0.2);
        crown.add(dish, stem);
        crown.userData.dish = dish;
      }
    }
  }
  let crownTopLocal = 0;

  function setFloors(n, animate) {
    // tambah
    let added = 0;
    const gap = Math.min(0.22, 1.6 / Math.max(1, n - floors.length));
    while (floors.length < n) {
      const i = floors.length;
      const f = makeFloor(i);
      tower.add(f.g);
      floors.push(f);
      if (animate) {
        f.g.scale.y = 0.0001;
        const idx = added++;
        tween(0.75, (k) => { f.g.scale.y = Math.max(0.0001, outBack(k)); }, idx * gap);
      }
      interactive.push(f.mesh);
    }
    // kurangi
    while (floors.length > n) {
      const f = floors.pop();
      tower.remove(f.g);
      interactive.splice(interactive.indexOf(f.mesh), 1);
    }
    buildCrown(n);
  }
  function towerTop() {
    let y = 0;
    for (const f of floors) y = f.g.position.y + FH * f.g.scale.y;
    return y;
  }

  /* ---------- gedung satelit ---------- */
  const sats = SATELLITES.map((spec) => ({ spec, g: null }));
  function makeBlock(spec) {
    const g = new THREE.Group();
    const h = 0.42;
    for (let i = 0; i < spec.f; i++) {
      const m = shadowed(new THREE.Mesh(box(spec.w, h - 0.05, spec.d), wallMat(spec.col, (i + spec.f) % 4)));
      m.position.y = i * h; m.userData.root = g;
      const l = shadowed(new THREE.Mesh(box(spec.w + 0.07, 0.05, spec.d + 0.07), M.slab));
      l.position.y = i * h + h - 0.05;
      g.add(m, l);
      interactive.push(m);
    }
    const top = spec.f * h;
    if (spec.kind === 'shop') {
      const aw = shadowed(new THREE.Mesh(box(spec.w * 0.9, 0.05, 0.35), M.accent));
      aw.position.set(0, 0.28, spec.d / 2 + 0.15);
      g.add(aw);
    } else {
      const roofBox = shadowed(new THREE.Mesh(box(spec.w * 0.35, 0.16, spec.d * 0.3), M.white));
      roofBox.position.set(spec.w * 0.2, top, -spec.d * 0.15);
      g.add(roofBox);
    }
    const door = new THREE.Mesh(box(0.34, 0.24, 0.03), M.dark);
    door.position.set(0, 0, spec.d / 2 + 0.005);
    g.add(door);
    const a = (spec.ang * Math.PI) / 180;
    g.position.set(Math.cos(a) * 4.0, 0, Math.sin(a) * 4.0);
    g.rotation.y = -a + Math.PI / 2;
    g.userData.root = g;
    return g;
  }

  /* ---------- pohon ---------- */
  const treeSpots = [];
  {
    const r = rng(42);
    for (let i = 0; i < 44; i++) {
      const inner = i % 3 === 0;
      const rad = inner ? 5.1 + r() * 0.6 : 7.1 + r() * 1.1;
      const a = r() * Math.PI * 2;
      treeSpots.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, s: 0.7 + r() * 0.6, m: [M.leafA, M.leafB, M.leafC][i % 3], g: null });
    }
    // jangan taruh pohon tepat di depan plakat
    treeSpots.forEach((t) => { if (Math.abs(t.x) < 1.8 && t.z > 4 && t.z < 5.6) t.x += 2.2; });
  }
  function makeTree(t) {
    const g = new THREE.Group();
    const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6), M.trunk)); trunk.position.y = 0.2;
    const c1 = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 7), t.m)); c1.position.y = 0.7;
    const c2 = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 7), t.m)); c2.position.y = 1.05;
    g.add(trunk, c1, c2);
    g.position.set(t.x, 0, t.z);
    return g;
  }

  /* ---------- mobil ---------- */
  const cars = [];
  const CAR_COLS = [0x3ec99a, 0xe8e6df, 0xd9806a, 0x6c8ebf, 0xe3b85c, 0x9aa5b1, 0x2a303a, 0xc7d3a1];
  function makeCar(i) {
    const g = new THREE.Group();
    const body = shadowed(new THREE.Mesh(box(0.34, 0.14, 0.62), flat(CAR_COLS[i % CAR_COLS.length], { roughness: 0.45 })));
    body.position.y = 0.08;
    const cab = shadowed(new THREE.Mesh(box(0.28, 0.12, 0.3), M.glass)); cab.position.set(0, 0.22, -0.04);
    g.add(body, cab);
    for (const [x, z] of [[-0.18, 0.2], [0.18, 0.2], [-0.18, -0.2], [0.18, -0.2]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), M.dark);
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.06, z); g.add(w);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    head.position.set(0, 0.1, 0.32); g.add(head);
    return { g, ang: (i / 8) * Math.PI * 2 + 0.4, speed: 0.22 + (i % 3) * 0.05, lane: i % 2 ? 6.62 : 6.18 };
  }

  /* ---------- ekstra: helikopter, drone, balon, roket ---------- */
  function makeHeli() {
    const g = new THREE.Group();
    const body = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.4, 6, 12), flat(0xe8e6df)));
    body.rotation.z = Math.PI / 2;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), M.dark); tail.position.x = -0.55;
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.07), M.dark); rotor.position.y = 0.22;
    const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2;
    const rg = new THREE.Group(); rg.add(rotor, rotor2);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.37), M.accent); stripe.position.set(0.05, 0, 0);
    g.add(body, tail, rg, stripe);
    g.userData.rotor = rg;
    return g;
  }
  function makeDrone() {
    const g = new THREE.Group();
    const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.22), M.dark));
    g.add(b);
    const props = [];
    for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.03), M.accent);
      p.position.set(x, 0.05, z); g.add(p); props.push(p);
    }
    g.userData.props = props;
    return g;
  }
  function makeBalloon() {
    const g = new THREE.Group();
    const env = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 18), flat(0xd9806a)));
    env.scale.y = 1.15; env.position.y = 1.5;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.07, 8, 32), M.white); band.rotation.x = Math.PI / 2; band.position.y = 1.5; band.scale.set(1, 1, 1);
    const basket = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.34), M.trunk)); basket.position.y = 0.2;
    g.add(env, band, basket);
    return g;
  }
  function makeRocket() {
    const g = new THREE.Group();
    const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 14), M.white)); body.position.y = 0.85;
    const nose = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 14), flat(0xd9806a))); nose.position.y = 1.7;
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), M.glass); win.position.set(0, 1.0, 0.17);
    for (let i = 0; i < 3; i++) {
      const fin = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.24), M.accent));
      const a = (i / 3) * Math.PI * 2; fin.position.set(Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22); fin.rotation.y = -a;
      g.add(fin);
    }
    g.add(body, nose, win);
    return g;
  }
  const extras = { heli: null, drones: [], balloon: null, rocket: null };
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 20), M.slab);
  pad.position.set(-7.0, 0.03, 1.2); pad.visible = false; pad.receiveShadow = true; island.add(pad);

  /* ---------- awan & bintang ---------- */
  const clouds = new THREE.Group();
  scene.add(clouds);
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    const r = rng(100 + i);
    for (let j = 0; j < 4; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.9 + r() * 0.7, 14, 10), M.cloud);
      s.position.set(j * 1.0 - 1.5, r() * 0.4, r() * 0.8); s.scale.y = 0.62; c.add(s);
    }
    c.position.set(-30 + i * 11, 13 + (i % 3) * 2.5, -14 - (i % 2) * 14);
    c.userData.speed = 0.18 + r() * 0.2;
    clouds.add(c);
  }
  const starGeo = new THREE.BufferGeometry();
  {
    const r = rng(9), p = new Float32Array(600);
    for (let i = 0; i < 200; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(0.15 + r() * 0.85), R = 80;
      p[i * 3] = R * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = R * Math.cos(ph); p[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  }
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ---------- efek perayaan ---------- */
  const COINS = 40;
  const coinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14), M.gold, COINS);
  coinMesh.frustumCulled = false;
  scene.add(coinMesh);
  const coins = Array.from({ length: COINS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, spin: 0 }));
  const dummy = new THREE.Object3D();
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  shock.rotation.x = -Math.PI / 2; shock.position.y = 0.05; scene.add(shock);
  let shake = 0;

  function celebrate() {
    const top = towerTop();
    for (const c of coins) {
      c.p.set((Math.random() - 0.5) * 0.8, top + 0.4, (Math.random() - 0.5) * 0.8);
      const a = Math.random() * Math.PI * 2, sp = 1.6 + Math.random() * 2.6;
      c.v.set(Math.cos(a) * sp, 3.5 + Math.random() * 4, Math.sin(a) * sp);
      c.life = 1.4 + Math.random() * 0.8; c.spin = (Math.random() - 0.5) * 18;
    }
    shock.material.opacity = 0.7;
    tween(1.0, (k) => { shock.scale.setScalar(1 + outCubic(k) * 11); shock.material.opacity = 0.7 * (1 - k); });
    if (!reduced) shake = 0.5;
    // lantai paling atas melompat kecil
    tween(0.6, (k) => { tower.position.y = Math.sin(k * Math.PI) * 0.12 * (1 - k); });
  }

  /* ---------- fokus / lembur ---------- */
  let overtime = false;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 80), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 }));
  halo.rotation.x = Math.PI / 2; scene.add(halo);
  function setOvertime(v) { overtime = v; }

  /* ---------- waktu ---------- */
  let timeMode = 'auto';
  const HOURS = { pagi: 10, senja: 17.9, malam: 23 };
  const cur = { L: 1, W: 0, h: 12 };
  const cNight = new THREE.Color(0x0e1528), cDay = new THREE.Color(0xbfdcec), cWarm = new THREE.Color(0xf0b08a);
  const tmpC = new THREE.Color();
  function targetTime() {
    const now = new Date();
    const h = timeMode === 'auto' ? now.getHours() + now.getMinutes() / 60 : HOURS[timeMode];
    const e = Math.sin(((h - 6) * Math.PI) / 12);
    return { h, L: smooth(-0.12, 0.3, e), W: (1 - smooth(0.04, 0.38, Math.abs(e))) * 0.9 };
  }
  function applyTime(dt) {
    const t = targetTime();
    const k = 1 - Math.pow(0.02, dt);
    cur.L = lerp(cur.L, t.L, k); cur.W = lerp(cur.W, t.W, k); cur.h = t.h;
    tmpC.copy(cNight).lerp(cDay, cur.L).lerp(cWarm, cur.W * 0.55);
    scene.background.copy(tmpC); scene.fog.color.copy(tmpC);
    const ang = ((cur.h - 6) * Math.PI) / 12;
    const el = Math.max(0.28, Math.sin(ang));
    sun.position.set(Math.cos(ang) * -16, 6 + el * 16, 9);
    sun.color.setHex(0xffffff).lerp(cWarm, cur.W * 0.7);
    if (cur.L < 0.3) sun.color.lerp(new THREE.Color(0x8aa4d6), 1 - cur.L / 0.3);
    sun.intensity = 0.6 + 1.8 * cur.L;
    hemi.intensity = 0.6 + 0.65 * cur.L;
    hemi.color.setHex(0xffffff).lerp(new THREE.Color(0x7d92c4), 1 - cur.L);
    const glow = (1 - cur.L) * 1.35 + 0.05 + (overtime ? 0.55 + Math.sin(clock.elapsedTime * 7) * 0.12 : 0);
    wallMats.forEach((m) => { m.emissiveIntensity = glow; });
    starMat.opacity = Math.max(0, 1 - cur.L * 1.6);
    M.cloud.color.setHex(0xffffff).lerp(new THREE.Color(0x4a5675), 1 - cur.L);
    renderer.toneMappingExposure = 0.85 + 0.25 * cur.L;
  }

  /* ---------- sinkronisasi poin ---------- */
  let points = -1;
  const state = { carCount: 0 };
  function setPoints(p, { animate = true } = {}) {
    const prev = points;
    points = p;
    const fresh = prev < 0;
    const anim = animate && !fresh;
    const n = Math.min(1 + p, 36);
    if (n !== floors.length) setFloors(n, anim);

    sats.forEach((s, idx) => {
      const want = p >= s.spec.at;
      if (want && !s.g) {
        s.g = makeBlock(s.spec); island.add(s.g);
        if (anim) { popIn(s.g, 0.35 + idx * 0.05); ring(s.g.position); }
      } else if (!want && s.g) {
        island.remove(s.g); s.g = null;
      }
    });
    interactive.length = 0;
    floors.forEach((f) => interactive.push(f.mesh));
    sats.forEach((s) => s.g && s.g.children.forEach((c) => c.userData.root && interactive.push(c)));

    const treeN = Math.min(treeSpots.length, 5 + Math.floor(p * 1.4));
    treeSpots.forEach((t, i) => {
      if (i < treeN && !t.g) {
        t.g = makeTree(t); island.add(t.g);
        if (anim) popIn(t.g, 0.2 + (i % 6) * 0.08, 0.8, outBack, t.s);
        else t.g.scale.setScalar(t.s);
      } else if (i >= treeN && t.g) { island.remove(t.g); t.g = null; }
    });

    const carN = Math.min(8, 1 + Math.floor(p / 3));
    while (cars.length < carN) {
      const c = makeCar(cars.length); island.add(c.g); cars.push(c);
      if (anim) popIn(c.g, 0.4, 0.7, outBack);
    }
    while (cars.length > carN) island.remove(cars.pop().g);

    const wantHeli = p >= 24, wantDrone = p >= 16, wantBalloon = p >= 50, wantRocket = p >= 75;
    if (wantHeli && !extras.heli) { extras.heli = makeHeli(); scene.add(extras.heli); if (anim) popIn(extras.heli, 0.5); }
    if (!wantHeli && extras.heli) { scene.remove(extras.heli); extras.heli = null; }
    const dN = wantDrone ? Math.min(3, 1 + Math.floor((p - 16) / 10)) : 0;
    while (extras.drones.length < dN) { const d = makeDrone(); scene.add(d); extras.drones.push(d); if (anim) popIn(d, 0.5); }
    while (extras.drones.length > dN) scene.remove(extras.drones.pop());
    if (wantBalloon && !extras.balloon) { extras.balloon = makeBalloon(); scene.add(extras.balloon); if (anim) popIn(extras.balloon, 0.6); }
    if (!wantBalloon && extras.balloon) { scene.remove(extras.balloon); extras.balloon = null; }
    pad.visible = wantRocket;
    if (wantRocket && !extras.rocket) { extras.rocket = makeRocket(); extras.rocket.position.set(-7.0, 0.06, 1.2); island.add(extras.rocket); if (anim) popIn(extras.rocket, 0.6); }
    if (!wantRocket && extras.rocket) { island.remove(extras.rocket); extras.rocket = null; }
    state.carCount = carN;
  }
  function ring(pos) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.06, pos.z); island.add(m);
    tween(0.8, (k) => { m.scale.setScalar(0.6 + outCubic(k) * 2.4); m.material.opacity = 0.8 * (1 - k); }, 0.35, () => { island.remove(m); m.geometry.dispose(); m.material.dispose(); });
  }

  /* ---------- kamera & input ---------- */
  const cam = { az: 0.6, pol: 1.0, zoom: 1, tAz: 0.6, tPol: 1.0, tZoom: 1, inset: 0, tInset: 0, ty: 1, dist: 18, vAz: 0 };
  let lastInput = performance.now();
  let width = 1, height = 1;
  const pointers = new Map();
  let pinchBase = 0, zoomBase = 1, moved = 0, downAt = 0;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastInput = performance.now(); moved = 0; downAt = performance.now();
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchBase = Math.hypot(a.x - b.x, a.y - b.y); zoomBase = cam.tZoom; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    lastInput = performance.now();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      cam.tZoom = Math.min(1.6, Math.max(0.55, zoomBase * (pinchBase / Math.hypot(a.x - b.x, a.y - b.y))));
    } else {
      moved += Math.abs(dx) + Math.abs(dy);
      cam.tAz -= dx * 0.0085; cam.vAz = -dx * 0.0085;
      cam.tPol = Math.min(1.3, Math.max(0.55, cam.tPol - dy * 0.005));
    }
  });
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function up(e) {
    const had = pointers.delete(e.pointerId);
    if (had && pointers.size === 0 && moved < 8 && performance.now() - downAt < 450) tap(e);
  }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.tZoom = Math.min(1.6, Math.max(0.55, cam.tZoom * (1 + Math.sign(e.deltaY) * 0.08)));
    lastInput = performance.now();
  }, { passive: false });
  let onTap = null;
  function tap(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(interactive, false)[0];
    if (!hit) return;
    const root = hit.object.userData.root;
    if (!root) return;
    const baseY = root.position.y, baseS = root.scale.y;
    void baseS;
    tween(0.55, (k) => { root.position.y = baseY + Math.sin(k * Math.PI) * 0.35 * (1 - k * 0.4); });
    onTap?.(root === tower ? 'tower' : 'building');
  }

  /* ---------- ukuran ---------- */
  function resize() {
    const r = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width)); height = Math.max(1, Math.round(r.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  /* ---------- loop ---------- */
  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(); const d = Math.min(0.1, (n - this.last) / 1000); this.last = n; this.elapsedTime += d; return d; } };
  let running = false, raf = 0, acc = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    updateTweens(dt);

    // kamera
    const idle = performance.now() - lastInput > 4500 && pointers.size === 0;
    if (idle && !reduced) cam.tAz += dt * 0.07;
    else if (pointers.size === 0) { cam.tAz += cam.vAz; cam.vAz *= 0.92; }
    const k = 1 - Math.pow(0.0008, dt);
    cam.az = lerp(cam.az, cam.tAz, k); cam.pol = lerp(cam.pol, cam.tPol, k); cam.zoom = lerp(cam.zoom, cam.tZoom, k);
    cam.inset = lerp(cam.inset, cam.tInset, 1 - Math.pow(0.002, dt));
    const top = towerTop();
    cam.ty = lerp(cam.ty, Math.min(top * 0.42, 7.5) + 0.6, 1 - Math.pow(0.05, dt));
    const tf = Math.tan((camera.fov * Math.PI) / 360);
    const distW = (13 / 2) / (tf * camera.aspect);
    const visFrac = Math.max(0.3, (height - cam.inset) / height);
    const distH = (Math.min(top, 20) * 0.85 + 5.5) / (2 * tf * visFrac);
    cam.dist = lerp(cam.dist, Math.max(distW, distH, 16) * cam.zoom, 1 - Math.pow(0.05, dt));
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 0.25 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * 0.25 : 0;
    shake = Math.max(0, shake - dt * 1.6);
    camera.position.set(
      Math.sin(cam.az) * Math.sin(cam.pol) * cam.dist + sx,
      Math.cos(cam.pol) * cam.dist + cam.ty + sy,
      Math.cos(cam.az) * Math.sin(cam.pol) * cam.dist,
    );
    camera.lookAt(0, cam.ty, 0);
    scene.fog.near = cam.dist * 1.5; scene.fog.far = cam.dist * 3.4;
    camera.setViewOffset(width, height, 0, cam.inset / 2, width, height);
    sun.target.position.set(0, cam.ty * 0.5, 0);

    // dunia
    acc += dt;
    applyTime(dt);
    if (beacon) beacon.material.color.setHex(Math.sin(t * 4) > 0 ? 0xff6b5e : 0x5a2a28);
    if (crown.userData.dish) crown.userData.dish.rotation.z = Math.sin(t * 0.6) * 0.6;
    crown.position.y = top;
    for (const c of cars) {
      c.ang += c.speed * dt * (c.lane > 6.4 ? -1 : 1);
      const a = c.ang;
      c.g.position.set(Math.cos(a) * c.lane, 0.02, Math.sin(a) * c.lane);
      c.g.rotation.y = -a + (c.lane > 6.4 ? Math.PI : 0);
    }
    clouds.children.forEach((c) => { c.position.x += c.userData.speed * dt; if (c.position.x > 40) c.position.x = -40; });
    if (extras.heli) {
      const a = t * 0.45, R = 9.5;
      extras.heli.position.set(Math.cos(a) * R, 6 + Math.sin(t * 0.8) * 0.4 + Math.min(top, 14) * 0.25, Math.sin(a) * R);
      extras.heli.rotation.y = -a - Math.PI / 2 + Math.PI; extras.heli.userData.rotor.rotation.y += dt * 40;
    }
    extras.drones.forEach((d, i) => {
      const a = t * (0.7 + i * 0.2) + i * 2.1, R = 3.4 + i * 0.5;
      d.position.set(Math.cos(a) * R, 1.6 + i * 0.9 + Math.sin(t * 2 + i) * 0.15, Math.sin(a) * R);
      d.userData.props.forEach((p) => { p.rotation.y += dt * 50; });
    });
    if (extras.balloon) {
      extras.balloon.position.set(-11 + Math.sin(t * 0.12) * 2, 4.5 + Math.sin(t * 0.5) * 0.4, -4);
      extras.balloon.rotation.y = t * 0.2;
    }
    if (extras.rocket) {
      const cyc = (t % 14) / 14;
      const lift = cyc > 0.82 ? Math.pow((cyc - 0.82) / 0.18, 2.2) * 45 : 0;
      extras.rocket.position.y = 0.06 + lift;
      extras.rocket.rotation.y = t * 0.3;
    }

    // koin
    let alive = 0;
    for (let i = 0; i < COINS; i++) {
      const c = coins[i];
      if (c.life > 0) {
        c.life -= dt; c.v.y -= 11 * dt; c.p.addScaledVector(c.v, dt);
        if (c.p.y < 0.15) { c.p.y = 0.15; c.v.y *= -0.35; c.v.x *= 0.7; c.v.z *= 0.7; }
        dummy.position.copy(c.p); dummy.rotation.set(t * c.spin, t * c.spin * 0.7, 0);
        dummy.scale.setScalar(Math.min(1, c.life * 2)); alive++;
      } else { dummy.position.set(0, -50, 0); dummy.scale.setScalar(0.0001); }
      dummy.updateMatrix(); coinMesh.setMatrixAt(i, dummy.matrix);
    }
    coinMesh.instanceMatrix.needsUpdate = true;

    // halo fokus
    const hw = overtime ? 1 : 0;
    halo.material.opacity = lerp(halo.material.opacity, hw * 0.7, 1 - Math.pow(0.02, dt));
    halo.visible = halo.material.opacity > 0.01;
    if (halo.visible) {
      const s = TIER_W[Math.min(4, Math.floor(floors.length / 8))] * 1.1 + 0.9 + Math.sin(t * 2) * 0.12;
      halo.scale.set(s, s, s); halo.position.y = top * 0.5 + 0.5 + Math.sin(t * 1.4) * Math.min(top, 10) * 0.35;
      halo.rotation.z = t * 0.5;
    }
    renderer.render(scene, camera);
  }

  return {
    setPoints,
    setName(n) { companyName = n || 'Perusahaan Saya'; drawSign(); },
    celebrate,
    setOvertime,
    setInset(px) { cam.tInset = px; },
    cycleTime() {
      const order = ['auto', 'pagi', 'senja', 'malam'];
      timeMode = order[(order.indexOf(timeMode) + 1) % order.length];
      return timeMode;
    },
    get timeMode() { return timeMode; },
    set onTap(fn) { onTap = fn; },
    start() { if (!running) { running = true; clock.getDelta(); raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    resize,
    renderer,
  };
}
