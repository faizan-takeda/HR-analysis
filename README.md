# Takeda 2030 — Enterprise Capability (Executive Edition · targeted revision)

Static presentation; no build, backend, API keys, or network fonts. All libraries and eleven base illustrative static scene renders and five state-specific variants are bundled. This is an original strategy proposal, not an approved Takeda policy or diagnosis. Scenarios and financial inputs are illustrative.

## Open locally
Extract this archive and serve its root: `python -m http.server 8000`, then visit `http://localhost:8000`. A normal browser can also open `index.html` directly. The presentation automatically uses static scene illustrations if WebGL fails. Model calculations are independent of WebGL.

## GitHub Pages
Upload all root files and directories to a repository. Settings → Pages → Deploy from a branch → main / (root). Confirm approval before public publishing; a public repository exposes all content. No deployment was performed here.

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
