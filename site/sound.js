/* Sparse event-driven sound. No music, per-frame effects or dialogue click beeps. */
(function(){
'use strict';
if(window.parent!==window && window.parent.GameAudio){
 window.GameAudio=window.parent.GameAudio;
 document.addEventListener('pointerdown',()=>window.GameAudio.unlock(),{capture:true});
 document.addEventListener('keydown',()=>window.GameAudio.unlock(),{capture:true});
 return;
}
const base=new URL('audio/',document.currentScript.src),names=['cup','unlock','coin','repair','break','extinguish','dissolve','paper'];
let ctx=null,master=null,muted=false,epoch=0;const buffers=new Map(),pending=new Map(),active=new Set(),last=new Map(),pauses=new Set();
try{muted=localStorage.getItem('worldend-muted')==='1';}catch(_){}
const levels={cup:.5,unlock:.45,coin:.35,repair:.4,break:.5,extinguish:.28,dissolve:.4,paper:.4};
const cooldown={cup:.3,unlock:.4,coin:.4,repair:.7,break:.65,extinguish:.8,dissolve:2,paper:.3};
const bytes=new Map(names.map(n=>[n,fetch(new URL(n+'.wav',base)).then(r=>{if(!r.ok)throw Error('audio '+r.status);return r.arrayBuffer()}).catch(()=>null)]));
function stop(){epoch++;for(const node of active){try{node.stop()}catch(_){}}active.clear();}
function gain(){if(master)master.gain.setTargetAtTime(muted||pauses.size?0:.55,ctx.currentTime,.025);}
function decode(name){
 if(buffers.has(name))return Promise.resolve(buffers.get(name));
 if(!pending.has(name))pending.set(name,bytes.get(name).then(b=>b&&ctx.decodeAudioData(b.slice(0))).then(b=>{if(b)buffers.set(name,b);return b}).catch(()=>null));
 return pending.get(name);
}
async function unlock(){
 if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=muted||pauses.size?0:.55;master.connect(ctx.destination);names.forEach(decode);}
 if(ctx.state==='suspended')try{await ctx.resume()}catch(_){}
}
async function play(name){
 if(!ctx||ctx.state!=='running'||muted||pauses.size||!names.includes(name))return;
 const now=performance.now(),previous=last.get(name)??-Infinity;if(now-previous<cooldown[name]*1000)return;last.set(name,now);
 const generation=epoch,buffer=await decode(name);
 if(!buffer||muted||pauses.size||epoch!==generation||performance.now()-now>350||active.size>=4)return;
 const node=ctx.createBufferSource(),volume=ctx.createGain();node.buffer=buffer;volume.gain.value=levels[name];node.connect(volume);volume.connect(master);active.add(node);
 node.onended=()=>{active.delete(node);node.disconnect();volume.disconnect()};node.start();
}
function pause(reason,on){if(on){pauses.add(reason);stop();}else pauses.delete(reason);gain();}
const api=window.GameAudio={unlock,play,pause,stop,setMuted(value){muted=!!value;if(muted)stop();gain();try{localStorage.setItem('worldend-muted',muted?'1':'0')}catch(_){}render();},status(){return{muted,paused:pauses.size>0,context:ctx?.state||'locked',loaded:buffers.size,active:active.size}}};
document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
document.addEventListener('visibilitychange',()=>pause('hidden',document.hidden));
window.addEventListener('pagehide',stop);
const button=document.createElement('button');button.id='sound-toggle';button.type='button';button.style.cssText='position:fixed;z-index:20;top:12px;left:max(12px,calc(50% - 28.125vh + 12px));border:0;border-radius:4px;padding:7px 10px;background:#eeece5c9;color:#56676e;font:12px system-ui;cursor:pointer;touch-action:manipulation';
function render(){button.textContent=muted?'声音：关':'声音：开';button.setAttribute('aria-label',muted?'开启音效':'关闭音效');button.setAttribute('aria-pressed',String(!muted));}
button.onclick=()=>api.setMuted(!muted);render();document.body.appendChild(button);
})();
