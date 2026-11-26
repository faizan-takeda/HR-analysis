/* Takeda 2030: immersive world layer ("living diorama").
   Re-implements, in vanilla Three.js r158, the techniques that make the best-loved
   R3F / drei / Theatre.js work feel real, without a build step:
     - PCSS soft shadows (drei <SoftShadows>) patched into the r158 shadow chunk
     - per-chapter lighting moods with a sky-derived image-based environment (drei <Environment>/<Lightformer>)
     - procedural sky, infinite ground and horizon fog that turn each plinth into a model in a real place
     - landscape scatter with wind sway, cloud shadows, dust motes (drei <Sparkles>) and birds
     - world-space surface micro-variation on every PBR material
     - Theatre-style keyed establishing shots (GSAP timelines), scroll-scrubbed parallax (ScrollTrigger),
       pointer parallax and an idle camera drift (drei <CameraShake>)
   Business models, scene APIs, labels and the framing solver are untouched; everything added lives in
   one group per scene that is excluded from camera fitting. */
(function () {
  'use strict';
  const T = window.THREE, TK = window.TK || {}, K = TK.K, S = TK.SCENES;
  if (!T || !K || !S) return;
  const V = function (x, y, z) { return new T.Vector3(x, y, z); };
  const params = new URLSearchParams(location.search);
  const enabled = params.get('world') !== 'off';

  /* ------------------------------------------------------------------ PCSS soft shadows */
  // Applied from attach(), before any chapter material compiles; skipped on CPU rasterisers where 32 taps per pixel is too slow.
  function patchShadows() {
    const C = T.ShaderChunk;
    let s = C.shadowmap_pars_fragment;
    const fn = s.indexOf('float getShadow( sampler2D');
    const anchor = 'if ( frustumTest ) {';
    const at = s.indexOf(anchor, fn);
    if (!enabled || fn < 0 || at < 0 || s.indexOf('tkPCSS') >= 0) return;
    const PCSS = [
      '#define TK_PCSS_N 16',
      'float tkIGN(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}',
      'vec2 tkVogel(int i,float phi){float r=sqrt(float(i)+.5)*.25;float th=float(i)*2.39996323+phi;return vec2(cos(th),sin(th))*r;}',
      'float tkPCSS(sampler2D sm,vec2 size,vec4 c){',
      ' vec2 tx=1./size;float phi=tkIGN(gl_FragCoord.xy)*PI2;float sum=0.,n=0.;',
      ' for(int i=0;i<TK_PCSS_N;i++){float d=unpackRGBAToDepth(texture2D(sm,c.xy+tkVogel(i,phi)*tx*10.));if(d<c.z){sum+=d;n+=1.;}}',
      ' if(n<1.)return 1.;',
      ' float pen=clamp((c.z-sum/n)*140.,1.1,8.5);float v=0.;',
      ' for(int i=0;i<TK_PCSS_N;i++){v+=step(c.z,unpackRGBAToDepth(texture2D(sm,c.xy+tkVogel(i,phi+1.7)*tx*pen)));}',
      ' return v/float(TK_PCSS_N);}',
      ''
    ].join('\n');
    s = s.slice(0, fn) + PCSS + s.slice(fn, at + anchor.length) + '\n\t\t\treturn tkPCSS( shadowMap, shadowMapSize, shadowCoord );\n' + s.slice(at + anchor.length);
    C.shadowmap_pars_fragment = s;
  }

  /* ------------------------------------------------------------------ shared uniforms */
  const U = { time: { value: 0 }, cloud: { value: 0 }, glow: { value: 1 }, grain: { value: 0.07 } };
  const NOISE = [
    'varying vec3 vTkW;uniform float uTkTime,uTkCloud,uTkGrain;',
    'float tkH(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float tkN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
    ' return mix(mix(mix(tkH(i),tkH(i+vec3(1,0,0)),f.x),mix(tkH(i+vec3(0,1,0)),tkH(i+vec3(1,1,0)),f.x),f.y),',
    '            mix(mix(tkH(i+vec3(0,0,1)),tkH(i+vec3(1,0,1)),f.x),mix(tkH(i+vec3(0,1,1)),tkH(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float tkCloudShade(){if(uTkCloud<=0.)return 1.;vec2 p=vTkW.xz*.05+uTkTime*vec2(.022,.013);',
    ' float n=tkN(vec3(p,0.))*.6+tkN(vec3(p*2.3,1.7))*.3+tkN(vec3(p*5.1,3.1))*.1;return 1.-uTkCloud*smoothstep(.46,.68,n);}'
  ].join('\n');

  /* Patch a PBR material: world-space micro variation of albedo/roughness, cloud shadows on direct light,
     optional ground pattern and canopy wind sway. One program variant per feature set. */
  const patched = new WeakSet();
  function enhanceStandard(mat, extra) {
    if (!mat || patched.has(mat) || !(mat.isMeshStandardMaterial) || mat.onBeforeCompile !== T.Material.prototype.onBeforeCompile) return;
    patched.add(mat);
    const x = extra || {};
    const key = 'tk|' + (x.ground || 0) + '|' + (x.sway ? 1 : 0);
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uTkTime = U.time; sh.uniforms.uTkCloud = U.cloud; sh.uniforms.uTkGrain = U.grain;
      if (x.uniforms) Object.assign(sh.uniforms, x.uniforms);
      let vs = sh.vertexShader, fs = sh.fragmentShader;
      vs = vs.replace('#include <common>', '#include <common>\nvarying vec3 vTkW;uniform float uTkTime;');
      if (x.sway) vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n{float ph=instanceMatrix[3].x*.37+instanceMatrix[3].z*.23;float k=max(position.y+.6,0.);transformed.x+=sin(uTkTime*1.25+ph)*.045*k;transformed.z+=cos(uTkTime*.93+ph*1.3)*.03*k;}\n#endif');
      vs = vs.replace('#include <project_vertex>', '#include <project_vertex>\n{vec4 tkw=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ntkw=instanceMatrix*tkw;\n#endif\nvTkW=(modelMatrix*tkw).xyz;}');
      fs = fs.replace('#include <common>', '#include <common>\n' + NOISE + (x.groundGLSL || ''));
      fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\nfloat tkV=tkN(vTkW*2.1)*.62+tkN(vTkW*8.3+3.1)*.38;diffuseColor.rgb*=1.+(tkV-.5)*uTkGrain;' + (x.groundColor || ''));
      fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(tkV-.5)*.16,.04,1.);');
      if (x.groundEmissive) fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + x.groundEmissive);
      fs = fs.replace('#include <aomap_fragment>', '{float tkc=tkCloudShade();reflectedLight.directDiffuse*=tkc;reflectedLight.directSpecular*=tkc;}\n#include <aomap_fragment>');
      sh.vertexShader = vs; sh.fragmentShader = fs;
    };
    mat.customProgramCacheKey = function () { return key; };
    if (x.ground) mat.extensions = Object.assign(mat.extensions || {}, { derivatives: true });
    mat.needsUpdate = true;
  }
  /* Unlit accent materials (flows, beads, holograms) become HDR emitters so bloom can pick them up. */
  function enhanceBasic(mat) {
    if (!mat || patched.has(mat) || !mat.isMeshBasicMaterial || mat.toneMapped !== false || mat.onBeforeCompile !== T.Material.prototype.onBeforeCompile) return;
    patched.add(mat);
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uTkGlow = U.glow;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTkGlow;').replace('#include <opaque_fragment>', 'outgoingLight*=uTkGlow;\n#include <opaque_fragment>');
    };
    mat.customProgramCacheKey = function () { return 'tkglow'; };
    mat.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ chapter moods */
  // Colours are sRGB hex. dir = direction towards the sun. Ground: meadow | terrazzo | plaza | grid.
  const MOODS = {
    golden: { zen: 0x5f8fcb, hor: 0xecd9c2, sun: 0xffd3a2, sunI: 3.7, dir: [0.78, 0.86, 0.42], hemi: [0xdce8ff, 0xa99a7e, 0.3], rim: [0xa8c6ff, 0.85], ground: 0x86a85c, groundKind: 'meadow', cloud: 0.26, dust: 0xffe2b0, dustN: 160, birds: true, env: 0.75, fogNear: 0.45, fogFar: 4.6,
      look: { exposure: 0.98, bloom: 0.26, bloomThreshold: 1.55, saturation: 1.1, contrast: 0.18, vignette: 0.24, shadowTint: [0.9, 0.96, 1.06], highTint: [1.05, 1.0, 0.93], tilt: 0, aoIntensity: 0.75 } },
    studio: { zen: 0x9db5cc, hor: 0xdedcd5, sun: 0xfff0dc, sunI: 3.4, dir: [0.62, 1.0, 0.52], hemi: [0xf2f6ff, 0xa79f92, 0.26], rim: [0xbcd4ff, 0.8], ground: 0xb3ab9e, groundKind: 'terrazzo', tile: 2.4, cloud: 0, dust: 0xfff3e0, dustN: 110, columns: true, env: 0.62, fogNear: 1.1, fogFar: 6.5,
      look: { exposure: 0.95, bloom: 0.22, bloomThreshold: 1.7, saturation: 1.08, contrast: 0.2, vignette: 0.24, shadowTint: [0.92, 0.97, 1.05], highTint: [1.04, 1.0, 0.95], tilt: 0, aoIntensity: 0.85 } },
    atrium: { zen: 0x93b1cf, hor: 0xe3dccf, sun: 0xffe6c6, sunI: 3.5, dir: [0.7, 0.95, 0.48], hemi: [0xf1f4ff, 0xa59a86, 0.26], rim: [0xb5ceff, 0.85], ground: 0xb7ab98, groundKind: 'terrazzo', tile: 2.0, cloud: 0.1, dust: 0xffecd0, dustN: 120, columns: true, env: 0.62, fogNear: 1.1, fogFar: 6.5,
      look: { exposure: 0.95, bloom: 0.22, bloomThreshold: 1.7, saturation: 1.09, contrast: 0.2, vignette: 0.24, shadowTint: [0.92, 0.97, 1.06], highTint: [1.05, 1.0, 0.95], tilt: 0, aoIntensity: 0.85 } },
    blue: { zen: 0x1b2a46, hor: 0x7a8eae, sun: 0xffc596, sunI: 2.4, dir: [0.88, 0.52, -0.25], hemi: [0x9fb8e6, 0x2a3140, 0.42], rim: [0x6fdcff, 1.3], ground: 0x263042, groundKind: 'grid', cloud: 0, dust: 0x8ff3ff, dustN: 220, rising: true, env: 0.7, fogNear: 0.6, fogFar: 4.2,
      look: { exposure: 1.06, bloom: 0.5, bloomThreshold: 1.05, saturation: 1.12, contrast: 0.18, vignette: 0.32, shadowTint: [0.88, 0.95, 1.12], highTint: [1.06, 1.0, 0.92], tilt: 0, aoIntensity: 0.85 } },
    industrial: { zen: 0x6f9fd4, hor: 0xdde3e4, sun: 0xfff2e0, sunI: 3.7, dir: [0.72, 1.0, 0.45], hemi: [0xe4eeff, 0x9c9a90, 0.28], rim: [0xa9c8ff, 0.8], ground: 0xaeb0ab, groundKind: 'plaza', tile: 1.6, cloud: 0.22, dust: 0xfff6e8, dustN: 90, env: 0.65, fogNear: 0.9, fogFar: 6,
      look: { exposure: 0.96, bloom: 0.22, bloomThreshold: 1.65, saturation: 1.08, contrast: 0.2, vignette: 0.24, shadowTint: [0.92, 0.97, 1.06], highTint: [1.04, 1.0, 0.95], tilt: 0, aoIntensity: 0.85 } },
    sunset: { zen: 0x46689e, hor: 0xefc49c, sun: 0xffb57a, sunI: 3.4, dir: [0.86, 0.5, 0.2], hemi: [0xffe0c4, 0x6f6a5a, 0.32], rim: [0x8fb4ff, 1.0], ground: 0x7f9f52, groundKind: 'meadow', cloud: 0.18, dust: 0xffc98a, dustN: 190, birds: true, env: 0.72, fogNear: 0.45, fogFar: 4.6,
      look: { exposure: 1.0, bloom: 0.34, bloomThreshold: 1.35, saturation: 1.12, contrast: 0.18, vignette: 0.27, shadowTint: [0.88, 0.95, 1.1], highTint: [1.07, 0.99, 0.9], tilt: 0, aoIntensity: 0.8 } },
    // Takeda Garden day cycle for the middle chapters: same lawn, sky and light family as chapters 1 and 11.
    morning: { zen: 0x6497d4, hor: 0xe6e3d5, sun: 0xfff0d8, sunI: 3.6, dir: [0.6, 1.0, 0.55], hemi: [0xe2ecff, 0xa39b80, 0.3], rim: [0xb0ccff, 0.85], ground: 0x8aac5e, groundKind: 'meadow', cloud: 0.2, dust: 0xfff1d6, dustN: 110, birds: true, env: 0.72, fogNear: 0.8, fogFar: 6,
      look: { exposure: 0.97, bloom: 0.24, bloomThreshold: 1.6, saturation: 1.1, contrast: 0.18, vignette: 0.23, shadowTint: [0.91, 0.96, 1.06], highTint: [1.04, 1.0, 0.95], tilt: 0, aoIntensity: 0.8 } },
    noon: { zen: 0x5891d6, hor: 0xe2e6dc, sun: 0xfff6ea, sunI: 3.8, dir: [0.5, 1.2, 0.5], hemi: [0xe6efff, 0xa19c84, 0.3], rim: [0xb3cdff, 0.8], ground: 0x86aa5a, groundKind: 'meadow', cloud: 0.24, dust: 0xfff6e6, dustN: 100, birds: true, env: 0.72, fogNear: 0.8, fogFar: 6,
      look: { exposure: 0.96, bloom: 0.22, bloomThreshold: 1.65, saturation: 1.1, contrast: 0.18, vignette: 0.22, shadowTint: [0.92, 0.97, 1.05], highTint: [1.03, 1.0, 0.96], tilt: 0, aoIntensity: 0.8 } },
    afternoon: { zen: 0x5a8ac6, hor: 0xebd8bf, sun: 0xffdcae, sunI: 3.6, dir: [0.82, 0.78, 0.38], hemi: [0xdfe8ff, 0xa5967a, 0.3], rim: [0xa8c4ff, 0.9], ground: 0x88a75a, groundKind: 'meadow', cloud: 0.22, dust: 0xffe4b8, dustN: 130, birds: true, env: 0.74, fogNear: 0.8, fogFar: 6,
      look: { exposure: 0.98, bloom: 0.26, bloomThreshold: 1.55, saturation: 1.11, contrast: 0.18, vignette: 0.24, shadowTint: [0.9, 0.96, 1.07], highTint: [1.05, 1.0, 0.93], tilt: 0, aoIntensity: 0.78 } },
    dusk: { zen: 0x1c2c4c, hor: 0x8a95b0, sun: 0xffb88a, sunI: 2.4, dir: [0.88, 0.5, -0.2], hemi: [0xa9bfe8, 0x34402f, 0.5], rim: [0x8fd8ff, 1.15], ground: 0x40593a, groundKind: 'meadow', cloud: 0, dust: 0xffe7a0, dustN: 150, env: 0.72, fogNear: 0.8, fogFar: 5.5,
      look: { exposure: 1.06, bloom: 0.4, bloomThreshold: 1.15, saturation: 1.1, contrast: 0.17, vignette: 0.3, shadowTint: [0.88, 0.95, 1.12], highTint: [1.06, 1.0, 0.93], tilt: 0, aoIntensity: 0.82 } }
  };
  const gardenOn = params.get('garden') !== 'off';
  const SCENE_MOOD = gardenOn
    ? { campus: 'golden', tools: 'morning', allocation: 'morning', tower: 'morning', route: 'noon', journey: 'noon', team: 'noon', network: 'dusk', ownership: 'afternoon', gates: 'afternoon', flywheel: 'sunset' }
    : { campus: 'golden', tools: 'studio', allocation: 'atrium', tower: 'atrium', route: 'studio', journey: 'atrium', team: 'atrium', network: 'blue', ownership: 'industrial', gates: 'industrial', flywheel: 'sunset' };
  // Theatre-style establishing shot per chapter: offsets the camera starts from, then eases home.
  const SHOTS = {
    campus: { yaw: 0.34, pitch: 0.22, zoom: 1.42, dur: 4.2 }, tools: { yaw: -0.3, pitch: 0.05, zoom: 1.2, dur: 3.4 },
    allocation: { yaw: 0.28, pitch: 0.12, zoom: 1.25, dur: 3.4 }, tower: { yaw: -0.26, pitch: 0.1, zoom: 1.22, dur: 3.4 },
    route: { yaw: 0.3, pitch: 0.06, zoom: 1.2, dur: 3.4 }, journey: { yaw: -0.32, pitch: 0.08, zoom: 1.22, dur: 3.6 },
    team: { yaw: 0.26, pitch: 0.12, zoom: 1.24, dur: 3.4 }, network: { yaw: 0.62, pitch: 0.26, zoom: 1.35, dur: 4.2 },
    ownership: { yaw: -0.28, pitch: 0.1, zoom: 1.22, dur: 3.4 }, gates: { yaw: 0.3, pitch: 0.08, zoom: 1.22, dur: 3.6 },
    flywheel: { yaw: -0.55, pitch: 0.24, zoom: 1.38, dur: 4.4 }
  };
  const c3 = function (hex) { return new T.Color(hex); };
  const tint = function (a) { return new T.Color(a[0], a[1], a[2]); };

  /* ------------------------------------------------------------------ sky + image-based light */
  const SKY_VERT = 'varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}';
  const SKY_FRAG = [
    'uniform vec3 uZen,uHor,uSunCol,uSunDir;uniform float uSunI;varying vec3 vDir;',
    'void main(){vec3 d=normalize(vDir);float h=d.y;float mu=max(dot(d,uSunDir),0.);',
    ' vec3 c=mix(uHor,uZen,pow(clamp(h,0.,1.),.55));',
    ' c=mix(c,uHor,smoothstep(0.,-.12,h));',
    ' c+=uSunCol*(pow(mu,5.)*.22+pow(mu,48.)*.5)*uSunI;',
    ' c+=uSunCol*smoothstep(.9993,.9998,mu)*uSunI*10.;',
    ' gl_FragColor=vec4(c,1.);',
    ' #include <tonemapping_fragment>',
    ' #include <colorspace_fragment>',
    '}'
  ].join('\n');
  function skyMaterial(m) {
    const sd = V(m.dir[0], m.dir[1], m.dir[2]).normalize();
    return new T.ShaderMaterial({
      uniforms: { uZen: { value: c3(m.zen) }, uHor: { value: c3(m.hor) }, uSunCol: { value: c3(m.sun) }, uSunDir: { value: sd }, uSunI: { value: 1 } },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: T.BackSide, depthWrite: false, fog: false
    });
  }
  let renderer = null, fxOn = false, lite = false;
  const envCache = {};
  function envFor(key) {
    if (!renderer) return K.env;
    if (envCache[key]) return envCache[key];
    const m = MOODS[key];
    const room = new T.Scene();
    room.add(new T.Mesh(new T.SphereGeometry(50, 48, 24), skyMaterial(m)));
    const groundM = new T.MeshBasicMaterial({ color: c3(m.ground).multiplyScalar(0.55), side: T.DoubleSide });
    const g = new T.Mesh(new T.CircleGeometry(40, 48), groundM); g.rotation.x = -Math.PI / 2; g.position.y = -2; room.add(g);
    // Lightformers: a soft sun card and two broad studio softboxes give believable glass and metal reflections.
    const sd = V(m.dir[0], m.dir[1], m.dir[2]).normalize();
    function card(pos, w, h, col, k) { const mm = new T.MeshBasicMaterial({ color: c3(col).multiplyScalar(k), side: T.DoubleSide }); const q = new T.Mesh(new T.PlaneGeometry(w, h), mm); q.position.copy(pos); q.lookAt(0, 0, 0); room.add(q); }
    card(sd.clone().multiplyScalar(30), 9, 9, m.sun, 9);
    card(V(-26, 14, 10), 22, 10, 0xffffff, 1.6);
    card(V(0, 30, 0), 26, 26, 0xffffff, m.groundKind === 'grid' ? 0.35 : 1.25);
    const pm = new T.PMREMGenerator(renderer);
    const tex = pm.fromScene(room, 0.025).texture;
    pm.dispose();
    envCache[key] = tex;
    return tex;
  }

  /* ------------------------------------------------------------------ ground */
  const GROUND_KIND = { meadow: 1, terrazzo: 2, plaza: 3, grid: 4 };
  function groundMaterial(m, R) {
    const mat = new T.MeshStandardMaterial({ color: c3(m.ground), roughness: m.groundKind === 'grid' ? 0.42 : m.groundKind === 'terrazzo' ? 0.5 : 0.94, metalness: 0, envMapIntensity: m.groundKind === 'grid' ? 0.9 : 0.55 });
    const kind = GROUND_KIND[m.groundKind] || 2;
    const uniforms = { uTkTile: { value: m.tile || 2 }, uTkR: { value: R }, uTkGridCol: { value: c3(0x46e6d6) } };
    const groundGLSL = '\nuniform float uTkTile,uTkR;uniform vec3 uTkGridCol;\nfloat tkLine(vec2 p,float t){vec2 q=p/t;vec2 w=fwidth(q);vec2 f=abs(fract(q-.5)-.5)/max(w,1e-4);float l=1.-min(min(f.x,f.y),1.);return l*(1.-smoothstep(.06,.3,max(w.x,w.y)));}\n';
    let groundColor = 'vec2 tkg=vTkW.xz;float tkBig=tkN(vec3(tkg*.03,0.));float tkMid=tkN(vec3(tkg*.22,2.));';
    if (kind === 1) groundColor += 'diffuseColor.rgb*=mix(vec3(.8,.93,.76),vec3(1.1,1.05,.88),tkBig)*(.9+tkMid*.16);float tkFine=tkN(vec3(tkg*3.1,5.));diffuseColor.rgb*=.92+tkFine*.12;';
    else if (kind === 2) groundColor += 'diffuseColor.rgb*=.94+tkBig*.08+tkMid*.03;diffuseColor.rgb*=1.-tkLine(tkg,uTkTile)*.16;float tkSp=step(.93,tkN(vec3(tkg*14.,7.)));diffuseColor.rgb*=1.-tkSp*.08;';
    else if (kind === 3) groundColor += 'diffuseColor.rgb*=.92+tkBig*.1+tkMid*.05;diffuseColor.rgb*=1.-tkLine(tkg,uTkTile)*.22-tkLine(tkg+vec2(uTkTile*.5,0.),uTkTile*4.)*.08;';
    else groundColor += 'diffuseColor.rgb*=.85+tkBig*.25;';
    // ground contact darkening toward the plinth, like a baked AO ring
    groundColor += 'float tkD=length(max(abs(tkg)-vec2(uTkR*.82,uTkR*.5),0.));diffuseColor.rgb*=mix(.78,1.,smoothstep(0.,uTkR*.35,tkD));';
    const groundEmissive = kind === 4 ? 'float tkG=tkLine(vTkW.xz,2.)+tkLine(vTkW.xz,10.)*.6;float tkF=exp(-length(vTkW.xz)/(uTkR*3.5));totalEmissiveRadiance+=uTkGridCol*tkG*tkF*.5;' : '';
    enhanceStandard(mat, { ground: kind, uniforms: uniforms, groundGLSL: groundGLSL, groundColor: groundColor, groundEmissive: groundEmissive });
    return mat;
  }

  /* ------------------------------------------------------------------ landscape scatter */
  function scatter(layer, m, box, gy, R, rand, blocked) {
    const hx = (box.max.x - box.min.x) / 2 + 2.2, hz = (box.max.z - box.min.z) / 2 + 2.2;
    const cx = (box.max.x + box.min.x) / 2, cz = (box.max.z + box.min.z) / 2;
    const dummy = new T.Object3D(), col = new T.Color();
    function okSpot(x, z, tall) {
      if (Math.abs(x - cx) < hx && Math.abs(z - cz) < hz) return false;
      // keep the line of sight between the camera (front, +z) and the model clear of tall objects
      if (tall && z > cz && Math.abs(x - cx) < hx + 5 + (z - cz) * 0.35) return false;
      if (blocked && blocked(x, z, tall)) return false;
      return true;
    }
    if (m.groundKind === 'meadow') {
      const N = lite ? 70 : 170;
      const trunkGeo = new T.CylinderGeometry(0.1, 0.17, 1, 6); trunkGeo.translate(0, 0.5, 0);
      const crownGeo = new T.IcosahedronGeometry(1, 1);
      const trunkM = new T.MeshStandardMaterial({ color: 0x6d5644, roughness: 0.95 });
      const crownM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, flatShading: true });
      enhanceStandard(trunkM); enhanceStandard(crownM, { sway: true });
      const trunks = new T.InstancedMesh(trunkGeo, trunkM, N), crowns = new T.InstancedMesh(crownGeo, crownM, N * 2);
      // soft contact blobs (drei ContactShadows idea, pre-baked) so scattered trees sit on the ground
      const blobTex = K.contactShadow(1, 1).material.map;
      const blobGeo = new T.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
      const blobs = new T.InstancedMesh(blobGeo, new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -2 }), N);
      let n = 0, nc = 0, guard = 0;
      const greens = [0x6f9a68, 0x5c8758, 0x86a46c, 0x4f7a55, 0x9aae6e, 0x7c9b5a];
      while (n < N && guard++ < 6000) {
        const a = rand() * Math.PI * 2, r = R * (1.05 + Math.pow(rand(), 0.7) * 5.2);
        const x = cx + Math.cos(a) * r * 1.25, z = cz + Math.sin(a) * r;
        if (!okSpot(x, z, true)) continue;
        const h = 1.8 + rand() * 2.6;
        dummy.position.set(x, gy, z); dummy.rotation.set(0, rand() * 6.28, 0); dummy.scale.set(1, h * 0.42, 1); dummy.updateMatrix();
        trunks.setMatrixAt(n, dummy.matrix);
        dummy.position.set(x + 0.25, gy + 0.012, z - 0.1); dummy.rotation.set(0, 0, 0); dummy.scale.set(h * 1.05, 1, h * 0.9); dummy.updateMatrix();
        blobs.setMatrixAt(n, dummy.matrix);
        const k = 1 + (rand() > 0.6 ? 1 : 0);
        for (let j = 0; j < k && nc < N * 2; j++) {
          const s = h * (0.36 - j * 0.08);
          dummy.position.set(x + (rand() - 0.5) * 0.3, gy + h * (0.56 + j * 0.24), z + (rand() - 0.5) * 0.3);
          dummy.scale.set(s, s * (0.9 + rand() * 0.3), s); dummy.rotation.set(rand(), rand() * 6.28, rand()); dummy.updateMatrix();
          crowns.setMatrixAt(nc, dummy.matrix);
          col.setHex(greens[Math.floor(rand() * greens.length)]).multiplyScalar(0.88 + rand() * 0.2);
          if (m === MOODS.sunset) col.lerp(c3(0xb39a58), 0.22);
          crowns.setColorAt(nc, col); nc++;
        }
        n++;
      }
      trunks.count = n; crowns.count = nc; blobs.count = n;
      [trunks, crowns].forEach(function (o) { o.castShadow = false; o.receiveShadow = true; o.instanceMatrix.needsUpdate = true; layer.add(o); });
      blobs.instanceMatrix.needsUpdate = true; blobs.renderOrder = -1; layer.add(blobs);
      if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
      // low shrubs and grass tufts, allowed in front of the model
      const B = lite ? 120 : 420, bushGeo = new T.IcosahedronGeometry(1, 0), bushM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
      enhanceStandard(bushM, { sway: true });
      const bushes = new T.InstancedMesh(bushGeo, bushM, B); let b = 0; guard = 0;
      while (b < B && guard++ < 9000) {
        const a = rand() * Math.PI * 2, r = R * (0.75 + Math.pow(rand(), 0.8) * 4.2);
        const x = cx + Math.cos(a) * r * 1.3, z = cz + Math.sin(a) * r;
        if (!okSpot(x, z, false)) continue;
        const s = 0.12 + rand() * 0.32;
        dummy.position.set(x, gy + s * 0.25, z); dummy.scale.set(s * 1.4, s * 0.7, s * 1.4); dummy.rotation.set(0, rand() * 6.28, 0); dummy.updateMatrix();
        bushes.setMatrixAt(b, dummy.matrix);
        col.setHex(greens[Math.floor(rand() * greens.length)]).multiplyScalar(0.8 + rand() * 0.3); bushes.setColorAt(b, col); b++;
      }
      bushes.count = b; bushes.castShadow = false; bushes.receiveShadow = true; bushes.instanceMatrix.needsUpdate = true; if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
      layer.add(bushes);
    }
    if (m.columns) {
      // A vast atrium: slender columns and a clerestory beam ring dissolving into the haze.
      const N = 22, colGeo = new T.BoxGeometry(0.9, 26, 0.9); colGeo.translate(0, 13, 0);
      const colM = new T.MeshStandardMaterial({ color: 0xeeebe4, roughness: 0.7 }); enhanceStandard(colM);
      const cols = new T.InstancedMesh(colGeo, colM, N); let n = 0;
      for (let i = 0; i < N; i++) {
        const a = -Math.PI * 0.95 + i / (N - 1) * Math.PI * 0.9;
        const x = cx + Math.cos(a) * R * 3.4, z = cz + Math.sin(a) * R * 2.4 - R * 0.4;
        if (!okSpot(x, z, true)) continue;
        dummy.position.set(x, gy, z); dummy.rotation.set(0, -a, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); cols.setMatrixAt(n++, dummy.matrix);
      }
      cols.count = n; cols.castShadow = false; cols.receiveShadow = true; cols.instanceMatrix.needsUpdate = true; layer.add(cols);
    }
    if (m.groundKind === 'grid') {
      // Distant data pylons with soft beacons on the horizon.
      const N = 26, pg = new T.CylinderGeometry(0.08, 0.14, 1, 6); pg.translate(0, 0.5, 0);
      const pm = new T.MeshStandardMaterial({ color: 0x3b4a61, roughness: 0.5, metalness: 0.4 }); enhanceStandard(pm);
      const beaconM = new T.MeshBasicMaterial({ color: 0x7ff4ff, toneMapped: false }); enhanceBasic(beaconM);
      const pylons = new T.InstancedMesh(pg, pm, N), beacons = new T.InstancedMesh(new T.SphereGeometry(0.16, 10, 8), beaconM, N);
      let n = 0;
      for (let i = 0; i < N * 3 && n < N; i++) {
        const a = rand() * Math.PI * 2, r = R * (1.5 + rand() * 3.5);
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (!okSpot(x, z, true)) continue;
        const h = 1.5 + rand() * 4.5;
        dummy.position.set(x, gy, z); dummy.scale.set(1, h, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); pylons.setMatrixAt(n, dummy.matrix);
        dummy.position.set(x, gy + h + 0.1, z); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); beacons.setMatrixAt(n, dummy.matrix); n++;
      }
      pylons.count = beacons.count = n; pylons.instanceMatrix.needsUpdate = beacons.instanceMatrix.needsUpdate = true;
      layer.add(pylons, beacons);
    }
  }

  /* ------------------------------------------------------------------ dust motes (Sparkles) */
  const DUST_VERT = [
    'attribute vec4 aSeed;uniform float uTime,uScale,uH,uRise;varying float vA;',
    'void main(){vec3 p=position;float t=uTime*(.15+aSeed.y*.25);',
    ' p.x+=sin(t+aSeed.x*6.28)*.6+sin(t*.37+aSeed.z*9.)*.35;p.z+=cos(t*.8+aSeed.z*6.28)*.6;',
    ' p.y=mix(p.y+sin(t*.7+aSeed.w*6.28)*.4,mod(p.y+uTime*(.25+aSeed.y*.35),uH),uRise);',
    ' vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;',
    ' float tw=.55+.45*sin(uTime*(1.3+aSeed.w*2.)+aSeed.x*30.);',
    ' vA=tw*(uRise>.5?smoothstep(0.,.15,p.y/uH)*smoothstep(1.,.7,p.y/uH):1.);',
    ' gl_PointSize=(.6+aSeed.w*1.6)*uScale/-mv.z;}'
  ].join('\n');
  const DUST_FRAG = 'uniform vec3 uColor;uniform float uI;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.0,d);a*=a;gl_FragColor=vec4(uColor*uI*a*vA,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
  function dust(layer, m, box, gy, R, rand) {
    const N = m.dustN || 120, pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
    const cx = (box.max.x + box.min.x) / 2, cz = (box.max.z + box.min.z) / 2, H = Math.max(3, R * 0.55);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = cx + (rand() - 0.5) * R * 2.4; pos[i * 3 + 1] = gy + 0.3 + rand() * H; pos[i * 3 + 2] = cz + (rand() - 0.5) * R * 1.8;
      seed[i * 4] = rand(); seed[i * 4 + 1] = rand(); seed[i * 4 + 2] = rand(); seed[i * 4 + 3] = rand();
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new T.BufferAttribute(seed, 4));
    const mat = new T.ShaderMaterial({
      uniforms: { uTime: U.time, uScale: { value: 400 }, uH: { value: H + gy }, uRise: { value: m.rising ? 1 : 0 }, uColor: { value: c3(m.dust) }, uI: { value: m.rising ? 2.4 : 1.6 } },
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false
    });
    const pts = new T.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 10;
    layer.add(pts);
    return pts;
  }

  /* ------------------------------------------------------------------ birds */
  function birds(layer, box, R, rand) {
    const flock = [], mat = new T.MeshStandardMaterial({ color: 0x3c424a, roughness: 0.8, side: T.DoubleSide });
    const wing = new T.BufferGeometry();
    wing.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0, 0.09, 0, 0, -0.09, 0.34, 0.02, -0.03]), 3)); wing.computeVertexNormals();
    const body = new T.CapsuleGeometry(0.035, 0.16, 3, 6); body.rotateX(Math.PI / 2);
    const cx = (box.max.x + box.min.x) / 2, cz = (box.max.z + box.min.z) / 2;
    for (let i = 0; i < 7; i++) {
      const b = new T.Group(), bm = new T.Mesh(body, mat), l = new T.Mesh(wing, mat), r = new T.Mesh(wing, mat);
      r.scale.x = -1; b.add(bm, l, r); b.scale.setScalar(0.75 + rand() * 0.3);
      [bm, l, r].forEach(function (o) { o.castShadow = true; });
      layer.add(b);
      flock.push({ g: b, l: l, r: r, ph: rand() * 6.28, rad: R * (0.7 + rand() * 0.3), h: R * (0.58 + rand() * 0.14), sp: 0.085 + rand() * 0.02, off: i * 0.16, cx: cx, cz: cz });
    }
    return function (t) {
      flock.forEach(function (f) {
        const a = t * f.sp + f.off, x = f.cx + Math.cos(a) * f.rad * 1.3, z = f.cz + Math.sin(a) * f.rad * 0.8, y = f.h + Math.sin(t * 0.7 + f.ph) * 0.4;
        const nx = f.cx + Math.cos(a + 0.01) * f.rad * 1.3, nz = f.cz + Math.sin(a + 0.01) * f.rad * 0.8;
        f.g.position.set(x, y, z); f.g.rotation.y = Math.atan2(nx - x, nz - z);
        const flap = Math.sin(t * 9 + f.ph) * 0.75 * (0.5 + 0.5 * Math.max(0, Math.sin(t * 0.6 + f.ph)));
        f.l.rotation.z = flap; f.r.rotation.z = -flap;
      });
    };
  }

  /* ------------------------------------------------------------------ scene enhancement */
  function enhance(sc, name) {
    const key = SCENE_MOOD[name]; if (!key || !enabled) return sc;
    const m = MOODS[key], scene = sc.scene, rand = K.rng(name.length * 131 + 7);
    sc.scene.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(scene);
    const gy = box.min.y - 0.004;
    const R = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    // Lights
    const sunDir = V(m.dir[0], m.dir[1], m.dir[2]).normalize();
    scene.traverse(function (o) {
      if (o.isHemisphereLight) { o.color.setHex(m.hemi[0]); o.groundColor.setHex(m.hemi[1]); o.intensity = m.hemi[2]; }
      if (o.isDirectionalLight && o.castShadow) {
        const d = o.position.distanceTo(o.target.position) || 20;
        o.position.copy(o.target.position).addScaledVector(sunDir, d);
        o.color.setHex(m.sun); o.intensity = m.sunI;
        o.shadow.bias = -0.00025; o.shadow.normalBias = 0.03;
        const cam = o.shadow.camera, half = Math.max(cam.right, R * 1.15);
        cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.far = d + R * 3; cam.updateProjectionMatrix();
        o.shadow.mapSize.set(2048, 2048);
        if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
      } else if (o.isDirectionalLight) { o.intensity = 0.22; }
    });
    const rim = new T.DirectionalLight(m.rim[0], m.rim[1]);
    rim.position.set(-sunDir.x * 20, 14, -Math.abs(sunDir.z) * 20 - 10);
    // Image-based light from the chapter's own sky.
    scene.environment = envFor(key);
    // Materials
    scene.traverse(function (o) {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) {
        if (mt.isMeshStandardMaterial) { if (!lite) enhanceStandard(mt); if (mt.envMapIntensity === 1) mt.envMapIntensity = m.env; }
        else if (fxOn) enhanceBasic(mt);
      });
    });
    // World layer (excluded from framing)
    const layer = new T.Group(); layer.name = 'tk-immersive-world';
    layer.add(rim);
    const sky = new T.Mesh(new T.SphereGeometry(600, 48, 24), skyMaterial(m)); sky.renderOrder = -100; sky.frustumCulled = false; sky.name = 'tk-sky';
    layer.add(sky);
    // Takeda Garden landmarks for this chapter, if any (js/garden.js); they may raise the ground and cut a pond.
    // `model` is the opaque footprint (contact-shadow planes excluded) so vignettes hug the real plinth.
    const model = new T.Box3(), ob = new T.Box3();
    scene.traverse(function (o) {
      if (!o.isMesh || o.parent === layer || !o.material || (o.material.transparent && o.material.depthWrite === false)) return;
      ob.setFromObject(o); if (ob.max.y < -1.5) return; // pooled objects parked below the floor
      if (o.isInstancedMesh && ob.min.y < -1.5) ob.min.y = Math.max(ob.min.y, -1.5); // unused instances are parked at y = -20
      model.union(ob);
    });
    const baseY = model.isEmpty() ? gy : model.min.y - 0.004;
    const gardenDef = TK.Garden && TK.Garden.world && TK.Garden.world[name];
    const garden = gardenDef ? gardenDef({ layer: layer, box: box, model: model, gy: baseY, R: R, rand: rand, mood: m, lite: lite, patch: function (mt, o) { if (!lite) enhanceStandard(mt, o); } }) : null;
    const groundY = garden && garden.groundY != null ? garden.groundY : baseY;
    const groundGeo = garden && garden.pondR ? new T.RingGeometry(garden.pondR, 480, 160, 3) : new T.CircleGeometry(480, 96);
    const ground = new T.Mesh(groundGeo, groundMaterial(m, R)); ground.rotation.x = -Math.PI / 2; ground.position.y = groundY; ground.receiveShadow = true; ground.name = 'tk-ground';
    layer.add(ground);
    scatter(layer, m, box, groundY, R, rand, garden && garden.blocked);
    const motes = lite ? null : dust(layer, m, box, groundY, R, rand);
    const flock = m.birds ? birds(layer, box, R, rand) : null;
    scene.add(layer);
    const fogCol = c3(m.hor);
    scene.fog = new T.Fog(fogCol, 60, 400);
    sc.camera.near = Math.max(sc.camera.near, 1.5); sc.camera.far = Math.max(sc.camera.far, 1200); sc.camera.updateProjectionMatrix();
    sc._tkLayer = layer;
    sc._tk = { mood: m, key: key, R: R, sky: sky, motes: motes, flock: flock, garden: garden, shot: SHOTS[name] || SHOTS.tools, cam: { yaw: 0, pitch: 0, zoom: 1 }, ptr: { x: 0, y: 0, sx: 0, sy: 0 }, scroll: 0.5, scrollS: 0.5, seen: false };
    const L = m.look;
    sc.look = Object.assign({}, L, { shadowTint: tint(L.shadowTint), highTint: tint(L.highTint), fade: 0, focusPull: 0, fadeColor: new T.Color(0xf2f4f0) });
    return sc;
  }

  // Wrap scene builders (after the cinematic director so moods win).
  Object.keys(S).forEach(function (name) {
    const orig = S[name];
    S[name] = function (ctx) { return enhance(orig(ctx), name); };
  });

  // Exclude the world layer from the perspective-correct framing solver.
  if (TK.Visual && TK.Visual.frame && TK.Director) {
    const frame = TK.Visual.frame;
    TK.Visual.frame = function (sc, aspect, yaw, pitch) {
      if (sc._tkLayer && !sc._cinematicPoints) { const v = sc._tkLayer.visible; sc._tkLayer.visible = false; sc._cinematicPoints = TK.Director.bounds(sc); sc._tkLayer.visible = v; }
      return frame(sc, aspect, yaw, pitch);
    };
  }

  /* ------------------------------------------------------------------ static batching
     Merge every mesh that never moves into one draw call per material (thousands of draws become dozens).
     Scenes without a scenario API are batched whole; scenario-driven scenes only batch the world layer and
     decorative layers added after their core builder. Motion is detected by sampling the scene's own
     update() at several times, so anything animated (people, flows, icons, boats, birds) stays live. */
  function batchStatic(sc, anchors) {
    if (params.get('batch') === '0' || sc._batched) return 0;
    sc._batched = true;
    const scene = sc.scene, layer = sc._tkLayer, st = sc._tk;
    if (TK.Director && !sc._cinematicPoints) { if (layer) layer.visible = false; sc._cinematicPoints = TK.Director.bounds(sc); if (layer) layer.visible = true; }
    const roots = [];
    if (!sc.api) roots.push(scene);
    else { if (layer) roots.push(layer); if (sc._core) scene.children.forEach(function (c) { if (!sc._core.has(c) && c !== layer) roots.push(c); }); }
    const cands = [], seen = new Set();
    function eligible(o) {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.children.length || o.renderOrder !== 0 || anchors.has(o) || o.userData.noBatch) return false;
      if (o.name && o.name.indexOf('tk-') !== 0) return false;
      if (o.name === 'tk-sky' || o.name === 'tk-ground') return false;
      const m = o.material, g = o.geometry;
      if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || !g || !g.attributes.position) return false;
      if ((g.morphAttributes && g.morphAttributes.position) || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false;
      for (let p = o; p && p !== scene; p = p.parent) { if (!p.visible || p.userData.noBatch) return false; if (p.name && p.name.indexOf('tk-') !== 0) return false; }
      return true;
    }
    roots.forEach(function (r) { r.traverse(function (o) { if (!seen.has(o) && eligible(o)) { seen.add(o); cands.push(o); } }); });
    if (cands.length < 8) return 0;
    // motion sampling
    scene.updateMatrixWorld(true);
    const base = cands.map(function (m) { return m.matrixWorld.elements.slice(); }), moved = new Uint8Array(cands.length);
    const times = []; for (let i = 0; i < 24; i++) times.push(0.37 + i * 0.71);
    times.forEach(function (t) {
      if (sc.update) sc.update(t, 0.03);
      if (st) { if (st.flock) st.flock(t); if (st.garden && st.garden.update) st.garden.update(t, 0.03, 300); }
      scene.updateMatrixWorld(true);
      cands.forEach(function (m, i) {
        if (moved[i]) return;
        const e = m.matrixWorld.elements, b = base[i];
        for (let k = 0; k < 16; k++) if (Math.abs(e[k] - b[k]) > 1e-5) { moved[i] = 1; return; }
        for (let p = m; p && p !== scene; p = p.parent) if (!p.visible) { moved[i] = 1; return; }
      });
    });
    if (sc.update) sc.update(0, 0);
    if (st && st.garden && st.garden.update) st.garden.update(0, 0, 300);
    scene.updateMatrixWorld(true);
    // group static meshes by container + material + shadow flags + attribute layout
    const groups = new Map();
    cands.forEach(function (m, i) {
      if (moved[i]) return;
      let inLayer = false; for (let p = m.parent; p; p = p.parent) if (p === layer) { inLayer = true; break; }
      const mat = m.material, uv = !!(mat.map || mat.normalMap || mat.roughnessMap || mat.emissiveMap || mat.aoMap) && !!m.geometry.attributes.uv, col = !!mat.vertexColors;
      const key = (inLayer ? 'L' : 'S') + mat.uuid + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0) + (uv ? 1 : 0) + (col ? 1 : 0);
      if (!groups.has(key)) groups.set(key, { list: [], container: inLayer ? layer : scene, mat: mat, uv: uv, col: col, cast: m.castShadow, recv: m.receiveShadow });
      groups.get(key).list.push(m);
    });
    let removed = 0;
    groups.forEach(function (gp) {
      if (gp.list.length < 2) return;
      const inv = gp.container.matrixWorld.clone().invert(), mtx = new T.Matrix4();
      const geo = mergeGeometry(gp.list, function (m) { return mtx.multiplyMatrices(inv, m.matrixWorld); }, gp.uv, gp.col ? function () { return null; } : null);
      gp.list.forEach(function (m) { m.parent.remove(m); removed++; });
      const merged = new T.Mesh(geo, gp.mat); merged.castShadow = gp.cast; merged.receiveShadow = gp.recv; merged.name = 'tk-batch'; merged.matrixAutoUpdate = false;
      gp.container.add(merged); merged.updateMatrixWorld(true);
    });
    sc._batchStats = { candidates: cands.length, merged: removed, groups: groups.size };
    return removed;
  }
  /* Concatenate mesh geometries into one, transformed by mtxOf(mesh). colorOf(mesh) supplies a flat vertex colour
     (or null to copy the geometry's own colours). Mirrored transforms get their winding flipped. */
  function mergeGeometry(list, mtxOf, withUV, colorOf) {
    let nv = 0, ni = 0;
    list.forEach(function (m) { const g = m.geometry; if (!g.attributes.normal) g.computeVertexNormals(); nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = withUV ? new Float32Array(nv * 2) : null, col = colorOf ? new Float32Array(nv * 3) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    const nm = new T.Matrix3(), v = new T.Vector3();
    let vo = 0, io = 0;
    list.forEach(function (m) {
      const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color;
      const mtx = mtxOf(m), flat = colorOf ? colorOf(m) : null;
      nm.getNormalMatrix(mtx);
      for (let i = 0; i < p.count; i++) {
        const o3 = (vo + i) * 3;
        v.fromBufferAttribute(p, i).applyMatrix4(mtx); pos[o3] = v.x; pos[o3 + 1] = v.y; pos[o3 + 2] = v.z;
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor[o3] = v.x; nor[o3 + 1] = v.y; nor[o3 + 2] = v.z;
        if (uv) { uv[(vo + i) * 2] = u ? u.getX(i) : 0; uv[(vo + i) * 2 + 1] = u ? u.getY(i) : 0; }
        if (col) {
          if (flat) { col[o3] = flat.r; col[o3 + 1] = flat.g; col[o3 + 2] = flat.b; }
          else { col[o3] = c ? c.getX(i) : 1; col[o3 + 1] = c ? c.getY(i) : 1; col[o3 + 2] = c ? c.getZ(i) : 1; }
        }
      }
      const flip = mtx.determinant() < 0, cnt = g.index ? g.index.count : p.count;
      for (let k = 0; k < cnt; k += 3) {
        const a = g.index ? g.index.getX(k) : k, b = g.index ? g.index.getX(k + 1) : k + 1, d = g.index ? g.index.getX(k + 2) : k + 2;
        idx[io + k] = a + vo; idx[io + k + 1] = (flip ? d : b) + vo; idx[io + k + 2] = (flip ? b : d) + vo;
      }
      vo += p.count; io += cnt;
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    if (uv) geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    if (col) geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    return geo;
  }
  /* People: each rigid bone (body, thighs, shins, upper and lower arms) becomes one vertex-coloured mesh,
     so a 37-draw character costs about 9 while keeping its walk cycle. Meshes the scene code holds a reference
     to (for example the torso, whose material scenario code swaps) are left untouched. */
  let rigMat = null;
  function compactRigs(sc, anchors) {
    const people = [];
    sc.scene.traverse(function (o) { if (o.userData && o.userData.legL && o.userData.body) people.push(o); });
    if (!people.length) return 0;
    if (!rigMat) { rigMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.74, envMapIntensity: 0.8 }); if (!lite) enhanceStandard(rigMat); }
    let removed = 0;
    people.forEach(function (p) {
      const refs = new Set();
      Object.keys(p.userData).forEach(function (k) { const v = p.userData[k]; (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x && x.isObject3D) refs.add(x); }); });
      p.traverse(function (b) {
        if (!(b.isGroup || b === p)) return;
        const parts = b.children.filter(function (c) {
          const m = c.material;
          return c.isMesh && !c.isInstancedMesh && !c.children.length && c.visible && !anchors.has(c) && !refs.has(c) && m && !Array.isArray(m) && m.isMeshStandardMaterial && !m.transparent && !m.map && !(m.emissiveIntensity > 0 && m.emissive && m.emissive.getHex());
        });
        if (parts.length < 2) return;
        parts.forEach(function (c) { c.updateMatrix(); });
        const geo = mergeGeometry(parts, function (c) { return c.matrix; }, false, function (c) { return c.material.color; });
        const merged = new T.Mesh(geo, rigMat);
        merged.castShadow = parts.some(function (c) { return c.castShadow; }); merged.receiveShadow = true; merged.name = 'tk-rig';
        parts.forEach(function (c) { b.remove(c); removed++; });
        b.add(merged);
      });
    });
    return removed;
  }

  /* ------------------------------------------------------------------ camera direction */
  const ease = function (a, b, k) { return a + (b - a) * k; };
  function motionOn() { return !TK.Stage || (TK.Stage.motion && !TK.Stage.onDemand); }

  const Immersive = {
    enabled: enabled,
    attach: function (r, fx) {
      renderer = r; fxOn = !!fx; U.glow.value = fx ? 1.75 : 1;
      let soft = fx ? fx.software : false;
      if (!fx) { try { const gl = r.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); soft = /swiftshader|llvmpipe|software|basic render/i.test(gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER)); } catch (e) { /* unknown */ } }
      lite = soft && !params.get('quality');
      if (!lite) patchShadows();
    },
    /* Establishing shot (first visit) or a short settle (return visit): a keyed GSAP timeline. */
    onActivate: function (sc) {
      const st = sc._tk; if (!st || !sc.look) return;
      const L = sc.look;
      if (window.gsap) { gsap.killTweensOf(st.cam); gsap.killTweensOf(L); }
      if (!motionOn() || !window.gsap) { st.cam.yaw = st.cam.pitch = 0; st.cam.zoom = 1; L.fade = 0; L.focusPull = 0; st.seen = true; return; }
      const sh = st.shot;
      if (!st.seen) {
        st.seen = true;
        const dur = sh.dur * 0.78;
        st.cam.yaw = sh.yaw; st.cam.pitch = sh.pitch; st.cam.zoom = sh.zoom; L.fade = 1; L.focusPull = 0.45;
        const tl = gsap.timeline();
        tl.to(L, { fade: 0, duration: 0.9, ease: 'power2.out' }, 0)
          .to(st.cam, { yaw: 0, duration: dur, ease: 'power3.inOut' }, 0)
          .to(st.cam, { pitch: 0, duration: dur * 0.92, ease: 'power2.inOut' }, 0.1)
          .to(st.cam, { zoom: 1, duration: dur, ease: 'expo.inOut' }, 0)
          .to(L, { focusPull: 0, duration: 1.1, ease: 'power2.out' }, 0.25);
      } else {
        st.cam.zoom = 1.03; L.focusPull = 0; L.fade = Math.max(L.fade, 0.18);
        gsap.timeline().to(L, { fade: 0, duration: 0.45, ease: 'power2.out' }, 0).to(st.cam, { zoom: 1, duration: 1.0, ease: 'power3.out' }, 0);
      }
    },
    /* Bind pointer parallax and scroll scrubbing for one stage. */
    bindStage: function (stage, getScene) {
      const view = stage.view;
      view.addEventListener('pointermove', function (e) {
        const sc = getScene(); if (!sc || !sc._tk) return;
        const r = view.getBoundingClientRect();
        sc._tk.ptr.x = ((e.clientX - r.left) / r.width - 0.5) * 2; sc._tk.ptr.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      view.addEventListener('pointerleave', function () { const sc = getScene(); if (sc && sc._tk) { sc._tk.ptr.x = 0; sc._tk.ptr.y = 0; } });
      const setP = function (p) { const sc = getScene(); if (sc && sc._tk) sc._tk.scroll = p; stage._scrollP = p; };
      if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.create({ trigger: stage.el, start: 'top bottom', end: 'bottom top', onUpdate: function (self) { setP(self.progress); }, onRefresh: function (self) { setP(self.progress); } });
      } else {
        stage._scrollFallback = true;
      }
    },
    /* Per-frame camera offsets. solveYaw/solvePitch feed the framing solver; the rest are small, post-solve. */
    camera: function (sc, stage, t, dt) {
      const st = sc._tk; if (!st) return null;
      const on = motionOn(), k = 1 - Math.exp(-(dt || 0.016) * 3.2);
      if (stage && stage._scrollFallback) { const r = stage.el.getBoundingClientRect(), vh = innerHeight; stage._scrollP = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))); }
      if (stage && stage._scrollP != null) st.scroll = stage._scrollP;
      st.scrollS = ease(st.scrollS, on ? st.scroll : 0.5, k);
      st.ptr.sx = ease(st.ptr.sx, on ? st.ptr.x : 0, k * 0.8); st.ptr.sy = ease(st.ptr.sy, on ? st.ptr.y : 0, k * 0.8);
      const sp = st.scrollS - 0.5;
      const full = on && stage && document.fullscreenElement === stage.el;
      const orbit = full ? Math.sin(t * 0.07) * 0.2 : 0;
      const drift = on ? Math.sin(t * 0.21) * 0.006 + Math.sin(t * 0.37 + 1.3) * 0.004 : 0;
      const yaw = st.cam.yaw + sp * -0.16 + st.ptr.sx * -0.035 + drift;
      const pitch = st.cam.pitch + sp * 0.07 + st.ptr.sy * -0.02 + (on ? Math.sin(t * 0.29) * 0.004 : 0);
      const zoom = st.cam.zoom * (1 + Math.abs(yaw) * 0.32 + Math.max(0, pitch) * 0.2 + (on ? Math.sin(t * 0.17) * 0.004 : 0));
      return { solveYaw: orbit, yaw: yaw, pitch: pitch, zoom: zoom };
    },
    /* Per-frame world update and look (focus) for the post pipeline. */
    beforeRender: function (sc, t, dt, target, pxHeight) {
      const st = sc._tk; if (!st) return;
      U.time.value = t; U.cloud.value = st.mood.cloud || 0;
      const cam = sc.camera;
      st.sky.position.copy(cam.position);
      const dist = cam.position.distanceTo(target);
      if (sc.scene.fog) { sc.scene.fog.near = dist + st.R * st.mood.fogNear; sc.scene.fog.far = dist + st.R * st.mood.fogFar; }
      const pxScale = (pxHeight || 800) * 0.5 * cam.projectionMatrix.elements[5] * 0.045;
      if (st.motes) st.motes.material.uniforms.uScale.value = pxScale;
      if (st.flock) st.flock(t);
      if (st.garden && st.garden.update) { if (TK.Garden) TK.Garden.tick(t); st.garden.update(t, dt, pxScale); }
      // Everything within the model's depth stays in perfect focus; only the far landscape softens.
      if (sc.look) { sc.look.focus = dist; sc.look.focusRange = st.R * 1.15; }
    },
    moods: MOODS, sceneMood: SCENE_MOOD,
    batch: function (sc) {
      const anchors = new Set();
      (sc.labels || []).forEach(function (L) { if (L.anchor && L.anchor.isObject3D) anchors.add(L.anchor); });
      try { return batchStatic(sc, anchors) + compactRigs(sc, anchors); } catch (e) { console.warn('[batch] skipped:', e.message); return 0; }
    }
  };
  TK.Immersive = Immersive;
})();
