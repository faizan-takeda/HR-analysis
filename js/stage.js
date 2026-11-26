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

  let renderer = null, canvas = null, active = null, clock = 0, last = 0, anyVisible = true, fx = null, frameNo = 0, lastDrawn = null;
  // On CPU (software) rasterisers continuous animation would run at ~1 fps and block scrolling, so frames are
  // rendered on demand instead: on arrival, drag, scenario change and resize. ?live=1 forces continuous.
  let onDemand = false, demandUntil = 0, needFrame = false;
  function kick(ms) { needFrame = true; demandUntil = Math.max(demandUntil, performance.now() + (ms || 0)); }
  function softwareGL(r) {
    try { const gl = r.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return /swiftshader|llvmpipe|software|basic render/i.test(gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER)); } catch (e) { return false; }
  }
  const IM = function () { return TK.Immersive; };
  function pixelRatio() {
    const q = fx ? fx.quality : 2;
    return Math.min(window.devicePixelRatio || 1, q >= 2 ? 2 : q === 1 ? 1.5 : 1);
  }
  /* Render a built scene through the cinematic pipeline when available, else forward-render.
     Shadow maps refresh every frame on the top tier and every 2nd/3rd frame below it; any scene change forces one. */
  function draw(sc, w, h, dt, force) {
    const target = sc._frameTarget || sc.view.target;
    const pr = renderer.getPixelRatio();
    const every = !fx || fx.quality >= 3 ? 1 : fx.quality >= 1 ? 2 : 3;
    renderer.shadowMap.needsUpdate = !!force || !dt || sc !== lastDrawn || (++frameNo % every) === 0;
    lastDrawn = sc;
    if (IM()) IM().beforeRender(sc, clock, dt, target, h * pr);
    if (fx) { fx.setSize(w * pr, h * pr); fx.render(sc.scene, sc.camera, sc.look, dt); }
    else renderer.render(sc.scene, sc.camera);
  }
  /* Compile a scene's shader programs ahead of its first frame (in parallel where supported), using the
     same render target the scene will really draw into so the compiled variants are the ones used. */
  function prepare(sc) {
    const parallel = renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile');
    if (sc._ready || sc._compiling || !parallel) { if (!parallel) sc._ready = true; return; }
    sc._compiling = true;
    const prev = renderer.getRenderTarget();
    try {
      if (fx) { if (!fx.sceneRT) fx.setSize(Math.max(64, canvas.width), Math.max(64, canvas.height)); renderer.setRenderTarget(fx.sceneRT); }
      renderer.compileAsync(sc.scene, sc.camera).then(function () { sc._ready = true; }, function () { sc._ready = true; });
    } catch (e) { sc._ready = true; }
    renderer.setRenderTarget(prev);
  }
  const idle = window.requestIdleCallback ? function (f) { requestIdleCallback(f, { timeout: 1500 }); } : function (f) { setTimeout(f, 250); };
  /* Build and compile the neighbouring chapters while the presenter talks, so scrolling never hitches. */
  function warmNeighbours(s) {
    if (onDemand) return;
    const i = stages.indexOf(s);
    [i + 1, i - 1, i + 2].forEach(function (k, n) {
      const t = stages[k];
      if (!t || (Stage.built[t.name] && Stage.built[t.name]._ready)) return;
      setTimeout(function () {
        idle(function () {
          if (!Stage.ok) return;
          const sc = build(t); if (!sc) return;
          const z = sizeOf(t);
          placeCamera(sc, z.w / z.h, 0, 0, t);
          prepare(sc);
        });
      }, 400 + n * 900);
    });
  }
  const stages = [];
  const ratios = new Map();
  const queue = {};

  function markNoGL() {
    Stage.ok = false;
    stages.forEach(function (s) {
      s.poster.classList.remove('hidden');
      s.labels.classList.remove("live-pins");
      if(s.el.querySelector('.nogl-note')) return;
      s.el.classList.add('no-gl');
      const p = document.createElement('p');
      p.className = 'nogl-note';
      p.textContent = ['team','network','ownership'].includes(s.name)?'Illustrated mode · controls remain live.':'Static illustration · controls remain interactive.';
      s.view.after(p);
      if(TK.Pins)TK.Pins.poster(s);
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
      const stage={el,name:el.dataset.scene,view,labels:el.querySelector('.stage-labels'),poster:el.querySelector('.stage-poster'),hint,guide,items,addGuide};stages.push(stage);
      if(TK.Pins){let requested=false;const redraw=()=>{if(requested)return;requested=true;requestAnimationFrame(()=>{requested=false;if(!Stage.ok)TK.Pins.poster(stage)})};new ResizeObserver(redraw).observe(view);new MutationObserver(redraw).observe(stage.poster,{attributes:true,attributeFilter:['data-poster-key']});redraw();}
    });
    if (!T || !TK.SCENES || !TK.K) { markNoGL(); return false; }
    canvas = document.createElement('canvas');
    canvas.className = 'gl';
    canvas.setAttribute('aria-hidden', 'true');
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { markNoGL(); return false; }
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    TK.K.env = TK.K.makeEnvironment(renderer);
    fx = TK.FX ? TK.FX.create(renderer) : null;
    Stage.fx = fx;
    onDemand = (fx ? fx.software : softwareGL(renderer)) && !/[?&]live=1/.test(location.search);
    Stage.onDemand = onDemand;
    renderer.setPixelRatio(pixelRatio());
    if (IM()) IM().attach(renderer, fx);
    Stage.renderer = renderer;
    Stage.ok = true;
    canvas.addEventListener('webglcontextlost', function(e){e.preventDefault(); canvas.remove(); markNoGL();});

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0); });
      pickActive();
    }, { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1] });
    stages.forEach(function (s) { io.observe(s.el); bindPointer(s); if (IM()) IM().bindStage(s, function () { return Stage.built[s.name]; }); });

    const ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        const st = stages.find(function (x) { return x.view === e.target; }); if (!st) return;
        st._size = null;
        if (st !== active && st.snap) { st.snap.remove(); st.snap = null; }
      });
      // The loop notices the new size and resizes + draws in the same frame (no blank flash).
      if (active) kick(300);
    });
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

  /* Keep the last live frame on the stage by copying the WebGL canvas into a 2D canvas (no image encoding). */
  function snapshot(s) {
    const sc = Stage.built[s.name];
    if (!sc || !sc._ready) return;
    try {
      const z = sizeOf(s);
      draw(sc, z.w, z.h, 0, true);
      let c = s.snap;
      if (!c) { c = s.snap = document.createElement('canvas'); c.className = 'stage-snap'; c.setAttribute('aria-hidden', 'true'); s.poster.append(c); }
      if (c.width !== canvas.width || c.height !== canvas.height) { c.width = canvas.width; c.height = canvas.height; }
      c.getContext('2d').drawImage(canvas, 0, 0);
      s.poster.classList.add('ready');
    } catch (e) { /* ignore */ }
  }

  function build(s) {
    if (Stage.built[s.name]) return Stage.built[s.name];
    const def = TK.SCENES[s.name];
    if (!def) return null;
    const labels = [];
    s.items.replaceChildren();
    s.labels.replaceChildren();s.labels.classList.remove("poster-pins");
    const ctx = {
      label: function (text, anchor, o) {
        o = o || {};
        const guideEl = s.addGuide(text,o.cls);
        const pin = document.createElement('span');
        pin.className = 'stage-pin ' + (o.cls || '');
        pin.textContent = text;
        s.labels.append(pin);
        const entry = { el: pin, guide: guideEl, text, cls:o.cls||"", anchor: anchor, show: o.show, v: new T.Vector3() };
        labels.push(entry);
        return entry;
      }
    };
    const sc = def(ctx);
    sc.labels = labels;
    if (IM() && IM().batch) IM().batch(sc);
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
    if (s._size) return s._size;
    const r = s.view.getBoundingClientRect();
    return (s._size = { w: Math.max(2, Math.round(r.width)), h: Math.max(2, Math.round(r.height)) });
  }

  function placeCamera(sc, aspect, t, dt, s) {
    const v = sc.view, rig = sc.rig;
    rig.cur.yaw += (rig.user.yaw - rig.cur.yaw) * 0.12;
    rig.cur.pitch += (rig.user.pitch - rig.cur.pitch) * 0.12;
    const fit = v.fit || 1.5;
    const mul = aspect < fit ? Math.pow(fit / aspect, 0.82) : 1;
    // Cinematic direction: keyed establishing shot, scroll scrub, pointer parallax and idle drift.
    const cine = IM() && s ? IM().camera(sc, s, t, dt) : null;
    let r = v.radius * mul * rig.intro.zoom;
    let yaw = v.yaw + rig.cur.yaw + rig.intro.yaw + (cine ? cine.solveYaw : 0);
    let pitch = Math.max(0.12, Math.min(1.35, v.pitch + rig.cur.pitch));
    if(TK.Visual)r=TK.Visual.frame(sc,aspect,yaw,pitch)*rig.intro.zoom;
    if (cine) { yaw += cine.yaw; pitch = Math.max(0.1, Math.min(1.4, pitch + cine.pitch)); r *= cine.zoom; }
    const c = sc.camera;
    c.aspect = aspect;
    const target = sc._frameTarget || v.target;
    c.position.set(target.x + r * Math.cos(pitch) * Math.sin(yaw), target.y + r * Math.sin(pitch), target.z + r * Math.cos(pitch) * Math.cos(yaw));
    c.lookAt(target);
    c.updateProjectionMatrix();
  }

  function placeLabels(sc,w,h) {
    if (!active || !TK.Pins) return;
    const items=sc.labels.map(L=>{const visible=!(L.show&&!L.show());if(L.guide&&L.guide.hidden!==!visible)L.guide.hidden=!visible;
      if(L.anchor.isObject3D)L.anchor.getWorldPosition(L.v);else L.v.copy(L.anchor);
      L.v.project(sc.camera);return {el:L.el,text:L.text,cls:L.cls,x:(L.v.x*.5+.5)*w,y:(-.5*L.v.y+.5)*h,visible:visible&&L.v.z>=-1&&L.v.z<=1};});
    TK.Pins.layout(active.labels,items,w,h);
  }

  function resize(s) {
    const z = sizeOf(s);
    renderer.setSize(z.w, z.h, false);
  }

  function activate(s) {
    if (active) {
      snapshot(active);
      active.labels.classList.remove("live-pins");
      active.labels.classList.remove("poster-pins");
      active.poster.classList.remove('hidden');
    }
    active = s;
    const sc = build(s);
    if (!sc) return;
    s.labels.querySelectorAll(".poster-pin").forEach(n=>n.remove());s.labels.classList.remove("poster-pins");
    s.view.insertBefore(canvas, s.labels);
    resize(s);
    s.pendingReveal = true; // keep the snapshot/poster until the first live frame is drawn
    prepare(sc);
    if (fx) fx.hold();
    // Free shadow maps of chapters far from here; they are recreated on demand.
    const ai = stages.indexOf(s);
    stages.forEach(function (o, k) {
      const b = Stage.built[o.name]; if (!b || Math.abs(k - ai) <= 2) return;
      b.scene.traverse(function (l) { if (l.isLight && l.shadow && l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } });
    });
  }
  /* First live frame of a chapter: start its establishing shot, then prepare the neighbours. */
  function reveal(s, sc) {
    if (IM()) IM().onActivate(sc, s);
    if (!sc.rig.seen) {
      sc.rig.seen = true;
      if (Stage.motion && !onDemand && window.gsap) {
        sc.rig.intro.zoom = 1.025; sc.rig.intro.yaw = 0;
        gsap.to(sc.rig.intro, { zoom: 1, yaw: 0, duration: 0.9, ease: 'power3.out' });
      }
    }
    warmNeighbours(s);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const raw = now - last;
    const dt = Math.min(0.05, Math.max(0, raw / 1000));
    last = now;
    if (!Stage.ok || !active || !anyVisible || document.hidden) return;
    const sc = Stage.built[active.name];
    if (!sc || !sc._ready) return; // the poster or snapshot stays up while shaders compile
    if (onDemand && !active.pendingReveal && !needFrame && now > demandUntil) return;
    needFrame = false;
    if (active.pendingReveal) reveal(active, sc);
    const mdt = Stage.motion ? dt : 0;
    clock += mdt;
    if (fx && raw > 0 && raw < 3000 && fx.tune(raw, now)) renderer.setPixelRatio(pixelRatio());
    const z = sizeOf(active);
    if (canvas.width !== Math.floor(z.w * renderer.getPixelRatio()) || canvas.height !== Math.floor(z.h * renderer.getPixelRatio())) renderer.setSize(z.w, z.h, false);
    if (sc.update) sc.update(clock, mdt);
    placeCamera(sc, z.w / z.h, clock, dt, active);
    draw(sc, z.w, z.h, mdt);
    active.labels.classList.add("live-pins");
    placeLabels(sc, z.w, z.h);
    if (active.pendingReveal) { active.pendingReveal = false; active.labels.classList.add("live-pins"); active.poster.classList.add('hidden'); }
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
        placeCamera(sc, z.w / z.h, 0, 0, s);
        snapshot(s);
        placeLabels(sc, z.w, z.h);
        if (active) {
          const a = Stage.built[active.name];
          const za = sizeOf(active);
          renderer.setSize(za.w, za.h, false);
          if (a) { placeCamera(a, za.w / za.h, clock, 0, active); draw(a, za.w, za.h, 0); }
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
      drag.x = e.clientX; drag.y = e.clientY; kick(700);
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
      sc.rig.user.pitch = Math.max(-0.35, Math.min(0.32, sc.rig.user.pitch + k[1])); kick(700);
    });
    const reset = s.el.querySelector('.hud-reset');
    if (reset) reset.addEventListener('click', function () {
      const sc = Stage.built[s.name]; if (!sc) return;
      kick(1200);
      if (window.gsap && Stage.motion) gsap.to(sc.rig.user, { yaw: 0, pitch: 0, duration: 0.9, ease: 'power3.out' });
      else { sc.rig.user.yaw = 0; sc.rig.user.pitch = 0; }
    });
  }

  /* Call a scene API now, or queue it until the scene is built. */
  Stage.call = function (name, fn) {
    const args = Array.prototype.slice.call(arguments, 2);
    const sc = Stage.built[name];
    if (sc && sc.api && sc.api[fn]) {
      sc.api[fn].apply(sc.api, args);
      if (active && active.name === name) kick(2500);
      else { const st = stages.find(function (x) { return x.name === name; }); if (st && st.snap) { st.snap.remove(); st.snap = null; } } // show the updated state poster
      return;
    }
    (queue[name] = queue[name] || {})[fn] = args;
  };
  Stage.setMotion = function (on) { Stage.motion = on; if(window.gsap&&!on) { gsap.globalTimeline.getChildren(true,true,false).forEach(function(t){t.progress(1);}); } };
  /* Render one scene at rest at a fixed width and return a PNG data URL (used by tools/capture_posters.py). */
  Stage.capture = function (name, width) {
    const s = stages.find(function (x) { return x.name === name; });
    if (!Stage.ok || !s) return null;
    const sc = build(s); if (!sc) return null;
    const z = sizeOf(s), w = width || 1440, h = Math.round(w * z.h / z.w), pr = renderer.getPixelRatio();
    const look = sc.look ? Object.assign({}, sc.look) : null;
    if (sc.look) Object.assign(sc.look, { grain: 0, ca: 0, fade: 0, focusPull: 0 });
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    placeCamera(sc, w / h, clock, 0, s); draw(sc, w, h, 0, true);
    const url = canvas.toDataURL('image/png');
    sc.camera.updateMatrixWorld(true);
    Stage.lastPins = (sc.labels || []).filter(function (L) { return !(L.show && !L.show()); }).map(function (L) {
      const v = L.anchor.isObject3D ? L.anchor.getWorldPosition(new T.Vector3()) : L.anchor.clone();
      v.project(sc.camera);
      return { text: L.text, cls: L.cls || '', x: v.x * 0.5 + 0.5, y: -0.5 * v.y + 0.5, z: v.z };
    }).filter(function (p) { return p.z >= -1 && p.z <= 1 && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1; }).map(function (p) { return { text: p.text, cls: p.cls, x: p.x, y: p.y }; });
    Stage.lastRatio = w / h;
    if (look) Object.assign(sc.look, look);
    renderer.setPixelRatio(pr); if (active) resize(active); kick(100);
    return url;
  };
})();
