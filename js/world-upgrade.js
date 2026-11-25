/* Detailed procedural workplace art direction. No external asset dependencies. */
(function(){'use strict';if(!window.THREE||!TK.SCENES)return;const T=THREE,K=TK.K,S=TK.SCENES,V=(x,y,z)=>new T.Vector3(x,y,z);const mat=(c)=>K.mat(c,{roughness:.76});function at(o,x,y,z,ry=0){o.position.set(x,y,z);o.rotation.y=ry;return o}function add(s,o,x,y,z,ry){s.add(at(o,x,y,z,ry));return o}
const oldPerson=K.person;K.person=function(o){const p=oldPerson(o);const u=p.userData;const shoe=mat(0x25363c);for(const leg of [u.legL,u.legR]){add(leg,K.rbox(.135,.06,.23,.023,shoe),0,-.49,.04)}const skin=mat(o&&o.skin||0xcda081);for(const arm of [u.armL,u.armR])add(arm,K.sphere(.052,skin,10,8),0,-.41,0);if(o&&o.coat){add(u.body,K.box(.075,.095,.012,mat(0x2c7d78)),.075,.82,.17);add(u.body,K.box(.035,.12,.015,mat(0xe6b87c)),.11,.66,.19)}return p};
const oldDesk=K.desk;K.desk=function(o){const d=oldDesk(o);const w=o&&o.w||1.15,depth=o&&o.d||.62;if(w>.9){add(d,K.rbox(.32,.02,.12,.014,mat(0x4d6468)),0,.607,depth*.22);add(d,K.rbox(.12,.016,.16,.02,mat(0x8fa1a0)),w*.30,.61,depth*.19);add(d,K.rbox(.18,.025,.24,.015,mat(0xf0e7d4)),-w*.3,.61,depth*.14)}return d};
function wall(s,x,z,w,rot=0){const g=new T.Group();add(g,K.box(w,1.72,.08,mat(0xd1e1dc)),0,0,0);for(let j=0;j<Math.floor(w/1.55);j++){const px=-w/2+.78+j*1.55;add(g,K.box(1.34,.94,.045,K.glass(0xb4d2d6)),px,.59,.05);add(g,K.box(.045,1.03,.06,mat(0x718987)),px,.55,.085);add(g,K.box(1.39,.05,.09,mat(0x718987)),px,.55,.085)}add(s,g,x,0,z,rot)}
function chair(){const g=new T.Group();add(g,K.rbox(.37,.07,.36,.06,mat(0x53776e)),0,.30,0);add(g,K.rbox(.34,.36,.065,.035,mat(0x53776e)),0,.36,-.15);add(g,K.cyl(.035,.05,.3,mat(0x52645f)),0,0,0);for(let i=0;i<4;i++){let a=i*Math.PI/2;add(g,K.box(.29,.035,.05,mat(0x52645f)),Math.cos(a)*.11,.015,Math.sin(a)*.11,a)}return g}
function lamp(s,x,z){add(s,K.cyl(.045,.065,1.65,mat(0x586c68)),x,0,z);add(s,K.rbox(.44,.06,.24,.035,K.glow(0xffe5ba,.45)),x,1.64,z)}
function bench(s,x,z){add(s,K.rbox(.9,.12,.35,.035,mat(0xb28c64)),x,.25,z);for(const a of [-.32,.32])add(s,K.box(.07,.27,.26,mat(0x667b73)),x+a,0,z)}
function sceneBase(w,d){let scene=new T.Scene();scene.environment=K.env;K.lights(scene,{size:10,sun:2.9,hemi:.8});scene.add(K.plinth(w,d,{top:0xe6e2d6,side:0x819e94}));return{scene,camera:new T.PerspectiveCamera(30,1.6,.5,200)}}
// 4: Replace the abstract score tower with an actual assessment studio.
S.tower=function(ctx){let b=sceneBase(12,8),s=b.scene,R=K.rng(44);wall(s,0,-3.45,10.8);wall(s,-5.35,0,6.8,Math.PI/2);for(let x of [-3.5,3.5]){add(s,K.table(2.7,1.5,0xf5eadd),x,0,0);for(let j of [-.85,.85]){add(s,chair(),x+j,0,.95,Math.PI);add(s,K.person({rand:R}),x+j,0,.65,Math.PI);add(s,chair(),x+j,0,-.95);add(s,K.person({rand:R}),x+j,0,-.64,0)}add(s,K.monitor('dash'),x,.60,-.10);add(s,K.rbox(.3,.035,.40,.01,mat(0xf1f0e5)),x+.6,.60,.2)}const review=add(s,K.desk({w:1.7,d:.8,screen:'kanban'}),0,0,2.6);const p=add(s,K.person({rand:R,shirt:0x217d70}),0,0,3.25,Math.PI);add(s,K.planter(),4.9,0,-2.8);add(s,K.planter(),-4.8,0,2.8);ctx.label('Candidate A evidence',V(-3.5,1.6,0));ctx.label('Candidate B evidence',V(3.5,1.6,0));ctx.label('Independent review',V(0,1.65,2.5),{cls:'teal'});return{...b,view:{target:V(0,.35,0),radius:17.5,yaw:.29,pitch:.75,fov:30,fit:1.55},update(t){K.pose(p,t,0)}}};
// 7: A real team room, no visual claim that hiring is inherently worse.
S.team=function(ctx){
 const b=sceneBase(13,8),s=b.scene,R=K.rng(71),slots=[-2.65,0,2.65],actors=[],lights=[],idle=[];
 wall(s,0,-3.45,11.5);wall(s,-5.8,0,6.5,Math.PI/2);
 // Three qualified delivery positions, with an entry area and a separate coaching workspace.
 for(let i=0;i<3;i++){const x=slots[i];add(s,K.desk({w:1.65,d:.85,screen:'dash'}),x,0,-1.7);add(s,chair(),x,0,-.80,Math.PI);const pad=add(s,K.rbox(1.85,.045,1.2,.05,mat(0xd7c4bb)),x,.01,-.9);pad.name=`slot-${i}`;lights.push(pad);}
 add(s,K.table(4.2,1.35,0xe3d6bd),2.1,0,2.0);for(let x of [.65,1.7,2.75,3.8]){add(s,chair(),x,0,2.85,Math.PI);add(s,K.rbox(.27,.025,.34,.012,mat(0xf4f3e9)),x,.61,2.0)}
 const coach=add(s,K.person({rand:R,shirt:0x6c7460}),4.55,0,1.55,-1.3);idle.push(coach);add(s,K.planter(),5.4,0,-2.9);add(s,K.planter(),-5.0,0,2.8);add(s,K.rbox(2.0,.035,1.75,.04,mat(0xc4d4dc)),-4.1,.015,1.4);add(s,K.monitor('kanban'),-4.65,.56,2.4);add(s,K.desk({w:1.25,d:.55,monitor:false}),-4.65,0,2.4);
 const blue=0x3c659b,teal=0x147e70;for(let i=0;i<3;i++){let hired=add(s,K.person({rand:R,shirt:blue}),-4.4,0,1.1),trained=add(s,K.person({rand:R,shirt:teal}),1.0+i*1.0,0,2.8);hired.name=`hire-${i}`;trained.name=`develop-${i}`;actors.push({hired,trained})}
 let mode=2,elapsed=0,stageText='Launch',phase='launch';const red=mat(0xd8b5ae),green=mat(0x80bba7);
 ctx.label('Hiring & onboarding',V(-4.25,1.65,1.4),{cls:'teal'});ctx.label('Coaching & qualification',V(2.2,1.7,2.0),{cls:'teal'});
 ctx.label('Launch: 2 required',V(0,1.8,-1.9),{show:()=>phase==='launch'});ctx.label('Next milestone: 3 required',V(0,1.8,-1.9),{show:()=>phase==='later'});
 function update(t,dt){elapsed+=dt||0;const moving=!(TK.Stage&&!TK.Stage.motion);const cycle=moving?elapsed%11:10.5;phase=cycle<5?'launch':'later';
 for(let i=0;i<3;i++){const internal=mode===1||(mode===2&&i===2),actor=internal?actors[i].trained:actors[i].hired,other=internal?actors[i].hired:actors[i].trained;other.visible=false;actor.visible=true;
 const start=internal?V(.75+i*1.05,0,2.85):V(-4.8+i*.3,0,1.1+i*.38),end=V(slots[i],0,-.75),delay=internal||i===2?5.1:0.5+i*.4,progress=Math.max(0,Math.min(1,(cycle-delay)/2.1)),walk=progress>0&&progress<1;
 // move around the central aisle rather than through the furniture
 const mid=V(slots[i],0,.35),v=progress<.62?start.clone().lerp(mid,progress/.62):mid.clone().lerp(end,(progress-.62)/.38);actor.position.copy(v);if(walk)K.face(actor,progress<.62?mid.x:end.x,progress<.62?mid.z:end.z);else if(progress===1)actor.rotation.y=Math.PI;else actor.rotation.y=internal?Math.PI:0.7;K.pose(actor,t,walk?1:0);if(!walk&&internal&&progress===0)actor.userData.armR.rotation.x=-.38+.15*Math.sin(t*2+i);
 lights[i].material=progress===1?green:red;
 }
 idle.forEach(p=>{K.pose(p,t,0);p.userData.armR.rotation.x=-.45+.16*Math.sin(t*2)});
 }
 return{...b,view:{target:V(0,.35,0),radius:18.8,yaw:.25,pitch:.73,fov:30,fit:1.85},update,api:{setMode(i){mode=Number(i);elapsed=0;update(0,0)}}};
};
// Chapter-specific additions to the original scenes, respecting their story geometry.
const upgrades={campus(s){for(const x of [-11.4,-4.8,4.8,11.4]){lamp(s,x,0.1);bench(s,x,1.0)}for(let x=-2;x<=2;x+=.8){add(s,K.box(.42,.015,.07,mat(0xa1b4ac)),x,.043,5.45)}},tools(s){wall(s,0,-3.45,16.4);for(const x of [-7.7,0,7.7])lamp(s,x,3.15)},allocation(s){for(let x=-2.6;x<=5.3;x+=1.95)add(s,chair(),x,0,4.35,Math.PI)},route(s){for(const x of [-6.8,0,6.8])lamp(s,x,-2.8)},journey(s){for(const x of [-7.5,0,7.5])lamp(s,x,-3.6)},network(s){for(let i=0;i<8;i++){const a=i*Math.PI/4;lamp(s,Math.cos(a)*8.1,Math.sin(a)*8.1)}},ownership(s){wall(s,0,-4.2,15.5);for(const x of [-6.5,6.5])add(s,K.planter(),x,0,3.6)},gates(s){for(const x of [-8.3,8.3])lamp(s,x,-2.6)},flywheel(s){for(let i=0;i<6;i++){const a=i*Math.PI/3;add(s,K.planter(),Math.cos(a)*7.7,0,Math.sin(a)*7.7)}}};
for(const [name,enhance] of Object.entries(upgrades)){if(!S[name])continue;const orig=S[name];S[name]=function(ctx){const v=orig(ctx);enhance(v.scene);return v}}
})();
