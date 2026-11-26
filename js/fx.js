/* Takeda 2030: cinematic post-processing pipeline (vanilla Three.js r158, no build step).
   A compact port of the techniques used by pmndrs/postprocessing, N8AO and three.js examples:
     HDR MSAA scene pass (+ depth texture)
     -> scalable ambient occlusion (half resolution, depth-aware upsample)
     -> dual-Kawase mip-chain bloom with a soft-knee threshold
     -> depth-of-field "miniature" focus (scatter-as-gather disc blur)
     -> ACES filmic tone map, split-tone grade, vignette, chromatic fringe, film grain.
   Quality adapts to the measured frame time. If anything is unsupported the stage falls
   back to plain forward rendering, so presentation content never depends on this file. */
(function () {
  'use strict';
  const T = window.THREE;
  const TK = window.TK = window.TK || {};
  if (!T) return;

  const params = new URLSearchParams(location.search);
  const VERT = 'varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}';

  // Shared GLSL helpers.
  const DEPTH = [
    'uniform float uNear,uFar;',
    'float viewZ(float d){return (uNear*uFar)/((uFar-uNear)*d-uFar);}', // negative in front of camera
  ].join('\n');

  const AO_FRAG = [
    'uniform sampler2D tDepth;uniform mat4 uProjInv;uniform vec2 uPx,uDPx;uniform float uRadius,uIntensity,uBias,uProjScale,uSeed;',
    DEPTH,
    'varying vec2 vUv;',
    'vec3 vp(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 c=uProjInv*vec4(uv*2.-1.,d*2.-1.,1.);return c.xyz/c.w;}',
    'float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}',
    'void main(){',
    ' float d=texture2D(tDepth,vUv).x;',
    ' if(d>=.99999){gl_FragColor=vec4(1.,-uFar,0.,1.);return;}',
    ' vec3 P=vp(vUv);',
    ' vec3 pr=vp(vUv+vec2(uDPx.x,0.)),pl=vp(vUv-vec2(uDPx.x,0.)),pu=vp(vUv+vec2(0.,uDPx.y)),pd=vp(vUv-vec2(0.,uDPx.y));',
    ' vec3 dx=abs(pr.z-P.z)<abs(P.z-pl.z)?pr-P:P-pl;vec3 dy=abs(pu.z-P.z)<abs(P.z-pd.z)?pu-P:P-pd;',
    ' vec3 N=normalize(cross(dx,dy));',
    ' float rPx=min(uRadius*uProjScale/-P.z,48.);',
    ' float rnd=ign(gl_FragCoord.xy)*6.2831853;float jit=ign(gl_FragCoord.yx+17.);',
    ' float r2=uRadius*uRadius,bias=uBias*-P.z,sum=0.;',
    ' for(int i=0;i<SAMPLES;i++){',
    '  float a=(float(i)+jit)/float(SAMPLES);',
    '  float ang=float(i)*2.39996323+rnd;',
    '  vec2 off=vec2(cos(ang),sin(ang))*max(a*a*rPx,1.5)*uPx;',
    '  vec3 v=vp(vUv+off)-P;float vv=dot(v,v);float vn=dot(v,N);',
    '  float f=max(r2-vv,0.)/r2;',
    '  sum+=f*f*max((vn-bias)/sqrt(vv+1e-4),0.);',
    ' }',
    ' float ao=clamp(1.-sum*uIntensity*6./float(SAMPLES),0.,1.);',
    ' ao=ao*ao;',
    ' gl_FragColor=vec4(ao,P.z,0.,1.);',
    '}'
  ].join('\n');

  const PREFILTER_FRAG = [
    'uniform sampler2D tColor;uniform float uThreshold,uKnee;uniform vec2 uPx;varying vec2 vUv;',
    'void main(){',
    ' vec3 c=texture2D(tColor,vUv+uPx*vec2(-.5,-.5)).rgb+texture2D(tColor,vUv+uPx*vec2(.5,-.5)).rgb+texture2D(tColor,vUv+uPx*vec2(-.5,.5)).rgb+texture2D(tColor,vUv+uPx*vec2(.5,.5)).rgb;',
    ' c*=.25;c=min(c,vec3(24.));',
    ' float l=max(c.r,max(c.g,c.b));',
    ' float soft=clamp(l-uThreshold+uKnee,0.,2.*uKnee);soft=soft*soft/(4.*uKnee+1e-4);',
    ' float w=max(soft,l-uThreshold)/max(l,1e-4);',
    ' gl_FragColor=vec4(c*w,1.);',
    '}'
  ].join('\n');

  const DOWN_FRAG = [
    'uniform sampler2D tColor;uniform vec2 uPx;varying vec2 vUv;',
    'void main(){vec2 h=uPx*.5;vec3 s=texture2D(tColor,vUv).rgb*4.;',
    's+=texture2D(tColor,vUv+h*vec2(-1.,-1.)).rgb;s+=texture2D(tColor,vUv+h*vec2(1.,-1.)).rgb;',
    's+=texture2D(tColor,vUv+h*vec2(-1.,1.)).rgb;s+=texture2D(tColor,vUv+h*vec2(1.,1.)).rgb;',
    'gl_FragColor=vec4(s/8.,1.);}'
  ].join('\n');

  const UP_FRAG = [
    'uniform sampler2D tColor;uniform vec2 uPx;uniform float uScale;varying vec2 vUv;',
    'void main(){vec2 h=uPx*.5;vec3 s=texture2D(tColor,vUv+vec2(-2.,0.)*h).rgb+texture2D(tColor,vUv+vec2(2.,0.)*h).rgb+texture2D(tColor,vUv+vec2(0.,-2.)*h).rgb+texture2D(tColor,vUv+vec2(0.,2.)*h).rgb;',
    's+=2.*(texture2D(tColor,vUv+vec2(-1.,-1.)*h).rgb+texture2D(tColor,vUv+vec2(1.,-1.)*h).rgb+texture2D(tColor,vUv+vec2(-1.,1.)*h).rgb+texture2D(tColor,vUv+vec2(1.,1.)*h).rgb);',
    'gl_FragColor=vec4(s/12.*uScale,1.);}'
  ].join('\n');

  // Pass 1: scene * AO + bloom, CoC packed in alpha (HDR target).
  const MERGE_FRAG = [
    'uniform sampler2D tColor,tDepth,tAO,tBloom;uniform vec2 uAOPx;uniform float uAO,uBloom,uFocus,uRange,uTilt,uTiltCenter,uFocusPull;',
    DEPTH,
    'varying vec2 vUv;',
    'void main(){',
    ' vec3 c=texture2D(tColor,vUv).rgb;',
    ' float z=viewZ(texture2D(tDepth,vUv).x);',
    ' #ifdef USE_AO',
    ' float ao=0.,w=0.;',
    ' for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){vec2 s=texture2D(tAO,vUv+vec2(float(x),float(y))*uAOPx).rg;float k=exp(-abs(s.y-z)*4./max(.15,-z*.03));ao+=s.x*k;w+=k;}',
    ' ao=w>0.?ao/w:1.;',
    ' c*=mix(1.,ao,uAO);',
    ' #ifdef AO_DEBUG',
    ' c=vec3(ao);',
    ' #endif',
    ' #endif',
    ' #ifdef USE_BLOOM',
    ' c+=texture2D(tBloom,vUv).rgb*uBloom;',
    ' #endif',
    ' float coc=clamp((abs(-z-uFocus)-uRange)/max(uRange*1.6,1e-3),0.,1.);',
    ' coc=max(coc,smoothstep(.18,.62,abs(vUv.y-uTiltCenter))*uTilt);',
    ' coc=max(coc,uFocusPull);',
    ' gl_FragColor=vec4(c,coc);',
    '}'
  ].join('\n');

  // Pass 2: depth of field gather, tone map and grade, to screen.
  const FINAL_FRAG = [
    'uniform sampler2D tColor;uniform vec2 uPx;uniform float uMaxBlur,uExposure,uVignette,uGrain,uTime,uSat,uContrast,uCA,uFade,uSharp;',
    'uniform vec3 uShadowTint,uHighTint,uFadeColor;varying vec2 vUv;',
    'vec3 tkRRTFit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}',
    'vec3 aces(vec3 c){const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));',
    'const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));',
    'c*=uExposure/.6;c=I*c;c=tkRRTFit(c);c=O*c;return clamp(c,0.,1.);}',
    'vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}',
    'float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
    'void main(){',
    ' vec4 C=texture2D(tColor,vUv);vec3 col=C.rgb;float coc=C.a;',
    ' #ifdef USE_DOF',
    ' float R=coc*uMaxBlur;',
    ' if(R>.35){',
    '  vec3 acc=col;float wsum=1.;',
    '  for(int i=0;i<DOF_TAPS;i++){',
    '   float fi=float(i)+.5;float r=sqrt(fi/float(DOF_TAPS))*R;float th=fi*2.39996323;',
    '   vec4 s=texture2D(tColor,vUv+vec2(cos(th),sin(th))*r*uPx);',
    '   float w=smoothstep(r-1.5,r+.5,s.a*uMaxBlur);',
    '   acc+=s.rgb*w;wsum+=w;}',
    '  col=acc/wsum;',
    ' }',
    ' #endif',
    ' vec2 dc=vUv-.5;',
    ' if(uCA>0.){vec2 o=dc*uCA*uPx*dot(dc,dc)*8.;col.r=mix(col.r,texture2D(tColor,vUv+o).r,.65);col.b=mix(col.b,texture2D(tColor,vUv-o).b,.65);}',
    ' col=aces(col);',
    // Contrast-adaptive sharpening (AMD CAS-style) on in-focus pixels, in display space, ringing-limited.
    ' if(uSharp>0.){',
    '  vec3 n=aces(texture2D(tColor,vUv+vec2(uPx.x,0.)).rgb),s=aces(texture2D(tColor,vUv-vec2(uPx.x,0.)).rgb),e=aces(texture2D(tColor,vUv+vec2(0.,uPx.y)).rgb),w=aces(texture2D(tColor,vUv-vec2(0.,uPx.y)).rgb);',
    '  vec3 mn=min(col,min(min(n,s),min(e,w))),mx=max(col,max(max(n,s),max(e,w)));',
    '  vec3 amp=sqrt(clamp(min(mn,1.-mx)/max(mx,1e-4),0.,1.));',
    '  float k=uSharp*(1.-smoothstep(.05,.3,coc));',
    '  vec3 wgt=-amp*k*.2;',
    '  col=clamp((col+(n+s+e+w)*wgt)/(1.+4.*wgt),0.,1.);',
    ' }',
    ' float l=dot(col,vec3(.2126,.7152,.0722));',
    ' col=mix(vec3(l),col,uSat);',
    ' col*=mix(uShadowTint,vec3(1.),smoothstep(0.,.45,l));',
    ' col*=mix(vec3(1.),uHighTint,smoothstep(.45,1.,l));',
    ' col=toSRGB(clamp(col,0.,1.));',
    ' col=mix(col,col*col*(3.-2.*col),uContrast);',
    ' float v=smoothstep(.85,.2,length(dc*vec2(1.,.82))*1.05);col*=mix(1.-uVignette,1.,v);',
    ' float g=hash(gl_FragCoord.xy+fract(uTime*7.13)*913.)-.5;col+=g*uGrain;',
    ' col+= (hash(gl_FragCoord.xy*1.37)-.5)/255.;',
    ' col=mix(col,uFadeColor,uFade);',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  // Plain-forward fallback still benefits from tone mapping; this module never runs unless init succeeds.
  function FX(renderer) {
    const gl = renderer.getContext();
    this.renderer = renderer;
    this.isGL2 = renderer.capabilities.isWebGL2;
    if (!this.isGL2) throw new Error('FX requires WebGL2');
    const ext = renderer.extensions;
    const floatOK = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    if (!floatOK) throw new Error('No float render targets');
    // Mobile GPUs implement MSAA with an implicit resolve that discards depth, so use supersampling there.
    this.msaa = ext.has('WEBGL_multisampled_render_to_texture') ? 0 : Math.min(4, renderer.capabilities.maxSamples || 4);
    this.camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const tri = new T.BufferGeometry();
    tri.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new T.Mesh(tri, null);
    this.quad.frustumCulled = false;
    this.scene = new T.Scene();
    this.scene.add(this.quad);
    this.w = 0; this.h = 0; this.time = 0;
    const lowPower = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.hardwareConcurrency || 8) <= 4;
    // GPU-blocklisted machines fall back to a CPU rasteriser; give those the lightest tier from the first frame.
    let software = false;
    try { const dbg = gl.getExtension('WEBGL_debug_renderer_info'); software = /swiftshader|llvmpipe|software|basic render/i.test(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER)); } catch (e) { /* unknown renderer */ }
    this.software = software;
    if (software && !params.get('quality')) this.msaa = 0;
    this.quality = params.get('quality') === 'low' ? 0 : params.get('quality') === 'ultra' ? 3 : params.get('quality') ? 2 : software ? 0 : lowPower ? 1 : 2;
    this.frames = []; this.lastTune = 0;
    this.stats = window.__tkStats = { quality: this.quality, fps: 0, msaa: this.msaa, software: software };
    this._build();
    void gl;
  }

  FX.prototype._mat = function (frag, uniforms, defines) {
    return new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: uniforms, defines: defines || {}, depthTest: false, depthWrite: false, toneMapped: false });
  };

  FX.prototype._build = function () {
    const q = this.quality;
    ['aoMat', 'preMat', 'downMat', 'upMat', 'mergeMat', 'finalMat'].forEach(function (k) { if (this[k]) this[k].dispose(); }, this);
    const U = function (v) { return { value: v }; };
    this.aoMat = this._mat(AO_FRAG, { tDepth: U(null), uProjInv: U(new T.Matrix4()), uPx: U(new T.Vector2()), uDPx: U(new T.Vector2()), uRadius: U(0.6), uIntensity: U(0.6), uBias: U(0.0012), uProjScale: U(500), uSeed: U(0), uNear: U(0.5), uFar: U(400) }, { SAMPLES: q >= 3 ? 20 : q >= 2 ? 14 : 10 });
    this.preMat = this._mat(PREFILTER_FRAG, { tColor: U(null), uThreshold: U(1.0), uKnee: U(0.5), uPx: U(new T.Vector2()) });
    this.downMat = this._mat(DOWN_FRAG, { tColor: U(null), uPx: U(new T.Vector2()) });
    this.upMat = this._mat(UP_FRAG, { tColor: U(null), uPx: U(new T.Vector2()), uScale: U(1) });
    this.upMat.blending = T.AdditiveBlending; this.upMat.transparent = true;
    const defs = {};
    if (q >= 1) defs.USE_AO = 1;
    if (params.get('ao') === 'debug') defs.AO_DEBUG = 1;
    defs.USE_BLOOM = 1;
    this.mergeMat = this._mat(MERGE_FRAG, { tColor: U(null), tDepth: U(null), tAO: U(null), tBloom: U(null), uAOPx: U(new T.Vector2()), uAO: U(0.85), uBloom: U(0.32), uFocus: U(30), uRange: U(12), uTilt: U(0), uTiltCenter: U(0.5), uFocusPull: U(0), uNear: U(0.5), uFar: U(400) }, defs);
    const fdefs = { DOF_TAPS: q >= 3 ? 32 : q >= 2 ? 22 : 14 };
    if (q >= 1 && params.get('dof') !== '0') fdefs.USE_DOF = 1;
    this.finalMat = this._mat(FINAL_FRAG, { tColor: U(null), uPx: U(new T.Vector2()), uMaxBlur: U(5), uExposure: U(1), uVignette: U(0.22), uGrain: U(0.028), uTime: U(0), uSat: U(1.06), uContrast: U(0.12), uCA: U(0), uSharp: U(0.5), uFade: U(0), uFadeColor: U(new T.Color(0xf4f2ec)), uShadowTint: U(new T.Color(0.93, 0.97, 1.03)), uHighTint: U(new T.Color(1.03, 1.0, 0.95)) }, fdefs);
    // Start compiling every pass now (parallel where KHR_parallel_shader_compile exists) instead of on first use.
    try {
      const r = this.renderer, prev = this.quad.material, prevRT = r.getRenderTarget(), tmp = this._target(4, 4);
      [this.aoMat, this.preMat, this.downMat, this.upMat, this.mergeMat].forEach(function (m) { this.quad.material = m; r.setRenderTarget(tmp); r.compile(this.scene, this.camera); }, this);
      r.setRenderTarget(null); this.quad.material = this.finalMat; r.compile(this.scene, this.camera);
      r.setRenderTarget(prevRT); this.quad.material = prev; tmp.dispose();
    } catch (e) { /* compile lazily on first render */ }
  };

  FX.prototype._target = function (w, h, opts) {
    return new T.WebGLRenderTarget(w, h, Object.assign({ type: T.HalfFloatType, format: T.RGBAFormat, depthBuffer: false, stencilBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter, generateMipmaps: false }, opts || {}));
  };

  FX.prototype.setSize = function (w, h) {
    // Match three.js canvas sizing (Math.floor) so targets are exactly the drawing-buffer size.
    w = Math.max(2, Math.floor(w)); h = Math.max(2, Math.floor(h));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.dispose();
    const depth = new T.DepthTexture(w, h);
    depth.type = T.FloatType; // DEPTH_COMPONENT32F for both the MSAA renderbuffer and the resolved texture
    depth.minFilter = depth.magFilter = T.NearestFilter;
    this.sceneRT = this._target(w, h, { depthBuffer: true, depthTexture: depth, samples: this.msaa });
    this.aoRT = this._target(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.mergeRT = this._target(w, h);
    this.mips = [];
    let mw = w >> 1, mh = h >> 1;
    for (let i = 0; i < 5 && mw > 4 && mh > 4; i++) { this.mips.push(this._target(mw, mh)); mw >>= 1; mh >>= 1; }
  };

  FX.prototype.dispose = function () {
    ['sceneRT', 'aoRT', 'mergeRT'].forEach(function (k) { if (this[k]) { if (this[k].depthTexture) this[k].depthTexture.dispose(); this[k].dispose(); this[k] = null; } }, this);
    (this.mips || []).forEach(function (m) { m.dispose(); });
    this.mips = [];
  };

  FX.prototype._pass = function (mat, target, clear) {
    const r = this.renderer;
    this.quad.material = mat;
    r.setRenderTarget(target);
    if (clear !== false) r.clear(true, false, false);
    r.render(this.scene, this.camera);
  };

  /* Render one frame. look = per-scene grade/focus state (see TK.Immersive). */
  FX.prototype.render = function (scene, camera, look, dt) {
    const r = this.renderer;
    const L = look || {};
    this.time += dt || 0;
    const autoClear = r.autoClear;
    r.autoClear = true;
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    r.autoClear = false;

    const near = camera.near, far = camera.far, depth = this.sceneRT.depthTexture, color = this.sceneRT.texture;
    // Ambient occlusion
    const aoOn = this.quality >= 1 && L.ao !== 0 && params.get('ao') !== '0';
    if (aoOn) {
      const a = this.aoMat.uniforms;
      a.tDepth.value = depth; a.uProjInv.value.copy(camera.projectionMatrixInverse);
      a.uPx.value.set(1 / this.aoRT.width, 1 / this.aoRT.height); a.uDPx.value.set(1 / this.w, 1 / this.h);
      a.uNear.value = near; a.uFar.value = far;
      a.uRadius.value = L.aoRadius || 0.55; a.uIntensity.value = L.aoIntensity || 0.55;
      a.uProjScale.value = camera.projectionMatrix.elements[5] * this.aoRT.height * 0.5;
      a.uSeed.value = 0;
      this._pass(this.aoMat, this.aoRT);
    }
    // Bloom mip chain
    const mips = this.mips;
    if (mips.length) {
      const p = this.preMat.uniforms;
      p.tColor.value = color; p.uPx.value.set(1 / this.w, 1 / this.h);
      p.uThreshold.value = L.bloomThreshold == null ? 1.0 : L.bloomThreshold; p.uKnee.value = 0.55;
      this._pass(this.preMat, mips[0]);
      for (let i = 1; i < mips.length; i++) {
        const d = this.downMat.uniforms; d.tColor.value = mips[i - 1].texture; d.uPx.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
        this._pass(this.downMat, mips[i]);
      }
      for (let i = mips.length - 1; i > 0; i--) {
        const u = this.upMat.uniforms; u.tColor.value = mips[i].texture; u.uPx.value.set(1 / mips[i].width, 1 / mips[i].height); u.uScale.value = 1;
        this._pass(this.upMat, mips[i - 1], false);
      }
    }
    // Merge
    const m = this.mergeMat.uniforms;
    m.tColor.value = color; m.tDepth.value = depth; m.tAO.value = this.aoRT.texture; m.tBloom.value = mips.length ? mips[0].texture : color;
    m.uAOPx.value.set(1 / this.aoRT.width, 1 / this.aoRT.height);
    m.uAO.value = aoOn ? (L.aoStrength == null ? 0.9 : L.aoStrength) : 0;
    m.uBloom.value = L.bloom == null ? 0.3 : L.bloom;
    m.uNear.value = near; m.uFar.value = far;
    m.uFocus.value = L.focus || 30; m.uRange.value = L.focusRange || 12;
    m.uTilt.value = L.tilt || 0; m.uTiltCenter.value = L.tiltCenter == null ? 0.5 : L.tiltCenter;
    m.uFocusPull.value = L.focusPull || 0;
    this._pass(this.mergeMat, this.mergeRT);
    // Final
    const f = this.finalMat.uniforms;
    f.tColor.value = this.mergeRT.texture; f.uPx.value.set(1 / this.w, 1 / this.h);
    f.uMaxBlur.value = (L.maxBlur == null ? 3.6 : L.maxBlur) * (this.h / 900 + 0.35);
    f.uExposure.value = L.exposure == null ? 1 : L.exposure;
    f.uVignette.value = L.vignette == null ? 0.22 : L.vignette;
    f.uGrain.value = L.grain == null ? 0.008 : L.grain;
    f.uTime.value = this.time;
    f.uSat.value = L.saturation == null ? 1.06 : L.saturation;
    f.uContrast.value = L.contrast == null ? 0.12 : L.contrast;
    f.uCA.value = this.quality >= 2 ? (L.ca || 0) : 0;
    f.uSharp.value = L.sharpen == null ? (this.quality >= 1 ? 0.5 : 0.35) : L.sharpen;
    f.uFade.value = L.fade || 0;
    if (L.fadeColor) f.uFadeColor.value.copy(L.fadeColor);
    if (L.shadowTint) f.uShadowTint.value.copy(L.shadowTint);
    if (L.highTint) f.uHighTint.value.copy(L.highTint);
    this._pass(this.finalMat, null);
    r.autoClear = autoClear;
  };

  /* Adaptive quality: drop or raise a tier based on a rolling median frame time.
     Samples are ignored briefly after scene switches and rebuilds, so one-off compile stalls never count. */
  FX.prototype.hold = function (now, ms) { this.holdUntil = (now || performance.now()) + (ms || 1200); this.frames.length = 0; };
  function median(a) { const s = a.slice().sort(function (x, y) { return x - y; }); return s[s.length >> 1]; }
  FX.prototype.tune = function (frameMs, now) {
    if (params.get('quality') || now < (this.holdUntil || 0)) return false;
    this.frames.push(frameMs);
    if (this.frames.length > 90) this.frames.shift();
    let next = this.quality;
    // Very slow devices drop straight to the lightest tier after a handful of frames.
    if (this.quality > 0 && this.frames.length >= 10 && median(this.frames.slice(-10)) > 90) next = 0;
    else if (this.frames.length >= 60 && now - this.lastTune > 2500) {
      const med = median(this.frames);
      this.stats.fps = Math.round(1000 / med);
      if (med > 30 && this.quality > 0) next = this.quality - 1;
      else if (med < 12 && this.quality < 2 && now - this.lastTune > 10000) next = this.quality + 1;
    }
    if (next === this.quality) return false;
    this.quality = next; this.stats.quality = next;
    this.lastTune = now;
    this._build();
    this.hold(now);
    return true;
  };

  TK.FX = {
    create: function (renderer) {
      if (params.get('fx') === 'off') return null;
      try { return new FX(renderer); } catch (e) { console.warn('[FX] disabled:', e.message); return null; }
    }
  };
})();
