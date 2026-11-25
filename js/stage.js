/* Takeda 2030: stage manager.
   One WebGL renderer serves every chapter. The canvas moves into whichever
   stage is most visible; other stages show a snapshot of their last frame.
   Handles the camera rig, drag-to-orbit, labels and the render loop. */
(function () {
  'use strict';
  const T = window.THREE;
  const TK = window.TK = window.TK || {};
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Stage = { ok: false, built: {}, motion: !reduce };
  TK.Stage = Stage;
  TK.state = TK.state || {};

  let renderer = null, canvas = null, active = null, clock = 0, last = 0, anyVisible = true;
  const stages = [];
  const ratios = new Map();
  const queue = {};

  function markNoGL() {
    Stage.ok = false;
    stages.forEach(function (s) {
      s.poster.classList.remove('hidden');
      if(s.el.querySelector('.nogl-note')) return;
      s.el.classList.add('no-gl');
      const p = document.createElement('p');
      p.className = 'nogl-note';
      p.textContent = ['team','network','ownership'].includes(s.name)?'Illustrated mode · controls remain live.':'Static illustration · controls remain interactive.';
      s.view.after(p);
    });
  }

  Stage.init = function () {
    document.querySelectorAll('.stage[data-scene]').forEach(function (el) {
      const view=el.querySelector('.stage-view'),hud=el.querySelector('.stage-hud'),hint=el.querySelector('.stage-hint');
      if(hud)view.before(hud);if(hint)view.after(hint);
      view.setAttribute('role','img');view.setAttribute('aria-label',(el.querySelector('figcaption')||{}).textContent||'3D environment');
      if(hud&&document.fullscreenEnabled&&el.requestFullscreen){const controls=document.createElement('div');controls.className='scene-toolbar-controls';const reset=hud.querySelector('.hud-reset');if(reset)controls.append(reset);const expand=document.createElement('button');expand.className='scene-expand';expand.type='button';expand.textContent='Expand scene';expand.setAttribute('aria-label','Expand the 3D environment');expand.addEventListener('click',()=>{if(document.fullscreenElement===el)document.exitFullscreen().catch(()=>{});else el.requestFullscreen().catch(()=>{})});document.addEventListener('fullscreenchange',()=>{expand.textContent=document.fullscreenElement===el?'Close scene':'Expand scene'});controls.append(expand);hud.append(controls)}
      const guide=document.createElement('details');guide.className='stage-guide';guide.innerHTML='<summary>Scene guide</summary><div class="guide-items"></div>';const items=guide.querySelector('.guide-items');
      const addGuide=(text,cls)=>{const item=document.createElement('span');item.className='guide-item '+(cls||'');item.textContent=text;items.append(item);return item};
      (window.TK_GUIDES?.[el.dataset.scene]||[]).forEach(l=>addGuide(l.text,l.cls));
      view.after(guide);
      stages.push({ el:el,name:el.dataset.scene,view,labels:el.querySelector('.stage-labels'),poster:el.querySelector('.stage-poster'),hint,guide,items,addGuide });
    });
    if (!T || !TK.SCENES || !TK.K) { markNoGL(); return false; }
    canvas = document.createElement('canvas');
    canvas.className = 'gl';
    canvas.setAttribute('aria-hidden', 'true');
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { markNoGL(); return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    TK.K.env = TK.K.makeEnvironment(renderer);
    Stage.renderer = renderer;
    Stage.ok = true;
    canvas.addEventListener('webglcontextlost', function(e){e.preventDefault(); canvas.remove(); markNoGL();});

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0); });
      pickActive();
    }, { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1] });
    stages.forEach(function (s) { io.observe(s.el); bindPointer(s); });

    const ro = new ResizeObserver(function () { if (active) resize(active); });
    stages.forEach(function (s) { ro.observe(s.view); });

    document.addEventListener('visibilitychange', function () { last = performance.now(); });
    requestAnimationFrame(loop);
    // pre-render snapshots of the other scenes while idle
    // Static renders are bundled; construct scenes only when visited.
    return true;
  };

  function pickActive() {
    if(!Stage.ok) return;
    let best = null, br = 0;
    stages.forEach(function (s) { const r = ratios.get(s.el) || 0; if (r > br) { br = r; best = s; } });
    anyVisible = br > 0.02;
    if (best && br > 0.12 && best !== active) activate(best);
  }

  function snapshot(s) {
    const sc = Stage.built[s.name];
    if (!sc) return;
    try {
      renderer.render(sc.scene, sc.camera);
      s.poster.style.backgroundImage = 'url(' + canvas.toDataURL('image/webp', 0.92) + ')';
      s.poster.classList.add('ready');
    } catch (e) { /* ignore */ }
  }

  function build(s) {
    if (Stage.built[s.name]) return Stage.built[s.name];
    const def = TK.SCENES[s.name];
    if (!def) return null;
    const labels = [];
    s.items.replaceChildren();
    const ctx = {
      label: function (text, anchor, o) {
        o = o || {};
        const guideEl = s.addGuide(text,o.cls);
        const pin = document.createElement('span');
        pin.className = 'stage-pin ' + (o.cls || '');
        pin.textContent = text;
        s.labels.append(pin);
        const entry = { el: pin, guide: guideEl, anchor: anchor, show: o.show, v: new T.Vector3() };
        labels.push(entry);
        return entry;
      }
    };
    const sc = def(ctx);
    sc.labels = labels;
    sc.rig = { user: { yaw: 0, pitch: 0 }, cur: { yaw: 0, pitch: 0 }, intro: { yaw: 0, zoom: 1 }, seen: false };
    sc.camera.fov = sc.view.fov || 30;
    Stage.built[s.name] = sc;
    // replay any API calls made before the scene existed
    const q = queue[s.name] || {};
    Object.keys(q).forEach(function (fn) { if (sc.api && sc.api[fn]) sc.api[fn].apply(sc.api, q[fn]); });
    delete queue[s.name];
    sc.update && sc.update(0, 0);
    return sc;
  }

  function sizeOf(s) {
    const r = s.view.getBoundingClientRect();
    return { w: Math.max(2, Math.round(r.width)), h: Math.max(2, Math.round(r.height)) };
  }

  function placeCamera(sc, aspect, t) {
    const v = sc.view, rig = sc.rig;
    rig.cur.yaw += (rig.user.yaw - rig.cur.yaw) * 0.12;
    rig.cur.pitch += (rig.user.pitch - rig.cur.pitch) * 0.12;
    const fit = v.fit || 1.5;
    const mul = aspect < fit ? Math.pow(fit / aspect, 0.82) : 1;
    const sway = Stage.motion ? Math.sin(t * 0.12) * 0.035 : 0;
    let r = v.radius * mul * rig.intro.zoom;
    const yaw = v.yaw + rig.cur.yaw + rig.intro.yaw + sway;
    const pitch = Math.max(0.12, Math.min(1.35, v.pitch + rig.cur.pitch));
    if(TK.Visual)r=TK.Visual.frame(sc,aspect,yaw,pitch)*rig.intro.zoom;
    const c = sc.camera;
    c.aspect = aspect;
    c.position.set(v.target.x + r * Math.cos(pitch) * Math.sin(yaw), v.target.y + r * Math.sin(pitch), v.target.z + r * Math.cos(pitch) * Math.cos(yaw));
    c.lookAt(v.target);
    c.updateProjectionMatrix();
  }

  function placeLabels(sc, w, h) {
    sc.labels.forEach(function(L){
      const shown = !(L.show && !L.show());
      const visible = shown !== false;
      if (L.guide) L.guide.hidden = !visible;
      if (!visible) { L.el.hidden = true; return; }
      L.v.copy(L.anchor).project(sc.camera);
      if (L.v.z < -1 || L.v.z > 1 || L.v.x < -1.25 || L.v.x > 1.25 || L.v.y < -1.25 || L.v.y > 1.25) { L.el.hidden = true; return; }
      const x = (L.v.x * 0.5 + 0.5) * w;
      const y = (-L.v.y * 0.5 + 0.5) * h;
      const margin = 12;
      L.el.hidden = false;
      L.el.style.left = Math.max(margin, Math.min(w - margin, x)) + 'px';
      L.el.style.top = Math.max(margin, Math.min(h - margin, y)) + 'px';
      L.el.style.opacity = Math.max(0.38, Math.min(1, 1 - Math.max(0, L.v.z) * 0.18)).toFixed(2);
    });
  }

  function resize(s) {
    const z = sizeOf(s);
    renderer.setSize(z.w, z.h, false);
  }

  function activate(s) {
    if (active) {
      snapshot(active);
      active.poster.classList.remove('hidden');
    }
    active = s;
    const sc = build(s);
    if (!sc) return;
    s.view.insertBefore(canvas, s.labels);
    resize(s);
    s.pendingReveal = true; // keep the snapshot until the first live frame is drawn
    if (!sc.rig.seen) {
      sc.rig.seen = true;
      if (Stage.motion && window.gsap) {
        sc.rig.intro.zoom = 1.22; sc.rig.intro.yaw = -0.42;
        gsap.to(sc.rig.intro, { zoom: 1, yaw: 0, duration: 2.6, ease: 'power3.out' });
      }
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!Stage.ok || !active || !anyVisible || document.hidden) return;
    const sc = Stage.built[active.name];
    if (!sc) return;
    const mdt = Stage.motion ? dt : 0;
    clock += mdt;
    const z = sizeOf(active);
    if (canvas.width !== Math.round(z.w * renderer.getPixelRatio()) || canvas.height !== Math.round(z.h * renderer.getPixelRatio())) renderer.setSize(z.w, z.h, false);
    if (sc.update) sc.update(clock, mdt);
    placeCamera(sc, z.w / z.h, clock);
    renderer.render(sc.scene, sc.camera);
    placeLabels(sc, z.w, z.h);
    if (active.pendingReveal) { active.pendingReveal = false; active.poster.classList.add('hidden'); }
  }

  /* Render each scene once at its own size so every stage has a poster. */
  function prerender() {
    const todo = stages.filter(function (s) { return s !== active && !s.poster.classList.contains('ready'); });
    (function next() {
      const s = todo.shift();
      if (!s) return;
      if (s === active || s.poster.classList.contains('ready')) { setTimeout(next, 40); return; }
      const sc = build(s);
      if (sc) {
        const z = sizeOf(s);
        renderer.setSize(z.w, z.h, false);
        placeCamera(sc, z.w / z.h, 0);
        snapshot(s);
        placeLabels(sc, z.w, z.h);
        if (active) {
          const a = Stage.built[active.name];
          const za = sizeOf(active);
          renderer.setSize(za.w, za.h, false);
          if (a) { placeCamera(a, za.w / za.h, clock); renderer.render(a.scene, a.camera); }
        }
      }
      setTimeout(next, 160);
    })();
  }

  function bindPointer(s) {
    const view = s.view;
    view.tabIndex = 0;
    view.setAttribute('role', 'img');
    view.setAttribute('aria-label', (s.el.querySelector('figcaption') || {}).textContent || '3D scene');
    let drag = null;
    view.addEventListener('pointerdown', function (e) {
      if (!Stage.ok || e.target.closest('button')) return;
      if (active !== s) activate(s);
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      view.setPointerCapture(e.pointerId);
      view.classList.add('dragging');
      if (s.hint) s.hint.classList.add('gone');
    });
    view.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      const sc = Stage.built[s.name]; if (!sc) return;
      sc.rig.user.yaw = Math.max(-0.75, Math.min(0.75, sc.rig.user.yaw - (e.clientX - drag.x) * 0.006));
      sc.rig.user.pitch = Math.max(-0.35, Math.min(0.32, sc.rig.user.pitch + (e.clientY - drag.y) * 0.004));
      drag.x = e.clientX; drag.y = e.clientY;
    });
    function end() { drag = null; view.classList.remove('dragging'); }
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('keydown', function (e) {
      const sc = Stage.built[s.name]; if (!sc) return;
      const k = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
      if (!k) return;
      e.preventDefault(); e.stopPropagation();
      sc.rig.user.yaw = Math.max(-0.75, Math.min(0.75, sc.rig.user.yaw + k[0]));
      sc.rig.user.pitch = Math.max(-0.35, Math.min(0.32, sc.rig.user.pitch + k[1]));
    });
    const reset = s.el.querySelector('.hud-reset');
    if (reset) reset.addEventListener('click', function () {
      const sc = Stage.built[s.name]; if (!sc) return;
      if (window.gsap && Stage.motion) gsap.to(sc.rig.user, { yaw: 0, pitch: 0, duration: 0.9, ease: 'power3.out' });
      else { sc.rig.user.yaw = 0; sc.rig.user.pitch = 0; }
    });
  }

  /* Call a scene API now, or queue it until the scene is built. */
  Stage.call = function (name, fn) {
    const args = Array.prototype.slice.call(arguments, 2);
    const sc = Stage.built[name];
    if (sc && sc.api && sc.api[fn]) { sc.api[fn].apply(sc.api, args); return; }
    (queue[name] = queue[name] || {})[fn] = args;
  };
  Stage.setMotion = function (on) { Stage.motion = on; if(window.gsap&&!on) { gsap.globalTimeline.getChildren(true,true,false).forEach(function(t){t.progress(1);}); } };
})();
