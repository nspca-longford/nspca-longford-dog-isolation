// NSPCA Longford — offline worker. Pages: network first, so updates arrive as soon
// as there's signal; the last copy opens when there isn't, or after 3 seconds of waiting. Pages and family.js (shared by all apps) work the same way. Data (Supabase) is never cached here.
var V="nspca-3319";
var SHELL=["./","./index.html","./family.js","./family.js?v=3318c","./manifest.webmanifest","./icon-192.png","./icon-round.png","./icon-square.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(V).then(function(c){return Promise.all(SHELL.map(function(u){return c.add(new Request(u,{cache:"reload"})).catch(function(){});}));}));self.skipWaiting();});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==V;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener("fetch",function(e){var r=e.request;if(r.method!=="GET")return;var u=new URL(r.url);
  var same=u.origin===self.location.origin;var font=/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(!same&&!font)return;
  if(same&&(r.mode==="navigate"||/\.(html?|js)$/.test(u.pathname)||u.pathname.slice(-1)==="/")){
    // Network first, but don't keep people waiting on one bar of signal: after 3 seconds the
    // copy on the phone opens, and the download carries on so the next open has the update.
    var net=fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp);});}return res;});
    var cached=function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||(r.mode==="navigate"?caches.match("./index.html"):null);});};
    e.waitUntil(net.catch(function(){}));
    e.respondWith(new Promise(function(done){var settled=false;var finish=function(x){if(!settled&&x){settled=true;done(x);}};
      var t=setTimeout(function(){caches.match(r,{ignoreSearch:true}).then(function(m){if(m)finish(m);});},3000);
      net.then(function(res){clearTimeout(t);finish(res);},function(){clearTimeout(t);cached().then(function(m){finish(m||Response.error());});});}));return;}
  e.respondWith(caches.match(r).then(function(m){var net=fetch(r).then(function(res){if(res&&(res.ok||res.type==="opaque")){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp);});}return res;}).catch(function(){return m;});return m||net;}));
});
// Phone notifications (v3.313): show what the notify function sends; a tap opens the app.
self.addEventListener("push",function(e){var d={};try{d=e.data?e.data.json():{};}catch(x){d={title:"NSPCA Longford",body:e.data?e.data.text():""};}
  e.waitUntil(self.registration.showNotification(d.title||"NSPCA Longford",{body:d.body||"",icon:"./icon-192.png",badge:"./icon-192.png",tag:d.tag||undefined,data:{url:d.url||"./"}}));});
self.addEventListener("notificationclick",function(e){e.notification.close();var url=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){for(var i=0;i<cs.length;i++){if(cs[i].url.split("#")[0].split("?")[0]===url.split("#")[0].split("?")[0]&&"focus" in cs[i])return cs[i].focus();}return self.clients.openWindow(url);}));});
