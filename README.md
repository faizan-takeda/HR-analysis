# Takeda 2030 — Enterprise Capability (Executive Edition · targeted revision)

Static presentation; no build, backend, API keys, or network fonts. All libraries and eleven base illustrative static scene renders and five state-specific variants are bundled. This is an original strategy proposal, not an approved Takeda policy or diagnosis. Scenarios and financial inputs are illustrative.

## Open locally
Extract this archive and serve its root: `python -m http.server 8000`, then visit `http://localhost:8000`. A normal browser can also open `index.html` directly. The presentation automatically uses static scene illustrations if WebGL fails. Model calculations are independent of WebGL.

## GitHub Pages
The site is fully static, uses only relative, case-exact paths and needs no network services. A `.nojekyll` file is included so Pages serves every file untouched.

- **Automatic (recommended):** push to `main` with `.github/workflows/pages.yml`, then set Settings → Pages → Build and deployment → Source to **GitHub Actions**. The workflow runs the model tests and publishes `index.html`, `css/`, `js/`, `vendor/` and `assets/`.
- **Manual:** Settings → Pages → Deploy from a branch → `main` / (root).

Confirm approval before public publishing; a public repository exposes all content. No deployment was performed here.

## Immersive edition (living-diorama world and cinematic pipeline)
Each chapter's model now sits in a lit, atmospheric world, and every frame goes through a film-style post-processing chain. Everything is vanilla Three.js r158 and GSAP, with no build step, no CDN and no new dependencies. Business text, models, scene APIs, labels and the perspective-correct framing are unchanged; the added world is excluded from camera fitting.

- `js/fx.js` is the post-processing pipeline:
  - HDR MSAA scene pass with float depth
  - Scalable ambient occlusion at half resolution with a depth-aware upsample
  - Dual-Kawase mip-chain bloom with a soft-knee threshold
  - Background depth of field with gather-based bokeh; the model itself stays in focus
  - ACES filmic tone mapping with split-tone grading, vignette, contrast-adaptive sharpening and a light film grain

  It is a vanilla port of techniques from pmndrs/postprocessing, N8AO and the three.js examples. Quality adapts to the measured frame time across three tiers. Low-power and touch devices start at the middle tier.
- `js/immersive.js` adds the world layer:
  - PCSS soft shadows, the drei `SoftShadows` technique patched into the r158 shadow chunk
  - A lighting mood per chapter: golden morning, studio, atrium, blue hour, industrial noon or sunset
  - Image-based light rendered from each chapter's own sky, with lightformers
  - A procedural sky, an infinite ground (meadow, terrazzo, plaza or data grid) and horizon fog
  - Instanced landscape scatter that sways in the wind, with contact blobs
  - Drifting cloud shadows, dust motes (drei `Sparkles`) and birds
  - World-space surface micro-variation on every physically based material
- Camera direction, in `js/immersive.js` with hooks in `js/stage.js`:
  - A Theatre.js-style keyed establishing shot on first visit, run as a GSAP timeline: crane-in, fade-up from paper and a rack focus
  - Scroll-scrubbed parallax through GSAP ScrollTrigger
  - Pointer parallax and an idle camera drift, like drei `CameraShake`
  - A slow orbit with letterbox bars in "Expand scene" fullscreen

  "Motion off" and `prefers-reduced-motion` disable all camera motion.
- Diagnostics: `?quality=low|high|ultra` pins a tier, `?fx=off` uses plain forward rendering, `?world=off` removes the world layer, `?garden=off` removes the Takeda Garden elements, `?batch=0` disables static batching, `?live=1` forces continuous rendering on software GPUs, and `?ao=0`, `?dof=0` or `?ao=debug` isolate effects.
- `tools/capture_posters.py` regenerates the bundled posters from this renderer, so first paint and the no-WebGL fallback match the live look. `Stage.capture(name, width)` is the supporting API.

Without WebGL2 or float render targets, the stage falls back to the previous forward renderer; without WebGL, to the static posters.

## Takeda Garden elements
`js/garden.js` builds elements from the Takeda Garden renders procedurally, so no external models or textures are needed. They appear only where they fit the story:

- **Chapter 11 (closing):** six planting pillars stand on gold-rimmed grass pads around the capability island. Each carries a lush rosette of leaves, including magenta coleus and lettuce greens, and a glowing red therapeutic-area icon: test tube, blood drop, cells, gut, DNA and brain. The island sits in a pond with a gold rim. Around the pond are two arched wooden bridges with stone lanterns, bonsai, shore rocks, clipped shrubs and the tree house.
- **Chapter 1 (campus):** main-garden landmarks stand behind the campus:
  - the glass-arch greenhouse with its porthole band and solar-glass vault;
  - the waterfall pavilion with falling water curtains and a rainbow;
  - the sailboat pond;
  - the tree of light;
  - cherry blossoms;
  - a Takeda flag;
  - the compass plaza, umbrella pines and a winding garden path.

  The flag shows the Takeda logo when the site is served over http(s), including GitHub Pages; opened directly as a file it shows a plain white flag.

`?garden=off` removes these elements for comparison.

**Chapters 2–10** sit in the same Takeda Garden with a lighter treatment. Each has a garden daylight mood (morning for 2–4, noon for 5–7, afternoon for 9–10, blue-hour dusk for 8), a paved terrace with flower beds, clipped hedges and one landmark placed clear of the labels:

| Chapter | Landmark |
|---------|----------|
| 2 Future capabilities | Glass-arch greenhouse and umbrella pines |
| 3 Talent allocation | Cherry-blossom grove; stepping stones and lanterns at the side entrance |
| 4 Hiring excellence | Zen garden: bonsai and stone lanterns |
| 5 Adaptive problem-solving | Pond with an arched bridge |
| 6 Development journey | Waterfall pavilion with its pond |
| 7 Team | Tree house and cherry trees |
| 8 Network | Lantern ring and tree of light at dusk |
| 9 Ownership | Sailboat pond and Takeda flag |
| 10 Evidence gates | Two planting pillars with glowing icons |

`?garden=off` also restores the earlier studio, atrium, industrial and blue-hour moods for these chapters.

## Smoothness and sharpness
- **Static batching:** objects that never move are merged into one draw call per material, and each animated person is compacted from 37 draws to about 9. Across the 11 chapters this cuts draw calls from 6,693 to 2,544, and the opening campus from 2,151 to 561. Motion is detected automatically, and anything scenario code can change is left untouched. `?batch=0` disables batching.
- **No first-frame stalls:** shaders compile ahead of time, in parallel where the browser supports it. The poster stays up until the first live frame is ready. Neighbouring chapters are built and compiled during idle time.
- **Lighter frames:**
  - Shadow maps refresh every frame at the highest quality tier, every 2nd frame on the middle tiers and every 3rd on the lowest.
  - Shadow maps of distant chapters are freed.
  - Leaving a chapter copies its last frame to a 2D canvas instead of encoding an image.
  - Labels move with GPU transforms and are measured only once.
- **Machines without GPU acceleration:** frames render on demand (on arrival, drag, scenario change and resize) instead of animating at about 1 fps, so scrolling stays smooth. `?live=1` forces continuous animation.
- **Sharpness:**
  - Pixel ratio goes up to 2 on high-DPI screens.
  - The final pass applies contrast-adaptive sharpening.
  - Depth of field now blurs only the far landscape; the model is always in focus.
  - Tilt-shift blur and chromatic fringe are removed, and film grain is much lighter.

## Architecture
- `index.html`: 11 concise business narratives, optional detailed operating notes, accessible controls.
- `css/executive.css`: executive layout and responsive styling; original base CSS retained.
- `css/takeda-theme.css`: Takeda corporate look and feel derived from `Corporate PPT Template.pptx` (Takeda 2021 palette, Calibri, red title rule, single curved corner). Loaded last; styles UI chrome only and never the 3D stage backdrop, posters, scene labels or legend colours. `assets/takeda-logo.png` is the official logo extracted from the same template.
- `js/content.js`: evidence ledger and talk track; `js/executive.js`: testable pure models and UI handlers.
- `js/kit.js`, `js/scenes.js`, `js/world-upgrade.js`: Three.js worlds and added workplace details, two replacement scenes.
- `js/stage.js`: single lazy WebGL renderer, static fallback, motion control.
- `assets/`: CPU-rendered snapshots of actual scene geometry (flat shading, not photorealistic). State-specific posters for staffing and acceptance, plus a dynamic network diagram, keep fallback comparisons usable.
- `tests/`: Node model checks and Python/Playwright browser checks. Run `node tests/models.test.js`; browser check requires Python, BeautifulSoup, Pillow, Playwright and Chromium.
- `tools/render_posters.py`: optional CPU rasterizer for regenerating the scene posters; same Python dependencies. Not needed for hosting.
- `QA_RESULTS.json`, `REVIEW.md`: observed checks, remaining release gates and visual roadmap.

## Release boundary
WebGL could not initialize in the current test environment, so live animation, GPU performance, GPU visuals, comparison with the earlier live version and Safari/physical-device operation are not verified. Static illustrations were generated from all eleven Three.js scene definitions. This revision also checks actor transforms, network counts and acceptance sample states without a GPU. No actual Takeda workforce or finance data was used. Review with authorized stakeholders and test on the target corporate laptop before presentation.

## Visual refinement release

This release is a visual-only revision of the supplied final 11-chapter edition. All presentation text, research, numerical input controls, model calculations and scenario event handlers remain unchanged. The original scene builders, Three.js and GSAP are retained. The new `js/visual-finish.js` enhances character rigs, surfaces, furniture, landscaping and camera fitting. `css/visual-finish.css` moves titles, notes and guides out of the scene and increases its clear viewing area; supported browsers can expand an individual scene to fullscreen. `js/stage.js` controls shared rendering and external scene guides. Offline posters contain no baked text; network fallback artwork reflects every supported team count and comparison state. In fallback mode the exact network diagram is optionally available below the world. No network services or build step are needed to host the site.

To regenerate ordinary posters, run `python tools/render_posters.py` in an environment with Chromium, Playwright, Pillow and BeautifulSoup. For any additional network poster use `python tools/render_posters.py network-4-current network-4-shared` (substitute the desired count). Model regression tests: `node tests/models.test.js`; browser regression checks: `python tests/browser_check.py`. The latter tests an inlined local copy in Chromium. GPU-backed WebGL rendering was not available in the review environment; static render, geometry/state and browser tests passed. Photorealistic character assets were not introduced: the scenes retain their original stylized architectural-diorama language.

## Cinematic edition
The current visual director is `js/cinematic-director.js`; older swarm layers are superseded and are not loaded. See `CINEMATIC_REVIEW.md` and `CINEMATIC_QA.json` for per-scene decisions and measured fallback checks. Stage images and label anchors were regenerated from the same scene geometry. Deploy the extracted root containing `index.html` to GitHub Pages. The original Git history and corporate presentation template are deliberately excluded from the distribution; the derived Takeda theme is retained.
