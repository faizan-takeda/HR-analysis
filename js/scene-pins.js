(function(){'use strict';const TK=window.TK=window.TK||{},NS='http://www.w3.org/2000/svg';
const short={'Patients at the center':'Patients first','Patient, trust, reputation, business':'Patients first','Digital and data':'Digital & data','Commercial analytics':'Commercial','Cyber operations':'Cybersecurity','Candidate A evidence':'Candidate A','Candidate B evidence':'Candidate B','Hiring & onboarding':'Onboarding','Coaching & qualification':'Coaching','Next milestone: 3 required':'Next milestone · 3','Launch: 2 required':'Launch · 2','Takeda: accepted work & knowledge':'Accepted work','Internal requirements':'Requirements','Partner: delivers work':'Partner delivery','Find existing capability':'Find expertise','Redeploy, develop, hire or partner':'Deploy talent','Share, grow, reinvest':'Reinvest','Clear ownership':'Ownership','Execute together':'Execute'};
const floorAnchors=['R&D lab','Cyber operations','Commercial analytics','Rework loop'];
function score(p){return ['red','teal','amber'].includes(p.cls)?2:1}
function setAttrs(el,o){for(const k in o)el.setAttribute(k,o[k])}
/* Collision-aware pin layout. Runs every frame: text sizes are measured once (per label and viewport width),
   pins move with GPU transforms, and DOM writes happen only when something actually changes. */
function layout(layer,items,w,h){
  let svg=layer._svg;if(!svg||!svg.isConnected){svg=layer.querySelector('svg.pin-lines');if(!svg){svg=document.createElementNS(NS,'svg');svg.classList.add('pin-lines');svg.setAttribute('aria-hidden','true');layer.prepend(svg)}layer._svg=svg;layer._pool=[]}
  const vb=`0 0 ${w} ${h}`;if(layer._vb!==vb){svg.setAttribute('viewBox',vb);layer._vb=vb}
  const max=w<500?3:items.length,vw=window.innerWidth;
  const sorted=items.filter(p=>p.visible&&p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h).sort((a,b)=>score(b)-score(a)).slice(0,max+4);
  // 1. writes needed before measuring
  const measure=[];
  for(const p of sorted){const el=p.el,label=short[p.text]||p.text;if(el._label!==label){el.textContent=label;el.title=p.text;el._label=label;el._w=0}if(!el._w||el._vw!==vw){if(el.hidden)el.hidden=false;measure.push(el)}}
  // 2. one batched read
  for(const el of measure){el._w=el.offsetWidth;el._h=el.offsetHeight;el._vw=vw}
  // 3. placement (pure computation)
  const used=[],placed=new Set(),lines=[];let count=0;const space=6,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  for(const p of sorted){if(count>=max)break;const el=p.el,bw=el._w,bh=el._h;if(!bw)continue;
    const top=p.y-bh-13,bottom=p.y+13,floor=floorAnchors.includes(p.text);
    const cands=[[p.x-bw/2,floor?bottom:top],[p.x-bw/2,floor?top:bottom],[p.x-bw-13,p.y-bh/2],[p.x+13,p.y-bh/2],[p.x-bw/2,top-16],[p.x-bw/2,bottom+16]];
    const order=el._cand!=null?[el._cand].concat(cands.map((_,i)=>i).filter(i=>i!==el._cand)):cands.map((_,i)=>i);
    let rect=null;
    for(const i of order){const x=clamp(cands[i][0],space,w-bw-space),y=clamp(cands[i][1],space,h-bh-space),r={x,y,w:bw,h:bh};if(!used.some(q=>r.x<q.x+q.w+5&&r.x+r.w+5>q.x&&r.y<q.y+q.h+4&&r.y+r.h+4>q.y)){rect=r;el._cand=i;break}}
    if(!rect)continue;used.push(rect);placed.add(el);count++;
    const tf=`translate3d(${Math.round(rect.x)}px,${Math.round(rect.y)}px,0)`;if(el._tf!==tf){el.style.transform=tf;el._tf=tf}
    if(el.style.left!=='0px'){el.style.left='0px';el.style.top='0px';el.style.opacity='1'}
    const x=clamp(p.x,rect.x,rect.x+rect.w),y=clamp(p.y,rect.y,rect.y+rect.h);if(Math.hypot(x-p.x,y-p.y)>3)lines.push([p.x,p.y,x,y])}
  // 4. visibility and leader lines
  for(const p of items){const want=!placed.has(p.el);if(p.el.hidden!==want)p.el.hidden=want}
  const pool=layer._pool||(layer._pool=[]);
  lines.forEach((l,i)=>{let e=pool[i];if(!e){e={line:document.createElementNS(NS,'line'),dot:document.createElementNS(NS,'circle')};setAttrs(e.line,{stroke:'#536967','stroke-opacity':'.65','stroke-width':'.8'});setAttrs(e.dot,{r:'1.7',fill:'#536967'});svg.append(e.line,e.dot);pool.push(e)}
    setAttrs(e.line,{x1:l[0].toFixed(1),y1:l[1].toFixed(1),x2:l[2].toFixed(1),y2:l[3].toFixed(1)});setAttrs(e.dot,{cx:l[0].toFixed(1),cy:l[1].toFixed(1)});if(e.line.style.display){e.line.style.display='';e.dot.style.display=''}});
  for(let i=lines.length;i<pool.length;i++){if(pool[i].line.style.display!=='none'){pool[i].line.style.display='none';pool[i].dot.style.display='none'}}
  return used}
function poster(s){if(s.labels.classList.contains('live-pins'))return;const key=s.poster.dataset.posterKey||s.name,data=window.TK_POSTER_PINS?.[key];if(!data)return;const w=s.view.clientWidth,h=s.view.clientHeight;if(!w||!h)return;const iw=Math.min(w,h*data.ratio),ih=iw/data.ratio,ox=(w-iw)/2,oy=(h-ih)/2;for(const n of s.labels.querySelectorAll('.poster-pin'))n.remove();const pins=data.pins.map(p=>{const el=document.createElement('span');el.className='stage-pin poster-pin '+p.cls;el.textContent=p.text;s.labels.append(el);return{...p,el,x:ox+p.x*iw,y:oy+p.y*ih,visible:true}});s.labels.classList.add('poster-pins');layout(s.labels,pins,w,h)}
TK.Pins={layout,poster};})();
