(()=>{
 let started=false,stop=false;
 const status=window.backgroundPreload={state:'waiting-for-game',done:0,total:0,bytes:0,failed:0};
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===document.getElementById('game').contentWindow&&e.data==='prologue-started')start();});
 window.addEventListener('finale-starting',()=>{stop=true;status.state='foreground';});
 async function start(){if(started)return;started=true;
  if(!('serviceWorker' in navigator)||!window.isSecureContext){status.state='unsupported';return;}
  try{
   const manifest=await fetch('preload-manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
   await navigator.serviceWorker.register('asset-sw.js',{scope:'./',updateViaCache:'none'});
   await navigator.serviceWorker.ready;
   if(!navigator.serviceWorker.controller)await Promise.race([new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),new Promise((_,reject)=>setTimeout(()=>reject(Error('control timeout')),10000))]);
   status.total=manifest.files.length;status.state='downloading';let index=0;
   async function work(){while(!stop&&index<manifest.files.length){const item=manifest.files[index++];try{
    const response=await fetch(item.url,{priority:'low'});if(!response.ok)throw Error(response.status);
    const reader=response.body.getReader();while(!(await reader.read()).done){};
    status.done++;status.bytes+=item.bytes;
   }catch(e){status.failed++;}await new Promise(resolve=>setTimeout(resolve,100));}}
   await Promise.all([work(),work()]);if(!stop)status.state=status.failed?'complete-with-errors':'complete';
  }catch(e){status.state='unavailable';status.error=String(e);}
 }
})();
