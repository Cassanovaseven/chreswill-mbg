/* Area 3D "Peti di atas truk": tempat Gilbert memasukkan nota.
   Urutan gerak (semua dari tabel animate/Emil Kowalski):
   - tutup peti: pegas (bisa diinterupsi saat file keluar-masuk area seret)
   - file masuk peti: 450ms ease-in-out kuat  cubic-bezier(.77,0,.175,1)
   - sedang membaca: denyut cahaya (gerak konstan = linear)
   - berhasil: kilat cahaya 300ms ease-out kuat cubic-bezier(.23,1,.32,1),
     truk pergi 650ms ease-in-out kuat, kembali 500ms ease-out kuat + per suspensi
   - gagal: peti menggeleng 360ms, cahaya oranye
   - prefers-reduced-motion: tanpa terbang/melaju; hanya cahaya & teks */
const Scene3D = (() => {
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // pemecah cubic-bezier (Newton + bagi dua), supaya kurva persis sama dengan token CSS
  function bezier(x1, y1, x2, y2) {
    const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, Cc = a => 3 * a;
    const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + Cc(a)) * t;
    const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + Cc(a);
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) { const s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (calc(t, x1, x2) - x) / s; }
      if (t < 0 || t > 1) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 20; i++) { const v = calc(t, x1, x2); if (Math.abs(v - x) < 1e-5) break; if (v > x) hi = t; else lo = t; t = (lo + hi) / 2; } }
      return calc(t, y1, y2);
    };
  }
  const EASE_OUT = bezier(0.23, 1, 0.32, 1);
  const EASE_IN_OUT = bezier(0.77, 0, 0.175, 1);

  // pegas teredam sederhana (bounce ±0.2): k=170, rasio redaman 0.8
  function Spring(v = 0, k = 170, zeta = 0.8) {
    const c = 2 * Math.sqrt(k) * zeta;
    return { v, vel: 0, target: v, step(dt) { const a = k * (this.target - this.v) - c * this.vel; this.vel += a * dt; this.v += this.vel * dt; return this.v; } };
  }

  function create(el) {
    const T = THREE;
    const C = { tosca: 0x2EE6C5, ink: 0x1B1236, wortel: 0xFF8A1F, white: 0xffffff, cream: 0xFFF3DC };
    const mat = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: .75, flatShading: true, ...o });
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };

    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.prepend(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, 3.6, 8.6); camera.lookAt(0, 1, 0);
    scene.add(new T.HemisphereLight(0xffffff, 0xB9DDA8, 1.6));
    const sun = new T.DirectionalLight(0xffffff, 1.7); sun.position.set(4, 8, 5); scene.add(sun);
    const root = new T.Group(); scene.add(root);

    // jalan
    const roadTex = tex(512, 64, (g, w, h) => { g.fillStyle = '#3A3256'; g.fillRect(0, 0, w, h); g.fillStyle = '#F3EEFF'; for (let x = 0; x < w; x += 64) g.fillRect(x + 8, h / 2 - 3, 36, 6); });
    roadTex.wrapS = T.RepeatWrapping; roadTex.repeat.set(2, 1);
    const road = new T.Mesh(new T.PlaneGeometry(16, 1.9), new T.MeshStandardMaterial({ map: roadTex, roughness: 1 }));
    road.rotation.x = -Math.PI / 2; road.position.y = .005; root.add(road);
    const blobTex = tex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(27,18,54,.38)'); r.addColorStop(1, 'rgba(27,18,54,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });

    // truk
    const truck = new T.Group(); root.add(truck);
    const body = new T.Group(); truck.add(body); // bagian yang ikut per suspensi
    const cab = new T.Mesh(new T.BoxGeometry(1, 1, 1.2), mat(C.tosca)); cab.position.set(1.25, .85, 0);
    const win = new T.Mesh(new T.BoxGeometry(.05, .4, 1), mat(C.ink, { roughness: .3 })); win.position.set(1.76, 1.05, 0);
    const lampM = new T.MeshStandardMaterial({ color: 0xFFF3A0, emissive: 0xFFE066, emissiveIntensity: .8 });
    const l1 = new T.Mesh(new T.BoxGeometry(.05, .14, .2), lampM); l1.position.set(1.76, .55, .42); const l2 = l1.clone(); l2.position.z = -.42;
    const bedM = mat(C.ink);
    const bedFloor = new T.Mesh(new T.BoxGeometry(2.1, .12, 1.25), bedM); bedFloor.position.set(-.35, .45, 0);
    const chassis = new T.Mesh(new T.BoxGeometry(3.3, .2, 1), mat(0x2C2C2A)); chassis.position.set(.1, .3, 0);
    const stripe = new T.Mesh(new T.BoxGeometry(2.12, .08, 1.27), mat(C.wortel)); stripe.position.set(-.35, .53, 0);
    body.add(cab, win, l1, l2, bedFloor, chassis, stripe);
    const wheels = [];
    for (const [x, z] of [[1.25, .55], [1.25, -.55], [-.85, .55], [-.85, -.55]]) {
      const w = new T.Group(); w.position.set(x, .28, z);
      const tire = new T.Mesh(new T.CylinderGeometry(.28, .28, .22, 16), mat(0x222222)); tire.rotation.x = Math.PI / 2;
      const hub = new T.Mesh(new T.CylinderGeometry(.12, .12, .24, 8), mat(0xD3D1C7)); hub.rotation.x = Math.PI / 2;
      w.add(tire, hub); truck.add(w); wheels.push(w);
    }
    const sh = new T.Mesh(new T.PlaneGeometry(4.4, 2.2), new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .012; truck.add(sh);

    // peti kayu di bak
    const plank = tex(256, 256, (g, w, h) => {
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#C98B4A', '#BD7F3F', '#D39556', '#C3843F'][i]; g.fillRect(0, i * 64, w, 62); g.fillStyle = '#8A5A2B'; g.fillRect(0, i * 64 + 62, w, 2); }
      g.strokeStyle = '#8A5A2B'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    });
    const wm = new T.MeshStandardMaterial({ map: plank, roughness: .85 });
    const crate = new T.Group(); crate.position.set(-.35, .51, 0); body.add(crate);
    const W = 1.7, H = .95, D = 1.05, t = .07;
    const wall = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), wm); m.position.set(x, y, z); crate.add(m); };
    wall(W, t, D, 0, t / 2, 0); wall(W, H, t, 0, H / 2, D / 2); wall(W, H, t, 0, H / 2, -D / 2); wall(t, H, D, W / 2, H / 2, 0); wall(t, H, D, -W / 2, H / 2, 0);
    const innerM = new T.MeshBasicMaterial({ color: C.tosca, transparent: true, opacity: 0 });
    const inner = new T.Mesh(new T.PlaneGeometry(W - .14, D - .14), innerM); inner.rotation.x = -Math.PI / 2; inner.position.y = H - .04; crate.add(inner);
    const glow = new T.PointLight(C.tosca, 0, 5); glow.position.set(0, H * .8, 0); crate.add(glow);
    const hinge = new T.Group(); hinge.position.set(0, H, -D / 2); crate.add(hinge);
    const lid = new T.Mesh(new T.BoxGeometry(W + .08, t * 1.4, D + .08), wm); lid.position.set(0, t * .7, D / 2); hinge.add(lid);
    const beamM = new T.MeshBasicMaterial({ color: C.tosca, transparent: true, opacity: 0, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
    const beam = new T.Mesh(new T.CylinderGeometry(.3, .75, 5, 24, 1, true), beamM); beam.position.y = H + 2.5; crate.add(beam);

    // kartu nota
    const docTex = tex(256, 340, (g, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#2EE6C5'; g.fillRect(0, 0, w, 54);
      g.fillStyle = '#1B1236'; g.font = 'bold 26px sans-serif'; g.fillText('NOTA', 20, 37);
      g.fillStyle = '#D3D1C7'; for (let i = 0; i < 7; i++) g.fillRect(20, 84 + i * 32, i % 3 === 2 ? 130 : 210, 12);
    });
    const white = mat(C.white);
    const doc = new T.Mesh(new T.BoxGeometry(.8, 1.06, .03), [white, white, white, white, new T.MeshStandardMaterial({ map: docTex }), white]);
    doc.visible = false; root.add(doc);

    // debu
    const dust = [...Array(12)].map(() => { const m = new T.Mesh(new T.SphereGeometry(.11, 6, 5), new T.MeshBasicMaterial({ color: 0xD3D1C7, transparent: true, opacity: 0 })); root.add(m); return { m, life: 0, v: new T.Vector3() }; });

    // ---------- keadaan ----------
    const lidS = Spring(0), glowS = Spring(0, 120, 1), rotS = Spring(0, 90, .9), suspS = Spring(0, 260, .45);
    let truckX = 0, prevX = 0, speed = 0, pulse = false, glowColor = C.tosca, shake = 0, drag = null, tilt = 0;
    const tweens = []; let now = performance.now();
    const tween = (dur, ease, fn) => new Promise(res => { if (RM()) dur = Math.min(dur, 1); tweens.push({ t0: now, dur, ease, fn, res }); });
    const wait = ms => new Promise(r => setTimeout(r, RM() ? Math.min(ms, 400) : ms));
    const setColor = c => { glowColor = c; innerM.color.setHex(c); glow.color.setHex(c); beamM.color.setHex(c); };

    // putar dengan jari/mouse; kembali dengan pegas
    el.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, r: rotS.v }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (!drag) return; rotS.v = drag.r + (e.clientX - drag.x) * .012; rotS.vel = 0; tilt = Math.max(-.2, Math.min(.2, (e.clientY - drag.y) * .003)); });
    const endDrag = () => { drag = null; };
    el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag);

    function resize() { const r = el.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.fov = r.width < 380 ? 42 : 34; camera.updateProjectionMatrix(); }
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let visible = true, raf;
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(el);

    let last = performance.now();
    function frame(tm) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.04, (tm - last) / 1000); last = tm; now = tm;
      if (!visible || document.hidden) return;
      for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i], p = Math.min(1, (tm - w.t0) / w.dur); w.fn(w.ease(p), p); if (p >= 1) { tweens.splice(i, 1); w.res(); } }
      const rm = RM();
      hinge.rotation.x = -(rm ? lidS.target : lidS.step(dt)) * 1.85;
      const gv = pulse ? .55 + .35 * Math.sin(tm / 160) : (rm ? glowS.target : glowS.step(dt));
      glow.intensity = Math.max(0, gv) * 6; innerM.opacity = Math.max(0, gv) * .75;
      if (!drag) { rotS.target = 0; rotS.step(dt); tilt *= .9; }
      root.rotation.y = rotS.v + (rm ? 0 : Math.sin(tm / 2600) * .14); root.rotation.x = tilt;
      // truk digerakkan oleh tween; kecepatan diturunkan dari perpindahannya
      const dx = truckX - prevX; prevX = truckX; speed = dt ? dx / dt : 0;
      truck.position.x = truckX;
      wheels.forEach(w => { w.rotation.z -= dx / .28; });
      if (dx > 0) roadTex.offset.x -= dx * .065;
      body.position.y = (rm ? 0 : suspS.step(dt)) + (!rm && Math.abs(speed) < .01 && !pulse ? Math.abs(Math.sin(tm / 45)) * .006 : 0);
      crate.position.x = -.35 + shake;
      for (const d of dust) if (d.life > 0) { d.life -= dt; d.m.position.addScaledVector(d.v, dt); d.m.scale.setScalar(1 + (1 - d.life) * 2); d.m.material.opacity = Math.max(0, d.life * .55); }
      if (Math.abs(speed) > 1 && Math.random() < .6) { const d = dust.find(x => x.life <= 0); if (d) { d.life = 1; d.m.position.set(truckX - 1.7, .22, (Math.random() - .5) * .8); d.v.set(-1 - Math.random(), .5, Math.random() - .5); } }
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    const api = {
      busy: false,
      /* file sedang diseret di atas area */
      hover(on) { if (api.busy) return; lidS.target = on ? 1 : 0; glowS.target = on ? .6 : 0; },
      /* file masuk peti */
      async receive() {
        api.busy = true; setColor(C.tosca); lidS.target = 1; glowS.target = .6;
        doc.visible = !RM(); doc.scale.setScalar(1);
        await tween(450, EASE_IN_OUT, e => {
          // titik peti di dunia (ikut rotasi panggung)
          doc.position.set(-.35 + truckX, 3.9 - 2.6 * e, .35 * (1 - e));
          doc.rotation.set(-Math.PI / 2 * e, .5 * (1 - e), 0);
          doc.scale.setScalar(1 - .45 * e);
        });
        doc.visible = false; lidS.target = .16; suspS.vel = -1.6; pulse = true; // tutup sedikit terbuka: cahaya baca mengintip
      },
      /* nota terbaca dan terkirim */
      async success() {
        pulse = false; glowS.v = 1; glowS.target = 0; lidS.target = 0;
        await tween(300, EASE_OUT, (e, p) => { beamM.opacity = .55 * Math.sin(p * Math.PI); beam.scale.set(1, .3 + .7 * e, 1); });
        beamM.opacity = 0;
        if (!RM()) {
          await tween(650, EASE_IN_OUT, e => { truckX = 10 * e; });
          truckX = prevX = -10; await wait(250);
          await tween(500, EASE_OUT, e => { truckX = -10 + 10 * e; });
          truckX = 0; suspS.vel = 1.8;
        }
        api.busy = false;
      },
      /* nota tidak bisa dibaca */
      async error() {
        pulse = false; setColor(C.wortel); glowS.v = 1; glowS.target = 0; lidS.target = 1;
        await tween(360, x => x, (_, p) => { shake = RM() ? 0 : Math.sin(p * Math.PI * 6) * .09 * (1 - p); });
        shake = 0; await wait(500); lidS.target = 0; setColor(C.tosca);
        api.busy = false;
      },
      destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.domElement.remove(); }
    };
    return api;
  }

  return { create };
})();
