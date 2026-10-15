// NSPCA Longford — offline worker. Pages: network first, so updates arrive as soon
// as there's signal; the last copy opens when there isn't. Pages and family.js (shared by all apps) work the same way. Data (Supabase) is never cached here.
var V="nspca-3310";
var SHELL=["./","./index.html","./family.js","./manifest.webmanifest","./icon-192.png","./icon-round.png","./icon-square.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(V).then(function(c){return Promise.all(SHELL.map(function(u){return c.add(new Request(u,{cache:"reload"})).catch(function(){});}));}));self.skipWaiting();});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==V;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener("fetch",function(e){var r=e.request;if(r.method!=="GET")return;var u=new URL(r.url);
  var same=u.origin===self.location.origin;var font=/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(!same&&!font)return;
  if(same&&(r.mode==="navigate"||/\.(html?|js)$/.test(u.pathname)||u.pathname.slice(-1)==="/")){
    e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp);});}return res;}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match("./index.html");});}));return;}
  e.respondWith(caches.match(r).then(function(m){var net=fetch(r).then(function(res){if(res&&(res.ok||res.type==="opaque")){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp);});}return res;}).catch(function(){return m;});return m||net;}));
});
