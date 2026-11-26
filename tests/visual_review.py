from pathlib import Path
import base64,json,re,math,zipfile,io
from bs4 import BeautifulSoup
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]; names=['campus','tools','allocation','tower','route','journey','team','network','ownership','gates','flywheel']; source=BeautifulSoup((root/'index.html').read_text(),'html.parser')
metadata=json.loads((root/'js/poster-pins.js').read_text().split('=',1)[1].strip().rstrip(';'))
required=names+['team-hire','team-develop','team-both','ownership-unclear','ownership-defined','network-shared']+[f'network-{n}-{v}' for n in range(4,41) if n!=20 for v in ('current','shared')]
for key in required:
 assert key in metadata,key
 p=root/'assets'/(key+('.webp' if re.match(r'network-\d+-',key) else '.png'))
 with Image.open(p) as im:
  im.verify();assert abs(im.width/im.height-metadata[key]['ratio'])<.01,key
 assert metadata[key]['extent'][0]>=.85 and metadata[key]['extent'][1]>=.67,(key,metadata[key]['extent'])
for x in source.select('link[rel=stylesheet]'):
 t=source.new_tag('style');t.string=(root/x['href']).read_text();x.replace_with(t)
for x in source.select('script[src]'):
 t=source.new_tag('script');t.string=(root/x['src']).read_text();x.replace_with(t)
for x in source.select('img[src]'):
 x['src']='data:image/png;base64,'+base64.b64encode((root/x['src']).read_bytes()).decode()
for x in source.select('.stage-poster'):
 path=re.search(r'url\((.*?)\)',x['style']).group(1);x['style']='background-image:url(data:image/png;base64,'+base64.b64encode((root/path).read_bytes()).decode()+')'
# Keep the test deterministic while checking actual labels/visual proportions.
var=source.new_tag('script');var.string='window.TK_POSTERS='+json.dumps({n:'data:image/png;base64,'+base64.b64encode((root/'assets'/(n+'.png')).read_bytes()).decode() for n in ['team-both','ownership-unclear','network','network-shared']})+';';source.head.append(var)
errors=[];views=[];shots=Path('/tmp/takeda-cinematic-final-shots');shots.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(str(source),wait_until='domcontentloaded');page.wait_for_timeout(350)
 for w,h in [(320,700),(390,844),(430,932),(768,1024),(820,1180),(1024,768),(1440,900),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(120)
  check=page.evaluate('''()=>{let overlap=0,clipped=0,count=0,stages=[];for(const s of document.querySelectorAll('.stage-view')){const r=s.getBoundingClientRect();const pins=[...s.querySelectorAll('.stage-pin:not([hidden])')].filter(x=>x.getBoundingClientRect().width>0);const p=pins.map(x=>x.getBoundingClientRect());count+=p.length;for(let i=0;i<p.length;i++){const a=p[i];if(a.x<r.x-.5||a.right>r.right+.5||a.y<r.y-.5||a.bottom>r.bottom+.5)clipped++;for(let j=i+1;j<p.length;j++){const b=p[j];if(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y)overlap++}}stages.push({w:Math.round(r.width),h:Math.round(r.height)})}return{width:innerWidth,document:document.documentElement.scrollWidth,header:document.querySelector('.topbar').scrollWidth,overlap,clipped,count,stages}}''');assert check['document']<=w and check['header']<=w,check;assert check['clipped']==0 and check['overlap']==0,check;views.append(check)
  if w in [390,768,1440]:
   for i in (range(1,12) if w==1440 else [1,8,11]):
    page.evaluate(f'document.querySelector("#c{i}").scrollIntoView({{block:"start",behavior:"instant"}})');page.wait_for_timeout(70);page.screenshot(path=str(shots/f'{w}-{i:02}.png'))
 assert not errors,errors;b.close()
report={'rendered_assets':len(required),'all_assets_decoded':True,'scene_extents':{n:metadata[n]['extent'] for n in names},'viewport_and_pin_checks':views,'errors':errors,'limitations':'Offline geometry rasterization and Chromium fallback. Live WebGL rendering and physical device GPU performance not verified.'}
(root/'CINEMATIC_QA.json').write_text(json.dumps(report,indent=2));print('PASS:',len(required),'renders; 8 viewport/pin checks; no errors')
