(function(){
'use strict';
const W=768,H=1152,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');canvas.width=W;canvas.height=H;
const previewParams=new URLSearchParams(location.search);if(previewParams.get('from')==='g08'){previewParams.set('from','g07');previewParams.set('attempt','4');previewParams.set('line','94');history.replaceState(null,'','?'+previewParams.toString());}
const state={phase:'loading',scene:0,t:0,elapsed:0,paused:false,active:null,pieces:[],history:[],media:'attack',segment:[0,6],counter:false,loss:false,zoom:1,focus:[.5,.5],cameraBeat:null};
const imgs={},vids={},particles=[],districtFrames={};
const daily=window.createDailyEnding(canvas,ctx,W,H);
let descentFrames=[],dialogueActorFrames=[];
const work=document.createElement('canvas');work.width=W;work.height=H;const wc=work.getContext('2d');
const mask=document.createElement('canvas');mask.width=W*2;mask.height=H*2;const mc=mask.getContext('2d');mc.scale(2,2);
const realm=document.createElement('canvas');realm.width=W*2;realm.height=H*2;const rc=realm.getContext('2d');rc.scale(2,2);
function polygon(c,p){c.beginPath();p.forEach((v,i)=>i?c.lineTo(v[0]*W,v[1]*H):c.moveTo(v[0]*W,v[1]*H));c.closePath();}
function image(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Missing '+src));im.src=src;});}
function video(src){return new Promise((resolve,reject)=>{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.onloadeddata=()=>resolve(v);v.onerror=()=>reject(Error('Missing '+src));v.src=src;v.load();});}
function background(){
const im=state.g06View&&descentFrames.length?descentFrames[Math.round((state.cityProgress||0)*(descentFrames.length-1))]:state.scene===2?imgs.district:state.scene?imgs.corner:imgs.street;if(!im)return;
wc.clearRect(0,0,W,H);wc.drawImage(im,0,0,W,H);ctx.drawImage(work,0,0);
if(state.g06View&&state.skyProgress>0){ctx.save();ctx.beginPath();ctx.arc(W*.135,H*.065,W*.033,0,Math.PI*2);ctx.clip();ctx.globalAlpha=state.skyProgress;ctx.drawImage(imgs.moonRestored,0,0,W,H);ctx.restore();}
}

function tri(c,im,s,d){const [a,b,e]=s.map(v=>[v[0]*W,v[1]*H]),[A,B,E]=d.map(v=>[v[0]*W,v[1]*H]);const det=(b[0]-a[0])*(e[1]-a[1])-(e[0]-a[0])*(b[1]-a[1]);if(Math.abs(det)<.001)return;const x1=b[0]-a[0],y1=b[1]-a[1],x2=e[0]-a[0],y2=e[1]-a[1],u1=B[0]-A[0],v1=B[1]-A[1],u2=E[0]-A[0],v2=E[1]-A[1];const aa=(u1*y2-u2*y1)/det,bb=(v1*y2-v2*y1)/det,cc=(u2*x1-u1*x2)/det,dd=(v2*x1-v1*x2)/det;c.save();c.beginPath();c.moveTo(...A);c.lineTo(...B);c.lineTo(...E);c.closePath();c.clip();c.transform(aa,bb,cc,dd,A[0]-aa*a[0]-cc*a[1],A[1]-bb*a[0]-dd*a[1]);c.drawImage(im,0,0);c.restore();}
function displaced(p){const age=state.elapsed-(p.impulseAt??-100),pulse=age>=0&&age<.48?Math.sin(Math.PI*age/.48)*.15:0;const q=p.damage*(1-p.repair)*((p.boost||1)+pulse);return p.poly.map((v,i)=>[v[0]+p.delta[0]*q*(p.airborne?1:i<2?.45:1),v[1]+p.delta[1]*q*(p.airborne?1:i<2?.45:1)]);}
function burst(p,n=22){window.GameAudio?.play(p.repair>=1?"repair":"break");const d=displaced(p),a=d[2],b=d[3];for(let i=0;i<n;i++){let f=Math.random();particles.push({x:(a[0]*f+b[0]*(1-f))*W,y:(a[1]*f+b[1]*(1-f))*H,vx:(Math.random()-.5)*95,vy:-30-Math.random()*70,life:.8+Math.random()*.6,size:1+Math.random()*5});}}
function jagged(poly){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);for(let j=0;j<14;j++){const f=j/14,noise=Math.sin(i*33+j*21.17)*.0037;out.push([a[0]+dx*f-dy/len*noise,a[1]+dy*f+dx/len*noise]);}}return out;}
let rockPattern;
function rockFace(poly){
 ctx.save();polygon(ctx,jagged(poly));ctx.clip();
 if(!rockPattern){rockPattern=ctx.createPattern(imgs.rock,'repeat');rockPattern.setTransform(new DOMMatrix().scale(.34));}
 ctx.fillStyle=rockPattern;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(18,28,41,.19)';ctx.fillRect(0,0,W,H);ctx.restore();
}

function mixPoint(a,b,f){return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];}
function fractureCells(){
 const seeds=[[.15,.22],[.48,.16],[.84,.28],[.19,.78],[.53,.65],[.88,.83]];
 return seeds.map((seed,index)=>{
 let cell=[[0,0],[1,0],[1,1],[0,1]];
 for(let j=0;j<seeds.length;j++){if(j===index)continue;const other=seeds[j],nx=other[0]-seed[0],ny=other[1]-seed[1],limit=(other[0]*other[0]+other[1]*other[1]-seed[0]*seed[0]-seed[1]*seed[1])/2;const out=[];
 for(let k=0;k<cell.length;k++){const a=cell[k],b=cell[(k+1)%cell.length],da=a[0]*nx+a[1]*ny-limit,db=b[0]*nx+b[1]*ny-limit;if(da<=0)out.push(a);if((da<=0)!==(db<=0))out.push(mixPoint(a,b,da/(da-db)));}cell=out;}
 return {cell,seed,index};}).sort((a,b)=>a.seed[1]-b.seed[1]);
}
const roadCells=fractureCells();
function mapSurface(poly,uv){return mixPoint(mixPoint(poly[0],poly[1],uv[0]),mixPoint(poly[3],poly[2],uv[0]),uv[1]);}
function brokenSections(p){
 const whole=displaced(p),q=p.damage*(1-p.repair)*(p.boost||1);
 if(!['near-road','junction'].includes(p.id))return [{source:p.poly,dest:whole}];
 return roadCells.map(({cell,seed,index})=>{
 const source=cell.map(v=>mapSurface(p.poly,v)),center=mapSurface(whole,seed),angle=[-.025,.018,-.014,.021,-.012,.025][index]*q;
 const dest=cell.map(v=>{const pos=mapSurface(whole,v),x=(pos[0]-center[0])*W,y=(pos[1]-center[1])*H;return [center[0]+(x*Math.cos(angle)-y*Math.sin(angle))/W+(seed[0]-.5)*.025*q,center[1]+(x*Math.sin(angle)+y*Math.cos(angle))/H+([-.006,.011,-.009,.008,-.004,.003][index])*q];});
 return {source,dest};
 });
}

function drawPiece(p){
 const q=p.damage*(1-p.repair);if(q<.002)return;
 if(p.videoRoad||p.videoWall){
  const frames=districtFrames[p.id];if(!frames?.length)return;const fw=p.videoWall?256:W,fh=p.frameHeight||(p.videoWall?288:432),fy=p.frameY??(p.videoWall?680:720);
  const age=state.elapsed-(p.impulseAt??-100),pulse=age>=0&&age<.48?Math.sin(Math.PI*age/.48)*.12:0;
  const amount=clamp(q*((p.boost||1)+pulse)*.7),first=p.frameStart??(p.videoRoad?12:0),index=Math.round(first+amount*(frames.length-1-first));
  if(p.cachedFrameIndex!==index){
   if(!p.cachedFrame){p.cachedFrame=document.createElement('canvas');p.cachedFrame.width=fw;p.cachedFrame.height=fh;}
   const cc=p.cachedFrame.getContext('2d');cc.clearRect(0,0,fw,fh);cc.globalCompositeOperation='source-over';cc.save();if(p.videoWall){cc.beginPath();[[0,.61],[.08,.61],[.13,.635],[.18,.65],[.24,.65],[.28,.685],[.30,.74],[.25,.785],[.20,.79],[.05,.82],[0,.82]].forEach((v,i)=>i?cc.lineTo(v[0]*W,v[1]*H-fy):cc.moveTo(v[0]*W,v[1]*H-fy));cc.closePath();cc.clip();}cc.drawImage(frames[index],0,0);cc.restore();cc.globalCompositeOperation='destination-in';
   const edge=cc.createLinearGradient(0,0,0,32);edge.addColorStop(0,'transparent');edge.addColorStop(1,'white');cc.fillStyle=edge;cc.fillRect(0,0,fw,fh);if(p.videoWall){const right=cc.createLinearGradient(fw-24,0,fw,0);right.addColorStop(0,'white');right.addColorStop(1,'transparent');cc.fillStyle=right;cc.fillRect(0,0,fw,fh);const bottom=cc.createLinearGradient(0,fh-24,0,fh);bottom.addColorStop(0,'white');bottom.addColorStop(1,'transparent');cc.fillStyle=bottom;cc.fillRect(0,0,fw,fh);}if(p.frameSide){const seam=cc.createLinearGradient(W*.43,0,W*.50,0);seam.addColorStop(0,p.frameSide==='left'?'white':'transparent');seam.addColorStop(1,p.frameSide==='left'?'transparent':'white');cc.fillStyle=seam;cc.fillRect(0,0,fw,fh);}cc.globalCompositeOperation='source-over';p.cachedFrameIndex=index;
  }
  ctx.save();ctx.globalAlpha=clamp(q*18);ctx.drawImage(p.cachedFrame,0,fy);ctx.restore();return;
 }
 if(p.airborne){
  const frames=districtFrames[p.id];if(!frames?.length)return;
  const age=state.elapsed-(p.impulseAt??-100),pulse=age>=0&&age<.48?Math.sin(Math.PI*age/.48)*.12:0;
  const amount=clamp(q*((p.boost||1)+pulse)*.7),index=Math.round(amount*(frames.length-1));
  if(p.cachedFrameIndex!==index){
   if(!p.cachedFrame){p.cachedFrame=document.createElement('canvas');p.cachedFrame.width=W;p.cachedFrame.height=560;}
   const cc=p.cachedFrame.getContext('2d');cc.clearRect(0,0,W,560);cc.globalCompositeOperation='source-over';cc.drawImage(frames[index],0,0);
   cc.globalCompositeOperation='destination-in';const seam=cc.createLinearGradient(W*.69,0,W*.74,0);
   if(p.id==='district-west'){seam.addColorStop(0,'white');seam.addColorStop(1,'transparent');}else{seam.addColorStop(0,'transparent');seam.addColorStop(1,'white');}
   cc.fillStyle=seam;cc.fillRect(0,0,W,560);const bottom=cc.createLinearGradient(0,500,0,560);bottom.addColorStop(0,'white');bottom.addColorStop(1,'transparent');cc.fillStyle=bottom;cc.fillRect(0,0,W,560);cc.globalCompositeOperation='source-over';p.cachedFrameIndex=index;
  }
  ctx.save();ctx.globalAlpha=clamp(q*18);ctx.drawImage(p.cachedFrame,0,0);ctx.restore();return;
 }
 ctx.save();polygon(ctx,jagged(p.poly));ctx.clip();
 const minY=Math.min(...p.poly.map(v=>v[1]))*H,maxY=Math.max(...p.poly.map(v=>v[1]))*H;
 const depth=ctx.createLinearGradient(0,minY,0,maxY);depth.addColorStop(0,'rgba(14,23,34,.92)');depth.addColorStop(.55,'rgba(22,32,46,.79)');depth.addColorStop(1,'rgba(9,17,28,.95)');if(!rockPattern){rockPattern=ctx.createPattern(imgs.rock,'repeat');rockPattern.setTransform(new DOMMatrix().scale(.34));}ctx.fillStyle=rockPattern;ctx.fillRect(0,0,W,H);ctx.fillStyle=depth;ctx.fillRect(0,0,W,H);
 const center=p.poly.reduce((a,v)=>[a[0]+v[0]/4,a[1]+v[1]/4],[0,0]);const rim=p.poly.map(v=>mixPoint(v,center,.16));
 for(let i=0;i<4;i++){const j=(i+1)%4;rockFace([p.poly[i],p.poly[j],rim[j],rim[i]]);}
 ctx.restore();
 const sections=brokenSections(p);
 for(const {source:a,dest:d} of sections){
  const bottom=d.map(v=>[v[0],v[1]+.026*Math.min(1,q*3)]);for(let i=0;i<d.length;i++){const j=(i+1)%d.length;rockFace([d[i],d[j],bottom[j],bottom[i]]);}
  ctx.save();polygon(ctx,jagged(d));ctx.clip();for(let i=1;i<a.length-1;i++)tri(ctx,work,[a[0],a[i],a[i+1]],[d[0],d[i],d[i+1]]);ctx.restore();
 }
}

function realmRect(){return state.scene===2?[-75,300,625,996]:state.scene?[-58,42,625,996]:[-100,250,460,733];}
function fissurePath(c,time){
 const [x,y,w,h]=realmRect();
 const points=[[.20,.04],[.39,.015],[.66,.045],[.75,.20],[.73,.40],[.77,.59],[.70,.70],[.43,.73],[.12,.67],[.08,.47],[.12,.23]];
 const q=points.map((p,i)=>[x+w*p[0]+Math.sin(time*.65+i*2.1)*2.2,y+h*p[1]+Math.cos(time*.5+i)*1.5]);c.beginPath();c.moveTo(...q[0]);for(let i=0;i<q.length;i++){const a=q[(i+q.length-1)%q.length],b=q[i],d=q[(i+1)%q.length],e=q[(i+2)%q.length];c.bezierCurveTo(b[0]+(d[0]-a[0])/6,b[1]+(d[1]-a[1])/6,d[0]-(e[0]-b[0])/6,d[1]-(e[1]-b[1])/6,...d);}c.closePath();
}
// Surface erosion and detached dust share the same sampled source cells.
const ashCanvas=document.createElement('canvas');ashCanvas.width=588;ashCanvas.height=882;
const ashContext=ashCanvas.getContext('2d');let ashCells=[],bodyAsh=[];
function ashRandom(n){const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);}
function prepareAsh(){
 ashContext.clearRect(0,0,588,882);ashContext.drawImage(imgs.actorClose,0,0,588,882);
 const pixels=ashContext.getImageData(0,0,588,882).data;ashCells=[];bodyAsh=[];
 for(let py=0;py<882;py+=5)for(let px=0;px<588;px+=5){const k=(py*588+px)*4;if(pixels[k+3]<50)continue;const r=ashRandom(px*71+py*193);bodyAsh.push({x:px,y:py,r,color:[pixels[k],pixels[k+1],pixels[k+2]],threshold:.32+.43*(1-clamp(Math.abs(px-300)/175))+.08*Math.sin(py*.025+px*.018)+r*.035+(py<190?.27:0),at:null});}
 for(let py=202;py<291;py+=2)for(let px=354;px<429;px+=2){
  const k=(py*588+px)*4;if(pixels[k+3]<25)continue;
  // Slanted inner boundary preserves the torso; scattered erosion leaves no straight cut.
  const nx=px/588,ny=py/882;if(nx<.60+(.325-ny)*.34)continue;
  const seed=px*193+py*71,r=ashRandom(seed),coarse=Math.sin(px*.14+py*.09)*.08;
  const threshold=clamp((.325-ny)/.092+coarse+(r-.5)*.17,.015,.99);
  ashCells.push({x:px,y:py,r,threshold,color:[pixels[k],pixels[k+1],pixels[k+2]],alpha:pixels[k+3]/255});
 }
}
function costAdvance(){return state.costObserved?1:state.phase==='cost-reveal'?clamp((state.t-1)/4.2):0;}
function drawAshActor(c,actor,x,y,w,h){
 const progress=costAdvance(),body=state.bodyFade||0;if(!progress&&!body){c.drawImage(actor,x,y,w,h);return;}
 ashContext.clearRect(0,0,588,882);ashContext.drawImage(actor,0,0,588,882);
 ashContext.save();ashContext.globalCompositeOperation='destination-out';
 for(const q of ashCells){const loss=clamp((progress-q.threshold)/.065);if(loss<=0)continue;ashContext.globalAlpha=loss;ashContext.fillRect(q.x,q.y,2.1,2.1);}
 for(const q of bodyAsh){const loss=clamp((body-q.threshold)/.10);if(!loss)continue;ashContext.globalAlpha=loss;ashContext.beginPath();ashContext.arc(q.x+2.5,q.y+2.5,4.2,0,Math.PI*2);ashContext.fill();}
 ashContext.restore();c.save();c.globalAlpha*=1-body*.78;if(body>=.999)c.globalAlpha=0;c.drawImage(ashCanvas,x,y,w,h);c.restore();
}
function drawArmDissolve(c,x,y,w,h){
 if(!state.loss||!ashCells.length)return;
 const progress=costAdvance(),time=state.phase==='cost-reveal'?state.t:state.costObserved?state.elapsed-(state.costRevealAt||0):0;
 const ax=x+w*.19,ay=y+h*.178,sw=w*.42/588,sh=h*.395/882;
 c.save();c.translate(ax,ay);c.scale(sw,sh);
 for(let i=0;i<ashCells.length;i++){
  const q=ashCells[i];let age=time-(1+q.threshold*4.2);
  // Before/after the one-shot burst only sparse, subdued edge dust remains.
  if(!progress||age>3.8){if(i%19||q.threshold>(progress?.98:.12)||q.threshold<(progress?.80:0))continue;age=(state.elapsed*.45+q.r*3)%2.8;}
  if(age<0||age>3.8)continue;
  const life=age/3.8,drift=age*age,gray=.55*life;
  const rgb=q.color.map(v=>Math.round(v*(1-gray)+105*gray));
  c.globalAlpha=q.alpha*(1-life)*(age<.12?clamp(age/.12):1)*.88;c.fillStyle='rgb('+rgb.join(',')+')';
  const dx=age*(8+q.r*20)+drift*9+Math.sin(age*3+q.r*9)*age*3,dy=-age*(5+q.r*9)-drift*3+Math.sin(age*2+q.r*17)*age*5;
  const size=(2.2+q.r*3.4)*(1-life*.7);c.save();c.translate(q.x+dx,q.y+dy);c.rotate(q.r*6+age*(q.r-.5));c.beginPath();c.moveTo(-size,-size*.4);c.lineTo(size*.5,-size);c.lineTo(size,size*.5);c.lineTo(-size*.4,size);c.closePath();c.fill();c.restore();
 }
 for(const q of bodyAsh){if(q.at===null)continue;const age=state.elapsed-q.at;if(age>4||age<0)continue;const f=age/4;const rgb=q.color.map(v=>Math.round(v*(1-f*.6)+95*f*.6));c.fillStyle='rgb('+rgb.join(',')+')';c.globalAlpha=(1-f)*.7;const sz=(2+q.r*3)*(1-f*.7);c.fillRect(q.x+age*(12+q.r*35)+age*age*8,q.y-age*(7+q.r*15)+Math.sin(age*2+q.r*19)*age*5,sz,sz*.7);}
 c.restore();
}
function drawRealm(hideActor=false){
 if(state.phase==='ended'||state.g06View&&state.phase==='restoration')return;
 rc.clearRect(0,0,W,H);const media=(state.phase==='travelVideo'?vids[state.departureMedia]:vids[state.media])||imgs.realm;if(state.media==='release_hold'&&state.phase!=='travelVideo'){const [x,y,w,h]=realmRect();rc.save();if(state.phase==='connection'&&state.attempt===1)rc.globalAlpha=.94-Math.sin((state.connectVisual||0)*Math.PI)*.12;rc.drawImage(imgs.realm,x,y,w,h);rc.restore();const actor=dialogueActorFrames.length?dialogueActorFrames[Math.floor(Math.max(0,state.elapsed-(state.idleStart||0))*12)%dialogueActorFrames.length]:imgs.actorClose;if(!hideActor){rc.save();drawAshActor(rc,actor,x+w*.19,y+h*.178,w*.42,h*.395);rc.restore();if(state.phase!=='farewell'||state.t<11)drawArmDissolve(rc,x,y,w,h);}}else rc.drawImage(media,...realmRect());
 mc.clearRect(0,0,W,H);mc.save();mc.filter='blur(7px)';fissurePath(mc,state.elapsed);mc.fillStyle='white';mc.fill();mc.restore();
 rc.globalCompositeOperation='destination-in';rc.drawImage(mask,0,0,W,H);rc.globalCompositeOperation='source-over';
 const reveal=Math.min(1,state.elapsed/.8)*(state.phase==='travelVideo'?1-clamp(state.t/.5):state.phase==='travel'?state.travelSwitched?clamp((state.t-.34)/.34):1-clamp(state.t/.28):['dialogue','cost-reveal','farewell-wait','farewell'].includes(state.phase)?1:state.scene?Math.min(1,state.t/.6):1);
 ctx.save();ctx.globalAlpha=ctx.globalAlpha*reveal*(state.phase==='farewell'?1-clamp((state.t-10)/3):state.phase==='ended'?0:1);ctx.drawImage(realm,0,0,W,H);
 // Only the boundary shimmers. The person and ancient floor remain opaque inside the other world.
 ctx.filter='blur(2px)';fissurePath(ctx,state.elapsed);ctx.strokeStyle='rgba(26,43,61,.32)';ctx.lineWidth=4;ctx.stroke();
 ctx.filter='none';fissurePath(ctx,state.elapsed+.3);ctx.strokeStyle='rgba(155,185,205,.18)';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
}
function handle(p){if(p.cue){const q=p.damage*(1-p.repair)*(p.boost||1);return [p.cue[0]+p.delta[0]*q,p.cue[1]+p.delta[1]*q];}const d=displaced(p);return [clamp((d[2][0]+d[3][0])/2,.035,.965),(d[2][1]+d[3][1])/2];}
function cue(p){
 if(p.repair>=1||p.damage<.5)return;
 const h=handle(p),x=h[0]*W,y=h[1]*H,sign=1;
 const vx=p.vector[0]*W*sign,vy=p.vector[1]*H*sign,len=Math.hypot(vx,vy);
 const reach=Math.max(55,Math.min(105,len*.85)),dx=vx/len*reach,dy=vy/len*reach;
 ctx.save();ctx.shadowColor='#e1eef5';ctx.shadowBlur=22;ctx.fillStyle='#effbff';
 ctx.beginPath();ctx.arc(x,y,8.5+Math.sin(state.elapsed*4)*1.5,0,7);ctx.fill();
 // Light motion demonstrates repair only. Ceasefire never moves the repaired object backwards.
 const f=(state.elapsed%1.65)/1.65,fade=Math.sin(f*Math.PI);
 for(let i=5;i>=0;i--){const t=f-i*.045;if(t<0)continue;ctx.globalAlpha=fade*(1-i*.13)*(state.active?.p === p ? .45 : .9);ctx.shadowBlur=i===0?14:5;ctx.beginPath();ctx.arc(x+dx*t,y+dy*t,i===0?4.8:2.4,0,7);ctx.fill();}
 ctx.restore();
}
function setPieces(scene){state.lastRepairAt=-Infinity;if(scene===0)state.firstFixed=null;state.nextPressure=6;state.pressureIndex=0;state.counter=false;state.lockUntil=0;state.pendingReaction=null;state.queuedCounter=null;state.pieces=scene===2?[
{id:'district-west',airborne:true,poly:[[.31,.15],[.66,.11],[.65,.32],[.32,.34]],outline:[[.315,.255],[.65,.213],[.65,.273],[.61,.282],[.59,.31],[.55,.328],[.46,.341],[.438,.315],[.398,.309],[.377,.285],[.342,.282],[.315,.269]],delta:[-.065,.025],vector:[.065,-.025],start:1.1,damage:0,repair:0},
{id:'district-east',airborne:true,poly:[[.80,.08],[1,.025],[1,.31],[.80,.27]],outline:[[.72,.205],[1,.172],[1,.299],[.946,.317],[.922,.312],[.89,.294],[.864,.281],[.82,.265],[.782,.281],[.75,.285],[.72,.278]],delta:[.015,-.045],vector:[-.015,.045],start:2.7,damage:0,repair:0}
]:scene?[{id:'junction',videoRoad:true,frameSide:'right',frameStart:0,frameHeight:512,frameY:640,cue:[.74,.78],poly:[[.55,.65],[.93,.60],[1,.84],[.38,.88]],delta:[-.035,-.02],vector:[.07,.055],start:.9,damage:0,repair:0},{id:'sideway',videoRoad:true,frameStart:0,frameHeight:412,frameY:740,frameSide:'left',cue:[.23,.83],poly:[[.01,.70],[.40,.77],[.39,.94],[.01,.97]],delta:[-.025,.025],vector:[.055,-.065],start:2.6,damage:0,repair:0}]:[{id:'near-road',videoRoad:true,poly:[[.26,.75],[.79,.74],[.80,.87],[.22,.88]],delta:[0,-.02],vector:[0,.10],start:1.45,damage:0,repair:0},{id:'left-wall',videoWall:true,cue:[.19,.71],poly:[[.15,.67],[.24,.67],[.26,.78],[.15,.80]],delta:[.04,.005],vector:[-.08,-.02],start:3.1,damage:0,repair:0}];}
function point(e){const r=canvas.getBoundingClientRect();return[((e.clientX-r.left)/r.width+state.focus[0]*(state.zoom-1))/state.zoom,((e.clientY-r.top)/r.height+state.focus[1]*(state.zoom-1))/state.zoom];}
function inside(pt,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>pt[1])!==(b[1]>pt[1]))&&(pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0]))yes=!yes;}return yes;}
canvas.onpointerdown=e=>{if(state.paused)return;if(state.phase==='daily'){daily.down(e);return;}const at=point(e);if(state.phase==='farewell-wait'){const r=canvas.getBoundingClientRect(),pt=[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];if(Math.hypot(pt[0]-(.91-.22*state.closeAmount),pt[1]-.77)<.12){state.active={farewell:true,startX:pt[0],base:state.closeAmount};canvas.setPointerCapture(e.pointerId);}return;}if(state.phase==='connection'){connectPointerDown(e);return;}if(state.phase==='restoration'&&!['edge','city','sky'].includes(state.restoreStage))return;if(state.phase==='restoration'&&state.restoreStage!=='edge'){const h=restorationHandle();if(Math.hypot(at[0]-h[0],at[1]-h[1])<.09){state.active={restoration:true,start:at,base:state.restoreStage==='city'?state.cityProgress:state.skyProgress};canvas.setPointerCapture(e.pointerId);}return;}if(!['exchange','restoration'].includes(state.phase))return;for(const p of [...state.pieces].reverse()){if(p.damage>.5&&p.repair<1&&(inside(at,displaced(p))||Math.hypot(at[0]-handle(p)[0],at[1]-handle(p)[1])<.055)){state.pointerHeld=true;state.active={p,start:at,base:p.repair};canvas.setPointerCapture(e.pointerId);break;}}};
canvas.onpointermove=e=>{if(state.phase==='daily'){if(!state.paused)daily.move(e);return;}const a=state.active;if(!a||state.paused)return;if(a.farewell){const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)/r.width;state.closeAmount=clamp(a.base+(a.startX-px)/.22);if(state.closeAmount>=1){state.phase='farewell';state.t=0;state.active=null;state.history.push('player-final-close');}return;}if(a.connection){connectPointerMove(e);return;}if(a.restoration){const pt=point(e),isCity=state.restoreStage==='city';const delta=isCity?(pt[1]-a.start[1])/.24:(pt[0]-a.start[0])/-.08;const value=clamp(a.base+delta);if(isCity)state.cityProgress=value;else state.skyProgress=value;if(value>=1){state.active=null;state.history.push(isCity?'district-landed':'sky-restored');window.GameAudio?.play('repair');state.restoreStage=isCity?'sky':'complete';state.t=0;}return;}const v=a.p.vector,pt=point(e),progress=((pt[0]-a.start[0])*v[0]+(pt[1]-a.start[1])*v[1])/(v[0]*v[0]+v[1]*v[1]);const previousRepair=a.p.repair;a.p.repair=clamp(a.base+progress,0,state.phase==='exchange'&&state.scene===2&&state.pieces.some(p=>p!==a.p&&p.repair===1)?.65:1);if(state.phase==='exchange'&&Math.abs(a.p.repair-previousRepair)>.002)state.lastRepairAt=state.elapsed;if(a.p.repair>.24&&!state.counter&&state.phase==='exchange'){
state.counter=true;const other=state.pieces.find(p=>p!==a.p&&p.repair<1);
if(other){state.queuedCounter=other;state.lockUntil=Math.max(state.lockUntil,state.t+2.9);state.history.push('counter-request-'+other.id);}
}if(a.p.repair===1){if(state.scene===0&&!state.firstFixed)state.firstFixed=a.p.id;state.history.push('fixed-'+a.p.id);burst(a.p,12);state.active=null;}};
canvas.onpointerup=()=>{if(state.phase==='daily'){daily.up();return;}if(state.active?.probe&&state.connectProgress>=1){state.connectStage='contact';state.t=0;state.history.push('boundary-probed-and-released');}state.active=null;state.pointerHeld=false;};canvas.onpointercancel=()=>{daily.cancel();state.active=null;state.pointerHeld=false;};
async function playSegment(name,start,end,rate=1){Object.values(vids).forEach(v=>v.pause());if(name==='loss'&&start>0)name='loss_hold';else if(name==='attack'&&start>0)name='attack_react';state.media=name;if(name==='release_hold'){state.idleStart=state.elapsed;return;}const v=vids[name];if(!v)return;state.segment=[0,v.duration];v.currentTime=0;v.playbackRate=rate;v.loop=name.endsWith('_hold');await v.play();}
let dialogueIndex=0;
const dialogueLines=typeof G05_DIALOGUE==='undefined'?[]:G05_DIALOGUE;
let typingTimer=null,typingFull="",typingCount=0;
function finishTyping(){clearTimeout(typingTimer);typingCount=typingFull.length;document.querySelector("#dialogue .line").textContent=typingFull;document.querySelector("#dialogue .advance").textContent="▾";}
function typeNext(){if(typingCount>=typingFull.length){finishTyping();return;}const ch=typingFull[typingCount++];document.querySelector("#dialogue .line").textContent=typingFull.slice(0,typingCount);typingTimer=setTimeout(typeNext,/[，。？！……]/.test(ch)?180:38);}
function showDialogue(){daily.preload().catch(()=>{});clearTimeout(typingTimer);const line=dialogueLines[dialogueIndex];if(!line)return;document.querySelector('#dialogue').dataset.speaker=line.speaker==='男主'?'him':'you';document.querySelector('#dialogue .speaker').textContent=(line.speaker==='男主'?'他':line.speaker)+'：';typingFull=line.text;typingCount=0;document.querySelector('#dialogue .line').textContent='';document.querySelector('#dialogue .line').style.minHeight=(Math.ceil(line.text.length/19)*1.85)+'em';typingTimer=setTimeout(typeNext,180);document.querySelector('#dialogue .advance').textContent='▾';document.querySelector('#dialogue').dataset.line=String(dialogueIndex+1);document.querySelector('#dialogue').scrollTop=0;}
function advanceDialogue(){if(state.phase!=='dialogue'||state.paused)return;if(typingCount<typingFull.length){finishTyping();return;}if(dialogueIndex===57&&!state.restoreComplete){beginRestoration();return;}if(dialogueIndex===63&&!state.costObserved){document.querySelector('#dialogue').hidden=true;state.phase='cost-reveal';state.costRevealAt=state.elapsed;state.t=0;state.active=null;state.history.push('cost-acceleration-start');return;}const gate={59:0,62:1,69:2}[dialogueIndex];if(gate!==undefined&&!state.attemptsDone?.[gate]){beginConnection(gate);return;}if(dialogueIndex+1<dialogueLines.length){dialogueIndex++;showDialogue();}else{state.phase='farewell';state.t=0;state.farewellStart=state.bodyFade||0;state.active=null;state.history.push('last-line-hold-then-dissolve');}}
document.querySelector('#dialogue').onclick=advanceDialogue;
document.querySelector('#dialogue').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();advanceDialogue();}};

const connectionSites=[
 {at:[.75,.86],delta:[-.28,-.42],zoom:1,focus:[.5,.5],resume:60},
 {at:[.39,.47],delta:[.34,.27],zoom:1,focus:[.5,.5],resume:63},
 {at:[.615,.46],delta:[0,0],zoom:1,focus:[.5,.5],resume:70}
];
function beginConnection(n){
 clearTimeout(typingTimer);document.querySelector('#dialogue').hidden=true;
 state.phase='connection';state.probeT=.5;state.probeMin=.5;state.probeMax=.5;state.probeGlow=0;state.attempt=n;if(n===2){connectionSites[2].zoom=1;connectionSites[2].focus=[.5,.5];}state.connectProgress=0;state.connectVisual=0;state.connectStage='approach';state.t=0;state.active=null;state.pointerHeld=false;
 state.pendingReaction=null;state.queuedCounter=null;state.history.push('connection-attempt-'+(n+1));
}
function connectionContactTime(){return state.attempt===0?5.2:state.attempt===1?5.5:1.6;}
function updateConnection(dt){
 state.connectVisual+=(state.connectProgress-state.connectVisual)*Math.min(1,dt*5);if(state.attempt===2){state.probeGlow+=((state.active?.probe?1:0)-state.probeGlow)*Math.min(1,dt*6);}
 if(state.connectStage==='approach'&&state.t>1.1){state.connectStage='ready';state.t=0;}

 if(state.connectStage==='contact'&&state.t>connectionContactTime()){
  state.attemptsDone=state.attemptsDone||[];state.attemptsDone[state.attempt]=true;
  state.phase='dialogue';state.t=0;dialogueIndex=connectionSites[state.attempt].resume;showDialogue();document.querySelector('#dialogue').hidden=false;
  state.history.push('connection-unpassable-'+(state.attempt+1));
 }
}
function connectPointerDown(e){
 if(state.connectStage!=='ready')return;
 const pt=point(e);if(state.attempt===2){const hit=nearestBoundary(pt);if(hit.distance>.045)return;state.probeT=hit.t;state.probeMin=hit.t;state.probeMax=hit.t;state.active={connection:true,probe:true};canvas.setPointerCapture(e.pointerId);return;}const q=connectionSites[state.attempt],h=[q.at[0]+q.delta[0]*state.connectProgress,q.at[1]+q.delta[1]*state.connectProgress];
 if(Math.hypot(pt[0]-h[0],pt[1]-h[1])>.13)return;
 state.active={connection:true,start:pt,base:state.connectProgress};canvas.setPointerCapture(e.pointerId);
}
function connectPointerMove(e){
 const a=state.active,q=connectionSites[state.attempt],pt=point(e),v=q.delta;if(a.probe){const hit=nearestBoundary(pt);if(hit.distance>.075)return;state.probeT=hit.t;state.probeMin=Math.min(state.probeMin,hit.t);state.probeMax=Math.max(state.probeMax,hit.t);state.connectProgress=clamp((state.probeMax-state.probeMin)/.22);return;}
 state.connectProgress=clamp(a.base+((pt[0]-a.start[0])*v[0]+(pt[1]-a.start[1])*v[1])/(v[0]*v[0]+v[1]*v[1]));
 if(state.connectProgress>=.985){state.connectProgress=1;state.active=null;state.connectStage='contact';state.t=0;}
}
const connectionRoad=document.createElement('canvas');connectionRoad.width=W;connectionRoad.height=H;const roadContext=connectionRoad.getContext('2d');
function roadCross(t){const x=.70-.48*t,y=.67-.34*t,width=.19-.10*t;return [[x-width,y],[x+width,y]];}
function drawReachingRoad(progress,fade){
 if(progress<=.005)return;
 roadContext.clearRect(0,0,W,H);roadContext.drawImage(imgs.connectionRoad,0,0,W,H);
 roadContext.globalCompositeOperation='destination-in';
 const front=.68-.40*progress,g=roadContext.createLinearGradient(0,(front-.025)*H,0,(front+.055)*H);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'white');roadContext.fillStyle=g;roadContext.fillRect(0,0,W,H);
 if(fade>0){const f=roadContext.createLinearGradient(0,H*.32,0,H*.73);f.addColorStop(0,'rgba(255,255,255,'+(1-fade)+')');f.addColorStop(.65,'rgba(255,255,255,'+(1-fade*.85)+')');f.addColorStop(1,'white');roadContext.fillStyle=f;roadContext.fillRect(0,0,W,H);}
 roadContext.globalCompositeOperation='source-over';ctx.drawImage(connectionRoad,0,0);
}
function boundaryPoint(t){const a=[[0,.84],[.20,.70],[.38,.57],[.55,.49],[.68,.43],[.75,.36],[.79,.26],[.82,.15]],f=clamp(t)*7,i=Math.min(6,Math.floor(f)),q=f-i;return [a[i][0]+(a[i+1][0]-a[i][0])*q,a[i][1]+(a[i+1][1]-a[i][1])*q];}
function nearestBoundary(pt){let best={distance:Infinity,t:0};for(let i=0;i<=160;i++){const t=i/160,b=boundaryPoint(t),d=Math.hypot(pt[0]-b[0],(pt[1]-b[1])*H/W);if(d<best.distance)best={distance:d,t};}return best;}
function drawProbe(){
 const strength=state.probeGlow||0;if(strength<.005)return;const b=boundaryPoint(state.probeT),x=b[0]*W,y=b[1]*H;
 ctx.save();ctx.beginPath();ctx.ellipse(x,y,64,88,-.55,0,Math.PI*2);ctx.clip();
 // Two sides lean locally toward contact, but the membrane remains visible.
 ctx.globalAlpha=.28*strength;ctx.drawImage(imgs.connection,-7*strength,0,W,H);ctx.globalAlpha=1;
 for(let i=0;i<3;i++){const f=(state.elapsed*.7+i/3)%1;ctx.strokeStyle='rgba(192,219,228,'+((1-f)*strength*.48)+')';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(x,y,10+f*45,16+f*67,-.55,0,Math.PI*2);ctx.stroke();}
 ctx.restore();ctx.save();ctx.strokeStyle='rgba(205,230,237,'+(strength*.65)+')';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=20;i++){const t=clamp(state.probeT-.07+i*.007),v=boundaryPoint(t);i?ctx.lineTo(v[0]*W,v[1]*H):ctx.moveTo(v[0]*W,v[1]*H);}ctx.stroke();ctx.restore();
}
function drawBoundaryCurrent(strength,scan=-1){
 ctx.save();ctx.lineWidth=1.4;ctx.strokeStyle='rgba(196,226,237,'+(strength*.48)+')';
 for(let lane=0;lane<3;lane++){ctx.beginPath();for(let j=0;j<=70;j++){const t=j/70,[x,y]=boundaryPoint(t);const xx=x+Math.sin(t*20-state.elapsed*2+lane)*.006*strength+lane*.004;j?ctx.lineTo(xx*W,y*H):ctx.moveTo(xx*W,y*H);}ctx.stroke();}
 if(scan>=0){for(let i=0;i<36;i++){const t=clamp(scan-i*.009),[x,y]=boundaryPoint(t);ctx.globalAlpha=(1-i/36)*.85;ctx.shadowColor='#b9dce5';ctx.shadowBlur=13;ctx.fillStyle='#d9edf3';ctx.beginPath();ctx.arc(x*W,y*H,i<3?3:1.5,0,7);ctx.fill();}}
 ctx.restore();
}
function drawReverseRoad(progress,fade){
 if(progress<=.005)return;
 roadContext.clearRect(0,0,W,H);roadContext.drawImage(imgs.connectionReverse,0,0,W,H);
 roadContext.globalCompositeOperation='destination-in';
 const front=.45+.36*progress,g=roadContext.createLinearGradient(0,(front-.055)*H,0,(front+.025)*H);g.addColorStop(0,'white');g.addColorStop(1,'rgba(255,255,255,0)');roadContext.fillStyle=g;roadContext.fillRect(0,0,W,H);
 if(fade>0){const f=roadContext.createLinearGradient(0,H*.45,0,H*.77);f.addColorStop(0,'white');f.addColorStop(.55,'rgba(255,255,255,'+(1-fade*.85)+')');f.addColorStop(1,'rgba(255,255,255,'+(1-fade)+')');roadContext.fillStyle=f;roadContext.fillRect(0,0,W,H);}
 roadContext.globalCompositeOperation='source-over';ctx.drawImage(connectionRoad,0,0);
}
function drawConnection(){
 const q=connectionSites[state.attempt],p=state.connectVisual||0,contact=state.connectStage==='contact';
 ctx.save();ctx.translate(-state.focus[0]*W*(state.zoom-1),-state.focus[1]*H*(state.zoom-1));ctx.scale(state.zoom,state.zoom);ctx.drawImage(imgs.connection,0,0,W,H);
 const fade=contact&&state.attempt===0?clamp((state.t-1.2)/2.8):state.attempt===1?.20:0;
 if(state.attempt===0)drawReachingRoad(p,fade);
 if(state.attempt===1)drawReverseRoad(p,contact?clamp((state.t-1.2)/2.8):0);
 const idle=dialogueActorFrames[Math.floor(state.elapsed*12)%Math.max(1,dialogueActorFrames.length)]||imgs.actorClose;
 if(idle){ctx.save();ctx.fillStyle='rgba(10,17,27,.26)';ctx.beginPath();ctx.ellipse(W*.285,H*.356,W*.071,H*.008,0,0,7);ctx.fill();drawAshActor(ctx,idle,W*.02,-H*.24,W*.60,H*.60);ctx.restore();}
 if(state.attempt===2)drawProbe();else drawBoundaryCurrent(Math.min(.9,p));
 if(contact&&state.attempt===0){for(let i=0;i<85;i++){const f=clamp((state.t-1-i*.013)/2.8),t=.32+(i%18)/27,c=roadCross(t);ctx.globalAlpha=Math.sin(f*Math.PI)*.65;ctx.fillStyle='#c8dfe7';ctx.fillRect((c[0][0]+(c[1][0]-c[0][0])*((i*17%37)/37))*W+f*17,(c[0][1]+c[1][1])/2*H-f*55,1.6,2.4);}ctx.globalAlpha=1;}
 ctx.restore();
 if(state.connectStage==='ready'){
  // Screen-space cue stays attached to the advancing route, not a tiny stone.
  const probe=state.attempt===2?boundaryPoint(state.probeT):null;const ax=(probe?probe[0]:q.at[0]+q.delta[0]*state.connectProgress)*W,ay=(probe?probe[1]:q.at[1]+q.delta[1]*state.connectProgress)*H,f=(state.elapsed%1.8)/1.8;
  ctx.save();ctx.strokeStyle='rgba(205,233,241,.8)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(ax,ay,19+Math.sin(state.elapsed*3)*2,0,7);ctx.stroke();ctx.shadowColor='#b9e3ed';ctx.shadowBlur=20;ctx.fillStyle='#effcff';ctx.beginPath();ctx.arc(ax,ay,5,0,7);ctx.fill();ctx.globalAlpha=Math.sin(f*Math.PI);ctx.beginPath();const hint=probe?boundaryPoint(clamp(state.probeT+f*.08)):null;ctx.arc(hint?hint[0]*W:ax+q.delta[0]*W*f*.20,hint?hint[1]*H:ay+q.delta[1]*H*f*.20,3.5,0,7);ctx.fill();ctx.restore();
 }
 if(state.connectStage==='approach'){ctx.fillStyle='rgba(15,27,39,'+(1-clamp(state.t/1.1))+')';ctx.fillRect(0,0,W,H);}
 canvas.dataset.state=JSON.stringify({phase:state.phase,attempt:state.attempt,connectStage:state.connectStage,connectProgress:state.connectProgress,connectVisual:p,history:state.history.slice(-8)});
}

function beginRestoration(){clearTimeout(typingTimer);document.querySelector('#dialogue').hidden=true;state.phase='restoration';state.t=0;state.restoreStarted=true;state.restoreStage='edge';state.cityProgress=0;state.skyProgress=0;state.active=null;state.pointerHeld=false;state.pendingReaction=null;state.queuedCounter=null;state.cameraBeat=null;state.history.push('G06-restoration');playSegment('release_hold',0,0,1);}
function restorationHandle(){return state.restoreStage==='city'?[.51,.30+.24*state.cityProgress]:[.15-.015*state.skyProgress,.065];}
function drawRestorationCue(){if(state.restoreStage==='edge'){state.pieces.forEach(cue);return;}if(!['city','sky'].includes(state.restoreStage))return;const h=restorationHandle(),x=h[0]*W,y=h[1]*H,f=(state.elapsed%1.8)/1.8;ctx.save();ctx.strokeStyle='rgba(226,241,250,.6)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,18+Math.sin(state.elapsed*3)*2,0,7);ctx.stroke();ctx.shadowColor='#c3eaff';ctx.shadowBlur=18;ctx.fillStyle='#eefbff';ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();ctx.globalAlpha=Math.sin(f*Math.PI);ctx.beginPath();ctx.arc(x+(state.restoreStage==='sky'?-35*f:0),y+(state.restoreStage==='city'?65*f:0),3.5,0,7);ctx.fill();ctx.restore();}
function next(){const travel=state.scene===0?(state.firstFixed==='left-wall'?'travel_corner_left':'travel_corner'):'travel_district';if(state.scene<2&&vids[travel]){state.departureMedia=state.media;state.travelTarget=state.scene+1;state.phase='travelVideo';state.t=0;state.active=null;particles.length=0;state.history.push(state.scene===0?'turn-corner':'look-up-district');state.history.push('route-'+travel);playSegment(travel,0,0,state.scene===0?1.15:1.25);return;}if(state.scene<2){state.phase='travel';state.t=0;state.active=null;state.travelSwitched=false;state.history.push('near-resolved');}else{state.phase='cost';state.t=0;state.active=null;state.costPiece=state.pieces.find(p=>p.repair<1);state.costPiece.withdrawStart=state.costPiece.repair;state.pendingReaction=null;state.queuedCounter=null;state.loss=true;if(!vids.loss){state.phase='media-pending';document.querySelector('#error').textContent='缺损镜头仍在制作，当前未接完';return;}playSegment('loss',0,vids.loss.duration,1.15);state.history.push('cost-once');}}
function update(dt){state.t+=dt;state.elapsed+=dt;if((state.phase==='cost-reveal'&&state.t>=1&&state.t-dt<1)||(state.phase==='farewell'&&state.t>=3&&state.t-dt<3))window.GameAudio?.play('dissolve');if(state.phase==='daily'){daily.update(dt);return;}if(state.phase==='ended'&&state.t>2){state.phase='daily';state.t=0;Object.values(vids).forEach(v=>v.pause());state.history.push('G08-daily-life');return;}
 let fadeTarget=state.costObserved?(.06+.59*clamp((dialogueIndex-64)/32)):state.phase==='cost-reveal'?.06*costAdvance():0;
 if(state.phase==='farewell'){const f=clamp((state.t-3)/5);fadeTarget=(state.farewellStart||0)+(1-(state.farewellStart||0))*f*f*(3-2*f);if(state.t>3)document.querySelector('#dialogue').hidden=true;}
 const previousFade=state.bodyFade||0;state.bodyFade=Math.max(previousFade,Math.min(fadeTarget,previousFade+Math.min(dt*.15,(fadeTarget-previousFade)*dt*1.1)));
 if(state.phase==='farewell'&&state.t>=9)state.bodyFade=1;
 for(const q of bodyAsh)if(q.at===null&&state.bodyFade>=q.threshold)q.at=state.elapsed;
if(state.phase==='connection')updateConnection(dt);if(state.phase==='cost-reveal'&&state.t>=8){state.costObserved=true;state.phase='dialogue';state.t=0;dialogueIndex=64;showDialogue();document.querySelector('#dialogue').hidden=false;state.history.push('cost-acceleration-seen');}if(state.phase==='farewell'&&state.t>13.5){state.phase='ended';state.t=0;state.history.push('empty-platform-connection-closed');}
if(state.phase==='restoration'){
 if(state.restoreStage==='edge'&&state.pieces.every(p=>p.repair===1)){state.restoreStage='turn';state.active=null;state.t=0;state.history.push('district-edge-joined');}
 if(state.restoreStage==='turn'&&state.t>.6&&!state.g06View){state.g06View=true;state.history.push('G06-side-camera');}if(state.restoreStage==='turn'&&state.t>1.2){state.restoreStage='city';state.t=0;}if(state.restoreStage==='complete'&&state.t>.8){state.restoreComplete=true;state.phase='dialogue';dialogueIndex=58;showDialogue();document.querySelector('#dialogue').hidden=false;state.history.push('G06-complete');}
}

// Completed locations cannot consume queued attacks or counterforce.
if(state.phase==='exchange'&&state.scene<2&&state.pieces.length&&state.pieces.every(p=>p.repair===1)){
 state.queuedCounter=null;state.pendingReaction=null;state.active=null;state.lockUntil=0;state.cameraBeat=null;
 state.phase='resolved';state.t=0;Object.values(vids).forEach(v=>v.pause());state.history.push('location-complete');
}
if(state.queuedCounter&&state.queuedCounter.repair===1)state.queuedCounter=null;
if(state.phase==='resolved'&&state.t>=.3){next();}
if(state.phase==='arrival'&&state.t>=.55){state.phase='exchange';state.t=0;playSegment(state.scene===2?'redirect_upper':'attack',0,6,1.2);state.history.push('new-location-attack');}
if(state.phase==='entry'&&state.t>=1.15){state.phase='exchange';state.t=0;setPieces(0);playSegment('attack',0,6,1.2);}const close=['cost','withdraw','settle','dialogue','farewell-wait','farewell'].includes(state.phase);const beat=state.cameraBeat?clamp((state.elapsed-state.cameraBeat.at)/1.1):1;const talking=['dialogue','farewell-wait','farewell','cost-reveal'].includes(state.phase);const targetZoom=state.phase==='connection'?connectionSites[state.attempt].zoom:state.phase==='cost-reveal'?2.12:talking?1.85:close?1.1:1;state.zoom+=(targetZoom-state.zoom)*Math.min(1,dt*(talking?2:9));const targetFocus=state.phase==='connection'?connectionSites[state.attempt].focus:talking?[.06,.68]:close?[.3,.60]:state.cameraBeat?.focus||[.5,.5];state.focus=state.focus.map((v,i)=>v+(targetFocus[i]-v)*Math.min(1,dt*(talking?2:6)));if(state.pendingReaction&&state.t>=state.pendingReaction.at){const p=state.pendingReaction.piece;if(p.repair<1){const setback=Math.min(p.repair,.12);p.repair-=setback;if(state.active?.p===p)state.active.base-=setback;if(setback>0)state.history.push('contested-'+p.id);p.impulseAt=state.elapsed;p.boostTarget=Math.min(1.65,(p.boostTarget||1)+.22);burst(p,32);state.cameraBeat={at:state.elapsed,focus:p.poly.reduce((a,b)=>[a[0]+b[0]/4,a[1]+b[1]/4],[0,0])};}else{burst(p,18);p.resistedAt=state.elapsed;state.history.push('resisted-'+p.id);}state.pendingReaction=null;}if(state.phase==='exchange'){for(const p of state.pieces){p.boost=(p.boost||1)+((p.boostTarget||1)-(p.boost||1))*Math.min(1,dt*7);const old=p.damage;p.damage=clamp((state.t-p.start)/(p.airborne||p.videoRoad||p.videoWall?1.25:.42));if(old===0&&p.damage>0)burst(p);}if(state.scene===2&&state.pieces.some(p=>p.repair===1)&&state.pieces.some(p=>p.repair>=.55&&p.repair<1)&&!state.pendingReaction&&!state.queuedCounter&&state.media==='attack_hold'){next();}else if(state.pieces.every(p=>p.repair===1)&&state.t>=(state.lockUntil||0)&&!state.queuedCounter&&!state.pendingReaction)next();}else if(state.phase==='travelVideo'&&vids[state.media].ended){state.scene=state.travelTarget;state.t=0;setPieces(state.scene);state.phase='arrival';playSegment('attack_hold',0,0,1);state.history.push('arrive-location');}else if(state.phase==='travel'){if(state.t>=.34&&!state.travelSwitched){state.travelSwitched=true;state.scene+=1;setPieces(state.scene);particles.length=0;}if(state.t>=.68){state.t=0;state.phase='arrival';playSegment('attack_hold',0,0,1);}}else if(state.phase==='cost'&&vids.loss.ended){state.phase='withdraw';state.t=0;state.costPiece.damage=1;playSegment('loss',Math.max(0,vids.loss.duration-.8),vids.loss.duration,1);}else if(state.phase==='withdraw'&&state.t>=1.1&&!state.pointerHeld){state.phase='settle';state.history.push('ceasefire');playSegment('release',0,0,1.2);}
if(state.phase==='settle'&&vids.release.ended){state.phase='dialogue';dialogueIndex=0;showDialogue();document.querySelector('#dialogue').hidden=false;playSegment('release_hold',0,0,1);}
if(state.phase==='cost'&&state.t>=.9&&!state.costPiece.finalImpulse){const p=state.costPiece;p.finalImpulse=true;p.impulseAt=state.elapsed;p.boost=(p.boost||1)+.3;burst(p,45);state.history.push('final-effort-'+p.id);}
if(state.phase==='exchange'&&state.queuedCounter&&state.media==='attack_hold'){
const p=state.queuedCounter;state.queuedCounter=null;
const left=['left-wall','sideway'].includes(p.id);playSegment(p.airborne?'redirect_upper':left?'redirect_left':'attack',p.airborne||left?0:2.2,4.1,1.35);state.pendingReaction={piece:p,at:state.t+(p.airborne?1.65:.9)};state.lockUntil=state.t+2.9;state.nextPressure=state.t+6.5;state.history.push('counter-to-'+p.id);}
if(state.phase==='exchange'&&state.active&&state.elapsed-state.lastRepairAt<.6&&state.t>=state.nextPressure&&!state.pendingReaction&&state.media==='attack_hold'){
const candidates=state.pieces.filter(p=>p.repair<1);const held=state.active?.p;const p=held&&held.repair<1?held:candidates[state.pressureIndex++%Math.max(1,candidates.length)];
state.nextPressure=state.t+6.5;if(p){state.pendingReaction={piece:p,at:state.t+(p.airborne?1.65:.9)};state.lockUntil=Math.max(state.lockUntil,state.t+2.4);playSegment(p.airborne?'redirect_upper':['left-wall','sideway'].includes(p.id)?'redirect_left':'attack', p.airborne||['left-wall','sideway'].includes(p.id)?0:2.2,4.1,1.35);state.history.push('pressure-'+p.id);}}
const v=vids[state.media];if(v&&state.phase!=='resolved'&&state.phase!=='arrival'&&state.phase!=='travelVideo'&&state.phase!=='cost'&&state.phase!=='settle'&&state.phase!=='dialogue'&&v.ended&&!state.media.endsWith('_hold'))playSegment(state.media.startsWith('loss')?'loss_hold':'attack_hold',0,0,1);
for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;if(p.life<=0)particles.splice(i,1);}}
function draw(){if(state.phase==='daily'){daily.draw();return;}if(state.phase==='connection'){drawConnection();return;}if(state.phase==='travelVideo'){ctx.drawImage(vids[state.media],0,0,W,H);if(state.t<.5){ctx.save();const exit=clamp(state.t/.5);ctx.globalAlpha=1-exit*exit*(3-2*exit);ctx.translate(-exit*24,0);drawRealm();ctx.restore();}canvas.dataset.state=JSON.stringify({phase:state.phase,scene:state.scene,elapsed:state.elapsed,media:state.media,mediaTime:vids[state.media].currentTime});return;}ctx.save();if(state.phase==='travel'){const turn=Math.sin(Math.PI*clamp(state.t/.68));ctx.translate(W/2,H/2);ctx.scale(1+turn*.09,1+turn*.09);ctx.translate(-W/2+(state.travelSwitched?1:-1)*turn*22,-H/2);ctx.filter='blur('+(turn*7).toFixed(2)+'px)';}ctx.translate(-state.focus[0]*W*(state.zoom-1),-state.focus[1]*H*(state.zoom-1));ctx.scale(state.zoom,state.zoom);background();for(const p of state.pieces)if(p.airborne||p.videoRoad)drawPiece(p);drawRealm();for(const p of state.pieces)if(!p.airborne&&!p.videoRoad)drawPiece(p);for(const p of particles){ctx.globalAlpha=clamp(p.life);ctx.fillStyle=p.size>3?'#707580':'#a3a5a9';ctx.fillRect(p.x,p.y,p.size,p.size*.75);}ctx.globalAlpha=1;if(state.phase==='exchange')state.pieces.forEach(cue);if(state.phase==='restoration')drawRestorationCue();ctx.restore();if(state.phase==='farewell-wait'){const x=W*(.91-.22*state.closeAmount),y=H*.77;ctx.save();ctx.shadowColor='#cae7ee';ctx.shadowBlur=22;ctx.fillStyle='#ebf8fb';ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();ctx.strokeStyle='rgba(203,228,235,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,17+Math.sin(state.elapsed*2)*2,0,7);ctx.stroke();const f=(state.elapsed%2)/2;ctx.globalAlpha=Math.sin(f*Math.PI);ctx.beginPath();ctx.arc(x-50*f,y,3,0,7);ctx.fill();ctx.restore();}if(state.phase==='entry'){ctx.save();ctx.globalAlpha=1-clamp((state.t-.35)/.8);ctx.drawImage(imgs.g04,0,0,W,H);ctx.restore();}if(state.phase==='restoration'&&state.restoreStage==='turn'){ctx.save();ctx.fillStyle='#182330';ctx.globalAlpha=Math.sin(Math.PI*clamp(state.t/1.2));ctx.fillRect(0,0,W,H);ctx.restore();}if(state.phase==='ended')daily.bridge(clamp(state.t/2));canvas.dataset.state=JSON.stringify({phase:state.phase,bodyFade:state.bodyFade,g06View:state.g06View,restoreStage:state.restoreStage,cityProgress:state.cityProgress,skyProgress:state.skyProgress,elapsed:state.elapsed,scene:state.scene,pieces:state.pieces.map(p=>({id:p.id,damage:p.damage,repair:p.repair})),media:state.media,mediaTime:vids[state.media]?.currentTime,idleFrame:state.media==='release_hold'?Math.floor(Math.max(0,state.elapsed-(state.idleStart||0))*12)%Math.max(1,dialogueActorFrames.length):null,mediaPaused:vids[state.media]?.paused,mediaReady:vids[state.media]?.readyState,mediaEnded:vids[state.media]?.ended,mediaError:vids[state.media]?.error?.code,loss:state.loss,history:state.history.slice(-32)});}
let last=performance.now();let frameSamples=[];function frame(now){frameSamples.push(now-last);if(frameSamples.length>120)frameSamples.shift();canvas.dataset.frameMs=String((frameSamples.reduce((a,b)=>a+b,0)/frameSamples.length).toFixed(1));const dt=Math.min(.04,(now-last)/1000);last=now;if(!state.paused&&state.phase!=='loading'){update(dt);draw();}requestAnimationFrame(frame);}
document.querySelector('#pause').onclick=()=>{state.paused=!state.paused;window.GameAudio?.pause('finale',state.paused);daily.pause(state.paused);state.active=null;state.pointerHeld=false;if(state.paused)Object.values(vids).forEach(v=>v.pause());else vids[state.media]?.play();document.querySelector('#pause').textContent=state.paused?'▶':'Ⅱ';};
document.querySelector('#restart').onclick=()=>{window.GameAudio?.stop();window.GameAudio?.pause('finale',false);location.reload();};
document.querySelector('#start').onclick=async()=>{try{document.querySelector('#start').disabled=true;if(new URLSearchParams(location.search).get('from')==='g08-only'){await daily.ready;document.querySelector('#start').hidden=true;state.phase='daily';requestAnimationFrame(frame);return;}[imgs.street,imgs.realm,imgs.corner,imgs.rock,imgs.g04,imgs.district]=await Promise.all([image('reality_street.webp'),image('realm_bedrock_v2.webp'),image('reality_corner.webp'),image('fracture_rock.webp'),image('references/g04_realm_v4_end.webp'),image('reality_district.webp')]);[vids.attack,vids.loss,vids.loss_hold,vids.attack_hold,vids.attack_react,vids.redirect_left,vids.release,vids.release_hold,vids.redirect_upper,vids.travel_corner,vids.travel_district,vids.travel_corner_left]=await Promise.all([video('realm_v2/realm_attack.mp4'),video('realm_v2/realm_loss.mp4'),video('realm_v2/realm_hold_smooth.mp4'),video('realm_v2/attack_breath_subtle.mp4'),video('realm_v2/attack_react.mp4'),video('realm_v2/realm_redirect_left.mp4'),video('realm_v2/realm_release.mp4'),video('realm_v2/release_breath_briefblink.mp4'),video('realm_v2/realm_redirect_upper.mp4'),video('travel_corner.mp4'),video('travel_district.mp4'),video('travel_corner_left.mp4')]);descentFrames=await Promise.all(Array.from({length:96},(_,i)=>image('g06_side_frames_v2/'+String(i).padStart(3,'0')+'.webp')));imgs.moonRestored=await image('g06_moon_restored.webp');imgs.connection=await image('g07_boundary.webp');imgs.connectionRoad=await image('g07_road_reach.webp');imgs.connectionReverse=await image('g07_reverse_reach.webp');imgs.actorClose=await image('dialogue_actor_v3/identity.png');prepareAsh();dialogueActorFrames=await Promise.all(Array.from({length:72},(_,i)=>image('dialogue_actor_v3/idle_smooth/'+String(i).padStart(3,'0')+'.webp')));districtFrames['district-west']=await Promise.all(Array.from({length:48},(_,i)=>image('district_west_frames/'+String(i+1).padStart(3,'0')+'.webp')));districtFrames['district-east']=await Promise.all(Array.from({length:48},(_,i)=>image('district_east_frames/'+String(i+1).padStart(3,'0')+'.webp')));districtFrames['near-road']=await Promise.all(Array.from({length:24},(_,i)=>image('street_near_frames/'+String(i+1).padStart(3,'0')+'.webp')));districtFrames['left-wall']=await Promise.all(Array.from({length:48},(_,i)=>image('street_wall_frames/'+String(i+1).padStart(3,'0')+'.webp')));districtFrames['junction']=await Promise.all(Array.from({length:30},(_,i)=>image('corner_junction_frames/'+String(i+1).padStart(3,'0')+'.webp')));districtFrames['sideway']=await Promise.all(Array.from({length:48},(_,i)=>image('corner_sideway_frames/'+String(i+1).padStart(3,'0')+'.webp')));window.parent.postMessage('story-ready',location.origin);state.phase='entry';state.t=0;state.pieces=[];state.media='attack';document.querySelector('#start').hidden=true;if(['dialogue','g06','g07'].includes(new URLSearchParams(location.search).get('from'))){state.scene=2;setPieces(2);state.pieces.forEach((p,i)=>{p.damage=1;p.repair=i===0?1:.6});state.loss=true;state.phase='dialogue';state.zoom=1.85;state.focus=[.06,.68];dialogueIndex=new URLSearchParams(location.search).get('from')==='g06'?57:new URLSearchParams(location.search).get('from')==='g07'?59:0;if(new URLSearchParams(location.search).get('from')==='g07'){state.restoreComplete=true;state.g06View=true;state.cityProgress=1;state.skyProgress=1;state.pieces.forEach(p=>p.repair=1);const previewAttempt=Number(new URLSearchParams(location.search).get('attempt')||1);if(previewAttempt===4){dialogueIndex=63;state.attemptsDone=[true,true];state.costObserved=false;}if(previewAttempt===2||previewAttempt===3){dialogueIndex=previewAttempt===2?62:69;state.attemptsDone=previewAttempt===2?[true]:[true,true];state.costObserved=previewAttempt===3;}}const reviewLine=Number(new URLSearchParams(location.search).get('line'));if(reviewLine>=71&&reviewLine<=97){dialogueIndex=reviewLine-1;state.bodyFade=.06+.59*clamp((dialogueIndex-64)/32);state.attemptsDone=[true,true,true];state.costObserved=true;}showDialogue();document.querySelector('#dialogue').hidden=false;await playSegment('release_hold',0,0,1);}requestAnimationFrame(frame);}catch(e){document.querySelector('#error').textContent='未启动：'+e.message;document.querySelector('#start').disabled=false;}};
if(['g04','dialogue','g06','g07','g08','g08-only'].includes(new URLSearchParams(location.search).get('from')))document.querySelector('#start').onclick();
})();








