// NSPCA Longford — family.js: the parts every app shares (Dogs, Cats, Stables).
// Sign-in, staying signed in, PINs, My profile, Manage users, look only, which app someone opens in,
// the inspector list, saving safely when two people edit one record, and the Ballinasloe Horse Fair notice.
// Edit this file once and every app gets the change. Each app keeps only its own animals.

var HOME_FILES={dogs:"index.html",cats:"cats.html",stables:"stables.html"};
var HOME_BUILTIN={}; // shared unit codes (Cattery, Cat Iso, Stables) removed Oct 2026: everyone signs in as themselves
function homeAppFor(u){if(!u)return "";var m={};try{m=unitSetting("homeApps")||{};}catch(e){}var em=String(u.email||"").toLowerCase();return (em&&m[em])||m[u.code||""]||HOME_BUILTIN[u.code||""]||(typeof lookBuiltin==="function"&&(lookBuiltin(u)||{}).home)||"";}
// Only the front door (index.html) sends people on to their home app. Opening Cats or Stables on
// purpose — a bookmark, a shortcut, a new tab, or signing in there — keeps you where you asked to be.
function famOnFrontDoor(){var p=String(location.pathname||"");return /\/(index\.html?)?$/.test(p)||p==="";}
function goHomeApp(u,force){if(!famOnFrontDoor())return false;var done="";try{done=sessionStorage.getItem("nspca-home-done")||"";}catch(e){}if(done&&!force)return false;try{sessionStorage.setItem("nspca-home-done","1");}catch(e){}var h=homeAppFor(u);if(h&&h!==APP_HOME&&HOME_FILES[h]){location.replace(HOME_FILES[h]);return true;}return false;}
function userPhoto(code){try{var _l=localStorage.getItem("nspca-user-photo-"+code);if(_l!==null)return _l;var _u=(typeof _allUsersCache!=="undefined"&&_allUsersCache||[]).find(function(x){return x.code===code;});return (_u&&_u.photo)||"";}catch(e){return"";}}
function setUserPhoto(code,dataUrl){try{localStorage.setItem("nspca-user-photo-"+code,dataUrl||"");}catch(e){}if(supabaseClient)supabaseClient.from("users").update({photo:dataUrl||null}).eq("code",code).then(function(){},function(){});}
function userLastLogin(code){try{var v=localStorage.getItem("nspca-user-lastlogin-"+code);return v?parseInt(v):0;}catch(e){return 0;}}
function recordLastLogin(code){try{localStorage.setItem("nspca-user-lastlogin-"+code,Date.now().toString());}catch(e){}if(supabaseClient)supabaseClient.from("users").update({last_login_at:new Date().toISOString()}).eq("code",code).then(function(){},function(){});setTimeout(function(){try{seenBeat();}catch(e){}},4000);}
// Shared unit codes are retired in every app, whatever an app's own list still says.
var FAM_RETIRED_CODES=["CAT01","CISO01","STA01"];
function famRetired(u){if(!u)return false;var c=String(u.code||u||"").toUpperCase();if(FAM_RETIRED_CODES.indexOf(c)>=0)return true;return typeof u==="object"&&!u.email&&/^(cattery|cat iso|cat isolation|stables)$/i.test(String(u.name||"").trim());}
function getAllUsersSync(){return (_allUsersCache||USERS).filter(function(u){return !famRetired(u);});}
async function refreshAllUsers(){
  var merged=USERS.slice().map(function(u){return Object.assign({},u,{source:"app"});});
  if(supabaseClient){
    try{
      var res=await supabaseClient.from("users").select("*");
      if(res.data&&res.data.length){
        res.data.forEach(function(u){
          var existing=merged.find(function(x){return x.code===u.code;});
          if(existing){Object.assign(existing,u,{source:"both"});}
          else{merged.push(Object.assign({},u,{source:"db"}));}
        });
      }
    }catch(e){}
  }
  merged=merged.filter(function(u){return !famRetired(u);});
  _allUsersCache=merged;
  return merged;
}
function getAutoLogoutMins(){var n=0;try{var v=localStorage.getItem("nspca-auto-logout-mins");n=v?parseInt(v):0;}catch(e){}if(typeof famShared==="function"&&famShared()&&(!n||n>15))n=15;return n;}
function setAutoLogoutMins(n){try{localStorage.setItem("nspca-auto-logout-mins",n.toString());}catch(e){}setupAutoLogout();}
function bumpActivity(){_lastActivity=Date.now();if(_lastActivity-(window._laW||0)>30000){window._laW=_lastActivity;try{localStorage.setItem("nspca-last-active",String(_lastActivity));}catch(e){}}}
function setupAutoLogout(){
  if(_autoLogoutTimer){clearInterval(_autoLogoutTimer);_autoLogoutTimer=null;}
  var mins=getAutoLogoutMins();
  if(!mins||mins<=0)return;
  _autoLogoutTimer=setInterval(function(){
    if(!LOGGED_IN)return;
    var idleMs=Date.now()-_lastActivity;
    if(window._printWin&&!window._printWin.closed){bumpActivity();return;}
    if(idleMs>mins*60*1000){doLogout();appAlert("You were logged out after "+mins+" minutes of inactivity.");}
  },30000);
}
["mousemove","keydown","click","touchstart","touchmove","pointerdown","pointermove","wheel","scroll","focusin","input","change"].forEach(function(ev){document.addEventListener(ev,bumpActivity,{passive:true,capture:true});});
document.addEventListener("visibilitychange",function(){if(!document.hidden)bumpActivity();});
window.addEventListener("focus",bumpActivity);
function initials(n){var p=(n||"").trim().split(/\s+/);return p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():(n||"?").slice(0,2).toUpperCase();}
function avatarColor(n){var c=["#0d9488","#7c3aed","#dc2626","#d97706","#2563eb","#16a34a","#db2777"];var h=0;for(var i=0;i<(n||"").length;i++)h=(h*31+n.charCodeAt(i))&0xfffffff;return c[h%c.length];}
function toggleLoginCode(){var inp=document.getElementById("login-code"),ic=document.getElementById("login-eye");if(!inp)return;var show=inp.type==="password";inp.type=show?"text":"password";if(ic)ic.innerHTML=show?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';}
async function doLogin(){
  // Access codes ended on 21 October 2026: the database only answers people signed in by email.
  var errEl=document.getElementById("login-err");
  if(errEl){errEl.textContent="Access codes have stopped. Sign in with your work email, or ask "+FAM_ADMIN_NAME+" for one.";errEl.style.display="block";}
}
function doLogout(){
  try{pushOffQuiet();}catch(e){}
  LOGGED_IN=false;CURRENT_USER=null;try{sessionStorage.removeItem("nspca-home-done");}catch(e){}
  if(_autoLogoutTimer){clearInterval(_autoLogoutTimer);_autoLogoutTimer=null;}
  stopDashRefresh();
  localStorage.removeItem("nspca-intake-auth");
  var _lc=document.getElementById("login-code");if(_lc)_lc.value="";
  document.getElementById("login-err").style.display="none";
  var _lb=document.getElementById("login-btn");if(_lb){_lb.textContent="Enter →";_lb.disabled=false;}
  authSignOut();window._loginWho="";window._loginFull=false;window._lgStage="";window._setPw=false;window._lgPrefill="";window._loginMode="auth";
  var st=document.getElementById("overdue-sticky");if(st)st.innerHTML="";
  if(famShared())famWipeShared();
  showScreen("login-screen");
}
// Shared computer: nothing from the last person stays behind (unsent saves and photo uploads are kept)
function famWipeShared(){try{Object.keys(localStorage).forEach(function(k){if(/^nspca-.*(records|cache)/.test(k))localStorage.removeItem(k);});}catch(e){}
  try{if(typeof records!=="undefined"&&Array.isArray(records))records.length=0;}catch(e){}
  try{if(typeof window.famAppWipe==="function")window.famAppWipe();}catch(e){}
  try{if(indexedDB.databases)indexedDB.databases().then(function(l){(l||[]).forEach(function(d){if(d&&d.name&&/^nspca-/.test(d.name)&&!/photoq/.test(d.name))indexedDB.deleteDatabase(d.name);});},function(){});else indexedDB.deleteDatabase("nspca-records");}catch(e){}}
function currentRole(){return CURRENT_USER?CURRENT_USER.role:(localStorage.getItem("nspca-user-role")||"staff");}
function currentName(){return CURRENT_USER?CURRENT_USER.name:(localStorage.getItem("nspca-user-name")||"Staff");}
function avatarByName(name,size){size=size||18;var u=getAllUsersSync().find(function(x){return x.name===name;});var photo=u?(userPhoto(u.code)||u.photo||""):"";
  if(photo)return '<img src="'+famSrc(photo)+'" alt="" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;flex-shrink:0;vertical-align:middle">';
  return '<span style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+avatarColor(name)+';color:#fff;font-size:'+Math.max(7,Math.round(size*0.42))+'px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:middle">'+initials(name)+'</span>';}
function userAvatarHtml(user,size){
  size=size||40;
  var photo=userPhoto(user.code);
  if(photo)return '<img src="'+famSrc(photo)+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;flex-shrink:0">';
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+avatarColor(user.name)+';color:#fff;font-size:'+Math.round(size*0.36)+'px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+initials(user.name)+'</div>';
}
function userMeta(code){var m={};try{m=JSON.parse(localStorage.getItem("nspca-user-meta-"+code)||"{}");}catch(e){}try{var _u=(typeof _allUsersCache!=="undefined"&&_allUsersCache||[]).find(function(x){return x.code===code;});if(_u)["phone","since","about"].forEach(function(k){if(m[k]==null&&_u[k])m[k]=_u[k];});}catch(e){}return m;}
function setUserMeta(code,k,v){var m=userMeta(code);m[k]=v;try{localStorage.setItem("nspca-user-meta-"+code,JSON.stringify(m));}catch(e){}if(supabaseClient){var u={};u[k]=v;supabaseClient.from("users").update(u).eq("code",code).then(function(){},function(){});}}
function prefGet(k,dflt){try{var v=localStorage.getItem("nspca-pref-"+k);return v===null?dflt:v;}catch(e){return dflt;}}
function prefSet(k,v){try{localStorage.setItem("nspca-pref-"+k,String(v));}catch(e){}if(k==="bigtext")document.documentElement.classList.toggle("bigtext",v==="1");showDashSection("profile");}
function setDevicePin(){var email=authEmail();if(!email){appAlert("Sign in with your email first.");return;}appPrompt("New 4-digit PIN for this device",function(pin){if(!/^\d{4}$/.test(pin||"")){appAlert("Four digits.");return;}devProfileSet(email,currentName(),pin).then(function(){miniToast("PIN set");showDashSection("profile");});});}
function forgetOtherProfiles(){var email=authEmail();devProfilesSave(devProfiles().filter(function(p){return p.email===email;}));miniToast("Only you are remembered on this device");showDashSection("profile");}
function userRoleInfo(role){return({admin:["ADMIN","#282932"],manager:["MANAGER","#0d9488"],supervisor:["SUPERVISOR","#7c3aed"],asst:["ASST SUPERVISOR","#8b5cf6"],coordinator:["CO-ORDINATOR","#db2777"],trainer:["TRAINER","#475569"]})[role]||["STAFF","#6b7280"];}
function userLastIn(u){var t=0;if(u.last_login_at){var x=new Date(u.last_login_at).getTime();if(!isNaN(x))t=x;}var l=userLastLogin(u.code);if(l>t)t=l;return t;}
function handleAvatarUpload(inp){
  var file=inp.files[0];if(!file)return;
  if(file.size>5*1024*1024){appAlert("Photo too large. Max 5MB.");return;}
  compressPhoto(file,function(data){
    var code=CURRENT_USER?CURRENT_USER.code:(localStorage.getItem("nspca-intake-auth")||"");
    if(!code)return;
    setUserPhoto(code,data);
    showDashSection("profile");
  });
}
function removeAvatar(){
  appConfirm("Remove your profile photo?",function(){
    var code=CURRENT_USER?CURRENT_USER.code:(localStorage.getItem("nspca-intake-auth")||"");
    if(!code)return;
    setUserPhoto(code,"");
    try{localStorage.removeItem("nspca-user-photo-"+code);}catch(e){}
    showDashSection("profile");
  },{danger:true});
}
function pwClose(){var o=document.getElementById("pwsheet");if(o)o.remove();}
async function pwSave(){var a=(document.getElementById("pw-1")||{}).value||"",b=(document.getElementById("pw-2")||{}).value||"";var er=document.getElementById("pw-err");var say=function(t){er.textContent=t;er.style.display="block";};
  if(a.length<10)return say("At least 10 characters. A short sentence works.");if(a!==b)return say("The two don’t match.");
  var go=document.getElementById("pw-go");go.disabled=true;go.textContent="Saving…";
  try{if(AUTH&&AUTH.expires_at&&AUTH.expires_at<Date.now()+60000){try{await authRefresh();}catch(e){}}
    var r=await fetch(SUPABASE_URL+"/auth/v1/user",{method:"PUT",headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+authToken(),"Content-Type":"application/json"},body:JSON.stringify({password:a,data:{pw_own:true}})});
    if(!r.ok){var d={};try{d=await r.json();}catch(e){}throw new Error(d.msg||d.message||d.error_description||("error "+r.status));}
    pwClose();miniToast("Password changed");}
  catch(e){go.disabled=false;go.textContent="Save new password";say("Couldn’t change it: "+(e.message||"try again"));}}
var AUTH=null;
function authLoad(){try{AUTH=JSON.parse(localStorage.getItem("nspca-auth")||"null");}catch(e){AUTH=null;}return AUTH;}
function authSave(a){AUTH=a;try{if(a)localStorage.setItem("nspca-auth",JSON.stringify(a));else localStorage.removeItem("nspca-auth");}catch(e){}
  // Supabase retires each sign-in when it renews it, so the PIN must always hold the newest one.
  try{if(a&&a.refresh_token){var em=String((a.user&&a.user.email)||"").toLowerCase();if(em){var P=devProfiles();var me=P.find(function(x){return String(x.email||"").toLowerCase()===em;});if(me&&(me.pin||me.bio)&&me.refresh!==a.refresh_token){me.refresh=a.refresh_token;devProfilesSave(P);}}}}catch(e){}}
function authToken(){return (AUTH&&AUTH.access_token)||"";}
function authEmail(){return (AUTH&&AUTH.user&&AUTH.user.email)||"";}
async function authRefresh(){if(!AUTH||!AUTH.refresh_token)return false;window._authNetFail=false;try{var r=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:AUTH.refresh_token})});if(r.status>=500){window._authNetFail=true;return false;}var d=await r.json();if(!r.ok||!d.access_token){authSave(null);return false;}authSave({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+((d.expires_in||3600)*1000),user:d.user||AUTH.user});return true;}catch(e){window._authNetFail=true;return false;}}
async function authSignIn(email,password){var r=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:email,password:password})});var d=await r.json();if(!r.ok||!d.access_token)throw new Error((d&&(d.error_description||d.msg||d.message))||"Sign-in failed");authSave({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+((d.expires_in||3600)*1000),user:d.user});return d.user;}
async function authSignOut(){try{var em=String((AUTH&&AUTH.user&&AUTH.user.email)||"").toLowerCase();var keep=em&&devProfiles().some(function(x){return String(x.email||"").toLowerCase()===em&&(x.pin||x.bio)&&x.refresh;});
  if(AUTH&&!keep)await fetch(SUPABASE_URL+"/auth/v1/logout?scope=local",{method:"POST",headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+authToken()}});}catch(e){}AUTH=null;try{localStorage.removeItem("nspca-auth");}catch(e){}}
async function authRecover(email){window._authErr="";try{var r=await fetch(SUPABASE_URL+"/auth/v1/recover?redirect_to="+encodeURIComponent(location.origin+location.pathname),{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:email})});if(r.ok)return true;var d={};try{d=await r.json();}catch(e){}var msg=String(d.msg||d.message||d.error_description||d.error||"");window._authErr=(r.status===429||/rate limit/i.test(msg))?"Too many emails sent \u2014 Supabase\u2019s built-in email only sends a few an hour. Wait an hour and try once, or sign in with your code for now.":/smtp|sending/i.test(msg)?"Supabase couldn\u2019t send the email ("+msg+"). The email settings in Supabase need checking.":msg?msg+" (error "+r.status+")":"Error "+r.status+".";return false;}catch(e){window._authErr="Couldn\u2019t reach Supabase \u2014 check the connection.";return false;}}
async function userForEmail(email){if(!supabaseClient||!email)return null;var em=email.toLowerCase();try{var res=await supabaseClient.from("users").select("*").eq("email",em).single();if(res&&res.data&&res.data.name)return res.data;var all=await supabaseClient.from("users").select("*");return ((all&&all.data)||[]).filter(function(u){return u&&u.name&&String(u.email||"").toLowerCase()===em;})[0]||null;}catch(e){return null;}}
function devProfiles(){try{return JSON.parse(localStorage.getItem("nspca-device-profiles")||"[]");}catch(e){return[];}}
function devProfilesSave(p){try{localStorage.setItem("nspca-device-profiles",JSON.stringify(p));}catch(e){}}
async function pinHash(email,pin){var enc=new TextEncoder().encode(email.toLowerCase()+":"+pin+":nspca");var buf=await crypto.subtle.digest("SHA-256",enc);return Array.prototype.map.call(new Uint8Array(buf),function(b){return ("0"+b.toString(16)).slice(-2);}).join("");}
async function devProfileSet(email,name,pin){var p=devProfiles().filter(function(x){return x.email!==email;});p.push({email:email,name:name,pin:pin?await pinHash(email,pin):"",refresh:(AUTH&&AUTH.refresh_token)||""});devProfilesSave(p);}
async function devProfileKeep(email,name){var old=devProfiles().find(function(x){return x.email===email;});var p=devProfiles().filter(function(x){return x.email!==email;});p.push(Object.assign({},old||{},{email:email,name:name,pin:old&&old.pin?old.pin:"",refresh:(AUTH&&AUTH.refresh_token)||""}));devProfilesSave(p);}
function authFromHash(){var h=location.hash||"";if(h.indexOf("access_token=")<0)return null;var p={};h.replace(/^#/,"").split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)p[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1));});
  // only Supabase's own invite / password-reset links, and take the token out of the address bar straight away
  try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}
  return p.access_token&&/^(invite|recovery|signup|magiclink)$/.test(p.type||"")?p:null;}
// ── Sign-in (Oct 2026): email and password once per phone, then a face and a PIN or fingerprint ──
// The office computer can be marked as shared (My profile, admins): no faces, no PINs, signs out on its own.
var FAM_ADMIN_NAME="Shane";
var FAM_CODES_END=new Date(2026,9,21);
var LG_FACE=["#c6e76c","#fbcfe8","#bfdbfe","#fde68a","#a7f3d0","#ddd6fe","#fed7aa"];
function famShared(){try{return localStorage.getItem("nspca-shared-device")==="1";}catch(e){return false;}}
function famSetShared(on){if(on!==famShared())famSecLog(currentName()+(on?" marked this "+famDevLabel()+" as a shared computer":" took the shared mark off this computer"));try{if(on)localStorage.setItem("nspca-shared-device","1");else localStorage.removeItem("nspca-shared-device");}catch(e){}
  if(on){devProfilesSave([]);try{localStorage.removeItem("nspca-user-cache");}catch(e){}}
  setupAutoLogout();famToast(on?"This computer is now shared: no faces or PINs, and it signs out after "+getAutoLogoutMins()+" minutes":"This computer is no longer marked as shared");
  if(typeof showDashSection==="function")showDashSection("profile");}
function famAnimals(){var h=famHere();return h==="cats"?"cats":h==="stables"?"horses":"dogs";}
function lgOffline(){return navigator.onLine===false;}
function lgLastSync(){var t=0;try{t=parseInt(localStorage.getItem("nspca-last-sync")||"0",10)||0;}catch(e){}if(!t)return "";var d=new Date(t);var hm=("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
  return "last synced "+(new Date().toDateString()===d.toDateString()?hm:d.toLocaleDateString("en-IE",{day:"numeric",month:"short"})+" "+hm);}
function lgFirst(p){return String((p&&(p.name||p.email))||"").split(/[ @]/)[0];}
function lgFace(p,i,size){var nm=lgFirst(p);return '<span class="lg-face" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.36)+'px;background:'+LG_FACE[i%LG_FACE.length]+'">'+famEsc((nm[0]||"?").toUpperCase())+'</span>';}
function lgMethods(p){var b=p.bio&&bioOK();return p.pin&&b?"PIN, fingerprint":p.pin?"PIN":b?"fingerprint":"password";}
var FAM_LOGO='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 392 51" role="img" aria-label="NSPCA, National Society for Prevention of Cruelty to Animals"><path fill="#c6e76c" d="M193.21 41.56L191.97 46.37H178.84L180.23 41.56C180.57 40.42 180.83 39.49 181.57 37.15L192.07 2.51H213.40L224.04 37.15C224.70 39.42 225.04 40.29 225.44 41.56L227.06 46.37H209.19L208.06 41.56C208.06 41.56 207.54 39.35 207.05 37.28H194.28C193.67 39.55 193.47 40.36 193.21 41.56ZM202.37 20.03C202.10 18.96 201.77 18.29 200.83 18.29C199.83 18.29 199.49 18.96 199.16 20.03L196.95 27.92H204.51L202.37 20.03Z M154.63 46.37C147.74 46.37 136.10 39.49 136.10 24.44C136.10 9.39 147.27 2.51 155.70 2.51H179.24V18.82H170.08C169.27 14.61 167.27 12.27 162.39 12.27C156.84 12.27 153.49 16.82 153.49 24.44C153.49 31.66 156.84 36.21 161.65 36.21C165.93 36.21 168.27 33.47 169.61 29.46H180.64C178.57 37.95 173.42 46.37 164.46 46.37H154.63Z M108.06 34.67V46.37H91.34V2.51H123.98C129.73 2.51 134.41 7.32 134.41 15.41C134.41 24.71 128.59 32.13 118.56 32.13H111.14C108.67 32.13 108.06 32.60 108.06 34.67ZM110.34 24.84H110.47C114.95 24.84 117.69 22.43 117.69 17.22C117.69 13.14 115.55 10.46 111.21 10.46H110.54C108.67 10.46 108.06 10.93 108.06 13.00V22.30C108.06 24.37 108.67 24.84 110.34 24.84Z M66.15 37.95C69.70 37.95 71.70 36.74 71.70 34.20C71.70 26.05 47.03 33.94 47.03 15.48C47.03 7.05 53.45 2.51 60.80 2.51H84.34V15.14H75.12C73.58 11.93 70.84 10.73 67.22 10.73C64.42 10.73 62.54 11.60 62.54 13.54C62.54 20.09 87.82 13.00 87.82 31.40C87.82 41.43 79.33 46.37 72.37 46.37H47.30V31.53H56.52C58.13 36.08 61.74 37.95 66.15 37.95Z M14.31 26.85V46.37H0V2.51H17.45L25.81 19.09C26.54 20.56 27.08 20.76 27.68 20.76C28.55 20.76 28.88 20.03 28.88 18.69V2.51H43.20V46.37H29.35L17.52 26.45C16.78 25.18 16.31 24.77 15.64 24.77C14.64 24.77 14.31 25.51 14.31 26.85Z M252.26 12.79L245.98 4.88V2.88H247.41L253.39 10.43L252.96 11.01L252.07 4.16L251.06 3.20V2.88H254.58V3.20L253.57 4.16V12.79H252.26ZM244.43 12.78V12.46L245.45 11.50L245.75 4.53L244.60 3.20V2.88H246.25L246.94 11.50L247.96 12.46V12.78H244.43ZM261.03 12.96L260.46 11.89H260.28V8.15C260.28 7.59 260.15 7.16 259.88 6.85C259.62 6.55 259.26 6.40 258.79 6.40C258.53 6.40 258.27 6.46 258.03 6.60C257.80 6.73 257.62 6.91 257.47 7.14L257.49 5.76H258.89L257.04 8.17H256.67L255.82 6.12C256.05 5.99 256.35 5.87 256.73 5.76C257.10 5.66 257.50 5.58 257.92 5.52C258.35 5.45 258.77 5.42 259.18 5.42C260.29 5.42 261.14 5.65 261.72 6.11C262.31 6.56 262.61 7.21 262.61 8.07V11.34L261.99 10.28L263.47 11.72V12.03L261.39 12.96H261.03ZM257.86 12.99C257.23 12.99 256.71 12.81 256.31 12.45C255.91 12.09 255.71 11.62 255.71 11.04C255.71 9.79 256.76 8.97 258.86 8.58L260.61 8.25V9.02L259.55 9.28C259.06 9.40 258.69 9.57 258.46 9.77C258.24 9.97 258.13 10.23 258.13 10.56C258.13 10.88 258.22 11.13 258.39 11.32C258.57 11.49 258.82 11.57 259.14 11.57C259.67 11.57 260.13 11.42 260.50 11.11V11.89H260.34C260.05 12.25 259.69 12.53 259.27 12.72C258.85 12.90 258.38 12.99 257.86 12.99ZM267.91 12.99C267.44 12.99 267.01 12.89 266.64 12.68C266.27 12.47 265.99 12.18 265.78 11.80C265.58 11.43 265.48 10.99 265.48 10.50V6.15L266.09 7.21H264.21V6.88L267.36 3.51H267.80V9.94C267.80 10.46 267.89 10.86 268.06 11.11C268.24 11.36 268.52 11.49 268.90 11.49C269.37 11.49 269.77 11.29 270.09 10.90L270.57 11.16C270.42 11.72 270.10 12.17 269.62 12.51C269.15 12.83 268.58 12.99 267.91 12.99ZM269.91 7.36L267.04 6.78V6.02L269.85 5.35H270.14V7.18L269.91 7.36ZM271.74 12.78V12.53L272.86 11.34L272.63 11.75V7.36L273.25 8.43L271.64 6.80V6.48L274.51 5.54H274.96V11.76L274.74 11.36L275.84 12.53V12.78H271.74ZM273.84 4.67C273.41 4.67 273.05 4.55 272.78 4.30C272.51 4.05 272.37 3.73 272.37 3.34C272.37 2.95 272.51 2.63 272.78 2.39C273.05 2.15 273.41 2.02 273.84 2.02C274.28 2.02 274.63 2.15 274.90 2.39C275.18 2.64 275.31 2.96 275.31 3.34C275.31 3.73 275.18 4.05 274.90 4.30C274.63 4.55 274.28 4.67 273.84 4.67ZM281.17 12.99C280.34 12.99 279.61 12.85 279.00 12.55C278.40 12.24 277.93 11.82 277.60 11.27C277.26 10.73 277.09 10.08 277.09 9.34C277.09 8.57 277.27 7.90 277.62 7.31C277.98 6.73 278.47 6.28 279.09 5.95C279.72 5.62 280.44 5.45 281.25 5.45C282.08 5.45 282.79 5.60 283.40 5.91C284.02 6.20 284.49 6.63 284.82 7.17C285.16 7.72 285.33 8.36 285.33 9.11C285.33 9.86 285.15 10.54 284.80 11.13C284.44 11.71 283.95 12.17 283.32 12.51C282.70 12.83 281.98 12.99 281.17 12.99ZM281.38 12.03C281.69 12.03 281.95 11.94 282.17 11.75C282.39 11.55 282.56 11.29 282.69 10.94C282.81 10.59 282.87 10.18 282.87 9.71C282.87 8.98 282.80 8.37 282.66 7.89C282.53 7.40 282.32 7.03 282.04 6.78C281.77 6.53 281.44 6.41 281.04 6.41C280.74 6.41 280.48 6.51 280.25 6.70C280.02 6.89 279.84 7.16 279.72 7.51C279.59 7.86 279.53 8.26 279.53 8.73C279.53 9.46 279.60 10.07 279.75 10.56C279.89 11.04 280.10 11.41 280.36 11.66C280.64 11.91 280.98 12.03 281.38 12.03ZM292.00 12.78V12.53L293.01 11.34L292.79 11.75V8.48C292.79 7.96 292.69 7.59 292.49 7.36C292.29 7.12 291.97 7.00 291.52 7.00C291.19 7.00 290.89 7.05 290.63 7.16C290.36 7.26 290.11 7.42 289.88 7.64V6.81H290.04C290.90 5.88 291.82 5.42 292.81 5.42C293.53 5.42 294.10 5.65 294.50 6.09C294.91 6.53 295.12 7.15 295.12 7.93V11.76L294.89 11.36L296.00 12.53V12.78H292.00ZM286.88 12.78V12.53L288.00 11.34L287.77 11.76V7.03L288.39 8.49L286.78 6.80V6.48L289.62 5.54H290.07L289.97 6.81H290.1V11.76L289.88 11.34L290.90 12.53V12.78H286.88ZM302.63 12.96L302.05 11.89H301.88V8.15C301.88 7.59 301.75 7.16 301.48 6.85C301.22 6.55 300.86 6.40 300.39 6.40C300.12 6.40 299.87 6.46 299.63 6.60C299.40 6.73 299.21 6.91 299.07 7.14L299.08 5.76H300.49L298.64 8.17H298.27L297.42 6.12C297.65 5.99 297.95 5.87 298.32 5.76C298.70 5.66 299.09 5.58 299.52 5.52C299.95 5.45 300.37 5.42 300.78 5.42C301.89 5.42 302.73 5.65 303.32 6.11C303.91 6.56 304.21 7.21 304.21 8.07V11.34L303.59 10.28L305.07 11.72V12.03L302.99 12.96H302.63ZM299.46 12.99C298.83 12.99 298.31 12.81 297.91 12.45C297.51 12.09 297.31 11.62 297.31 11.04C297.31 9.79 298.36 8.97 300.46 8.58L302.21 8.25V9.02L301.15 9.28C300.65 9.40 300.29 9.57 300.06 9.77C299.84 9.97 299.73 10.23 299.73 10.56C299.73 10.88 299.82 11.13 299.99 11.32C300.17 11.49 300.42 11.57 300.73 11.57C301.27 11.57 301.72 11.42 302.10 11.11V11.89H301.94C301.64 12.25 301.28 12.53 300.86 12.72C300.44 12.90 299.97 12.99 299.46 12.99ZM306.15 12.78V12.53L307.27 11.34L307.04 11.75V3.63L307.66 4.76L306.05 3.14V2.82L308.92 1.81H309.37V11.76L309.15 11.36L310.26 12.53V12.78H306.15ZM319.66 13.01C319.20 13.01 318.75 12.96 318.31 12.88C317.87 12.80 317.44 12.68 317.02 12.52C316.60 12.36 316.21 12.17 315.83 11.95L316.81 9.87H317.17L319.29 12.41H317.53V11.01C317.68 11.31 317.97 11.55 318.40 11.73C318.83 11.90 319.31 11.99 319.85 11.99C320.42 11.99 320.86 11.87 321.17 11.62C321.48 11.36 321.64 10.99 321.64 10.53C321.64 10.13 321.45 9.81 321.07 9.55C320.7 9.29 320.06 9.03 319.16 8.75C318.42 8.51 317.81 8.26 317.35 7.99C316.90 7.72 316.58 7.40 316.38 7.04C316.19 6.68 316.09 6.24 316.09 5.74C316.09 4.79 316.44 4.04 317.14 3.48C317.84 2.93 318.78 2.65 319.98 2.65C320.38 2.65 320.79 2.70 321.21 2.78C321.64 2.86 322.06 2.98 322.47 3.14C322.89 3.29 323.27 3.48 323.64 3.70L322.55 5.68H322.19L320.11 3.24H321.96L321.94 4.65C321.77 4.33 321.50 4.08 321.14 3.90C320.78 3.72 320.37 3.63 319.91 3.63C319.43 3.63 319.04 3.74 318.73 3.97C318.43 4.19 318.29 4.48 318.29 4.83C318.29 5.21 318.47 5.54 318.85 5.81C319.23 6.07 319.87 6.33 320.77 6.61C321.52 6.84 322.13 7.09 322.57 7.37C323.02 7.64 323.34 7.95 323.54 8.32C323.74 8.67 323.84 9.11 323.84 9.62C323.84 10.31 323.66 10.91 323.32 11.42C322.99 11.92 322.50 12.31 321.87 12.59C321.25 12.87 320.51 13.01 319.66 13.01ZM329.52 12.99C328.68 12.99 327.96 12.85 327.35 12.55C326.75 12.24 326.28 11.82 325.94 11.27C325.61 10.73 325.44 10.08 325.44 9.34C325.44 8.57 325.62 7.90 325.97 7.31C326.33 6.73 326.81 6.28 327.44 5.95C328.07 5.62 328.79 5.45 329.60 5.45C330.42 5.45 331.14 5.60 331.75 5.91C332.36 6.20 332.84 6.63 333.17 7.17C333.51 7.72 333.67 8.36 333.67 9.11C333.67 9.86 333.50 10.54 333.14 11.13C332.79 11.71 332.30 12.17 331.67 12.51C331.05 12.83 330.33 12.99 329.52 12.99ZM329.73 12.03C330.04 12.03 330.30 11.94 330.52 11.75C330.74 11.55 330.91 11.29 331.04 10.94C331.16 10.59 331.22 10.18 331.22 9.71C331.22 8.98 331.15 8.37 331.01 7.89C330.87 7.40 330.67 7.03 330.39 6.78C330.12 6.53 329.79 6.41 329.39 6.41C329.09 6.41 328.83 6.51 328.60 6.70C328.37 6.89 328.19 7.16 328.07 7.51C327.94 7.86 327.88 8.26 327.88 8.73C327.88 9.46 327.95 10.07 328.1 10.56C328.24 11.04 328.44 11.41 328.71 11.66C328.99 11.91 329.33 12.03 329.73 12.03ZM339.03 12.99C338.30 12.99 337.66 12.85 337.09 12.55C336.54 12.25 336.10 11.84 335.79 11.32C335.47 10.78 335.32 10.17 335.32 9.49C335.32 8.70 335.49 8.00 335.83 7.40C336.19 6.79 336.67 6.31 337.3 5.97C337.92 5.62 338.63 5.45 339.45 5.45C339.94 5.45 340.43 5.51 340.91 5.64C341.39 5.76 341.80 5.93 342.16 6.15L341.28 8.23H340.91L339.25 5.98H340.52V6.84C340.25 6.55 339.90 6.41 339.45 6.41C339.12 6.41 338.83 6.52 338.57 6.75C338.31 6.97 338.11 7.28 337.96 7.66C337.80 8.04 337.73 8.48 337.73 8.98C337.73 9.76 337.92 10.38 338.30 10.84C338.69 11.30 339.22 11.53 339.89 11.53C340.60 11.53 341.20 11.28 341.70 10.77L342.16 11.11C341.88 11.70 341.46 12.16 340.91 12.49C340.36 12.83 339.73 12.99 339.03 12.99ZM343.49 12.78V12.53L344.61 11.34L344.38 11.75V7.36L345.00 8.43L343.39 6.80V6.48L346.26 5.54H346.71V11.76L346.49 11.36L347.60 12.53V12.78H343.49ZM345.59 4.67C345.16 4.67 344.80 4.55 344.53 4.30C344.26 4.05 344.13 3.73 344.13 3.34C344.13 2.95 344.26 2.63 344.53 2.39C344.80 2.15 345.16 2.02 345.59 2.02C346.03 2.02 346.38 2.15 346.65 2.39C346.93 2.64 347.07 2.96 347.07 3.34C347.07 3.73 346.93 4.05 346.65 4.30C346.38 4.55 346.03 4.67 345.59 4.67ZM352.56 12.99C351.83 12.99 351.19 12.85 350.62 12.55C350.07 12.25 349.63 11.84 349.32 11.32C349.00 10.78 348.85 10.17 348.85 9.49C348.85 8.70 349.01 8.00 349.35 7.40C349.69 6.79 350.16 6.31 350.77 5.97C351.37 5.62 352.06 5.45 352.85 5.45C353.47 5.45 354.01 5.60 354.48 5.91C354.95 6.20 355.32 6.63 355.59 7.20C355.85 7.76 355.99 8.43 355.99 9.21H350.51V8.69L353.62 8.15C353.62 7.58 353.52 7.16 353.32 6.87C353.13 6.57 352.87 6.42 352.55 6.42C352.29 6.42 352.06 6.53 351.86 6.74C351.67 6.94 351.52 7.24 351.41 7.63C351.31 8.01 351.26 8.46 351.26 8.98C351.26 9.76 351.45 10.38 351.83 10.84C352.22 11.30 352.75 11.53 353.41 11.53C354.20 11.53 354.85 11.28 355.34 10.77L355.79 11.11C355.51 11.70 355.08 12.16 354.51 12.49C353.95 12.83 353.30 12.99 352.56 12.99ZM360.76 12.99C360.28 12.99 359.85 12.89 359.48 12.68C359.12 12.47 358.83 12.18 358.62 11.80C358.42 11.43 358.32 10.99 358.32 10.50V6.15L358.94 7.21H357.06V6.88L360.20 3.51H360.64V9.94C360.64 10.46 360.73 10.86 360.90 11.11C361.08 11.36 361.37 11.49 361.75 11.49C362.22 11.49 362.61 11.29 362.94 10.90L363.41 11.16C363.26 11.72 362.94 12.17 362.47 12.51C362.00 12.83 361.43 12.99 360.76 12.99ZM362.75 7.36L359.88 6.78V6.02L362.69 5.35H362.98V7.18L362.75 7.36ZM368.29 13.90L364.84 6.47H365.56V7.63L364.21 5.91V5.66H368.24V5.91L367.31 7.36H367.11V6.08L369.66 11.54L369.25 11.76L370.85 5.81V7.18H370.74L369.76 5.91V5.66H373.10V5.91L371.81 7.59V6.47H372.53L367.24 16.38H366.87L364.92 14.79V14.54L368.37 13.08L368.29 13.90ZM244.64 29.78V29.53L245.76 28.34L245.53 28.75V23.21L246.15 24.20H244.39V23.88L245.53 22.51V21.69C245.53 21.11 245.66 20.58 245.92 20.13C246.19 19.67 246.55 19.30 247.00 19.04C247.45 18.77 247.95 18.63 248.52 18.63C249 18.63 249.46 18.70 249.92 18.82C250.38 18.94 250.78 19.10 251.11 19.31L250.24 21.33H249.85L248.24 19.16H250.01V20.00C249.86 19.82 249.69 19.70 249.51 19.64C249.33 19.56 249.10 19.52 248.83 19.52C248.54 19.52 248.30 19.66 248.12 19.94C247.94 20.22 247.86 20.60 247.86 21.10V28.83L247.63 28.40L249.23 29.53V29.78H244.64ZM249.78 24.36L246.94 23.75V23.05L249.72 22.35H250.01V24.18L249.78 24.36ZM254.99 29.99C254.16 29.99 253.44 29.85 252.82 29.55C252.22 29.24 251.75 28.82 251.42 28.27C251.08 27.73 250.92 27.08 250.92 26.34C250.92 25.57 251.09 24.90 251.45 24.31C251.80 23.73 252.29 23.28 252.91 22.95C253.54 22.62 254.26 22.45 255.08 22.45C255.90 22.45 256.62 22.60 257.23 22.91C257.84 23.20 258.31 23.63 258.65 24.17C258.98 24.72 259.15 25.36 259.15 26.11C259.15 26.86 258.97 27.54 258.62 28.13C258.27 28.71 257.77 29.17 257.14 29.51C256.52 29.83 255.80 29.99 254.99 29.99ZM255.21 29.03C255.51 29.03 255.77 28.94 255.99 28.75C256.21 28.55 256.39 28.29 256.51 27.94C256.64 27.59 256.70 27.18 256.70 26.71C256.70 25.98 256.63 25.37 256.48 24.89C256.35 24.40 256.14 24.03 255.87 23.78C255.60 23.53 255.26 23.41 254.86 23.41C254.57 23.41 254.30 23.51 254.07 23.70C253.84 23.89 253.67 24.16 253.54 24.51C253.42 24.86 253.36 25.27 253.36 25.73C253.36 26.46 253.43 27.07 253.57 27.56C253.71 28.04 253.92 28.41 254.19 28.66C254.46 28.91 254.80 29.03 255.21 29.03ZM260.71 29.78V29.53L261.82 28.34L261.6 28.75V24.41L262.21 25.49L260.61 23.80V23.48L263.45 22.54H263.89L263.79 23.98H263.92V28.76L263.70 28.32L265.24 29.53V29.78H260.71ZM263.69 24.94L263.70 23.98H263.86C264.13 23.50 264.47 23.11 264.89 22.84C265.31 22.56 265.75 22.42 266.20 22.42C266.60 22.42 266.96 22.50 267.28 22.66L266.24 25.52H265.86L264.21 23.84L265.84 24.16C265.34 24.16 264.91 24.22 264.55 24.36C264.19 24.49 263.90 24.69 263.69 24.94ZM272.65 29.78V29.46L273.67 28.50V21.16L272.65 20.20V19.88H276.19V28.50L277.25 29.46V29.78H272.65ZM276.72 26.09H274.60V25.26H276.75C277.38 25.26 277.88 25.05 278.24 24.63C278.62 24.20 278.80 23.63 278.80 22.92C278.80 22.24 278.62 21.71 278.24 21.32C277.88 20.91 277.38 20.71 276.75 20.71H274.85V19.88H277.67C278.45 19.88 279.12 20.00 279.71 20.24C280.29 20.48 280.75 20.82 281.07 21.26C281.4 21.69 281.56 22.20 281.56 22.78C281.56 23.50 281.38 24.10 281.01 24.60C280.65 25.10 280.11 25.47 279.39 25.72C278.67 25.97 277.79 26.09 276.72 26.09ZM282.81 29.78V29.53L283.93 28.34L283.70 28.75V24.41L284.31 25.49L282.71 23.80V23.48L285.55 22.54H285.99L285.89 23.98H286.02V28.76L285.80 28.32L287.34 29.53V29.78H282.81ZM285.79 24.94L285.80 23.98H285.96C286.23 23.50 286.57 23.11 287 22.84C287.42 22.56 287.85 22.42 288.30 22.42C288.70 22.42 289.06 22.50 289.38 22.66L288.34 25.52H287.96L286.31 23.84L287.94 24.16C287.44 24.16 287.01 24.22 286.65 24.36C286.29 24.49 286.00 24.69 285.79 24.94ZM293.82 29.99C293.09 29.99 292.45 29.85 291.88 29.55C291.33 29.25 290.89 28.84 290.58 28.32C290.26 27.78 290.11 27.17 290.11 26.49C290.11 25.70 290.27 25.00 290.61 24.40C290.95 23.79 291.42 23.31 292.03 22.97C292.63 22.62 293.32 22.45 294.11 22.45C294.73 22.45 295.27 22.60 295.74 22.91C296.21 23.20 296.58 23.63 296.85 24.20C297.11 24.76 297.25 25.43 297.25 26.21H291.77V25.69L294.88 25.15C294.88 24.58 294.78 24.16 294.58 23.87C294.39 23.57 294.13 23.42 293.81 23.42C293.55 23.42 293.32 23.53 293.12 23.74C292.93 23.94 292.78 24.24 292.67 24.63C292.57 25.01 292.51 25.46 292.51 25.98C292.51 26.76 292.71 27.38 293.09 27.84C293.48 28.30 294.01 28.53 294.67 28.53C295.46 28.53 296.11 28.28 296.60 27.77L297.05 28.11C296.77 28.70 296.34 29.16 295.77 29.49C295.21 29.83 294.56 29.99 293.82 29.99ZM301.88 29.81L298.60 23.47H299.31V24.54L297.95 22.91V22.66H302.05V22.91L301.11 24.51H300.92V23.08L303.46 27.99H303.16L304.36 22.81V24.21H304.23L303.44 22.91V22.66H306.69V22.91L305.32 24.54V23.47H306.04L302.76 29.81H301.88ZM311.01 29.99C310.28 29.99 309.63 29.85 309.07 29.55C308.51 29.25 308.08 28.84 307.76 28.32C307.45 27.78 307.29 27.17 307.29 26.49C307.29 25.70 307.46 25.00 307.79 24.40C308.14 23.79 308.61 23.31 309.21 22.97C309.81 22.62 310.51 22.45 311.29 22.45C311.91 22.45 312.46 22.60 312.93 22.91C313.4 23.20 313.76 23.63 314.03 24.20C314.30 24.76 314.43 25.43 314.43 26.21H308.95V25.69L312.07 25.15C312.07 24.58 311.97 24.16 311.77 23.87C311.57 23.57 311.32 23.42 310.99 23.42C310.73 23.42 310.50 23.53 310.30 23.74C310.11 23.94 309.96 24.24 309.86 24.63C309.75 25.01 309.70 25.46 309.70 25.98C309.70 26.76 309.89 27.38 310.27 27.84C310.67 28.30 311.19 28.53 311.85 28.53C312.64 28.53 313.29 28.28 313.79 27.77L314.23 28.11C313.95 28.70 313.53 29.16 312.96 29.49C312.39 29.83 311.74 29.99 311.01 29.99ZM320.99 29.78V29.53L322.00 28.34L321.78 28.75V25.48C321.78 24.96 321.68 24.59 321.48 24.36C321.28 24.12 320.96 24.00 320.51 24.00C320.18 24.00 319.89 24.05 319.62 24.16C319.35 24.26 319.10 24.42 318.87 24.64V23.81H319.03C319.89 22.88 320.81 22.42 321.80 22.42C322.52 22.42 323.09 22.65 323.49 23.09C323.90 23.53 324.11 24.15 324.11 24.93V28.76L323.88 28.36L325.00 29.53V29.78H320.99ZM315.87 29.78V29.53L316.99 28.34L316.76 28.76V24.03L317.38 25.49L315.77 23.80V23.48L318.61 22.54H319.06L318.96 23.81H319.09V28.76L318.87 28.34L319.89 29.53V29.78H315.87ZM329.33 29.99C328.85 29.99 328.43 29.89 328.05 29.68C327.69 29.47 327.40 29.18 327.19 28.80C326.99 28.43 326.89 27.99 326.89 27.50V23.15L327.51 24.21H325.63V23.88L328.77 20.51H329.21V26.94C329.21 27.46 329.30 27.86 329.47 28.11C329.65 28.36 329.94 28.49 330.32 28.49C330.79 28.49 331.18 28.29 331.51 27.90L331.98 28.16C331.83 28.72 331.51 29.17 331.04 29.51C330.57 29.83 330.00 29.99 329.33 29.99ZM331.32 24.36L328.45 23.78V23.02L331.27 22.35H331.55V24.18L331.32 24.36ZM333.16 29.78V29.53L334.28 28.34L334.05 28.75V24.36L334.66 25.43L333.06 23.80V23.48L335.93 22.54H336.37V28.76L336.16 28.36L337.26 29.53V29.78H333.16ZM335.25 21.67C334.82 21.67 334.47 21.55 334.19 21.30C333.92 21.05 333.79 20.73 333.79 20.34C333.79 19.95 333.92 19.63 334.19 19.39C334.47 19.15 334.82 19.02 335.25 19.02C335.69 19.02 336.05 19.15 336.31 19.39C336.59 19.64 336.73 19.96 336.73 20.34C336.73 20.73 336.59 21.05 336.31 21.30C336.05 21.55 335.69 21.67 335.25 21.67ZM342.58 29.99C341.75 29.99 341.03 29.85 340.42 29.55C339.81 29.24 339.35 28.82 339.01 28.27C338.68 27.73 338.51 27.08 338.51 26.34C338.51 25.57 338.69 24.90 339.04 24.31C339.39 23.73 339.88 23.28 340.50 22.95C341.13 22.62 341.86 22.45 342.67 22.45C343.49 22.45 344.21 22.60 344.82 22.91C345.43 23.20 345.91 23.63 346.24 24.17C346.57 24.72 346.74 25.36 346.74 26.11C346.74 26.86 346.56 27.54 346.21 28.13C345.86 28.71 345.36 29.17 344.73 29.51C344.11 29.83 343.4 29.99 342.58 29.99ZM342.80 29.03C343.10 29.03 343.37 28.94 343.59 28.75C343.81 28.55 343.98 28.29 344.10 27.94C344.23 27.59 344.29 27.18 344.29 26.71C344.29 25.98 344.22 25.37 344.07 24.89C343.94 24.40 343.73 24.03 343.46 23.78C343.19 23.53 342.85 23.41 342.45 23.41C342.16 23.41 341.89 23.51 341.66 23.70C341.43 23.89 341.26 24.16 341.13 24.51C341.01 24.86 340.95 25.27 340.95 25.73C340.95 26.46 341.02 27.07 341.16 27.56C341.31 28.04 341.51 28.41 341.78 28.66C342.06 28.91 342.4 29.03 342.80 29.03ZM353.42 29.78V29.53L354.42 28.34L354.21 28.75V25.48C354.21 24.96 354.11 24.59 353.91 24.36C353.71 24.12 353.38 24.00 352.93 24.00C352.61 24.00 352.31 24.05 352.04 24.16C351.77 24.26 351.52 24.42 351.3 24.64V23.81H351.45C352.31 22.88 353.24 22.42 354.22 22.42C354.95 22.42 355.51 22.65 355.91 23.09C356.33 23.53 356.53 24.15 356.53 24.93V28.76L356.30 28.36L357.42 29.53V29.78H353.42ZM348.30 29.78V29.53L349.42 28.34L349.19 28.76V24.03L349.80 25.49L348.20 23.80V23.48L351.04 22.54H351.48L351.38 23.81H351.51V28.76L351.3 28.34L352.31 29.53V29.78H348.30ZM367.06 29.99C366.23 29.99 365.51 29.85 364.90 29.55C364.30 29.24 363.83 28.82 363.49 28.27C363.16 27.73 362.99 27.08 362.99 26.34C362.99 25.57 363.17 24.90 363.52 24.31C363.88 23.73 364.36 23.28 364.98 22.95C365.62 22.62 366.34 22.45 367.15 22.45C367.97 22.45 368.69 22.60 369.30 22.91C369.91 23.20 370.39 23.63 370.72 24.17C371.06 24.72 371.22 25.36 371.22 26.11C371.22 26.86 371.05 27.54 370.69 28.13C370.34 28.71 369.85 29.17 369.22 29.51C368.59 29.83 367.88 29.99 367.06 29.99ZM367.28 29.03C367.59 29.03 367.85 28.94 368.07 28.75C368.29 28.55 368.46 28.29 368.58 27.94C368.71 27.59 368.77 27.18 368.77 26.71C368.77 25.98 368.70 25.37 368.56 24.89C368.42 24.40 368.22 24.03 367.94 23.78C367.67 23.53 367.34 23.41 366.94 23.41C366.64 23.41 366.38 23.51 366.15 23.70C365.92 23.89 365.74 24.16 365.62 24.51C365.49 24.86 365.43 25.27 365.43 25.73C365.43 26.46 365.50 27.07 365.64 27.56C365.79 28.04 365.99 28.41 366.26 28.66C366.54 28.91 366.88 29.03 367.28 29.03ZM372.9 29.78V29.53L374.01 28.34L373.78 28.75V23.21L374.40 24.20H372.64V23.88L373.78 22.51V21.69C373.78 21.11 373.91 20.58 374.17 20.13C374.44 19.67 374.80 19.30 375.25 19.04C375.70 18.77 376.20 18.63 376.77 18.63C377.25 18.63 377.71 18.70 378.17 18.82C378.63 18.94 379.03 19.10 379.36 19.31L378.49 21.33H378.10L376.5 19.16H378.26V20.00C378.11 19.82 377.94 19.70 377.76 19.64C377.58 19.56 377.35 19.52 377.08 19.52C376.79 19.52 376.55 19.66 376.37 19.94C376.19 20.22 376.11 20.60 376.11 21.10V28.83L375.88 28.40L377.48 29.53V29.78H372.9ZM378.03 24.36L375.19 23.75V23.05L377.97 22.35H378.26V24.18L378.03 24.36ZM249.66 47.01C248.61 47.01 247.70 46.81 246.93 46.41C246.16 46.00 245.57 45.43 245.16 44.68C244.75 43.94 244.54 43.05 244.54 42.03C244.54 41.22 244.67 40.49 244.93 39.84C245.19 39.18 245.56 38.61 246.04 38.13C246.51 37.65 247.09 37.29 247.76 37.04C248.43 36.78 249.17 36.65 249.99 36.65C250.41 36.65 250.82 36.70 251.23 36.78C251.64 36.86 252.04 36.98 252.43 37.14C252.83 37.29 253.21 37.48 253.55 37.70L252.46 39.76H252.10L250.07 37.24H251.86V38.65C251.5 37.98 250.93 37.64 250.17 37.64C249.62 37.64 249.13 37.82 248.69 38.17C248.26 38.52 247.91 38.99 247.66 39.58C247.41 40.17 247.28 40.84 247.28 41.59C247.28 42.37 247.42 43.05 247.69 43.64C247.96 44.22 248.35 44.67 248.85 44.99C249.35 45.30 249.95 45.46 250.63 45.46C251.11 45.46 251.56 45.36 251.96 45.16C252.37 44.96 252.73 44.67 253.04 44.28L253.58 44.58C253.26 45.33 252.74 45.92 252.05 46.36C251.35 46.79 250.55 47.01 249.66 47.01ZM254.39 46.78V46.53L255.51 45.34L255.28 45.75V41.41L255.9 42.49L254.29 40.80V40.48L257.13 39.54H257.57L257.47 40.98H257.60V45.76L257.39 45.32L258.92 46.53V46.78H254.39ZM257.37 41.94L257.39 40.98H257.54C257.81 40.50 258.16 40.11 258.58 39.84C259.00 39.56 259.43 39.42 259.88 39.42C260.28 39.42 260.64 39.50 260.96 39.66L259.93 42.52H259.54L257.89 40.84L259.52 41.16C259.03 41.16 258.60 41.22 258.23 41.36C257.87 41.49 257.58 41.69 257.37 41.94ZM265.02 46.99C264.30 46.99 263.75 46.78 263.37 46.35C262.99 45.92 262.8 45.30 262.8 44.50V41.00L263.41 42.30L261.81 40.75V40.44L264.67 39.56H265.12V43.94C265.12 44.45 265.21 44.83 265.39 45.07C265.58 45.30 265.89 45.42 266.31 45.42C266.59 45.42 266.85 45.36 267.11 45.26C267.37 45.14 267.61 44.99 267.83 44.78V45.62H267.66C267.27 46.08 266.85 46.42 266.41 46.65C265.97 46.88 265.51 46.99 265.02 46.99ZM268.36 46.96L267.74 45.65H267.60V40.98L268.22 42.27L266.61 40.74V40.42L269.48 39.54H269.92V45.34L269.32 44.28L270.80 45.72V46.03L268.72 46.96H268.36ZM275.94 46.99C275.21 46.99 274.56 46.85 274.00 46.55C273.44 46.25 273.01 45.84 272.69 45.32C272.38 44.78 272.22 44.17 272.22 43.49C272.22 42.70 272.39 42.00 272.72 41.40C273.07 40.79 273.54 40.31 274.14 39.97C274.74 39.62 275.44 39.45 276.22 39.45C276.84 39.45 277.39 39.60 277.86 39.91C278.33 40.20 278.69 40.63 278.96 41.20C279.23 41.76 279.36 42.43 279.36 43.21H273.88V42.69L277.00 42.15C277.00 41.58 276.90 41.16 276.7 40.87C276.50 40.57 276.25 40.42 275.92 40.42C275.66 40.42 275.43 40.53 275.23 40.74C275.04 40.94 274.89 41.24 274.79 41.63C274.68 42.01 274.63 42.46 274.63 42.98C274.63 43.76 274.82 44.38 275.20 44.84C275.6 45.30 276.12 45.53 276.78 45.53C277.57 45.53 278.22 45.28 278.72 44.77L279.16 45.11C278.88 45.70 278.46 46.16 277.89 46.49C277.32 46.83 276.67 46.99 275.94 46.99ZM280.48 46.78V46.53L281.60 45.34L281.37 45.75V37.63L281.99 38.76L280.38 37.14V36.82L283.25 35.81H283.7V45.76L283.48 45.36L284.58 46.53V46.78H280.48ZM289.05 46.99C288.57 46.99 288.15 46.89 287.77 46.68C287.41 46.47 287.12 46.18 286.91 45.80C286.71 45.43 286.61 44.99 286.61 44.50V40.15L287.23 41.21H285.35V40.88L288.49 37.51H288.93V43.94C288.93 44.46 289.02 44.86 289.19 45.11C289.37 45.36 289.66 45.49 290.04 45.49C290.51 45.49 290.90 45.29 291.23 44.90L291.70 45.16C291.55 45.72 291.23 46.17 290.76 46.51C290.29 46.83 289.72 46.99 289.05 46.99ZM291.04 41.36L288.17 40.78V40.02L290.99 39.35H291.27V41.18L291.04 41.36ZM296.58 47.90L293.13 40.47H293.85V41.63L292.50 39.91V39.66H296.53V39.91L295.60 41.36H295.40V40.08L297.95 45.54L297.54 45.76L299.14 39.81V41.18H299.03L298.05 39.91V39.66H301.4V39.91L300.10 41.59V40.47H300.82L295.53 50.38H295.16L293.21 48.79V48.54L296.66 47.08L296.58 47.90ZM310.16 46.99C309.68 46.99 309.25 46.89 308.88 46.68C308.52 46.47 308.23 46.18 308.02 45.80C307.82 45.43 307.72 44.99 307.72 44.50V40.15L308.33 41.21H306.46V40.88L309.60 37.51H310.04V43.94C310.04 44.46 310.13 44.86 310.30 45.11C310.48 45.36 310.76 45.49 311.15 45.49C311.61 45.49 312.01 45.29 312.34 44.90L312.81 45.16C312.66 45.72 312.34 46.17 311.86 46.51C311.39 46.83 310.82 46.99 310.16 46.99ZM312.15 41.36L309.28 40.78V40.02L312.09 39.35H312.38V41.18L312.15 41.36ZM317.83 46.99C317.00 46.99 316.28 46.85 315.67 46.55C315.07 46.24 314.60 45.82 314.26 45.27C313.93 44.73 313.76 44.08 313.76 43.34C313.76 42.57 313.94 41.90 314.29 41.31C314.65 40.73 315.13 40.28 315.75 39.95C316.39 39.62 317.11 39.45 317.92 39.45C318.74 39.45 319.46 39.60 320.07 39.91C320.68 40.20 321.16 40.63 321.49 41.17C321.83 41.72 321.99 42.36 321.99 43.11C321.99 43.86 321.82 44.54 321.46 45.13C321.11 45.71 320.62 46.17 319.99 46.51C319.36 46.83 318.65 46.99 317.83 46.99ZM318.05 46.03C318.36 46.03 318.62 45.94 318.84 45.75C319.06 45.55 319.23 45.29 319.35 44.94C319.48 44.59 319.54 44.18 319.54 43.71C319.54 42.98 319.47 42.37 319.33 41.89C319.19 41.40 318.99 41.03 318.71 40.78C318.44 40.53 318.11 40.41 317.71 40.41C317.41 40.41 317.15 40.51 316.92 40.70C316.69 40.89 316.51 41.16 316.39 41.51C316.26 41.86 316.20 42.27 316.20 42.73C316.20 43.46 316.27 44.07 316.41 44.56C316.56 45.04 316.76 45.41 317.03 45.66C317.31 45.91 317.65 46.03 318.05 46.03ZM327.43 46.78V46.46L328.52 45.24L327.79 46.59L332.09 36.88H333.70L338.00 46.59L337.26 45.24L338.36 46.46V46.78H333.83V46.46L335.25 45.29L335.38 46.59L331.65 38.16H332.15L329.77 46.59L329.73 45.30L331.16 46.46V46.78H327.43ZM329.90 43.91V43.08H335.36V43.91H329.90ZM331.78 38.43L330.65 37.20V36.88H332.45L331.78 38.43ZM344.52 46.78V46.53L345.53 45.34L345.31 45.75V42.48C345.31 41.96 345.21 41.59 345.01 41.36C344.81 41.12 344.49 41.00 344.04 41.00C343.71 41.00 343.42 41.05 343.15 41.16C342.88 41.26 342.63 41.42 342.40 41.64V40.81H342.56C343.42 39.88 344.34 39.42 345.33 39.42C346.05 39.42 346.62 39.65 347.02 40.09C347.43 40.53 347.64 41.15 347.64 41.93V45.76L347.41 45.36L348.53 46.53V46.78H344.52ZM339.40 46.78V46.53L340.52 45.34L340.29 45.76V41.03L340.91 42.49L339.30 40.80V40.48L342.14 39.54H342.59L342.49 40.81H342.62V45.76L342.40 45.34L343.42 46.53V46.78H339.40ZM349.71 46.78V46.53L350.83 45.34L350.60 45.75V41.36L351.22 42.43L349.61 40.80V40.48L352.48 39.54H352.93V45.76L352.71 45.36L353.81 46.53V46.78H349.71ZM351.81 38.67C351.38 38.67 351.02 38.55 350.75 38.30C350.48 38.05 350.34 37.73 350.34 37.34C350.34 36.95 350.48 36.63 350.75 36.39C351.02 36.15 351.38 36.02 351.81 36.02C352.25 36.02 352.60 36.15 352.87 36.39C353.15 36.64 353.28 36.96 353.28 37.34C353.28 37.73 353.15 38.05 352.87 38.30C352.60 38.55 352.25 38.67 351.81 38.67ZM364.93 46.78V46.53L365.81 45.34L365.59 45.76V42.48C365.59 41.97 365.5 41.60 365.30 41.36C365.11 41.12 364.81 41.00 364.39 41.00C364.11 41.00 363.83 41.06 363.55 41.17C363.29 41.28 363.04 41.43 362.82 41.64V40.81H363C363.39 40.35 363.81 40.01 364.26 39.78C364.71 39.54 365.18 39.42 365.68 39.42C366.39 39.42 366.94 39.64 367.33 40.08C367.72 40.51 367.91 41.12 367.91 41.92V45.77L367.69 45.36L368.80 46.53V46.78H364.93ZM355.02 46.78V46.53L356.14 45.36L355.91 45.76V41.41L356.53 42.52L354.92 40.81V40.50L357.76 39.54H358.20L358.10 40.81H358.23V45.77L358.02 45.36L358.99 46.53V46.78H355.02ZM360.10 46.78V46.53L360.97 45.34L360.76 45.76V42.48C360.76 41.97 360.66 41.60 360.47 41.36C360.28 41.12 359.98 41.00 359.57 41.00C358.98 41.00 358.47 41.21 358.02 41.64V40.81H358.18C358.57 40.35 358.99 40.01 359.44 39.78C359.89 39.54 360.36 39.42 360.86 39.42C361.57 39.42 362.11 39.64 362.49 40.08C362.89 40.51 363.08 41.12 363.08 41.92V45.77L362.85 45.36L363.83 46.53V46.78H360.10ZM362.32 42.49V41.26H363.08V42.49H362.32ZM375.43 46.96L374.86 45.89H374.68V42.15C374.68 41.59 374.55 41.16 374.28 40.85C374.02 40.55 373.66 40.40 373.19 40.40C372.92 40.40 372.67 40.46 372.43 40.60C372.20 40.73 372.02 40.91 371.87 41.14L371.89 39.76H373.29L371.44 42.17H371.07L370.22 40.12C370.45 39.99 370.75 39.87 371.13 39.76C371.50 39.66 371.90 39.58 372.32 39.52C372.75 39.45 373.17 39.42 373.58 39.42C374.69 39.42 375.53 39.65 376.12 40.11C376.71 40.56 377.01 41.21 377.01 42.07V45.34L376.39 44.28L377.87 45.72V46.03L375.79 46.96H375.43ZM372.26 46.99C371.63 46.99 371.11 46.81 370.71 46.45C370.31 46.09 370.11 45.62 370.11 45.04C370.11 43.79 371.16 42.97 373.26 42.58L375.01 42.25V43.02L373.95 43.28C373.45 43.40 373.09 43.57 372.86 43.77C372.64 43.97 372.53 44.23 372.53 44.56C372.53 44.88 372.62 45.13 372.79 45.32C372.97 45.49 373.22 45.57 373.54 45.57C374.07 45.57 374.53 45.42 374.90 45.11V45.89H374.74C374.44 46.25 374.09 46.53 373.67 46.72C373.24 46.90 372.78 46.99 372.26 46.99ZM378.96 46.78V46.53L380.08 45.34L379.85 45.75V37.63L380.46 38.76L378.86 37.14V36.82L381.72 35.81H382.17V45.76L381.95 45.36L383.06 46.53V46.78H378.96ZM387.51 46.99C387.12 46.99 386.73 46.96 386.33 46.89C385.93 46.83 385.54 46.74 385.17 46.62C384.81 46.51 384.49 46.37 384.22 46.22L385.04 44.21H385.41L387.23 46.62H385.86L385.84 45.27C386 45.52 386.23 45.72 386.56 45.86C386.88 45.99 387.26 46.06 387.69 46.06C388.08 46.06 388.39 45.99 388.60 45.86C388.82 45.72 388.93 45.52 388.93 45.26C388.93 45.01 388.82 44.81 388.60 44.66C388.39 44.50 388.11 44.37 387.78 44.27C387.45 44.16 387.10 44.06 386.73 43.95C386.37 43.84 386.02 43.70 385.68 43.54C385.36 43.36 385.09 43.14 384.87 42.88C384.66 42.60 384.55 42.25 384.55 41.82C384.55 41.06 384.85 40.48 385.44 40.07C386.04 39.65 386.89 39.45 387.98 39.45C388.33 39.45 388.69 39.48 389.06 39.54C389.42 39.59 389.77 39.67 390.12 39.78C390.46 39.88 390.76 40.01 391.01 40.15L390.19 42.13H389.80L387.97 39.79H389.37L389.39 41.14C389.24 40.90 389.01 40.72 388.70 40.58C388.38 40.45 388.05 40.38 387.71 40.38C387.37 40.38 387.11 40.44 386.92 40.55C386.74 40.66 386.65 40.81 386.65 41.01C386.65 41.26 386.75 41.46 386.96 41.61C387.18 41.77 387.46 41.90 387.79 42.02C388.13 42.13 388.48 42.25 388.84 42.36C389.21 42.48 389.57 42.62 389.90 42.79C390.24 42.95 390.51 43.17 390.72 43.44C390.93 43.70 391.03 44.04 391.03 44.45C391.03 45.27 390.73 45.89 390.12 46.33C389.51 46.77 388.64 46.99 387.51 46.99Z"/></svg>';
function lgTop(sub){return '<div class="lg-wm">'+FAM_LOGO+'</div>'+(sub?'<div class="lg-wms">'+sub+'</div>':'');}
function lgErr(t,ok){var e=document.getElementById("login-err");if(!e)return;var slot=document.querySelector("#login-auth .lg-errslot");if(slot&&e.parentNode!==slot)slot.appendChild(e);
  e.textContent=t;e.classList.toggle("ok",!!ok);e.style.removeProperty("color");e.style.background="";e.style.borderLeftColor="";e.style.display="block";}
function lgErrHide(){var e=document.getElementById("login-err");if(e)e.style.display="none";}
function lgAuthMsg(e){var m=String((e&&e.message)||"");
  if(/invalid login credentials/i.test(m))return "That email and password don’t match. Check the email, or tap “Forgot your password?”.";
  if(/not confirmed/i.test(m))return "This email hasn’t been confirmed yet. Ask "+FAM_ADMIN_NAME+" to tick Auto Confirm for it in Supabase.";
  if((e&&e.name==="TypeError")||/fetch|network|load failed/i.test(m))return "No signal. The first sign-in on a phone needs signal. Try again when you’ve a bar or two.";
  if(/rate|too many/i.test(m))return "Too many tries. Wait a few minutes, then try again.";
  return "Couldn’t sign in: "+(m||"try again");}
function lgProfilePlain(em,u){var P=devProfiles().filter(function(x){return x.email!==em;});P.push({email:em,name:u.name,label:famRoleLabel(u),pin:"",refresh:""});devProfilesSave(P);}
function lgCacheUser(user){try{var c=Object.assign({},user);delete c.photo;var em=String(c.email||authEmail()||"").toLowerCase();
    if(!famShared())localStorage.setItem("nspca-user-cache",JSON.stringify(c));
    var P=devProfiles();var me=P.find(function(x){return String(x.email||"").toLowerCase()===em;});if(me){me.name=user.name;me.label=famRoleLabel(user);if(me.pin||me.bio)me.user=c;else delete me.user;devProfilesSave(P);}}catch(e){}}
async function famBioCreate(em,name){var cred=await navigator.credentials.create({publicKey:{challenge:famRand(32),rp:{name:"NSPCA Longford"},user:{id:new TextEncoder().encode(em).slice(0,64),name:em,displayName:name||em},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"discouraged"},timeout:60000,attestation:"none"}});return cred?famB64(cred.rawId):"";}
function devProfileForget(email){devProfilesSave(devProfiles().filter(function(x){return x.email!==email;}));renderLoginState();}
async function finishAuthLogin(user){LOGGED_IN=true;CURRENT_USER=user;window._wnShownSession=false;window._lgStage="";window._loginWho="";window._loginFull=false;window._setPw=false;
  localStorage.setItem("nspca-intake-auth",user.code||("EMAIL:"+user.email));localStorage.setItem("nspca-user-name",user.name);localStorage.setItem("nspca-user-role",user.role||"staff");lgCacheUser(user);
  window._prevLogin=userLastLogin(user.code||user.email);window._catchupDismissed=false;recordLastLogin(user.code||user.email);bumpActivity();setupAutoLogout();await refreshAllUsers();setTimeout(function(){famDevBeat(true);if(user.role==="admin")famWaitList();},1500);if(goHomeApp(user,!!window._explicitLogin))return;window._explicitLogin=false;await famEnterAppSafe();}
async function doEmailLogin(){var em=((document.getElementById("login-email")||{}).value||"").trim().toLowerCase();var pw=(document.getElementById("login-pass")||{}).value||"";var btn=document.getElementById("login-btn2");
  if(!em){lgErr("Type your work email.");return;}if(!pw){lgErr("Type your password.");return;}
  lgErrHide();btn.textContent="Signing in…";btn.disabled=true;var au;
  try{window._explicitLogin=true;au=await authSignIn(em,pw);}catch(e){btn.textContent="Sign in";btn.disabled=false;lgErr(lgAuthMsg(e));return;}
  window._lgPwOwn=!!(au&&au.user_metadata&&au.user_metadata.pw_own);await lgAfterPassword(em);}
async function lgAfterPassword(em){window._lgEm=em;var user=await userForEmail(em);
  if(!user){famWaitAdd(em);window._lgStage="wait";renderLoginState();return;}
  if(user.active===false){await authSignOut();window._lgStage="";window._loginFull=true;window._lgPrefill=em;renderLoginState();lgErr("This account is switched off. Ask "+FAM_ADMIN_NAME+" if that’s a mistake.");return;}
  window._lgUser=user;
  if(!window._lgPwOwn){window._lgStage="";window._setPw=true;window._lgSetPwFirst=true;renderLoginState();return;}
  await lgQuickOrIn();}
async function lgQuickOrIn(){var u=window._lgUser,em=window._lgEm;window._setPw=false;window._lgStage="";
  if(famShared()){await finishAuthLogin(u);return;}
  var prev=devProfiles().find(function(x){return x.email===em;});var asked=false;try{asked=!!localStorage.getItem("nspca-pin-asked:"+em);}catch(_e){}
  if(prev&&(prev.pin||prev.bio)){await devProfileKeep(em,u.name);await finishAuthLogin(u);return;}
  if(asked){lgProfilePlain(em,u);await finishAuthLogin(u);return;}
  window._lgQ={pin:true,bio:false,none:false};window._lgStage="quick";renderLoginState();}
function lgQuickTick(k){var q=window._lgQ||{};if(k==="none")q={pin:false,bio:false,none:true};else{q[k]=!q[k];q.none=!q.pin&&!q.bio;}window._lgQ=q;renderLoginState();}
async function lgQuickGo(){var q=window._lgQ||{},em=window._lgEm,u=window._lgUser;if(!u)return;try{localStorage.setItem("nspca-pin-asked:"+em,"1");}catch(_e){}
  if(!q.pin&&!q.bio){lgProfilePlain(em,u);await finishAuthLogin(u);return;}
  await devProfileKeep(em,u.name);
  if(q.bio){try{var id=await famBioCreate(em,u.name);if(id){var P=devProfiles();var me=P.find(function(x){return x.email===em;});if(me){me.bio=id;devProfilesSave(P);}}}
    catch(e){if(!q.pin){lgErr(e&&e.name==="NotAllowedError"?"Fingerprint wasn’t set up. Pick a PIN instead, or Neither.":"This phone couldn’t set up fingerprint. Pick a PIN instead, or Neither.");return;}}}
  if(q.pin){window._lgStage="pinset";window._lgPin1="";window._pinBuf="";renderLoginState();return;}
  await finishAuthLogin(u);}
async function lgPinSetDone(pin){if(!window._lgPin1){window._lgPin1=pin;window._pinBuf="";renderLoginState();return;}
  if(pin!==window._lgPin1){window._lgPin1="";window._pinBuf="";renderLoginState();lgErr("Those didn’t match. Start again.");return;}
  var em=window._lgEm,u=window._lgUser;var P=devProfiles();var me=P.find(function(x){return x.email===em;});if(me){me.pin=await pinHash(em,pin);me.bad=0;devProfilesSave(P);}
  window._lgPin1="";await finishAuthLogin(u);}
async function lgCheckAgain(){var em=window._lgEm;var u=await userForEmail(em);if(!u){renderLoginState();lgErr("Still waiting. "+FAM_ADMIN_NAME+" hasn’t added "+em+" yet.");return;}await lgAfterPassword(em);}
async function lgWaitOut(){await authSignOut();window._lgStage="";window._loginFull=true;window._lgPrefill="";renderLoginState();}
async function doPinUnlock(email){var pin=window._pinBuf||((document.getElementById("login-pin")||{}).value||"");var P=devProfiles();var p=P.find(function(x){return x.email===email;});if(!p)return;
  if(!p.pin){lgUsePassword(email);return;}
  if(await pinHash(email,pin)!==p.pin){p.bad=(p.bad||0)+1;window._pinBuf="";var _pi=document.getElementById("login-pin");if(_pi)_pi.value="";lgPinDraw();
    if(p.bad>=5){p.pin="";p.bad=0;if(!p.bio){p.refresh="";delete p.user;}devProfilesSave(P);try{localStorage.removeItem("nspca-pin-asked:"+email);}catch(_e){}
      famSecLog("5 wrong PINs for "+(p.name||email)+" on the "+famDevLabel(),"");lgUsePassword(email);lgErr("Five wrong PINs, so the PIN is off on this phone. Sign in with your password, then set a new one.");return;}
    devProfilesSave(P);var left=5-p.bad;lgErr("Wrong PIN. "+left+(left===1?" try":" tries")+" left, then it asks for your password.");return;}
  if(p.bad){p.bad=0;devProfilesSave(P);}
  await devUnlock(email);}
async function devUnlock(email){var p=devProfiles().find(function(x){return x.email===email;});if(!p)return;
  AUTH={access_token:"",refresh_token:p.refresh,expires_at:0,user:{email:email}};var ok=await authRefresh();
  if(!ok&&window._authNetFail){
    if(p.user){AUTH.expires_at=1;try{localStorage.setItem("nspca-auth",JSON.stringify(AUTH));}catch(e){}window._authOffline=true;await finishAuthLogin(Object.assign({},p.user));return;}
    AUTH=null;lgErr("No signal, and this phone hasn’t got you saved for offline yet. Try again when there’s signal.");return;}
  if(!ok){var P=devProfiles();var me=P.find(function(x){return x.email===email;});if(me){me.refresh="";delete me.user;devProfilesSave(P);}lgUsePassword(email);lgErr("Your sign-in on this phone has run out. Sign in with your password once.");return;}
  var user=await userForEmail(email);if(!user&&p.user&&lgOffline())user=Object.assign({},p.user);
  if(!user){famWaitAdd(email);window._lgEm=email;window._lgStage="wait";renderLoginState();return;}
  if(user.active===false){await authSignOut();window._loginWho="";renderLoginState();lgErr("This account is switched off. Ask "+FAM_ADMIN_NAME+" if that’s a mistake.");return;}
  var p2=devProfiles();var mine=p2.find(function(x){return x.email===email;});if(mine){mine.refresh=AUTH.refresh_token;devProfilesSave(p2);}await finishAuthLogin(user);}
async function doForgot(){var em=((document.getElementById("login-email")||{}).value||"").trim().toLowerCase();
  if(!em){lgErr("Type your email first, then tap “Forgot your password?”.");return;}
  var ok=await authRecover(em);lgErr(ok?"A reset link is on its way to "+em+". Open it on this phone.":"Couldn’t send a reset link just now. Ask "+FAM_ADMIN_NAME+" to reset your password.",ok);}
async function authSetPassword(){var pw=(document.getElementById("setpw-1")||{}).value||"";var pw2=(document.getElementById("setpw-2")||{}).value||"";
  if(pw.length<10){lgErr("At least 10 characters. A short sentence works.");return;}if(pw!==pw2){lgErr("The two don’t match.");return;}
  var go=document.getElementById("setpw-go");if(go){go.disabled=true;go.textContent="Saving…";}
  try{if(AUTH&&AUTH.expires_at&&AUTH.expires_at<Date.now()+60000){try{await authRefresh();}catch(e){}}
    var r=await fetch(SUPABASE_URL+"/auth/v1/user",{method:"PUT",headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+authToken(),"Content-Type":"application/json"},body:JSON.stringify({password:pw,data:{pw_own:true}})});
    var d={};try{d=await r.json();}catch(e){}
    if(!r.ok){var m=String(d.msg||d.message||d.error_description||"");throw new Error(/different from the old/i.test(m)?"that’s the starting password. Pick a new one.":/weak|short|pwned|leaked/i.test(m)?"that one’s too easy to guess. Try a longer one.":m||("error "+r.status));}
    try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}
    var em=String(authEmail()||(d&&d.email)||"").toLowerCase();window._lgEm=em;window._lgPwOwn=true;window._setPw=false;window._lgSetPwFirst=false;
    if(!window._lgUser||String(window._lgUser.email||"").toLowerCase()!==em){var u=await userForEmail(em);if(!u){window._lgStage="wait";renderLoginState();return;}if(u.active===false){await authSignOut();renderLoginState();lgErr("This account is switched off. Ask "+FAM_ADMIN_NAME+" if that’s a mistake.");return;}window._lgUser=u;}
    await lgQuickOrIn();}
  catch(e){if(go){go.disabled=false;go.textContent="Save password";}lgErr("Couldn’t save it: "+((e&&e.message)||"try again"));}}
function lgPwMeter(v){var m=document.getElementById("lg-meter");if(!m)return;var n=String(v||"").length;m.style.width=Math.min(100,Math.round(n/14*100))+"%";m.style.background=n>=10?"#c6e76c":"#f59e0b";}
function lgUsePassword(em){window._loginWho="";window._loginFull=true;window._lgPrefill=em||"";window._lgStage="";renderLoginState();}
function lgNotMe(){window._loginWho="";window._pinBuf="";renderLoginState();}
function lgSomeoneNew(){window._loginWho="";window._loginFull=true;window._lgPrefill="";renderLoginState();}
function lgPad(left){return '<div class="lg-pad">'+["1","2","3","4","5","6","7","8","9"].map(function(n){return '<span onclick="lgPinKey(\''+famJsq(n)+'\')">'+n+'</span>';}).join("")+left+'<span onclick="lgPinKey(\'0\')">0</span><span class="x" onclick="lgPinKey(\'del\')" aria-label="Delete"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg></span></div>'
  +'<input id="login-pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px" oninput="lgPinSync(this.value)">';}
function lgDots(){return '<div class="lg-dots" id="lg-dots"><i></i><i></i><i></i><i></i></div>';}
function lgFocusPin(){setTimeout(function(){var e=document.getElementById("login-pin");if(e&&window.matchMedia&&!window.matchMedia("(pointer:coarse)").matches)e.focus();},50);}
function renderLoginState(){var box=document.getElementById("login-auth");if(!box)return;var mode=window._loginMode||"auth";var err=document.getElementById("login-err");
  if(err&&box.contains(err))box.parentNode.insertBefore(err,box.nextSibling);
  var keep=!!window._loginKeepErr;if(err&&!keep){err.style.display="none";}window._loginKeepErr=false;var v=document.getElementById("login-ver");if(v)v.textContent="v"+APP_VERSION;
  var scr=document.getElementById("login-screen");var wide=false;var h="";
  var F=function(id,type,ph,extra,val){return '<div class="lg-f"><label for="'+id+'">'+ph+'</label><input id="'+id+'" type="'+type+'" '+(extra||"")+(val?' value="'+famEsc(val)+'"':'')+'></div>';};
  var shared=famShared();var prof=shared?[]:devProfiles();var who=window._loginWho||"";var stage=window._lgStage||"";var off=lgOffline();
  if(window._setPw){
    h=lgTop()+'<h1>Choose your own password</h1><div class="lg-sub">'+(window._lgSetPwFirst?FAM_ADMIN_NAME+" gave you a starting one. Pick something only you know.":"Pick something only you know.")+'</div><div class="lg-errslot"></div>'
      +F("setpw-1","password","New password",'autocomplete="new-password" oninput="lgPwMeter(this.value)"')+'<div class="lg-meter"><i id="lg-meter"></i></div>'
      +F("setpw-2","password","Again",'autocomplete="new-password" onkeydown="if(event.key===\'Enter\')authSetPassword()"')
      +'<button class="lg-btn" id="setpw-go" onclick="authSetPassword()">Save password</button><div class="lg-bot lg-fine">At least 10 characters. A short sentence is easiest to remember.</div>';
  }else if(stage==="wait"){
    h=lgTop()+'<h1>Nearly there</h1><div class="lg-sub">You’re signed in, but '+FAM_ADMIN_NAME+' hasn’t let you into the apps yet.</div><div class="lg-errslot"></div><div class="lg-opts">'
      +'<div class="lg-opt on still"><i></i><div><b>Email checked</b><small>'+famEsc(window._lgEm||authEmail())+'</small></div></div>'
      +'<div class="lg-opt still"><i></i><div><b>Waiting for an admin</b><small>Ask '+FAM_ADMIN_NAME+' to add this email in Manage users.</small></div></div></div>'
      +'<div class="lg-bot"><a href="#" onclick="lgCheckAgain();return false">Check again</a><span class="lg-dim"> · </span><a href="#" class="lg-dim" onclick="lgWaitOut();return false">Use a different email</a></div>';
  }else if(stage==="quick"){var q=window._lgQ||{};var u=window._lgUser||{};
    var opt=function(k,b,s){return '<div class="lg-opt'+(q[k]?' on':'')+'" role="checkbox" aria-checked="'+(q[k]?'true':'false')+'" onclick="lgQuickTick(\''+famJsq(k)+'\')"><i></i><div><b>'+b+'</b><small>'+s+'</small></div></div>';};
    h=lgTop()+'<h1>Quicker next time</h1><div class="lg-sub">On this phone, open the app with:</div><div class="lg-errslot"></div><div class="lg-opts">'+opt("pin","A 4-digit PIN","Set it next")+(bioOK()?opt("bio","Fingerprint or face","If this phone has it"):"")+opt("none","Neither","Password every time. Best on a shared phone.")+'</div>'
      +'<button class="lg-btn" onclick="lgQuickGo()">Continue</button><div class="lg-note g">You’re signed in as <b>'+famEsc(lgFirst(u))+'</b>. Anything you save is under your name.</div>';
  }else if(stage==="pinset"){
    h=lgTop()+'<h1>'+(window._lgPin1?"Same PIN again":"Choose a PIN")+'</h1><div class="lg-sub">'+(window._lgPin1?"To make sure.":"4 digits, for this phone only.")+'</div><div class="lg-errslot"></div>'+lgDots()+lgPad('<span class="k" onclick="window._lgStage=\'quick\';renderLoginState()">Back</span>');
  }else if(mode==="code"){
    h=lgTop()+'<h1>Access code</h1><div class="lg-sub">The old way in, until 1 November.</div><div class="lg-errslot"></div><div class="lg-f"><label for="login-code">Code</label><input id="login-code" type="password" style="letter-spacing:.14em" onkeydown="if(event.key===\'Enter\')doLogin()"></div><button class="lg-btn" id="login-btn" onclick="doLogin()">Enter &rarr;</button><div class="lg-bot"><a href="#" onclick="window._loginMode=\'auth\';renderLoginState();return false">Sign in with email instead</a></div>';
  }else if(prof.length&&!who&&!window._loginFull){var list=off?prof.filter(function(p){return (p.pin||p.bio)&&p.refresh&&p.user;}):prof;
    if(off&&!list.length){h=lgTop()+'<h1>No signal</h1><div class="lg-sub">Nobody is saved for offline on this phone yet. Sign in once with signal, and set a PIN or fingerprint.</div>';}
    else{h=lgTop(off?"":"Dogs · Cats · Stables")+'<h1>'+(off?"No signal":"Who’s this?")+'</h1><div class="lg-sub">'+(off?"You can still get in: your PIN opens the "+famAnimals()+" as they were when this phone last synced.":"Tap your face.")+'</div><div class="lg-errslot"></div><div class="lg-faces">'
      +list.map(function(p){var i=prof.indexOf(p);return '<div class="lg-fc" role="button" tabindex="0" data-em="'+famEsc(p.email)+'" onclick="lgAvTap(this)">'+lgFace(p,i,72)+'<b>'+famEsc(lgFirst(p))+'</b><small>'+famEsc(off?(lgLastSync()||lgMethods(p)):lgMethods(p))+'</small></div>';}).join("")
      +(off?'':'<div class="lg-fc" role="button" tabindex="0" onclick="lgSomeoneNew()"><span class="lg-face add">+</span><b>Someone new</b><small>email once</small></div>')+'</div>'
      +(off?'<div class="lg-note g lg-end">Changes wait on the phone and go up when there’s signal, under your name.</div>':'<div class="lg-bot"><a href="#" onclick="lgSomeoneNew();return false">Not your phone? Use email instead</a></div>');}
  }else if(who){var p=prof.find(function(x){return x.email===who;})||{};var pi=prof.indexOf(p);window._pinBuf="";var bio=!!(p.bio&&bioOK());
    h=lgTop()+'<div class="lg-who">'+lgFace(p,pi<0?0:pi,52)+'<div><b>'+famEsc(lgFirst(p))+'</b><small>'+famEsc(off?(lgLastSync()||p.label||""):(p.label||""))+'</small></div></div><div class="lg-errslot"></div>'
      +(p.pin?lgDots()+lgPad(bio?'<span class="k" onclick="bioUnlock(window._loginWho)">Finger</span>':'<span class="k" onclick="lgNotMe()">Not you?</span>'):'<button class="lg-btn" onclick="bioUnlock(window._loginWho)">Use fingerprint or face</button>')
      +'<div class="lg-bot"><a href="#" onclick="lgUsePassword(window._loginWho);return false">Forgot your PIN? Use your password</a>'+(bio||!p.pin?'<span class="lg-dim"> · </span><a href="#" class="lg-dim" onclick="lgNotMe();return false">Not you?</a>':'')+'</div>'
      +(off?'<div class="lg-note g">No signal: changes wait on the phone and go up when there’s signal, under your name.</div>':'');
    window._pinWho=who;
  }else{var pre=window._lgPrefill||"";wide=window.innerWidth>=900;
    var form='<h1>Sign in</h1><div class="lg-sub">'+(shared?"Shared computer: you’re signed out after "+getAutoLogoutMins()+" minutes without use.":pre?"Your work email and password.":"Your work email and password. You’ll only do this once on this "+(window.innerWidth>=900?"computer.":"phone."))+'</div><div class="lg-errslot"></div>'
      +F("login-email","email","Email",'autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false"',pre)+F("login-pass","password","Password",'autocomplete="current-password" onkeydown="if(event.key===\'Enter\')doEmailLogin()"')
      +'<button class="lg-btn" id="login-btn2" onclick="doEmailLogin()">Sign in</button><div class="lg-lnk2"><a href="#" onclick="doForgot();return false">Forgot your password?</a>'+(prof.length?'<span class="lg-dim"> · </span><a href="#" class="lg-dim" onclick="window._loginFull=false;window._lgPrefill=\'\';renderLoginState();return false">Back</a>':'')+'</div>';
    var codes=Date.now()<FAM_CODES_END.getTime()&&!pre?'<div class="lg-note y lg-end">Used to sign in with a code? Codes stop on 1 November. Ask '+FAM_ADMIN_NAME+' for your email sign-in. <a href="#" onclick="window._loginMode=\'code\';renderLoginState();return false">Use your code for now</a></div>':'';
    if(wide){var d=new Date();h='<div class="lg-split"><div class="lg-left">'+lgTop()+'<div class="lg-day">'+d.toLocaleDateString("en-IE",{weekday:"long"})+' '+d.getDate()+'</div><div class="lg-sub">Isolation, Cattery and Stables. Sign in to see the animals.</div><div class="lg-apps"><div><b>Dogs</b><small>isolation</small></div><div><b>Cats</b><small>cattery</small></div><div><b>Stables</b><small>equine</small></div></div></div><div class="lg-right">'+form+codes+'</div></div>';}
    else h=lgTop()+form+codes;}
  if(scr)scr.classList.toggle("lg-wide",wide);
  box.innerHTML=h;
  if(err&&keep&&err.style.display!=="none"){var slot=box.querySelector(".lg-errslot");if(slot)slot.appendChild(err);}
  if(window._loginWho||stage==="pinset")lgFocusPin();
  else setTimeout(function(){var e=document.getElementById(window._setPw?"setpw-1":document.getElementById("login-email")&&document.getElementById("login-email").value?"login-pass":"login-email")||document.getElementById("login-code");if(e&&window.matchMedia&&!window.matchMedia("(pointer:coarse)").matches)e.focus();},50);}
function lgAvTap(el){var em=el.getAttribute("data-em")||"";var p=devProfiles().find(function(x){return x.email===em;});if(!p)return;
  if(!(p.pin||p.bio)||!p.refresh){lgUsePassword(em);return;}
  window._loginWho=em;renderLoginState();if(p.bio&&bioOK())bioUnlock(em);}
function lgPinSync(v){window._pinBuf=String(v||"").replace(/\D/g,"").slice(0,4);lgPinDraw();lgPinFull();}
function lgPinKey(k){var b=window._pinBuf||"";if(k==="del")b=b.slice(0,-1);else if(b.length<4)b+=k;window._pinBuf=b;var inp=document.getElementById("login-pin");if(inp)inp.value=b;lgPinDraw();lgPinFull();}
function lgPinFull(){var b=window._pinBuf||"";if(b.length!==4)return;if(window._lgStage==="pinset"){setTimeout(function(){lgPinSetDone(b);},120);return;}doPinUnlock(window._pinWho);}
function lgPinDraw(){var d=document.getElementById("lg-dots");if(!d)return;var n=(window._pinBuf||"").length;Array.prototype.forEach.call(d.children,function(el,i){el.className=i<n?"f":"";});}
window.addEventListener("online",function(){if(window._authOffline&&typeof AUTH!=="undefined"&&AUTH&&AUTH.refresh_token){authRefresh().then(function(ok){if(ok)window._authOffline=false;});}lgNetChanged();});
window.addEventListener("offline",lgNetChanged);
function lgNetChanged(){var s=document.getElementById("login-screen");if(!s||s.style.display==="none")return;if(window._loginWho||window._loginFull||window._lgStage||window._setPw)return;renderLoginState();}
(function(){if(document.getElementById("fam-lg-css"))return;var st=document.createElement("style");st.id="fam-lg-css";st.textContent=[
".lg .lg-top{display:none}#login-auth{flex:1;display:flex;flex-direction:column}",
".lg .lg-wm{line-height:0}.lg .lg-wm svg{display:block;height:40px;width:auto;max-width:100%}.lg-left .lg-wm svg{height:48px}.lg .lg-wm-x{color:#c6e76c;font-weight:900;font-size:22px;letter-spacing:-.02em;line-height:1.1}.lg .lg-wms{font-size:12px;color:#9a9fa8;font-weight:600;margin-top:3px}",
".lg h1{font-size:24px;font-weight:800;letter-spacing:-.015em;margin:30px 0 0;line-height:1.2}.lg .lg-sub{font-size:13.5px;color:#cdd3df;font-weight:500;margin-top:8px;line-height:1.5}",
".lg .lg-err{background:#4a1f24;border-left:0;border-radius:10px;color:#fecaca!important;font-size:13px;font-weight:500;line-height:1.45;padding:10px 12px;margin:14px 0 0}.lg .lg-err.ok{background:#23301c;color:#d9f99d!important}",
".lg-faces{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 8px;margin-top:26px}.lg-fc{text-align:center;cursor:pointer;border-radius:14px;padding:4px 2px;-webkit-tap-highlight-color:transparent}.lg-fc:active{transform:scale(.97)}",
".lg-face{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#282932;font-weight:900;flex:none}.lg-fc .lg-face{margin-bottom:8px}.lg-face.add{width:72px;height:72px;background:transparent;border:2px dashed #6b7080;color:#9a9fa8;font-size:24px}",
".lg-fc b{display:block;font-size:13.5px;font-weight:700;color:#fff;line-height:1.25}.lg-fc small{display:block;font-size:11.5px;color:#9a9fa8;margin-top:2px;line-height:1.3}",
".lg-who{display:flex;align-items:center;gap:14px;margin-top:28px}.lg-who b{display:block;font-size:17px;font-weight:800;color:#fff}.lg-who small{display:block;font-size:12.5px;color:#9a9fa8;margin-top:1px}",
".lg .lg-dots{display:flex;gap:14px;justify-content:center;margin-top:20px}.lg .lg-dots i{width:13px;height:13px;border-radius:50%;border:2px solid #8a8f9c;display:block}.lg .lg-dots i.f{background:#c6e76c;border-color:#c6e76c}",
".lg .lg-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}.lg .lg-pad span{background:#3a3b46;border-radius:12px;height:54px;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:700;color:#fff;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}.lg .lg-pad span:active{background:#4a4c59}",
".lg .lg-pad span.k{background:transparent;color:#c6e76c;font-size:14px;font-weight:800}",
".lg .lg-f{margin-top:12px;background:#3a3b46;border-radius:12px;padding:9px 14px 10px;border:1.5px solid transparent}.lg .lg-f:focus-within{border-color:#c6e76c}.lg .lg-f label{font-size:11.5px;font-weight:500;letter-spacing:0;text-transform:none;color:#9a9fa8;margin:0 0 2px}.lg .lg-f input,.lg .lg-f input:focus{background:transparent!important;border:0!important;border-radius:0;padding:2px 0 0!important;min-height:0!important;box-shadow:none!important;font-size:16px!important;font-weight:500;color:#fff;outline:none;width:100%;height:auto}",
".lg .lg-btn{margin-top:14px;font-weight:800;border-radius:12px;padding:14px}.lg-lnk2{text-align:center;margin-top:14px;font-size:13.5px;font-weight:700}.lg-lnk2 a,.lg-bot a{color:#c6e76c;text-decoration:none}",
".lg-bot{margin-top:auto;padding-top:22px;text-align:center;font-size:13.5px;font-weight:700}.lg-bot.lg-fine{color:#9a9fa8;font-weight:500;font-size:12.5px;text-align:left;line-height:1.5}.lg .lg-dim,.lg-bot a.lg-dim,.lg-lnk2 a.lg-dim{color:#9a9fa8}",
".lg-meter{height:4px;border-radius:2px;background:#3a3b46;margin-top:8px;overflow:hidden}.lg-meter i{display:block;height:100%;width:0;background:#f59e0b;transition:width .15s}",
".lg-opts{display:flex;flex-direction:column;gap:10px;margin-top:20px}.lg-opt{display:flex;gap:12px;align-items:flex-start;background:#3a3b46;border-radius:12px;padding:12px 14px;cursor:pointer}.lg-opt.still{cursor:default}",
".lg-opt i{width:20px;height:20px;border-radius:5px;border:2px solid #9a9fa8;flex:none;margin-top:1px}.lg-opt.on i{background:#c6e76c;border-color:#c6e76c}.lg-opt b{display:block;font-size:14px;font-weight:700;color:#fff}.lg-opt small{display:block;font-size:12px;color:#9a9fa8;margin-top:2px;line-height:1.45}",
".lg-note{border-radius:12px;padding:11px 13px;font-size:13px;line-height:1.5;margin-top:16px}.lg-note.y{background:#fef3c7;color:#92400e;font-weight:600}.lg-note.y a{color:#92400e;font-weight:800}.lg-note.g{background:#23301c;color:#d9f99d}.lg-note.g b{color:#fff}.lg-end{margin-top:auto}",
".lg-faces+.lg-note.lg-end,.lg-lnk2+.lg-note.lg-end{margin-top:auto}#login-auth>.lg-note.lg-end{margin-top:auto}#login-auth>.lg-lnk2{margin-bottom:22px}",
".lg.lg-wide .lg-wrap{max-width:1120px}.lg-split{display:grid;grid-template-columns:1.15fr 1fr;border-radius:22px;overflow:hidden;background:#282932;box-shadow:0 30px 60px -30px rgba(0,0,0,.6);min-height:440px;margin:auto 0}",
".lg-left{background:linear-gradient(160deg,#30313b,#22232b);padding:38px 44px}.lg-right{padding:38px 44px;display:flex;flex-direction:column}.lg-right h1{margin-top:0}",
".lg-day{font-size:54px;font-weight:900;color:#c6e76c;letter-spacing:-.035em;line-height:1;margin-top:34px}.lg-apps{display:flex;gap:28px;margin-top:26px}.lg-apps b{display:block;font-size:22px;font-weight:800;color:#fff}.lg-apps small{display:block;color:#9a9fa8;font-size:12px;margin-top:3px}",
".lg.lg-wide #login-auth{justify-content:center}.lg-right .lg-lnk2{margin-bottom:18px}"
].join("");document.head.appendChild(st);})();
function seenBeat(){if(window._seenOff||typeof LOGGED_IN==="undefined"||!LOGGED_IN||!supabaseClient||!CURRENT_USER)return;if(Date.now()-(_lastActivity||0)>5*60000)return;
  var em=CURRENT_USER.email||authEmail()||"";var q=supabaseClient.from("users").update({last_seen_at:new Date().toISOString(),last_seen_app:(typeof APP_HOME!=="undefined"?APP_HOME:"")});var p=CURRENT_USER.code?q.eq("code",CURRENT_USER.code):(em?q.eq("email",em):null);
  if(p)Promise.resolve(p).then(function(r){if(r&&r.error)window._seenOff=true;},function(){});}
setInterval(seenBeat,180000);
// Built-in defaults for the whole family (Manage users → Edit user can still change them):
// Sarah (Assistant Supervisor) works in Cats and is look only elsewhere. Everyone else: set in Manage users.
function lookBuiltin(u){if(!u)return null;if(u.role==="asst"&&/^sarah\b/i.test(String(u.name||""))&&u.code!=="SAR01")return{home:"cats",look:true};return null;}
function famTitle(u){u=u||{};return String(u.title||"").trim();}
function lookOnlyFor(u){if(!u)return false;var m={};try{m=unitSetting("lookOnly")||{};}catch(e){}var em=String(u.email||"").toLowerCase();
  if(em&&Object.prototype.hasOwnProperty.call(m,em))return !!m[em];if(u.code&&Object.prototype.hasOwnProperty.call(m,u.code))return !!m[u.code];var b=lookBuiltin(u);return !!(b&&b.look);}
function isLookOnly(){try{if(!LOGGED_IN||!CURRENT_USER)return false;if(currentRole()==="admin")return false;if(!lookOnlyFor(CURRENT_USER))return false;var h=homeAppFor(CURRENT_USER)||"dogs";return h!==APP_HOME;}catch(e){return false;}}
function famBoot(){
  authLoad();try{if(prefGet("bigtext","0")==="1")document.documentElement.classList.add("bigtext");}catch(e){}
  (function(){var h=location.hash||"";if(h.indexOf("error")<0||h.indexOf("access_token=")>=0)return;var q={};h.replace(/^#/,"").split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)q[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1).replace(/\+/g," "));});if(!q.error&&!q.error_code)return;
    window._authLinkErr=q.error_code==="otp_expired"?"That email link has expired or was already used. Each link works once, for 24 hours \u2014 and some email apps open links in the background before you do. Ask an admin for a new invite, or type your email above and tap \u201cForgotten your password?\u201d":"That sign-in link didn\u2019t work"+(q.error_description?" \u2014 "+q.error_description:"")+". Ask an admin for a new invite.";
    try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}
    setTimeout(function(){var er=document.getElementById("login-err");if(er&&window._authLinkErr){er.textContent=window._authLinkErr;er.style.display="block";}},700);})();
  (function(){var p=authFromHash();if(p){authSave({access_token:p.access_token,refresh_token:p.refresh_token||"",expires_at:Date.now()+((parseInt(p.expires_in)||3600)*1000),user:{email:""}});window._setPw=true;fetch(SUPABASE_URL+"/auth/v1/user",{headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+p.access_token}}).then(function(r){return r.json();}).then(function(u){if(u&&u.email){AUTH.user={email:u.email,id:u.id};authSave(AUTH);}renderLoginState();});localStorage.removeItem("nspca-intake-auth");}})();
  if(famShared()){var la=0;try{la=parseInt(localStorage.getItem("nspca-last-active")||"0",10)||0;}catch(e){}if(Date.now()-la>getAutoLogoutMins()*60000){famWipeShared();var A0=AUTH;AUTH=null;try{localStorage.removeItem("nspca-auth");localStorage.removeItem("nspca-intake-auth");}catch(e){}if(A0&&A0.access_token){try{fetch(SUPABASE_URL+"/auth/v1/logout?scope=local",{method:"POST",headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+A0.access_token}});}catch(e){}}}}
  var savedCode=localStorage.getItem("nspca-intake-auth");
  if(savedCode&&famRetired(savedCode)){try{localStorage.removeItem("nspca-intake-auth");}catch(e){}savedCode="";}
  // signed in by email: the saved session is what counts, whatever is in nspca-intake-auth
  if(AUTH&&AUTH.refresh_token&&savedCode){savedCode="";(async function(){var ok=await authRefresh();if(!ok&&window._authNetFail){var c=null;try{c=JSON.parse(localStorage.getItem("nspca-user-cache")||"null");}catch(e){}if(c&&c.name&&String(c.email||"").toLowerCase()===String(authEmail()).toLowerCase()){AUTH.expires_at=1;window._authOffline=true;await finishAuthLogin(c);return;}}var u=ok?await userForEmail(authEmail()):null;if(u&&u.active!==false){await finishAuthLogin(u);}else{authSave(null);showScreen("login-screen");}})();}
  if(savedCode){try{localStorage.removeItem("nspca-intake-auth");}catch(e){}showScreen("login-screen");
  }else{showScreen("login-screen");}
}

// ── Shared hooks: each app may define these; family.js falls back when one is missing ──
//   famEnterApp()            after sign-in: load the app's records and show its board
//   appWeek(me, monday)      { stats:[[n,"label"],…], names:[…] } for "Your week" in this app
//   appProfileExtra(role)    extra cards at the foot of My profile (admin tools, version)
var FAMILY_VERSION="2.1";
var FAM_APPS=[["dogs","Dogs","dog_history","index.html"],["cats","Cats","cat_history","cats.html"],["stables","Stables","stables_history","stables.html"]];
function famAppName(k){var a=FAM_APPS.filter(function(x){return x[0]===k;})[0];return a?a[1]:(k||"");}
function famHere(){return (typeof APP_HOME!=="undefined"&&APP_HOME)||"dogs";}
function famEsc(v){return (v===null||v===undefined?"":""+v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
// text inside onclick="fn('...')"
function famJsq(v){return famEsc(String(v===null||v===undefined?"":v).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\r?\n/g,"\\n"));}
// an image address that can't break out of src="..." or url(...)
function famSrc(p){var r=(typeof blobSrc==="function")?blobSrc(p):p;return String(r||"").replace(/["'<>()\s\\]/g,function(c){return "%"+("0"+c.charCodeAt(0).toString(16).toUpperCase()).slice(-2);});}
async function famEnterAppSafe(){if(typeof famEnterApp==="function")return famEnterApp();if(typeof loadRecordsList==="function")await loadRecordsList();if(typeof showDashboard==="function")showDashboard();}
function famRoleLabel(u){u=u||{};if(famTitle(u))return famTitle(u);var r=u.role||"staff";return r==="admin"?"Admin":r==="manager"?"Manager":r==="supervisor"?"Supervisor":r==="asst"?"Assistant Supervisor":r==="coordinator"?"Rehoming Co-Ordinator":r==="trainer"?"Dog Trainer & Behaviour Specialist":r==="director"?"Director":"Staff";}
function famMe(){var me=CURRENT_USER||{name:currentName(),code:localStorage.getItem("nspca-intake-auth")||"",role:currentRole()};var row=(getAllUsersSync()||[]).filter(function(u){return u.code===me.code;})[0];return Object.assign({},row||{},me);}

// ── A small bottom sheet that every app can use (own styles, so it looks the same everywhere) ──
function famSheet(title,body){var o=document.getElementById("famsheet");if(!o){o=document.createElement("div");o.id="famsheet";document.body.appendChild(o);}
  o.innerHTML='<div class="fam-bg" onclick="famSheetClose()"></div><div class="fam-sh" role="dialog" aria-label="'+famEsc(title)+'"><div class="fam-grab"></div><div class="fam-shh"><b>'+famEsc(title)+'</b><span onclick="famSheetClose()">Cancel</span></div><div class="fam-shb">'+body+'</div></div>';
  setTimeout(function(){var e=o.querySelector("input,textarea");if(e)e.focus();},60);}
function famSheetClose(){var o=document.getElementById("famsheet");if(o)o.remove();}
function pwSheet(){famSheet("Change password",'<label class="fam-l">New password <em>10 or more characters</em></label><input id="pw-1" class="fam-in" type="password" autocomplete="new-password">'
  +'<label class="fam-l">Again</label><input id="pw-2" class="fam-in" type="password" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')pwSave()">'
  +'<div id="pw-err" class="fam-err" style="display:none"></div><button class="fam-go" id="pw-go" onclick="pwSave()">Save new password</button>');}
function pwClose(){famSheetClose();}
var FAM_META={phone:["Phone","for the rota and call-outs",false],since:["On the team since","e.g. Mar 2025",false],about:["A line about you","e.g. Intake, assessments and the day reports.",true]};
function famMetaSheet(k){var me=famMe();var f=FAM_META[k];if(!f)return;var v=userMeta(me.code)[k]||"";
  famSheet(f[0],(f[2]?'<textarea id="fam-meta" class="fam-in" rows="3" placeholder="'+famEsc(f[1])+'">'+famEsc(v)+'</textarea>':'<input id="fam-meta" class="fam-in" value="'+famEsc(v)+'" placeholder="'+famEsc(f[1])+'" onkeydown="if(event.key===\'Enter\')famMetaSave(\''+famJsq(k)+'\')">')
    +'<button class="fam-go" onclick="famMetaSave(\''+famJsq(k)+'\')">Save</button>');}
function famMetaSave(k){var me=famMe();var e=document.getElementById("fam-meta");var v=e?e.value.trim():"";setUserMeta(me.code,k,v);try{(_allUsersCache||[]).forEach(function(u){if(u.code===me.code)u[k]=v;});}catch(_e){}famSheetClose();if(typeof miniToast==="function")miniToast("Saved");showDashSection("profile");}

// ── Your week: this app from its own records (appWeek), the others from their change history ──
function famMonday(){var n=new Date();var d=(n.getDay()+6)%7;return new Date(n.getFullYear(),n.getMonth(),n.getDate()-d);}
async function famWeekLoad(me){var W=window._famWeek;var mon=famMonday();var who=[me.name];var em=String(me.email||authEmail()||"").toLowerCase();if(em)who.push(em);
  await Promise.all(FAM_APPS.map(async function(a){var key=a[0];var local=null;try{if(key===famHere()&&typeof appWeek==="function")local=appWeek(me,mon);}catch(e){}
    var rows=[],ok=false;if(supabaseClient){try{var q=supabaseClient.from(a[2]).select("id,changed_at,changed_by,summary");if(q.gte)q=q.gte("changed_at",mon.toISOString());if(q.in)q=q.in("changed_by",who);var r=await q.order("changed_at",{ascending:false}).limit(3000);if(r&&!r.error){ok=true;rows=(r.data||[]).filter(function(x){var c=String(x.changed_by||"");return who.indexOf(c)>=0||who.indexOf(c.toLowerCase())>=0;}).filter(function(x){return new Date(x.changed_at)>=mon;});}}catch(e){}}
    var cnt=function(rx){return rows.filter(function(x){return rx.test(x.summary||"");}).length;};var arrivals=cnt(/^Record created|^Arriv|^New /i);
    if(local){var st=(local.stats||[]).slice(0,4);if(st.length<4)st.push([arrivals,"arrivals"]);W.data[key]={stats:st,names:local.names||[],total:st.reduce(function(t,x){return t+(x[0]||0);},0)};}
    else if(ok){W.data[key]={stats:[[cnt(/days|Day report|day check|Daily check/i),key==="stables"?"day checks":"day reports"],[cnt(/weights|Weigh/i),"weigh-ins"],[arrivals,"arrivals"],[rows.length,"changes"]],names:[],total:rows.length};}
    else W.data[key]={none:true};}));
  W.loading=false;W.at=Date.now();if(window._dashSection==="profile"){var el=document.getElementById("dashboard-content");if(el&&el.querySelector(".fam-pf"))el.innerHTML=renderProfile();}}

// ── My profile: the same page in every app ──
function famRow(label,sub,act){return '<div class="fam-row"><div><b>'+label+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</div>'+(act||'')+'</div>';}
function famSeg(cur,opts,fn){return '<div class="fam-seg">'+opts.map(function(o){return '<span class="'+(String(cur)===String(o[0])?"on":"")+'" onclick="'+fn.replace("%v",o[0])+'">'+o[1]+'</span>';}).join("")+'</div>';}
function renderProfile(){
  var me=famMe();var role=me.role||currentRole();var meta=userMeta(me.code);var email=String(me.email||authEmail()||"");var photo=userPhoto(me.code);var here=famHere();
  if(!window._famWeek||window._famWeek.who!==me.name||(!window._famWeek.loading&&Date.now()-(window._famWeek.at||0)>60000)){window._famWeek={who:me.name,loading:true,data:{}};famWeekLoad(me);}
  var W=window._famWeek;var tab=window._famTab||here;
  var back=(typeof backToDashBtn==="function")?backToDashBtn():'';
  var h='<div class="fam-pf"><div class="fam-top">'+back+'<h2>My profile</h2></div>';
  var av=photo?'<img src="'+famSrc(photo)+'" alt="">':'<span style="background:'+avatarColor(me.name)+'">'+famEsc(initials(me.name))+'</span>';
  h+='<div class="fam-me"><label class="fam-ph">'+av+'<i>Edit</i><input type="file" accept="image/*" style="display:none" onchange="handleAvatarUpload(this)"></label><div class="fam-mt"><b>'+famEsc(me.name)+'</b><small>'+famEsc(famRoleLabel(me))+(email?' · '+famEsc(email):' · code sign-in')+'</small>'+(meta.about?'<div class="fam-ab">'+famEsc(meta.about)+'</div>':'')+(photo?'<u onclick="removeAvatar()">Remove photo</u>':'')+'</div></div>';
  // your week
  var cur=W.data[tab];var pill=function(a){var d=W.data[a[0]];var n=d&&d.stats?d.total:null;return '<span class="'+(tab===a[0]?"on":"")+'" onclick="window._famTab=\''+famJsq(a[0])+'\';showDashSection(\'profile\')">'+a[1]+(n!==null?' <em>'+n+'</em>':'')+'</span>';};
  h+='<div class="fam-card"><div class="fam-lbl">Your week <em>from Monday</em></div><div class="fam-apps">'+FAM_APPS.map(pill).join("")+'</div>'
    +(cur&&cur.stats?'<div class="fam-nums">'+cur.stats.map(function(x){return '<div><b>'+(x[0]||0)+'</b><span>'+famEsc(x[1])+'</span></div>';}).join("")+'</div>'+(cur.names&&cur.names.length?'<div class="fam-names">'+cur.names.slice(0,8).map(function(n){return '<span>'+famEsc(n)+'</span>';}).join("")+(cur.names.length>8?'<span>+'+(cur.names.length-8)+'</span>':'')+'</div>':'')
      :'<div class="fam-wait">'+(W.loading?"Counting…":"Nothing to count here yet.")+'</div>')
    +'</div>';
  // about me
  var ed=function(k){return '<span class="fam-btn" onclick="famMetaSheet(\''+famJsq(k)+'\')">'+(meta[k]?"Edit":"Add")+'</span>';};
  h+='<div class="fam-card"><div class="fam-lbl">About me <em>everyone sees this</em></div>'
    +famRow("Phone",famEsc(meta.phone||"not added"),ed("phone"))+famRow("On the team since",famEsc(meta.since||"not added"),ed("since"))+famRow("A line about you",famEsc(meta.about||"not added"),ed("about"))+'</div>';
  // sign-in
  var pinSet=devProfiles().some(function(p){return p.email===email&&p.pin;});var devices=devProfiles().length;
  h+='<div class="fam-card"><div class="fam-lbl">Sign-in</div>'
    +famRow("Email",email?famEsc(email):"Signed in with a code — ask an admin to add your email")
    +(email?famRow("Password","change it here",'<span class="fam-btn" onclick="pwSheet()">Change</span>')+(famShared()?famRow("PIN on this device","none: this is a shared computer"):famRow("PIN on this device",pinSet?"set · quick unlock":"not set",'<span class="fam-btn" onclick="setDevicePin()">'+(pinSet?"Change":"Set")+'</span>')):'')
    +'</div>';
  // your apps
  var home=(typeof homeAppFor==="function"&&homeAppFor(me))||"dogs";var look=role!=="admin"&&typeof lookOnlyFor==="function"&&lookOnlyFor(me);
  h+='<div class="fam-card"><div class="fam-lbl">Your apps <em>set by an admin</em></div>'+famRow("Opens in","",'<span class="fam-tag g">'+famEsc(famAppName(home))+'</span>')
    +FAM_APPS.filter(function(a){return a[0]!==home;}).map(function(a){return famRow(famEsc(a[1]),"",look?'<span class="fam-tag v">Look only</span>':'<span class="fam-tag">Full use</span>');}).join("")+'</div>';
  // this device
  var on=prefGet("bigtext","0")==="1";
  h+='<div class="fam-card"><div class="fam-lbl">On this device</div>'
    +(famShared()?famRow("Auto sign-out","after "+getAutoLogoutMins()+" minutes untouched, because this is a shared computer"):famRow("Auto sign-out","after this long untouched",famSeg(getAutoLogoutMins(),[[0,"Off"],[15,"15m"],[30,"30m"],[120,"2h"]],"setAutoLogoutMins(%v);showDashSection(&quot;profile&quot;)")))+(role==="admin"?famRow("Shared computer","no faces or PINs, signs out on its own",famSeg(famShared()?"1":"0",[["0","Off"],["1","On"]],"famSetShared(&quot;%v&quot;===&quot;1&quot;)")):(famShared()?famRow("Shared computer","set by an admin"):""))
    +famRow("Larger text","for the corridor, gloves on",famSeg(on?"1":"0",[["0","Off"],["1","On"]],"prefSet(&quot;bigtext&quot;,&quot;%v&quot;)"))
    +(famShared()?"":famDeviceRows())
    +(devices>1?famRow("Others remembered here",(devices-1)+" other"+(devices>2?"s":"")+" can unlock this device",'<span class="fam-btn" onclick="forgetOtherProfiles()">Forget</span>'):'')
    +'</div>';
  if(typeof appProfileExtra==="function"){try{h+=appProfileExtra(role,me)||"";}catch(e){}}
  h+='<div class="fam-out" role="button" tabindex="0" onclick="appConfirm(\'Sign out on this device?\',doLogout)">Sign out</div></div>';
  return h;
}

// ── Shared styles (prefixed fam- so they can't clash with an app's own) ──
(function(){if(document.getElementById("fam-css"))return;var st=document.createElement("style");st.id="fam-css";st.textContent=[
".fam-pf{max-width:640px;margin:0 auto}.fam-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}.fam-top h2{margin:0;font-size:19px;font-weight:800;flex:1}",
".fam-me{background:#282932;color:#fff;border-radius:16px;padding:14px;display:flex;gap:14px;align-items:center;margin-bottom:12px}",
".fam-ph{position:relative;flex:none;cursor:pointer}.fam-ph img,.fam-ph span{width:64px;height:64px;border-radius:50%;border:3px solid #c6e76c;object-fit:cover;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:21px;color:#fff}",
".fam-ph i{position:absolute;bottom:-4px;right:-6px;background:#c6e76c;color:#282932;font-style:normal;font-size:9.5px;font-weight:900;border-radius:8px;padding:2px 6px}",
".fam-mt{min-width:0}.fam-mt b{display:block;font-size:18px}.fam-mt small{display:block;font-size:12px;color:#9a9fa8;font-weight:700;margin-top:2px;overflow-wrap:anywhere}.fam-ab{font-size:12.5px;color:#d6d9df;font-weight:600;margin-top:6px;line-height:1.4}.fam-mt u{display:inline-block;margin-top:6px;font-size:11px;color:#fca5a5;cursor:pointer}",
".fam-card{background:#fff;border:1px solid #e4e7e0;border-radius:14px;padding:11px 13px;margin-bottom:10px}",
".fam-lbl{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:#6b7280;margin-bottom:8px}.fam-lbl em{font-style:normal;letter-spacing:0;text-transform:none;font-weight:600;color:#9a9fa8;margin-left:6px}",
".fam-apps{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}.fam-apps span{font-size:11.5px;font-weight:800;padding:5px 11px;border-radius:20px;border:1.5px solid #e4e7e0;color:#6b7280;cursor:pointer;background:#fff}.fam-apps span.on{background:#282932;color:#c6e76c;border-color:#282932}.fam-apps em{font-style:normal;opacity:.7;margin-left:2px}",
".fam-nums{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.fam-nums div{background:#f6f7f3;border-radius:10px;padding:8px 9px}.fam-nums b{display:block;font-size:18px;font-weight:900;color:#282932}.fam-nums span{font-size:8.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#6b7280}",
".fam-names{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.fam-names span{font-size:11.5px;font-weight:700;background:#f1f3ee;border-radius:20px;padding:3px 10px;color:#3f4250}.fam-wait{font-size:12.5px;color:#9a9fa8;font-weight:600;padding:6px 0}",
".fam-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #f0f1ec}.fam-lbl+.fam-row{border-top:none}.fam-row>div{flex:1;min-width:0}.fam-row b{display:block;font-size:13px;color:#282932}.fam-row small{display:block;font-size:11.5px;color:#6b7280;font-weight:600;overflow-wrap:anywhere}",
".fam-btn{font-size:11.5px;font-weight:800;padding:6px 12px;border-radius:8px;background:#f1f3ee;color:#282932;cursor:pointer;white-space:nowrap}.fam-btn:hover{background:#e7eae2}",
".fam-tag{font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;background:#f0f1ec;color:#6b7280;white-space:nowrap}.fam-tag.g{background:#dcfce7;color:#166534}.fam-tag.v{background:#ede9fe;color:#5b21b6}",
".fam-seg{display:flex;background:#f1f3ee;border-radius:9px;padding:2px;flex:none}.fam-seg span{font-size:11px;font-weight:800;padding:5px 8px;border-radius:7px;color:#6b7280;cursor:pointer}.fam-seg span.on{background:#fff;color:#282932;box-shadow:0 1px 2px rgba(0,0,0,.08)}",
".fam-out{text-align:center;color:#b91c1c;font-size:13px;font-weight:800;padding:12px;cursor:pointer}",
"#famsheet .fam-bg{position:fixed;inset:0;background:rgba(20,21,26,.45);z-index:9998}#famsheet .fam-sh{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:100%;max-width:520px;background:#fff;border-radius:18px 18px 0 0;z-index:9999;padding:8px 16px 20px;box-shadow:0 -10px 30px rgba(0,0,0,.18)}",
"#famsheet .fam-grab{width:40px;height:4px;border-radius:4px;background:#d6d9df;margin:4px auto 10px}#famsheet .fam-shh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}#famsheet .fam-shh b{font-size:16px}#famsheet .fam-shh span{font-size:12px;font-weight:800;background:#c6e76c;color:#282932;border-radius:20px;padding:5px 12px;cursor:pointer}",
"#famsheet .fam-l{display:block;font-size:12.5px;font-weight:800;margin:8px 0 5px;color:#282932}#famsheet .fam-l em{font-style:normal;font-weight:600;color:#9a9fa8;margin-left:6px}#famsheet .fam-in{width:100%;font:inherit;font-size:16px;padding:10px 12px;border:1.5px solid #e4e7e0;border-radius:10px;box-sizing:border-box}#famsheet .fam-in:focus{outline:none;border-color:#a3c94a}",
"#famsheet .fam-err{color:#b91c1c;font-size:12.5px;font-weight:700;margin:8px 0 0}#famsheet .fam-go{width:100%;margin-top:12px;border:none;background:#c6e76c;color:#282932;font:inherit;font-size:14px;font-weight:800;padding:12px;border-radius:12px;cursor:pointer}",
"@media(max-width:420px){.fam-nums b{font-size:16px}.fam-seg span{padding:5px 6px}}"
].join("\n");(document.head||document.documentElement).appendChild(st);})();

function userTap(code){var u=getAllUsersSync().find(function(x){return x.code===code;});if(!u)return;if(u.source==="app"){miniToast(u.name+" is built into the app — changed in the code");return;}showEditUserModal(code);}
function renderUsersAdmin(){
  var all=getAllUsersSync().slice().sort(function(a,b){var o={admin:0,manager:1,supervisor:2,asst:3,coordinator:4,trainer:5};var x=o[a.role]==null?9:o[a.role],y=o[b.role]==null?9:o[b.role];return x-y||(a.name||"").localeCompare(b.name||"");});
  var shared=function(u){return famRetired(u);};
  var people=all.filter(function(u){return !shared(u);}),codes=all.filter(shared);
  var now=Date.now(),me=(CURRENT_USER||{}).code;
  var emailN=all.filter(function(u){return u.email&&u.active!==false;}).length;var invited=all.filter(function(u){return u.email&&u.active===false;});
  var quiet=people.filter(function(u){var t=userLastIn(u);return t&&now-t>14*864e5&&u.active!==false;});
  var bits=['<b>'+emailN+' on email sign-in</b>'];var onCode=all.filter(function(u){return !u.email&&u.active!==false;});if(onCode.length)bits.push('<b style="color:#b45309">'+onCode.length+' still on a code</b>: '+esc(onCode.map(function(u){return String(u.name||'').split(' ')[0];}).join(', ')));if(invited.length)bits.push('<b>'+esc(invited.map(function(u){return u.name;}).join(", "))+' invited</b> — not in yet');
  var sent=bits.join(", ")+'.'+(quiet.length?' '+esc(quiet.slice(0,2).map(function(u){return u.name;}).join(" and "))+' last in '+fmtAgo(userLastIn(quiet[0]))+'.':'');
  var row=function(u){var ri=famTitle(u)?[famTitle(u).toUpperCase(),"#0f766e"]:userRoleInfo(u.role);var t=userLastIn(u);var off=u.active===false;var inv=off&&u.email;var r;
    if(u.code===me)r='<span class="ur-s on">in now</span>';else if(inv)r='<span class="ur-s inv">invited</span>';else if(off)r='<span class="ur-s off">switched off</span>';else r='<span class="ur-s'+(t&&now-t<7*864e5?' on':'')+'">'+(t?esc(fmtAgo(t)):'—')+'</span>';
    var sub=u.email?'email · '+esc(u.email):'<span style="color:#b45309">code '+esc(u.code)+' · needs an email sign-in</span>';if(u.source==="app")sub+=' · built-in';
    return '<div class="ur'+(off&&!inv?' off':'')+'" onclick="userTap(\''+famJsq(u.code)+'\')">'+userAvatarHtml(u,34)+'<div class="ur-m"><b>'+esc(u.name)+' <span class="ur-rp" style="background:'+ri[1]+'">'+ri[0]+'</span></b><small>'+sub+'</small></div>'+r+'</div>';};
  var h='<div class="rxhead"><button onclick="(typeof boardBack===\'function\'?boardBack():loadRecordsList().then(function(){renderDashboard();}))" class="rxback">&#8592; Dashboard</button><h2>Manage users</h2></div><div class="rxsub">Who can sign in, how, and when they were last in.</div>';
  h+='<div class="rxstrip"><div class="rxlt">'+all.length+'<small>people</small></div><div class="rxtx">'+sent+'</div></div>';
  h+='<button class="btn btnp" style="width:100%;margin-bottom:4px" onclick="showAddUserModal()">+ Add someone</button>';
  h+='<div id="fam-wait"></div>';setTimeout(famWaitPaint,0);h+='<div class="rxlbl">People <em>'+people.length+'</em></div><div class="rxlist">'+people.map(row).join("")+'</div>';
  if(codes.length)h+='<div class="rxlbl">Shared codes <em>'+codes.length+'</em></div><div class="rxlist">'+codes.map(row).join("")+'</div>';
  h+='<div class="rxsub" style="margin-top:10px">Tap someone to change their name, email or role, or switch them off. Built-in people are set in the app itself.</div>';
  return '<div style="max-width:640px;margin:0 auto">'+h+'</div>';
}
function showAddUserModal(){
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;background:rgba(40,41,50,0.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999";
  ov.innerHTML='<div style="background:#fff;border-radius:14px;max-width:380px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,0.25)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-size:15px;font-weight:600">Add new user</span><button onclick="this.closest(\'.add-user-ov\').remove()" style="background:#f1f3ee;border:none;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px">&#10005;</button></div>'
    +'<div class="f"><label class="lbl">Full name</label><input id="new-user-name" type="text" placeholder="e.g. John Murphy"></div>'
    +'<div class="f"><label class="lbl">Email <span style="text-transform:none;letter-spacing:0;color:#9a9fa8;font-weight:600">\u2014 for sign-in; invite them in Supabase \u2192 Authentication \u2192 Users with the same address</span></label><input id="new-user-email" type="email" placeholder="name@nspca.ie"></div>'
    +'<div class="f"><label class="lbl">Job title <span style="text-transform:none;letter-spacing:0;color:#9a9fa8;font-weight:600">\u2014 optional, shown instead of the role</span></label><input id="new-user-title" type="text" placeholder="e.g. Senior Equine ACA"></div><div class="f"><label class="lbl">Access code</label><input id="new-user-code" type="text" placeholder="e.g. JM-01" style="font-family:monospace;letter-spacing:0.04em;text-transform:uppercase"></div>'
    +'<div class="f"><label class="lbl">Role</label><select id="new-user-role"><option value="staff">Staff</option><option value="supervisor">Supervisor</option><option value="asst">Assistant Supervisor</option><option value="coordinator">Rehoming Co-Ordinator</option><option value="trainer">Dog Trainer &amp; Behaviour Specialist</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>'
    +'<button onclick="saveNewUser()" class="btn btnp" style="width:100%;padding:10px;font-size:13px;font-weight:600">Add user</button>'
    +'</div>';
  ov.className="add-user-ov";
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
  setTimeout(function(){var i=document.getElementById("new-user-name");if(i)i.focus();},50);
}
async function saveNewUser(){
  var name=(document.getElementById("new-user-name")||{}).value;name=name?name.trim():"";
  var code=(document.getElementById("new-user-code")||{}).value;code=code?code.trim().toUpperCase():"";
  var role=(document.getElementById("new-user-role")||{}).value||"staff";
  var email=((document.getElementById("new-user-email")||{}).value||"").trim().toLowerCase();
  if(!name||!code){appAlert("Please enter a name and access code.");return;}
  if(getAllUsersSync().some(function(u){return u.code===code;})){appAlert("That code is already in use.");return;}
  if(!supabaseClient){appAlert("Supabase not connected.");return;}
  try{
    var _ins=await supabaseClient.from("users").insert([Object.assign({name:name,code:code,role:role,active:true,email:email||null},(function(){var t=((document.getElementById("new-user-title")||{}).value||"").trim();return t?{title:t}:{};})())]);if(_ins&&_ins.error)throw _ins.error;
    var ov=document.querySelector(".add-user-ov");if(ov)ov.remove();
    await refreshAllUsers();
    showDashSection("users");
    appAlert("User added. They can now log in with code "+code+".");
  }catch(e){appAlert("Could not add user"+(e&&e.message?" \u2014 "+e.message:". Check your connection and try again."));}
}
function showEditUserModal(code){
  var u=getAllUsersSync().find(function(x){return x.code===code;});
  if(!u)return;
  var ov=document.createElement("div");
  ov.className="edit-user-ov";
  ov.style.cssText="position:fixed;inset:0;background:rgba(40,41,50,0.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999";
  ov.innerHTML='<div style="background:#fff;border-radius:14px;max-width:380px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,0.25)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-size:15px;font-weight:600">Edit user</span><button onclick="this.closest(\'.edit-user-ov\').remove()" style="background:#f1f3ee;border:none;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px">&#10005;</button></div>'
    +'<div class="f"><label class="lbl">Full name</label><input id="edit-user-name" type="text" value="'+esc(u.name)+'"></div>'
    +'<div class="f"><label class="lbl">Email</label><input id="edit-user-email" type="email" value="'+esc(u.email||"")+'"></div>'
    +'<div class="f"><label class="lbl">Access code (read-only)</label><input type="text" value="'+esc(u.code)+'" disabled style="background:#f1f3ee;color:#6b7280;font-family:monospace"></div>'
    +'<div class="f"><label class="lbl">Job title <span style="text-transform:none;letter-spacing:0;color:#9a9fa8;font-weight:600">\u2014 optional, shown instead of the role</span></label><input id="edit-user-title" type="text" value="'+esc(u.title||"")+'" placeholder="e.g. Senior Equine ACA"></div><div class="f"><label class="lbl">Role</label><select id="edit-user-role">'+[["staff","Staff"],["supervisor","Supervisor"],["asst","Assistant Supervisor"],["coordinator","Rehoming Co-Ordinator"],["trainer","Dog Trainer & Behaviour Specialist"],["manager","Manager"],["admin","Admin"]].map(function(r){return'<option value="'+r[0]+'"'+(u.role===r[0]?" selected":"")+'>'+r[1]+'</option>';}).join("")+'</select></div>'
    +'<div class="f"><label class="lbl">Opens in</label><select id="edit-user-home">'+[["","Dogs (the usual)"],["cats","Cats"],["stables","Stables"]].map(function(h){var cur=homeAppFor(u);return '<option value="'+h[0]+'"'+((cur===h[0])||(h[0]===""&&(cur===""||cur==="dogs"))?" selected":"")+'>'+h[1]+'</option>';}).join("")+'</select></div>'
    +'<div class="f"><label class="lbl">Outside that app</label><select id="edit-user-look">'+[["0","Full use everywhere"],["1","Look only \u2014 can\u2019t change anything"]].map(function(o){var cur=lookOnlyFor(u)?"1":"0";return '<option value="'+o[0]+'"'+(cur===o[0]?" selected":"")+'>'+o[1]+'</option>';}).join("")+'</select><div style="font-size:10.5px;color:#9a9fa8;margin-top:4px">Admins always have full use.</div></div>'
    +'<button onclick="saveEditedUser(\''+famJsq(code)+'\')" class="btn btnp" style="width:100%;padding:10px;font-size:13px;font-weight:600">Save changes</button>'
    +((u.code!==((CURRENT_USER||{}).code))?'<button onclick="this.closest(\'.edit-user-ov\').remove();toggleUserActive(\''+famJsq(code)+'\','+(u.active===false)+')" style="width:100%;margin-top:8px;padding:9px;font-size:12px;background:'+(u.active===false?'#dcfce7':'#fef9c3')+';border:none;color:'+(u.active===false?'#166534':'#854d0e')+';border-radius:8px;cursor:pointer;font-family:inherit;font-weight:700">'+(u.active===false?'Switch '+esc(u.name)+' back on':'Switch '+esc(u.name)+' off \u2014 can\u2019t sign in')+'</button>':'')
    +(userRemovable(u)
      ?'<button onclick="removeUser(\''+famJsq(code)+'\')" style="width:100%;margin-top:8px;padding:9px;font-size:12px;background:none;border:0.5px solid #fca5a5;color:#991b1b;border-radius:8px;cursor:pointer;font-family:inherit">Remove '+esc(u.name)+' from the app</button>'
      :'<div style="margin-top:8px;font-size:11px;color:#9a9fa8;text-align:center">'+(u.code===((CURRENT_USER||{}).code)?"You cannot remove your own account.":"Built-in accounts cannot be removed \u2014 set them inactive instead.")+'</div>')
    +'</div>';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
}
function userRemovable(u){
  if(!u)return false;
  if(u.source==="app")return false;
  if(USERS.some(function(x){return x.code===u.code;}))return false;
  if(CURRENT_USER&&u.code===CURRENT_USER.code)return false;
  return true;
}
async function removeUser(code){
  var u=getAllUsersSync().find(function(x){return x.code===code;});
  if(!u||!userRemovable(u)){appAlert("That account cannot be removed.");return;}
  if(!supabaseClient){appAlert("No connection \u2014 try again when you are back online.");return;}
  appConfirm("Remove "+u.name+" from the app for good? Their login stops working immediately. Anything they recorded stays on the records.",async function(){
    try{
      var res=await supabaseClient.from("users").delete().eq("code",code);
      if(res&&res.error)throw res.error;
      var ov=document.querySelector(".edit-user-ov");if(ov)ov.remove();
      await refreshAllUsers();
      showDashSection("users");
      miniToast(u.name+" removed");
    }catch(e){console.error("removeUser:",e);appAlert("Could not remove that user. Check your connection and try again.");}
  });
}
async function saveEditedUser(code){
  var name=(document.getElementById("edit-user-name")||{}).value;name=name?name.trim():"";
  var role=(document.getElementById("edit-user-role")||{}).value||"staff";
  if(!name){appAlert("Please enter a name.");return;}
  try{var _hEl=document.getElementById("edit-user-home");if(_hEl){var _u=getAllUsersSync().find(function(x){return x.code===code;})||{};var _em=String(((document.getElementById("edit-user-email")||{}).value||_u.email||"")).trim().toLowerCase();var _m=JSON.parse(JSON.stringify(unitSetting("homeApps")||{}));var _k=_em||code;if(_hEl.value)_m[_k]=_hEl.value;else delete _m[_k];if(_em&&_m[code]&&_k!==code)delete _m[code];setUnitSetting("homeApps",_m);}}catch(_e){}
  try{var _lEl=document.getElementById("edit-user-look");if(_lEl){var _u2=getAllUsersSync().find(function(x){return x.code===code;})||{};var _em2=String(((document.getElementById("edit-user-email")||{}).value||_u2.email||"")).trim().toLowerCase();var _lm=JSON.parse(JSON.stringify(unitSetting("lookOnly")||{}));var _k2=_em2||code;_lm[_k2]=_lEl.value==="1";if(_em2&&_k2!==code)delete _lm[code];setUnitSetting("lookOnly",_lm);}}catch(_e){}
  if(!supabaseClient)return;
  try{
    var _old=getAllUsersSync().find(function(x){return x.code===code;})||{};if(_old.role&&_old.role!==role)famSecLog(currentName()+" changed "+name+" from "+famRoleLabel({role:_old.role})+" to "+famRoleLabel({role:role}));
    var _upd=await supabaseClient.from("users").update(Object.assign({name:name,role:role,title:(((document.getElementById("edit-user-title")||{}).value||"").trim())||null},{email:(((document.getElementById("edit-user-email")||{}).value||"").trim().toLowerCase())||null})).eq("code",code);if(_upd&&_upd.error)throw _upd.error;
    var ov=document.querySelector(".edit-user-ov");if(ov)ov.remove();
    await refreshAllUsers();
    showDashSection("users");
  }catch(e){appAlert("Could not save changes"+(e&&e.message?" \u2014 "+e.message:"."));}
}
async function toggleUserActive(code,makeActive){
  if(!supabaseClient)return;
  try{
    var _act2=await supabaseClient.from("users").update({active:makeActive}).eq("code",code);if(_act2&&_act2.error)throw _act2.error;try{var _ou=getAllUsersSync().find(function(x){return x.code===code;})||{};famSecLog(currentName()+(makeActive?" switched "+(_ou.name||code)+" back on":" switched "+(_ou.name||code)+" off"));}catch(_e){}
    await refreshAllUsers();
    showDashSection("users");
  }catch(e){appAlert("Could not update user status.");}
}
function fairDays(y){var d=new Date(y,9,1);while(d.getDay()!==0)d.setDate(d.getDate()+1);var a=new Date(d),b=new Date(d),c=new Date(d);b.setDate(b.getDate()+1);c.setDate(c.getDate()+6);return [a,b,c];}
function fairPhase(iso){var t=iso?new Date(String(iso).slice(0,10)+"T12:00:00"):new Date();if(isNaN(t))return null;var y=t.getFullYear();var f=fairDays(y);var t0=new Date(y,t.getMonth(),t.getDate());var s0=new Date(f[0]);s0.setDate(s0.getDate()-10);var e1=new Date(f[2]);e1.setDate(e1.getDate()+14);
  if(t0<s0||t0>e1)return null;return {y:y,days:f,phase:t0<f[0]?"before":t0<=f[2]?"on":"after",label:"Ballinasloe Horse Fair "+y};}
var INSPECTORS=[{n:"Karen Lyons",c:""},{n:"James McCormack",c:""},{n:"Lyndsey Delaney",c:""}];
function inspectorOpts(cur){if(cur==="James McCormick")cur="James McCormack";var o=[["","-- select inspector --"]];INSPECTORS.forEach(function(i){o.push([i.n,i.n+(i.c?" \u2014 "+i.c:"")]);});o.push(["Other","Other / not listed"]);if(cur&&!o.some(function(x){return x[0]===cur;}))o.splice(1,0,[cur,cur+" (as recorded)"]);return o;}
function inspectorLine(d){d=d||{};if(d.inspector==="James McCormick")d=Object.assign({},d,{inspector:"James McCormack"});return [d.inspector&&d.inspector!=="Other"?d.inspector:(d.inspectorOther||""),d.inspectorRef?"case "+d.inspectorRef:""].filter(Boolean).join(" \u00b7 ");}
function mrStrip(o){var c=JSON.parse(JSON.stringify(o||{}));delete c._id;delete c.tab;delete c._savedBy;return c;}
function mrSnap(at){try{window._mrBase=JSON.stringify(mrStrip(S));window._mrAt=at||"";window._mrFor=S._id;}catch(e){}}
function mrVal(b,m,t,hit){var js=JSON.stringify;var B=js(b),M=js(m),T=js(t);if(B===T||M===T)return m;if(B===M){hit();return t;}
  if(m&&t&&typeof m==="object"&&typeof t==="object"&&!Array.isArray(m)&&!Array.isArray(t)){var o={},ks={};[b||{},m,t].forEach(function(x){if(x&&typeof x==="object")Object.keys(x).forEach(function(k){ks[k]=1;});});Object.keys(ks).forEach(function(k){var v=mrVal((b||{})[k],m[k],t[k],hit);if(v!==undefined)o[k]=v;});return o;}
  if(Array.isArray(m)&&Array.isArray(t)){if(Array.isArray(b)&&b.length===m.length&&b.length===t.length)return m.map(function(x,i){return mrVal(b[i],m[i],t[i],hit);});
    var bs=(Array.isArray(b)?b:[]).map(function(x){return js(x);}),ms=m.map(function(x){return js(x);}),ts=t.map(function(x){return js(x);});
    var out=t.filter(function(x,i){return !(bs.indexOf(ts[i])>=0&&ms.indexOf(ts[i])<0);});m.forEach(function(x,i){if(ts.indexOf(ms[i])<0&&bs.indexOf(ms[i])<0)out.push(x);});hit();return out;}
  return m;}
async function mrMerge(){if(!supabaseClient||!S||!S._id||window._mrFor!==S._id||!window._mrBase)return null;
  var r=await supabaseClient.from(famTable()).select("saved_at").eq("id",S._id);var rem=r&&!r.error&&r.data&&r.data[0];if(!rem||!rem.saved_at||rem.saved_at===window._mrAt)return null;
  var r2=await supabaseClient.from(famTable()).select("saved_at,data").eq("id",S._id);var row=r2&&!r2.error&&r2.data&&r2.data[0];if(!row||!row.data)return null;
  var who=row.data._savedBy||"";var theirs=mrStrip(restoreState(row.data));var base=JSON.parse(window._mrBase);var mine=mrStrip(S);var took=0;
  var ks={};[base,mine,theirs].forEach(function(x){Object.keys(x).forEach(function(k){ks[k]=1;});});
  Object.keys(ks).forEach(function(k){var v=mrVal(base[k],mine[k],theirs[k],function(){took++;});if(v!==undefined)S[k]=v;});
  window._mrBase=JSON.stringify(theirs);window._mrAt=row.saved_at;
  return took?{who:who}:null;}
// ── Stage 2: shared across the family — Manage users, inspectors, saving safely, Ballinasloe ──
// Hooks an app may set:  FAM_TABLE  the app's records table ("dogs" | "cats" | "stables"), default by APP_HOME
function famTable(){if(typeof FAM_TABLE!=="undefined"&&FAM_TABLE)return FAM_TABLE;return ({dogs:"dogs",cats:"cats",stables:"stables"})[famHere()]||"dogs";}
// the animal's own section of a record: dog / cat / animal / horse — whichever the app uses
function famAnimalOf(st){st=st||{};return st.dog||st.cat||st.animal||st.horse||{};}
function famSaveSoft(){try{if(typeof persistSave==="function")persistSave();if(typeof debouncedSave==="function")debouncedSave();if(typeof renderMain==="function")renderMain();}catch(e){}}
var FAM_WORDS={dogs:{who:"seized dogs and pups",tab:"Dog tab",room:"a kennel or two",one:"A dog"},cats:{who:"seized cats and kittens",tab:"Cat tab",room:"a pen or two",one:"A cat"},stables:{who:"seized horses, ponies, goats and poultry",tab:"Animal tab",room:"a stable or a paddock",one:"An animal"}};
// Ballinasloe Horse Fair: first Sunday of October, the Monday after and the Saturday after
function fairCount(y){return (typeof records!=="undefined"?records:[]).filter(function(r){var d=famAnimalOf(r.state);return /Ballinasloe/i.test(d.event||"")&&String(d.intakeDate||r.intakeDate||"").slice(0,4)===String(y);}).length;}
function fairNoticeHtml(){var f=fairPhase();if(!f)return "";var key="nspca-fair-"+f.y+"-"+(f.phase==="before"?"b":"a");try{if(localStorage.getItem(key))return "";}catch(e){}
  var w=FAM_WORDS[famHere()]||FAM_WORDS.dogs;var fd=function(d){return d.toLocaleDateString("en-IE",{weekday:"short"})+" "+d.getDate();};var n=fairCount(f.y);
  var x='<span class="fx" role="button" tabindex="0" title="Hide until next time" onclick="try{localStorage.setItem(\''+famJsq(key)+'\',\'1\')}catch(e){};renderDashboard()">✕</span>';
  if(f.phase==="before")return '<div class="fairn">'+x+'<b>Ballinasloe Horse Fair is coming up</b><small>Main days '+fd(f.days[0])+', '+fd(f.days[1])+' and '+fd(f.days[2])+' '+f.days[2].toLocaleDateString("en-IE",{month:"short"})+'. NSPCA inspectors attend, and '+w.who+' usually come in over the days after. Worth keeping '+w.room+' free.</small>'+(typeof openExpected==="function"?'<div class="fa"><span onclick="openExpected()">+ Expected arrival</span></div>':'')+'</div>';
  return '<div class="fairn">'+x+'<b>Ballinasloe Horse Fair '+(f.phase==="on"?"is on":"was on")+'</b><small>'+w.one+' seized there: on its '+w.tab+', open <i>How they came in</i> and tap “Ballinasloe Horse Fair”. '+(n?n+" tagged so far.":"None tagged yet.")+'</small>'+(n?'<div class="fa"><span onclick="window._dbS=\'ballinasloe\';renderDashboard()">See them ›</span></div>':'')+'</div>';}
// the chip on "How they came in" — only around fair time, or once a record is tagged
function famFairChip(d){d=d||{};var f=fairPhase(d.intakeDate);if(!d.event&&!(f&&f.phase!=="before"))return "";var lbl=d.event||f.label;return '<div class="cq"><label>Seized at</label><div class="cchips"><span class="cchip'+(d.event?" on":"")+'" onclick="fairTag()">'+famEsc(lbl)+'</span></div></div>';}
function fairTag(){var d=famAnimalOf(S);var f=fairPhase(d.intakeDate);var lbl=f?f.label:(d.event||"");if(d.event===lbl){d.event="";}else{d.event=lbl;if(!d.intakeReason)d.intakeReason="Seized";}famSaveSoft();}
(function(){if(document.getElementById("fam-css2"))return;var st=document.createElement("style");st.id="fam-css2";st.textContent=
".fairn{position:relative;background:#fff;border:1px solid #e4e7e0;border-left:4px solid #c6e76c;border-radius:12px;padding:10px 34px 10px 13px;margin-bottom:10px}.fairn b{display:block;font-size:13.5px;color:#282932}.fairn small{display:block;font-size:12.5px;color:#4b5060;font-weight:600;line-height:1.45;margin-top:2px}"+
".fairn .fx{position:absolute;top:8px;right:10px;color:#9a9fa8;font-size:13px;cursor:pointer;padding:2px 4px}.fairn .fa{margin-top:7px}.fairn .fa span{font-size:12px;font-weight:800;color:#282932;background:#eef6d6;border-radius:20px;padding:4px 11px;cursor:pointer;display:inline-block}";
(document.head||document.documentElement).appendChild(st);})();
// ── v2.1 · face / fingerprint unlock (28) and phone notifications (29) ─────────
// Face / fingerprint: the phone's own lock stands in for the PIN. It only unlocks a
// profile that already has a saved session on this device (set up with a PIN first).
function bioOK(){return !!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext);}
function famB64(buf){var s="";new Uint8Array(buf).forEach(function(b){s+=String.fromCharCode(b);});return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function famUnB64(s){s=String(s||"").replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";var b=atob(s);var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function famRand(n){var u=new Uint8Array(n||32);crypto.getRandomValues(u);return u;}
async function bioSetup(){if(!bioOK()){famToast("This phone or browser can’t do face or fingerprint unlock.");return;}
  var em=String((CURRENT_USER&&CURRENT_USER.email)||authEmail()||"").toLowerCase();var prof=devProfiles();var p=prof.find(function(x){return x.email===em;});
  if(!p||!p.refresh){famToast("Set a PIN for this device first, then turn this on.");return;}
  try{var cred=await navigator.credentials.create({publicKey:{challenge:famRand(32),rp:{name:"NSPCA Longford"},user:{id:new TextEncoder().encode(em).slice(0,64),name:em,displayName:(CURRENT_USER&&CURRENT_USER.name)||em},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"discouraged"},timeout:60000,attestation:"none"}});
    if(!cred)return;p.bio=famB64(cred.rawId);devProfilesSave(prof);famToast("Face / fingerprint unlock is on for this device");}
  catch(e){famToast(e&&e.name==="NotAllowedError"?"Cancelled — nothing changed":"Couldn’t turn it on: "+((e&&e.message)||"unknown"));}
  if(typeof showDashSection==="function")showDashSection("profile");}
function bioOff(){var em=String((CURRENT_USER&&CURRENT_USER.email)||authEmail()||"").toLowerCase();var prof=devProfiles();var p=prof.find(function(x){return x.email===em;});if(p){delete p.bio;devProfilesSave(prof);}famToast("Face / fingerprint unlock is off");if(typeof showDashSection==="function")showDashSection("profile");}
function bioMine(){var em=String((CURRENT_USER&&CURRENT_USER.email)||(typeof authEmail==="function"?authEmail():"")||"").toLowerCase();var p=devProfiles().find(function(x){return x.email===em;});return p||null;}
async function bioUnlock(email){var err=document.getElementById("login-err");var p=devProfiles().find(function(x){return x.email===email;});if(!p||!p.bio||!bioOK())return;
  try{var a=await navigator.credentials.get({publicKey:{challenge:famRand(32),allowCredentials:[{type:"public-key",id:famUnB64(p.bio)}],userVerification:"required",timeout:60000}});if(!a)return;}
  catch(e){if(err&&e&&e.name!=="NotAllowedError"){err.textContent="Face / fingerprint didn’t work — use your PIN.";err.style.display="block";}return;}
  await devUnlock(email);}
function famToast(t){if(typeof miniToast==="function")miniToast(t);else alert(t);}

// Phone notifications: a short list only. Each device chooses what it wants; nothing
// is sent between 10pm and 7am. Needs the notify function and push_subs table in Supabase.
var FAM_VAPID="BNTc0IK7b0xHcw9--JCQj8s3MA59XBdoDw4JgfdaDnmmqjA8Hm7tIsvg-KQSzfH-yVme_gpxKCloPddOALYyjHI";
var FAM_PUSH_KINDS=[["contagious","Contagious","a dog is marked contagious"],["warning","Warnings","a new warning goes on a dog"],["arrival","New arrivals","a new dog starts in the unit"],["weight","Weight loss","a weigh-in 3% or more down on the last one"],["weather","Hot & cold days","heat or frost, with the dogs at risk"]];
// Make sure this device holds a live sign-in token (it can be missing after the app restores a session).
async function famEnsureToken(){try{if(typeof AUTH!=="undefined"&&AUTH&&AUTH.refresh_token&&(!AUTH.access_token||!AUTH.expires_at||Date.now()>AUTH.expires_at-60000))await authRefresh();}catch(e){}return !!authToken();}
function pushOK(){return !!("serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window&&window.isSecureContext);}
function pushIsIOSBrowser(){var ua=navigator.userAgent||"";return /iPhone|iPad|iPod/.test(ua)&&!(window.navigator.standalone||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches));}
function pushPrefs(){try{return JSON.parse(localStorage.getItem("nspca-push")||"null");}catch(e){return null;}}
async function pushSub(){var reg=await navigator.serviceWorker.ready;var sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:famUnB64(FAM_VAPID)});return sub;}
async function pushSave(prefs){if(!(await famEnsureToken()))throw new Error("SIGNIN");var sub=await pushSub();var j=sub.toJSON();var me=CURRENT_USER||{};
  var row={endpoint:j.endpoint,sub:j,email:String(me.email||authEmail()||"").toLowerCase(),name:me.name||"",app:(typeof APP_HOME!=="undefined"?APP_HOME:""),prefs:prefs,updated_at:new Date().toISOString()};
  var r=await supabaseClient.from("push_subs").upsert(row,{onConflict:"endpoint"});if(r&&r.error)throw r.error;try{localStorage.setItem("nspca-push",JSON.stringify(prefs));}catch(e){}}
// Which apps send alerts, and what each phone wants from each. prefs.apps = {dogs:true, cats:true}.
var FAM_PUSH_APPS={dogs:"Dogs",cats:"Cattery"};
function pushHere(){return (typeof APP_HOME!=="undefined"&&FAM_PUSH_APPS[APP_HOME])?APP_HOME:"";}
function pushAppsOf(p){return (p&&p.apps)||(p?{dogs:true}:{});}
async function pushOn(){if(!pushOK()){famToast(pushIsIOSBrowser()?"On an iPhone, add the app to the home screen first (Share → Add to Home Screen), then turn this on from there.":"This browser can’t do notifications.");return;}
  var perm=await Notification.requestPermission();if(perm!=="granted"){famToast("Notifications are blocked for this app in the phone’s settings.");return;}
  var prefs=pushPrefs()||{};FAM_PUSH_KINDS.forEach(function(k){if(prefs[k[0]]===undefined)prefs[k[0]]=true;});var apps=pushAppsOf(pushPrefs());apps[pushHere()]=true;prefs.apps=apps;
  try{await pushSave(prefs);famToast(FAM_PUSH_APPS[pushHere()]+" notifications are on");}catch(e){var _m=String((e&&e.message)||"unknown");famToast(_m==="SIGNIN"||/row-level security/.test(_m)?"Your sign-in on this phone needs renewing. Sign out, sign back in with your email and password, then turn this on.":"Couldn’t turn notifications on: "+_m);}
  if(typeof showDashSection==="function")showDashSection("profile");}
async function pushKind(k){var p=pushPrefs()||{};p[k]=p[k]===false;try{await pushSave(p);}catch(e){famToast("Couldn’t save that: "+((e&&e.message)||""));}if(typeof showDashSection==="function")showDashSection("profile");}
// Turning off in one app keeps the other app's alerts; the phone only unsubscribes when none are left.
async function pushOffHere(){var p=pushPrefs();if(!p){return pushOff();}var apps=pushAppsOf(p);apps[pushHere()]=false;p.apps=apps;if(!Object.keys(apps).some(function(a){return apps[a];}))return pushOff();
  try{await pushSave(p);famToast(FAM_PUSH_APPS[pushHere()]+" notifications are off on this phone");}catch(e){famToast("Couldn’t save that: "+((e&&e.message)||""));}if(typeof showDashSection==="function")showDashSection("profile");}
// One line for the apps: famNotifyRecord("contagious","Contagious","Parvovirus — PPE on").
function famNotifyRecord(kind,head,body){try{var d=famAnimalOf(S);var here=pushHere();var nm=d.name||(here==="cats"?"A cat":"An animal");var place=d.kennel?(typeof kennelShort==="function"?kennelShort(d.kennel):d.kennel):"";
  famNotify(kind,(here==="cats"?"Cattery \u00b7 ":"")+head+" \u00b7 "+nm+(place?", "+place:""),body||"");}catch(e){}}
// Called by the apps when something worth a buzz happens. Fire and forget.
async function famNotify(kind,title,body,url){try{if(!supabaseClient||typeof authToken!=="function")return;if(!(await famEnsureToken()))return;var u=url||(location.origin+location.pathname);
  fetch(SUPABASE_URL+"/functions/v1/notify",{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPABASE_KEY,Authorization:"Bearer "+authToken()},body:JSON.stringify({kind:kind,title:title,body:body,url:u,app:(typeof APP_HOME!=="undefined"?APP_HOME:""),tag:kind+"-"+Date.now()})}).catch(function(){});}catch(e){}}
function famDeviceRows(){var h="";
  if(bioOK()){var p=bioMine();if(p&&p.refresh)h+=famRow("Face / fingerprint","unlock with the phone’s own lock instead of the PIN",p.bio?'<span class="fam-btn" onclick="bioOff()">Turn off</span>':'<span class="fam-btn" onclick="bioSetup()">Turn on</span>');}
  var here=pushHere();if(!here)return h;   // Stables doesn't send alerts yet
  var pp=pushPrefs();var on=!!(pp&&pushAppsOf(pp)[here]);var other=pp?Object.keys(pushAppsOf(pp)).filter(function(a){return a!==here&&pushAppsOf(pp)[a];}).map(function(a){return FAM_PUSH_APPS[a];}):[];
  var what=here==="cats"?"contagious cats, warnings, arrivals, weight loss":"contagious dogs, warnings, arrivals, weight loss, hot and cold days";
  h+=famRow("Phone notifications",on?"on for "+FAM_PUSH_APPS[here]+(other.length?" and "+other.join(", "):"")+" · nothing between 10pm and 7am":(pushIsIOSBrowser()?"add the app to the home screen first":what+(other.length?" · "+other.join(", ")+" already on":"")),on?'<span class="fam-btn" onclick="pushOffHere()">Turn off</span>':'<span class="fam-btn" onclick="pushOn()">Turn on</span>');
  if(on)h+='<div class="fam-pk">'+FAM_PUSH_KINDS.filter(function(k){return here==="dogs"||k[0]!=="weather";}).map(function(k){var kon=pp[k[0]]!==false;return '<span class="fam-pkc'+(kon?' on':'')+'" onclick="pushKind(\''+famJsq(k[0])+'\')" title="'+k[2]+'">'+(kon?'✓ ':'')+k[1]+'</span>';}).join("")+'</div>';
  return h;}
(function(){if(document.getElementById("fam-css3"))return;var st=document.createElement("style");st.id="fam-css3";st.textContent=".fam-pk{display:flex;flex-wrap:wrap;gap:6px;padding:2px 0 10px}.fam-pkc{font-size:11.5px;font-weight:800;padding:5px 10px;border-radius:20px;border:1.5px solid #e4e7e0;background:#fff;color:#6b7280;cursor:pointer}.fam-pkc.on{background:#282932;border-color:#282932;color:#c6e76c}.lg-btn.lg-bio{margin:4px 0 14px;background:#c6e76c;color:#282932}";document.head.appendChild(st);})();

// ── Security (lockdown step 6): who's waiting to be let in, every signed-in phone and computer, rare actions ──
// Needs the Supabase step (access_waiting, devices, security_log, admin_sign_out). Until then it quietly does nothing.
var FAM_ROLES=[["staff","Staff"],["supervisor","Supervisor"],["asst","Assistant Supervisor"],["coordinator","Rehoming Co-Ordinator"],["trainer","Dog Trainer & Behaviour Specialist"],["manager","Manager"],["admin","Admin"]];
function famDevId(){var k="nspca-device-id",v="";try{v=localStorage.getItem(k)||"";}catch(e){}if(!v){v=Array.prototype.map.call(famRand(9),function(b){return ("0"+b.toString(16)).slice(-2);}).join("");try{localStorage.setItem(k,v);}catch(e){}}return v;}
function famDevLabel(){if(famShared())return "shared computer";var u=navigator.userAgent||"";return /iPhone/.test(u)?"iPhone":/iPad/.test(u)?"iPad":/SM-|Samsung/i.test(u)?"Samsung":/Pixel/.test(u)?"Pixel":/Android/.test(u)?"Android phone":/Windows/.test(u)?"Windows computer":/Macintosh/.test(u)?"Mac":/CrOS/.test(u)?"Chromebook":"computer";}
function famDevMethod(em){if(famShared())return "password, shared";var p=devProfiles().find(function(x){return String(x.email||"").toLowerCase()===em;})||{};var b=p.bio&&bioOK();return p.pin&&b?"PIN and fingerprint":p.pin?"PIN":b?"fingerprint":"password";}
function famJwt(){try{var t=String(authToken()).split(".")[1];t=t.replace(/-/g,"+").replace(/_/g,"/");while(t.length%4)t+="=";return JSON.parse(atob(t));}catch(e){return {};}}
async function famRest(path,opts){opts=opts||{};try{await famEnsureToken();}catch(e){}if(!authToken())return {ok:false,status:401,data:null};
  var h=Object.assign({"apikey":SUPABASE_KEY,"Authorization":"Bearer "+authToken(),"Content-Type":"application/json"},opts.headers||{});
  try{var r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{method:opts.method||"GET",headers:h,body:opts.body!==undefined?JSON.stringify(opts.body):undefined});var d=null;try{d=await r.json();}catch(e){}return {ok:r.ok,status:r.status,data:d};}
  catch(e){return {ok:false,status:0,data:null};}}
function famWhen(iso,time){var d=new Date(iso);if(isNaN(d))return "";var t=("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);var day=Math.round((new Date(new Date().toDateString())-new Date(d.toDateString()))/864e5);
  var s=day===0?"today":day===1?"yesterday":day<7?d.toLocaleDateString("en-IE",{weekday:"long"}):d.toLocaleDateString("en-IE",{day:"numeric",month:"short"});return time?s.charAt(0).toUpperCase()+s.slice(1)+" "+t:s;}
function famDayShort(iso){var d=new Date(iso);if(isNaN(d))return "";var day=Math.round((new Date(new Date().toDateString())-new Date(d.toDateString()))/864e5);return day===0?"Today":day<7?d.toLocaleDateString("en-IE",{weekday:"short"}):d.toLocaleDateString("en-IE",{day:"numeric",month:"short"});}
function famNameGuess(em){return String(em||"").split("@")[0].replace(/[._-]+/g," ").replace(/\d+/g,"").trim().split(" ").filter(Boolean).map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(" ");}
// The phone or computer you're on: its row in Security, and whether an admin has signed it out.
async function famDevBeat(first){try{if(!LOGGED_IN)return;var em=String(authEmail()||"").toLowerCase();if(!em)return;if(!first&&Date.now()-(window._devBeatAt||0)<60000)return;window._devBeatAt=Date.now();
  var id=famDevId()+":"+em;
  if(!first){var g=await famRest("devices?select=signed_out&id=eq."+encodeURIComponent(id));if(g.ok&&g.data&&g.data[0]&&g.data[0].signed_out){famDevKicked(em);return;}}
  var row={id:id,email:em,name:currentName(),label:famDevLabel(),method:famDevMethod(em),session_id:famJwt().session_id||null,last_used:new Date().toISOString()};if(first)row.signed_out=false;
  await famRest("devices?on_conflict=id",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:[row]});
  famSecFlush();}catch(e){}}
function famDevKicked(em){devProfilesSave(devProfiles().filter(function(x){return String(x.email||"").toLowerCase()!==em;}));try{localStorage.removeItem("nspca-user-cache");}catch(e){}
  doLogout();setTimeout(function(){lgErr("An admin signed you out on this "+famDevLabel()+". Sign in with your password.");},300);}
setInterval(function(){if(typeof LOGGED_IN!=="undefined"&&LOGGED_IN&&Date.now()-(_lastActivity||0)<10*60000)famDevBeat(false);},180000);
document.addEventListener("visibilitychange",function(){if(!document.hidden&&typeof LOGGED_IN!=="undefined"&&LOGGED_IN)famDevBeat(false);});
// Rare, sensitive actions. Held on the phone until there's a signed-in person and signal.
function famSecLog(what,who){var q=[];what=String(what);try{var cn=currentName();if(cn&&cn.indexOf(" ")>0&&what.indexOf(cn+" ")===0)what=cn.split(" ")[0]+what.slice(cn.length);}catch(e){}try{q=JSON.parse(localStorage.getItem("nspca-sec-q")||"[]");}catch(e){}q.push({at:new Date().toISOString(),who:who!==undefined?who:((typeof LOGGED_IN!=="undefined"&&LOGGED_IN&&currentName())||""),what:String(what).slice(0,300)});
  try{localStorage.setItem("nspca-sec-q",JSON.stringify(q.slice(-30)));}catch(e){}famSecFlush();}
async function famSecFlush(){if(window._secBusy||typeof LOGGED_IN==="undefined"||!LOGGED_IN||!authEmail())return;var q=[];try{q=JSON.parse(localStorage.getItem("nspca-sec-q")||"[]");}catch(e){}if(!q.length)return;
  window._secBusy=true;try{var em=String(authEmail()).toLowerCase();var r=await famRest("security_log",{method:"POST",headers:{"Prefer":"return=minimal"},body:q.map(function(x){return {at:x.at,who:x.who||"",email:em,what:x.what};})});
    if(r.ok||r.status===404||r.status===400){try{localStorage.removeItem("nspca-sec-q");}catch(e){}}}catch(e){}window._secBusy=false;}
// Waiting for you: signed in with a real email, but not in Manage users yet.
async function famWaitAdd(em){try{await famRest("access_waiting?on_conflict=email",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:[{email:String(em).toLowerCase(),last_seen:new Date().toISOString()}]});}catch(e){}}
async function famWaitList(){var r=await famRest("access_waiting?select=*&order=first_seen.desc");if(!r.ok||!Array.isArray(r.data))return [];var have={};(getAllUsersSync()||[]).forEach(function(u){if(u.email)have[String(u.email).toLowerCase()]=1;});
  var L=r.data.filter(function(w){return !have[String(w.email).toLowerCase()];});r.data.forEach(function(w){if(have[String(w.email).toLowerCase()])famRest("access_waiting?email=eq."+encodeURIComponent(w.email),{method:"DELETE"});});
  window._famWait=L;window._famWaitN=L.length;window._famWaitAt=Date.now();return L;}
function famWaitNoticeHtml(){if(currentRole()!=="admin"||!authEmail())return "";if(Date.now()-(window._famWaitAt||0)>120000){window._famWaitAt=Date.now();famWaitList();}
  var L=window._famWait||[];if(!L.length)return "";var nm=L.length===1?(famNameGuess(L[0].email)||L[0].email)+" is":L.length+" people are";
  return '<div class="fairn"><b>'+famEsc(nm)+' waiting to be let in</b><small>Signed in, but not in Manage users yet. Pick a role and let them in, or turn them away.</small><div class="fa"><span onclick="showDashSection(\'users\')">Open Manage users ›</span></div></div>';}
async function famWaitPaint(){var box=document.getElementById("fam-wait");if(!box)return;var L=await famWaitList();box=document.getElementById("fam-wait");if(!box)return;if(!L.length){box.innerHTML="";return;}
  box.innerHTML='<div class="rxlbl">Waiting for you <em>'+L.length+'</em></div>'+L.map(function(w,i){var g=famNameGuess(w.email);
    return '<div class="fam-wt"><div class="fam-wt-t"><span class="fam-wt-av" style="background:'+avatarColor(g||w.email)+'">'+famEsc(initials(g||w.email))+'</span><div class="fam-wt-m"><input id="wt-n-'+i+'" class="fam-wt-n" value="'+famEsc(g)+'" placeholder="Their full name" aria-label="Their name"><small>'+famEsc(w.email)+' · signed in '+famEsc(famWhen(w.first_seen))+'</small></div></div>'
      +'<div class="fam-wt-a"><label>Role <select id="wt-r-'+i+'">'+FAM_ROLES.map(function(r){return '<option value="'+r[0]+'">'+famEsc(r[1])+'</option>';}).join("")+'</select></label><span class="fam-wt-go" role="button" tabindex="0" onclick="famLetIn('+i+')">Let in</span><span class="fam-wt-no" role="button" tabindex="0" onclick="famNotStaff('+i+')">Not staff</span></div></div>';}).join("")
    +'<div class="rxsub" style="margin:2px 0 12px">Signing in isn’t enough on its own. Nobody sees an animal until you let them in and pick their role. Check the name before you let them in.</div>';}
async function famLetIn(i){var w=(window._famWait||[])[i];if(!w)return;var nm=((document.getElementById("wt-n-"+i)||{}).value||"").trim();var role=(document.getElementById("wt-r-"+i)||{}).value||"staff";
  if(!nm){appAlert("Type their full name first.");return;}if(!supabaseClient)return;
  var code="E"+Array.prototype.map.call(famRand(10),function(b){return "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b%32];}).join("");
  var res=await supabaseClient.from("users").insert([{name:nm,code:code,role:role,active:true,email:String(w.email).toLowerCase()}]);if(res&&res.error){appAlert("Couldn’t let them in: "+(res.error.message||"try again"));return;}
  await famRest("access_waiting?email=eq."+encodeURIComponent(w.email),{method:"DELETE"});
  famSecLog(currentName()+" let "+nm+" in as "+famRoleLabel({role:role}));await refreshAllUsers();showDashSection("users");famToast(nm+" is in. They can tap “Check again” now.");}
function famNotStaff(i){var w=(window._famWait||[])[i];if(!w)return;
  appConfirm("Take "+w.email+" off the waiting list? They still can’t see any animals. To stop them signing in at all, delete them in Supabase → Authentication → Users.",async function(){await famRest("access_waiting?email=eq."+encodeURIComponent(w.email),{method:"DELETE"});famSecLog(currentName()+" turned away "+w.email);showDashSection("users");});}
// The Security page (admins)
async function famSecurityOpen(el){var back='<div class="rxhead"><button onclick="showDashSection(\'profile\')" class="rxback">&#8592; Profile</button><h2>Security</h2></div>';
  if(currentRole()!=="admin"){el.innerHTML=back+'<div class="rxsub">Admins only.</div>';return;}
  if(!authEmail()){el.innerHTML='<div class="fam-sec">'+back+'<div class="fam-card"><div class="fam-sec-none">Sign in with your email to see this page. Codes can’t read it.</div></div></div>';return;}
  el.innerHTML='<div class="fam-sec">'+back+'<div class="fam-card"><div class="fam-sec-none">Loading…</div></div></div>';
  var D=await famRest("devices?select=*&signed_out=eq.false&order=last_used.desc");var L=await famRest("security_log?select=*&order=at.desc&limit=40");
  if(D.status===404||L.status===404){el.innerHTML='<div class="fam-sec">'+back+'<div class="fam-card"><div class="fam-sec-none">Not set up yet. This page needs the Supabase step for the lockdown.</div></div></div>';return;}
  var mine=famDevId()+":"+String(authEmail()).toLowerCase();var now=Date.now();window._famDevs=(D.data||[]);
  var dev=(D.data||[]).map(function(d,i){var old=now-new Date(d.last_used).getTime()>2*864e5;var me=d.id===mine;
    return '<div class="fam-dv"><div class="fam-dv-m"><b>'+famEsc((d.name||d.email).split(" ")[0])+' · '+famEsc(d.label||"device")+(me?' <span class="fam-tag g">this one</span>':'')+'</b><small>'+famEsc(famWhen(d.last_used,true))+(d.method?' · '+famEsc(d.method):'')+(old?' · not used since':'')+'</small></div>'+(me?'':'<span class="fam-dv-out" role="button" tabindex="0" onclick="famDevOut('+i+')">Sign out</span>')+'</div>';}).join("")||'<div class="fam-sec-none">Nobody yet. Phones and computers show here once people sign in by email.</div>';
  var log=(L.data||[]).map(function(x){return '<div class="fam-lg"><span>'+famEsc(famDayShort(x.at))+'</span><div>'+famEsc(x.what)+'</div></div>';}).join("")||'<div class="fam-sec-none">Nothing yet.</div>';
  el.innerHTML='<div class="fam-sec">'+back
    +'<div class="fam-card"><div class="fam-lbl">Signed in <em>every phone and computer with a live sign-in</em></div>'+dev
    +((D.data||[]).length>1?'<div class="fam-sec-all" role="button" tabindex="0" onclick="famDevOutAll()">Sign everyone out</div>':'')+'</div>'
    +'<div class="fam-card"><div class="fam-lbl">Worth knowing <em>rare, sensitive actions only</em></div>'+log+'</div>'
    +'<div class="rxsub">Signing a phone out ends its sign-in and forgets its PIN. That person needs their password next time. A phone that’s off or has no signal goes when it next connects.</div></div>';}
function famDevOut(i){var d=(window._famDevs||[])[i];if(!d)return;var who=(d.name||d.email).split(" ")[0];
  appConfirm("Sign "+who+" out on the "+(d.label||"device")+"? They’ll need their password next time on it.",async function(){var r=await famRest("rpc/admin_sign_out",{method:"POST",body:{p_device:d.id}});
    if(!r.ok){appAlert("Couldn’t sign it out: "+((r.data&&(r.data.message||r.data.hint))||("error "+r.status)));return;}
    famSecLog(currentName()+" signed "+who+" out on the "+(d.label||"device"));famToast(who+" is signed out on the "+(d.label||"device"));showDashSection("security");});}
function famDevOutAll(){appConfirm("Sign everyone out on every phone and computer, except you here? Everyone will need their password next time.",async function(){var r=await famRest("rpc/admin_sign_out_all",{method:"POST",body:{}});
    if(!r.ok){appAlert("Couldn’t do it: "+((r.data&&(r.data.message||r.data.hint))||("error "+r.status)));return;}
    famSecLog(currentName()+" signed everyone out");famToast("Everyone else is signed out");showDashSection("security");},{danger:true});}
(function(){if(document.getElementById("fam-sec-css"))return;var st=document.createElement("style");st.id="fam-sec-css";st.textContent=[
".fam-sec{max-width:640px;margin:0 auto}.fam-sec-none{font-size:13px;color:#6b7280;padding:6px 0}",
".fam-dv{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid #f0f1ec}.fam-card .fam-lbl+.fam-dv{border-top:0}.fam-dv-m{flex:1;min-width:0}.fam-dv-m b{display:block;font-size:14px;font-weight:700;color:#282932}.fam-dv-m small{display:block;font-size:12.5px;color:#6b7280;margin-top:1px}",
".fam-dv-out{font-size:12.5px;font-weight:800;color:#991b1b;background:#fef2f2;border-radius:8px;padding:6px 11px;cursor:pointer;white-space:nowrap}.fam-sec-all{margin-top:10px;text-align:center;font-size:13px;font-weight:800;color:#991b1b;border:1.5px solid #fecaca;border-radius:10px;padding:10px;cursor:pointer}",
".fam-lg{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:8px 0;border-top:1px solid #f0f1ec;font-size:13.5px;color:#282932}.fam-card .fam-lbl+.fam-lg{border-top:0}.fam-lg span{font-size:12px;font-weight:800;color:#6b7280;padding-top:1px}",
".fam-wt{background:#fff;border:1px solid #e4e7e0;border-left:4px solid #c6e76c;border-radius:12px;padding:12px 14px;margin-bottom:8px}.fam-wt-t{display:flex;gap:12px;align-items:center}.fam-wt-av{width:38px;height:38px;border-radius:50%;color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex:none}",
".fam-wt-m{flex:1;min-width:0}.fam-wt-n{border:0!important;background:transparent!important;padding:0!important;font-size:15px!important;font-weight:800;color:#282932;box-shadow:none!important;min-height:0!important;width:100%}.fam-wt-n:focus{text-decoration:underline;text-decoration-color:#c6e76c}.fam-wt-m small{display:block;font-size:12px;color:#6b7280;margin-top:1px}",
".fam-wt-a{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.fam-wt-a label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#6b7280;flex:1;min-width:180px}.fam-wt-a select{flex:1;width:auto}",
".fam-wt-go{background:#c6e76c;color:#282932;font-weight:800;font-size:13px;border-radius:9px;padding:8px 14px;cursor:pointer}.fam-wt-no{font-size:12.5px;font-weight:700;color:#6b7280;padding:8px 6px;cursor:pointer}"
].join("");document.head.appendChild(st);})();
