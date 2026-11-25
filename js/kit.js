/* Takeda 2030: 3D diorama kit.
   Reusable Three.js building blocks: materials, lighting, rounded geometry,
   people, furniture, buildings, screens and flowing light. */
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE;
  const K = {};
  window.TK = window.TK || {};
  TK.K = K;

  K.C = {
    floor: 0xE6EBEE, floorWarm: 0xEDE8E1, side: 0xB4C0CB, sideDark: 0xAAB6C1,
    white: 0xF7F8FA, offwhite: 0xE8ECEF, wall: 0xDDE3E8, graphite: 0x2B3541, ink: 0x18222C,
    red: 0xC8102E, teal: 0x0D7A70, tealLight: 0x2FB3A3, amber: 0xD8962A,
    navy: 0x26364A, slate: 0x5D6B7A, steel: 0xCFD6DC, wood: 0xCDA57C, woodDark: 0x8E6B4C,
    leaf: 0x79A886, leafDark: 0x5A8A69, grass: 0xBDD6B8, path: 0xF2F3F1
  };

  /* ---------- deterministic randomness ---------- */
  K.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  /* ---------- materials (cached) ---------- */
  const matCache = new Map();
  K.mat = function (color, opts) {
    const o = opts || {};
    const key = color + '|' + JSON.stringify(o);
    if (!matCache.has(key)) {
      matCache.set(key, new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.72, metalness: 0 }, o)));
    }
    return matCache.get(key);
  };
  K.metal = function (color) { return K.mat(color || 0xD9DFE4, { metalness: 0.92, roughness: 0.2 }); };
  K.glass = function (tint) {
    const key = 'glass|' + (tint || 0);
    if (!matCache.has(key)) {
      matCache.set(key, new T.MeshPhysicalMaterial({
        color: tint || 0x5E89A6, roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.66,
        clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1.0, depthWrite: false
      }));
    }
    return matCache.get(key);
  };
  K.glow = function (color, intensity, opts) {
    return new T.MeshStandardMaterial(Object.assign({
      color: color, emissive: color, emissiveIntensity: intensity == null ? 1.4 : intensity, roughness: 0.4, metalness: 0
    }, opts || {}));
  };
  K.basic = function (color, opts) {
    return new T.MeshBasicMaterial(Object.assign({ color: color }, opts || {}));
  };

  /* ---------- environment map: a soft studio room, prefiltered ---------- */
  K.makeEnvironment = function (renderer) {
    const room = new T.Scene();
    const box = new T.BoxGeometry();
    const roomMat = new T.MeshStandardMaterial({ side: T.BackSide, color: 0xffffff });
    const boxMat = new T.MeshStandardMaterial({ color: 0xffffff });
    const light = new T.PointLight(0xffffff, 900, 28, 2);
    light.position.set(0.4, 16, 0.3);
    room.add(light);
    const shell = new T.Mesh(box, roomMat);
    shell.position.set(-0.75, 13.2, 0.7); shell.scale.set(31.7, 28.3, 28.6);
    room.add(shell);
    [[-10.9, 2, 1.8, 2.3, 7.9, 4.6, -0.2], [-5.6, 1.6, -6.4, 3.1, 6.3, 3.6, 0.5], [6.2, 1.1, -3.7, 3.9, 6.5, 3.3, 0.2], [-2.8, 0.9, 7.5, 2.6, 5.3, 2.6, -0.3]]
      .forEach(function (b) {
        const m = new T.Mesh(box, boxMat);
        m.position.set(b[0], b[1], b[2]); m.scale.set(b[3], b[4], b[5]); m.rotation.y = b[6];
        room.add(m);
      });
    function panel(x, y, z, sx, sy, sz, k) {
      const mat = new T.MeshBasicMaterial({ color: 0xffffff });
      mat.color.setScalar(k);
      const m = new T.Mesh(box, mat);
      m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      room.add(m);
    }
    panel(-16.1, 14.4, 8.2, 0.1, 2.4, 2.7, 50);
    panel(-16.1, 18, -8.2, 0.1, 2.4, 2.75, 50);
    panel(14.9, 12.2, -1.8, 0.15, 4.3, 6.3, 17);
    panel(-0.5, 8.9, 14.5, 4.4, 5.4, 0.1, 43);
    panel(3.2, 11.5, -12.5, 2.5, 2, 0.1, 20);
    panel(0, 20, 0, 1, 0.1, 1, 100);
    const pmrem = new T.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    return tex;
  };

  /* ---------- lighting ---------- */
  K.lights = function (scene, o) {
    o = o || {};
    const size = o.size || 12;
    const hemi = new T.HemisphereLight(0xffffff, 0xB8C2CC, o.hemi == null ? 0.6 : o.hemi);
    scene.add(hemi);
    const sun = new T.DirectionalLight(0xFFF3E4, o.sun == null ? 3.1 : o.sun);
    sun.position.set(size * 0.55, size * 1.25, size * 0.75);
    sun.castShadow = true;
    const res = o.shadow || 2048;
    sun.shadow.mapSize.set(res, res);
    const cam = sun.shadow.camera;
    cam.left = -size; cam.right = size; cam.top = size; cam.bottom = -size;
    cam.near = 0.5; cam.far = size * 4;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    scene.add(sun);
    scene.add(sun.target);
    const fill = new T.DirectionalLight(0xD6E4FF, 0.35);
    fill.position.set(-size, size * 0.6, -size * 0.4);
    scene.add(fill);
    return { hemi: hemi, sun: sun, fill: fill };
  };

  /* ---------- rounded geometry ---------- */
  function roundedRect(w, d, r) {
    const s = new T.Shape();
    const x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  const geoCache = new Map();
  /* Rounded box sitting on y = 0, spanning y 0..h. */
  K.rboxGeo = function (w, h, d, r) {
    r = r == null ? Math.min(w, d) * 0.12 : r;
    const key = [w, h, d, r].map(function (v) { return v.toFixed(3); }).join('|');
    if (geoCache.has(key)) return geoCache.get(key);
    const b = Math.max(0.004, Math.min(r * 0.55, h * 0.45, w * 0.2, d * 0.2));
    const iw = Math.max(0.01, w - 2 * b), id = Math.max(0.01, d - 2 * b);
    const ir = Math.max(0.002, Math.min(r - b, iw / 2 - 0.001, id / 2 - 0.001));
    const g = new T.ExtrudeGeometry(roundedRect(iw, id, ir), {
      depth: Math.max(0.002, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b,
      bevelSegments: 3, curveSegments: 6
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    geoCache.set(key, g);
    return g;
  };
  K.rbox = function (w, h, d, r, mat) {
    const m = new T.Mesh(K.rboxGeo(w, h, d, r), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  K.box = function (w, h, d, mat) {
    const key = 'b|' + w + '|' + h + '|' + d;
    if (!geoCache.has(key)) { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); geoCache.set(key, g); }
    const m = new T.Mesh(geoCache.get(key), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  K.cyl = function (rt, rb, h, mat, seg) {
    const key = 'c|' + rt + '|' + rb + '|' + h + '|' + (seg || 32);
    if (!geoCache.has(key)) { const g = new T.CylinderGeometry(rt, rb, h, seg || 32); g.translate(0, h / 2, 0); geoCache.set(key, g); }
    const m = new T.Mesh(geoCache.get(key), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  K.sphere = function (r, mat, ws, hs) {
    const key = 's|' + r + '|' + (ws || 24);
    if (!geoCache.has(key)) geoCache.set(key, new T.SphereGeometry(r, ws || 24, hs || 16));
    const m = new T.Mesh(geoCache.get(key), mat);
    m.castShadow = true;
    return m;
  };
  K.ring = function (r, tube, mat, seg) {
    const key = 't|' + r + '|' + tube;
    if (!geoCache.has(key)) { const g = new T.TorusGeometry(r, tube, 12, seg || 64); g.rotateX(Math.PI / 2); geoCache.set(key, g); }
    return new T.Mesh(geoCache.get(key), mat);
  };

  /* ---------- soft contact shadow ---------- */
  let shadowTex = null;
  function shadowTexture() {
    if (shadowTex) return shadowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0, 'rgba(20,32,44,0.55)'); grd.addColorStop(0.55, 'rgba(20,32,44,0.22)'); grd.addColorStop(1, 'rgba(20,32,44,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    shadowTex = new T.CanvasTexture(c);
    shadowTex.colorSpace = T.SRGBColorSpace;
    return shadowTex;
  }
  K.contactShadow = function (w, d, y, opacity) {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: opacity == null ? 0.9 : opacity }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = -1;
    return m;
  };

  /* ---------- diorama plinths: top surface at y = 0 ---------- */
  K.plinth = function (w, d, o) {
    o = o || {};
    const h = o.h || 0.7, r = o.r == null ? 0.9 : o.r;
    const g = new T.Group();
    const side = K.rbox(w, h, d, r, K.mat(o.side || K.C.side, { roughness: 0.85 }));
    side.position.y = -h - 0.06;
    side.castShadow = false;
    g.add(side);
    const top = K.rbox(w - 0.12, 0.12, d - 0.12, Math.max(0.05, r - 0.06), K.mat(o.top || K.C.floor, { roughness: 0.92 }));
    top.position.y = -0.12;
    top.castShadow = false;
    g.add(top);
    g.add(K.contactShadow(w * 1.35, d * 1.45, -h - 0.1, 0.85));
    return g;
  };
  K.disc = function (radius, o) {
    o = o || {};
    const h = o.h || 0.7;
    const g = new T.Group();
    const side = K.cyl(radius, radius * 0.985, h, K.mat(o.side || K.C.side, { roughness: 0.85 }), 96);
    side.position.y = -h - 0.06; side.castShadow = false;
    g.add(side);
    const top = K.cyl(radius - 0.06, radius - 0.06, 0.12, K.mat(o.top || K.C.floor, { roughness: 0.92 }), 96);
    top.position.y = -0.12; top.castShadow = false;
    g.add(top);
    g.add(K.contactShadow(radius * 2.7, radius * 2.7, -h - 0.1, 0.85));
    return g;
  };
  K.tile = function (w, d, color, r) {
    const m = K.rbox(w, 0.035, d, r == null ? 0.25 : r, K.mat(color, { roughness: 0.9 }));
    m.castShadow = false;
    return m;
  };

  /* ---------- screens ---------- */
  const texCache = new Map();
  K.screen = function (kind, accent) {
    const key = kind + '|' + (accent || '');
    if (texCache.has(key)) return texCache.get(key);
    const c = document.createElement('canvas'); c.width = 320; c.height = 200;
    const g = c.getContext('2d');
    const R = K.rng(kind.length * 977 + (accent || '').length * 31);
    const A = accent || '#2FB3A3';
    function bg(col) { g.fillStyle = col; g.fillRect(0, 0, 320, 200); }
    if (kind === 'dash') {
      bg('#0F1B27');
      g.fillStyle = '#1C2C3C'; g.fillRect(0, 0, 320, 22);
      g.fillStyle = '#C8102E'; g.fillRect(10, 8, 26, 6);
      for (let i = 0; i < 3; i++) { g.fillStyle = '#16283A'; g.fillRect(10 + i * 102, 32, 94, 44); g.fillStyle = i === 1 ? '#E9B44C' : A; g.fillRect(18 + i * 102, 58, 30 + R() * 40, 8); g.fillStyle = '#8FA3B5'; g.fillRect(18 + i * 102, 42, 40, 5); }
      g.strokeStyle = A; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= 190; x += 19) { const y = 160 - x * 0.25 - R() * 26; if (x === 0) g.moveTo(14 + x, y); else g.lineTo(14 + x, y); }
      g.stroke();
      for (let i = 0; i < 6; i++) { const h = 20 + R() * 70; g.fillStyle = i % 2 ? '#3E6B8A' : A; g.fillRect(222 + i * 15, 186 - h, 10, h); }
    } else if (kind === 'code') {
      bg('#0D1620');
      for (let i = 0; i < 15; i++) { const ind = (i % 4) * 12; const cols = [A, '#7FA7D9', '#E9B44C', '#C9D3DD']; g.fillStyle = cols[Math.floor(R() * 4)]; g.fillRect(12 + ind, 12 + i * 12.4, 40 + R() * 160, 6); }
      g.fillStyle = '#C8102E'; g.fillRect(12, 12 + 7 * 12.4, 120, 6);
    } else if (kind === 'threat') {
      bg('#0B141D');
      g.fillStyle = '#1E3446';
      for (let i = 0; i < 380; i++) { const x = R() * 320, y = 30 + R() * 150; if (Math.sin(x * 0.03) + Math.cos(y * 0.05) > 0.2) g.fillRect(x, y, 2.2, 2.2); }
      for (let i = 0; i < 6; i++) { const x = 30 + R() * 260, y = 50 + R() * 110; g.strokeStyle = i < 2 ? '#FF4A5F' : A; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5 + R() * 6, 0, 7); g.stroke(); }
      g.fillStyle = '#FF4A5F'; g.fillRect(10, 10, 60, 8);
    } else if (kind === 'molecule') {
      bg('#0E1A25');
      g.strokeStyle = '#7FC9C0'; g.lineWidth = 3;
      const pts = [];
      for (let i = 0; i < 9; i++) pts.push([80 + Math.cos(i * 0.8) * (40 + (i % 3) * 22) + i * 14, 100 + Math.sin(i * 1.3) * 50]);
      for (let i = 1; i < pts.length; i++) { g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
      pts.forEach(function (p, i) { g.fillStyle = i % 3 === 0 ? '#C8102E' : i % 3 === 1 ? A : '#E6EDF3'; g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.fill(); });
    } else if (kind === 'course') {
      bg('#F5F7F9');
      g.fillStyle = '#C8102E'; g.fillRect(16, 18, 120, 12);
      g.fillStyle = '#B9C4CE'; for (let i = 0; i < 5; i++) g.fillRect(16, 46 + i * 16, 130 - i * 10, 7);
      g.fillStyle = '#DCE6EC'; g.fillRect(170, 40, 130, 120);
      g.strokeStyle = A; g.lineWidth = 4; g.beginPath(); g.moveTo(180, 140); g.lineTo(220, 100); g.lineTo(250, 118); g.lineTo(290, 64); g.stroke();
    } else if (kind === 'kanban') {
      bg('#FBFBFA');
      g.fillStyle = '#E3E8EC'; for (let i = 0; i < 3; i++) g.fillRect(12 + i * 102, 12, 94, 176);
      const cols = ['#F4D58D', '#BFE3DC', '#F6C6CE', '#CFE0F3'];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4 - i; j++) { g.fillStyle = cols[Math.floor(R() * 4)]; g.fillRect(20 + i * 102, 22 + j * 40, 78, 32); }
    } else if (kind === 'rubric') {
      bg('#F7F9FA');
      g.fillStyle = '#18222C'; g.fillRect(14, 14, 110, 10);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = '#C2CCD5'; g.fillRect(14, 42 + i * 24, 110, 7);
        for (let k = 0; k < 4; k++) { g.fillStyle = k <= (i * 7 + 3) % 4 ? A : '#DDE3E8'; g.beginPath(); g.arc(170 + k * 34, 46 + i * 24, 7, 0, 7); g.fill(); }
      }
    } else if (kind === 'holo') {
      g.clearRect(0, 0, 320, 200);
      g.fillStyle = 'rgba(47,179,163,0.18)'; g.fillRect(0, 0, 320, 200);
      g.strokeStyle = 'rgba(160,240,230,0.55)'; g.lineWidth = 1;
      for (let x = 0; x < 320; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 200); g.stroke(); }
      for (let y = 0; y < 200; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke(); }
      g.strokeStyle = '#B9FFF4'; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= 320; x += 10) { const y = 100 + Math.sin(x * 0.04) * 40 + Math.sin(x * 0.11) * 14; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
      g.fillStyle = '#FF6A7E'; g.beginPath(); g.arc(210, 72, 7, 0, 7); g.fill();
    } else {
      bg('#132230');
    }
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    texCache.set(key, tex);
    return tex;
  };
  K.screenMat = function (kind, accent, intensity) {
    const tex = K.screen(kind, accent);
    return new T.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity == null ? 1.05 : intensity, roughness: 0.25, metalness: 0 });
  };
  K.monitor = function (kind, accent, w, h) {
    w = w || 0.62; h = h || 0.38;
    const g = new T.Group();
    const body = K.box(w + 0.04, h + 0.04, 0.03, K.mat(K.C.graphite, { roughness: 0.4 }));
    body.position.y = 0.14;
    g.add(body);
    const scr = new T.Mesh(new T.PlaneGeometry(w, h), K.screenMat(kind, accent));
    scr.position.set(0, 0.14 + (h + 0.04) / 2, 0.0165);
    g.add(scr);
    const neck = K.box(0.04, 0.14, 0.04, K.mat(K.C.graphite));
    neck.position.z = -0.03; g.add(neck);
    const foot = K.box(0.2, 0.015, 0.12, K.mat(K.C.graphite));
    foot.position.z = -0.03; g.add(foot);
    return g;
  };

  /* ---------- people ---------- */
  const SKIN = [0xF1C9A8, 0xE0AE88, 0xC68C64, 0x9C6644, 0x704A33, 0xF3D3B8];
  const HAIR = [0x2B211C, 0x4A3426, 0x1C1C1C, 0x8A6A4A, 0xC9B28A, 0x6B6B6B, 0x3B2A20];
  const SHIRTS = [0x2E4A66, 0x55606C, 0x8C99A6, 0x3E6E8E, 0x6B7F6E, 0x9AA7B3, 0x34495E, 0xB8C2CC];
  const PANTS = [0x2B3541, 0x3A4552, 0x4D5866, 0x23303D];
  let PG = null;
  function peopleGeo() {
    if (PG) return PG;
    PG = {
      leg: new T.CapsuleGeometry(0.068, 0.34, 4, 10),
      torso: new T.CapsuleGeometry(0.15, 0.24, 6, 16),
      arm: new T.CapsuleGeometry(0.05, 0.3, 4, 8),
      head: new T.SphereGeometry(0.118, 22, 16),
      hair: new T.SphereGeometry(0.124, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      coat: new T.CylinderGeometry(0.168, 0.215, 0.56, 18, 1, true)
    };
    PG.leg.translate(0, -0.24, 0);
    PG.arm.translate(0, -0.2, 0);
    return PG;
  }
  K.person = function (o) {
    o = o || {};
    const R = o.rand || Math.random;
    const G = peopleGeo();
    const skin = K.mat(o.skin != null ? o.skin : SKIN[Math.floor(R() * SKIN.length)], { roughness: 0.6 });
    const shirtCol = o.shirt != null ? o.shirt : SHIRTS[Math.floor(R() * SHIRTS.length)];
    const shirt = o.shirtMat || K.mat(shirtCol, { roughness: 0.8 });
    const pants = K.mat(o.pants != null ? o.pants : PANTS[Math.floor(R() * PANTS.length)], { roughness: 0.85 });
    const hairM = K.mat(o.hair != null ? o.hair : HAIR[Math.floor(R() * HAIR.length)], { roughness: 0.9 });
    const g = new T.Group();
    const body = new T.Group(); g.add(body);
    function mesh(geo, m) { const x = new T.Mesh(geo, m); x.castShadow = true; return x; }
    const legL = new T.Group(); legL.position.set(-0.075, 0.5, 0); legL.add(mesh(G.leg, pants)); body.add(legL);
    const legR = new T.Group(); legR.position.set(0.075, 0.5, 0); legR.add(mesh(G.leg, pants)); body.add(legR);
    const torso = mesh(G.torso, shirt); torso.position.y = 0.76; body.add(torso);
    if (o.coat) { const coat = mesh(G.coat, K.mat(0xF6F7F8, { roughness: 0.7, side: T.DoubleSide })); coat.position.y = 0.66; body.add(coat); }
    const armMat = o.coat ? K.mat(0xF6F7F8, { roughness: 0.7 }) : shirt;
    const armL = new T.Group(); armL.position.set(-0.2, 0.96, 0); armL.add(mesh(G.arm, armMat)); armL.rotation.z = 0.08; body.add(armL);
    const armR = new T.Group(); armR.position.set(0.2, 0.96, 0); armR.add(mesh(G.arm, armMat)); armR.rotation.z = -0.08; body.add(armR);
    const head = mesh(G.head, skin); head.position.y = 1.15; body.add(head);
    const hair = mesh(G.hair, hairM); hair.position.set(0, 1.165, -0.012); hair.rotation.x = -0.25; body.add(hair);
    if (o.scale) g.scale.setScalar(o.scale);
    g.userData = { legL: legL, legR: legR, armL: armL, armR: armR, body: body, torso: torso, phase: R() * 6.28, shirt: shirt };
    return g;
  };
  /* Swing the limbs; amount 0 = standing still, 1 = full walk. */
  K.pose = function (p, t, amount, speed) {
    const u = p.userData; const a = amount == null ? 1 : amount;
    const s = Math.sin(t * (speed || 7) + u.phase);
    u.legL.rotation.x = s * 0.55 * a; u.legR.rotation.x = -s * 0.55 * a;
    u.armL.rotation.x = -s * 0.45 * a; u.armR.rotation.x = s * 0.45 * a;
    u.body.position.y = Math.abs(s) * 0.025 * a;
    if (a < 0.05) { const b = Math.sin(t * 1.4 + u.phase) * 0.012; u.body.position.y = b; u.armR.rotation.x = Math.sin(t * 0.9 + u.phase) * 0.06; }
  };
  K.face = function (obj, x, z) { obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z); };

  /* ---------- furniture and props ---------- */
  K.desk = function (o) {
    o = o || {};
    const w = o.w || 1.15, d = o.d || 0.62, top = o.top || K.C.white;
    const g = new T.Group();
    const slab = K.rbox(w, 0.045, d, 0.04, K.mat(top, { roughness: 0.55 }));
    slab.position.y = 0.56; g.add(slab);
    const legM = K.mat(K.C.graphite, { roughness: 0.4, metalness: 0.5 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
      const l = K.box(0.035, 0.56, 0.035, legM);
      l.position.set(s[0] * (w / 2 - 0.06), 0, s[1] * (d / 2 - 0.06));
      g.add(l);
    });
    if (o.monitor !== false) {
      const m = K.monitor(o.screen || 'dash', o.accent);
      m.position.set(0, 0.605, -d * 0.22);
      if (o.flipMonitor) m.rotation.y = Math.PI;
      g.add(m);
    }
    return g;
  };
  K.table = function (w, d, color) {
    const g = new T.Group();
    const top = K.rbox(w, 0.05, d, Math.min(w, d) * 0.45, K.mat(color || K.C.white, { roughness: 0.5 }));
    top.position.y = 0.55; g.add(top);
    const ped = K.cyl(0.08, 0.12, 0.55, K.mat(K.C.graphite, { roughness: 0.4, metalness: 0.5 }));
    g.add(ped);
    if (w > 1.6) { const p2 = ped.clone(); p2.position.x = w * 0.3; ped.position.x = -w * 0.3; g.add(p2); }
    return g;
  };
  K.tree = function (h, rand) {
    const R = rand || Math.random;
    h = h || 1.6;
    const g = new T.Group();
    const trunk = K.cyl(0.05, 0.08, h * 0.45, K.mat(K.C.woodDark, { roughness: 0.9 }), 8);
    g.add(trunk);
    const leafM = K.mat(R() > 0.5 ? K.C.leaf : K.C.leafDark, { roughness: 0.95, flatShading: true });
    const n = 3;
    for (let i = 0; i < n; i++) {
      const s = new T.Mesh(new T.IcosahedronGeometry(h * (0.26 - i * 0.04), 1), leafM);
      s.position.set((R() - 0.5) * 0.25 * h, h * (0.55 + i * 0.17), (R() - 0.5) * 0.25 * h);
      s.castShadow = true;
      g.add(s);
    }
    return g;
  };
  K.planter = function () {
    const g = new T.Group();
    g.add(K.rbox(0.36, 0.34, 0.36, 0.06, K.mat(K.C.white, { roughness: 0.6 })));
    const leaf = K.mat(K.C.leaf, { roughness: 0.9, flatShading: true });
    for (let i = 0; i < 3; i++) { const s = new T.Mesh(new T.IcosahedronGeometry(0.17 - i * 0.03, 0), leaf); s.position.set((i - 1) * 0.08, 0.45 + i * 0.12, (i % 2) * 0.06); s.castShadow = true; g.add(s); }
    return g;
  };

  /* Modern glass building with visible floor slabs. */
  K.building = function (o) {
    o = o || {};
    const w = o.w || 4, d = o.d || 3, floors = o.floors || 3, fh = o.floorH || 0.95;
    const g = new T.Group();
    const slabM = K.mat(o.slab || K.C.white, { roughness: 0.55 });
    const coreM = K.mat(o.core || 0xD9E1E7, { roughness: 0.8 });
    const glass = K.glass(o.tint);
    const core = K.box(w * 0.55, floors * fh, d * 0.5, coreM);
    g.add(core);
    for (let i = 0; i < floors; i++) {
      const s = K.rbox(w, 0.14, d, 0.12, slabM); s.position.y = i * fh; g.add(s);
      const gl = K.box(w - 0.16, fh - 0.14, d - 0.16, glass); gl.position.y = i * fh + 0.14; gl.castShadow = false; g.add(gl);
      // mullions
      const mm = K.mat(o.mullion || 0x8C9AA7, { roughness: 0.4, metalness: 0.6 });
      const nx = Math.max(2, Math.round(w / 0.7));
      for (let k = 1; k < nx; k++) {
        const x = -w / 2 + 0.08 + k * (w - 0.16) / nx;
        const m1 = K.box(0.03, fh - 0.14, 0.03, mm); m1.position.set(x, i * fh + 0.14, d / 2 - 0.08); m1.castShadow = false; g.add(m1);
        const m2 = m1.clone(); m2.position.z = -(d / 2 - 0.08); g.add(m2);
      }
    }
    const roof = K.rbox(w + 0.1, 0.2, d + 0.1, 0.14, slabM); roof.position.y = floors * fh; g.add(roof);
    if (o.accent) {
      const sign = K.box(w * 0.42, 0.16, 0.06, K.mat(o.accent, { roughness: 0.4 }));
      sign.position.set(-w * 0.18, floors * fh - 0.05, d / 2 + 0.06); g.add(sign);
    }
    if (o.rooftop !== false) {
      const unitM = K.mat(0xB9C3CC, { roughness: 0.6, metalness: 0.3 });
      const u1 = K.rbox(w * 0.3, 0.35, d * 0.3, 0.05, unitM); u1.position.set(-w * 0.18, floors * fh + 0.2, -d * 0.1); g.add(u1);
      const u2 = K.rbox(w * 0.16, 0.25, d * 0.22, 0.04, unitM); u2.position.set(w * 0.22, floors * fh + 0.2, d * 0.12); g.add(u2);
    }
    g.userData.height = floors * fh + 0.2;
    return g;
  };

  K.bench = function (len, o) {
    o = o || {};
    const g = new T.Group();
    const cab = K.rbox(len, 0.5, 0.62, 0.04, K.mat(o.cabinet || 0xDCE5EA, { roughness: 0.6 }));
    g.add(cab);
    const top = K.rbox(len + 0.04, 0.05, 0.66, 0.02, K.mat(0x2F3A45, { roughness: 0.35 }));
    top.position.y = 0.5; g.add(top);
    const shelfM = K.mat(K.C.white, { roughness: 0.5 });
    const shelf = K.box(len, 0.03, 0.22, shelfM); shelf.position.set(0, 1.05, -0.2); g.add(shelf);
    [-1, 1].forEach(function (s) { const p = K.box(0.03, 0.55, 0.03, K.metal()); p.position.set(s * (len / 2 - 0.05), 0.55, -0.2); g.add(p); });
    const R = K.rng(Math.round(len * 100));
    for (let i = 0; i < Math.floor(len * 4); i++) {
      const b = K.cyl(0.035, 0.035, 0.12 + R() * 0.08, K.glass(R() > 0.6 ? 0xF2B8C2 : 0xBFE6DF), 12);
      b.position.set(-len / 2 + 0.15 + i * 0.25, 1.08, -0.2); g.add(b);
    }
    return g;
  };
  K.flask = function (tint) {
    const g = new T.Group();
    const body = new T.Mesh(new T.SphereGeometry(0.09, 18, 14), K.glass(tint || 0xBFE6DF)); body.position.y = 0.09; g.add(body);
    const neck = K.cyl(0.025, 0.03, 0.1, K.glass(tint || 0xBFE6DF), 12); neck.position.y = 0.15; g.add(neck);
    const liquid = new T.Mesh(new T.SphereGeometry(0.075, 16, 10, 0, 6.3, Math.PI * 0.45, Math.PI * 0.55), K.mat(tint === 0xF2B8C2 ? 0xE0566E : 0x2FB3A3, { roughness: 0.2, transparent: true, opacity: 0.85 }));
    liquid.position.y = 0.09; g.add(liquid);
    return g;
  };
  K.microscope = function () {
    const g = new T.Group();
    const M = K.mat(0xF2F4F6, { roughness: 0.4 }), D = K.mat(K.C.graphite, { roughness: 0.35, metalness: 0.4 });
    g.add(K.rbox(0.3, 0.05, 0.22, 0.03, M));
    const arm = K.rbox(0.07, 0.36, 0.08, 0.03, M); arm.position.set(0, 0.05, -0.07); g.add(arm);
    const tube = K.cyl(0.035, 0.035, 0.24, D, 16); tube.rotation.x = 0.5; tube.position.set(0, 0.24, -0.02); g.add(tube);
    const stage = K.box(0.18, 0.02, 0.14, D); stage.position.set(0, 0.17, 0.02); g.add(stage);
    return g;
  };
  K.robotArm = function (color) {
    const g = new T.Group();
    const M = K.mat(0xF3F4F5, { roughness: 0.35, metalness: 0.15 }), J = K.mat(color || K.C.teal, { roughness: 0.3, metalness: 0.2 });
    g.add(K.cyl(0.16, 0.2, 0.12, J, 24));
    const s1 = new T.Group(); s1.position.y = 0.12; g.add(s1);
    const a1 = K.cyl(0.07, 0.08, 0.5, M, 16); s1.add(a1);
    const j1 = K.sphere(0.09, J); j1.position.y = 0.5; s1.add(j1);
    const s2 = new T.Group(); s2.position.y = 0.5; s2.rotation.z = -1.1; s1.add(s2);
    const a2 = K.cyl(0.055, 0.065, 0.45, M, 16); s2.add(a2);
    const j2 = K.sphere(0.07, J); j2.position.y = 0.45; s2.add(j2);
    const s3 = new T.Group(); s3.position.y = 0.45; s3.rotation.z = -0.9; s2.add(s3);
    s3.add(K.cyl(0.04, 0.05, 0.18, M, 12));
    const grip = K.box(0.12, 0.05, 0.05, J); grip.position.y = 0.18; s3.add(grip);
    s1.rotation.z = 0.35;
    g.userData = { s1: s1, s2: s2, s3: s3 };
    return g;
  };
  K.tank = function (r, h) {
    const g = new T.Group();
    const M = K.metal(0xDDE3E8);
    const body = K.cyl(r, r, h, M, 40); body.position.y = 0.35; g.add(body);
    const cap = new T.Mesh(new T.SphereGeometry(r, 40, 16, 0, 6.3, 0, Math.PI / 2), M); cap.position.y = 0.35 + h; cap.castShadow = true; g.add(cap);
    const bot = new T.Mesh(new T.SphereGeometry(r, 40, 12, 0, 6.3, Math.PI / 2, Math.PI / 2), M); bot.position.y = 0.35; g.add(bot);
    for (let i = 0; i < 3; i++) { const l = K.cyl(0.04, 0.04, 0.4, K.metal(0xAEB7BF), 8); const a = i * 2.094; l.position.set(Math.cos(a) * r * 0.75, -0.05, Math.sin(a) * r * 0.75); g.add(l); }
    const band = K.cyl(r + 0.01, r + 0.01, 0.06, K.mat(K.C.teal, { roughness: 0.4 }), 40); band.position.y = 0.35 + h * 0.7; g.add(band);
    return g;
  };
  K.tube = function (points, r, mat, closed) {
    const curve = new T.CatmullRomCurve3(points, !!closed, 'catmullrom', 0.2);
    const m = new T.Mesh(new T.TubeGeometry(curve, Math.max(24, points.length * 16), r, 10, !!closed), mat);
    m.castShadow = true;
    return m;
  };
  K.arch = function (w, h, mat, depth) {
    const g = new T.Group();
    const dd = depth || 0.3;
    const p1 = K.rbox(0.22, h, dd, 0.06, mat); p1.position.x = -w / 2; g.add(p1);
    const p2 = K.rbox(0.22, h, dd, 0.06, mat); p2.position.x = w / 2; g.add(p2);
    const beam = K.rbox(w + 0.22, 0.26, dd, 0.06, mat); beam.position.y = h; g.add(beam);
    return g;
  };

  /* A flat ribbon following a curve (paths, routes). */
  K.ribbon = function (curve, width, mat, segments, y) {
    const n = segments || 120;
    const pos = [], idx = [];
    const up = new T.Vector3(0, 1, 0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
      const side = new T.Vector3().crossVectors(up, tan).normalize().multiplyScalar(width / 2);
      pos.push(p.x + side.x, (y || 0) + p.y, p.z + side.z, p.x - side.x, (y || 0) + p.y, p.z - side.z);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, mat);
    m.receiveShadow = true;
    return m;
  };

  /* Glowing beads travelling along curves. */
  K.flow = function (curves, perCurve, color, size, speed) {
    const total = curves.length * perCurve;
    const geo = new T.SphereGeometry(size || 0.08, 12, 8);
    const mat = new T.MeshBasicMaterial({ color: color, toneMapped: false, transparent: true, opacity: 0.95 });
    const mesh = new T.InstancedMesh(geo, mat, total);
    mesh.frustumCulled = false;
    const tmp = new T.Object3D();
    const offs = [];
    for (let i = 0; i < total; i++) offs.push((i % perCurve) / perCurve + (Math.floor(i / perCurve) * 0.137));
    mesh.userData.update = function (t) {
      for (let i = 0; i < total; i++) {
        const c = curves[Math.floor(i / perCurve)];
        const u = ((t * (speed || 0.08)) + offs[i]) % 1;
        c.getPointAt(u, tmp.position);
        const s = Math.sin(u * Math.PI);
        tmp.scale.setScalar(0.35 + 0.75 * s);
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    mesh.userData.update(0);
    return mesh;
  };

  /* Soft glowing floor disc. */
  let glowTex = null;
  K.glowDisc = function (radius, color, opacity) {
    if (!glowTex) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      glowTex = new T.CanvasTexture(c);
    }
    const m = new T.Mesh(new T.PlaneGeometry(radius * 2, radius * 2), new T.MeshBasicMaterial({ map: glowTex, color: color, transparent: true, opacity: opacity == null ? 0.6 : opacity, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02;
    return m;
  };

  /* Arc between two ground points. */
  K.arc = function (a, b, height) {
    const mid = new T.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y += height;
    return new T.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  };
})();
