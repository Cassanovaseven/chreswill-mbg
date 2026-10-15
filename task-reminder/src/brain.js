import * as THREE from 'three';

const ACCENT = 0x3ec99a;
const outElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * 2 * Math.PI) / 3) + 1);
const lerp = (a, b, t) => a + (b - a) * t;

function labelTexture(text, done) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = '500 34px "Outfit Variable", system-ui, sans-serif';
  ctx.font = font;
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > 360 && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/.{0,2}$/, '') + '...'; }
  const w = Math.min(420, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 56);
  const h = lines.length * 44 + 28;
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  ctx.font = font;
  ctx.fillStyle = done ? 'rgba(62,201,154,.92)' : 'rgba(28,32,40,.86)';
  ctx.beginPath(); ctx.roundRect(0, 0, c.width, c.height, 22); ctx.fill();
  ctx.strokeStyle = done ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = done ? '#0c2a21' : '#eceef1';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, 14 + 22 + i * 44));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: c.width / c.height, h: c.height };
}

export function createBrain(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a303a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 5); scene.add(key);

  const world = new THREE.Group();
  scene.add(world);

  // inti topik
  const core = new THREE.Group();
  const coreBall = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), new THREE.MeshStandardMaterial({ color: 0x20262f, roughness: 0.35, metalness: 0.4, flatShading: true, emissive: ACCENT, emissiveIntensity: 0.18 }));
  const coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.86, 1), new THREE.MeshBasicMaterial({ color: ACCENT, wireframe: true, transparent: true, opacity: 0.45 }));
  core.add(coreBall, coreWire);
  core.userData.id = '__core';
  world.add(core);

  // debu bintang
  {
    const n = 260, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 7 + Math.random() * 12, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      p[i * 3] = r * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = r * Math.cos(ph); p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    world.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaab3bf, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false })));
  }

  const nodes = new Map(); // id -> {id, mesh, label, pos, target, line, born, data}
  const lineMat = new THREE.LineBasicMaterial({ color: 0x6b7686, transparent: true, opacity: 0.55 });
  const selRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: ACCENT }));
  selRing.visible = false; world.add(selRing);
  let selected = null;
  let onSelect = null;
  let data = { topic: '', ideas: [] };
  let topicLabel = null;

  function setTopicLabel(text) {
    if (topicLabel) { core.remove(topicLabel); topicLabel.material.map.dispose(); topicLabel.material.dispose(); }
    const { tex, aspect } = labelTexture(text || 'Topik utama', false);
    topicLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    topicLabel.scale.set(0.6 * aspect * 1.05, 0.6 * 1.05, 1);
    topicLabel.position.y = -1.25; topicLabel.renderOrder = 10;
    core.add(topicLabel);
  }

  function fib(i, n, r) {
    const y = n === 1 ? 0.15 : 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.399963 + 0.6;
    return new THREE.Vector3(Math.cos(th) * rad * r, y * r * 0.9, Math.sin(th) * rad * r);
  }

  function layout() {
    const roots = data.ideas.filter((i) => !i.parent);
    roots.forEach((idea, i) => {
      const n = nodes.get(idea.id);
      if (n) n.target.copy(fib(i, roots.length, 3.1 + Math.min(roots.length, 12) * 0.05));
    });
    const byParent = new Map();
    data.ideas.filter((i) => i.parent).forEach((i) => {
      if (!byParent.has(i.parent)) byParent.set(i.parent, []);
      byParent.get(i.parent).push(i);
    });
    byParent.forEach((kids, pid) => {
      const p = nodes.get(pid);
      if (!p) return;
      const out = p.target.clone().normalize();
      const up = Math.abs(out.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const t1 = new THREE.Vector3().crossVectors(out, up).normalize();
      const t2 = new THREE.Vector3().crossVectors(out, t1).normalize();
      kids.forEach((k, i) => {
        const a = (i / Math.max(kids.length, 3)) * Math.PI * 2 + 0.5;
        const n = nodes.get(k.id);
        if (n) n.target.copy(p.target).addScaledVector(out, 1.2).addScaledVector(t1, Math.cos(a) * 1.15).addScaledVector(t2, Math.sin(a) * 1.15);
      });
    });
  }

  function makeNode(idea) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), new THREE.MeshStandardMaterial({ color: 0xaab3bf, roughness: 0.3, metalness: 0.15 }));
    mesh.userData.id = idea.id;
    const g = new THREE.Group(); g.add(mesh);
    const node = { id: idea.id, g, mesh, label: null, pos: new THREE.Vector3(), target: new THREE.Vector3(), line: null, born: 0, text: null, done: null };
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    node.line = new THREE.Line(geo, lineMat);
    node.line.frustumCulled = false;
    world.add(node.line, g);
    g.scale.setScalar(0.0001);
    nodes.set(idea.id, node);
    return node;
  }
  function paintNode(node, idea) {
    const done = !!idea.taskId;
    if (node.text === idea.text && node.done === done) return;
    node.text = idea.text; node.done = done;
    if (node.label) { node.g.remove(node.label); node.label.material.map.dispose(); node.label.material.dispose(); }
    const { tex, aspect } = labelTexture(idea.text, done);
    node.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    node.label.scale.set(0.5 * aspect, 0.5, 1);
    node.label.position.y = -0.62 - (0.25 * (1 + (idea.text.length > 24 ? 1 : 0)));
    node.label.renderOrder = 10;
    node.g.add(node.label);
    node.mesh.material.color.setHex(done ? ACCENT : 0xaab3bf);
    node.mesh.material.emissive.setHex(done ? ACCENT : 0x000000);
    node.mesh.material.emissiveIntensity = done ? 0.25 : 0;
  }

  function setData(next) {
    data = next;
    setTopicLabel(data.topic);
    const ids = new Set(data.ideas.map((i) => i.id));
    nodes.forEach((n, id) => {
      if (!ids.has(id)) {
        world.remove(n.g, n.line); n.line.geometry.dispose();
        n.label?.material.map.dispose(); nodes.delete(id);
        if (selected === id) select(null, true);
      }
    });
    data.ideas.forEach((idea) => {
      let n = nodes.get(idea.id);
      if (!n) {
        n = makeNode(idea);
        n.born = performance.now();
        const parent = idea.parent && nodes.get(idea.parent);
        n.pos.copy(parent ? parent.pos : new THREE.Vector3());
      }
      paintNode(n, idea);
    });
    layout();
  }

  function select(id, silent) {
    selected = id;
    selRing.visible = !!id && nodes.has(id);
    if (!silent) onSelect?.(id);
  }

  /* ---------- input ---------- */
  const rot = { x: 0.25, y: 0.4, vx: 0, vy: 0, zoom: 1, tZoom: 1 };
  let lastInput = performance.now(), moved = 0, downAt = 0;
  const pointers = new Map();
  let pinchBase = 0, zoomBase = 1;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastInput = performance.now(); moved = 0; downAt = performance.now();
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchBase = Math.hypot(a.x - b.x, a.y - b.y); zoomBase = rot.tZoom; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY; lastInput = performance.now();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      rot.tZoom = Math.min(1.7, Math.max(0.6, zoomBase * (pinchBase / Math.hypot(a.x - b.x, a.y - b.y))));
    } else {
      moved += Math.abs(dx) + Math.abs(dy);
      rot.vy = dx * 0.009; rot.vx = dy * 0.009;
      rot.y += rot.vy; rot.x = Math.max(-1.2, Math.min(1.2, rot.x + rot.vx));
    }
  });
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener('pointerup', (e) => {
    const had = pointers.delete(e.pointerId);
    if (!(had && pointers.size === 0 && moved < 8 && performance.now() - downAt < 450)) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const meshes = [...nodes.values()].map((n) => n.mesh);
    // perbesar area sentuh
    meshes.forEach((m) => m.scale.setScalar(1.6));
    const hit = ray.intersectObjects(meshes, false)[0];
    meshes.forEach((m) => m.scale.setScalar(1));
    if (hit) select(hit.object.userData.id === selected ? null : hit.object.userData.id);
    else select(null);
  });
  canvas.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); rot.tZoom = Math.min(1.7, Math.max(0.6, rot.tZoom * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(); const d = Math.min(0.1, (n - this.last) / 1000); this.last = n; this.elapsedTime += d; return d; } };
  let running = false, raf = 0;
  const tmp = new THREE.Vector3();
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (pointers.size === 0) {
      rot.y += rot.vy; rot.x = Math.max(-1.2, Math.min(1.2, rot.x + rot.vx)); rot.vy *= 0.94; rot.vx *= 0.94;
      if (!reduced && performance.now() - lastInput > 3500) rot.y += dt * 0.12;
    }
    rot.zoom = lerp(rot.zoom, rot.tZoom, 1 - Math.pow(0.01, dt));
    world.rotation.set(rot.x, rot.y, 0);
    const need = 4.0 + Math.min(data.ideas.length, 20) * 0.05;
    const dist = Math.max(9.5, need / (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect));
    camera.position.set(0, 0.2, dist * rot.zoom);
    camera.lookAt(0, 0, 0);

    core.rotation.y = t * 0.35; coreWire.rotation.x = t * 0.2;
    const pulse = 1 + Math.sin(t * 2) * 0.04; coreBall.scale.setScalar(pulse);
    if (topicLabel) { topicLabel.position.y = -1.25; }

    nodes.forEach((n) => {
      n.pos.lerp(n.target, 1 - Math.pow(0.004, dt));
      const age = (performance.now() - n.born) / 1000;
      const s = Math.max(0.0001, outElastic(Math.min(1, age / 0.9)));
      const bob = Math.sin(t * 1.2 + n.pos.x * 2) * 0.07;
      n.g.position.set(n.pos.x, n.pos.y + bob, n.pos.z);
      n.g.scale.setScalar(s * (selected === n.id ? 1.25 : 1));
      const parent = data.ideas.find((i) => i.id === n.id)?.parent;
      const from = parent && nodes.get(parent) ? nodes.get(parent).g.position : core.position;
      const arr = n.line.geometry.attributes.position;
      arr.setXYZ(0, from.x, from.y, from.z); arr.setXYZ(1, n.g.position.x, n.g.position.y, n.g.position.z);
      arr.needsUpdate = true;
    });
    if (selected && nodes.has(selected)) {
      const n = nodes.get(selected);
      selRing.position.copy(n.g.position);
      tmp.copy(camera.position); selRing.lookAt(world.worldToLocal(tmp));
      selRing.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
    }
    renderer.render(scene, camera);
  }

  return {
    setData, select,
    set onSelect(fn) { onSelect = fn; },
    start() { if (!running) { running = true; clock.getDelta(); resize(); raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    resize,
  };
}
