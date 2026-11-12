const CACHE='story-assets-__VERSION__';
const allowed=new Set(__FILES__.map(p=>new URL(p,self.registration.scope).href));
const pending=new Map();
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
// Old version caches are retained so an already-open game is not disrupted.
async function full(url){
 const cache=await caches.open(CACHE),hit=await cache.match(url);if(hit)return hit;
 if(!pending.has(url))pending.set(url,(async()=>{const response=await fetch(url);if(!response.ok||response.status!==200)throw Error('Asset '+response.status);try{await cache.put(url,response.clone());}catch(e){/* Cache quota must never block gameplay. */}return response;})().finally(()=>pending.delete(url)));
 return (await pending.get(url)).clone();
}
async function serve(request,url){
 try{
  const range=request.headers.get('Range');
  if(!range)return await full(url);
  const hit=await (await caches.open(CACHE)).match(url);
  // Do not download a whole uncached movie just to satisfy a foreground seek.
  if(!hit)return fetch(request);
  const data=await hit.arrayBuffer(),m=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!m)return fetch(request);
  let start=m[1]?Number(m[1]):Math.max(0,data.byteLength-Number(m[2])),end=m[1]&&m[2]?Number(m[2]):data.byteLength-1;
  end=Math.min(end,data.byteLength-1);
  if(start>end||start>=data.byteLength)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+data.byteLength}});
  return new Response(data.slice(start,end+1),{status:206,headers:{'Content-Type':hit.headers.get('Content-Type')||'video/mp4','Content-Range':`bytes ${start}-${end}/${data.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
 }catch(e){return fetch(request);}
}
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);u.search='';if(event.request.method==='GET'&&allowed.has(u.href))event.respondWith(serve(event.request,u.href));});
