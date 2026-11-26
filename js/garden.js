/* Takeda 2030: Takeda Garden elements, modelled procedurally from the Takeda Garden renders.
   - Planting pillars with glowing therapeutic-area icons on gold-rimmed grass pads (closing chapter island).
   - Main-garden landmarks for the campus backdrop: glass-arch greenhouse, waterfall pavilion with rainbow,
     sailboat pond, tree of light, cherry blossom, Takeda flag, compass plaza, umbrella pines, winding path.
   - Pond, arched wooden bridges, bonsai, stone lanterns and a tree house around the closing island.
   No external models or textures: every element is generated here, so the site stays fully static.
   Add ?garden=off to compare without it. */
(function () {
  'use strict';
  const T = window.THREE, TK = window.TK || {}, K = TK.K, S = TK.SCENES;
  if (!T || !K || !S) return;
  if (new URLSearchParams(location.search).get('garden') === 'off') return;
  const V = function (x, y, z) { return new T.Vector3(x, y, z); };
  const PI = Math.PI;
  const time = { value: 0 };

  /* ------------------------------------------------------------------ helpers */
  const cache = {};
  function once(key, make) { return cache[key] || (cache[key] = make()); }
  function std(color, o) { return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.7, metalness: 0 }, o || {})); }
  function mesh(geo, mat, cast, recv) { const m = new T.Mesh(geo, mat); m.castShadow = cast !== false; m.receiveShadow = recv !== false; return m; }
  function at(o, x, y, z, ry) { o.position.set(x, y, z); if (ry) o.rotation.y = ry; return o; }
  function tube(points, r, mat, seg, radial) { return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), seg || 32, r, radial || 8, false), mat); }
  function canvasTex(w, h, draw, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (srgb !== false) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const MAT = {
    white: function () { return once('white', function () { return std(0xf5f6f3, { roughness: 0.3 }); }); },
    wood: function () { return once('wood', function () { return std(0xc69a6a, { roughness: 0.62 }); }); },
    woodDark: function () { return once('woodDark', function () { return std(0x7b5438, { roughness: 0.75 }); }); },
    bark: function () { return once('bark', function () { return std(0x5a4334, { roughness: 0.92 }); }); },
    brass: function () { return once('brass', function () { return std(0xc9a35d, { roughness: 0.32, metalness: 0.75 }); }); },
    stone: function () { return once('stone', function () { return std(0x9c968c, { roughness: 0.9 }); }); },
    grass: function () { return once('grass', function () { return std(0x5f9443, { roughness: 0.95 }); }); },
    steel: function () { return once('steel', function () { return std(0x353d44, { roughness: 0.45, metalness: 0.55 }); }); },
    icon: function () { return once('icon', function () { return std(0xe3122c, { emissive: 0xff0f2a, emissiveIntensity: 1.15, roughness: 0.3 }); }); }
  };
  function glowTexture() {
    return once('glowTex', function () {
      return canvasTex(128, 128, function (g) {
        const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(0.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      });
    });
  }
  function halo(color, size, opacity) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: color, transparent: true, opacity: opacity, blending: T.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); s.renderOrder = 5;
    return s;
  }

  /* ------------------------------------------------------------------ therapeutic-area icons (glowing red) */
  function iconTube() {
    const g = new T.Group(), m = MAT.icon();
    g.add(mesh(new T.CapsuleGeometry(0.05, 0.24, 6, 18), m, false, false));
    const lip = mesh(new T.TorusGeometry(0.06, 0.013, 8, 28), m, false, false); lip.rotation.x = PI / 2; lip.position.y = 0.17; g.add(lip);
    g.rotation.z = -0.32;
    return g;
  }
  function iconDrop() {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = PI * (1 - i / 40); pts.push(new T.Vector2(Math.max(1e-4, 0.13 * Math.sin(t) * Math.sin(t / 2)), 0.17 * Math.cos(t))); }
    const g = new T.Group(); g.add(mesh(new T.LatheGeometry(pts, 48), MAT.icon(), false, false));
    return g;
  }
  function iconCells() {
    const g = new T.Group(), m = MAT.icon();
    g.add(mesh(new T.SphereGeometry(0.072, 24, 16), m, false, false));
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2 + 0.3; const s = mesh(new T.SphereGeometry(i % 2 ? 0.042 : 0.052, 20, 12), m, false, false); s.position.set(Math.cos(a) * 0.135, Math.sin(a) * 0.135, 0); g.add(s); }
    g.add(mesh(new T.TorusGeometry(0.2, 0.014, 8, 56), m, false, false));
    return g;
  }
  function iconGut() {
    const pts = [[-0.02, 0.2], [0.08, 0.17], [0.07, 0.1], [-0.08, 0.08], [-0.09, 0.01], [0.07, -0.01], [0.09, -0.08], [-0.06, -0.1], [-0.08, -0.17], [0.03, -0.2]].map(function (p) { return V(p[0], p[1], 0); });
    const g = new T.Group(); g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, 0.03, 12, false), MAT.icon(), false, false));
    return g;
  }
  function iconDNA() {
    const g = new T.Group(), m = MAT.icon(), turns = 1.6, h = 0.4, r = 0.075;
    [0, PI].forEach(function (ph) {
      const pts = [];
      for (let i = 0; i <= 48; i++) { const t = i / 48, a = t * turns * PI * 2 + ph; pts.push(V(Math.cos(a) * r, -h / 2 + t * h, Math.sin(a) * r)); }
      g.add(tube(pts, 0.016, m, 120, 8));
    });
    for (let i = 1; i < 11; i++) {
      const t = i / 11, a = t * turns * PI * 2, p1 = V(Math.cos(a) * r, -h / 2 + t * h, Math.sin(a) * r), p2 = V(-p1.x, p1.y, -p1.z);
      const rung = mesh(new T.CylinderGeometry(0.008, 0.008, p1.distanceTo(p2), 6), m, false, false);
      rung.position.copy(p1).add(p2).multiplyScalar(0.5);
      rung.quaternion.setFromUnitVectors(V(0, 1, 0), p2.clone().sub(p1).normalize());
      g.add(rung);
    }
    g.rotation.z = -0.45;
    return g;
  }
  function iconBrain() {
    const geo = new T.SphereGeometry(1, 72, 48), p = geo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const folds = 0.075 * Math.sin(v.x * 13 + v.y * 4) * Math.sin(v.y * 11 - v.z * 3) + 0.05 * Math.sin(v.z * 15 + v.x * 7);
      const fissure = Math.exp(-Math.pow(v.x * 9, 2)) * Math.max(0, v.y + 0.25) * 0.24;
      const k = 1 + folds - fissure;
      p.setXYZ(i, v.x * k * 1.18, Math.max(v.y * k * 0.84, -0.5), v.z * k * 0.95);
    }
    geo.computeVertexNormals();
    const g = new T.Group(), m = mesh(geo, MAT.icon(), false, false); m.scale.setScalar(0.15); g.add(m);
    return g;
  }
  const ICONS = { tube: iconTube, drop: iconDrop, cells: iconCells, gut: iconGut, dna: iconDNA, brain: iconBrain };

  /* ------------------------------------------------------------------ planting pillars */
  // Leaf: grid surface with a midrib droop and cupped edges; optional coleus variegation in vertex colours.
  // Rosette leaf: a flat oval blade (local +Y = length, +Z = upper face) with a soft downward arch and
  // a raised midrib; coleus gets magenta-centred variegation in vertex colours.
  function leafGeo(variegated) {
    const nu = 6, nv = 9, pos = [], col = [], idx = [];
    const cIn = new T.Color(0x7a1f5e), cMid = new T.Color(0xb8558a), cOut = new T.Color(0x95cb50), c = new T.Color();
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, prof = Math.sqrt(Math.max(0, Math.sin(PI * (0.04 + 0.96 * v)))) * (1 - 0.25 * v);
      for (let i = 0; i <= nu; i++) {
        const u = i / nu * 2 - 1;
        pos.push(u * 0.5 * prof, v, 0.05 * (1 - Math.abs(u)) * prof - 0.18 * v * v);
        if (variegated) { const e = Math.abs(u); c.copy(cIn).lerp(cMid, Math.min(1, e * 2.2)).lerp(cOut, Math.min(1, Math.max(0, (e - 0.42) / 0.32))); } else c.setRGB(1, 1, 1);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, d = a + nu + 2, e = a + nu + 1; idx.push(a, b, d, a, d, e); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }  const PLANTS = {
    basil: { len: 0.24, wid: 0.2, color: 0x5ea43c, rise: 0.35, n: 5 },
    coleus: { len: 0.26, wid: 0.22, color: 0xffffff, rise: 0.3, n: 5, variegated: true },
    lettuce: { len: 0.24, wid: 0.24, color: 0x9fd24a, rise: 0.4, n: 5 },
    spiky: { len: 0.34, wid: 0.075, color: 0x8cc847, rise: 0.75, n: 6 },
    lime: { len: 0.23, wid: 0.22, color: 0xb6da55, rise: 0.4, n: 5 }
  };
  // Six pillars, in the order shown in the Takeda Garden render.
  const PILLARS = [['tube', 'basil'], ['drop', 'coleus'], ['cells', 'lettuce'], ['gut', 'spiky'], ['dna', 'lettuce'], ['brain', 'lime']];

  function pillarSet(parent, spots, rng) {
    const R = rng || K.rng(77);
    const TIERS = 6, TH = 0.25, TR = 0.16, POCKETS = 5;
    const plainSpecs = [], variSpecs = [], cupSpecs = [], updates = [];
    const towerGeo = new T.CylinderGeometry(TR, TR * 1.04, TH - 0.012, 28); towerGeo.translate(0, (TH - 0.012) / 2, 0);
    const lipGeo = new T.TorusGeometry(TR * 1.02, 0.012, 8, 32); lipGeo.rotateX(PI / 2);
    const towerM = std(0xd9dbd8, { roughness: 0.55 }), lipM = std(0xeeefec, { roughness: 0.4 });
    const m4 = new T.Matrix4(), q = new T.Quaternion(), roll = new T.Quaternion(), sc = new T.Vector3(), xAx = new T.Vector3(), yAx = new T.Vector3(), zAx = new T.Vector3(), up = V(0, 1, 0);
    spots.forEach(function (spot, k) {
      const def = PILLARS[k % PILLARS.length], plant = PLANTS[def[1]];
      const g = new T.Group(); at(g, spot[0], spot[1] || 0, spot[2]); parent.add(g);
      // gold-rimmed grass pad, white base disc
      const rim = mesh(new T.CylinderGeometry(0.66, 0.67, 0.07, 64), MAT.brass()); rim.position.y = 0.035; g.add(rim);
      const pad = mesh(new T.CylinderGeometry(0.625, 0.625, 0.08, 64), MAT.grass()); pad.position.y = 0.045; g.add(pad);
      const base = mesh(new T.CylinderGeometry(0.36, 0.38, 0.05, 48), MAT.white()); base.position.y = 0.11; g.add(base);
      const y0 = 0.135;
      for (let t = 0; t < TIERS; t++) {
        const tier = mesh(towerGeo, towerM); tier.position.y = y0 + t * TH; g.add(tier);
        const lip = mesh(lipGeo, lipM, false); lip.position.y = y0 + (t + 1) * TH - 0.012; g.add(lip);
        for (let p = 0; p < POCKETS; p++) {
          const a = p / POCKETS * PI * 2 + (t % 2) * PI / POCKETS + k * 0.4;
          const ox = Math.cos(a), oz = Math.sin(a), py = y0 + t * TH + TH * 0.55;
          cupSpecs.push({ x: spot[0] + ox * (TR + 0.02), y: (spot[1] || 0) + py, z: spot[2] + oz * (TR + 0.02), a: a });
          for (let l = 0; l < plant.n; l++) {
            const yaw = a + (l / (plant.n - 1) - 0.5) * 1.7 + (R() - 0.5) * 0.3;
            const rise = plant.rise + (l % 3 === 0 ? 0.45 : l % 3 === 1 ? 0.05 : -0.25) + (R() - 0.5) * 0.2;
            yAx.set(Math.cos(yaw) * Math.cos(rise), Math.sin(rise), Math.sin(yaw) * Math.cos(rise)).normalize();
            zAx.copy(up).addScaledVector(yAx, -up.dot(yAx)).normalize();
            xAx.crossVectors(yAx, zAx);
            m4.makeBasis(xAx, yAx, zAx);
            q.setFromRotationMatrix(m4).multiply(roll.setFromAxisAngle(up, (R() - 0.5) * 1.1));
            const s = 0.85 + R() * 0.35;
            sc.set(plant.wid * s, plant.len * s, plant.len * s);
            const pos = V(spot[0] + ox * (TR + 0.04), (spot[1] || 0) + py + 0.02, spot[2] + oz * (TR + 0.04));
            const shade = 0.82 + R() * 0.3;
            (plant.variegated ? variSpecs : plainSpecs).push({ m: new T.Matrix4().compose(pos, q, sc), c: new T.Color(plant.color).multiplyScalar(shade) });
          }
        }
      }
      // top cap and glowing icon with a soft red halo
      const cap = mesh(new T.CylinderGeometry(TR * 0.9, TR, 0.05, 28), lipM); cap.position.y = y0 + TIERS * TH + 0.02; g.add(cap);
      const iconY = y0 + TIERS * TH + 0.46;
      const icon = ICONS[def[0]](); icon.scale.setScalar(1.45); icon.position.y = iconY; g.add(icon);
      const h = halo(0xff1f36, 1.15, 0.42); h.position.y = iconY; g.add(h);
      const ph = k * 1.1;
      updates.push(function (t) {
        icon.rotation.y = Math.sin(t * 0.55 + ph) * 0.4;
        icon.position.y = iconY + Math.sin(t * 1.1 + ph) * 0.03;
        h.material.opacity = 0.36 + 0.08 * Math.sin(t * 1.7 + ph);
      });
    });
    function instanced(geo, mat, specs) {
      const im = new T.InstancedMesh(geo, mat, specs.length);
      specs.forEach(function (s, i) { im.setMatrixAt(i, s.m); im.setColorAt(i, s.c); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = true; im.receiveShadow = true;
      parent.add(im);
      return im;
    }
    const leafM = std(0xffffff, { vertexColors: true, roughness: 0.55, side: T.DoubleSide, envMapIntensity: 0.8 });
    if (plainSpecs.length) instanced(leafGeo(false), leafM, plainSpecs);
    if (variSpecs.length) instanced(leafGeo(true), leafM, variSpecs);
    const cupGeo = new T.CylinderGeometry(0.05, 0.034, 0.08, 14); cupGeo.rotateZ(-PI / 4);
    instanced(cupGeo, towerM, cupSpecs.map(function (c) { return { m: new T.Matrix4().compose(V(c.x, c.y, c.z), new T.Quaternion().setFromAxisAngle(up, -c.a), V(1, 1, 1)), c: new T.Color(1, 1, 1) }; }));
    return { update: function (t) { updates.forEach(function (u) { u(t); }); } };
  }

  /* ------------------------------------------------------------------ water, stone, planting */
  function waterNormals() {
    return once('waterN', function () {
      const n = 256, waves = [[1, 2, 1], [3, -1, 0.7], [-2, 5, 0.45], [5, 3, 0.35], [-7, -4, 0.25], [9, -6, 0.18], [-4, 11, 0.14], [13, 2, 0.11], [-11, -9, 0.09], [17, -7, 0.07], [6, 19, 0.06], [-21, 5, 0.05]];
      const H = function (x, y) { let h = 0; waves.forEach(function (w) { h += w[2] * Math.sin(2 * PI * (w[0] * x + w[1] * y) / n); }); return h; };
      const t = canvasTex(n, n, function (g) {
        const img = g.createImageData(n, n), v = new T.Vector3();
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          v.set(-(H(x + 1, y) - H(x - 1, y)) * 1.4, -(H(x, y + 1) - H(x, y - 1)) * 1.4, 1).normalize();
          const i = (y * n + x) * 4;
          img.data[i] = (v.x * 0.5 + 0.5) * 255; img.data[i + 1] = (v.y * 0.5 + 0.5) * 255; img.data[i + 2] = (v.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      }, false);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      return t;
    });
  }
  function water(geo, repeat, color) {
    const nm = waterNormals().clone(); nm.needsUpdate = true; nm.repeat.set(repeat, repeat);
    const m = new T.MeshStandardMaterial({ color: color || 0x1f3c3b, roughness: 0.07, metalness: 0.12, normalMap: nm, normalScale: new T.Vector2(0.2, 0.2), envMapIntensity: 1.3 });
    const w = mesh(geo, m, false, true); w.rotation.x = -PI / 2;
    w.userData.tick = function (dt) { nm.offset.x += dt * 0.012; nm.offset.y += dt * 0.007; };
    return w;
  }
  function rocks(parent, list, rng) {
    const R = rng || K.rng(5), variants = [];
    for (let v = 0; v < 3; v++) {
      const g = new T.IcosahedronGeometry(1, 2), p = g.attributes.position, r2 = K.rng(31 + v * 17), off = {};
      for (let i = 0; i < p.count; i++) {
        const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
        const k = off[key] || (off[key] = 0.82 + r2() * 0.3);
        p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i) * k * 0.62, -0.15), p.getZ(i) * k);
      }
      g.computeVertexNormals();
      variants.push({ g: g, list: [] });
    }
    list.forEach(function (r, i) { variants[i % 3].list.push(r); });
    const m = std(0xffffff, { roughness: 0.88 }), d = new T.Object3D(), c = new T.Color();
    variants.forEach(function (v) {
      if (!v.list.length) return;
      const im = new T.InstancedMesh(v.g, m, v.list.length);
      v.list.forEach(function (r, i) {
        d.position.set(r[0], r[1], r[2]); d.rotation.set(0, R() * 6.28, 0); d.scale.set(r[3] * (1 + R() * 0.3), r[3] * (0.8 + R() * 0.3), r[3]); d.updateMatrix();
        im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.setHex([0xa7a196, 0x9a948a, 0xb3ada2, 0x8e8981][Math.floor(R() * 4)]));
      });
      im.castShadow = true; im.receiveShadow = true; parent.add(im);
    });
  }
  // Rounded, manicured shrubs like the garden's clipped bushes.
  function shrubs(parent, list, rng, patch) {
    const R = rng || K.rng(9), geo = new T.IcosahedronGeometry(1, 3), m = std(0xffffff, { roughness: 0.92 });
    if (patch) patch(m, { sway: true });
    const im = new T.InstancedMesh(geo, m, list.length * 3), d = new T.Object3D(), c = new T.Color();
    const greens = [0x4f8a3c, 0x5e9a45, 0x6aa64c, 0x447a36, 0x78ad52];
    let n = 0;
    list.forEach(function (s) {
      const parts = s[3] > 0.5 ? 3 : 1;
      for (let i = 0; i < parts; i++) {
        const r = s[3] * (i ? 0.72 : 1), ox = i ? (R() - 0.5) * s[3] * 1.4 : 0, oz = i ? (R() - 0.5) * s[3] * 1.4 : 0;
        d.position.set(s[0] + ox, s[1] + r * 0.62, s[2] + oz); d.rotation.set(0, R() * 6, 0); d.scale.set(r, r * 0.86, r); d.updateMatrix();
        im.setMatrixAt(n, d.matrix); im.setColorAt(n, c.setHex(greens[Math.floor(R() * greens.length)]).multiplyScalar(0.9 + R() * 0.2)); n++;
      }
    });
    im.count = n; im.castShadow = true; im.receiveShadow = true; parent.add(im);
    return im;
  }
  function lantern() {
    const g = new T.Group(), s = MAT.stone();
    g.add(at(mesh(new T.CylinderGeometry(0.24, 0.28, 0.1, 6), s), 0, 0.05, 0));
    g.add(at(mesh(new T.CylinderGeometry(0.08, 0.1, 0.5, 12), s), 0, 0.35, 0));
    g.add(at(mesh(new T.BoxGeometry(0.4, 0.06, 0.4), s), 0, 0.63, 0));
    g.add(at(mesh(new T.BoxGeometry(0.26, 0.24, 0.26), s), 0, 0.78, 0));
    const glow = mesh(new T.BoxGeometry(0.14, 0.13, 0.272), std(0xffd9a0, { emissive: 0xffb760, emissiveIntensity: 1.8 }), false, false); glow.position.y = 0.78; g.add(glow);
    const glow2 = glow.clone(); glow2.rotation.y = PI / 2; g.add(glow2);
    const roof = mesh(new T.CylinderGeometry(0.02, 0.36, 0.2, 4), s); roof.rotation.y = PI / 4; roof.position.y = 1.0; g.add(roof);
    g.add(at(mesh(new T.SphereGeometry(0.05, 12, 8), s), 0, 1.13, 0));
    return g;
  }
  function bridge(p0, p1, opts) {
    const o = opts || {}, g = new T.Group(), wid = o.width || 1.05, rise = o.rise || 0.75;
    const dir = p1.clone().sub(p0), len = dir.length(); dir.normalize();
    const side = V(-dir.z, 0, dir.x);
    const mid = p0.clone().lerp(p1, 0.5); mid.y = Math.max(p0.y, p1.y) + rise;
    const curve = new T.QuadraticBezierCurve3(p0, mid, p1);
    const slats = Math.round(len / 0.16), d = new T.Object3D();
    const im = new T.InstancedMesh(new T.BoxGeometry(wid, 0.05, 0.13), MAT.wood(), slats);
    for (let i = 0; i < slats; i++) {
      const t = (i + 0.5) / slats, p = curve.getPoint(t), tg = curve.getTangent(t);
      d.position.copy(p); d.lookAt(p.clone().add(tg)); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    }
    im.castShadow = true; im.receiveShadow = true; g.add(im);
    // dark steel arch stringers beneath, light-wood rails above
    [-1, 1].forEach(function (sgn) {
      const off = side.clone().multiplyScalar(sgn * wid * 0.45);
      const pts = []; for (let i = 0; i <= 20; i++) pts.push(curve.getPoint(i / 20).add(off).add(V(0, -0.06, 0)));
      g.add(tube(pts, 0.055, MAT.steel(), 40, 8));
      const rail = []; for (let i = 0; i <= 20; i++) rail.push(curve.getPoint(i / 20).add(off).add(V(0, 0.62, 0)));
      g.add(tube(rail, 0.03, MAT.wood(), 40, 8));
      const posts = Math.round(len / 0.32), pm = new T.InstancedMesh(new T.BoxGeometry(0.04, 0.62, 0.04), MAT.wood(), posts + 1);
      for (let i = 0; i <= posts; i++) { const p = curve.getPoint(i / posts).add(off); d.position.set(p.x, p.y + 0.31, p.z); d.rotation.set(0, 0, 0); d.updateMatrix(); pm.setMatrixAt(i, d.matrix); }
      pm.castShadow = true; g.add(pm);
    });
    return g;
  }
  function bonsai(rng) {
    const R = rng || K.rng(3), g = new T.Group();
    const pts = [V(0, 0, 0), V(0.22, 0.35, 0.05), V(-0.12, 0.75, 0.1), V(0.28, 1.12, -0.05), V(0.6, 1.38, 0.08)];
    g.add(tube(pts, 0.085, MAT.bark(), 40, 10));
    g.add(tube([pts[2], V(-0.45, 0.95, 0.05), V(-0.75, 1.05, 0.15)], 0.045, MAT.bark(), 16, 6));
    const padM = std(0x3f6e34, { roughness: 0.95, flatShading: true }), geo = new T.IcosahedronGeometry(1, 1);
    [[0.6, 1.5, 0.08, 0.55], [-0.78, 1.15, 0.15, 0.42], [0.25, 1.25, -0.25, 0.38], [0.05, 1.7, 0.05, 0.36]].forEach(function (p) {
      for (let i = 0; i < 4; i++) { const b = mesh(geo, padM); b.position.set(p[0] + (R() - 0.5) * p[3], p[1] + (R() - 0.5) * 0.08, p[2] + (R() - 0.5) * p[3] * 0.7); b.scale.set(p[3] * 0.55, p[3] * 0.24, p[3] * 0.5); g.add(b); }
    });
    return g;
  }
  function plankTexture(base, line) {
    return once('planks' + base, function () {
      const t = canvasTex(256, 256, function (g) {
        g.fillStyle = base; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 32) { g.fillStyle = line; g.fillRect(0, y, 256, 3); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y + 3, 256, 6); }
        for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(60,35,20,' + (0.05 + Math.random() * 0.06) + ')'; g.fillRect(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 60, 1.5); }
      });
      t.wrapS = t.wrapT = T.RepeatWrapping;
      return t;
    });
  }
  function treehouse(rng) {
    const R = rng || K.rng(8), g = new T.Group();
    g.add(mesh(new T.CylinderGeometry(0.32, 0.5, 6.2, 14).translate(0, 3.1, 0), MAT.bark()));
    [[1.2, 4.6, 0.4], [-1.1, 5.0, -0.3], [0.2, 5.6, -1.0], [-0.4, 4.3, 1.0]].forEach(function (b) { g.add(tube([V(0, b[1] - 0.8, 0), V(b[0] * 0.5, b[1] - 0.2, b[2] * 0.5), V(b[0], b[1], b[2])], 0.09, MAT.bark(), 12, 6)); });
    const leafM = std(0x4f8a3c, { roughness: 0.95, flatShading: true }), leaf = new T.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 11; i++) { const a = R() * 6.28, r = 0.6 + R() * 1.3, b = mesh(leaf, leafM); b.position.set(Math.cos(a) * r, 5.4 + R() * 1.2, Math.sin(a) * r); b.scale.setScalar(0.7 + R() * 0.55); g.add(b); }
    const planks = plankTexture('#a8794d', '#6e4a2e'), wallM = std(0xffffff, { map: planks, roughness: 0.75 });
    const cabin = new T.Group(); at(cabin, 0.35, 2.45, 0.5); g.add(cabin);
    cabin.add(at(mesh(new T.BoxGeometry(3.0, 0.12, 2.7), MAT.woodDark()), 0, -0.06, 0));
    cabin.add(at(mesh(new T.BoxGeometry(2.2, 1.65, 1.9), wallM), 0, 0.83, -0.25));
    cabin.add(at(mesh(new T.BoxGeometry(2.45, 0.1, 2.15), MAT.woodDark()), 0, 1.7, -0.25));
    const glass = std(0x1c2a33, { roughness: 0.15, metalness: 0.4 }), frame = std(0xe8e0d2, { roughness: 0.5 });
    [-0.55, 0.55].forEach(function (x) { cabin.add(at(mesh(new T.BoxGeometry(0.62, 0.55, 0.04), frame), x, 1.0, 0.71)); cabin.add(at(mesh(new T.BoxGeometry(0.52, 0.45, 0.05), glass), x, 1.0, 0.72)); });
    const posts = new T.InstancedMesh(new T.BoxGeometry(0.05, 0.55, 0.05), MAT.wood(), 26), d = new T.Object3D(); let n = 0;
    for (let i = 0; i <= 12; i++) { d.position.set(-1.45 + i * 0.242, 0.28, 1.3); d.updateMatrix(); posts.setMatrixAt(n++, d.matrix); }
    for (let i = 0; i <= 12; i++) { d.position.set(1.45, 0.28, -1.3 + i * 0.2); d.updateMatrix(); posts.setMatrixAt(n++, d.matrix); }
    posts.count = n; cabin.add(posts);
    cabin.add(at(mesh(new T.BoxGeometry(2.95, 0.05, 0.06), MAT.wood()), 0, 0.56, 1.3));
    cabin.add(at(mesh(new T.BoxGeometry(0.06, 0.05, 2.6), MAT.wood()), 1.45, 0.56, 0));
    // straight stair to the deck
    const steps = new T.InstancedMesh(new T.BoxGeometry(0.75, 0.05, 0.26), MAT.wood(), 12);
    for (let i = 0; i < 12; i++) { d.position.set(2.05 + i * 0.2, 2.35 - (i + 1) * 0.19, 1.05); d.updateMatrix(); steps.setMatrixAt(i, d.matrix); }
    steps.castShadow = true; g.add(steps);
    [0.67, 1.43].forEach(function (z) { g.add(tube([V(1.95, 2.45, z), V(4.45, 0, z)], 0.035, MAT.woodDark(), 2, 6)); });
    return g;
  }

  /* ------------------------------------------------------------------ main-garden landmarks */
  // Glass-arch greenhouse: white arch band with portholes, solar-glass vault tapering back, timber interior.
  function greenhouse() {
    const g = new T.Group(), a = 6.6, b = 4.0, t = 0.75, dep = 0.55, D = 8.5;
    const sh = new T.Shape();
    sh.absellipse(0, 0, a, b, 0, PI, false);
    sh.lineTo(-(a - t), 0);
    sh.absellipse(0, 0, a - t, b - t, PI, 0, true);
    sh.lineTo(a, 0);
    const holes = [];
    for (let k = 0; k < 9; k++) {
      const th = PI * (0.1 + 0.8 * k / 8), cx = (a - t / 2) * Math.cos(th), cy = (b - t / 2) * Math.sin(th);
      const h = new T.Path(); h.absarc(cx, cy, 0.24, 0, PI * 2, true); sh.holes.push(h); holes.push([cx, cy]);
    }
    const bandGeo = new T.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 72 });
    bandGeo.translate(0, 0, -dep / 2);
    g.add(mesh(bandGeo, std(0xf6f7f5, { roughness: 0.26 })));
    const ringM = std(0x2f373d, { roughness: 0.35, metalness: 0.4 }), portM = std(0x3a4a56, { roughness: 0.18, metalness: 0.5 }), hubM = std(0x9aa3a8, { roughness: 0.4 });
    holes.forEach(function (p) {
      const r = mesh(new T.TorusGeometry(0.235, 0.04, 10, 40), ringM, false); r.position.set(p[0], p[1], dep / 2 + 0.02); g.add(r);
      const d = mesh(new T.CircleGeometry(0.21, 32), portM, false); d.position.set(p[0], p[1], 0); g.add(d);
      const hub = mesh(new T.TorusGeometry(0.1, 0.018, 8, 28), hubM, false); hub.position.set(p[0], p[1], 0.02); g.add(hub);
    });
    // vault: parametric shell from the arch midline, tapering in height and width towards the back
    const ar = a - t * 0.5, br = b - t * 0.5, nu = 72, nv = 18, pos = [], uv = [], idx = [];
    const sy = function (v) { return 1 - 0.42 * Math.pow(v, 1.3); }, sx = function (v) { return 1 - 0.12 * v; };
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const th = PI * i / nu;
        pos.push(ar * sx(v) * Math.cos(th), br * sy(v) * Math.sin(th), -dep / 2 - v * D);
        uv.push(i / nu * 18, v * 8);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const p0 = j * (nu + 1) + i; idx.push(p0, p0 + nu + 1, p0 + 1, p0 + 1, p0 + nu + 1, p0 + nu + 2); }
    const vg = new T.BufferGeometry(); vg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); vg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); vg.setIndex(idx); vg.computeVertexNormals();
    const grid = once('solarGrid', function () {
      const tx = canvasTex(128, 128, function (c) {
        const gr = c.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#7fa4c8'); gr.addColorStop(1, '#55799e');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(8, 8, 50, 112);
        c.fillStyle = '#22344a'; c.fillRect(0, 0, 128, 6); c.fillRect(0, 0, 6, 128);
      });
      tx.wrapS = tx.wrapT = T.RepeatWrapping;
      return tx;
    });
    g.add(mesh(vg, std(0xffffff, { map: grid, roughness: 0.22, metalness: 0.45, side: T.DoubleSide, envMapIntensity: 1.25 })));
    // white ribs along the vault
    [0.22, 0.5, 0.78].forEach(function (u) {
      const pts = []; for (let j = 0; j <= 12; j++) { const v = j / 12, th = PI * u; pts.push(V(ar * sx(v) * Math.cos(th) * 1.004, br * sy(v) * Math.sin(th) * 1.004, -dep / 2 - v * D)); }
      g.add(tube(pts, 0.07, MAT.white(), 24, 8));
    });
    const backShape = new T.Shape(); backShape.absellipse(0, 0, ar * sx(1), br * sy(1), 0, PI, false); backShape.lineTo(ar * sx(1), 0);
    g.add(at(mesh(new T.ShapeGeometry(backShape, 40), std(0x8fb0c4, { roughness: 0.15, metalness: 0.35, side: T.DoubleSide, envMapIntensity: 1.2 })), 0, 0, -dep / 2 - D));
    [-3, -1.5, 0, 1.5, 3].forEach(function (x) { const hh = br * sy(1) * Math.sqrt(Math.max(0, 1 - Math.pow(x / (ar * sx(1)), 2))); g.add(at(mesh(new T.BoxGeometry(0.12, hh, 0.12).translate(0, hh / 2, 0), std(0xa97448, { roughness: 0.6 })), x, 0, -dep / 2 - D + 0.08)); });
    // timber columns under the arch, floor and the round plaza in front
    const colM = std(0xa97448, { roughness: 0.6 });
    [-4.4, -2.2, 0, 2.2, 4.4].forEach(function (x) {
      const h = (b - t) * Math.sqrt(Math.max(0, 1 - Math.pow(x / (a - t), 2)));
      g.add(at(mesh(new T.BoxGeometry(0.24, h, 0.24).translate(0, h / 2, 0), colM), x, 0, -1.1));
    });
    g.add(at(mesh(new T.BoxGeometry(2 * a - 0.4, 0.06, D), std(0xd9d3c6, { roughness: 0.8 }), false), 0, 0.03, -dep / 2 - D / 2));
    const plaza = mesh(new T.CylinderGeometry(3.7, 3.7, 0.06, 72), std(0xe2ded6, { roughness: 0.85 }), false); plaza.position.set(0, 0.03, 4.0); g.add(plaza);
    const seat = mesh(new T.TorusGeometry(1.3, 0.16, 10, 64), std(0xcfc9be, { roughness: 0.7 })); seat.rotation.x = PI / 2; seat.position.set(0, 0.2, 4.0); g.add(seat);
    g.add(at(mesh(new T.CylinderGeometry(0.45, 0.5, 0.2, 32), MAT.stone()), 0, 0.1, 4.0));
    return g;
  }
  // Waterfall pavilion: white monolith whose facade is a row of falling water curtains, with a rainbow in the spray.
  function waterfallPavilion() {
    const g = new T.Group(), white = MAT.white(), ticks = [];
    g.add(K.rbox(7.4, 2.75, 3.2, 0.3, white));
    g.add(at(K.rbox(7.9, 0.26, 3.7, 0.12, white), 0, 2.72, 0.12));
    [-3.3, -1.65, 0, 1.65, 3.3].forEach(function (x) { g.add(at(K.rbox(0.32, 2.85, 0.6, 0.08, white), x, 0, 1.75)); });
    const streaks = once('streaks', function () {
      const tx = canvasTex(64, 256, function (c) {
        c.fillStyle = 'rgba(235,247,252,.82)'; c.fillRect(0, 0, 64, 256);
        for (let i = 0; i < 70; i++) { const x = Math.random() * 64, w = 1 + Math.random() * 3; c.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.random() * 0.6) + ')'; c.fillRect(x, Math.random() * 256, w, 40 + Math.random() * 160); }
      });
      tx.wrapS = tx.wrapT = T.RepeatWrapping;
      return tx;
    });
    [-2.47, -0.82, 0.82, 2.47].forEach(function (x, i) {
      const tx = streaks.clone(); tx.needsUpdate = true; tx.repeat.set(1.3, 1.2); tx.offset.x = i * 0.31;
      const sheet = new T.Mesh(new T.PlaneGeometry(1.3, 2.62), new T.MeshBasicMaterial({ map: tx, color: 0xf4fbff, transparent: true, opacity: 0.97, depthWrite: false }));
      sheet.position.set(x, 1.33, 1.72); sheet.renderOrder = 2; g.add(sheet);
      ticks.push(function (dt) { tx.offset.y += dt * (1.05 + i * 0.07); });
      const foam = mesh(new T.SphereGeometry(1, 16, 10), std(0xf4fbff, { roughness: 0.9 }), false); foam.scale.set(0.78, 0.2, 0.42); foam.position.set(x, 0.05, 2.05); g.add(foam);
    });
    const rainbow = once('rainbow', function () {
      return canvasTex(256, 256, function (c) {
        const r = c.createRadialGradient(128, 128, 128 * 0.72, 128, 128, 128);
        ['rgba(140,60,220,0)', 'rgba(140,60,220,.8)', 'rgba(40,110,255,.8)', 'rgba(40,200,90,.8)', 'rgba(255,230,40,.8)', 'rgba(255,140,30,.8)', 'rgba(235,40,40,.8)', 'rgba(235,40,40,0)'].forEach(function (s, i, arr) { r.addColorStop(i / (arr.length - 1), s); });
        c.fillStyle = r; c.fillRect(0, 0, 256, 256);
      });
    });
    const rb = new T.Mesh(new T.RingGeometry(0.88, 1.25, 48, 1, 0, PI), new T.MeshBasicMaterial({ map: rainbow, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    rb.position.set(3.0, 0.02, 2.35); rb.rotation.y = -0.25; rb.renderOrder = 3; g.add(rb);
    const mist = halo(0xffffff, 3.2, 0.35); mist.position.set(0.5, 0.35, 2.3); g.add(mist);
    g.userData.tick = function (dt) { ticks.forEach(function (f) { f(dt); }); };
    return g;
  }
  function sailboat() {
    const g = new T.Group();
    const hull = new T.Shape(); hull.moveTo(-0.75, 0); hull.quadraticCurveTo(-0.7, -0.32, 0, -0.34); hull.quadraticCurveTo(0.8, -0.3, 1.0, 0.02); hull.lineTo(-0.75, 0);
    const hg = new T.ExtrudeGeometry(hull, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 16 }); hg.translate(0, 0.2, -0.3);
    g.add(mesh(hg, MAT.white()));
    g.add(at(mesh(new T.CylinderGeometry(0.03, 0.035, 2.3, 10).translate(0, 1.15, 0), MAT.white()), 0, 0.18, 0));
    const tri = function (pts, color) { const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); s.lineTo(pts[1][0], pts[1][1]); s.lineTo(pts[2][0], pts[2][1]); s.lineTo(pts[0][0], pts[0][1]); return mesh(new T.ShapeGeometry(s), std(color, { side: T.DoubleSide, roughness: 0.85 })); };
    g.add(at(tri([[0.04, 0.35], [0.04, 2.4], [-0.95, 0.38]], 0xf7f7f4), 0, 0, 0.01));
    g.add(at(tri([[-0.42, 0.37], [-0.42, 1.35], [-0.95, 0.38]], 0xd31c34), 0, 0, 0.02));
    g.add(at(tri([[0.1, 0.4], [0.1, 2.15], [0.95, 0.42]], 0xc81130), 0, 0, -0.01));
    const pole = mesh(new T.CylinderGeometry(0.025, 0.025, 1.0, 8), MAT.white()); pole.rotation.z = PI / 2; pole.position.set(-0.47, 0.37, 0); g.add(pole);
    return g;
  }
  // Tree of light: luminous white trunk and branches with a sparkling crown.
  function glowTree(rng) {
    const R = rng || K.rng(21), g = new T.Group();
    const lm = std(0xe4f7ff, { emissive: 0x9fe6ff, emissiveIntensity: 1.6, roughness: 0.4 });
    g.add(tube([V(0, 0, 0), V(0.08, 0.8, 0), V(-0.05, 1.6, 0.05), V(0.02, 2.1, 0)], 0.11, lm, 24, 10));
    const tips = [];
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * PI * 2 + R() * 0.4, l = 1.1 + R() * 0.8, y = 1.6 + R() * 0.5;
      const tip = V(Math.cos(a) * l, y + 0.8 + R() * 0.8, Math.sin(a) * l * 0.8);
      g.add(tube([V(0, y, 0), V(Math.cos(a) * l * 0.45, y + 0.5, Math.sin(a) * l * 0.35), tip], 0.045, lm, 16, 6));
      tips.push(tip);
    }
    const N = 1100, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const tp = tips[i % tips.length], u = R() * 6.28, v = Math.acos(2 * R() - 1), r = Math.pow(R(), 0.6) * 1.1;
      pos[i * 3] = tp.x * 0.85 + Math.sin(v) * Math.cos(u) * r * 1.3; pos[i * 3 + 1] = tp.y - 0.1 + Math.cos(v) * r * 0.7; pos[i * 3 + 2] = tp.z * 0.85 + Math.sin(v) * Math.sin(u) * r * 1.1;
      seed[i] = R();
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
    const pts = new T.Points(geo, new T.ShaderMaterial({
      uniforms: { uTime: time, uScale: { value: 300 } },
      vertexShader: 'attribute float aSeed;uniform float uTime,uScale;varying float vA;varying float vS;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;vA=.55+.45*sin(uTime*(1.2+aSeed*2.5)+aSeed*40.);vS=aSeed;gl_PointSize=(1.2+aSeed*2.2)*uScale/-mv.z;}',
      fragmentShader: 'varying float vA;varying float vS;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;vec3 c=mix(vec3(.75,.95,1.),vec3(1.),vS);gl_FragColor=vec4(c*a*vA*2.6,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
      transparent: true, depthWrite: false, blending: T.AdditiveBlending
    }));
    pts.frustumCulled = false; pts.renderOrder = 6; g.add(pts);
    g.userData.points = pts;
    return g;
  }
  function cherryTree(rng) {
    const R = rng || K.rng(13), g = new T.Group(), bark = std(0x4b3832, { roughness: 0.9 });
    g.add(tube([V(0, 0, 0), V(0.12, 0.7, 0.05), V(-0.05, 1.35, 0)], 0.17, bark, 16, 10));
    const ends = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * PI * 2 + R() * 0.5, l = 1.3 + R() * 0.9, up = 0.7 + R() * 0.7;
      const e = V(Math.cos(a) * l, 1.35 + up, Math.sin(a) * l);
      g.add(tube([V(0, 1.25, 0), V(Math.cos(a) * l * 0.5, 1.5 + up * 0.6, Math.sin(a) * l * 0.5), e], 0.07, bark, 12, 6));
      ends.push(e);
    }
    const pinks = [0xf4c6de, 0xe9a7cd, 0xdca3d8, 0xf8dcea, 0xcf95cb, 0xf1b9d6], d = new T.Object3D(), c = new T.Color();
    const im = new T.InstancedMesh(new T.IcosahedronGeometry(1, 2), std(0xffffff, { roughness: 0.85 }), ends.length * 13 + 12); let n = 0;
    ends.concat([V(0, 2.9, 0)]).forEach(function (e) {
      for (let i = 0; i < 12 && n < im.count; i++) {
        const s = 0.28 + R() * 0.3; d.position.set(e.x + (R() - 0.5) * 1.25, e.y + (R() - 0.3) * 0.65, e.z + (R() - 0.5) * 1.25); d.scale.set(s, s * 0.8, s); d.updateMatrix();
        im.setMatrixAt(n, d.matrix); im.setColorAt(n, c.setHex(pinks[Math.floor(R() * pinks.length)])); n++;
      }
    });
    im.count = n; im.castShadow = true; im.receiveShadow = true; g.add(im);
    const petals = once('petals', function () { return canvasTex(128, 128, function (cx) { for (let i = 0; i < 420; i++) { const r = Math.sqrt(Math.random()) * 60, a = Math.random() * 6.28; cx.fillStyle = 'rgba(240,170,205,' + (0.35 + Math.random() * 0.5) * (1 - r / 64) + ')'; cx.beginPath(); cx.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1.2 + Math.random() * 1.4, 0, 7); cx.fill(); } }); });
    const carpet = new T.Mesh(new T.PlaneGeometry(5.2, 5.2), new T.MeshStandardMaterial({ map: petals, transparent: true, depthWrite: false, roughness: 0.9 }));
    carpet.rotation.x = -PI / 2; carpet.position.y = 0.02; carpet.receiveShadow = true; g.add(carpet);
    return g;
  }
  function takedaFlag() {
    const g = new T.Group();
    g.add(mesh(new T.CylinderGeometry(0.05, 0.07, 4.9, 12).translate(0, 2.45, 0), std(0xf0f0ee, { roughness: 0.3, metalness: 0.4 })));
    g.add(at(mesh(new T.SphereGeometry(0.1, 16, 10), MAT.brass()), 0, 4.95, 0));
    const tex = canvasTex(512, 330, function (c, w, h) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); });
    if (/^https?:$/.test(location.protocol)) {
      const img = new Image();
      img.onload = function () { const c = tex.image.getContext('2d'), iw = 360, ih = iw * img.height / img.width; c.drawImage(img, (512 - iw) / 2, (330 - ih) / 2, iw, ih); tex.needsUpdate = true; };
      img.src = 'assets/takeda-logo.png';
    }
    const geo = new T.PlaneGeometry(2.2, 1.42, 22, 10); geo.translate(1.1, 0, 0);
    const base = geo.attributes.position.array.slice();
    const flag = mesh(geo, std(0xffffff, { map: tex, side: T.DoubleSide, roughness: 0.8 }));
    flag.position.set(0.04, 4.15, 0); flag.userData.noBatch = true; g.add(flag);
    g.userData.tick = function (dt, t) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], k = x / 2.2; p.setZ(i, Math.sin(x * 2.4 - t * 3.1) * 0.13 * k + Math.sin(y * 2 + t * 1.9) * 0.035 * k); }
      p.needsUpdate = true; geo.computeVertexNormals();
    };
    return g;
  }
  function compassPlaza() {
    const g = new T.Group();
    g.add(at(mesh(new T.CylinderGeometry(1.75, 1.75, 0.05, 64), std(0xe8e5de, { roughness: 0.85 }), false), 0, 0.025, 0));
    g.add(at(mesh(new T.CylinderGeometry(1.4, 1.4, 0.07, 64), MAT.grass(), false), 0, 0.035, 0));
    g.add(at(mesh(new T.CylinderGeometry(0.95, 1.0, 0.3, 64), std(0xcfcbc3, { roughness: 0.6 })), 0, 0.15, 0));
    const star = new T.Shape();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 0.2 : (i % 4 === 0 ? 0.85 : 0.55), a = i / 16 * PI * 2; if (i) star.lineTo(Math.cos(a) * r, Math.sin(a) * r); else star.moveTo(r, 0); }
    const sg = new T.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }); sg.rotateX(-PI / 2);
    g.add(at(mesh(sg, std(0x6b737a, { roughness: 0.45, metalness: 0.3 })), 0, 0.3, 0));
    return g;
  }
  function umbrellaPine(h, rng) {
    const R = rng || K.rng(4), g = new T.Group(), m = std(0x3d6a3a, { roughness: 0.95, flatShading: true }), geo = new T.IcosahedronGeometry(1, 1);
    g.add(mesh(new T.CylinderGeometry(0.1, 0.17, h, 8).translate(0, h / 2, 0), MAT.bark()));
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2, r = i ? 0.9 : 0, b = mesh(geo, m); b.position.set(Math.cos(a) * r, h + (i ? -0.15 : 0.15), Math.sin(a) * r); b.scale.set(1.0 + R() * 0.3, 0.32, 1.0 + R() * 0.3); g.add(b); }
    return g;
  }

  /* ------------------------------------------------------------------ compositions */
  const worlds = {};
  function sweep(fn) { const out = []; fn(out); return out; }
  // Closing chapter: the capability island becomes the pillar garden in a pond, as in the Takeda Garden render.
  function flywheelWorld(o) {
    const layer = o.layer, R = o.rand, ticks = [], waterY = -0.3, bankY = -0.2, pondR = 12.8, islandR = 8.4;
    const w = water(new T.CircleGeometry(pondR + 0.5, 128), 5.5, 0x24474a); w.position.y = waterY; layer.add(w); ticks.push(w.userData.tick);
    // gold rim around the island, like the brass edge of the garden's gravel island (kept out of camera framing)
    const rim = mesh(new T.TorusGeometry(islandR - 0.03, 0.05, 10, 256), MAT.brass(), false); rim.rotation.x = PI / 2; rim.position.y = 0.012; layer.add(rim);
    layer.add(at(mesh(new T.CylinderGeometry(islandR + 0.012, islandR + 0.012, 0.16, 256, 1, true), MAT.brass(), false), 0, -0.07, 0));
    const shore = mesh(new T.RingGeometry(pondR - 0.2, pondR + 0.55, 160, 1), std(0x847a68, { roughness: 0.95 }), false); shore.rotation.x = -PI / 2; shore.position.y = bankY + 0.004; layer.add(shore);
    const bridgeAngles = [-PI / 2 - 0.62, -PI / 2 + 0.62];
    const nearBridge = function (a) { return bridgeAngles.some(function (b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.12; }); };
    rocks(layer, sweep(function (out) {
      for (let i = 0; i < 70; i++) { const a = i / 70 * PI * 2 + R() * 0.05; if (nearBridge(a)) continue; const r = pondR + (R() - 0.4) * 0.6; out.push([Math.cos(a) * r, bankY - 0.06, Math.sin(a) * r, 0.18 + R() * 0.34]); }
      for (let i = 0; i < 9; i++) { const a = -PI / 2 + (R() - 0.5) * 2.4; if (nearBridge(a)) continue; const r = islandR + 0.8 + R() * 2.2; out.push([Math.cos(a) * r, waterY - 0.05, Math.sin(a) * r, 0.18 + R() * 0.22]); }
    }), R);
    bridgeAngles.forEach(function (a, i) {
      const c = Math.cos(a), s = Math.sin(a);
      layer.add(bridge(V(c * (islandR - 0.15), 0.0, s * (islandR - 0.15)), V(c * (pondR + 0.7), bankY, s * (pondR + 0.7)), { rise: 0.62 }));
      const side = V(-s, 0, c);
      [-1, 1].forEach(function (k) { const l = lantern(); l.position.set(c * (pondR + 1.2) + side.x * k * 0.95, bankY, s * (pondR + 1.2) + side.z * k * 0.95); l.scale.setScalar(0.95); layer.add(l); });
      void i;
    });
    [[-PI / 2, 14.2, 1.55], [-PI / 2 - 1.25, 13.9, 1.35], [-PI / 2 + 1.3, 14.0, 1.45], [-PI / 2 + 0.3, 15.6, 1.2]].forEach(function (b) {
      const t = bonsai(R); t.position.set(Math.cos(b[0]) * b[1], bankY, Math.sin(b[0]) * b[1]); t.scale.setScalar(b[2]); t.rotation.y = R() * 6; layer.add(t);
      rocks(layer, [[t.position.x, bankY, t.position.z, 0.42]], R);
    });
    const th = treehouse(R), ta = -PI / 2 - 1.02, tr = 17.2; th.position.set(Math.cos(ta) * tr, bankY, Math.sin(ta) * tr); th.rotation.y = Math.atan2(-th.position.x, -th.position.z) + 0.35; layer.add(th);
    shrubs(layer, sweep(function (out) {
      for (let i = 0; i < 64; i++) { const a = R() * PI * 2; if (nearBridge(a)) continue; const r = pondR + 1.4 + R() * 3.6; out.push([Math.cos(a) * r, bankY, Math.sin(a) * r, 0.35 + R() * 0.55]); }
    }), R, o.patch);
    return {
      groundY: bankY, pondR: pondR,
      blocked: function (x, z, tall) { const r = Math.hypot(x, z); return tall ? r < 19.5 : r < 17.2; },
      update: function (t, dt) { ticks.forEach(function (f) { f(dt, t); }); }
    };
  }
  // Opening chapter: main-garden landmarks behind the connected campus.
  function campusWorld(o) {
    const layer = o.layer, gy = o.gy, R = o.rand, ticks = [];
    const gh = greenhouse(); at(gh, 12.8, gy, -18.5, -0.42); layer.add(gh);
    const wf = waterfallPavilion(); at(wf, -20.5, gy, -19.5, 0.5); layer.add(wf); ticks.push(wf.userData.tick);
    const pond = water(new T.CircleGeometry(4.2, 96), 2, 0x26494a); pond.scale.set(1.35, 1, 1); pond.position.set(-17.6, gy + 0.025, -14.6); layer.add(pond); ticks.push(pond.userData.tick);
    rocks(layer, sweep(function (out) { for (let i = 0; i < 34; i++) { const a = i / 34 * PI * 2; if (a > 3.6 && a < 5.0) continue; out.push([-17.6 + Math.cos(a) * 5.75, gy, -14.6 + Math.sin(a) * 4.25, 0.18 + R() * 0.3]); } }), R);
    const boat = sailboat(); boat.scale.setScalar(0.95); at(boat, -16.2, gy + 0.03, -13.6, 0.45); layer.add(boat);
    ticks.push(function (dt, t) { boat.position.y = gy + 0.03 + Math.sin(t * 1.3) * 0.03; boat.rotation.z = Math.sin(t * 0.9) * 0.04; boat.position.x = -16.2 + Math.sin(t * 0.12) * 0.6; });
    const gt = glowTree(R); at(gt, -2.0, gy, -15.8); layer.add(gt);
    const flag = takedaFlag(); at(flag, 2.9, gy, -14.2); layer.add(flag); ticks.push(flag.userData.tick);
    [[-25.0, -10.6, 1.0], [24.5, -10.8, 1.0], [-10.5, -23.5, 0.9]].forEach(function (c) { const t = cherryTree(R); at(t, c[0], gy, c[1], R() * 6); t.scale.setScalar(c[2]); layer.add(t); });
    const compass = compassPlaza(); at(compass, 1.6, gy, -13.4); layer.add(compass);
    const pines = [[-6.5, -26.5, 4.6], [3.2, -28.5, 5.2], [20.5, -27.5, 4.8], [-28.5, -24.5, 5.0], [27.5, -21.5, 4.4]];
    pines.forEach(function (p) { layer.add(at(umbrellaPine(p[2], R), p[0], gy, p[1])); });
    const path = new T.CatmullRomCurve3([V(-11.5, 0, -10.6), V(-9.5, 0, -11.6), V(-6.5, 0, -12.6), V(-2.0, 0, -13.9), V(0.2, 0, -13.4), V(3.4, 0, -13.2), V(7.2, 0, -14.0), V(10.2, 0, -14.4)]);
    const ribbon = K.ribbon(path, 1.0, std(0xeeece6, { roughness: 0.82 }), 160, gy + 0.018); layer.add(ribbon);
    shrubs(layer, sweep(function (out) {
      for (let i = 0; i <= 60; i++) { const u = i / 60, p = path.getPointAt(u), tg = path.getTangentAt(u); if (R() < 0.45) continue; const sgn = R() > 0.5 ? 1 : -1; out.push([p.x - tg.z * sgn * (1.05 + R() * 0.5), gy, p.z + tg.x * sgn * (1.05 + R() * 0.5), 0.28 + R() * 0.38]); }
      // round clipped hedges framing the greenhouse plaza and flanks (greenhouse-local coordinates)
      const ghw = function (x, z) { const c = Math.cos(-0.42), s = Math.sin(-0.42); return [12.8 + x * c + z * s, -18.5 - x * s + z * c]; };
      for (let i = 0; i < 14; i++) { const a = i / 13 * PI * 1.25 - PI * 0.85; if (Math.abs(a + PI / 2) < 0.4) continue; const p = ghw(Math.cos(a) * 4.5, 4.0 - Math.sin(a) * 4.5); out.push([p[0], gy, p[1], 0.38 + R() * 0.3]); }
      for (let i = 0; i < 8; i++) { const sgn = i % 2 ? 1 : -1, p = ghw(sgn * (7.2 + R() * 0.5), -1 - (i >> 1) * 1.8); out.push([p[0], gy, p[1], 0.5 + R() * 0.35]); }
      for (let i = 0; i < 12; i++) { const a = R() * PI * 2; out.push([-17.6 + Math.cos(a) * 7.0, gy, -14.6 + Math.sin(a) * 5.2, 0.35 + R() * 0.45]); }
      for (let i = 0; i < 26; i++) out.push([-26 + R() * 52, gy, -9.6 - R() * 2.2, 0.3 + R() * 0.4]);
    }), R, o.patch);
    const lan = lantern(); at(lan, -12.4, gy, -11.6); layer.add(lan);
    return {
      groundY: gy,
      blocked: function (x, z, tall) { return tall ? (z < -8 && z > -30.5 && Math.abs(x) < 28) : (z < -9 && z > -30 && Math.abs(x) < 27); },
      update: function (t, dt, scale) { if (gt.userData.points) gt.userData.points.material.uniforms.uScale.value = scale || 300; ticks.forEach(function (f) { f(dt, t); }); }
    };
  }

  /* ------------------------------------------------------------------ chapter vignettes (pages 2–10)
     Each middle chapter sits in the same Takeda Garden: a paved terrace around the plinth, flower beds
     framing the front corners, and one recognisable garden landmark in a visible back pocket. */
  function flowerBed(w, d, rng, palette) {
    const R = rng || K.rng(2), g = new T.Group();
    const bed = K.rbox(w, 0.22, d, Math.min(w, d) * 0.4, std(0x5f8f43, { roughness: 0.95 })); g.add(bed);
    const n = Math.round(w * d * 26), im = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), std(0xffffff, { roughness: 0.7 }), n), dm = new T.Object3D(), c = new T.Color();
    const cols = palette || [0xf2b8d2, 0xffffff, 0xe7a1c4, 0xf6d36b, 0xd9e8ff];
    for (let i = 0; i < n; i++) {
      dm.position.set((R() - 0.5) * (w - 0.18), 0.22 + R() * 0.05, (R() - 0.5) * (d - 0.18)); dm.scale.setScalar(0.035 + R() * 0.03); dm.updateMatrix();
      im.setMatrixAt(i, dm.matrix); im.setColorAt(i, c.setHex(cols[Math.floor(R() * cols.length)]));
    }
    im.castShadow = false; im.receiveShadow = true; g.add(im);
    return g;
  }
  function steppingStones(points, rng, y) {
    const R = rng || K.rng(6), curve = new T.CatmullRomCurve3(points), n = Math.max(4, Math.round(curve.getLength() / 0.75));
    const im = new T.InstancedMesh(new T.CylinderGeometry(1, 1.05, 1, 20), std(0xd8d2c6, { roughness: 0.85 }), n), dm = new T.Object3D();
    for (let i = 0; i < n; i++) { const p = curve.getPointAt((i + 0.5) / n); dm.position.set(p.x + (R() - 0.5) * 0.12, (y || 0) + 0.03, p.z + (R() - 0.5) * 0.12); dm.scale.set(0.28 + R() * 0.06, 0.06, 0.24 + R() * 0.06); dm.rotation.y = R() * 3; dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }
    im.receiveShadow = true; return im;
  }
  function gravelBed(w, d) {
    const tex = once('gravel', function () {
      const t = canvasTex(256, 256, function (c) {
        c.fillStyle = '#cfc8b8'; c.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2600; i++) { c.fillStyle = 'rgba(' + (150 + Math.random() * 80 | 0) + ',' + (145 + Math.random() * 75 | 0) + ',' + (135 + Math.random() * 70 | 0) + ',.5)'; c.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
        c.strokeStyle = 'rgba(120,110,95,.28)'; c.lineWidth = 2; for (let y = 6; y < 256; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      });
      t.wrapS = t.wrapT = T.RepeatWrapping; return t;
    }).clone();
    tex.needsUpdate = true; tex.repeat.set(w / 2.5, d / 2.5);
    const m = mesh(new T.PlaneGeometry(w, d), std(0xffffff, { map: tex, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), false); m.rotation.x = -PI / 2;
    return m;
  }
  function vignetteBase(o, opt) {
    opt = opt || {};
    const mb = o.model && !o.model.isEmpty() ? o.model : o.box, gy = o.gy, R = o.rand, layer = o.layer, zones = [], ticks = [];
    const x0 = mb.min.x, x1 = mb.max.x, z0 = mb.min.z, z1 = mb.max.z, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // paved terrace with a stone border: the office plinths read as garden pavilions, not interiors on grass
    const pad = opt.pad || 1.15, rr = Math.min(1.4, d * 0.18);
    const shape = function (ww, dd, r) { const s = new T.Shape(), X = -ww / 2, Y = -dd / 2; s.moveTo(X + r, Y); s.lineTo(X + ww - r, Y); s.quadraticCurveTo(X + ww, Y, X + ww, Y + r); s.lineTo(X + ww, Y + dd - r); s.quadraticCurveTo(X + ww, Y + dd, X + ww - r, Y + dd); s.lineTo(X + r, Y + dd); s.quadraticCurveTo(X, Y + dd, X, Y + dd - r); s.lineTo(X, Y + r); s.quadraticCurveTo(X, Y, X + r, Y); return s; };
    if (opt.terrace !== false) {
      const border = mesh(new T.ShapeGeometry(shape(w + pad * 2 + 0.5, d + pad * 2 + 0.5, rr + 0.25), 12), std(0xa9a397, { roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), false);
      border.rotation.x = -PI / 2; border.position.set(cx, gy + 0.002, cz); layer.add(border);
      const paving = mesh(new T.ShapeGeometry(shape(w + pad * 2, d + pad * 2, rr), 12), std(0xe3ddd0, { roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), false);
      paving.rotation.x = -PI / 2; paving.position.set(cx, gy + 0.003, cz); layer.add(paving);
    }
    // flower beds framing the two front corners (low: never hide the plinth top)
    if (opt.beds !== false) [-1, 1].forEach(function (s) {
      const fb = flowerBed(2.6, 0.8, R, opt.palette); fb.position.set(cx + s * (w / 2 - 2.2), gy, z1 + pad * 0.55); layer.add(fb);
      zones.push([fb.position.x, fb.position.z, 1.6]);
    });
    // clipped hedge pairs along the back corners and a few rocks
    const hedge = [];
    [-1, 1].forEach(function (s) { for (let i = 0; i < 4; i++) hedge.push([cx + s * (w / 2 + pad + 0.7), gy, z1 - 0.6 - i * (d / 3.2), 0.38 + R() * 0.18]); });
    shrubs(layer, hedge, R, o.patch);
    rocks(layer, [[x0 - pad - 1.6, gy, z1 + 0.4, 0.32], [x1 + pad + 1.7, gy, z1 + 0.2, 0.28], [x0 - pad - 2.2, gy, cz - 0.5, 0.22], [x1 + pad + 2.1, gy, cz - 1.0, 0.25]], R);
    zones.push([cx, cz, Math.max(w, d) / 2 + pad + 1.2]);
    return {
      mb: mb, gy: gy, R: R, layer: layer, zones: zones, ticks: ticks, x0: x0, x1: x1, z0: z0, z1: z1, w: w, d: d, cx: cx, cz: cz, pad: pad,
      put: function (obj, x, z, ry, s, r) { at(obj, x, gy, z, ry || 0); if (s) obj.scale.setScalar(s); layer.add(obj); if (r) zones.push([x, z, r]); return obj; },
      done: function (extra) {
        return {
          groundY: gy,
          blocked: function (x, z, tall) { for (let i = 0; i < zones.length; i++) { const zn = zones[i]; if (Math.hypot(x - zn[0], z - zn[1]) < zn[2] + (tall ? 1.6 : 0.4)) return true; } return false; },
          update: function (t, dt, scale) { if (extra) extra(t, dt, scale); ticks.forEach(function (f) { f(dt, t); }); }
        };
      }
    };
  }
  const pages = {
    // 2 · Tools change: the innovation greenhouse rises behind the lab's left end; pines frame the right.
    tools: function (o) {
      const v = vignetteBase(o);
      v.put(greenhouse(), v.x0 - 5.5, v.z0 - 6.5, 0.5, 0.7, 7);
      [[v.x1 + 2.5, v.z0 - 7.5, 2.9], [v.x1 + 6.5, v.z0 - 11, 3.3], [v.x0 - 11, v.z0 - 2.5, 2.8]].forEach(function (p) { v.put(umbrellaPine(p[2], v.R), p[0], p[1], 0, 1, 2.4); });
      v.put(lantern(), v.x1 + v.pad + 1.6, v.z1 - 0.9, 0, 0.9);
      return v.done();
    },
    // 3 · Talent allocation: a cherry-blossom grove; stepping stones lead into the side entrance ("from other teams").
    allocation: function (o) {
      const v = vignetteBase(o);
      [[v.x1 + 1.6, v.z0 - 1.2, 0.72], [v.x1 + 4.6, v.z0 - 3.2, 0.8], [v.x1 + 0.2, v.z0 - 4.2, 0.62], [v.x0 - 5.5, v.z0 - 0.5, 0.66]].forEach(function (p) { v.put(cherryTree(v.R), p[0], p[1], v.R() * 6, p[2], 2.4); });
      const zPath = v.cz - 1.2;
      v.layer.add(steppingStones([V(v.x0 - 12, 0, zPath + 2.5), V(v.x0 - 8, 0, zPath + 0.6), V(v.x0 - 4.5, 0, zPath - 0.2), V(v.x0 - v.pad + 0.2, 0, zPath)], v.R, v.gy));
      [[v.x0 - 5.2, zPath + 1.1], [v.x0 - 8.6, zPath - 0.6]].forEach(function (p) { v.put(lantern(), p[0], p[1], 0, 0.95, 0.6); });
      v.zones.push([v.x0 - 7, zPath + 0.6, 2.2]);
      return v.done();
    },
    // 4 · Hiring excellence: a zen garden (raked gravel, bonsai, stone lanterns) for judgment and evidence.
    tower: function (o) {
      const v = vignetteBase(o);
      const gx = v.x1 + 2.6, gz = v.z0 + 1.6;
      const bed = gravelBed(4.4, 5.6); bed.position.set(gx, v.gy + 0.012, gz); v.layer.add(bed);
      [[0, -2.85, 4.6, 0.14], [0, 2.85, 4.6, 0.14], [-2.25, 0, 0.14, 5.6], [2.25, 0, 0.14, 5.6]].forEach(function (b) { v.layer.add(at(mesh(new T.BoxGeometry(b[2], 0.1, b[3]), MAT.stone()), gx + b[0], v.gy + 0.04, gz + b[1])); });
      v.put(bonsai(v.R), gx - 0.4, gz - 1.4, 0.4, 1.3, 1.2);
      v.put(bonsai(v.R), gx + 1.2, gz + 1.3, 2.6, 0.95, 1.0);
      rocks(v.layer, [[gx + 0.9, v.gy, gz - 0.2, 0.42], [gx - 1.4, v.gy, gz + 1.6, 0.3], [gx + 1.8, v.gy, gz - 2.2, 0.26]], v.R);
      [[gx - 1.6, gz - 2.3], [gx + 1.6, gz - 2.3]].forEach(function (p) { v.put(lantern(), p[0], p[1], 0, 1.0, 0.5); });
      v.zones.push([gx, gz, 3.8]);
      [[v.x0 + 1.0, v.z0 - 8.0, 2.5], [v.cx - 1.0, v.z0 - 10.5, 2.9], [v.x0 - 4.0, v.z0 - 3.5, 2.3]].forEach(function (p) { v.put(umbrellaPine(p[2], v.R), p[0], p[1], 0, 1, 2.2); });
      return v.done();
    },
    // 5 · Adaptive problem-solving: a pond crossed by an arched bridge — the path changes, the destination holds.
    route: function (o) {
      const v = vignetteBase(o);
      const px = v.x1 + 5.0, pz = v.z0 - 2.6, rx = 3.6, rz = 2.7;
      const w = water(new T.CircleGeometry(1, 72), 1.6, 0x26494a); w.scale.set(rx, rz, 1); w.position.set(px, v.gy + 0.02, pz); v.layer.add(w); v.ticks.push(w.userData.tick);
      rocks(v.layer, sweep(function (out) { for (let i = 0; i < 30; i++) { const a = i / 30 * PI * 2; if (Math.abs(a - PI) < 0.35 || Math.abs(a) < 0.3) continue; out.push([px + Math.cos(a) * (rx + 0.15), v.gy, pz + Math.sin(a) * (rz + 0.15), 0.16 + v.R() * 0.2]); } }), v.R);
      v.layer.add(bridge(V(px - rx - 0.3, v.gy, pz + 0.4), V(px + rx + 0.5, v.gy, pz - 0.4), { rise: 0.7, width: 0.95 }));
      v.put(bonsai(v.R), px + 1.2, pz - rz - 0.9, 0.8, 1.2, 1.0);
      v.put(lantern(), px - rx - 1.0, pz + 0.9, 0, 1.0, 0.5);
      v.zones.push([px, pz, Math.max(rx, rz) + 0.6]);
      [[v.x0 - 3.0, v.z0 - 5.0, 2.9], [v.x0 - 7.5, v.z0 - 1.5, 2.5]].forEach(function (p) { v.put(umbrellaPine(p[2], v.R), p[0], p[1], 0, 1, 2.2); });
      v.put(cherryTree(v.R), v.cx - 2.5, v.z0 - 7.5, 1, 0.8, 2.4);
      return v.done();
    },
    // 6 · Development journey: the waterfall pavilion — steady flow, step by step — with cherry trees along the way.
    journey: function (o) {
      const v = vignetteBase(o);
      const wf = v.put(waterfallPavilion(), v.x0 - 4.6, v.z0 - 2.2, 0.75, 0.55, 5); v.ticks.push(wf.userData.tick);
      const pond = water(new T.CircleGeometry(1, 64), 1.4, 0x26494a); pond.scale.set(3.0, 1.5, 1); pond.position.set(v.x0 - 3.3, v.gy + 0.02, v.z0 + 0.1); pond.rotation.z = 0.75; v.layer.add(pond); v.ticks.push(pond.userData.tick);
      rocks(v.layer, sweep(function (out) { for (let i = 0; i < 20; i++) { const a = i / 20 * PI * 2; const ca = Math.cos(a) * 3.1, sa = Math.sin(a) * 1.6; out.push([v.x0 - 3.3 + ca * Math.cos(0.75) - sa * Math.sin(0.75), v.gy, v.z0 + 0.1 - ca * Math.sin(0.75) - sa * Math.cos(0.75), 0.14 + v.R() * 0.16]); } }), v.R);
      v.zones.push([v.x0 - 3, v.z0 - 3.5, 4.5]);
      [[v.x1 + 2.0, v.z0 - 2.0, 0.7], [v.x1 + 4.8, v.z0 - 4.6, 0.78]].forEach(function (p) { v.put(cherryTree(v.R), p[0], p[1], v.R() * 6, p[2], 2.4); });
      v.put(umbrellaPine(3.0, v.R), v.cx + 2.5, v.z0 - 9.0, 0, 1, 2.2);
      return v.done();
    },
    // 7 · Team: the garden's tree house — built together, step by step — beside a cherry and a lantern.
    team: function (o) {
      const v = vignetteBase(o);
      const th = v.put(treehouse(v.R), v.x1 + 3.4, v.z0 - 1.8, -0.55, 0.62, 3.2);
      void th;
      v.put(cherryTree(v.R), v.x0 - 3.8, v.z0 - 0.4, 2, 0.62, 2.2);
      v.put(cherryTree(v.R), v.x0 - 5.6, v.z0 - 4.4, 4, 0.78, 2.4);
      v.put(lantern(), v.x1 + v.pad + 1.2, v.z1 - 1.2, 0, 0.95, 0.5);
      v.put(umbrellaPine(2.8, v.R), v.cx - 1.5, v.z0 - 8.5, 0, 1, 2.2);
      return v.done();
    },
    // 8 · Network (blue hour): lanterns ring the network like a garden at dusk; the tree of light stands off to one side.
    network: function (o) {
      const v = vignetteBase(o, { terrace: false, beds: false });
      const r0 = Math.max(v.w, v.d) / 2;
      const gt = v.put(glowTree(v.R), v.x0 - 3.6, v.z0 + 1.0, 0, 0.85, 2.5);
      gt.traverse(function (m) { if (m.isMesh && m.material.emissive) { m.material = m.material.clone(); m.material.emissiveIntensity = 0.9; } });
      for (let i = 0; i < 10; i++) { const a = -PI / 2 + (i - 4.5) * 0.3; v.put(lantern(), Math.cos(a) * (r0 + 1.6), Math.sin(a) * (r0 + 1.6), -a, 0.9, 0.5); }
      v.put(cherryTree(v.R), v.x1 + 3.4, v.z0 + 0.5, 1, 0.72, 2.4);
      [[v.x1 + 1.0, v.z0 - 3.5, 2.8], [v.x0 + 1.5, v.z0 - 4.0, 3.1]].forEach(function (p) { v.put(umbrellaPine(p[2], v.R), p[0], p[1], 0, 1, 2.2); });
      return v.done(function (t, dt, scale) { if (gt.userData.points) gt.userData.points.material.uniforms.uScale.value = scale || 300; });
    },
    // 9 · Ownership: the sailboat pond and the Takeda flag — clear ownership of what is delivered.
    ownership: function (o) {
      const v = vignetteBase(o);
      const px = v.x0 - 5.4, pz = v.z0 - 1.2;
      const pond = water(new T.CircleGeometry(1, 72), 1.6, 0x26494a); pond.scale.set(3.6, 2.4, 1); pond.position.set(px, v.gy + 0.02, pz); v.layer.add(pond); v.ticks.push(pond.userData.tick);
      rocks(v.layer, sweep(function (out) { for (let i = 0; i < 26; i++) { const a = i / 26 * PI * 2; out.push([px + Math.cos(a) * 3.75, v.gy, pz + Math.sin(a) * 2.55, 0.15 + v.R() * 0.18]); } }), v.R);
      const boat = v.put(sailboat(), px - 0.8, pz - 0.2, 0.6, 0.68);
      boat.position.y = v.gy + 0.03;
      v.ticks.push(function (dt, t) { boat.position.y = v.gy + 0.03 + Math.sin(t * 1.3) * 0.02; boat.rotation.z = Math.sin(t * 0.9) * 0.04; boat.position.x = px - 0.8 + Math.sin(t * 0.15) * 0.4; });
      v.zones.push([px, pz, 4.2]);
      const flag = v.put(takedaFlag(), v.x1 + 2.6, v.z0 - 1.2, -0.3, 0.72, 1.2); v.ticks.push(flag.userData.tick);
      [[v.x1 + 5.5, v.z0 - 4.5, 3.0], [v.cx + 1.5, v.z0 - 9.5, 3.3]].forEach(function (p) { v.put(umbrellaPine(p[2], v.R), p[0], p[1], 0, 1, 2.2); });
      return v.done();
    },
    // 10 · Evidence gates: two planting pillars flank the path to the compass plaza — prove, then scale.
    gates: function (o) {
      const v = vignetteBase(o);
      const pillars = pillarSet(v.layer, [[v.x0 - 2.4, v.gy, v.z0 + 0.6], [v.x1 + 2.4, v.gy, v.z0 + 0.6]]);
      v.zones.push([v.x0 - 2.4, v.z0 + 0.6, 1.2], [v.x1 + 2.4, v.z0 + 0.6, 1.2]);
      const cp = v.put(compassPlaza(), v.x1 + 4.6, v.z1 - 1.4, 0, 0.9, 2.0); void cp;
      [[v.x0 - 5.0, v.z0 - 3.0, 0.7], [v.x1 + 5.2, v.z0 - 4.5, 0.75]].forEach(function (p) { v.put(cherryTree(v.R), p[0], p[1], v.R() * 6, p[2], 2.4); });
      v.put(umbrellaPine(3.2, v.R), v.cx, v.z0 - 9.5, 0, 1, 2.2);
      return v.done(function (t) { pillars.update(t); });
    }
  };
  worlds.campus = campusWorld; worlds.flywheel = flywheelWorld;
  Object.keys(pages).forEach(function (k) { if (!worlds[k]) worlds[k] = pages[k]; });

  /* ------------------------------------------------------------------ hook the closing scene */
  const fly = S.flywheel;
  if (fly) S.flywheel = function (ctx) {
    const sc = fly(ctx), s = sc.scene;
    // Six planting pillars replace the planters around the island rim; ordered left to right as in the garden.
    const spots = [180, 120, 240, 300, 60, 0].map(function (deg) { const a = deg * PI / 180; return [Math.cos(a) * 7.7, 0, Math.sin(a) * 7.7]; });
    const pillars = pillarSet(s, spots);
    sc.view.pitch = 0.5;
    const up = sc.update;
    sc.update = function (t, dt) { if (up) up.call(sc, t, dt); pillars.update(t); };
    return sc;
  };

  TK.Garden = {
    world: worlds,
    pillarSet: pillarSet,
    tick: function (t) { time.value = t; }
  };
})();
