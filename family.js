// NSPCA Longford — family.js: the parts every app shares (Dogs, Cats, Stables).
// Sign-in, staying signed in, PINs, My profile, Manage users, look only, which app someone opens in,
// the inspector list, saving safely when two people edit one record, and the Ballinasloe Horse Fair notice.
// Edit this file once and every app gets the change. Each app keeps only its own animals.

var HOME_FILES={dogs:"index.html",cats:"cats.html",stables:"stables.html"};
var HOME_BUILTIN={STA01:"stables",CAT01:"cats",CISO01:"cats"};
function homeAppFor(u){if(!u)return "";var m={};try{m=unitSetting("homeApps")||{};}catch(e){}var em=String(u.email||"").toLowerCase();return (em&&m[em])||m[u.code||""]||HOME_BUILTIN[u.code||""]||(typeof lookBuiltin==="function"&&(lookBuiltin(u)||{}).home)||"";}
// Only the front door (index.html) sends people on to their home app. Opening Cats or Stables on
// purpose — a bookmark, a shortcut, a new tab, or signing in there — keeps you where you asked to be.
function famOnFrontDoor(){var p=String(location.pathname||"");return /\/(index\.html?)?$/.test(p)||p==="";}
function goHomeApp(u,force){if(!famOnFrontDoor())return false;var done="";try{done=sessionStorage.getItem("nspca-home-done")||"";}catch(e){}if(done&&!force)return false;try{sessionStorage.setItem("nspca-home-done","1");}catch(e){}var h=homeAppFor(u);if(h&&h!==APP_HOME&&HOME_FILES[h]){location.replace(HOME_FILES[h]);return true;}return false;}
function userPhoto(code){try{var _l=localStorage.getItem("nspca-user-photo-"+code);if(_l!==null)return _l;var _u=(typeof _allUsersCache!=="undefined"&&_allUsersCache||[]).find(function(x){return x.code===code;});return (_u&&_u.photo)||"";}catch(e){return"";}}
function setUserPhoto(code,dataUrl){try{localStorage.setItem("nspca-user-photo-"+code,dataUrl||"");}catch(e){}if(supabaseClient)supabaseClient.from("users").update({photo:dataUrl||null}).eq("code",code).then(function(){},function(){});}
function userLastLogin(code){try{var v=localStorage.getItem("nspca-user-lastlogin-"+code);return v?parseInt(v):0;}catch(e){return 0;}}
function recordLastLogin(code){try{localStorage.setItem("nspca-user-lastlogin-"+code,Date.now().toString());}catch(e){}if(supabaseClient)supabaseClient.from("users").update({last_login_at:new Date().toISOString()}).eq("code",code).then(function(){},function(){});setTimeout(function(){try{seenBeat();}catch(e){}},4000);}
function getAllUsersSync(){return _allUsersCache||USERS;}
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
  _allUsersCache=merged;
  return merged;
}
function getAutoLogoutMins(){try{var v=localStorage.getItem("nspca-auto-logout-mins");return v?parseInt(v):0;}catch(e){return 0;}}
function setAutoLogoutMins(n){try{localStorage.setItem("nspca-auto-logout-mins",n.toString());}catch(e){}setupAutoLogout();}
function bumpActivity(){_lastActivity=Date.now();}
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
  var btn=document.getElementById("login-btn");
  var codeEl=document.getElementById("login-code");var code=codeEl?(codeEl.value||"").replace(/\s+/g,""):"";
  var errEl=document.getElementById("login-err");
  errEl.style.display="none";
  if(!code)return;
  btn.textContent="Checking...";btn.disabled=true;
  var user=USERS.find(function(u){return u.code===code;})||USERS.find(function(u){return String(u.code).toUpperCase()===code.toUpperCase();});
  if(!user&&supabaseClient){try{var res=await supabaseClient.from("users").select("*").eq("code",code).single();if(res.data&&res.data.name)user=res.data;}catch(e){}}
  if(!user&&supabaseClient&&code!==code.toUpperCase()){try{var res2=await supabaseClient.from("users").select("*").eq("code",code.toUpperCase()).single();if(res2.data&&res2.data.name)user=res2.data;}catch(e){}}
  if(user&&user.active===false){errEl.textContent="This account is deactivated.";errEl.style.display="block";btn.textContent="Enter \u2192";btn.disabled=false;return;}
  if(user){code=user.code||code;
    LOGGED_IN=true;CURRENT_USER=user;window._wnShownSession=false;
    localStorage.setItem("nspca-intake-auth",code);
    localStorage.setItem("nspca-user-name",user.name);
    localStorage.setItem("nspca-user-role",user.role||"staff");
    window._prevLogin=userLastLogin(user.code);window._catchupDismissed=false;
    recordLastLogin(user.code);
    setupAutoLogout();
    if(goHomeApp(user,true))return;
    await refreshAllUsers();
    await famEnterAppSafe();
  }else{errEl.textContent="Incorrect code. Try again.";errEl.style.removeProperty("color");errEl.style.background="";errEl.style.borderLeftColor="";errEl.style.display="block";btn.textContent="Enter →";btn.disabled=false;}
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
  authSignOut();window._loginWho="";window._loginFull=false;
  var st=document.getElementById("overdue-sticky");if(st)st.innerHTML="";
  showScreen("login-screen");
}
function currentRole(){return CURRENT_USER?CURRENT_USER.role:(localStorage.getItem("nspca-user-role")||"staff");}
function currentName(){return CURRENT_USER?CURRENT_USER.name:(localStorage.getItem("nspca-user-name")||"Staff");}
function avatarByName(name,size){size=size||18;var u=getAllUsersSync().find(function(x){return x.name===name;});var photo=u?(userPhoto(u.code)||u.photo||""):"";
  if(photo)return '<img src="'+blobSrc(photo)+'" alt="" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;flex-shrink:0;vertical-align:middle">';
  return '<span style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+avatarColor(name)+';color:#fff;font-size:'+Math.max(7,Math.round(size*0.42))+'px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:middle">'+initials(name)+'</span>';}
function userAvatarHtml(user,size){
  size=size||40;
  var photo=userPhoto(user.code);
  if(photo)return '<img src="'+blobSrc(photo)+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover;flex-shrink:0">';
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
  if(a.length<8)return say("At least 8 characters.");if(a!==b)return say("The two don’t match.");
  var go=document.getElementById("pw-go");go.disabled=true;go.textContent="Saving…";
  try{if(AUTH&&AUTH.expires_at&&AUTH.expires_at<Date.now()+60000){try{await authRefresh();}catch(e){}}
    var r=await fetch(SUPABASE_URL+"/auth/v1/user",{method:"PUT",headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+authToken(),"Content-Type":"application/json"},body:JSON.stringify({password:a})});
    if(!r.ok){var d={};try{d=await r.json();}catch(e){}throw new Error(d.msg||d.message||d.error_description||("error "+r.status));}
    pwClose();miniToast("Password changed");}
  catch(e){go.disabled=false;go.textContent="Save new password";say("Couldn’t change it: "+(e.message||"try again"));}}
var AUTH=null;
function authLoad(){try{AUTH=JSON.parse(localStorage.getItem("nspca-auth")||"null");}catch(e){AUTH=null;}return AUTH;}
function authSave(a){AUTH=a;try{if(a)localStorage.setItem("nspca-auth",JSON.stringify(a));else localStorage.removeItem("nspca-auth");}catch(e){}
  // Supabase retires each sign-in when it renews it, so the PIN must always hold the newest one.
  try{if(a&&a.refresh_token){var em=String((a.user&&a.user.email)||"").toLowerCase();if(em){var P=devProfiles();var me=P.find(function(x){return String(x.email||"").toLowerCase()===em;});if(me&&me.refresh!==a.refresh_token){me.refresh=a.refresh_token;devProfilesSave(P);}}}}catch(e){}}
function authToken(){return (AUTH&&AUTH.access_token)||"";}
function authEmail(){return (AUTH&&AUTH.user&&AUTH.user.email)||"";}
async function authRefresh(){if(!AUTH||!AUTH.refresh_token)return false;try{var r=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:AUTH.refresh_token})});var d=await r.json();if(!r.ok||!d.access_token){authSave(null);return false;}authSave({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+((d.expires_in||3600)*1000),user:d.user||AUTH.user});return true;}catch(e){return false;}}
async function authSignIn(email,password){var r=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:email,password:password})});var d=await r.json();if(!r.ok||!d.access_token)throw new Error((d&&(d.error_description||d.msg||d.message))||"Sign-in failed");authSave({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+((d.expires_in||3600)*1000),user:d.user});return d.user;}
async function authSignOut(){try{var em=String((AUTH&&AUTH.user&&AUTH.user.email)||"").toLowerCase();var keep=em&&devProfiles().some(function(x){return String(x.email||"").toLowerCase()===em&&(x.pin||x.bio)&&x.refresh;});
  if(AUTH&&!keep)await fetch(SUPABASE_URL+"/auth/v1/logout?scope=local",{method:"POST",headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+authToken()}});}catch(e){}AUTH=null;try{localStorage.removeItem("nspca-auth");}catch(e){}}
async function authRecover(email){window._authErr="";try{var r=await fetch(SUPABASE_URL+"/auth/v1/recover?redirect_to="+encodeURIComponent(location.origin+location.pathname),{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:email})});if(r.ok)return true;var d={};try{d=await r.json();}catch(e){}var msg=String(d.msg||d.message||d.error_description||d.error||"");window._authErr=(r.status===429||/rate limit/i.test(msg))?"Too many emails sent \u2014 Supabase\u2019s built-in email only sends a few an hour. Wait an hour and try once, or sign in with your code for now.":/smtp|sending/i.test(msg)?"Supabase couldn\u2019t send the email ("+msg+"). The email settings in Supabase need checking.":msg?msg+" (error "+r.status+")":"Error "+r.status+".";return false;}catch(e){window._authErr="Couldn\u2019t reach Supabase \u2014 check the connection.";return false;}}
async function userForEmail(email){if(!supabaseClient||!email)return null;var em=email.toLowerCase();try{var res=await supabaseClient.from("users").select("*").eq("email",em).single();if(res&&res.data&&res.data.name)return res.data;var all=await supabaseClient.from("users").select("*");return ((all&&all.data)||[]).filter(function(u){return u&&u.name&&String(u.email||"").toLowerCase()===em;})[0]||null;}catch(e){return null;}}
function devProfiles(){try{return JSON.parse(localStorage.getItem("nspca-device-profiles")||"[]");}catch(e){return[];}}
function devProfilesSave(p){try{localStorage.setItem("nspca-device-profiles",JSON.stringify(p));}catch(e){}}
async function pinHash(email,pin){var enc=new TextEncoder().encode(email.toLowerCase()+":"+pin+":nspca");var buf=await crypto.subtle.digest("SHA-256",enc);return Array.prototype.map.call(new Uint8Array(buf),function(b){return ("0"+b.toString(16)).slice(-2);}).join("");}
async function devProfileSet(email,name,pin){var p=devProfiles().filter(function(x){return x.email!==email;});p.push({email:email,name:name,pin:pin?await pinHash(email,pin):"",refresh:(AUTH&&AUTH.refresh_token)||""});devProfilesSave(p);}
async function devProfileKeep(email,name){var old=devProfiles().find(function(x){return x.email===email;});var p=devProfiles().filter(function(x){return x.email!==email;});p.push({email:email,name:name,pin:old&&old.pin?old.pin:"",refresh:(AUTH&&AUTH.refresh_token)||""});devProfilesSave(p);}
function pinOffer(em,user){var box=document.getElementById("login-auth");if(!box){finishAuthLogin(user);return;}window._pinOfferUser=user;window._pinOfferEm=em;
  box.innerHTML='<h1>Quick unlock</h1><div class="lg-sub">Set a 4-digit PIN for this device? Next time, tap your name and type the PIN.</div><div class="lg-f"><label for="pin-offer">4-digit PIN</label><input id="pin-offer" type="password" inputmode="numeric" maxlength="4" autocomplete="off" onkeydown="if(event.key===\'Enter\')pinOfferSet()"></div><button class="lg-btn" onclick="pinOfferSet()">Set PIN</button><div class="lg-lnk"><a href="#" onclick="pinOfferSkip();return false">Not now</a></div>';
  setTimeout(function(){var e=document.getElementById("pin-offer");if(e)e.focus();},50);}
async function pinOfferSet(){var v=(document.getElementById("pin-offer")||{}).value||"";var err=document.getElementById("login-err");if(!/^\d{4}$/.test(v)){if(err){err.textContent="Four digits, numbers only.";err.style.display="block";}return;}if(err)err.style.display="none";var u=window._pinOfferUser;await devProfileSet(window._pinOfferEm,u.name,v);try{localStorage.setItem("nspca-pin-asked:"+window._pinOfferEm,"1");}catch(_e){}await finishAuthLogin(u);}
async function pinOfferSkip(){var u=window._pinOfferUser;try{localStorage.setItem("nspca-pin-asked:"+window._pinOfferEm,"1");}catch(_e){}var err=document.getElementById("login-err");if(err)err.style.display="none";await finishAuthLogin(u);}
function devProfileForget(email){devProfilesSave(devProfiles().filter(function(x){return x.email!==email;}));renderLoginState();}
async function finishAuthLogin(user){LOGGED_IN=true;CURRENT_USER=user;window._wnShownSession=false;localStorage.setItem("nspca-intake-auth",user.code||("EMAIL:"+user.email));localStorage.setItem("nspca-user-name",user.name);localStorage.setItem("nspca-user-role",user.role||"staff");window._prevLogin=userLastLogin(user.code||user.email);window._catchupDismissed=false;recordLastLogin(user.code||user.email);setupAutoLogout();await refreshAllUsers();if(goHomeApp(user,!!window._explicitLogin))return;window._explicitLogin=false;await famEnterAppSafe();}
async function doEmailLogin(){var em=(document.getElementById("login-email")||{}).value||"";var pw=(document.getElementById("login-pass")||{}).value||"";var err=document.getElementById("login-err");var btn=document.getElementById("login-btn2");em=em.trim().toLowerCase();if(!em||!pw)return;err.style.display="none";btn.textContent="Signing in\u2026";btn.disabled=true;
  try{window._explicitLogin=true;var au=await authSignIn(em,pw);var user=await userForEmail(em);if(!user){await authSignOut();throw new Error("Signed in, but no account in Manage Users has this email. Ask an admin to add it.");}if(user.active===false){await authSignOut();throw new Error("This account is deactivated.");}
    var prev=devProfiles().find(function(x){return x.email===em;});await devProfileKeep(em,user.name);
    var asked=false;try{asked=!!localStorage.getItem("nspca-pin-asked:"+em);}catch(_e){}
    if(!(prev&&prev.pin)&&!asked){pinOffer(em,user);return;}
    await finishAuthLogin(user);}
  catch(e){err.textContent=e.message||"Sign-in failed";err.style.display="block";btn.textContent="Sign in";btn.disabled=false;}}
async function doPinUnlock(email){var pin=(document.getElementById("login-pin")||{}).value||"";var err=document.getElementById("login-err");var p=devProfiles().find(function(x){return x.email===email;});if(!p)return;if(!p.pin){err.textContent="No PIN set for this person \u2014 sign in with the password.";err.style.display="block";return;}
  if(await pinHash(email,pin)!==p.pin){err.textContent="Wrong PIN.";err.style.display="block";window._pinBuf="";var _pi=document.getElementById("login-pin");if(_pi)_pi.value="";lgPinDraw();return;}
  await devUnlock(email);}
async function devUnlock(email){var err=document.getElementById("login-err")||{style:{}};var p=devProfiles().find(function(x){return x.email===email;});if(!p)return;
  AUTH={access_token:"",refresh_token:p.refresh,expires_at:0,user:{email:email}};var ok=await authRefresh();if(!ok){err.textContent="Session expired \u2014 sign in with the password once.";err.style.display="block";devProfileForget(email);return;}
  var user=await userForEmail(email);if(!user||user.active===false){await authSignOut();err.textContent="Account not active.";err.style.display="block";return;}
  var p2=devProfiles();var mine=p2.find(function(x){return x.email===email;});if(mine)mine.refresh=AUTH.refresh_token;devProfilesSave(p2);await finishAuthLogin(user);}
async function doForgot(){var em=((document.getElementById("login-email")||{}).value||"").trim().toLowerCase();var err=document.getElementById("login-err");if(!em){err.textContent="Type your email first, then tap Forgotten password.";err.style.display="block";return;}var ok=await authRecover(em);err.style.setProperty("color",ok?"#bbf7d0":"#fca5a5","important");err.style.borderLeftColor=ok?"#22c55e":"#ef4444";err.style.background=ok?"#143322":"#3a1d1d";err.textContent=ok?"Reset link sent \u2014 check your email.":"Couldn\u0027t send a reset link. "+(window._authErr||"");err.style.display="block";}
function authFromHash(){var h=location.hash||"";if(h.indexOf("access_token=")<0)return null;var p={};h.replace(/^#/,"").split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)p[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1));});return p.access_token?p:null;}
async function authSetPassword(){var pw=(document.getElementById("setpw-1")||{}).value||"";var pw2=(document.getElementById("setpw-2")||{}).value||"";var pin=(document.getElementById("setpw-pin")||{}).value||"";var err=document.getElementById("login-err");err.style.display="none";
  if(pw.length<8){err.textContent="Password needs at least 8 characters.";err.style.display="block";return;}if(pw!==pw2){err.textContent="The two passwords don\u0027t match.";err.style.display="block";return;}
  try{var r=await fetch(SUPABASE_URL+"/auth/v1/user",{method:"PUT",headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+authToken(),"Content-Type":"application/json"},body:JSON.stringify({password:pw})});var d=await r.json();if(!r.ok)throw new Error(d.msg||d.message||d.error_description||"Couldn\u0027t set the password");
    var em=authEmail();var user=await userForEmail(em);if(!user){err.textContent="Password set. But no account in Manage Users has "+em+" \u2014 ask an admin to add it, then sign in.";err.style.display="block";window._setPw=false;await authSignOut();renderLoginState();return;}
    await devProfileSet(em,user.name,/^\d{4}$/.test(pin)?pin:"");window._setPw=false;history.replaceState(null,"",location.pathname);await finishAuthLogin(user);}
  catch(e){err.textContent=e.message;err.style.display="block";}}
function renderLoginState(){var box=document.getElementById("login-auth");if(!box)return;var mode=window._loginMode||"auth";var err=document.getElementById("login-err");if(err&&!window._loginKeepErr){err.style.display="none";}window._loginKeepErr=false;var v=document.getElementById("login-ver");if(v)v.textContent="v"+APP_VERSION;
  var F=function(id,type,ph,extra){return '<div class="lg-f"><label for="'+id+'">'+ph+'</label><input id="'+id+'" type="'+type+'" '+(extra||"")+'></div>';};
  if(window._setPw){box.innerHTML='<h1>Set your password</h1><div class="lg-sub">'+esc(authEmail())+'</div>'+F("setpw-1","password","New password (8+ characters)",'autocomplete="new-password"')+F("setpw-2","password","Again",'autocomplete="new-password"')+F("setpw-pin","password","4-digit PIN for this device (optional)",'inputmode="numeric" maxlength="4"')+'<button class="lg-btn" onclick="authSetPassword()">Save and sign in</button>';return;}
  var prof=devProfiles();var who=window._loginWho||"";
  if(mode==="code"){box.innerHTML='<h1>Access code</h1><div class="lg-sub">The old way in. Ask an admin for your email sign-in.</div><div class="lg-f"><label for="login-code">Code</label><input id="login-code" type="password" style="text-align:center;letter-spacing:.14em;font-size:20px" onkeydown="if(event.key===\'Enter\')doLogin()"></div><button class="lg-btn" id="login-btn" onclick="doLogin()">Enter &rarr;</button><div class="lg-lnk"><a href="#" onclick="window._loginMode=\'auth\';renderLoginState();return false">Sign in with email instead</a></div>';setTimeout(function(){var e=document.getElementById("login-code");if(e)e.focus();},50);return;}
  if(prof.length&&!who&&mode==="auth"&&!window._loginFull){box.innerHTML='<h1>Who\u0027s this?</h1><div class="lg-sub">Tap your name, then your PIN.</div><div class="lg-avs">'+prof.map(function(p){var nm=p.name||p.email;return '<div class="lg-av" data-em="'+esc(p.email)+'" onclick="lgAvTap(this)"><i style="background:'+avatarColor(nm)+'">'+esc(initials(nm))+'</i><b>'+esc(String(nm).split(" ")[0])+'</b></div>';}).join("")+'<div class="lg-av more" onclick="window._loginFull=true;renderLoginState()"><i>+</i><b>Someone else</b></div></div>';return;}
  if(who){var p=prof.find(function(x){return x.email===who;})||{};window._pinBuf="";var first=String(p.name||who).split(" ")[0];
    box.innerHTML='<h1>Hi '+esc(first)+'</h1><div class="lg-sub">'+(p.bio&&bioOK()?'Face or fingerprint, or your 4-digit PIN.':'Your 4-digit PIN for this device.')+'</div>'+(p.bio&&bioOK()?'<button class="lg-btn lg-bio" onclick="bioUnlock(window._loginWho)">Unlock with face or fingerprint</button>':'')+'<div class="lg-dots" id="lg-dots"><i></i><i></i><i></i><i></i></div><input id="login-pin" type="password" inputmode="numeric" maxlength="4" style="position:absolute;opacity:0;pointer-events:none" oninput="lgPinSync(this.value)"><div class="lg-pad">'+["1","2","3","4","5","6","7","8","9"].map(function(n){return '<span onclick="lgPinKey(\''+n+'\')">'+n+'</span>';}).join("")+'<span class="x" onclick="window._loginWho=\'\';renderLoginState()">not me</span><span onclick="lgPinKey(\'0\')">0</span><span class="x" onclick="lgPinKey(\'del\')">delete</span></div><div class="lg-lnk"><a href="#" onclick="window._loginWho=\'\';window._loginFull=true;renderLoginState();return false">Use my password instead</a> &middot; <a href="#" style="color:#6b7280" onclick="devProfileForget(window._loginWho);window._loginWho=\'\';renderLoginState();return false">Forget me on this device</a></div>';
    window._pinWho=who;setTimeout(function(){var e=document.getElementById("login-pin");if(e&&window.matchMedia&&!window.matchMedia("(pointer:coarse)").matches)e.focus();},50);return;}
  box.innerHTML='<h1>Sign in</h1>'+F("login-email","email","Email",'autocomplete="username" inputmode="email"')+F("login-pass","password","Password",'autocomplete="current-password" onkeydown="if(event.key===\'Enter\')doEmailLogin()"')+'<button class="lg-btn" id="login-btn2" onclick="doEmailLogin()">Sign in</button><div class="lg-lnk"><a href="#" onclick="doForgot();return false">Forgotten your password?</a> &middot; <a href="#" onclick="window._loginMode=\'code\';renderLoginState();return false">Access code</a>'+(prof.length?' &middot; <a href="#" onclick="window._loginFull=false;renderLoginState();return false">Back</a>':'')+'</div>';setTimeout(function(){var e=document.getElementById("login-email");if(e)e.focus();},50);}
function lgAvTap(el){var em=el.getAttribute("data-em")||"";window._loginWho=em;renderLoginState();var p=devProfiles().find(function(x){return x.email===em;});if(p&&p.bio&&bioOK())bioUnlock(em);}
function lgPinSync(v){window._pinBuf=String(v||"").replace(/\D/g,"").slice(0,4);lgPinDraw();if(window._pinBuf.length===4)doPinUnlock(window._pinWho);}
function lgPinKey(k){var b=window._pinBuf||"";if(k==="del")b=b.slice(0,-1);else if(b.length<4)b+=k;window._pinBuf=b;var inp=document.getElementById("login-pin");if(inp)inp.value=b;lgPinDraw();if(b.length===4)doPinUnlock(window._pinWho);}
function lgPinDraw(){var d=document.getElementById("lg-dots");if(!d)return;var n=(window._pinBuf||"").length;Array.prototype.forEach.call(d.children,function(el,i){el.className=i<n?"f":"";});}
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
  var savedCode=localStorage.getItem("nspca-intake-auth");
  if(AUTH&&AUTH.refresh_token&&savedCode&&savedCode.indexOf("EMAIL:")===0){savedCode="";(async function(){var ok=await authRefresh();var u=ok?await userForEmail(authEmail()):null;if(u&&u.active!==false){await finishAuthLogin(u);}else{authSave(null);showScreen("login-screen");}})();}
  if(savedCode){
    var user=USERS.find(function(u){return u.code===savedCode;});
    if(user){LOGGED_IN=true;CURRENT_USER=user;localStorage.setItem("nspca-user-name",user.name);localStorage.setItem("nspca-user-role",user.role);setupAutoLogout();if(goHomeApp(user,false))return;refreshAllUsers().then(function(){return famEnterAppSafe();});}
    else if(supabaseClient){(async function(){var sc=savedCode;if(AUTH&&AUTH.refresh_token){try{await authRefresh();}catch(e){}}
      var u=null,net=false;try{var res=await supabaseClient.from("users").select("*").eq("code",sc).single();if(res&&res.data&&res.data.name)u=res.data;else if(res&&res.error&&!res.error.code)net=true;}catch(e){net=true;}
      if(!u&&net){var nm=localStorage.getItem("nspca-user-name");if(nm)u={code:sc,name:nm,role:localStorage.getItem("nspca-user-role")||"staff"};}
      if(!u||u.active===false){localStorage.removeItem("nspca-intake-auth");showScreen("login-screen");return;}
      LOGGED_IN=true;CURRENT_USER=u;localStorage.setItem("nspca-user-name",u.name);localStorage.setItem("nspca-user-role",u.role||"staff");setupAutoLogout();if(goHomeApp(u,false))return;await refreshAllUsers();await famEnterAppSafe();})();}
    else{showScreen("login-screen");}
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
function famEsc(v){return (v===null||v===undefined?"":""+v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");}
async function famEnterAppSafe(){if(typeof famEnterApp==="function")return famEnterApp();if(typeof loadRecordsList==="function")await loadRecordsList();if(typeof showDashboard==="function")showDashboard();}
function famRoleLabel(u){u=u||{};if(famTitle(u))return famTitle(u);var r=u.role||"staff";return r==="admin"?"Admin":r==="manager"?"Manager":r==="supervisor"?"Supervisor":r==="asst"?"Assistant Supervisor":r==="coordinator"?"Rehoming Co-Ordinator":r==="trainer"?"Dog Trainer & Behaviour Specialist":r==="director"?"Director":"Staff";}
function famMe(){var me=CURRENT_USER||{name:currentName(),code:localStorage.getItem("nspca-intake-auth")||"",role:currentRole()};var row=(getAllUsersSync()||[]).filter(function(u){return u.code===me.code;})[0];return Object.assign({},row||{},me);}

// ── A small bottom sheet that every app can use (own styles, so it looks the same everywhere) ──
function famSheet(title,body){var o=document.getElementById("famsheet");if(!o){o=document.createElement("div");o.id="famsheet";document.body.appendChild(o);}
  o.innerHTML='<div class="fam-bg" onclick="famSheetClose()"></div><div class="fam-sh" role="dialog" aria-label="'+famEsc(title)+'"><div class="fam-grab"></div><div class="fam-shh"><b>'+famEsc(title)+'</b><span onclick="famSheetClose()">Cancel</span></div><div class="fam-shb">'+body+'</div></div>';
  setTimeout(function(){var e=o.querySelector("input,textarea");if(e)e.focus();},60);}
function famSheetClose(){var o=document.getElementById("famsheet");if(o)o.remove();}
function pwSheet(){famSheet("Change password",'<label class="fam-l">New password <em>8 or more characters</em></label><input id="pw-1" class="fam-in" type="password" autocomplete="new-password">'
  +'<label class="fam-l">Again</label><input id="pw-2" class="fam-in" type="password" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')pwSave()">'
  +'<div id="pw-err" class="fam-err" style="display:none"></div><button class="fam-go" id="pw-go" onclick="pwSave()">Save new password</button>');}
function pwClose(){famSheetClose();}
var FAM_META={phone:["Phone","for the rota and call-outs",false],since:["On the team since","e.g. Mar 2025",false],about:["A line about you","e.g. Intake, assessments and the day reports.",true]};
function famMetaSheet(k){var me=famMe();var f=FAM_META[k];if(!f)return;var v=userMeta(me.code)[k]||"";
  famSheet(f[0],(f[2]?'<textarea id="fam-meta" class="fam-in" rows="3" placeholder="'+famEsc(f[1])+'">'+famEsc(v)+'</textarea>':'<input id="fam-meta" class="fam-in" value="'+famEsc(v)+'" placeholder="'+famEsc(f[1])+'" onkeydown="if(event.key===\'Enter\')famMetaSave(\''+k+'\')">')
    +'<button class="fam-go" onclick="famMetaSave(\''+k+'\')">Save</button>');}
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
  var av=photo?'<img src="'+(typeof blobSrc==="function"?blobSrc(photo):photo)+'" alt="">':'<span style="background:'+avatarColor(me.name)+'">'+famEsc(initials(me.name))+'</span>';
  h+='<div class="fam-me"><label class="fam-ph">'+av+'<i>Edit</i><input type="file" accept="image/*" style="display:none" onchange="handleAvatarUpload(this)"></label><div class="fam-mt"><b>'+famEsc(me.name)+'</b><small>'+famEsc(famRoleLabel(me))+(email?' · '+famEsc(email):' · code sign-in')+'</small>'+(meta.about?'<div class="fam-ab">'+famEsc(meta.about)+'</div>':'')+(photo?'<u onclick="removeAvatar()">Remove photo</u>':'')+'</div></div>';
  // your week
  var cur=W.data[tab];var pill=function(a){var d=W.data[a[0]];var n=d&&d.stats?d.total:null;return '<span class="'+(tab===a[0]?"on":"")+'" onclick="window._famTab=\''+a[0]+'\';showDashSection(\'profile\')">'+a[1]+(n!==null?' <em>'+n+'</em>':'')+'</span>';};
  h+='<div class="fam-card"><div class="fam-lbl">Your week <em>from Monday</em></div><div class="fam-apps">'+FAM_APPS.map(pill).join("")+'</div>'
    +(cur&&cur.stats?'<div class="fam-nums">'+cur.stats.map(function(x){return '<div><b>'+(x[0]||0)+'</b><span>'+famEsc(x[1])+'</span></div>';}).join("")+'</div>'+(cur.names&&cur.names.length?'<div class="fam-names">'+cur.names.slice(0,8).map(function(n){return '<span>'+famEsc(n)+'</span>';}).join("")+(cur.names.length>8?'<span>+'+(cur.names.length-8)+'</span>':'')+'</div>':'')
      :'<div class="fam-wait">'+(W.loading?"Counting…":"Nothing to count here yet.")+'</div>')
    +'</div>';
  // about me
  var ed=function(k){return '<span class="fam-btn" onclick="famMetaSheet(\''+k+'\')">'+(meta[k]?"Edit":"Add")+'</span>';};
  h+='<div class="fam-card"><div class="fam-lbl">About me <em>everyone sees this</em></div>'
    +famRow("Phone",famEsc(meta.phone||"not added"),ed("phone"))+famRow("On the team since",famEsc(meta.since||"not added"),ed("since"))+famRow("A line about you",famEsc(meta.about||"not added"),ed("about"))+'</div>';
  // sign-in
  var pinSet=devProfiles().some(function(p){return p.email===email&&p.pin;});var devices=devProfiles().length;
  h+='<div class="fam-card"><div class="fam-lbl">Sign-in</div>'
    +famRow("Email",email?famEsc(email):"Signed in with a code — ask an admin to add your email")
    +(email?famRow("Password","change it here",'<span class="fam-btn" onclick="pwSheet()">Change</span>')+famRow("PIN on this device",pinSet?"set · quick unlock":"not set",'<span class="fam-btn" onclick="setDevicePin()">'+(pinSet?"Change":"Set")+'</span>'):'')
    +'</div>';
  // your apps
  var home=(typeof homeAppFor==="function"&&homeAppFor(me))||"dogs";var look=role!=="admin"&&typeof lookOnlyFor==="function"&&lookOnlyFor(me);
  h+='<div class="fam-card"><div class="fam-lbl">Your apps <em>set by an admin</em></div>'+famRow("Opens in","",'<span class="fam-tag g">'+famEsc(famAppName(home))+'</span>')
    +FAM_APPS.filter(function(a){return a[0]!==home;}).map(function(a){return famRow(famEsc(a[1]),"",look?'<span class="fam-tag v">Look only</span>':'<span class="fam-tag">Full use</span>');}).join("")+'</div>';
  // this device
  var on=prefGet("bigtext","0")==="1";
  h+='<div class="fam-card"><div class="fam-lbl">On this device</div>'
    +famRow("Auto sign-out","after this long untouched",famSeg(getAutoLogoutMins(),[[0,"Off"],[15,"15m"],[30,"30m"],[120,"2h"]],"setAutoLogoutMins(%v);showDashSection(&quot;profile&quot;)"))
    +famRow("Larger text","for the corridor, gloves on",famSeg(on?"1":"0",[["0","Off"],["1","On"]],"prefSet(&quot;bigtext&quot;,&quot;%v&quot;)"))
    +famDeviceRows()
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
  var shared=function(u){return !u.email&&!famTitle(u)&&(u.role||"staff")==="staff";};
  var people=all.filter(function(u){return !shared(u);}),codes=all.filter(shared);
  var now=Date.now(),me=(CURRENT_USER||{}).code;
  var emailN=all.filter(function(u){return u.email&&u.active!==false;}).length;var invited=all.filter(function(u){return u.email&&u.active===false;});
  var quiet=people.filter(function(u){var t=userLastIn(u);return t&&now-t>14*864e5&&u.active!==false;});
  var bits=['<b>'+emailN+' on email sign-in</b>'];if(codes.length)bits.push(codes.length+' shared code'+(codes.length===1?'':'s'));if(invited.length)bits.push('<b>'+esc(invited.map(function(u){return u.name;}).join(", "))+' invited</b> — not in yet');
  var sent=bits.join(", ")+'.'+(quiet.length?' '+esc(quiet.slice(0,2).map(function(u){return u.name;}).join(" and "))+' last in '+fmtAgo(userLastIn(quiet[0]))+'.':'');
  var row=function(u){var ri=famTitle(u)?[famTitle(u).toUpperCase(),"#0f766e"]:userRoleInfo(u.role);var t=userLastIn(u);var off=u.active===false;var inv=off&&u.email;var r;
    if(u.code===me)r='<span class="ur-s on">in now</span>';else if(inv)r='<span class="ur-s inv">invited</span>';else if(off)r='<span class="ur-s off">switched off</span>';else r='<span class="ur-s'+(t&&now-t<7*864e5?' on':'')+'">'+(t?esc(fmtAgo(t)):'—')+'</span>';
    var sub=u.email?'email · '+esc(u.email):'code '+esc(u.code)+(shared(u)?' · shared':'');if(u.source==="app")sub+=' · built-in';
    return '<div class="ur'+(off&&!inv?' off':'')+'" onclick="userTap(\''+esc(u.code)+'\')">'+userAvatarHtml(u,34)+'<div class="ur-m"><b>'+esc(u.name)+' <span class="ur-rp" style="background:'+ri[1]+'">'+ri[0]+'</span></b><small>'+sub+'</small></div>'+r+'</div>';};
  var h='<div class="rxhead"><button onclick="(typeof boardBack===\'function\'?boardBack():loadRecordsList().then(function(){renderDashboard();}))" class="rxback">&#8592; Dashboard</button><h2>Manage users</h2></div><div class="rxsub">Who can sign in, how, and when they were last in.</div>';
  h+='<div class="rxstrip"><div class="rxlt">'+all.length+'<small>people</small></div><div class="rxtx">'+sent+'</div></div>';
  h+='<button class="btn btnp" style="width:100%;margin-bottom:4px" onclick="showAddUserModal()">+ Add someone</button>';
  h+='<div class="rxlbl">People <em>'+people.length+'</em></div><div class="rxlist">'+people.map(row).join("")+'</div>';
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
    +'<button onclick="saveEditedUser(\''+esc(code)+'\')" class="btn btnp" style="width:100%;padding:10px;font-size:13px;font-weight:600">Save changes</button>'
    +((u.code!==((CURRENT_USER||{}).code))?'<button onclick="this.closest(\'.edit-user-ov\').remove();toggleUserActive(\''+esc(code)+'\','+(u.active===false)+')" style="width:100%;margin-top:8px;padding:9px;font-size:12px;background:'+(u.active===false?'#dcfce7':'#fef9c3')+';border:none;color:'+(u.active===false?'#166534':'#854d0e')+';border-radius:8px;cursor:pointer;font-family:inherit;font-weight:700">'+(u.active===false?'Switch '+esc(u.name)+' back on':'Switch '+esc(u.name)+' off \u2014 can\u2019t sign in')+'</button>':'')
    +(userRemovable(u)
      ?'<button onclick="removeUser(\''+esc(code)+'\')" style="width:100%;margin-top:8px;padding:9px;font-size:12px;background:none;border:0.5px solid #fca5a5;color:#991b1b;border-radius:8px;cursor:pointer;font-family:inherit">Remove '+esc(u.name)+' from the app</button>'
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
    var _upd=await supabaseClient.from("users").update(Object.assign({name:name,role:role,title:(((document.getElementById("edit-user-title")||{}).value||"").trim())||null},{email:(((document.getElementById("edit-user-email")||{}).value||"").trim().toLowerCase())||null})).eq("code",code);if(_upd&&_upd.error)throw _upd.error;
    var ov=document.querySelector(".edit-user-ov");if(ov)ov.remove();
    await refreshAllUsers();
    showDashSection("users");
  }catch(e){appAlert("Could not save changes"+(e&&e.message?" \u2014 "+e.message:"."));}
}
async function toggleUserActive(code,makeActive){
  if(!supabaseClient)return;
  try{
    var _act2=await supabaseClient.from("users").update({active:makeActive}).eq("code",code);if(_act2&&_act2.error)throw _act2.error;
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
  var x='<span class="fx" role="button" tabindex="0" title="Hide until next time" onclick="try{localStorage.setItem(\''+key+'\',\'1\')}catch(e){};renderDashboard()">✕</span>';
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
  if(on)h+='<div class="fam-pk">'+FAM_PUSH_KINDS.filter(function(k){return here==="dogs"||k[0]!=="weather";}).map(function(k){var kon=pp[k[0]]!==false;return '<span class="fam-pkc'+(kon?' on':'')+'" onclick="pushKind(\''+k[0]+'\')" title="'+k[2]+'">'+(kon?'✓ ':'')+k[1]+'</span>';}).join("")+'</div>';
  return h;}
(function(){if(document.getElementById("fam-css3"))return;var st=document.createElement("style");st.id="fam-css3";st.textContent=".fam-pk{display:flex;flex-wrap:wrap;gap:6px;padding:2px 0 10px}.fam-pkc{font-size:11.5px;font-weight:800;padding:5px 10px;border-radius:20px;border:1.5px solid #e4e7e0;background:#fff;color:#6b7280;cursor:pointer}.fam-pkc.on{background:#282932;border-color:#282932;color:#c6e76c}.lg-btn.lg-bio{margin:4px 0 14px;background:#c6e76c;color:#282932}";document.head.appendChild(st);})();
