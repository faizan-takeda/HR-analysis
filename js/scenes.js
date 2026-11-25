/* Takeda 2030: chapter scenes.
   Each builder returns { scene, camera, view, update(t, dt), api }.
   ctx.label(text, anchor, opts) pins an HTML label to a 3D point. */
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE;
  const S = {};
  window.TK = window.TK || {};
  TK.SCENES = S;
  const V = function (x, y, z) { return new T.Vector3(x, y, z); };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const clamp01 = function (x) { return Math.max(0, Math.min(1, x)); };
  const ease = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  const tw = function (target, vars) { if (window.gsap && (!TK.Stage || TK.Stage.motion)) return gsap.to(target, Object.assign({overwrite:'auto'},vars)); Object.keys(vars).filter(k=>!['duration','delay','ease','onComplete','onUpdate','overwrite'].includes(k)).forEach(k=>target[k]=vars[k]); if(vars.onUpdate)vars.onUpdate(); if(vars.onComplete)vars.onComplete(); return null; };

  function setup(o) {
    const K = TK.K;
    const scene = new T.Scene();
    scene.environment = K.env;
    const lights = K.lights(scene, o);
    const camera = new T.PerspectiveCamera(o.fov || 30, 1.6, 0.5, 400);
    return { scene: scene, camera: camera, lights: lights };
  }
  function place(obj, x, y, z, ry) { obj.position.set(x, y, z); if (ry != null) obj.rotation.y = ry; return obj; }
  function show(obj, on, dur) {
    if (!obj) return;
    if (window.gsap) gsap.killTweensOf(obj.scale);
    if (on) { obj.visible = true; tw(obj.scale, { x: 1, y: 1, z: 1, duration: dur || 0.6, ease: 'back.out(1.6)' }); }
    else tw(obj.scale, { x: 0.001, y: 0.001, z: 0.001, duration: (dur || 0.6) * 0.6, ease: 'power2.in', onComplete: function () { obj.visible = false; } });
  }
  function hideNow(obj) { obj.scale.setScalar(0.001); obj.visible = false; }

  /* =====================================================================
     1. A connected enterprise campus
     ===================================================================== */
  S.campus = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 17, shadow: 2048, fov: 28 });
    const scene = s.scene;
    const R = K.rng(11);
    scene.add(K.plinth(27, 17, { r: 1.5, h: 0.95 }));
    // grass and plaza
    const g1 = K.tile(10, 3.0, C.grass, 0.8); place(g1, 0, 0, 6.3); scene.add(g1);
    const g0 = K.tile(10, 3.2, C.grass, 0.8); place(g0, 0, 0, -6.2); scene.add(g0);
    const plaza = K.cyl(3.1, 3.1, 0.05, K.mat(0xF4F1EC, { roughness: 0.9 }), 64); plaza.castShadow = false; scene.add(plaza);
    const plazaRing = K.cyl(3.25, 3.25, 0.03, K.mat(0xD7DDE2, { roughness: 0.9 }), 64); plazaRing.castShadow = false; scene.add(plazaRing);
    // patient pavilion
    const pav = new T.Group(); scene.add(pav);
    const canopy = K.cyl(1.7, 1.7, 0.12, K.mat(C.white, { roughness: 0.4 }), 48); canopy.position.y = 2.0; pav.add(canopy);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const p = K.cyl(0.06, 0.06, 2.0, K.mat(0xE3E8EC, { roughness: 0.4, metalness: 0.4 }), 12); p.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35); pav.add(p); }
    const heart = K.ring(1.05, 0.06, K.glow(C.red, 1.6)); heart.position.y = 0.08; pav.add(heart);
    const heartGlow = K.glowDisc(2.2, 0xFF3355, 0.55); pav.add(heartGlow);
    const core = K.sphere(0.28, K.glow(C.red, 2.2)); core.position.y = 1.0; pav.add(core);

    // buildings
    const research = K.building({ w: 5.4, d: 3.8, floors: 4, accent: C.red }); place(research, -7.9, 0, -3.9); scene.add(research);
    const digital = K.building({ w: 4.8, d: 3.1, floors: 2, tint: 0xB8E0DA, core: 0xCFE3E0 }); place(digital, -7.7, 0, 4.3); scene.add(digital);
    const band = K.box(4.6, 0.08, 0.05, K.glow(C.tealLight, 1.8)); band.position.set(-7.7, 1.92, 5.88); scene.add(band);
    const commercial = K.building({ w: 4.8, d: 3.2, floors: 3, tint: 0xC9D8E8 }); place(commercial, 7.6, 0, 4.3); scene.add(commercial);
    // manufacturing: hall, sawtooth roof, tanks and pipes
    const mfg = new T.Group(); place(mfg, 6.2, 0, -4.1); scene.add(mfg);
    mfg.add(K.rbox(6.4, 2.1, 3.9, 0.15, K.mat(0xE6EAED, { roughness: 0.7 })));
    for (let i = 0; i < 4; i++) {
      const tooth = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 3.7, 3, 1), K.mat(i % 2 ? 0xD3DADF : 0xC9D1D8, { roughness: 0.6 }));
      tooth.rotation.x = Math.PI / 2; tooth.rotation.y = 0; tooth.rotation.z = Math.PI / 2;
      tooth.position.set(-2.3 + i * 1.55, 2.35, 0); tooth.castShadow = true; mfg.add(tooth);
      const sky = K.box(0.04, 0.5, 3.4, K.glass(0xCFE3EE)); sky.position.set(-2.55 + i * 1.55, 2.1, 0); mfg.add(sky);
    }
    const dock = K.rbox(2.2, 0.9, 0.5, 0.05, K.mat(0x9AA7B3, { roughness: 0.5 })); dock.position.set(-1.6, 0, 1.95); mfg.add(dock);
    const stack = K.cyl(0.22, 0.28, 4.3, K.metal(0xD0D7DD), 24); stack.position.set(2.6, 0, -1.2); mfg.add(stack);
    const stackBand = K.cyl(0.3, 0.3, 0.12, K.mat(C.red, { roughness: 0.4 })); stackBand.position.set(2.6, 3.8, -1.2); mfg.add(stackBand);
    for (let i = 0; i < 3; i++) { const tk = K.tank(0.62, 1.7); tk.position.set(10.9, 0, -6.0 + i * 1.75); scene.add(tk); }
    scene.add(K.tube([V(9.35, 1.3, -6), V(10.3, 1.3, -6), V(10.3, 1.3, -2.5)], 0.07, K.metal(0xB9C2CA)));
    scene.add(K.tube([V(9.35, 1.6, -4.3), V(10.9, 1.6, -4.3)], 0.06, K.mat(C.teal, { roughness: 0.4 })));

    // paths
    const pathMat = K.mat(C.path, { roughness: 0.95 });
    const doors = { R: V(-6.4, 0, -1.9), M: V(4.8, 0, -1.9), D: V(-6.3, 0, 2.6), C: V(6.2, 0, 2.6) };
    function edge(p) { const a = Math.atan2(p.z, p.x); return V(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2); }
    Object.keys(doors).forEach(function (k) {
      const d = doors[k], e = edge(d);
      const c = new T.CatmullRomCurve3([d, d.clone().lerp(e, 0.5).add(V(0, 0, 0)), e]);
      const rib = K.ribbon(c, 1.0, pathMat, 30, 0.012); scene.add(rib);
    });
    // trees
    [[-12, -6.8], [-12.3, -1.2], [-12, 1.6], [-12.2, 6.8], [12.2, 6.9], [12.4, 1.4], [-2.6, -6.6], [2.8, -6.4], [0.2, -7.1], [-3.2, 6.6], [3.0, 6.7], [0, 7.2], [-4.4, -6.9], [4.6, 7.0], [12.2, -0.6]]
      .forEach(function (p) { const t = K.tree(1.3 + R() * 0.9, R); place(t, p[0], 0, p[1], R() * 6); scene.add(t); });
    [[-3.4, -2.6], [3.4, 2.6], [-3.4, 2.6], [3.4, -2.6]].forEach(function (p) { const pl = K.planter(); place(pl, p[0], 0, p[1]); scene.add(pl); });

    // walkers between buildings, through the plaza
    const routes = [['R', 'M'], ['R', 'D'], ['R', 'C'], ['M', 'C'], ['D', 'C'], ['M', 'D'], ['R', 'M'], ['D', 'C']];
    const curves = routes.map(function (rt) {
      const a = doors[rt[0]], b = doors[rt[1]];
      const ea = edge(a), eb = edge(b);
      const mid = ea.clone().add(eb).multiplyScalar(0.5); if (mid.length() < 1) mid.set(0, 0, mid.z >= 0 ? 2.2 : -2.2); else mid.setLength(3.0);
      return new T.CatmullRomCurve3([a, ea, mid, eb, b]);
    });
    const walkers = [];
    for (let i = 0; i < 26; i++) {
      const ci = i % curves.length;
      const coat = routes[ci][0] === 'R' && R() > 0.45;
      const p = K.person({ rand: R, coat: coat, shirt: R() > 0.85 ? C.red : null });
      const curve = curves[ci];
      const lane = (R() - 0.5) * 0.6;
      walkers.push({ p: p, c: curve, u: R(), dir: R() > 0.5 ? 1 : -1, sp: 0.8 + R() * 0.5, len: curve.getLength(), lane: lane });
      scene.add(p);
    }
    // standing groups
    const standers = [];
    [[-1.4, 1.2], [-0.6, 1.9], [-1.9, 2.0], [1.7, -1.4], [2.4, -0.8], [1.0, -1.9], [-5.6, -0.9], [-5.0, -1.4], [5.5, 1.6], [6.2, 1.3]]
      .forEach(function (q, i) {
        const p = K.person({ rand: R, coat: i >= 6 && i < 8 });
        place(p, q[0], 0, q[1]); scene.add(p); standers.push(p);
      });
    function faceGroup(a, b, c) { const cx = (a.position.x + b.position.x + c.position.x) / 3, cz = (a.position.z + b.position.z + c.position.z) / 3; [a, b, c].forEach(function (p) { K.face(p, cx, cz); }); }
    faceGroup(standers[0], standers[1], standers[2]); faceGroup(standers[3], standers[4], standers[5]);
    K.face(standers[6], standers[7].position.x, standers[7].position.z); K.face(standers[7], standers[6].position.x, standers[6].position.z);
    K.face(standers[8], standers[9].position.x, standers[9].position.z); K.face(standers[9], standers[8].position.x, standers[8].position.z);

    // knowledge flows between buildings
    const top = function (b, x, z) { return V(x, b.userData.height || 2.4, z); };
    const arcs = [
      K.arc(top(research, -7.9, -3.9), V(6.2, 2.6, -4.1), 3.2),
      K.arc(top(research, -7.9, -3.9), top(digital, -7.7, 4.3), 2.4),
      K.arc(top(digital, -7.7, 4.3), top(commercial, 7.6, 4.3), 3.0),
      K.arc(V(6.2, 2.6, -4.1), top(commercial, 7.6, 4.3), 2.2)
    ];
    arcs.forEach(function (c, i) {
      const m = new T.Mesh(new T.TubeGeometry(c, 60, 0.025, 6, false), new T.MeshBasicMaterial({ color: i % 2 ? 0xFF6F84 : 0x5FD6C6, transparent: true, opacity: 0.35, toneMapped: false }));
      scene.add(m);
    });
    const flowA = K.flow(arcs.filter(function (_, i) { return i % 2 === 0; }), 5, 0x5FE3D2, 0.09, 0.07);
    const flowB = K.flow(arcs.filter(function (_, i) { return i % 2 === 1; }), 5, 0xFF5A72, 0.09, 0.06);
    scene.add(flowA, flowB);

    ctx.label('Research', V(-7.9, 4.6, -3.9));
    ctx.label('Manufacturing', V(6.2, 4.8, -4.1));
    ctx.label('Digital and data', V(-7.7, 2.6, 4.3));
    ctx.label('Commercial', V(7.6, 3.5, 4.3));
    ctx.label('Patients at the center', V(0, 2.55, 0), { cls: 'red' });

    return {
      scene: scene, camera: s.camera,
      view: { target: V(0.4, 0.2, 0.3), radius: 40.5, yaw: 0.34, pitch: 0.66, fov: 28, fit: 1.35 },
      update: function (t, dt) {
        walkers.forEach(function (w) {
          w.u += w.dir * dt * w.sp / w.len;
          if (w.u > 1) { w.u = 1; w.dir = -1; } else if (w.u < 0) { w.u = 0; w.dir = 1; }
          const p = w.c.getPointAt(w.u), tg = w.c.getTangentAt(w.u).multiplyScalar(w.dir);
          const side = V(-tg.z, 0, tg.x).multiplyScalar(w.lane);
          w.p.position.set(p.x + side.x, 0, p.z + side.z);
          w.p.rotation.y = Math.atan2(tg.x, tg.z);
          K.pose(w.p, t, 1, 7.5);
        });
        standers.forEach(function (p) { K.pose(p, t, 0); });
        flowA.userData.update(t); flowB.userData.update(t);
        const k = 0.5 + 0.5 * Math.sin(t * 1.6);
        heartGlow.material.opacity = 0.35 + 0.3 * k;
        core.position.y = 1.0 + Math.sin(t * 1.2) * 0.08;
      }
    };
  };

  /* =====================================================================
     2. Same people, new tools
     ===================================================================== */
  S.tools = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 11, fov: 30 });
    const scene = s.scene;
    const R = K.rng(23);
    scene.add(K.plinth(18, 8.4, { r: 1.0 }));
    const zones = [{ x: -5.9, col: 0xE1EAF0 }, { x: 0, col: 0x2C3846 }, { x: 5.9, col: 0xEEE3D4 }];
    zones.forEach(function (z) { const t = K.tile(5.6, 7.4, z.col, 0.35); t.position.x = z.x; scene.add(t); });

    const oldT = [], newT = [];
    // --- R&D lab
    const bench = K.bench(3.6); place(bench, -5.9, 0, -2.4); scene.add(bench);
    const micro = K.microscope(); place(micro, -6.9, 0.55, -2.35, 0.3); scene.add(micro); oldT.push(micro);
    const fl = new T.Group(); [0, 1, 2].forEach(function (i) { const f = K.flask(i === 1 ? 0xF2B8C2 : 0xBFE6DF); f.position.set(i * 0.26, 0, (i % 2) * 0.1); fl.add(f); }); place(fl, -5.6, 0.55, -2.35); scene.add(fl); oldT.push(fl);
    const rack = new T.Group(); rack.add(K.rbox(0.5, 0.08, 0.2, 0.02, K.mat(C.white))); for (let i = 0; i < 5; i++) { const pp = K.cyl(0.015, 0.008, 0.3, K.mat(i % 2 ? C.teal : 0xF2F4F6), 8); pp.position.set(-0.2 + i * 0.1, 0.08, 0); rack.add(pp); } place(rack, -4.6, 0.55, -2.3); scene.add(rack); oldT.push(rack);
    const arm = K.robotArm(C.teal); place(arm, -6.4, 0.55, -2.35); arm.scale.setScalar(1.05); scene.add(arm); newT.push(arm);
    const reader = new T.Group(); reader.add(K.rbox(0.8, 0.42, 0.5, 0.06, K.mat(0xF4F6F8, { roughness: 0.35 }))); const rs = K.box(0.6, 0.06, 0.02, K.glow(C.tealLight, 2)); rs.position.set(0, 0.25, 0.26); reader.add(rs); place(reader, -4.9, 0.55, -2.35); scene.add(reader); newT.push(reader);
    const holoLab = new T.Mesh(new T.PlaneGeometry(2.0, 1.0), new T.MeshBasicMaterial({ map: K.screen('holo'), transparent: true, opacity: 0.9, side: T.DoubleSide, toneMapped: false, depthWrite: false })); place(holoLab, -5.9, 2.15, -2.5); scene.add(holoLab); newT.push(holoLab);
    const sci = K.person({ rand: R, coat: true }); place(sci, -5.2, 0, -1.45); K.face(sci, -5.9, -2.4); scene.add(sci);

    // --- Cyber operations
    const cdesk = K.desk({ w: 2.2, d: 0.75, monitor: false, top: 0x3A4654 }); place(cdesk, 0, 0, -1.7); scene.add(cdesk);
    const mons = new T.Group();
    [['code', -0.68, 0.35], ['threat', 0, 0], ['dash', 0.68, -0.35]].forEach(function (m) { const mo = K.monitor(m[0]); mo.position.set(m[1], 0.6, -1.85 + Math.abs(m[1]) * 0.18); mo.rotation.y = m[2]; mons.add(mo); });
    scene.add(mons); oldT.push(mons);
    const wall = new T.Group(); const wp = new T.Mesh(new T.PlaneGeometry(3.0, 1.4), K.screenMat('threat', null, 0.95)); wp.position.y = 1.75; wall.add(wp);
    const wf = K.box(3.1, 1.5, 0.06, K.mat(C.graphite)); wf.position.set(0, 1.0, -0.04); wall.add(wf);
    const wl = K.box(0.1, 1.0, 0.1, K.mat(C.graphite)); wall.add(wl); place(wall, 0, 0, -3.4); scene.add(wall); oldT.push(wall);
    const curved = new T.Mesh(new T.CylinderGeometry(1.7, 1.7, 1.25, 48, 1, true, -0.75, 1.5), new T.MeshBasicMaterial({ map: K.screen('holo'), transparent: true, opacity: 0.85, side: T.DoubleSide, toneMapped: false, depthWrite: false }));
    curved.rotation.y = Math.PI; place(curved, 0, 1.55, -0.3); scene.add(curved); newT.push(curved);
    const orb = new T.Group(); orb.add(K.sphere(0.2, K.glow(C.tealLight, 2.4))); const orbRing = K.ring(0.34, 0.012, K.glow(0x9FF2E6, 2)); orb.add(orbRing); place(orb, 0.95, 1.05, -1.75); scene.add(orb); newT.push(orb);
    const analyst = K.person({ rand: R, shirt: 0x3E6E8E }); place(analyst, 0, 0, -0.75, Math.PI); scene.add(analyst);

    // --- Commercial analytics
    const ctab = K.table(1.7, 1.7, C.white); place(ctab, 5.9, 0, -1.3); scene.add(ctab);
    const laptop = new T.Group(); laptop.add(K.box(0.42, 0.02, 0.3, K.mat(0xB9C2CA, { metalness: 0.6, roughness: 0.3 }))); const lsc = new T.Mesh(new T.PlaneGeometry(0.4, 0.26), K.screenMat('dash')); lsc.position.set(0, 0.14, -0.15); lsc.rotation.x = -0.25; laptop.add(lsc); place(laptop, 5.9, 0.6, -1.3, 0.3); scene.add(laptop); oldT.push(laptop);
    const board = new T.Group(); const bp = new T.Mesh(new T.PlaneGeometry(1.9, 1.1), K.screenMat('dash')); bp.position.y = 1.55; board.add(bp); const bf = K.box(2.0, 1.2, 0.05, K.mat(C.graphite)); bf.position.set(0, 0.95, -0.03); board.add(bf); const bl = K.box(0.08, 0.95, 0.08, K.mat(C.graphite)); board.add(bl); place(board, 5.9, 0, -3.3); scene.add(board); oldT.push(board);
    const globe = new T.Group(); globe.add(new T.Mesh(new T.IcosahedronGeometry(0.5, 2), new T.MeshBasicMaterial({ color: 0x7FF0E0, wireframe: true, transparent: true, opacity: 0.8, toneMapped: false }))); const gr1 = K.ring(0.72, 0.015, K.glow(0xFF6F84, 2)); globe.add(gr1); const gr2 = K.ring(0.85, 0.012, K.glow(0x7FF0E0, 2)); gr2.rotation.z = 0.5; globe.add(gr2); globe.add(K.glowDisc(0.9, 0x5FE3D2, 0.6)); place(globe, 5.9, 1.35, -1.3); scene.add(globe); newT.push(globe);
    const orb2 = orb.clone(); place(orb2, 7.0, 1.2, -2.2); scene.add(orb2); newT.push(orb2);
    const cp1 = K.person({ rand: R }); place(cp1, 5.0, 0, -0.55); K.face(cp1, 5.9, -1.3); scene.add(cp1);
    const cp2 = K.person({ rand: R, shirt: 0x7A8C6E }); place(cp2, 6.85, 0, -0.6); K.face(cp2, 5.9, -1.3); scene.add(cp2);

    newT.forEach(hideNow);
    // judgment rings
    const people = [sci, analyst, cp1, cp2];
    const rings = people.map(function (p) {
      const g = new T.Group(); g.add(K.ring(0.42, 0.028, K.glow(C.tealLight, 1.8))); g.add(K.glowDisc(0.75, 0x2FD3C0, 0.4));
      g.position.set(p.position.x, 0.03, p.position.z); scene.add(g); return g;
    });
    const plants = [[-8.3, 2.9], [2.2, 3.0], [8.3, 2.9]]; plants.forEach(function (q) { const pl = K.planter(); place(pl, q[0], 0, q[1]); scene.add(pl); });

    ctx.label('R&D lab', V(-5.6, 0.2, 2.0));
    ctx.label('Cyber operations', V(0, 0.2, 2.0));
    ctx.label('Commercial analytics', V(5.4, 0.2, 2.0));
    ctx.label('Judgment', V(0, 0.35, -0.75), { cls: 'teal' });

    let era = 0;
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0, 0.7, -0.8), radius: 19, yaw: 0.0, pitch: 0.7, fov: 30, fit: 1.7 },
      update: function (t) {
        people.forEach(function (p) { K.pose(p, t, 0); });
        rings.forEach(function (r, i) { const k = 1 + Math.sin(t * 2 + i) * 0.04; r.scale.set(k, 1, k); });
        orb.rotation.y = t * 1.2; orbRing.rotation.x = t; orb2.rotation.y = -t;
        globe.rotation.y = t * 0.5; holoLab.position.y = 2.15 + Math.sin(t * 1.3) * 0.04;
        if (era) { arm.userData.s1.rotation.y = Math.sin(t * 0.8) * 0.9; arm.userData.s2.rotation.z = -1.1 + Math.sin(t * 1.3) * 0.25; }
      },
      api: {
        setEra: function (on) {
          era = on ? 1 : 0;
          (on ? oldT : newT).forEach(function(o){show(o,false,.5)});
          (on ? newT : oldT).forEach(function(o){show(o,true,.8)});
          rings.forEach(function (r) { if (window.gsap) gsap.fromTo(r.scale, { x: 1.6, z: 1.6 }, { x: 1, z: 1, duration: 1.2, ease: 'elastic.out(1,0.5)', delay: 0.4 }); });
        }
      }
    };
  };

  /* =====================================================================
     3. The requisition check: one mission, one skill
     ===================================================================== */
  S.allocation = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 10, fov: 30 });
    const scene = s.scene;
    const R = K.rng(5);
    scene.add(K.plinth(15, 10.5, { r: 1.0, top: C.floorWarm }));
    const back = K.rbox(13.6, 1.3, 0.16, 0.05, K.mat(C.white, { roughness: 0.6 })); back.position.set(0.2, 0, -4.7); scene.add(back);
    const bscr = new T.Mesh(new T.PlaneGeometry(2.6, 0.85), K.screenMat('kanban', null, 0.9)); bscr.position.set(1.0, 0.72, -4.6); scene.add(bscr);
    // the door other teams walk through
    const DX = -6.2, DZ = 1.2;
    const door = K.arch(1.5, 2.0, K.mat(C.white, { roughness: 0.5 }), 0.32); place(door, DX, 0, DZ, Math.PI / 2); scene.add(door);
    const doorGlow = K.glowDisc(1.4, 0xF2A93B, 0.7); doorGlow.position.set(DX + 0.5, 0.02, DZ); scene.add(doorGlow);
    const lintel = K.box(1.7, 0.09, 0.36, K.glow(C.amber, 1.6)); lintel.rotation.y = Math.PI / 2; lintel.position.set(DX, 2.25, DZ); scene.add(lintel);
    [[-6.7, -4.2], [6.8, -4.2], [6.8, 4.4], [-6.7, 4.4]].forEach(function (q) { const pl = K.planter(); place(pl, q[0], 0, q[1]); scene.add(pl); });

    const matTeal = K.mat(C.teal, { roughness: 0.7 }), matAmber = K.mat(C.amber, { roughness: 0.7 });
    const ringTeal = K.glow(C.tealLight, 1.6), ringAmber = K.glow(0xF2A93B, 1.6);
    const slots = [];
    const cols = 5, rows = 4;
    for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) {
      const x = -2.6 + c * 1.95, z = -3.1 + r * 1.85;
      const desk = K.desk({ w: 1.2, d: 0.62, flipMonitor: true, screen: ['dash', 'code', 'molecule'][(r + c) % 3] });
      place(desk, x, 0, z); scene.add(desk);
      const p = K.person({ rand: R, shirtMat: matTeal });
      place(p, x, 0, z - 0.6, 0); scene.add(p);
      const ring = new T.Group(); ring.add(K.ring(0.38, 0.035, K.glow(C.tealLight, 1.6))); const rg = K.glowDisc(0.6, 0x2FD3C0, 0.45); ring.add(rg); ring.position.set(x, 0.03, z - 0.6); scene.add(ring); ring.userData = { r: ring.children[0], g: rg };
      const pin = new T.Group();
      const cone = new T.Mesh(new T.ConeGeometry(0.16, 0.36, 24), K.glow(C.red, 1.3)); cone.rotation.x = Math.PI; cone.position.y = 0.18; cone.castShadow = true; pin.add(cone);
      const ball = K.sphere(0.2, K.glow(C.red, 1.3)); ball.position.y = 0.5; pin.add(ball);
      place(pin, x, 1.05, z - 0.25); scene.add(pin);
      const pinGlow = K.glowDisc(0.75, 0xFF2D4B, 0.6); pinGlow.position.set(x, 0.03, z - 0.55); scene.add(pinGlow);
      [desk, p, ring, pin, pinGlow].forEach(hideNow);
      slots.push({ x: x, z: z, desk: desk, p: p, ring: ring, pin: pin, pinGlow: pinGlow, state: 'off', walk: null });
    }
    ctx.label('From other teams', V(DX, 2.75, DZ), { cls: 'amber' });

    function setSlot(sl, st, delay) {
      if (sl.state === st) return;
      const prev = sl.state; sl.state = st;
      const d = (delay || 0);
      clearTimeout(sl.timer); sl.timer = setTimeout(function () {
        if(sl.walk){sl.walk.kill();sl.walking=false;}
        show(sl.desk, st !== 'off', 0.5);
        if (st === 'hire') { show(sl.pin, true, 0.6); show(sl.pinGlow, true, 0.6); } else { show(sl.pin, false, 0.3); show(sl.pinGlow, false, 0.3); }
        if (st === 'avail' || st === 'redeploy') {
          sl.p.userData.torso.material = st === 'avail' ? matTeal : matAmber;
          sl.ring.userData.r.material = st === 'avail' ? ringTeal : ringAmber;
          sl.ring.userData.g.material.color.set(st === 'avail' ? 0x2FD3C0 : 0xF2A93B);
          show(sl.ring, true, 0.4);
          if (st === 'redeploy' && prev !== 'redeploy' && window.gsap && TK.Stage && TK.Stage.motion) {
            // walk in from the door
            if (sl.walk) sl.walk.kill();
            const curve = new T.CatmullRomCurve3([V(DX - 0.3, 0, DZ), V(DX + 1.2, 0, DZ), V(-3.9, 0, sl.z - 1.05), V(sl.x, 0, sl.z - 1.05), V(sl.x, 0, sl.z - 0.6)]);
            gsap.killTweensOf(sl.p.scale); sl.p.visible = true; sl.p.scale.setScalar(1);
            const proxy = { u: 0 };
            sl.walking = true; sl.curve = curve;
            sl.walk = gsap.to(proxy, { u: 1, duration: curve.getLength() / 2.2, ease: 'none', onUpdate: function () { sl.u = proxy.u; }, onComplete: function () { sl.walking = false; sl.p.rotation.y = 0; sl.p.position.set(sl.x, 0, sl.z - 0.6); } });
            sl.u = 0;
          } else { sl.p.position.set(sl.x,0,sl.z-.6); show(sl.p, true, 0.5); }
        } else {
          if (sl.walk) { sl.walk.kill(); sl.walking = false; }
          show(sl.p, false, 0.35); show(sl.ring, false, 0.3);
        }
      }, d);
    }
    return {
      scene: scene, camera: s.camera,
      view: { target: V(-0.6, 0.2, 0.3), radius: 17.5, yaw: 0.1, pitch: 0.8, fov: 30, fit: 1.8 },
      update: function (t) {
        slots.forEach(function (sl, i) {
          if (sl.walking && sl.curve) {
            const p = sl.curve.getPointAt(Math.min(1, sl.u)), tg = sl.curve.getTangentAt(Math.min(0.999, sl.u));
            sl.p.position.set(p.x, 0, p.z); sl.p.rotation.y = Math.atan2(tg.x, tg.z);
            K.pose(sl.p, t, 1, 8);
          } else if (sl.p.visible) K.pose(sl.p, t, 0);
          if (sl.pin.visible) sl.pin.position.y = 1.05 + Math.sin(t * 2.2 + i) * 0.08;
        });
      },
      api: {
        set: function (demand, avail, redeploy) {
          const a = Math.min(avail, demand), rd = Math.min(redeploy, demand - a);
          slots.forEach(function (sl, i) {
            const st = i >= demand ? 'off' : i < a ? 'avail' : i < a + rd ? 'redeploy' : 'hire';
            setSlot(sl, st, i * 25);
          });
        }
      }
    };
  };

  /* =====================================================================
     4. The evidence tower
     ===================================================================== */
  S.tower = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 8, fov: 30 });
    const scene = s.scene;
    const R = K.rng(41);
    scene.add(K.disc(6.0, { top: C.floor }));
    // the interview room behind
    const rug = K.tile(5.0, 2.4, 0xDDE4E9, 0.4); rug.position.set(1.7, 0, -3.1); scene.add(rug);
    const table = K.table(2.4, 0.95, C.white); place(table, 1.7, 0, -3.2); scene.add(table);
    const ivA = K.person({ rand: R }); place(ivA, 1.1, 0, -3.95, 0); scene.add(ivA);
    const ivB = K.person({ rand: R, coat: true }); place(ivB, 2.3, 0, -3.95, 0); scene.add(ivB);
    const cand = K.person({ rand: R, shirt: 0x7A8899 }); place(cand, 1.7, 0, -2.4, Math.PI); scene.add(cand);
    const rub = new T.Group(); const rp = new T.Mesh(new T.PlaneGeometry(1.5, 0.95), K.screenMat('rubric', null, 0.85)); rp.position.y = 1.4; rub.add(rp); const rf = K.box(1.6, 1.05, 0.05, K.mat(C.graphite)); rf.position.set(0, 0.88, -0.03); rub.add(rf); rub.add(K.box(0.07, 0.88, 0.07, K.mat(C.graphite))); place(rub, 4.1, 0, -2.9, -0.7); scene.add(rub);
    // pedestal and tower
    const ped = K.cyl(1.35, 1.45, 0.5, K.mat(C.white, { roughness: 0.4 }), 64); place(ped, -1.0, 0, 1.0); scene.add(ped);
    const halo = K.ring(1.8, 0.045, K.glow(C.tealLight, 1.8)); halo.position.set(-1.0, 0.04, 1.0); scene.add(halo); hideNow(halo);
    const tower = new T.Group(); place(tower, -1.0, 0.5, 1.0); scene.add(tower);
    const cap = K.rbox(2.0, 0.3, 2.0, 0.14, K.mat(C.red, { roughness: 0.28, metalness: 0.1 })); tower.add(cap);
    const capAnchor = new T.Object3D(); cap.add(capAnchor); capAnchor.position.y = 0.6;
    const blocks = [];
    const strongM = K.mat(0x2A8A7E, { roughness: 0.5 });
    const glassM = new T.MeshPhysicalMaterial({ color: 0x9FD0E6, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false });
    const glassEdge = new T.LineBasicMaterial({ color: 0x5E9AB5, transparent: true, opacity: 0.9 });
    const ghostM = new T.LineBasicMaterial({ color: 0x8796A5, transparent: true, opacity: 0.85 });
    const reviewer = K.person({ rand: R, shirt: C.navy }); place(reviewer, 1.4, 0, 1.8); K.face(reviewer, -1.0, 1.0); scene.add(reviewer);
    const revRing = K.ring(0.4, 0.028, K.glow(C.tealLight, 1.8)); revRing.position.set(1.4, 0.03, 1.8); scene.add(revRing);
    hideNow(reviewer); hideNow(revRing);
    let amp = 0.08, revOn = false;
    ctx.label('Hiring decision', capAnchor, { cls: 'red' });
    ctx.label('Independent reviewer', V(1.4, 1.75, 1.8), { cls: 'teal', show: function () { return revOn; } });
    ctx.label('Interview', V(1.7, 1.75, -3.4), { cls: 'quiet' });

    function makeBlock(tier) {
      if (tier === 'strong') return K.rbox(1.8, 0.55, 1.8, 0.08, strongM);
      if (tier === 'weak') { const g0 = new T.Group(); const m = K.rbox(1.35, 0.4, 1.35, 0.06, glassM); m.castShadow = false; g0.add(m); const eg = new T.BoxGeometry(1.35, 0.4, 1.35); eg.translate(0, 0.2, 0); g0.add(new T.LineSegments(new T.EdgesGeometry(eg), glassEdge)); return g0; }
      const g = new T.Group();
      const geo = new T.BoxGeometry(1.2, 0.38, 1.2); geo.translate(0, 0.19, 0);
      g.add(new T.LineSegments(new T.EdgesGeometry(geo), ghostM));
      g.add(new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xB4C0CC, transparent: true, opacity: 0.12, depthWrite: false })));
      return g;
    }
    function setSignals(tiers) {
      const order = { strong: 0, weak: 1, unproven: 2 };
      const list = tiers.slice().sort(function (a, b) { return order[a] - order[b]; });
      blocks.forEach(function (b) { if (window.gsap) gsap.killTweensOf(b.position); tower.remove(b); });
      blocks.length = 0;
      let y = 0, side = 1, weakCount = 0;
      list.forEach(function (tier, i) {
        const b = makeBlock(tier);
        const h = tier === 'strong' ? 0.55 : tier === 'weak' ? 0.4 : 0.38;
        let off = 0;
        if (tier !== 'strong') { weakCount++; off = side * (0.16 + weakCount * 0.05) * (tier === 'unproven' ? 1.4 : 1); side *= -1; b.rotation.y = (R() - 0.5) * 0.4; }
        b.position.set(off, y, 0);
        tower.add(b); blocks.push(b);
        if (window.gsap && TK.Stage && TK.Stage.motion) gsap.from(b.position, { y: y + 3, duration: 0.7, delay: i * 0.08, ease: 'bounce.out' });
        y += h;
      });
      if (window.gsap && TK.Stage && TK.Stage.motion) { gsap.to(cap.position, { y: y, duration: 0.6, ease: 'power2.out' }); } else cap.position.y = y;
      const n = list.length;
      const weakShare = n ? list.reduce(function (a, t) { return a + (t === 'weak' ? 1 : t === 'unproven' ? 1.35 : 0); }, 0) / n : 1;
      amp = n ? 0.006 + 0.06 * Math.min(1, weakShare) : 0.07;
    }
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0.2, 1.2, -0.6), radius: 13.5, yaw: 0.3, pitch: 0.44, fov: 30, fit: 1.6 },
      update: function (t) {
        tower.rotation.z = Math.sin(t * 2.1) * amp;
        tower.rotation.x = Math.sin(t * 1.6 + 1) * amp * 0.6;
        [ivA, ivB, cand, reviewer].forEach(function (p) { if (p.visible) K.pose(p, t, 0); });
      },
      api: {
        setSignals: setSignals,
        setReviewer: function (on) { revOn = on; show(reviewer, on); show(revRing, on); show(halo, on); }
      }
    };
  };

  /* =====================================================================
     5. When the evidence changes: the decision route
     ===================================================================== */
  S.route = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 10, fov: 30 });
    const scene = s.scene;
    const R = K.rng(77);
    scene.add(K.plinth(16.5, 10, { r: 1.0 }));
    // three workstations at the back
    const stations = [];
    const xs = [-5.0, 0, 5.0];
    xs.forEach(function (x, i) {
      const g = new T.Group(); place(g, x, 0, -2.7); scene.add(g);
      const tile = K.tile(4.2, 2.9, [0xE4EDF2, 0x2C3846, 0xF0E7DB][i], 0.3); g.add(tile);
      const glow = K.glowDisc(2.3, 0x2FD3C0, 0.5); g.add(glow); hideNow(glow);
      const ppl = [];
      if (i === 0) { const b = K.bench(2.6); b.position.z = -0.6; g.add(b); const m = K.microscope(); m.position.set(-0.6, 0.55, -0.55); g.add(m); const f = K.flask(0xF2B8C2); f.position.set(0.5, 0.55, -0.55); g.add(f); const p = K.person({ rand: R, coat: true }); p.position.set(0.2, 0, 0.35); p.rotation.y = Math.PI; g.add(p); ppl.push(p); }
      if (i === 1) { const d = K.desk({ w: 1.9, d: 0.7, monitor: false, top: 0x3A4654 }); d.position.z = -0.45; g.add(d); [['code', -0.45], ['threat', 0.45]].forEach(function (q) { const mo = K.monitor(q[0]); mo.position.set(q[1], 0.6, -0.6); g.add(mo); }); const p = K.person({ rand: R, shirt: 0x3E6E8E }); p.position.set(0, 0, 0.45); p.rotation.y = Math.PI; g.add(p); ppl.push(p); }
      if (i === 2) { const tb = K.table(1.4, 1.4); tb.position.z = -0.1; g.add(tb); const bd = new T.Group(); const bp = new T.Mesh(new T.PlaneGeometry(1.6, 0.9), K.screenMat('dash')); bp.position.y = 1.45; bd.add(bp); bd.add(K.box(0.07, 0.95, 0.07, K.mat(C.graphite))); const bf = K.box(1.7, 1.0, 0.05, K.mat(C.graphite)); bf.position.set(0, 0.95, -0.03); bd.add(bf); bd.position.z = -1.1; g.add(bd); const p = K.person({ rand: R }); p.position.set(-0.75, 0, 0.45); p.rotation.y = 2.4; g.add(p); ppl.push(p); const p2 = K.person({ rand: R }); p2.position.set(0.75, 0, 0.45); p2.rotation.y = -2.4; g.add(p2); ppl.push(p2); }
      stations.push({ g: g, glow: glow, ppl: ppl });
    });
    // route
    const startPad = K.cyl(0.65, 0.7, 0.14, K.mat(C.teal, { roughness: 0.4 }), 48); place(startPad, -6.4, 0, 2.3); scene.add(startPad);
    const goalPad = K.cyl(0.65, 0.7, 0.14, K.mat(0xE3E9EE, { roughness: 0.4 }), 48); place(goalPad, 6.4, 0, 2.3); scene.add(goalPad);
    const goalGlow = K.glowDisc(1.5, 0x2FD3C0, 0.0); goalGlow.position.set(6.4, 0.17, 2.3); scene.add(goalGlow);
    const flag = new T.Group(); flag.add(K.cyl(0.03, 0.03, 1.3, K.metal())); const fp = K.box(0.55, 0.32, 0.02, K.mat(C.teal)); fp.position.set(0.28, 0.95, 0); flag.add(fp); place(flag, 6.4, 0.14, 2.3); scene.add(flag);
    const pathA = new T.CatmullRomCurve3([V(-6.0, 0.3, 2.3), V(-3, 0.3, 2.3), V(0, 0.3, 2.3), V(3, 0.3, 2.3), V(6.0, 0.3, 2.3)]);
    const pathB = new T.CatmullRomCurve3([V(-6.0, 0.3, 2.3), V(-3.2, 0.3, 2.5), V(-1.5, 0.3, 4.0), V(1.5, 0.3, 4.0), V(3.2, 0.3, 2.5), V(6.0, 0.3, 2.3)]);
    const matA = new T.MeshBasicMaterial({ color: 0x2FD3C0, transparent: true, opacity: 0.95, toneMapped: false });
    const tubeA = new T.Mesh(new T.TubeGeometry(pathA, 120, 0.075, 10, false), matA); scene.add(tubeA);
    const geoB = new T.TubeGeometry(pathB, 160, 0.085, 10, false);
    const tubeB = new T.Mesh(geoB, new T.MeshBasicMaterial({ color: 0x2FE3CF, toneMapped: false })); scene.add(tubeB);
    const totalB = geoB.index.count; geoB.setDrawRange(0, 0);
    const shadowA = K.ribbon(pathA, 0.5, K.mat(0xD9E0E5, { roughness: 0.95 }), 60, -0.27); scene.add(shadowA);
    const barrier = new T.Group();
    const bw = K.rbox(0.35, 1.5, 2.0, 0.08, new T.MeshPhysicalMaterial({ color: 0xE0344F, roughness: 0.2, transparent: true, opacity: 0.8, clearcoat: 1 }));
    bw.position.z = -1.0 + 1.0; barrier.add(bw);
    const bglow = K.glowDisc(1.6, 0xFF2D4B, 0.75); barrier.add(bglow);
    place(barrier, 0, 0, 2.3); scene.add(barrier); barrier.scale.set(1, 0.001, 1); barrier.visible = false;
    const orb = K.sphere(0.2, new T.MeshBasicMaterial({ color: 0xB9FFF4, toneMapped: false })); scene.add(orb);
    const orbGlow = K.glowDisc(0.7, 0x2FD3C0, 0.8); orbGlow.rotation.x = 0; orbGlow.material.side = T.DoubleSide; scene.add(orbGlow);
    const flash = K.glowDisc(2.4, 0xFF2D4B, 0); flash.position.set(0, 0.35, 2.3); scene.add(flash);
    ctx.label('Start', V(-6.4, 0.9, 2.3));
    ctx.label('Decision review', V(6.4, 1.8, 2.3), { cls: 'teal' });
    let state = 'plan', bGrow = { v: 0 }, flashT = -10, clock = 0;
    ctx.label('New evidence', V(0, 2.0, 2.3), { cls: 'red', show: function () { return state !== 'plan'; } });

    function setActive(i) { stations.forEach(function (st, k) { show(st.glow, k === i, 0.4); }); }
    setActive(0);
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0, 0.5, 0.2), radius: 16.5, yaw: 0.0, pitch: 0.66, fov: 30, fit: 1.7 },
      update: function (t) {
        clock = t;
        stations.forEach(function (st) { st.ppl.forEach(function (p) { K.pose(p, t, 0); }); });
        let u, curve;
        if (state === 'B') { curve = pathB; u = (t * 0.16) % 1; }
        else if (state === 'plan') { curve = pathA; u = (t * 0.16) % 1; }
        else { curve = pathA; u = Math.min(0.455, (t * 0.16) % 0.62); }
        const p = curve.getPointAt(u);
        orb.position.copy(p); orbGlow.position.set(p.x, 0.32, p.z);
        if (state === 'A' || state === 'twist') {
          if (u >= 0.455 && t - flashT > 1.2) flashT = t;
          flash.material.opacity = Math.max(0, 0.9 - (t - flashT) * 1.2);
        } else flash.material.opacity = 0;
        goalGlow.material.opacity = state === 'B' ? 0.55 + 0.25 * Math.sin(t * 3) : 0;
        geoB.setDrawRange(0, Math.floor(totalB * bGrow.v / 3) * 3);
      },
      api: {
        setContext: function (i) { setActive(i); this.reset(); },
        reset: function () {
          state = 'plan'; matA.color.set(0x2FD3C0); matA.opacity = 0.95; bGrow.v = 0;
          if (window.gsap) gsap.killTweensOf(barrier.scale);
          tw(barrier.scale, { y: 0.001, duration: 0.35, onComplete: function () { barrier.visible = false; } });
          fp.material = K.mat(C.teal);
        },
        twist: function () {
          state = 'twist'; barrier.visible = true;
          tw(barrier.scale, { y: 1, duration: 0.9, ease: 'back.out(1.8)' });
          if (window.gsap) gsap.to(matA, { opacity: 0.35, duration: 0.6 }); matA.color.set(0xFF5A72);
        },
        pick: function (i) {
          if (i === 1) { state = 'B'; tw(bGrow, { v: 1, duration: 1.4, ease: 'power2.inOut' }); }
          else { state = 'A'; bGrow.v = 0; }
        }
      }
    };
  };

  /* =====================================================================
     6. One analyst's capability path
     ===================================================================== */
  S.journey = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 11, fov: 30 });
    const scene = s.scene;
    const R = K.rng(91);
    scene.add(K.plinth(21, 9.4, { r: 1.0 }));
    const cs = [V(-8.0, 0, -2.0), V(-4.0, 0, 2.1), V(0, 0, -2.0), V(4.0, 0, 2.1), V(8.0, 0, -2.0)];
    const spots = [V(-8.0, 0, -0.55), V(-4.0, 0, 0.75), V(0, 0, -0.6), V(4.0, 0, 0.75), V(8.0, 0, -0.55)];
    const tiles = [0xE4EDF2, 0xF0E7DB, 0xE6EEF0, 0xDDEFEA, 0xEFE8F0];
    const glows = [];
    cs.forEach(function (c, i) {
      const t = K.tile(3.6, 2.9, tiles[i], 0.35); t.position.copy(c); scene.add(t);
      const g = K.glowDisc(2.0, 0x2FD3C0, 0.0); g.position.set(c.x, 0.04, c.z); scene.add(g); glows.push(g);
    });
    const ambient = [];
    // Learn: classroom
    (function () {
      const c = cs[0];
      const scr = new T.Group(); const sp = new T.Mesh(new T.PlaneGeometry(1.8, 1.05), K.screenMat('course', null, 0.9)); sp.position.y = 1.45; scr.add(sp); const sf = K.box(1.9, 1.15, 0.05, K.mat(C.graphite)); sf.position.set(0, 0.88, -0.03); scr.add(sf); scr.add(K.box(0.07, 0.9, 0.07, K.mat(C.graphite))); place(scr, c.x, 0, c.z - 1.1); scene.add(scr);
      [-0.8, 0.8].forEach(function (dx, k) { const d = K.desk({ w: 0.95, d: 0.55, screen: 'course' }); place(d, c.x + dx, 0, c.z + 0.1, Math.PI); scene.add(d); if (k === 1) { const p = K.person({ rand: R }); place(p, c.x + dx, 0, c.z + 0.6, Math.PI); scene.add(p); ambient.push(p); } });
    })();
    // Apply: mission table
    (function () {
      const c = cs[1];
      const tb = K.table(2.0, 1.0); place(tb, c.x, 0, c.z + 0.1); scene.add(tb);
      const kb = new T.Group(); const kp = new T.Mesh(new T.PlaneGeometry(1.5, 0.9), K.screenMat('kanban', null, 0.85)); kp.position.y = 1.35; kb.add(kp); const kf = K.box(1.6, 1.0, 0.05, K.mat(C.white)); kf.position.set(0, 0.86, -0.03); kb.add(kf); kb.add(K.box(0.07, 0.86, 0.07, K.mat(C.graphite))); place(kb, c.x + 1.4, 0, c.z + 0.6, -0.9); scene.add(kb);
      [[-0.75, 0.75], [0.55, 0.85]].forEach(function (q) { const p = K.person({ rand: R }); place(p, c.x + q[0], 0, c.z + q[1]); K.face(p, c.x, c.z + 0.1); scene.add(p); ambient.push(p); });
    })();
    // Validate: expert bench
    let check;
    (function () {
      const c = cs[2];
      const b = K.bench(2.6); place(b, c.x, 0, c.z - 0.6); scene.add(b);
      const m = K.microscope(); place(m, c.x - 0.6, 0.55, c.z - 0.55); scene.add(m);
      const ex = K.person({ rand: R, coat: true }); place(ex, c.x + 0.9, 0, c.z + 0.3); K.face(ex, c.x, c.z + 0.8); scene.add(ex); ambient.push(ex);
      check = new T.Group(); const ring = K.ring(0.42, 0.05, K.glow(C.tealLight, 2.2)); ring.rotation.x = Math.PI / 2; check.add(ring);
      const tick = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V(-0.2, 0.0, 0), V(-0.05, -0.15, 0), V(0.22, 0.17, 0)], false, 'catmullrom', 0), 20, 0.045, 8), K.glow(C.tealLight, 2.2)); check.add(tick);
      place(check, c.x, 2.3, c.z - 0.2); scene.add(check); hideNow(check);
    })();
    // Deploy: new team
    (function () {
      const c = cs[3];
      [[-0.7, 0], [0.7, 0]].forEach(function (q) { const d = K.desk({ w: 1.1, d: 0.6, screen: 'molecule' }); place(d, c.x + q[0], 0, c.z + 0.1, Math.PI); scene.add(d); });
      [[-0.7, 0.65], [1.25, -0.2]].forEach(function (q) { const p = K.person({ rand: R, shirt: C.teal }); place(p, c.x + q[0], 0, c.z + q[1], Math.PI); scene.add(p); ambient.push(p); });
      const pl = K.planter(); place(pl, c.x - 1.5, 0, c.z - 1.0); scene.add(pl);
    })();
    // Teach: peer circle
    (function () {
      const c = cs[4];
      const scr = new T.Group(); const sp = new T.Mesh(new T.PlaneGeometry(1.4, 0.85), K.screenMat('molecule', null, 0.9)); sp.position.y = 1.35; scr.add(sp); const sf = K.box(1.5, 0.95, 0.05, K.mat(C.graphite)); sf.position.set(0, 0.88, -0.03); scr.add(sf); scr.add(K.box(0.07, 0.88, 0.07, K.mat(C.graphite))); place(scr, c.x - 0.3, 0, c.z - 1.0); scene.add(scr);
      [[-1.1, 0.7], [0.1, 1.0], [1.2, 0.5]].forEach(function (q) { const p = K.person({ rand: R }); place(p, c.x + q[0], 0, c.z + q[1]); K.face(p, c.x - 0.2, c.z - 0.2); scene.add(p); ambient.push(p); });
    })();
    // path
    const pts = [V(-9.6, 0, 0.1)].concat(spots).concat([V(9.6, 0, 0.1)]);
    const curve = new T.CatmullRomCurve3(pts, false, 'centripetal');
    scene.add(K.ribbon(curve, 0.75, K.mat(0xDCE2E7, { roughness: 0.95 }), 200, 0.012));
    const centre = K.ribbon(curve, 0.08, new T.MeshBasicMaterial({ color: 0xFF5A72, toneMapped: false, transparent: true, opacity: 0.55 }), 200, 0.02); scene.add(centre);
    // parameter for each stop
    const us = spots.map(function (sp) { let best = 0, bd = 1e9; for (let i = 0; i <= 600; i++) { const u = i / 600; const d = curve.getPointAt(u).distanceToSquared(sp); if (d < bd) { bd = d; best = u; } } return best; });
    const analyst = K.person({ rand: R, shirt: C.red }); scene.add(analyst);
    const aRing = new T.Group(); aRing.add(K.ring(0.4, 0.04, K.glow(0xFF5A72, 2))); aRing.add(K.glowDisc(0.75, 0xFF2D4B, 0.55)); scene.add(aRing);
    const st = { u: us[0], moving: false, idx: 0 };
    const head = new T.Object3D(); analyst.add(head); head.position.y = 1.75;
    ['1  Learn', '2  Apply', '3  Validate', '4  Deploy', '5  Teach'].forEach(function (n, i) { ctx.label(n, V(cs[i].x, 2.55, cs[i].z - 0.4), { cls: i === 2 ? 'teal' : 'quiet' }); });
    let tl = null, onStep = null;
    function placeAnalyst() { const p = curve.getPointAt(st.u); analyst.position.set(p.x, 0, p.z); aRing.position.set(p.x, 0.03, p.z); }
    placeAnalyst();
    function lightUp(i) { glows.forEach(function (g, k) { tw(g.material, { opacity: k === i ? 0.55 : 0, duration: 0.5 }); }); if (i >= 2) show(check, true); else show(check, false); }
    function go(i, instant) {
      if (tl) tl.kill();
      st.idx = i;
      const target = us[i];
      lightUp(i);
      if (instant || !window.gsap || !(TK.Stage && TK.Stage.motion)) { st.u = target; st.moving = false; placeAnalyst(); K.face(analyst, cs[i].x, cs[i].z); return; }
      const dist = Math.abs(target - st.u) * curve.getLength();
      st.moving = true; st.dir = target >= st.u ? 1 : -1;
      tl = gsap.to(st, { u: target, duration: Math.max(0.4, dist / 2.4), ease: 'power1.inOut', onUpdate: placeAnalyst, onComplete: function () { st.moving = false; K.face(analyst, cs[i].x, cs[i].z); } });
    }
    lightUp(0); K.face(analyst, cs[0].x, cs[0].z);
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0, 0.5, 0.1), radius: 19.5, yaw: 0.0, pitch: 0.64, fov: 30, fit: 1.9 },
      update: function (t) {
        ambient.forEach(function (p) { K.pose(p, t, 0); });
        if (st.moving) { const tg = curve.getTangentAt(Math.max(0.001, Math.min(0.999, st.u))).multiplyScalar(st.dir || 1); analyst.rotation.y = Math.atan2(tg.x, tg.z); K.pose(analyst, t, 1, 8); }
        else K.pose(analyst, t, 0);
        check.rotation.y = t * 0.8;
      },
      api: {
        go: function (i) { go(i, false); },
        play: function (cb) {
          if (!window.gsap) { go(4, true); return; }
          let i = 0; st.u = us[0]; placeAnalyst();
          (function next() { go(i, false); if (cb) cb(i); i++; if (i < 5) setTimeout(next, 2600); })();
        }
      }
    };
  };

  /* =====================================================================
     7. Two ways to grow a team
     ===================================================================== */
  S.team = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 9, fov: 30 });
    const scene = s.scene;
    const R = K.rng(17);
    scene.add(K.plinth(14, 10, { r: 1.0 }));
    const rug = K.tile(6.4, 4.6, 0xCFD9E1, 0.8); rug.position.set(0, 0, -0.6); scene.add(rug);
    const table = K.table(3.0, 1.3, C.wood); place(table, 0, 0, -0.6); scene.add(table);
    const leader = K.person({ rand: R, shirt: C.teal }); place(leader, 0, 0, 2.2); K.face(leader, 0, -0.6); scene.add(leader);
    const lRing = K.ring(0.42, 0.03, K.glow(C.tealLight, 1.8)); lRing.position.set(0, 0.03, 2.2); scene.add(lRing);
    const lHead = new T.Object3D(); lHead.position.set(0, 1.8, 2.2); scene.add(lHead);
    ctx.label('Leader', lHead, { cls: 'teal' });
    const corePos = [[-2.1, -0.6], [-1.1, -1.85], [1.1, -1.85], [2.1, -0.6], [-1.1, 0.65], [1.1, 0.65]];
    const extraPos = [[-3.9, -2.9], [-1.9, -3.6], [0.1, -3.8], [2.1, -3.6], [4.0, -2.9], [-4.6, 0.6], [4.6, 0.6], [-3.6, 2.4], [3.6, 2.4]];
    const core = corePos.map(function (q) {
      const g = new T.Group(); place(g, q[0], 0, q[1]); scene.add(g);
      const p = K.person({ rand: R }); g.add(p);
      const lv = new T.Group(); g.add(lv);
      const rings = [0, 1, 2].map(function (k) { const r = K.ring(0.36 + k * 0.02, 0.03, K.glow(C.tealLight, 1.6)); r.position.y = 0.03 + k * 0.07; lv.add(r); return r; });
      K.face(g, 0, -0.6);
      return { g: g, p: p, rings: rings };
    });
    const succ = core[1];
    const sRing = K.ring(0.55, 0.035, K.glow(0xFF5A72, 2)); sRing.position.y = 0.05; succ.g.add(sRing);
    const sGlow = K.glowDisc(0.9, 0xFF2D4B, 0.55); succ.g.add(sGlow);
    const sHead = new T.Object3D(); sHead.position.y = 2.0; succ.g.add(sHead);
    let mode = 'develop';
    ctx.label('Successor ready', sHead, { cls: 'red', show: function () { return mode === 'develop'; } });
    const extras = extraPos.map(function (q) { const p = K.person({ rand: R }); place(p, q[0], 0, q[1]); K.face(p, 0, -0.6); scene.add(p); hideNow(p); return p; });
    // coaching arcs
    const arcs = core.map(function (c) { return K.arc(V(0, 1.3, 2.2), V(c.g.position.x, 1.35, c.g.position.z), 0.9); });
    const arcMeshes = arcs.map(function (a) { const m = new T.Mesh(new T.TubeGeometry(a, 40, 0.022, 6), new T.MeshBasicMaterial({ color: 0x5FE3D2, transparent: true, opacity: 0.55, toneMapped: false })); scene.add(m); return m; });
    const beads = K.flow(arcs, 3, 0x9FFFF0, 0.06, 0.35); scene.add(beads);
    // coordination web
    const all = core.map(function (c) { return c.g.position; }).concat(extras.map(function (p) { return p.position; }));
    const webPos = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) webPos.push(all[i].x, 1.25, all[i].z, all[j].x, 1.25, all[j].z);
    const webGeo = new T.BufferGeometry(); webGeo.setAttribute('position', new T.Float32BufferAttribute(webPos, 3));
    const webMat = new T.LineBasicMaterial({ color: 0xC8102E, transparent: true, opacity: 0 });
    const web = new T.LineSegments(webGeo, webMat); scene.add(web);
    function setMode(m) {
      mode = m;
      const dev = m === 'develop';
      extras.forEach(function (p, i) { setTimeout(function () { show(p, !dev, 0.5); }, i * 60); });
      core.forEach(function (c, i) {
        c.rings.forEach(function (r, k) { setTimeout(function () { show(r, dev, 0.5); }, dev ? 300 + i * 80 + k * 160 : 0); });
        tw(c.p.position, { y: dev ? 0.2 : 0, duration: 0.8, ease: 'power2.out', delay: dev ? 0.4 + i * 0.08 : 0 });
      });
      show(sRing, dev); show(sGlow, dev);
      arcMeshes.forEach(function (a) { show(a, dev, 0.5); });
      beads.visible = dev;
      tw(webMat, { opacity: dev ? 0 : 0.32, duration: 0.8 });
    }
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0, 0.6, -0.4), radius: 14, yaw: 0.12, pitch: 0.7, fov: 30, fit: 1.7 },
      update: function (t) {
        K.pose(leader, t, 0);
        core.forEach(function (c) { K.pose(c.p, t, 0); });
        extras.forEach(function (p) { if (p.visible) K.pose(p, t, 0); });
        if (beads.visible) beads.userData.update(t);
        sRing.rotation.y = t;
      },
      api: { setMode: setMode }
    };
  };

  /* =====================================================================
     8. The coordination tax: a network of teams
     ===================================================================== */
  S.network = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 10, fov: 30 });
    const scene = s.scene;
    scene.add(K.disc(8.8, { top: C.floor }));
    const MAX = 40, MAXP = MAX * (MAX - 1) / 2;
    const podGeo = new T.CylinderGeometry(0.5, 0.55, 0.16, 6); podGeo.translate(0, 0.08, 0);
    const pods = new T.InstancedMesh(podGeo, K.mat(0xFFFFFF, { roughness: 0.45 }), MAX); pods.castShadow = true; pods.receiveShadow = true; scene.add(pods);
    const bodyGeo = new T.CapsuleGeometry(0.1, 0.22, 4, 10); bodyGeo.translate(0, 0.38, 0);
    const headGeo = new T.SphereGeometry(0.085, 14, 10); headGeo.translate(0, 0.66, 0);
    const bodies = new T.InstancedMesh(bodyGeo, K.mat(0xFFFFFF, { roughness: 0.8 }), MAX * 2); bodies.castShadow = true; scene.add(bodies);
    const heads = new T.InstancedMesh(headGeo, K.mat(0xFFFFFF, { roughness: 0.6 }), MAX * 2); heads.castShadow = true; scene.add(heads);
    const shirts = [0x2E4A66, 0x55606C, 0x3E6E8E, 0x6B7F6E, 0x8C99A6, 0x34495E, 0x0D7A70];
    const skins = [0xF1C9A8, 0xE0AE88, 0xC68C64, 0x9C6644, 0x704A33];
    const col = new T.Color();
    for (let i = 0; i < MAX * 2; i++) { bodies.setColorAt(i, col.set(shirts[i % shirts.length])); heads.setColorAt(i, col.set(skins[(i * 3) % skins.length])); }
    for (let i = 0; i < MAX; i++) pods.setColorAt(i, col.set(i % 3 === 0 ? 0xA9C9C3 : 0xB9C6D1));
    const pairGeo = new T.BufferGeometry(); const pairArr = new Float32Array(MAXP * 6); pairGeo.setAttribute('position', new T.BufferAttribute(pairArr, 3));
    const pairMat = new T.LineBasicMaterial({ color: 0xC8102E, transparent: true, opacity: 0.3 });
    const pairLines = new T.LineSegments(pairGeo, pairMat); pairLines.name="status-links"; pairLines.frustumCulled = false; scene.add(pairLines);
    const keepGeo = new T.BufferGeometry(); const keepArr = new Float32Array(MAXP * 6); keepGeo.setAttribute('position', new T.BufferAttribute(keepArr, 3));
    const keepMat = new T.LineBasicMaterial({ color: 0x0D7A70, transparent: true, opacity: 0 });
    const keepLines = new T.LineSegments(keepGeo, keepMat); keepLines.name="essential-links"; keepLines.frustumCulled = false; scene.add(keepLines);
    const spokeGeo = new T.BufferGeometry(); const spokeArr = new Float32Array(MAX * 6); spokeGeo.setAttribute('position', new T.BufferAttribute(spokeArr, 3));
    const spokeMat = new T.LineBasicMaterial({ color: 0x2FB3A3, transparent: true, opacity: 0 });
    const spokes = new T.LineSegments(spokeGeo, spokeMat); spokes.name="register-links"; spokes.frustumCulled = false; scene.add(spokes);
    // the shared mission register
    const pillar = new T.Group(); scene.add(pillar);
    pillar.add(K.cyl(0.75, 0.85, 0.3, K.mat(C.white, { roughness: 0.4 }), 48));
    const col1 = K.cyl(0.42, 0.42, 2.2, K.mat(C.white, { roughness: 0.3 }), 48); pillar.add(col1);
    [0.7, 1.3, 1.9].forEach(function (y) { const r = K.ring(0.5, 0.04, K.glow(C.tealLight, 2)); r.position.y = y; pillar.add(r); });
    const cap = K.sphere(0.32, K.glow(C.tealLight, 2.4)); cap.position.y = 2.45; pillar.add(cap);
    pillar.add(K.glowDisc(1.8, 0x2FD3C0, 0.6));
    hideNow(pillar);
    let mode = 'all', n = 20, keep = 0.15, density = .35;
    ctx.label('Mission register', V(0, 3.2, 0), { cls: 'teal', show: function () { return mode === 'reg'; } });
    const P = [];
    const beads = new T.InstancedMesh(new T.SphereGeometry(0.07, 10, 8), new T.MeshBasicMaterial({ color: 0xFFFFFF, toneMapped: false }), 70);
    beads.frustumCulled = false; scene.add(beads);
    let beadPaths = [];
    const tmp = new T.Object3D();
    function layout() {
      P.length = 0;
      if (n <= 14) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.3; P.push(V(Math.cos(a) * 5.5, 0, Math.sin(a) * 5.5)); } }
      else { const inner = Math.floor(n * 0.38), outer = n - inner; for (let i = 0; i < inner; i++) { const a = i / inner * Math.PI * 2 + 0.2; P.push(V(Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6)); } for (let i = 0; i < outer; i++) { const a = i / outer * Math.PI * 2; P.push(V(Math.cos(a) * 6.8, 0, Math.sin(a) * 6.8)); } }
      for (let i = 0; i < MAX; i++) {
        if (i < n) { tmp.position.copy(P[i]); tmp.scale.setScalar(1); tmp.rotation.set(0, i * 0.4, 0); } else { tmp.position.set(0, -20, 0); tmp.scale.setScalar(0.001); }
        tmp.updateMatrix(); pods.setMatrixAt(i, tmp.matrix);
        for (let k = 0; k < 2; k++) {
          if (i < n) { tmp.position.set(P[i].x + (k ? 0.17 : -0.17), 0.16, P[i].z + (k ? 0.08 : -0.06)); tmp.scale.setScalar(1); } else { tmp.position.set(0, -20, 0); tmp.scale.setScalar(0.001); }
          tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); bodies.setMatrixAt(i * 2 + k, tmp.matrix); heads.setMatrixAt(i * 2 + k, tmp.matrix);
        }
      }
      pods.instanceMatrix.needsUpdate = bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
      const pairs = [];
      for (let i=0;i<n;i++) for(let j=i+1;j<n;j++) pairs.push([i,j,P[i].distanceToSquared(P[j])]);
      pairs.sort((a,b)=>a[2]-b[2]);
      const k=Math.round(pairs.length*keep),total=Math.round(pairs.length*density),extra=Math.max(0,total-k);
      // Retain nearest disjoint dependencies first; spread status links across teams.
      const chosen=[],used=new Set();for(const p of pairs){if(chosen.length>=k)break;if(!used.has(p[0])&&!used.has(p[1])){chosen.push(p);used.add(p[0]);used.add(p[1]);}}
      for(const p of pairs){if(chosen.length>=k)break;if(!chosen.includes(p))chosen.push(p)}
      const rest=pairs.filter(p=>!chosen.includes(p)).sort((a,b)=>b[2]-a[2]);pairs.splice(0,pairs.length,...chosen,...rest);
      const write=(arr,idx,pair)=>{const a=P[pair[0]],b=P[pair[1]];arr.set([a.x,.75,a.z,b.x,.75,b.z],idx*6)};
      for(let q=0;q<k;q++)write(keepArr,q,pairs[q]);
      for(let q=0;q<extra;q++)write(pairArr,q,pairs[k+q]);
      pairGeo.attributes.position.needsUpdate=true;pairGeo.setDrawRange(0,extra*2);
      keepGeo.attributes.position.needsUpdate=true;keepGeo.setDrawRange(0,k*2);
      for(let i=0;i<n;i++)spokeArr.set([P[i].x,.75,P[i].z,0,1.3,0],i*6);
      spokeGeo.attributes.position.needsUpdate=true;spokeGeo.setDrawRange(0,n*2);
      beadPaths=[];const pr=K.rng(n*13+k),available=pairs.slice(k,total);
      for(let b=0;b<70;b++){
        if(mode==='all'&&available.length){const p=available[b%available.length];beadPaths.push([P[p[0]],P[p[1]],pr()]);}
        else if(mode==='reg'){const i=b%n;beadPaths.push(b%2?[P[i],V(0,1.3,0),pr()]:[V(0,1.3,0),P[i],pr()]);}
      }
      pairMat.opacity=mode==='all'?.65:0;keepMat.opacity=.85;
    }
    function apply(m) {
      const reg = m === 'reg';
      show(pillar, reg, 0.7);
      tw(keepMat, { opacity: 0.85, duration: 0.6 });
      tw(spokeMat, { opacity: reg ? 0.6 : 0, duration: 0.6 });
      beads.material.color.set(reg ? 0x7FF0E0 : 0xFF6F84);
    }
    layout(); apply(mode);
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0, 0.0, 0.4), radius: 25.5, yaw: 0.3, pitch: 0.86, fov: 30, fit: 1.7 },
      update: function (t) {
        for (let b = 0; b < 70; b++) {
          const bp = beadPaths[b];
          if (!bp || (mode === 'reg' && b >= Math.min(70, n * 2))) { tmp.position.set(0, -20, 0); tmp.scale.setScalar(0.001); }
          else { const u = (t * 0.35 + bp[2]) % 1; tmp.position.lerpVectors(bp[0], bp[1], u); if (mode === 'all') tmp.position.y = 0.75; else tmp.position.y = lerp(bp[0].y || 0.75, bp[1].y || 0.75, u) || 0.75; tmp.scale.setScalar(1); }
          tmp.updateMatrix(); beads.setMatrixAt(b, tmp.matrix);
        }
        beads.instanceMatrix.needsUpdate = true;
        pillar.rotation.y = t * 0.4;
      },
      api: {
        set: function (o) {
          const relayout = o.n !== n || o.keep !== keep || o.mode !== mode || o.density !== density;
          const modeChanged = o.mode !== mode;
          n = o.n; keep = o.keep; mode = o.mode; density = o.density == null ? density : o.density;
          if (relayout) layout();
          if (modeChanged) apply(mode);
          else { keepMat.opacity = 0.85; }
        }
      }
    };
  };

  /* =====================================================================
     9. Own the recipe: partner delivery and the acceptance gate
     ===================================================================== */
  S.ownership = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 11, fov: 30 });
    const scene = s.scene;
    const R = K.rng(53);
    scene.add(K.plinth(19, 9.6, { r: 1.0 }));
    const tk = K.building({ w: 4.4, d: 3.2, floors: 2, accent: C.red }); place(tk, -6.6, 0, -2.2); scene.add(tk);
    const pr = K.building({ w: 4.2, d: 3.2, floors: 2, tint: 0xC9D3DF, slab: 0xDCE2E8, core: 0xC4CDD6 }); place(pr, 6.6, 0, -2.2); scene.add(pr);
    const court = K.tile(4.2, 3.0, 0xF4EEEF, 0.4); court.position.set(-6.6, 0, 1.9); scene.add(court);
    // the recipe
    const ped = K.cyl(0.5, 0.6, 0.85, K.mat(C.white, { roughness: 0.35 }), 40); place(ped, -7.3, 0, 2.2); scene.add(ped);
    const book = new T.Group(); book.add(K.rbox(0.95, 0.09, 0.7, 0.05, K.glow(C.red, 1.2))); const pg = K.box(0.82, 0.025, 0.58, K.glow(0xFFE3E7, 1.0)); pg.position.y = 0.09; book.add(pg); book.rotation.x = -0.35; place(book, -7.3, 0.95, 2.2); scene.add(book);
    const bGlow = K.glowDisc(1.2, 0xFF2D4B, 0.55); bGlow.position.set(-7.3, 0.04, 2.2); scene.add(bGlow);
    const tp = [K.person({ rand: R, coat: true }), K.person({ rand: R, shirt: C.red })];
    place(tp[0], -6.4, 0, 2.6); K.face(tp[0], -7.3, 2.2); scene.add(tp[0]);
    place(tp[1], -7.9, 0, 3.0); K.face(tp[1], -7.3, 2.2); scene.add(tp[1]);
    const pp = [K.person({ rand: R, shirt: 0x5D6B7A }), K.person({ rand: R, shirt: 0x5D6B7A })];
    place(pp[0], 5.2, 0, 0.0, -1.2); scene.add(pp[0]); place(pp[1], 7.6, 0, 0.4, -2.4); scene.add(pp[1]);
    // belts
    const beltM = K.mat(0x2B3541, { roughness: 0.55 }), railM = K.metal(0xC9D1D8);
    function belt(x1, x2, z) {
      const g = new T.Group(); const len = Math.abs(x2 - x1);
      const b = K.rbox(len, 0.32, 0.75, 0.06, beltM); b.position.set((x1 + x2) / 2, 0.08, z); g.add(b);
      [-1, 1].forEach(function (sd) { const r = K.box(len, 0.06, 0.05, z>1.5?K.mat(0xB32C45):railM); r.position.set((x1 + x2) / 2, 0.42, z + sd * 0.4); g.add(r); });
      for (let x = Math.min(x1, x2) + 0.3; x < Math.max(x1, x2); x += 0.9) { const l = K.box(0.06, 0.1, 0.7, railM); l.position.set(x, 0, z); g.add(l); }
      scene.add(g);
    }
    const zMain = 0.7, zBack = 2.3, xGate = -2.6;
    belt(4.6, -4.4, zMain); belt(4.6, xGate - 0.4, zBack);
    const chute = K.rbox(0.75, 0.3, 1.6, 0.06, beltM); chute.position.set(xGate - 0.1, 0.08, (zMain + zBack) / 2); scene.add(chute);
    const gate = K.arch(1.1, 1.55, K.mat(C.white, { roughness: 0.4 }), 0.3); place(gate, xGate, 0, zMain, Math.PI / 2); scene.add(gate);
    const scan = new T.Mesh(new T.PlaneGeometry(1.0, 1.1), new T.MeshBasicMaterial({ color: 0x2FD3C0, transparent: true, opacity: 0.22, side: T.DoubleSide, toneMapped: false, depthWrite: false })); scan.rotation.y = Math.PI / 2; scan.position.set(xGate, 1.0, zMain); scene.add(scan);
    const lamp = K.sphere(0.13, new T.MeshBasicMaterial({ color: 0x9AA6B2, toneMapped: false })); lamp.position.set(xGate, 1.95, zMain); scene.add(lamp);
    // packages
    const pkgM = K.mat(0xD7B48C, { roughness: 0.85 }), pkgBad = K.mat(0xD9475E, { roughness: 0.6 }), tape = K.mat(0xF2F4F6, { roughness: 0.6 });
    const pkgs = [];
    for (let i = 0; i < 18; i++) {
      const g = new T.Group(); g.name=`delivery-${i}`; const b = K.rbox(0.42, 0.34, 0.42, 0.05, pkgM); g.add(b); const t2 = K.box(0.44, 0.02, 0.1, tape); t2.position.y = 0.33; g.add(t2);
      g.visible = false; scene.add(g); pkgs.push({ g: g, box: b, state: 'idle', x: 0, z: 0 });
    }
    let owned = false, rates = [0.30, 0.10], volume=20, acc = 0, spawnT = 0, lampT = -9, lampOK = true;
    ctx.label('Takeda: accepted work & knowledge', V(-6.6, 2.75, -2.2));
    ctx.label('Internal requirements', V(-7.3, 1.75, 2.2), { cls: 'red' });
    ctx.label('Partner: delivers work', V(6.6, 2.75, -2.2));
    ctx.label('Acceptance gate', V(xGate, 2.45, zMain), { cls: 'teal' });
    ctx.label('Rework loop', V(1.4, 0.9, zBack), { cls: 'red' });
    const speed = 1.7;
    return {
      scene: scene, camera: s.camera,
      view: { target: V(-0.4, 0.9, -0.3), radius: 20.5, yaw: 0.0, pitch: 0.6, fov: 30, fit: 2.0 },
      update: function (t, dt) {
        tp.concat(pp).forEach(function (p) { K.pose(p, t, 0); });
        book.position.y = 0.95 + Math.sin(t * 1.5) * 0.04;
        if (dt > 0) {
          spawnT -= dt;
          if (spawnT <= 0) { spawnT = Math.max(.42,1.65*Math.sqrt(20/volume)); const free = pkgs.find(function (p) { return p.state === 'idle'; }); if (free) { free.state = 'in'; free.x = 4.4; free.z = zMain; free.box.material = pkgM; free.g.visible = true; free.g.scale.setScalar(1); } }
          pkgs.forEach(function (p) {
            if (p.state === 'in') { p.x -= speed * dt; if (p.x <= xGate + 0.05) { acc += owned ? rates[1] : rates[0]; if (acc >= 1) { acc -= 1; p.state = 'reject'; p.box.material = pkgBad; lampOK = false; } else { p.state = 'accept'; lampOK = true; } lampT = t; } }
            else if (p.state === 'accept') { p.x -= speed * dt; if (p.x < -4.0) { const k = Math.max(0.001, 1 - (-4.0 - p.x) * 1.6); p.g.scale.setScalar(k); if (k <= 0.01) { p.state = 'idle'; p.g.visible = false; } } }
            else if (p.state === 'reject') { p.z += speed * dt * 1.2; if (p.z >= zBack) { p.z = zBack; p.state = 'back'; } }
            else if (p.state === 'back') { p.x += speed * dt; if (p.x > 4.2) { const k = Math.max(0.001, 1 - (p.x - 4.2) * 2); p.g.scale.setScalar(k); if (k <= 0.02) { p.state = 'idle'; p.g.visible = false; } } }
            if (p.state !== 'idle') p.g.position.set(p.x, 0.4, p.z);
          });
        }
        const since = t - lampT;
        lamp.material.color.set(since < 0.6 ? (lampOK ? 0x3BE3C9 : 0xFF3355) : 0x9AA6B2);
        scan.material.opacity = 0.16 + 0.1 * Math.sin(t * 6);
      },
      api: {
        setMode: function (o) { this.setScenario(!!o,volume); },
        setRates: function (bad, good) { rates = [bad, good]; },
        setScenario: function (o,n) {const changed=owned!==!!o||volume!==n;owned=!!o;volume=n;if(changed||!pkgs.some(p=>p.g.visible)){acc=0;spawnT=0;lampT=-9;pkgs.forEach(p=>{p.state='idle';p.g.visible=false;p.g.scale.setScalar(1)});const samples=10,returns=owned?1:3;for(let i=0;i<samples;i++){const p=pkgs[i];p.g.visible=true;p.state=i<returns?'back':'in';p.box.material=i<returns?pkgBad:pkgM;p.z=i<returns?zBack:zMain;p.x=i<returns?xGate+.5+i*1.5:xGate+.45+(i-returns)*(6.5/Math.max(1,samples-returns-1));p.x=Math.min(4.45,p.x);p.g.position.set(p.x,.4,p.z);}}}

      }
    };
  };

  /* =====================================================================
     11. Evidence gates
     ===================================================================== */
  S.gates = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 11, fov: 30 });
    const scene = s.scene;
    const R = K.rng(61);
    scene.add(K.plinth(22, 7.4, { r: 1.0 }));
    const track = new T.CatmullRomCurve3([V(-9.8, 0, 0), V(6.2, 0, 0)]);
    scene.add(K.ribbon(track, 1.3, K.mat(0xCBD4DC, { roughness: 0.95 }), 10, 0.012));
    scene.add(K.ribbon(track, 0.07, new T.MeshBasicMaterial({ color: 0x2FD3C0, toneMapped: false, transparent: true, opacity: 0.7 }), 10, 0.02));
    const gx = [-6.6, -3.0, 0.6, 4.2], names = ['Baseline', 'Test', 'Validate', 'Decide'];
    const panels = gx.map(function (x, i) {
      const a = K.arch(1.9, 2.0, K.mat(0x3A4654, { roughness: 0.45, metalness: 0.2 }), 0.34); place(a, x, 0, 0, 0); scene.add(a);
      const m = new T.MeshStandardMaterial({ color: 0x223040, emissive: 0x8FA0B0, emissiveIntensity: 0.5, roughness: 0.3 });
      const p = K.box(1.7, 0.2, 0.4, m); p.position.set(x, 2.28, 0); scene.add(p);
      const glow = K.glowDisc(1.5, 0x2FD3C0, 0); glow.position.set(x, 0.03, 0); scene.add(glow);
      ctx.label((i + 1) + '  ' + names[i], V(x, 3.0, 0), { cls: 'quiet' });
      const rv = K.person({ rand: R, coat: i === 2 }); place(rv, x + 0.4, 0, -1.4); K.face(rv, x, 0); scene.add(rv);
      return { m: m, glow: glow, rv: rv };
    });
    // more missions
    const pads = [V(7.8, 0, -1.9), V(8.9, 0, 0), V(7.8, 0, 1.9)].map(function (p, i) {
      const g = new T.Group(); place(g, p.x, 0, p.z); scene.add(g);
      const base = K.cyl(0.7, 0.75, 0.18, K.mat(C.white, { roughness: 0.4 }), 6); g.add(base);
      const gl = K.glowDisc(1.2, 0x2FD3C0, 0); gl.position.y = 0.2; g.add(gl);
      [-0.22, 0.22].forEach(function (dx) { const pp = K.person({ rand: R, scale: 0.75 }); pp.position.set(dx, 0.18, 0); g.add(pp); });
      return { g: g, gl: gl };
    });
    const barrier = K.rbox(0.3, 1.6, 1.6, 0.08, new T.MeshPhysicalMaterial({ color: 0xE0344F, roughness: 0.2, transparent: true, opacity: 0.85, clearcoat: 1 }));
    barrier.position.set(3.55, 0, -0.8); barrier.rotation.y = 0; scene.add(barrier); hideNow(barrier);
    const loop = new T.CatmullRomCurve3([V(4.0, 0.45, 0), V(3.2, 0.45, 1.9), V(0.6, 0.45, 2.4), V(-2.0, 0.45, 1.9), V(-3.0, 0.45, 0)]);
    const loopMesh = new T.Mesh(new T.TubeGeometry(loop, 80, 0.05, 8), new T.MeshBasicMaterial({ color: 0xF2A93B, transparent: true, opacity: 0, toneMapped: false })); scene.add(loopMesh);
    const capsule = new T.Group();
    const pill = new T.Mesh(new T.CapsuleGeometry(0.26, 0.55, 8, 20), new T.MeshBasicMaterial({ color: 0x9FFFF0, toneMapped: false })); pill.rotation.z = Math.PI / 2; capsule.add(pill);
    const cg = K.glowDisc(0.9, 0x2FD3C0, 0.8); cg.position.y = -0.4; capsule.add(cg);
    scene.add(capsule);
    let decision = 'scale';
    ctx.label('More missions', V(8.4, 1.8, 0), { cls: 'teal', show: function () { return decision === 'scale'; } });
    ctx.label('Refine and re-test', V(0.6, 1.2, 2.4), { cls: 'amber', show: function () { return decision === 'refine'; } });
    ctx.label('Stop and redesign', V(3.55, 2.0, -0.8), { cls: 'red', show: function () { return decision === 'stop'; } });
    const colGreen = 0x2FD3C0, colAmber = 0xF2A93B, colRed = 0xFF3355, colIdle = 0x8FA0B0;
    function decide(d) {
      decision = d;
      show(barrier, d === 'stop');
      tw(loopMesh.material, { opacity: d === 'refine' ? 0.85 : 0, duration: 0.5 });
    }
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0.0, 0.7, 0.2), radius: 19.5, yaw: 0.22, pitch: 0.52, fov: 30, fit: 1.9 },
      update: function (t) {
        panels.forEach(function (p) { K.pose(p.rv, t, 0); });
        const L = 7.5, sN = (t % L) / L;
        let x = -9.2, z = 0, col = colGreen, finalCol = colGreen, reached = -1;
        if (decision === 'scale') { x = lerp(-9.2, 8.9, ease(clamp01(sN / 0.85))); }
        else if (decision === 'refine') {
          if (sN < 0.5) x = lerp(-9.2, 4.0, ease(sN / 0.5));
          else if (sN < 0.9) { const p = loop.getPointAt(ease((sN - 0.5) / 0.4)); x = p.x; z = p.z; col = colAmber; }
          else { x = -3.0; col = colAmber; }
          finalCol = colAmber;
        } else {
          x = lerp(-9.2, 3.0, 1 - Math.pow(1 - clamp01(sN / 0.55), 3));
          if (sN > 0.55) col = colRed;
          finalCol = colRed;
        }
        capsule.position.set(x, 0.45, z);
        pill.material.color.set(col === colGreen ? 0x9FFFF0 : col === colAmber ? 0xFFD08A : 0xFF8A9A);
        cg.material.color.set(col);
        panels.forEach(function (p, i) {
          const passed = decision === 'refine' && sN >= 0.5 ? i <= 3 : x >= gx[i] - 0.2;
          let c = colIdle, e = 0.5;
          if (i === 3 && (x >= gx[3] - 0.8 || (decision === 'refine' && sN >= 0.5) || (decision === 'stop' && sN > 0.5))) { c = finalCol; e = 1.6; }
          else if (passed) { c = colGreen; e = 1.3; }
          p.m.emissive.set(c); p.m.emissiveIntensity = e;
          p.glow.material.opacity = passed || (i === 3 && c !== colIdle) ? 0.35 : 0; p.glow.material.color.set(c);
        });
        pads.forEach(function (pd, i) { pd.gl.material.opacity = decision === 'scale' && x > 6.6 + i * 0.3 ? 0.6 : 0; });
        if (barrier.visible) barrier.position.x = 3.55;
      },
      api: { setDecision: decide }
    };
  };

  /* =====================================================================
     12. The capability loop
     ===================================================================== */
  S.flywheel = function (ctx) {
    const K = TK.K, C = K.C;
    const s = setup({ size: 10, fov: 30 });
    const scene = s.scene;
    const R = K.rng(3);
    scene.add(K.disc(8.4, { top: C.floor }));
    const RR = 5.2;
    const track = K.ring(RR, 0.16, K.mat(C.white, { roughness: 0.35 }), 128); track.position.y = 0.16; scene.add(track);
    const inner = K.ring(RR, 0.035, K.glow(C.tealLight, 1.6), 128); inner.position.y = 0.33; scene.add(inner);
    // centre: patient, trust, reputation, business
    const rings = [[2.4, 0.12, 0xE6EBEE], [1.85, 0.26, 0xF2F4F6], [1.3, 0.4, 0xFFFFFF], [0.8, 0.56, C.red]];
    rings.forEach(function (r) { const m = K.cyl(r[0], r[0], r[1], K.mat(r[2], { roughness: r[2] === C.red ? 0.3 : 0.5 }), 64); scene.add(m); });
    const heartShape = new T.Shape();
    heartShape.moveTo(0, 0.28);
    heartShape.bezierCurveTo(0, 0.62, -0.54, 0.78, -0.86, 0.42);
    heartShape.bezierCurveTo(-1.18, 0.05, -1.00, -0.42, -0.60, -0.70);
    heartShape.bezierCurveTo(-0.26, -0.94, -0.02, -0.70, 0, -0.46);
    heartShape.bezierCurveTo(0.02, -0.70, 0.26, -0.94, 0.60, -0.70);
    heartShape.bezierCurveTo(1.00, -0.42, 1.18, 0.05, 0.86, 0.42);
    heartShape.bezierCurveTo(0.54, 0.78, 0, 0.62, 0, 0.28);
    const heartGeo = new T.ExtrudeGeometry(heartShape, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 28 });
    heartGeo.center();
    const heart = new T.Mesh(heartGeo, new T.MeshPhysicalMaterial({ color: C.red, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.18 }));
    heart.scale.set(0.65,0.65,0.65); heart.rotation.x = -0.22; heart.position.y = 1.18; heart.castShadow = true; heart.receiveShadow = true; scene.add(heart);
    const heartHalo = K.glowDisc(1.55, 0xFF3355, 0.52); heartHalo.position.y = 0.02; scene.add(heartHalo);
    scene.add(K.glowDisc(2.6, 0xFF2D4B, 0.24));
    ctx.label('Patient, trust, reputation, business', V(0, 1.85, 0), { cls: 'red' });
    const names = ['Priorities', 'Critical missions', 'Find existing capability', 'Redeploy, develop, hire or partner', 'Clear ownership', 'Execute together', 'Measure outcomes', 'Share, grow, reinvest'];
    const stations = [];
    for (let k = 0; k < 8; k++) {
      const a = -Math.PI / 2 + k * Math.PI * 2 / 8;
      const x = Math.cos(a) * RR, z = Math.sin(a) * RR;
      const g = new T.Group(); place(g, x, 0, z); scene.add(g);
      g.add(K.rbox(1.25, 0.42, 1.25, 0.16, K.mat(C.white, { roughness: 0.35 })));
      const bandM = new T.MeshStandardMaterial({ color: 0x1D2B38, emissive: 0x2FB3A3, emissiveIntensity: 0.4, roughness: 0.4 });
      const band = K.rbox(1.28, 0.08, 1.28, 0.16, bandM); band.position.y = 0.3; g.add(band);
      const icon = new T.Group(); icon.position.y = 0.42; g.add(icon);
      const red = K.mat(C.red, { roughness: 0.35 }), teal = K.mat(C.teal, { roughness: 0.4 }), wht = K.mat(C.white, { roughness: 0.4 });
      if (k === 0) { icon.add(K.cyl(0.03, 0.03, 1.0, K.metal())); const f = K.box(0.45, 0.28, 0.03, red); f.position.set(0.22, 0.68, 0); icon.add(f); }
      if (k === 1) { [0.36, 0.24, 0.12].forEach(function (r, i) { const t = new T.Mesh(new T.TorusGeometry(r, 0.04, 10, 40), i % 2 ? wht : red); t.position.y = 0.5; t.castShadow = true; icon.add(t); }); const st = K.box(0.05, 0.14, 0.05, K.mat(C.graphite)); icon.add(st); }
      if (k === 2) { const t = new T.Mesh(new T.TorusGeometry(0.24, 0.05, 12, 40), teal); t.position.y = 0.6; t.castShadow = true; icon.add(t); const l = new T.Mesh(new T.CircleGeometry(0.22, 32), K.glass(0xCFEAF0)); l.position.y = 0.6; icon.add(l); const h = K.cyl(0.04, 0.04, 0.35, K.mat(C.graphite)); h.rotation.z = 0.7; h.position.set(0.18, 0.2, 0); icon.add(h); }
      if (k === 3) { [-0.25, 0, 0.25].forEach(function (dx, i) { const p = K.person({ rand: R, scale: 0.5, shirt: [C.teal, C.amber, C.red][i] }); p.position.x = dx; icon.add(p); }); }
      if (k === 4) { icon.add(K.cyl(0.18, 0.22, 0.3, wht, 24)); const cube = K.rbox(0.28, 0.28, 0.28, 0.05, K.glow(C.red, 0.9)); cube.position.y = 0.32; icon.add(cube); }
      if (k === 5) { const gear = new T.Group(); gear.add(K.cyl(0.26, 0.26, 0.12, teal, 24)); for (let i = 0; i < 8; i++) { const th = K.box(0.1, 0.12, 0.12, teal); const ga = i * Math.PI / 4; th.position.set(Math.cos(ga) * 0.3, 0, Math.sin(ga) * 0.3); th.rotation.y = -ga; gear.add(th); } gear.rotation.x = Math.PI / 2; gear.position.y = 0.45; icon.add(gear); icon.userData.spin = gear; }
      if (k === 6) { [0.2, 0.38, 0.58].forEach(function (h, i) { const b = K.box(0.14, h, 0.14, i === 2 ? red : teal); b.position.x = -0.2 + i * 0.2; icon.add(b); }); }
      if (k === 7) { const l1 = K.box(0.34, 0.03, 0.42, wht); l1.rotation.z = 0.3; l1.position.set(-0.16, 0.12, 0); icon.add(l1); const l2 = l1.clone(); l2.rotation.z = -0.3; l2.position.x = 0.16; icon.add(l2); const gl = K.sphere(0.1, K.glow(C.tealLight, 1.8)); gl.position.y = 0.45; icon.add(gl); }
      K.face(g, 0, 0);
      const lab = V(Math.cos(a) * (RR + 0.2), 1.7, Math.sin(a) * (RR + 0.2));
      ctx.label(names[k], lab, { cls: 'quiet' });
      stations.push({ g: g, band: bandM, a: a, icon: icon });
    }
    const orb = K.sphere(0.24, new T.MeshBasicMaterial({ color: 0xB9FFF4, toneMapped: false })); scene.add(orb);
    const og = K.glowDisc(1.0, 0x2FD3C0, 0.9); scene.add(og);
    const trail = new T.CatmullRomCurve3(Array.from({ length: 64 }, function (_, i) { const a = i / 64 * Math.PI * 2; return V(Math.cos(a) * RR, 0.45, Math.sin(a) * RR); }), true);
    const walkers = [];
    for (let i = 0; i < 7; i++) { const p = K.person({ rand: R }); scene.add(p); walkers.push({ p: p, a: i / 7 * Math.PI * 2, sp: 0.07 + R() * 0.04 }); }
    return {
      scene: scene, camera: s.camera,
      view: { target: V(0, 0.4, 0.3), radius: 22, yaw: 0.0, pitch: 0.86, fov: 30, fit: 1.15 },
      update: function (t) {
        const oa = -Math.PI / 2 + t * 0.38;
        orb.position.set(Math.cos(oa) * RR, 0.62, Math.sin(oa) * RR);
        og.position.set(orb.position.x, 0.35, orb.position.z);
        stations.forEach(function (st) {
          let d = Math.abs(((st.a - oa) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          const k = Math.max(0, 1 - d / 0.6);
          st.band.emissiveIntensity = 0.35 + 2.2 * k;
          st.icon.position.y = 0.42 + k * 0.12;
          if (st.icon.userData.spin) st.icon.userData.spin.rotation.y = t * 1.5;
        });
        heart.position.y = 1.18 + Math.sin(t * 1.3) * 0.06;
        heart.rotation.z = Math.sin(t * 1.05) * 0.05;
        walkers.forEach(function (w) {
          const a = w.a + t * w.sp; const r = 6.9;
          w.p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
          w.p.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
          K.pose(w.p, t, 1, 6.5);
        });
        void trail;
      }
    };
  };
})();
