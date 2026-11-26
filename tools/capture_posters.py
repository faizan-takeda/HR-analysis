"""Regenerate the bundled stage posters from the live cinematic renderer (js/fx.js + js/immersive.js).

Posters are the first paint before WebGL starts and the illustration in no-WebGL fallback mode. The camera
framing is the same perspective-correct solve used live, so the existing poster pin anchors stay valid.

Usage:  python tools/capture_posters.py                 # 11 base scenes + team/network/ownership states
        python tools/capture_posters.py campus tools    # selected keys only
        python tools/capture_posters.py --network-variants   # also network-<n>-current/shared.webp (slow)
Requires Python, Playwright + Chromium and Pillow. Uses the GPU when available, else SwiftShader (slow).
"""
import base64, functools, http.server, io, json, sys, threading
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WIDTH = 1440
BASE = ['campus', 'tools', 'allocation', 'tower', 'route', 'journey', 'team', 'network', 'ownership', 'gates', 'flywheel']
# poster key -> (scene, [css selectors to click before capture])
STATES = {
    'team': ('team', ['[data-team="2"]']), 'team-hire': ('team', ['[data-team="0"]']), 'team-develop': ('team', ['[data-team="1"]']), 'team-both': ('team', ['[data-team="2"]']),
    'network': ('network', ['[data-net="0"]']), 'network-shared': ('network', ['[data-net="1"]']),
    'ownership': ('ownership', ['[data-own="0"]']), 'ownership-unclear': ('ownership', ['[data-own="0"]']), 'ownership-defined': ('ownership', ['[data-own="1"]']),
}


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(_QuietHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def save(data_url, path):
    img = Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1]))).convert('RGB')
    if path.suffix == '.webp':
        img.save(path, 'WEBP', quality=86, method=6)
    else:
        img.save(path, 'PNG', optimize=True)
    print('wrote', path.relative_to(ROOT), img.size)


def main(argv):
    variants = '--network-variants' in argv
    keys = [a for a in argv if not a.startswith('--')] or BASE + [k for k in STATES if k not in BASE]
    httpd = serve()
    url = f'http://127.0.0.1:{httpd.server_address[1]}/index.html?quality=ultra'
    with sync_playwright() as p:
        page = None
        for args in (['--ignore-gpu-blocklist', '--enable-gpu'], ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']):
            browser = p.chromium.launch(args=args)
            page = browser.new_page(viewport={'width': 1600, 'height': 1000}, reduced_motion='reduce')
            page.set_default_timeout(300000)
            page.goto(url)
            page.wait_for_function('window.TK && TK.Stage && TK.Stage.ok !== undefined')
            if page.evaluate('TK.Stage.ok && !!TK.Stage.fx'):
                break
            browser.close()
            page = None
        if page is None:
            sys.exit('WebGL2 post-processing is unavailable in this browser; posters were not changed.')

        def capture(key, scene, clicks, out):
            page.evaluate(f"document.querySelector('.stage[data-scene=\"{scene}\"]').scrollIntoView({{block:'center',behavior:'instant'}})")
            for sel in clicks:
                page.locator(sel).click()
            page.wait_for_timeout(1200)
            save(page.evaluate(f"TK.Stage.capture('{scene}', {WIDTH})"), out)
            entry = pins.get(key, {})
            entry.update({'pins': page.evaluate('TK.Stage.lastPins'), 'ratio': page.evaluate('TK.Stage.lastRatio')})
            pins[key] = entry

        pins_path = ROOT / 'js' / 'poster-pins.js'
        pins = json.loads(pins_path.read_text(encoding='utf-8').strip().removeprefix('window.TK_POSTER_PINS=').rstrip(';\n'))

        for key in keys:
            scene, clicks = STATES.get(key, (key, []))
            capture(key, scene, clicks, ROOT / 'assets' / f'{key}.png')
        if variants:
            for n in range(4, 41):
                if n == 20:
                    continue
                page.locator('#teamCount').evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}', str(n))
                for mode, sel in (('current', '[data-net="0"]'), ('shared', '[data-net="1"]')):
                    capture(f'network-{n}-{mode}', 'network', [sel], ROOT / 'assets' / f'network-{n}-{mode}.webp')
            page.locator('#teamCount').evaluate('(e)=>{e.value=20;e.dispatchEvent(new Event("input",{bubbles:true}))}')
        pins_path.write_text('window.TK_POSTER_PINS=' + json.dumps(pins, ensure_ascii=False) + ';\n', encoding='utf-8')
        print('updated', pins_path.relative_to(ROOT))
        browser.close()
    httpd.shutdown()


if __name__ == '__main__':
    main(sys.argv[1:])
