/* A single, scene-specific camera director. No changes to the business models. */
(function(){'use strict';const T=window.THREE,K=TK.K,S=TK.SCENES;const V=(x,y,z)=>new T.Vector3(x,y,z);const m=(c,o={})=>K.mat(c,{roughness:.72,...o});function put(g,o,x,y,z,r=0){o.position.set(x,y,z);o.rotation.y=r;g.add(o);return o}
// Front elevations where possible; circular networks deliberately retain some depth.
const design={
 campus:{yaw:0.035,pitch:0.4,fov:32,ratio:2.65,target:[0,1.6,0],brief:'See all four buildings and the central patient pavilion from the entrance.'},
 tools:{yaw:0,pitch:0.34,fov:31,ratio:3.03,target:[0,1.1,0],brief:'Three workstations form an aligned, front-facing triptych.'},
 allocation:{yaw:-.09,pitch:0.44,fov:32,ratio:2.48,target:[0,.8,0],brief:'Keep all four desk rows and the lateral redeployment entrance visible.'},
 tower:{yaw:.04,pitch:0.4,fov:32,ratio:2.48,target:[0,.9,0],brief:'Face both assessment tables and the independent review desk.'},
 route:{yaw:0,pitch:0.36,fov:31,ratio:2.88,target:[0,.9,0],brief:'Read the three workstations behind the complete decision path.'},
 journey:{yaw:0,pitch:0.39,fov:31,ratio:3.15,target:[0,.85,0],brief:'Follow all five stages from left to right without diagonal distortion.'},
 team:{yaw:.035,pitch:0.43,fov:32,ratio:2.48,target:[0,.8,0],brief:'See onboarding, coaching and delivery slots together, including moving people.'},
 network:{yaw:0,pitch:.58,fov:30,ratio:1.57,target:[0,.5,0],brief:'Front-symmetric view; enough elevation to separate network connections.'},
 ownership:{yaw:0,pitch:0.43,fov:31,ratio:2.98,target:[0,1,0],brief:'Read both conveyor paths and acceptance gate, with the two sites visible.'},
 gates:{yaw:0,pitch:0.36,fov:31,ratio:3.45,target:[0,1,0],brief:'All four gate openings and the re-test path visible in a level panorama.'},
 flywheel:{yaw:0,pitch:.56,fov:30,ratio:1.55,target:[0,.65,0],brief:'Symmetric circular composition with a front-facing heart and visible stations.'}
};
// Detail the existing functions rather than adding unrelated props. Keep walkways clear.
const steel=m(0x667982,{metalness:.48,roughness:.44}), ceramic=m(0xe8e8e1), paper=m(0xf4f0e5), slate=m(0x46545b), wood=m(0xb8a286), edge=m(0x9caaa6), accent=m(0x9d2837);
function shelf(g,x,z,w=1.4){const a=new T.Group();for(const xx of [-w/2,w/2])put(a,K.box(.055,1.14,.34,steel),xx,0,0);for(const yy of [.06,.40,.75,1.10])put(a,K.box(w,.035,.36,ceramic),0,yy,0);for(let i=0;i<5;i++){const x=-w*.36+i*w*.18;put(a,K.rbox(.12,.24,.23,.013,i%3===0?slate:paper),x,.44,0);put(a,K.rbox(.14,.22,.24,.015,i%2?edge:wood),x,.79,0)}put(g,a,x,0,z);return a}
function cup(g,x,y,z){put(g,K.cyl(.037,.032,.085,ceramic,12),x,y,z);put(g,K.cyl(.03,.03,.006,m(0x685349),12),x,y+.08,z);const h=new T.Mesh(new T.TorusGeometry(.025,.007,6,12),ceramic);put(g,h,x+.044,y+.047,z)}
function board(g,x,z,w=1.5){const a=new T.Group();put(a,K.box(w,.78,.055,steel),0,1.05,0);put(a,K.box(w-.07,.71,.018,paper),0,1.085,.035);for(let i=0;i<3;i++){put(a,K.box((w-.18)*(.70-i*.14),.019,.012,edge),-.05,1.65-i*.14,.05);put(a,K.box(.08,.08,.014,i===0?accent:wood),-w*.38,1.53-i*.14,.05)}put(g,a,x,0,z)}
function overhead(g,x,z,w){const a=new T.Group();for(const dx of [-w/2,w/2])put(a,K.box(.035,2.05,.035,steel),dx,0,0);put(a,K.box(w,.045,.19,steel),0,2.04,0);put(a,K.box(w-.12,.014,.12,K.mat(0xfff3d8,{emissive:0xffebc9,emissiveIntensity:.28})),0,2.027,0);put(g,a,x,0,z)}
const oldDesk=K.desk;K.desk=function(o={}){const g=oldDesk(o),w=o.w||1.15,d=o.d||.62;if(w>1.05){put(g,K.rbox(.15,.018,.20,.012,paper),-w*.32,.607,d*.18);cup(g,w*.34,.61,-d*.29);put(g,K.box(.15,.023,.025,steel),0,.23,-d*.33)}return g};
const oldTable=K.table;K.table=function(w,d,c){const g=oldTable(w,d,c);if(w>1.3){for(const x of [-w*.27,w*.27]){put(g,K.rbox(.18,.018,.25,.012,paper),x,.605,d*.19);cup(g,x+.13,.605,-d*.15)}}return g};
const oldMonitor=K.monitor;K.monitor=function(kind,accent,w,h){const g=oldMonitor(kind,accent,w,h);put(g,K.box(.018,.009,.008,m(0x95c6b6)),(w||.62)*.38,.147,.021);return g};
function windowWall(g,w,z,h=2.75){const a=new T.Group(),wall=m(0xe1e5df),frame=m(0x93a6a7,{metalness:.18}),glass=m(0xb8ced0,{metalness:.15,roughness:.28});put(a,K.box(w,.48,.12,wall),0,0,0);put(a,K.box(w,.24,.12,wall),0,h-.24,0);const count=Math.round(w/1.7),bay=w/count;for(let i=0;i<count;i++){const x=-w/2+bay*(i+.5);put(a,K.box(bay-.12,h-.75,.045,glass),x,.49,0);put(a,K.box(bay-.12,.032,.07,frame),x,h*.57,.025);put(a,K.box(.038,h-.75,.08,frame),x,.49,.028);put(a,K.box(.055,h,.12,frame),x-bay/2,0,0)}put(a,K.box(.055,h,.12,frame),w/2,0,0);put(a,K.box(w,.055,.17,ceramic),0,.47,0);put(g,a,0,0,z);return a}
const details={
 campus(s){ // real façade details on the existing four buildings; path furniture already present
  for(const [x,z,w] of [[-7.9,-3.9,5.4],[-7.7,4.3,4.8],[7.6,4.3,4.8]]){const d=x===-7.9?3.8:x<0?3.1:3.2;for(const a of [-1,1]){put(s,K.rbox(.52,.14,.34,.035,edge),x+a*w*.32,.035,z+d/2+.34);put(s,K.box(.055,.44,.055,steel),x+a*w*.35,.16,z+d/2+.34)}}
  for(const x of [3.9,5.25,6.6,7.95]){put(s,K.box(.9,.60,.06,m(0x9ca9ac)),x,.58,-2.10);put(s,K.box(.9,.055,.075,steel),x,.57,-2.045)}
 },
 tools(s){windowWall(s,16.4,-3.67,2.75);shelf(s,-7.65,-2.85,.9);shelf(s,-4.05,-2.85,.9);overhead(s,-5.9,-2.65,3.2);board(s,7.2,-3.55,1.25)},
 allocation(s){shelf(s,5.9,-4.1,1.0);shelf(s,-4.85,-4.1,1.0)},
 tower(s){board(s,-3.5,-3.15,1.7);board(s,3.5,-3.15,1.7);overhead(s,-3.5,-1.35,2.4);overhead(s,3.5,-1.35,2.4)},
 route(s){windowWall(s,15.3,-4.55,2.75);shelf(s,-6.6,-3.65,.8);board(s,0,-3.85,1.7);shelf(s,6.65,-3.65,.8)},
 journey(s){windowWall(s,19.7,-4.32,2.70);board(s,-8.2,-3.75,1.3);board(s,8.2,-3.75,1.3);shelf(s,0,-3.75,.9)},
 team(s){board(s,-4.1,-3.15,1.25);board(s,4.2,-3.15,1.35);for(const x of [-2.65,0,2.65])put(s,K.box(1.1,.028,.035,steel),x,.01,-2.1)},
 network(s){ // leave the network paths visually clear; no extra vertical objects in the center
 },
 ownership(s){for(const x of [-4.4,-2.1,2.1,4.4])for(const z of [.30,1.10,1.95,2.65])put(s,K.box(.07,.32,.07,steel),x,0,z);for(const x of [-3.4,3.4])put(s,K.box(.38,.027,.12,accent),x,.02,3.45)},
 gates(s){windowWall(s,20.6,-3.35,2.9);for(const x of [-8.2,-4.6,-1.0,2.6]){put(s,K.rbox(.52,.05,.28,.025,edge),x,.02,-2.0)}},
 flywheel(s){}
};
// Perspective-correct framing; solve both extents and recenter instead of scaling CSS/cropping.
function bounds(sc){sc.scene.updateMatrixWorld(true);const ps=[],b=new T.Box3(),mi=new T.Matrix4(),mx=new T.Matrix4(),sz=new T.Vector3();function sample(o,mx){let g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();if(!g.boundingBox)return;const a=g.boundingBox.min,c=g.boundingBox.max;const cyl=['CylinderGeometry','CircleGeometry'].includes(g.type)&&Math.abs(a.x+c.x)<.01&&Math.abs(a.z+c.z)<.01; if(cyl){for(let k=0;k<24;k++)for(const y of [a.y,c.y])ps.push(V(Math.cos(k*Math.PI/12)*c.x,y,Math.sin(k*Math.PI/12)*c.z).applyMatrix4(mx))}else for(const x of [a.x,c.x])for(const y of [a.y,c.y])for(const z of [a.z,c.z])ps.push(V(x,y,z).applyMatrix4(mx))}sc.scene.traverseVisible(o=>{if(!o.isMesh||!o.geometry||!o.material||o.getWorldScale(sz).length()<.02)return;const mat=Array.isArray(o.material)?o.material[0]:o.material;if(mat.opacity<.16||mat.map&&mat.transparent&&mat.depthWrite===false)return;if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,mi);if(mi.elements[0]**2+mi.elements[1]**2+mi.elements[2]**2<.00001||mi.elements[13]<-5)continue;mx.multiplyMatrices(o.matrixWorld,mi);sample(o,mx)}}else sample(o,o.matrixWorld)});return ps.filter(p=>p.y>-4&&Number.isFinite(p.x));}
function solve(sc,aspect,yaw,pitch){const v=sc.view,cache=sc._cinematicFit;if(cache&&Math.abs(cache.aspect-aspect)<.008&&Math.abs(cache.yaw-yaw)<.025&&Math.abs(cache.pitch-pitch)<.025){sc._frameTarget=cache.target;return cache.radius}const ps=sc._cinematicPoints||(sc._cinematicPoints=bounds(sc)),dir=V(Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch),Math.cos(pitch)*Math.cos(yaw)),right=V(Math.cos(yaw),0,-Math.sin(yaw)),up=dir.clone().cross(right).normalize(),tan=Math.tan(v.fov*Math.PI/360),margin=.925;const pts=ps.map(p=>{const q=p.clone().sub(v.target);return[q.dot(right),q.dot(up),q.dot(dir)]});const ax=tan*aspect*margin,ay=tan*margin;function interval(r){let l=-Infinity,h=Infinity,b=-Infinity,t=Infinity;for(const [x,y,z] of pts){const d=r-z;if(d<1)return null;l=Math.max(l,x-d*ax);h=Math.min(h,x+d*ax);b=Math.max(b,y-d*ay);t=Math.min(t,y+d*ay)}return l<=h&&b<=t?[l,h,b,t]:null}let lo=1,hi=250;for(let i=0;i<23;i++){const mid=(lo+hi)/2;if(interval(mid))hi=mid;else lo=mid}const r=hi,edges=interval(r)||[0,0,0,0],target=v.target.clone().addScaledVector(right,(edges[0]+edges[1])/2).addScaledVector(up,(edges[2]+edges[3])/2);sc._frameTarget=target;sc._cinematicFit={aspect,yaw,pitch,radius:r,target};return r}
TK.Director={design,bounds,solve};TK.Visual.frame=solve;
for(const [name,orig] of Object.entries(S)){S[name]=function(ctx){const sc=orig(ctx),d=design[name];if(!d)return sc;Object.assign(sc.view,{yaw:d.yaw,pitch:d.pitch,fov:d.fov,fit:d.ratio,target:V(...d.target)});sc.camera.fov=d.fov;sc.scene.fog=null;if(details[name])details[name](sc.scene);sc.scene.traverse(o=>{if(o.isHemisphereLight){o.intensity=.86;o.groundColor.setHex(0xb1b6ac);o.color.setHex(0xf7f9fc)}if(o.isDirectionalLight&&o.castShadow){o.intensity=2.7;o.color.setHex(0xfff5e8);o.shadow.normalBias=.025;o.shadow.bias=-.0002;o.shadow.radius=3}});return sc}}
})();
