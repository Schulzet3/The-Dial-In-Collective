import * as C from '../lib/constants.js';
import * as M from '../lib/model.js';
import * as E from '../lib/engine.js';
import * as U from '../lib/ui.js';
import {createCloudClient,secureOrigin,validateNewPassword,PASSWORD_HINT} from './client.js';
import {IndexedStore,Outbox} from './outbox.js';
import {hydrate,applyPending,shotPayload} from './mapping.js';
import {CLOUD_CONFIG} from './config.js';
import {emailConfirmationView} from './confirmation.js';
const {e,button,icon,field,select,checkbox,recipeGrid,styleBadge,chips,radar,scales,shotSummary,humanDate}=U;
const root=document.querySelector('#app'),sheet=document.querySelector('#sheet');
const uuid=()=>crypto.randomUUID();
function exportFile(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`The_Dial_In_Collective_Cloud_Test_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
class CloudApp {
 constructor(client,store=new IndexedStore()){
  Object.assign(this,{client,store,identity:null,status:null,raw:null,state:M.blankState(),pending:[],expanded:new Set(),shotExpanded:new Set(),search:'',sort:'recent',searchOpen:false,tempCoffee:null,justSavedId:null,notice:'',authView:'signin',confirmationEmail:'',recovery:false,syncState:'connecting',busy:false,flushing:null,epoch:0});
  this.queue=new Outbox({store,remote:client,identity:()=>this.identity,notify:r=>{this.syncState=r.state;}});
 }
 async init(){
  document.addEventListener('click',ev=>this.click(ev));document.addEventListener('submit',ev=>this.submit(ev));
  document.addEventListener('input',ev=>this.input(ev));document.addEventListener('change',ev=>this.change(ev));
  sheet.addEventListener('cancel',ev=>ev.preventDefault());
  this.client.onAuthChange((event,user)=>{if(event==='PASSWORD_RECOVERY'){this.recovery=true;}if(this.identity?.id!==user?.id){this.epoch++;this.status=null;this.raw=null;this.state=M.blankState();this.expanded.clear();this.pending=[];sheet.close();}this.identity=user;if(event==='SIGNED_OUT'){this.status=null;this.render();}else if(user&&event!=='TOKEN_REFRESHED')this.connect().catch(err=>this.error(err));});
  try{this.identity=await this.client.identity();}catch{/* Missing session is the normal signed-out state. */}
  if(this.identity)await this.connect();else this.render();
  addEventListener('online',()=>this.sync().catch(err=>this.error(err)));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&this.identity)this.sync().catch(err=>this.error(err));});
  this.poll=setInterval(()=>{if(document.visibilityState==='visible'&&this.identity&&this.status?.admitted&&!this.busy)this.sync().catch(()=>{});},30000);
 }
 async connect(){
  const user=this.identity,epoch=this.epoch;if(!user)return;
  try{const status=await this.client.status();if(epoch!==this.epoch||user.id!==this.identity?.id)return;this.status=status;
   if(!status.admitted){this.raw=null;this.state=M.blankState();this.render();return;}
   const cache=await this.store.readCache(user.id);if(cache&&epoch===this.epoch)this.raw=cache.snapshot;
   await this.sync();
  }catch(err){if(epoch===this.epoch){this.notice=err.message;this.syncState='offline';this.render();}}
 }
 async sync(){if(this.flushing)return this.flushing;this.flushing=this.doSync().finally(()=>this.flushing=null);return this.flushing;}
 async doSync(){
  const who=this.identity,epoch=this.epoch;if(!who||!this.status?.admitted)return;
  const outcome=await this.queue.flush();if(epoch!==this.epoch||who.id!==this.identity?.id)return;
  this.syncState=outcome.state;this.pending=await this.store.list(who.id);
  try{const raw=await this.client.read();if(epoch!==this.epoch||who.id!==this.identity?.id)return;await this.store.saveCache(who.id,raw);this.raw=raw;}catch(err){this.syncState='offline';const saved=await this.store.readCache(who.id);if(epoch!==this.epoch||who.id!==this.identity?.id)return;if(saved)this.raw=saved.snapshot;if(!this.raw)throw err;}
  this.state=applyPending(hydrate(this.raw),this.pending);
  if(!this.expanded.size&&M.workspace(this.state).currentCoffeeId)this.expanded.add(M.workspace(this.state).currentCoffeeId);
  this.render();
 }
 async mutate(action,payload,{onlineOnly=false}={}){
  if(!this.identity||!this.status?.admitted)throw new Error('Sign in with beta access first.');
  if(onlineOnly&&(!navigator.onLine||this.pending.length))throw new Error('Reconnect and finish syncing before changing this setting. Offline shot logging remains available.');
  await this.queue.enqueue(action,payload);this.pending=await this.store.list(this.identity.id);
  this.state=applyPending(hydrate(this.raw),this.pending);this.render();
  await this.sync();
  if(onlineOnly&&this.pending.length)throw new Error('The change is preserved in the sync queue. Open Sync details to check its status.');
 }
 error(err){this.notice=err.message||'The change could not be completed.';const box=sheet.querySelector('[role=alert]');if(box)box.textContent=this.notice;else this.render();}
 theme(){const dark=this.state.theme==='dark'||(this.state.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';}
 show(title,body){sheet.innerHTML=`<div class=sheet-layout><header class=sheet-header><h2 id=sheet-title>${e(title)}</h2>${button(icon('close',21),'close','aria-label="Close"','icon-button')}</header><div class=sheet-content>${body}<div role=alert class=helper></div></div>`;if(!sheet.open)sheet.showModal();sheet.querySelector('[data-action=close]').focus({preventScroll:true});}
 render(){
  const openDetails=[...root.querySelectorAll('details[data-retain][open]')].map(x=>x.dataset.retain);
  this.theme();const connected=this.identity&&this.status?.admitted&&!this.recovery;
  root.innerHTML=`<header class=app-header><div class=header-inner><div class=brand>${icon('coffee',27)}<div><h1>The Dial In Collective</h1><div class=tagline>Better espresso through shared experience.</div></div></div>${connected?button(icon('settings',20),'settings','aria-label="Settings"','icon-button'):''}</div></header><main class=shell>${connected?this.coffees():this.auth()}${this.notice?`<p class="helper space-top" role=status>${e(this.notice)}</p>`:''}<footer class=footer>Owner development test · no production migration or live community publishing.<br>Your original local prototype is separate and unchanged.</footer></main>`;
  for(const details of root.querySelectorAll('details[data-retain]'))if(openDetails.includes(details.dataset.retain))details.open=true;
 }
 auth(){
  const email=()=>field('Email','email','',{type:'email',required:true,extra:'autocomplete="email"'});
  const freshHint=`<p class="helper" id="password-requirements">${e(PASSWORD_HINT)}</p>`;
  const password=(fresh=false)=>field(fresh?'New password':'Password','password','',{type:'password',required:true,extra:`autocomplete="${fresh?'new-password':'current-password'}" ${fresh?'minlength="8" aria-describedby="password-requirements"':''}`});
  if(this.recovery)return `<section class=welcome><h2>Choose a new password</h2><form id=auth-password>${password(true)}${freshHint}<button class="primary full space-top">Save password</button></form></section>`;
  if(this.identity)return `<section class=welcome><h2>Your invitation</h2><p class=helper>${e(this.identity.email)}</p><p class=helper>${this.status?.emailVerified?'Use the beta invitation supplied for your account.':'Verify your email before requesting beta access.'}</p><form id=auth-invite>${field('Invitation code','token','',{required:true})}<button class="primary full space-top">Use invitation</button></form>${button('Sign out','signout','','text-button')}</section>`;
  if(this.authView==='check-email')return emailConfirmationView(this.confirmationEmail);
  const reset=this.authView==='reset',signup=this.authView==='signup';
  return `<section class="welcome cloud-auth"><h2>${reset?'Reset your password':signup?'Create your account':'Welcome back'}</h2><p class=helper>Your coffee, wherever you brew.</p><form id="auth-${this.authView}">${email()}${reset?'':password(signup)}${signup?freshHint:''}<button class="primary full space-top">${reset?'Send recovery email':signup?'Create account':'Sign in'}</button></form><div class=row-actions>${button(signup||reset?'Back to sign in':'Create an account','auth-view',`data-view="${signup||reset?'signin':'signup'}"`,'text-button')}${!reset?button('Forgot password?','auth-view','data-view="reset"','text-button'):''}</div></section>`;
 }
 coffees(){
  const s=this.state,setup=M.activeSetup(s),w=M.workspace(s);
  if(!setup)return `<section class="welcome text-center"><h2>A better next shot.</h2><p class=helper>Create a test setup to begin. Do not import your real backup until backup/restore testing is complete.</p>${button('Set up my workspace','new-setup','','primary')}</section>`;
  const list=M.visibleCoffees(s,this.sort,this.search,this.tempCoffee);
  return `<nav class=app-nav>${button(`${icon('coffee',16)} Coffees`,'home','','active')}${button(`${icon('users',16)} Community`,'community','','')}<span class=local-label>${button(this.pending.length?`${this.pending.length} pending`:this.syncState==='synced'?'Cloud synced':'Offline','sync','','text-button')}</span></nav><div class=workspace-bar><div><div class=eyebrow>Your workspace</div><h2>Coffees</h2></div>${button(`${e(setup.name)} ${icon('chevron',14)}`,'switch','','setup-switch')}</div>${button(`${icon('plus',16)} Add Coffee`,'add','','primary full')}${button(`Search & sort ${icon('chevron',14)}`,'search-toggle',`aria-expanded="${this.searchOpen}"`,'browse-toggle')}${this.searchOpen?`<div class=search-tools><input id=search type=search value="${e(this.search)}" aria-label="Search coffee information" placeholder="Name, origin, notes..."><select id=sort aria-label=Sort><option value=recent ${this.sort==='recent'?'selected':''}>Recent</option><option value=az ${this.sort==='az'?'selected':''}>A-Z</option></select></div>`:''}${list.map(c=>{
   const open=this.expanded.has(c.id),p=M.coffeeState(s,c.id),rec=E.recommendation(s,c.id),v=M.activeVersion(s);const shots=s.shots.filter(sh=>sh.coffeeId===c.id&&!sh.hidden).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));const local=shots.filter(sh=>sh.setupVersionId===v.id&&sh.style===p.style),last=local[0];const success=M.hasLocalSuccess(s,c.id,p.style);const advice=last?E.nextAdvice(s,last,rec):null;
   return `<article class="coffee-card ${open?'is-open':''} ${w.currentCoffeeId===c.id?'is-current':''}"><button class=coffee-toggle data-action=expand data-id="${e(c.id)}" aria-expanded="${open}"><div class=coffee-title-area><div class=coffee-title>${e(c.name)}${w.currentCoffeeId===c.id?'<span class=current-mark>Current</span>':''}${success?'<span class=status-badge>Dialed In</span>':''}</div><div class=coffee-subtitle>${e(c.roaster)} · ${e(c.origin)}</div></div>${icon('chevron')}</button>${open?`<div class=coffee-body><div class=style-row>${styleBadge(p.style)}${button('Change Style','style',`data-id="${e(c.id)}"`,'text-button')}</div><div class=recipe-label>${success?'Your Dialed In Window':'Starting recommendation'}</div>${recipeGrid(rec,v.advanced.temperature,v.tempUnit)}${rec.reasons?.length?`<p class=recipe-reason>${e(rec.reasons[0])}</p>`:''}${button(`${icon('plus',16)} Log a Shot`,'log',`data-id="${e(c.id)}"`,'primary full log-cta')}${last&&(!success||this.justSavedId===last.id)?`<section class=feedback-panel><h3>${e(advice.title)}</h3><p class=helper>${e(advice.text)}</p>${chips(last.tasteScales)}${radar(last.tasteScales)}</section>`:''}<details class=inline-disclosure data-retain="facts-${e(c.id)}"><summary>Coffee details</summary><dl class=coffee-facts>${[['Roaster',c.roaster],['Origin',c.origin],['Elevation',c.elevationM],['Roast level',c.roastLevel],['Process',c.process],['Variety',c.variety],['Producer',c.producer],['Tasting notes',c.tastingNotes]].filter(x=>x[1]).map(([k,val])=>`<div><dt>${e(k)}</dt><dd>${e(val)}</dd></div>`).join('')}</dl><p class=helper>${c.status==='verified'?'Verified coffee record':'Submitted for verification; currently visible only in your library.'}</p></details><details class=inline-disclosure data-retain="history-${e(c.id)}"><summary>Shot History (${shots.length})</summary>${shots.map(sh=>`<section class=shot><button class=shot-toggle data-action=shot-expand data-id="${e(sh.id)}"><div>${shotSummary(sh,v.tempUnit)}<span class=shot-meta>${styleBadge(sh.style)}<span class=shot-date>${e(humanDate(sh.timestamp))}</span>${sh.cloudPending?'<span class=preview-pill>Pending sync</span>':sh.dialedIn?'<span class=status-badge>Dialed In</span>':''}</span></div>${icon('chevron',15)}</button>${this.shotExpanded.has(sh.id)?`<div class=shot-body>${chips(sh.tasteScales)}${radar(sh.tasteScales)}${sh.notes?`<p class=note>${e(sh.notes)}</p>`:''}<p class=helper>${e(sh.snapshot.setupName)} · ${e(sh.snapshot.basketDoseG)} g Basket Dose · ${e(sh.feedMode||'Feed not recorded')}</p>${!sh.cloudPending?button('Edit','edit',`data-id="${e(sh.id)}"`,'text-button'):''}${sh.dialedIn&&!sh.cloudPending&&sh.setupVersionId===v.id?button('Make Current Recipe','make-current',`data-id="${e(sh.id)}"`,'text-button'):''}</div>`:''}</section>`).join('')}</details></div>`:''}</article>`;
  }).join('')||'<p class="helper space-top">Add your first test coffee to get started.</p>'}`;
 }
 settings(){
  const v=M.activeVersion(this.state),pref=this.raw?.preferences;
  this.prefRevision=pref?.revision;
  this.show('Settings',`<p class=helper>${e(this.identity.email)}</p><form id=preferences>${select('Appearance','theme',['system','light','dark'],this.state.theme)}<label class="field space-top"><span>Tasting preferences</span><textarea name=tasting_preferences>${e(this.state.preferences)}</textarea></label><button class="primary full space-top">Save preferences</button></form>${v?`<details class=advanced><summary>Advanced setup options</summary><form id=advanced>${checkbox('track_temperature','Track brew temperature',v.advanced.temperature)}${select('Temperature units','temperature_unit',['F','C'],v.tempUnit)}${checkbox('track_slow_feed','Track Slow Feeding',v.advanced.slowFeed)}<button class="primary full">Save advanced options</button></form></details>`:''}<div class=settings-links>${button('Cloud sync details','sync','','ghost')}${button('Export cloud test backup','export','','ghost')}${button('Add another setup','new-setup','','ghost')}${button('Sign out on this device','signout','','ghost')}</div><p class="helper space-top">Automated backups and the full community/admin workflows are still being integrated. This build is for controlled owner tests, not for external testers.</p>`);
  const sp=this.raw?.setupPreferences.find(p=>p.setup_version_id===v?.id);this.setupPrefRevision=sp?.revision;
 }
 showSetup(){this.show('New setup',`<form id=new-setup>${field('Setup name','name','',{required:true,placeholder:'Home'})}<div class="form-grid space-top">${field('Basket Dose (g)','basket_dose_g','',{required:true,type:'number',step:'.1',min:5,max:40})}${field('Finest espresso setting','finest_setting','',{required:true,type:'number',step:'.1',min:0})}${field('Coarsest espresso setting','coarsest_setting','',{required:true,type:'number',step:'.1',min:0})}</div><details class=advanced><summary>Equipment details (optional)</summary>${field('Machine','machine_model')}${field('Grinder','grinder_model')}${field('Burr set','burr_set')}${field('Basket model','basket_model')}</details><button class="primary full space-top">Create setup</button></form>`);}
 showAdd(){this.show('New Coffee',`<form id=new-coffee>${field('Name / Bag Label','name','',{required:true})}${field('Roaster','roaster','',{required:true})}${field('Roaster Page URL','source_url','',{type:'url'})}<details class=advanced open><summary>Optional coffee details</summary><div class=form-grid>${field('Origin','origin')}${select('Roast level','roast_level',['',...C.ROASTS],'')}${field('Elevation','elevation_m')}${select('Process','process',['',...C.PROCESSES],'')}${field('Variety','variety')}${field('Producer','producer')}</div>${field('Tasting notes','tasting_notes')}</details><button class="primary full space-top">Add coffee</button><p class="helper space-top">Manual entry is active in this owner test. AI source extraction is not connected here yet.</p></form>`);}
 showLog(cid,editing=null){
  const c=this.state.coffees.find(c=>c.id===cid),v=M.activeVersion(this.state);this.logCoffee=cid;this.editing=editing;
  this.draft=editing?C.clone(editing):E.prefill(this.state,cid);this.draft.id ||= uuid();this.logUnit=editing?.snapshot.tempUnit||v.tempUnit;
  const d=this.draft,rec=E.recommendation(this.state,cid);this.show(editing?'Edit Shot':'Log a Shot',`<form id=shot novalidate><p class=recipe-label>${e(c.name)} · ${e(d.style)}</p>${!editing?`<div id=log-reference>${recipeGrid(rec,v.advanced.temperature,v.tempUnit)}</div>`:''}<div class="form-grid space-top">${field('Dose (g)','doseG',d.doseG,{required:true,type:'number',step:'.1'})}${field('Yield (g)','yieldG',d.yieldG,{required:true,type:'number',step:'.1'})}${field('Time (s)','timeS',d.timeS,{required:true,type:'number',step:'.1'})}<div>${field('Grind Setting','grindSetting',d.grindSetting,{required:true,type:'number',step:'.1'})}${!editing?button('Use Recommendation','use-grind','','use-recommendation'):''}</div>${v.advanced.temperature||editing?.tempC!=null?`<div>${field(`Temperature (°${this.logUnit}, Optional)`,'temperature',C.tempDisplay(d.tempC,this.logUnit),{type:'number',step:'1'})}${!editing?button('Use Recommendation','use-temp','','use-recommendation'):''}</div>`:''}</div>${v.advanced.slowFeed&&!editing?checkbox('slowFeed','Slow Feed',d.feedMode==='slow'):''}<div id=ratings>${scales(d.tasteScales)}</div><label class=field><span>Notes (optional · private)</span><textarea name=notes>${e(d.notes||'')}</textarea></label><p class=helper role=alert></p><button class="primary full space-top" type=submit>Save Shot & Get Suggestion</button></form>`);
 }
 readDraft(){const f=sheet.querySelector('#shot');if(!f)return;for(const key of ['doseG','yieldG','timeS','grindSetting'])this.draft[key]=f.elements[key].value;this.draft.notes=f.elements.notes.value;if(f.elements.temperature)this.draft.tempC=C.tempInput(f.elements.temperature.value,this.logUnit);if(f.elements.slowFeed)this.draft.feedMode=f.elements.slowFeed.checked?'slow':'standard';}
 async click(ev){const target=ev.target.closest('[data-action]');if(!target)return;const a=target.dataset.action,id=target.dataset.id;
  try{
   if(a==='close'){sheet.close();return;}
   if(a==='auth-view'){this.authView=target.dataset.view;this.notice='';if(this.authView!=='check-email')this.confirmationEmail='';this.render();return;}
   if(a==='settings'){this.settings();return;}
   if(a==='new-setup'){this.showSetup();return;}
   if(a==='add'){this.showAdd();return;}
   if(a==='expand'){if(this.expanded.has(id)){this.expanded.delete(id);if(this.tempCoffee===id)this.tempCoffee=null;}else this.expanded.add(id);this.render();return;}
   if(a==='shot-expand'){this.shotExpanded.has(id)?this.shotExpanded.delete(id):this.shotExpanded.add(id);this.render();return;}
   if(a==='search-toggle'){this.searchOpen=!this.searchOpen;if(!this.searchOpen)this.search='';this.render();return;}
   if(a==='log'){this.showLog(id);return;}
   if(a==='edit'){if(this.pending.length)throw new Error('Finish syncing before editing existing shots.');const sh=this.state.shots.find(x=>x.id===id);this.showLog(sh.coffeeId,sh);return;}
   if(a==='rate'){this.readDraft();this.draft.tasteScales[target.dataset.key]=Number(target.dataset.value);sheet.querySelector('#ratings').innerHTML=scales(this.draft.tasteScales);const alert=sheet.querySelector('[role=alert]');if(alert)alert.textContent='';return;}
   if(a==='use-grind'||a==='use-temp'){this.readDraft();const r=E.recommendation(this.state,this.logCoffee,{feedMode:this.draft.feedMode});if(a==='use-grind')sheet.querySelector('[name=grindSetting]').value=r.grind.value;else sheet.querySelector('[name=temperature]').value=C.tempDisplay(r.tempC,this.logUnit);this.readDraft();return;}
   if(a==='switch'){this.show('Your workspaces',this.state.setups.map(x=>button(e(x.name),'choose-setup',`data-id="${e(x.id)}"`,'ghost full')).join(''));return;}
   if(a==='choose-setup'){await this.mutate('select_setup',{setup_id:id,expected_revision:this.raw.preferences.revision},{onlineOnly:true});this.expanded.clear();const pin=M.workspace(this.state).currentCoffeeId;if(pin)this.expanded.add(pin);sheet.close();this.render();return;}
   if(a==='style'){const p=M.coffeeState(this.state,id);this.styleCoffee=id;this.styleRevision=this.raw.workspaceCoffees.find(x=>x.library_entry_id===id&&x.setup_version_id===M.activeVersion(this.state).id)?.revision||0;this.show('Shot style',`<form id=style>${select('Style','style',C.STYLES.filter(s=>s!=='Custom'),p.style)}<p class="helper space-top">Styles are guidelines, not pass/fail rules.</p><button class="primary full">Use style</button></form>`);return;}
   if(a==='make-current'){const sh=this.state.shots.find(x=>x.id===id),rp=this.raw.recipePreferences.find(x=>x.library_entry_id===sh.coffeeId&&x.setup_version_id===sh.setupVersionId&&x.style===sh.style);await this.mutate('make_current',{shot_id:id,expected_revision:rp?.revision||0},{onlineOnly:true});return;}
   if(a==='community'){this.show('Community',`<div class=preview-note>Not live in this owner test. Successful pending submissions are not published automatically.</div><p class=helper>The next community milestone connects verified coffees, contributor-balanced recommendations and actual review actions.</p>`);return;}
   if(a==='sync'){const events=await this.queue.pending();this.show('Cloud sync',`<h3>${e(this.syncState)}</h3><p class=helper>${events.length} changes waiting. Conflicts are retained rather than overwritten.</p>${events.map(x=>`<div class=preview-card><strong>${e(x.action)}</strong><p class=helper>${e(x.status)} ${e(x.error?.message||'')}</p></div>`).join('')}${button('Try syncing now','sync-now','','primary full')}${button('Export snapshot and pending changes','export','','ghost full')}<p class="helper space-top">This export is an emergency development backup, not a replacement for the planned automated Drive backups.</p>`);return;}
   if(a==='sync-now'){await this.sync();this.notice='Sync checked. Pending conflicts require review; nothing was discarded.';this.render();return;}
   if(a==='export'){exportFile(await this.store.export(this.identity.id));return;}
   if(a==='signout'){if((await this.queue.pending()).length)throw new Error('Changes are waiting to sync. Export a backup and finish syncing before signing out.');await this.client.signOut();this.identity=null;this.status=null;this.raw=null;this.state=M.blankState();this.epoch++;sheet.close();this.render();return;}
  }catch(err){this.error(err);}
 }
 input(ev){if(ev.target.id==='search'){const value=ev.target.value,position=ev.target.selectionStart;this.search=value;this.render();const input=root.querySelector('#search');input.focus();input.setSelectionRange(position,position);}}
 change(ev){if(ev.target.id==='sort'){this.sort=ev.target.value;this.render();}if(ev.target.name==='slowFeed'&&this.draft){this.readDraft();const v=M.activeVersion(this.state),rec=E.recommendation(this.state,this.logCoffee,{feedMode:this.draft.feedMode});const box=sheet.querySelector('#log-reference');if(box)box.innerHTML=recipeGrid(rec,v.advanced.temperature,v.tempUnit);}}
 async submit(ev){ev.preventDefault();if(this.busy)return;const form=ev.target,id=form.id,d=Object.fromEntries(new FormData(form));this.busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   if(id==='auth-signup'||id==='auth-password'){const issue=validateNewPassword(d.password);if(issue)throw new Error(issue);}
    if(id==='auth-signin'){await this.client.signIn(d.email,d.password);this.identity=await this.client.identity();await this.connect();}
   else if(id==='auth-signup'){await this.client.signUp(d.email,d.password);this.confirmationEmail=d.email.trim();this.authView='check-email';this.notice='';this.render();root.querySelector('#confirmation-title')?.focus();}
   else if(id==='auth-reset'){this.notice=await this.client.requestReset(d.email);this.render();}
   else if(id==='auth-password'){await this.client.setPassword(d.password);this.recovery=false;this.notice='Password updated.';await this.connect();}
   else if(id==='auth-invite'){await this.client.redeemInvite(d.token);await this.connect();}
   else if(id==='new-setup'){await this.mutate('create_setup',{...d,id:uuid(),basket_dose_g:Number(d.basket_dose_g),finest_setting:Number(d.finest_setting),coarsest_setting:Number(d.coarsest_setting)},{onlineOnly:true});sheet.close();}
   else if(id==='new-coffee'){const lid=uuid(),{source_url,...facts}=d;await this.mutate('submit_coffee',{library_entry_id:lid,source_url,proposed_data:facts},{onlineOnly:true});this.tempCoffee=lid;this.expanded.add(lid);sheet.close();this.render();}
   else if(id==='preferences'){await this.mutate('save_preferences',{...d,expected_revision:this.prefRevision},{onlineOnly:true});this.prefRevision=this.raw.preferences.revision;sheet.querySelector('[role=alert]').textContent='Preferences saved.';}
   else if(id==='advanced'){await this.mutate('save_setup_settings',{setup_id:M.activeSetup(this.state).id,setup_version_id:M.activeVersion(this.state).id,expected_revision:this.setupPrefRevision,track_temperature:'track_temperature' in d,track_slow_feed:'track_slow_feed' in d,temperature_unit:d.temperature_unit},{onlineOnly:true});this.setupPrefRevision=this.raw.setupPreferences.find(x=>x.setup_version_id===M.activeVersion(this.state).id).revision;sheet.querySelector('[role=alert]').textContent='Advanced settings saved.';}
   else if(id==='style'){await this.mutate('set_style',{setup_id:M.activeSetup(this.state).id,setup_version_id:M.activeVersion(this.state).id,library_entry_id:this.styleCoffee,style:d.style,expected_revision:this.styleRevision},{onlineOnly:true});sheet.close();}
   else if(id==='shot'){
    this.readDraft();const d=this.draft,validation=M.validateShot(d);if(validation.length)throw new Error(validation.join(' '));const dose=this.editing?.snapshot.basketDoseG||M.selectedBasket(this.state,this.logCoffee)?.doseG;
    if(Math.abs(Number(d.doseG)-dose)>1&&!confirm(`This is outside ${dose-1}-${dose+1} g for this Basket Dose. Log anyway? Changing the basket record is not connected in this development screen yet.`))return;
    let payload;if(this.editing){payload={id:d.id,expected_revision:this.editing.revision,dose_g:Number(d.doseG),yield_g:Number(d.yieldG),time_s:Number(d.timeS),grind_setting:Number(d.grindSetting),temperature_c:C.num(d.tempC),taste:d.tasteScales,notes:d.notes};}else payload=shotPayload(this.state,this.logCoffee,d);
    await this.mutate('save_shot',payload);this.expanded=new Set([this.logCoffee]);this.tempCoffee=null;this.justSavedId=d.id;sheet.close();this.notice=this.pending.length?'Saved on this device; waiting to sync.':'Shot saved to your cloud account.';this.render();
   }
  }catch(err){this.error(err);}finally{this.busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
}
export async function startCloudApp(){
 try{
  secureOrigin();if(!CLOUD_CONFIG.enabled)throw new Error('Cloud testing is not configured for this build. Your local app is unchanged.');
  if(!globalThis.supabase?.createClient)throw new Error('Build the pinned Supabase SDK assets before deploying this owner test.');
  const sdk=globalThis.supabase.createClient(CLOUD_CONFIG.supabaseUrl,CLOUD_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'dic_cloud_auth_v1'}});
  const client=createCloudClient(sdk,{redirectUrl:new URL(location.pathname,location.origin).href});const app=new CloudApp(client);await app.init();return app;
 }catch(err){root.innerHTML=`<main class="shell welcome"><h1>The Dial In Collective</h1><h2 class=space-top>Cloud setup in progress</h2><p class=helper>${e(err.message)}</p></main>`;}
}
startCloudApp();
export {CloudApp};
