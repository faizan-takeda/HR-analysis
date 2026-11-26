from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from PIL import Image
import base64,json,re
root=Path(__file__).resolve().parents[1];s=BeautifulSoup((root/'index.html').read_text(),'html.parser')
for x in s.select('link[rel=stylesheet]'):
 t=s.new_tag('style');t.string=(root/x['href']).read_text();x.replace_with(t)
for x in s.select('script[src]'):
 t=s.new_tag('script');t.string=(root/x['src']).read_text();x.replace_with(t)
for x in s.select('img[src]'):
 path=root/x['src'];x['src']='data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
for x in s.select('.stage-poster'):
 path=re.search(r'url\((.*?)\)',x['style']).group(1);x['style']='background-image:url(data:image/png;base64,'+base64.b64encode((root/path).read_bytes()).decode()+')'
variant_script=s.new_tag('script');variant_script.string='window.TK_POSTERS='+json.dumps({x.stem:'data:image/'+('webp' if x.suffix=='.webp' else 'png')+';base64,'+base64.b64encode(x.read_bytes()).decode() for x in (root/'assets').iterdir() if x.suffix in ['.png','.webp'] if not x.stem.startswith('network-') or x.stem in ['network-shared','network-5-current','network-5-shared','network-40-current','network-40-shared']})+';';s.head.append(variant_script)
html=str(s);import tempfile;shots=Path(tempfile.gettempdir())/'takeda-revision-shots';shots.mkdir(exist_ok=True);results={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(**({'executable_path':'/usr/bin/chromium'} if Path('/usr/bin/chromium').exists() else {}),headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(200)
 results['webgl']=page.evaluate('TK.Stage.ok');assert page.locator('.stage-view .stage-hud,.stage-view .state-fallback,.stage-view .nogl-note,.stage-view .stage-hint').count()==0;assert page.locator('.stage-guide').count()==11;results['unobstructed_scene_layout']=True;assert page.locator('.chapter').count()==11;results['chapter_count']=11
 def shot(i,extra=''):
  page.evaluate(f'document.getElementById("c{i}").scrollIntoView({{block:"start",behavior:"instant"}})');page.wait_for_timeout(180);page.screenshot(path=str(shots/f'{i:02}{extra}.png'),timeout=10000)
 def txt(id):return page.locator('#'+id).text_content()
 def inputval(id,value):page.locator('#'+id).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',str(value))
 for i in range(1,12):
  sec=page.locator(f'#c{i}');assert sec.locator('.exec-story article').count()==4;assert sec.locator('.exec-foot').count()==1;shot(i);sec.locator('.detail-button').click();assert page.locator('#drawer').evaluate('(x)=>x.open');page.locator('#drawerClose').click()
 assert page.locator('#dots button').count()==11;assert page.evaluate(r'''async()=>{const p=[...document.querySelectorAll('.stage-poster')];return (await Promise.all(p.map(e=>new Promise(r=>{const url=e.style.backgroundImage.match(/url\(["\']?(.*?)["\']?\)$/)?.[1];const img=new Image();img.onload=()=>r(img.naturalWidth>0);img.onerror=()=>r(false);img.src=url})))).every(Boolean)}''');results['all_default_posters_decoded']=True
 page.locator('[data-era="1"]').click();assert 'AI-supported' in txt('eraOut')
 page.locator('#c3 .visual-controls details summary').click();page.locator('#allocationForm input').nth(0).fill('20');assert txt('alGap')=='10';page.locator('#c3 .visual-controls details summary').click()
 page.locator('[data-case="1"]').click();page.locator('#revealEvidence').click();assert 'validated manufacturing' in txt('casePanel');page.locator('#revealEvidence').click()
 page.locator('[data-step="3"]').click();assert 'backfill' in txt('journeyOut')
 # Page 7: check every mode and scene-state mapping; no cost/number confusion.
 page.locator('[data-team="0"]').click();assert txt('teamNow')=='2 / 2' and txt('teamLaterNote')=='3 externally hired';page.locator('[data-team="1"]').click();assert txt('teamNow')=='0 / 2' and txt('teamLaterNote')=='3 developed internally';shot(7,'-develop');page.locator('[data-team="2"]').click();assert txt('teamNow')=='2 / 2' and txt('teamLaterNote')=='1 developed internally';results['page7']='three modes and milestone metrics pass'
 # Page 8: single input, exact numbers, selected state changes.
 assert page.locator('#c8 input').count()==1;assert txt('netBefore')=='40 h' and txt('netAfter')=='15 h' and txt('nwDelta')=='25 h';page.locator('[data-net="1"]').click();assert '15 h/week' in txt('netTitle') and '15 person-hours' in txt('netExplanation');shot(8,'-shared');inputval('teamCount',40);assert txt('netBefore')=='80 h' and txt('netAfter')=='30 h';inputval('teamCount',5);assert txt('netAfter')=='3.25 h';inputval('teamCount',20);page.locator('[data-net="0"]').click();assert '40 h/week' in txt('netTitle');results['page8']='single control, two distinct cases and boundary values pass'
 # Page 9: two inputs, exact costs and downside case.
 assert page.locator('#c9 input').count()==2;assert txt('owBefore')=='$30k' and txt('owAfter')=='$15k';page.locator('[data-own="1"]').click();assert '$15k/month' in txt('ownTitle') and '$15,000/month' in txt('ownExplanation');shot(9,'-defined');inputval('reworkCost',1000);assert 'higher' in txt('owSummary') and txt('owDelta')=='$1k';inputval('deliveryCount',100);assert txt('owBefore')=='$30k' and txt('owAfter')=='$35k';inputval('deliveryCount',20);inputval('reworkCost',5000);page.locator('[data-own="0"]').click();assert '$30k/month' in txt('ownTitle');results['page9']='two controls, state-specific cost and adverse case pass'
 page.locator('[data-gate="2"]').click();assert 'Stop' in txt('gateOut');page.locator('[data-gate="1"]').click();assert 'Scale' in txt('gateOut');page.locator('[data-gate="0"]').click();assert 'Refine' in txt('gateOut');results['page10']='all evidence outcomes pass'
 page.locator('#c11 .src-btn').click();assert page.locator('#drawer').evaluate('(x)=>x.open');page.locator('#drawerClose').click();page.locator('#btnContents').click();assert page.locator('.toc button').count()==11;page.locator('.toc button').last.click();page.wait_for_timeout(100);assert '11 of 11' in txt('nowNum');page.locator('#btnNotes').click();assert 'chapter 11' in txt('drawerTitle');page.locator('#drawerClose').click();assert not page.locator('#financeForm').count();results['page11']='renumbering, summary, sources and talk track pass'
 # Three.js scene graph tests independent of GPU: actual transforms and draw ranges.
 results['scene_graph_checks']=page.evaluate('''()=>{const ctx={label:()=>({})},S=TK.SCENES,stage=TK.Stage;stage.motion=true;let t=S.team(ctx);t.api.setMode(1);t.update(1,1);let p=t.scene.getObjectByName('develop-0');let first=p.position.clone();t.update(8,7);let moved=first.distanceTo(p.position)>1&&p.visible&&!t.scene.getObjectByName('hire-0').visible;let net=S.network(ctx);net.api.set({n:20,keep:10/190,density:40/190,mode:'all'});let extra=net.scene.getObjectByName('status-links').geometry.drawRange.count/2,essential=net.scene.getObjectByName('essential-links').geometry.drawRange.count/2;net.api.set({n:40,keep:20/780,density:80/780,mode:'reg'});let spokes=net.scene.getObjectByName('register-links').geometry.drawRange.count/2;let own=S.ownership(ctx);own.api.setScenario(false,20);let count=()=>own.scene.children.filter(o=>o.name.startsWith('delivery-')&&o.visible&&o.children[0].material.color.getHex()===0xD9475E).length;let bad=count();own.api.setScenario(true,20);let good=count();stage.motion=false;return{team_actor_moved:moved,extra_links:extra,essential_links:essential,register_spokes:spokes,unclear_returns:bad,defined_returns:good}}''')
 assert results['scene_graph_checks']=={'team_actor_moved':True,'extra_links':30,'essential_links':10,'register_spokes':40,'unclear_returns':3,'defined_returns':1},results['scene_graph_checks']
 results['viewport_checks']=[]
 for w,h in [(320,700),(390,844),(768,1024),(1440,900),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(80);res=page.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth,header:document.querySelector(".topbar").scrollWidth})');results['viewport_checks'].append(res);assert res['document']<=w and res['header']<=w,res
  if w==390:shot(8,'-mobile')
 results['errors']=errors;assert not errors,errors;b.close()
print(json.dumps(results,indent=2));(root/'QA_RESULTS.json').write_text(json.dumps(results,indent=2))
thumbs=[]
for i in [7,8,9,10,11]:
 im=Image.open(shots/f'{i:02}.png').convert('RGB');im.thumbnail((720,450));thumbs.append(im)
canvas=Image.new('RGB',(1440,1350),'#e8eee9')
for k,im in enumerate(thumbs):canvas.paste(im,((k%2)*720,(k//2)*450))
canvas.save(str(root/'preview.jpg'),quality=90)
