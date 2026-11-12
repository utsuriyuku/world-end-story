/* G08: first-person video epilogue. No repeated attack or stock walking poses. */
window.createDailyEnding=function(canvas,ctx,W,H){
 const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
 const s={stage:'afterglow',t:0,total:0,started:false,paused:false,held:false,take:0,history:[]},media={};
 let pending=null,loaded=false,loadError=null;function preload(){if(pending)return pending;pending=Promise.all(['afterglow','window','leave','crossing'].map(name=>new Promise((resolve,reject)=>{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.onloadeddata=()=>{media[name]=v;resolve()};v.onerror=()=>reject(Error('G08视频未加载：'+name));v.src='g08_v2/'+(name==='leave'?'promenade_v4':name)+'.mp4?v=20261106clean1';v.load()}))).then(()=>{loaded=true}).catch(e=>{loadError=e;throw e});return pending;}
 const retained=document.createElement('canvas');retained.width=W;retained.height=H;const retainedCtx=retained.getContext('2d');let hasFrame=false;
 function play(name){Object.values(media).forEach(v=>v.pause());const v=media[name];v.currentTime=0;v.play().catch(()=>{});s.clip=name;}
 function enter(stage){s.stage=stage;s.t=0;s.held=false;s.history.push(stage);if(media[stage])play(stage);if(stage==='leave'||stage==='crossing')window.GameAudio?.play('steps');if(stage==='crossing-wait'){window.GameAudio?.stop('steps');Object.values(media).forEach(v=>v.pause());s.clip='crossing';media.crossing.currentTime=0;}}
 function point(e){const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]}
 function down(e){const p=point(e);if(s.stage==='window'&&media.window.currentTime>=2&&p[0]>.32&&p[0]<.53&&p[1]>.69&&p[1]<.87){s.held=true;s.start=p[1];canvas.setPointerCapture(e.pointerId)}else if(s.stage==='corridor-hold'&&Math.hypot((p[0]-.30)/.14,(p[1]-.66)/.11)<1){s.stage='leave';s.t=1;s.walkResumed=true;s.history.push('corridor-resume');window.GameAudio?.play('steps');media.leave.play().catch(()=>{});}else if(s.stage==='crossing-wait'&&p[1]>.55)enter('crossing');}
 function move(e){if(s.held)s.take=clamp((point(e)[1]-s.start)/.12)}
 function up(){if(s.held){s.held=false;window.GameAudio?.play('cloth');enter('take-fade')}}
 function cancel(){s.held=false;s.take=0}
 function pause(on){s.paused=on;if(on)Object.values(media).forEach(v=>v.pause());else if(s.clip&&['afterglow','window','leave','crossing'].includes(s.stage)&&!media[s.clip].ended)media[s.clip].play().catch(()=>{})}
 function update(dt){if(!loaded){preload().catch(()=>{});return;}if(s.paused)return;s.t+=dt;s.total+=dt;if(!s.started){s.started=true;play('afterglow')}
 if(s.stage==='afterglow'&&media.afterglow.ended)enter('night-fade');
 else if(s.stage==='night-fade'&&s.t>1.5)enter('dawn');
 else if(s.stage==='dawn'&&s.t>2.8)enter('window');
 else if(s.stage==='take-fade'&&s.t>.3)enter('leave');
 else if(s.stage==='leave'&&!s.walkResumed&&media.leave.currentTime>=7.92){media.leave.pause();enter('corridor-hold');}
 else if(s.stage==='leave'&&media.leave.ended)enter('crossing-wait');
 else if(s.stage==='corridor'&&media.corridor.ended)enter('corridor-hold');
 else if(s.stage==='exit'&&media.exit.ended)enter('crossing-wait');
 else if(s.stage==='crossing'&&media.crossing.ended)enter('end');}
 function glow(x,y,arrow=false){ctx.save();ctx.shadowColor='#e5f5ff';ctx.shadowBlur=17;ctx.fillStyle='#f4faff';ctx.beginPath();ctx.arc(x,y,4.5,0,7);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(233,246,255,.7)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,16+Math.sin(s.total*2)*2,0,7);ctx.stroke();if(arrow){ctx.beginPath();ctx.moveTo(x-5,y+27);ctx.lineTo(x+4,y+32);ctx.lineTo(x-5,y+37);ctx.stroke()}ctx.restore()}
 function draw(){if(!loaded){ctx.fillStyle="#eeece5";ctx.fillRect(0,0,W,H);ctx.fillStyle="#66747b";ctx.font="20px sans-serif";ctx.fillText(loadError?"结尾加载失败，请重新打开游戏":"正在接续故事…",W*.15,H*.5);return;}ctx.save();
 const active=media[s.clip];if(active&&active.readyState>=2&&!active.seeking){retainedCtx.drawImage(active,0,0,W,H);hasFrame=true;}
 if(hasFrame)ctx.drawImage(retained,0,0,W,H);else{ctx.fillStyle='#202b33';ctx.fillRect(0,0,W,H);}
 if(s.stage==='take-fade'||(s.stage==='leave'&&s.t<.3)){ctx.fillStyle='#202b33';ctx.globalAlpha=s.stage==='take-fade'?smooth(s.t/.3):1-smooth(s.t/.3);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
 if(s.stage==='night-fade'){ctx.fillStyle='#eeece5';ctx.globalAlpha=smooth(s.t/1.5);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
 if(s.stage==='dawn'){ctx.fillStyle='#eeece5';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(70,80,87,'+Math.sin(Math.PI*clamp(s.t/2.8))+')';ctx.font='25px SimSun,serif';ctx.textAlign='center';ctx.fillText('翌日',W/2,H*.48)}
 if(s.stage==='window'){if(s.t<.7){ctx.fillStyle='#eeece5';ctx.globalAlpha=1-smooth(s.t/.7);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}if(media.window.currentTime>=2)glow(W*.415,H*.78)}
 
 if(s.stage==='corridor-hold'){
 const x=W*.30,y=H*.66,r=34+Math.sin(s.total*2.2)*3;
 ctx.save();const halo=ctx.createRadialGradient(x,y,4,x,y,64);halo.addColorStop(0,'rgba(233,246,255,.85)');halo.addColorStop(.45,'rgba(229,245,255,.35)');halo.addColorStop(1,'rgba(229,245,255,0)');ctx.fillStyle=halo;ctx.fillRect(x-64,y-64,128,128);
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle='rgba(41,57,68,.85)';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#e9f6ff';ctx.lineWidth=3.5;ctx.stroke();ctx.shadowColor='#e5f5ff';ctx.shadowBlur=22;ctx.fillStyle='#f4faff';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 if(s.stage==='crossing-wait')glow(W*.49,H*.86);
 if(s.stage==='crossing'){const duration=Number.isFinite(media.crossing.duration)?media.crossing.duration:8;ctx.fillStyle='#eeece5';ctx.globalAlpha=smooth((media.crossing.currentTime-(duration-3.8))/3.5);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
 if(s.stage==='end'){ctx.fillStyle='#eeece5';ctx.fillRect(0,0,W,H);ctx.globalAlpha=smooth(s.t/1.8);ctx.fillStyle='#57676d';ctx.textAlign='center';ctx.font='22px SimSun,serif';ctx.fillText('我们只在世界毁灭时相见',W/2,H*.46);ctx.font='24px SimSun,serif';ctx.fillText('终',W/2,H*.54);}
 ctx.restore();canvas.dataset.state=JSON.stringify({phase:'daily',stage:s.stage,t:s.t,clip:s.clip,videoTime:media[s.clip]?.currentTime,videoEnded:media[s.clip]?.ended,history:s.history});}
 function bridge(alpha){ctx.save();ctx.globalAlpha=smooth(alpha);if(media.afterglow?.readyState>=2)ctx.drawImage(media.afterglow,0,0,W,H);ctx.restore()}
 return{get ready(){return preload()},preload,state:s,down,move,up,cancel,pause,update,draw,bridge};
};
