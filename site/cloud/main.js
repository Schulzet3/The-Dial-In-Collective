import * as C from '../lib/constants.js';
import * as M from '../lib/model.js';
import * as E from '../lib/engine.js';
import * as U from '../lib/ui.js';
import {CloudError,createCloudClient,secureOrigin,validateNewPassword,PASSWORD_HINT,isAccessDenied} from './client.js';
import {IndexedStore,Outbox} from './outbox.js';
import {basketDoseAdvisory} from './dose-advisory.js';
import {hydrate,applyPending,shotPayload} from './mapping.js';
import {CLOUD_CONFIG} from './config.js';
import {emailConfirmationView} from './confirmation.js';
import {shotCard} from './shot_card.js';
import {applyAppearance,readAppearance} from './appearance.js';
import {nextCoffeeAction,proposalWithRecognizedRoaster,matchReviewMarkup} from './coffee-match-ui.js';
import {coffeeUrlPreviewMarkup,applyCoffeeUrlFields} from './coffee-url-autofill.js';
import {communityReviewBanner,communityPage} from './community.js';
const {e,button,icon,field,select,checkbox,recipeGrid,styleBadge,chips,radar,scales,nextShotGuidance,nextShotTitle}=U;
const NEXT_SHOT_INFO="Changing only one setting helps isolate its effect on your espresso's flavor. Keep the other settings consistent and compare the results. Shot time may change naturally; record what happens.";
const root=document.querySelector('#app'),sheet=document.querySelector('#sheet');
const reviewSheet=typeof document.createElement==='function'?document.createElement('dialog'):{open:false,dataset:{},setAttribute(){},replaceChildren(){},close(){},addEventListener(){},querySelector(){return null;}};
reviewSheet.id='community-required-review';
reviewSheet.className='community-required-review';
reviewSheet.setAttribute('aria-label','Required shot measurement confirmation');
if(typeof document.createElement==='function')document.body.append(reviewSheet);
const uuid=()=>crypto.randomUUID();
function exportFile(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`Dial_In_Collective_Pending_Changes_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
class CloudApp {
 constructor(client,store=new IndexedStore()){
  Object.assign(this,{client,store,identity:null,status:null,raw:null,state:M.blankState(),pending:[],expanded:new Set(),shotExpanded:new Set(),search:'',sort:'recent',searchOpen:false,tempCoffee:null,justSavedId:null,notice:'',authView:'signin',confirmationEmail:'',recovery:false,syncState:'connecting',busy:false,flushing:null,epoch:0,localOfflineOwner:null});
  this.coffeeUrlPreviewInput=null;this.coffeeUrlBusy=false;this.firstStylePromptId=null;this.firstStyleClaimInFlight=new Set();
  this.view='coffees';this.communityRows=[];this.communityTotal=0;this.communityLoading=false;this.communityReloadRequested=false;this.communityError='';this.communityStyle='all';this.communityCoffee='all';this.communitySearch='';this.communityRevision=0;
  this.reviews=[];this.reviewError='';this.editCoffeeId=null;this.editCoffeeRevision=null;
  this.recommendationEvidence={};this.recommendationEvidenceRequests=new Set();
   this.deniedOfflineOwners=new Set();
  this.dismissedDoseAdvisories=new Set();
  this.lastHeavySyncAt=0;this.pollingStatus=null;
  this.queue=new Outbox({store,remote:client,identity:()=>this.identity,notify:r=>{if(r.owner===this.identity?.id)this.syncState=r.state;}});
 }
 async inSession(operation){
  const owner=this.identity?.id,epoch=this.epoch;
  const changed=()=>owner!==this.identity?.id||epoch!==this.epoch;
  try{const result=await operation();if(changed())throw new CloudError('Account changed. Any queued change remains with its original account.','account_changed');return result;}
  catch(error){if(changed())throw new CloudError('Account changed. Any queued change remains with its original account.','account_changed');throw error;}
 }
 resetAccount(){
  this.epoch++;this.status=null;this.localOfflineOwner=null;this.raw=null;this.state=M.blankState();this.pending=[];
  this.expanded.clear();this.shotExpanded.clear();this.search='';this.searchOpen=false;
  this.dismissedDoseAdvisories.clear();this.recommendationEvidence={};this.recommendationEvidenceRequests.clear();
  this.lastHeavySyncAt=0;
  this.tempCoffee=null;this.justSavedId=null;this.notice='';this.recovery=false;this.firstStylePromptId=null;this.firstStyleClaimInFlight.clear();
  this.draft=null;this.editing=null;this.logCoffee=null;this.addCoffeeDraft=null;
  this.addCoffeeMatches=null;this.pendingMergeSubmissionId=null;
  this.coffeeUrlPreviewInput=null;this.view='coffees';this.communityRows=[];this.communityTotal=0;this.communityError='';this.communityLoading=false;this.communityReloadRequested=false;this.communityStyle='all';this.communityCoffee='all';this.communitySearch='';this.communityRevision=0;this.reviews=[];this.reviewError='';this.editCoffeeId=null;this.editCoffeeRevision=null;
  if(reviewSheet.open)reviewSheet.close();reviewSheet.replaceChildren();
  sheet.close();sheet.innerHTML='';
 }
 authChanged(event,user){
  const changed=this.identity?.id!==user?.id;
  if(changed)this.resetAccount();
  if(event==='PASSWORD_RECOVERY')this.recovery=true;
  this.identity=user;
  // Remove the former account's rendered records before the next network read.
  if(changed||event==='SIGNED_OUT'||event==='PASSWORD_RECOVERY')this.render();
  if(user&&event!=='TOKEN_REFRESHED')this.connect().catch(err=>this.error(err));
 }
 async init(){
  document.addEventListener('click',ev=>this.click(ev));document.addEventListener('submit',ev=>this.submit(ev));
  document.addEventListener('input',ev=>this.input(ev));document.addEventListener('change',ev=>this.change(ev));
  sheet.addEventListener('cancel',ev=>ev.preventDefault());
  sheet.addEventListener('close',()=>this.syncReviewDialog());
  reviewSheet.addEventListener('cancel',ev=>ev.preventDefault());
  this.client.onAuthChange((event,user)=>this.authChanged(event,user));
  const epoch=this.epoch;
  try{const identity=globalThis.navigator?.onLine===false?await this.client.offlineIdentity?.():await this.client.identity();if(epoch===this.epoch)this.identity=identity;}catch{/* Missing session is the normal signed-out state. */}
  if(this.identity)await this.connect();else this.render();
  // A returning connection must recheck beta admission before flushing locally queued shots.
   addEventListener('online',()=>this.connect().catch(err=>this.error(err)));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&this.identity)this.connect().catch(err=>this.error(err));});
  // Preserve the former 30-second admission/revocation check while reducing
  // unnecessary 17-dataset reads and Community review requests during idle use.
  this.poll=setInterval(()=>{if(document.visibilityState==='visible'&&this.identity&&this.status?.admitted&&!this.busy)this.pollOnce().catch(()=>{});},30000);
 }
 async pollOnce(){
  if(this.pollingStatus)return this.pollingStatus;
  const user=this.identity,epoch=this.epoch;
  if(!user||!this.status?.admitted||this.busy||globalThis.navigator?.onLine===false)return;
  this.pollingStatus=(async()=>{
   try{
    const status=await this.client.status();
    if(epoch!==this.epoch||user.id!==this.identity?.id)return;
    if(!status?.admitted){await this.denyAccess(user,epoch,status);return;}
    this.status=status;
    if(this.pending.some(x=>x.status==='pending')||Date.now()-this.lastHeavySyncAt>=180000)await this.sync();
   }catch(err){
    if(epoch!==this.epoch||user.id!==this.identity?.id)return;
    if(isAccessDenied(err))await this.denyAccess(user,epoch);
    // A temporary admission-check outage must not trigger a full-data scan.
   }
  })().finally(()=>this.pollingStatus=null);
  return this.pollingStatus;
 }
 // Offline data is not an offline authorization token. Only the previously
 // admitted owner's cached records may be viewed, and only NEW shots can queue.
 async restoreOfflineCache(){
  const user=this.identity,epoch=this.epoch;
  if(!user||globalThis.navigator?.onLine!==false)return false;
  if(this.deniedOfflineOwners.has(user.id)){
   this.notice='Reconnect to verify your account before opening saved coffees.';this.render();return false;
  }
  const credential=await this.client.offlineIdentity?.();
  if(epoch!==this.epoch||user.id!==this.identity?.id)return false;
  if(credential?.id!==user.id){
   this.status=null;this.localOfflineOwner=null;this.raw=null;this.state=M.blankState();this.pending=[];
   this.notice='Reconnect to verify your account before opening saved coffees.';this.render();return false;
  }
  const cache=await this.inSession(()=>this.store.readCache(user.id));
  if(!cache?.snapshot||cache.owner!==user.id){
   this.status=null;this.localOfflineOwner=null;this.raw=null;this.state=M.blankState();this.pending=[];
   this.notice='No verified offline workspace is saved for this account. Reconnect first.';this.render();return false;
  }
  const pending=await this.inSession(()=>this.store.list(user.id));
  if(epoch!==this.epoch||user.id!==this.identity?.id)return false;
  this.status=null;this.localOfflineOwner=user.id;this.raw=cache.snapshot;
  this.pending=pending;this.state=applyPending(hydrate(this.raw),this.pending);this.state.communityEvidence=this.recommendationEvidence;
  this.syncState='offline';this.reviews=[];this.reviewError='';
  if(!this.expanded.size&&M.workspace(this.state).currentCoffeeId)this.expanded.add(M.workspace(this.state).currentCoffeeId);
  this.notice='Offline workspace. New shots save on this device and sync after reconnecting.';
  this.render();return true;
 }
 async denyAccess(user,epoch,status=this.status){
  if(epoch!==this.epoch||user.id!==this.identity?.id)return;
  this.deniedOfflineOwners.add(user.id);
  this.resetAccount();
  const deniedEpoch=this.epoch;
  this.status={...status,admitted:false,admin:false};this.syncState='access_denied';
  this.notice='Access could not be confirmed. Your queued changes are preserved on this device.';
  // Remove private views and close forms before waiting for storage. Cache
  // deletion never removes the owner's outbox or acknowledgement receipts.
  this.render();
  try{await this.store.clearCache?.(user.id);}
  catch{
   if(deniedEpoch!==this.epoch||user.id!==this.identity?.id)return;
   this.notice='Access could not be confirmed. Reconnect before reopening saved coffees. Your queued changes are preserved.';
   this.render();
  }
 }
 async connect(){
  const user=this.identity,epoch=this.epoch;if(!user)return;
  if(globalThis.navigator?.onLine===false)return this.restoreOfflineCache();
  try{const status=await this.client.status();if(epoch!==this.epoch||user.id!==this.identity?.id)return;this.status=status;this.localOfflineOwner=null;
   if(!status.admitted){
    await this.denyAccess(user,epoch,status);return;
   }
   this.deniedOfflineOwners.delete(user.id);
   const cache=await this.inSession(()=>this.store.readCache(user.id));if(cache)this.raw=cache.snapshot;
   await this.sync();
  }catch(err){if(epoch===this.epoch&&user.id===this.identity?.id){if(isAccessDenied(err)){await this.denyAccess(user,epoch);return;}this.notice=err.message;this.syncState='offline';this.render();}}
 }
 async sync(){
  const owner=this.identity?.id,epoch=this.epoch;
  // An old account's inflight sync must not block the new account forever or
  // accidentally satisfy its required cache/state refresh.
  while(this.flushing){
   if(this.flushingOwner===owner&&this.flushingEpoch===epoch)return this.flushing;
   try{await this.flushing;}catch{/* New identity can retry independently. */}
   if(this.identity?.id!==owner||this.epoch!==epoch)return;
  }
  this.flushingOwner=owner;this.flushingEpoch=epoch;
  const task=this.doSync().finally(()=>{
   if(this.flushing===task){this.flushing=null;this.flushingOwner=null;this.flushingEpoch=null;}
  });
  this.flushing=task;return task;
 }
 async doSync(){
  const who=this.identity,epoch=this.epoch;if(!who||!this.status?.admitted)return;
  const outcome=await this.queue.flush();if(epoch!==this.epoch||who.id!==this.identity?.id)return;
  if(outcome.accessDenied){
   // A retained denial requires new server admission evidence; restored
   // members must still be able to reach their preserved queue for recovery.
   let renewed=null;
   if(outcome.recheckAccess){try{renewed=await this.client.status();}catch{/* No cached authorization fallback. */}}
   if(epoch!==this.epoch||who.id!==this.identity?.id)return;
   if(renewed?.admitted!==true){await this.denyAccess(who,epoch);return;}
   this.status=renewed;this.deniedOfflineOwners.delete(who.id);
  }
  this.syncState=outcome.state;const pending=await this.store.list(who.id);
  if(epoch!==this.epoch||who.id!==this.identity?.id)return;this.pending=pending;
  try{const raw=await this.client.read();if(epoch!==this.epoch||who.id!==this.identity?.id)return;await this.store.saveCache(who.id,raw);if(epoch!==this.epoch||who.id!==this.identity?.id)return;this.raw=raw;this.lastHeavySyncAt=Date.now();}
  catch(err){if(epoch!==this.epoch||who.id!==this.identity?.id)return;if(isAccessDenied(err)){await this.denyAccess(who,epoch);return;}this.syncState='offline';const saved=await this.store.readCache(who.id);if(epoch!==this.epoch||who.id!==this.identity?.id)return;if(saved)this.raw=saved.snapshot;if(!this.raw)throw err;}
  this.state=applyPending(hydrate(this.raw),this.pending);this.state.communityEvidence=this.recommendationEvidence;
  await this.syncFirstStylePrompts(who.id);if(epoch!==this.epoch||who.id!==this.identity?.id)return;
  // A known flagged shot cannot be deferred. A failed refresh cannot erase
  // an outstanding hold; queue/offline data remains recoverable.
  if(!this.pending.length&&navigator.onLine){try{const held=await this.client.listCommunityReviews();if(epoch!==this.epoch||who.id!==this.identity?.id)return;this.reviews=held;this.reviewError='';}catch(err){if(epoch!==this.epoch||who.id!==this.identity?.id)return;if(isAccessDenied(err)){await this.denyAccess(who,epoch);return;}this.reviewError='Required shot reviews are temporarily unavailable. Reconnect and check Sync.';}}
  if(!this.expanded.size&&M.workspace(this.state).currentCoffeeId)this.expanded.add(M.workspace(this.state).currentCoffeeId);
  this.render();
  // Automatically opened Current Coffee and style changes receive optional priors.
  if(this.status?.admitted&&globalThis.navigator?.onLine!==false)
   for(const id of this.expanded)this.loadRecommendationEvidence(id).catch(error=>{
    if(isAccessDenied(error)&&epoch===this.epoch&&who.id===this.identity?.id)
     this.denyAccess(who,epoch).catch(()=>{});
   });
 }
 async mutate(action,payload,{onlineOnly=false}={}){
  const offlineShot=action==='save_shot'&&!payload.expected_revision&&this.identity?.id===this.localOfflineOwner&&globalThis.navigator?.onLine===false;
  if(!this.identity||(!this.status?.admitted&&!offlineShot))throw new Error('Sign in with beta access first.');
  if(onlineOnly&&(!navigator.onLine||this.pending.length))throw new Error('Reconnect and finish syncing before changing this setting. Offline shot logging remains available.');
  await this.inSession(()=>this.queue.enqueue(action,payload));this.pending=await this.inSession(()=>this.store.list(this.identity.id));
  this.state=applyPending(hydrate(this.raw),this.pending);this.state.communityEvidence=this.recommendationEvidence;this.render();
  await this.inSession(()=>this.sync());
  if(onlineOnly&&this.pending.length)throw new Error('The change is preserved in the sync queue. Open Sync details to check its status.');
 }
 error(err){
  if(err.code==='account_changed')return;
  this.notice=err.message||'The change could not be completed.';
  // The closed Edit form still contains a stale alert node. Report errors
  // within the currently visible modal, not behind a required review dialog.
  const surface=sheet.open?sheet:reviewSheet.open?reviewSheet:null;
  if(!surface){this.render();return;}
  let alert=surface.querySelector('[role=alert]');
  if(!alert){
   alert=document.createElement('p');
   alert.setAttribute('role','alert');
   alert.className='helper';
   (surface.querySelector('.community-review-text')||surface).append(alert);
  }
  alert.textContent=this.notice;
 }
 theme(){applyAppearance(this.identity&&this.raw?this.state.theme:readAppearance());}
 show(title,body){sheet.innerHTML=`<div class=sheet-layout><header class=sheet-header><h2 id=sheet-title>${e(title)}</h2>${button(icon('close',21),'close','aria-label="Close"','icon-button')}</header><div class=sheet-content>${body}<div role=alert class=helper></div></div>`;if(!sheet.open)sheet.showModal();sheet.querySelector('[data-action=close]').focus({preventScroll:true});}
 syncReviewDialog(){
  const review=this.reviews[0];
  const active=!!review&&!!this.identity&&!!this.status?.admitted
   &&!this.recovery&&navigator.onLine&&this.syncState!=='offline'&&!this.pending.length;
  if(!active){
   if(reviewSheet.open)reviewSheet.close();
   reviewSheet.replaceChildren();delete reviewSheet.dataset.key;return;
  }
  // Do not interrupt an in-progress form. Edit Shot can stack above the
  // required dialog and closing Edit returns to this unresolved prompt.
  if(sheet.open&&!reviewSheet.open)return;
  const key=`${review.shot_id}:${review.revision}:${this.reviews.length}`;
  if(reviewSheet.dataset.key!==key){
   reviewSheet.innerHTML=communityReviewBanner(this.reviews);
   reviewSheet.dataset.key=key;
  }
  if(!reviewSheet.open)reviewSheet.showModal();
  reviewSheet.querySelector('[data-action=community-confirm-outlier]')?.focus({preventScroll:true});
 }
 render(){
  const openDetails=[...root.querySelectorAll('details[data-retain][open]')].map(x=>x.dataset.retain);
  this.theme();const connected=this.identity&&(this.status?.admitted||(this.localOfflineOwner===this.identity.id&&globalThis.navigator?.onLine===false))&&!this.recovery;
  root.innerHTML=`<header class=app-header><div class=header-inner><div class=brand>${icon('coffee',27)}<div><h1>The Dial In Collective</h1><div class=tagline>Better espresso through shared experience.</div></div></div>${connected?button(icon('settings',20),'settings','aria-label="Settings"','icon-button'):''}</div></header><main class=shell>${connected?this.coffees():this.auth()}${this.notice?`<p class="helper space-top" role=status>${e(this.notice)}</p>`:''}<footer class=footer>Private Beta <span aria-hidden=true>·</span> Better espresso, one shot at a time.</footer></main>`;
  for(const details of root.querySelectorAll('details[data-retain]'))if(openDetails.includes(details.dataset.retain))details.open=true;
  this.syncReviewDialog();
 }
 auth(){
  const email=()=>field('Email','email','',{type:'email',required:true,extra:'autocomplete="email"'});
  const freshHint=`<p class="helper" id="password-requirements">${e(PASSWORD_HINT)}</p>`;
  const password=(fresh=false)=>field(fresh?'New Password':'Password','password','',{type:'password',required:true,extra:`autocomplete="${fresh?'new-password':'current-password'}" ${fresh?'minlength="8" aria-describedby="password-requirements"':''}`});
  if(this.recovery)return `<section class=welcome><h2>Choose A New Password</h2><form id=auth-password>${password(true)}${freshHint}<button class="primary full space-top">Save Password</button></form></section>`;
  if(this.identity&&globalThis.navigator?.onLine===false)return `<section class=welcome><h2>Reconnect To Continue</h2><p class=helper>Your saved workspace is unavailable offline until a previously admitted account and local session can be confirmed.</p></section>`;
  if(this.identity)return `<section class=welcome><h2>Your Invitation</h2><p class=helper>${e(this.identity.email)}</p><p class=helper>${this.status?.emailVerified?'Use the beta invitation supplied for your account.':'Verify your email before requesting beta access.'}</p><form id=auth-invite>${field('Invitation Code','token','',{required:true})}<button class="primary full space-top">Use Invitation</button></form>${button('Sign Out','signout','','text-button')}</section>`;
  if(this.authView==='check-email')return emailConfirmationView(this.confirmationEmail);
  const reset=this.authView==='reset',signup=this.authView==='signup';
  return `<section class="welcome cloud-auth"><h2>${reset?'Reset Your Password':signup?'Create Your Account':'Welcome Back'}</h2><p class=helper>Your coffee, wherever you brew.</p><form id="auth-${this.authView}">${email()}${reset?'':password(signup)}${signup?freshHint:''}<button class="primary full space-top">${reset?'Send Recovery Email':signup?'Create Account':'Sign In'}</button></form><div class=row-actions>${button(signup||reset?'Back To Sign In':'Create An Account','auth-view',`data-view="${signup||reset?'signin':'signup'}"`,'text-button')}${!reset?button('Forgot Password?','auth-view','data-view="reset"','text-button'):''}</div></section>`;
 }
 coffees(){
  const s=this.state,setup=M.activeSetup(s),w=M.workspace(s);
  if(!setup)return `<section class="welcome text-center"><h2>A better next shot.</h2><p class=helper>Add your equipment setup to start logging shots and dialing in.</p>${button('Set Up My Workspace','new-setup','','primary')}</section>`;
  if(this.view==='community')return this.communityScreen();
  const list=M.visibleCoffees(s,this.sort,this.search,this.tempCoffee);
  const offlineOnly=!this.status?.admitted&&this.localOfflineOwner===this.identity?.id;
  return `<nav class=app-nav>${button(`${icon('coffee',16)} Coffees`,'home','','active')}${offlineOnly?'':button(`${icon('users',16)} Community`,'community','','')}<span class=local-label>${button(`${icon('cloud',14)} ${this.pending.length?`${this.pending.length} Pending`:this.syncState==='synced'?'Synced':'Offline'}`,'sync',`data-sync-state="${this.pending.length?'pending':this.syncState}"`,'sync-indicator')}</span></nav><div class=workspace-bar><div><div class=eyebrow>Your Workspace</div><h2>Coffees</h2></div>${button(`${e(setup.name)} ${icon('chevron',14)}`,'switch','','setup-switch')}</div>${offlineOnly?'<p class="helper" role="status">Offline: saved coffees and shot logging are available. Coffee lookup and Community require a connection.</p>':button(`${icon('plus',16)} Add Coffee`,'add','','primary full')}${button(`${icon('search',18)}<span>Search & Sort</span>${icon('chevron',16)}`,'search-toggle',`aria-expanded="${this.searchOpen}" aria-controls="coffee-search-tools"`,'browse-toggle secondary full')}${this.searchOpen?`<div class=search-tools id=coffee-search-tools><input id=search type=search value="${e(this.search)}" aria-label="Search coffee information" placeholder="Name, origin, notes..."><select id=sort aria-label=Sort><option value=recent ${this.sort==='recent'?'selected':''}>Recent</option><option value=az ${this.sort==='az'?'selected':''}>A-Z</option></select></div>`:''}${list.map(c=>{
   const open=this.expanded.has(c.id),p=M.coffeeState(s,c.id),rec=E.recommendation(s,c.id),v=M.activeVersion(s);const shots=s.shots.filter(sh=>sh.coffeeId===c.id&&!sh.hidden).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));const local=shots.filter(sh=>sh.setupVersionId===v.id&&sh.style===p.style),last=local[0];const success=M.hasLocalSuccess(s,c.id,p.style);const advice=last?E.nextAdvice(s,last,rec):null;
    const firstStyle=this.firstStylePromptId===c.id&&shots.length===0;
    const suggestion=firstStyle?E.suggestedStyle(c,s.preferences||''):null;
    const firstPrompt=firstStyle?`<section class="first-shot-style" aria-label="First shot starting style"><div class=recipe-label>Recommended for you: ${e(suggestion.style)}</div><p class=helper>${e(suggestion.reason)} You can choose another style.</p>${select('Starting Shot Style','first_style',C.STYLES.filter(style=>style!=='Custom'),suggestion.style)}${button('Log First Shot','first-shot-log',`data-id="${e(c.id)}"`,'primary full log-cta')}</section>`:'';
   return `<article class="coffee-card ${open?'is-open':''} ${w.currentCoffeeId===c.id?'is-current':''}"><button class=coffee-toggle data-action=expand data-id="${e(c.id)}" aria-expanded="${open}"><div class=coffee-title-area><div class=coffee-title>${e(c.name)}${w.currentCoffeeId===c.id?'<span class=current-mark>Current</span>':''}${success?'<span class=status-badge>Dialed In</span>':''}</div><div class=coffee-subtitle>${e(c.roaster)} · ${e(c.origin)}</div></div>${icon('chevron')}</button>${open?`<div class=coffee-body>${firstStyle?firstPrompt:`<div class=style-row>${styleBadge(p.style)}${button('Change Style','style',`data-id="${e(c.id)}"`,'ghost compact')}</div><div class=recipe-label>${success?'Your Dialed In Window':'Starting Recommendation'}</div>${recipeGrid(rec,v.advanced.temperature,v.tempUnit)}${button(`${icon('plus',16)} Log A Shot`,'log',`data-id="${e(c.id)}"`,'primary full log-cta')}`}${rec.reasons?.length?`<p class=recipe-reason>${e(rec.reasons[0])}</p>`:''}${last&&(!success||this.justSavedId===last.id)?`<section class=feedback-panel><div class="next-shot-heading"><span class="next-shot-label">${advice.next?'Next Shot Recommendation':'Shot Feedback'}</span>${advice.next?`<button type="button" class="inline-info-button" data-action="next-shot-info" aria-label="About Next Shot Recommendation" aria-expanded="false" aria-controls="next-shot-info-${e(c.id)}"><span aria-hidden="true">i</span></button>`:''}</div><h3>${e(nextShotTitle(advice))}</h3>${nextShotGuidance(advice,last,v.advanced.temperature,v.tempUnit)}${advice.next?`<p class="next-shot-info-text helper" id="next-shot-info-${e(c.id)}" hidden>${e(NEXT_SHOT_INFO)}</p>`:''}${chips(last.tasteScales)}${radar(last.tasteScales)}</section>`:''}<details class=inline-disclosure data-retain="facts-${e(c.id)}"><summary>Coffee Details</summary><dl class=coffee-facts>${[['Roaster',c.roaster],['Origin',c.origin],['Elevation',c.elevationM],['Roast Level',c.roastLevel],['Process',c.process],['Variety',c.variety],['Producer',c.producer],['Tasting Notes',c.tastingNotes]].filter(x=>x[1]).map(([k,val])=>`<div><dt>${e(k)}</dt><dd>${e(val)}</dd></div>`).join('')}</dl><p class=helper>${c.status==='verified'?'Approved coffee':'Pending approval · your shots stay private.'}</p>${button('Edit Coffee Details','edit-coffee',`data-id="${e(c.id)}"`,'ghost compact')}${c.status==='pending'?button('Check For A Verified Match','check-pending-match',`data-id="${e(c.id)}"`,'ghost compact'):''}${c.status==='pending'?button('Retry Automatic Approval','retry-member-auto-approval',`data-id="${e(c.id)}"`,'ghost compact'):''}${c.status==='pending'&&this.raw?.submissions?.find(sub=>sub.id===this.raw?.library?.find(l=>l.id===c.id)?.submission_id)?.source_url?button('Retry Official Source Check','retry-pending-source',`data-id="${e(c.id)}"`,'ghost compact'):''}${this.raw?.submissions?.some(sub=>sub.canonical_coffee_id&&sub.status==='pending'&&sub.canonical_coffee_id===this.raw?.library?.find(l=>l.id===c.id)?.coffee_id)?'<p class="helper">Correction pending review. The shared coffee record is unchanged.</p>':''}</details><details class=inline-disclosure data-retain="history-${e(c.id)}"><summary>Shot History (${shots.length})</summary>${shots.length?`<div class="history-actions">${button(shots.every(sh=>this.shotExpanded.has(sh.id))?'Collapse All':'Expand All','shot-toggle-all',`data-id="${e(c.id)}"`,'text-button')}</div>`:''}${shots.map(sh=>shotCard(sh,{expanded:this.shotExpanded.has(sh.id),activeVersionId:v.id,unit:v.tempUnit})).join('')}</details></div>`:''}</article>`;
  }).join('')||'<p class="helper space-top">Add your first coffee to get started.</p>'}`;
 }
 communityScreen(){
  const syncText=this.pending.length?`${this.pending.length} Pending`:this.syncState==='synced'?'Synced':'Offline';
  const nav='<nav class="app-nav">'
   +button(icon('coffee',16)+' Coffees','home','','')
   +button(icon('users',16)+' Community','community','','active')
   +'<span class="local-label">'+button(icon('cloud',14)+' '+e(syncText),
     'sync','','sync-indicator')+'</span></nav>';
  return nav+communityPage({shots:this.communityRows,total:this.communityTotal,
    loading:this.communityLoading,error:this.communityError,
    style:this.communityStyle,coffee:this.communityCoffee,search:this.communitySearch,revision:this.communityRevision});
 }
 async loadCommunity({more=false}={}){
  if(this.communityLoading){if(!more)this.communityReloadRequested=true;return;}
  if(!this.identity||!this.status?.admitted)return;
  const owner=this.identity.id,epoch=this.epoch;
  const offset=more?this.communityRows.length:0;
  this.communityLoading=true;this.communityError='';this.render();
  try{
   if(!navigator.onLine)throw new Error('Connect to the internet to browse Community shots.');
   const query={limit:20,offset};
    const page=await this.inSession(()=>this.communitySearch||this.communityStyle!=='all'
     ?this.client.searchCommunityShots({...query,query:this.communitySearch,style:this.communityStyle})
     :this.client.browseCommunityShots(query));
   if(owner!==this.identity?.id||epoch!==this.epoch)return;
   if(!Array.isArray(page?.shots)||!Number.isFinite(Number(page.total)))
    throw new Error('Community data is temporarily unavailable.');
   this.communityRows=more?[...this.communityRows,...page.shots]:page.shots;
   this.communityTotal=Number(page.total);
   if(!more)this.communityRevision++; // Fresh results collapse old disclosures; Load More preserves open rows.
  }catch{
   if(owner===this.identity?.id&&epoch===this.epoch)
    this.communityError='Community is temporarily unavailable. Your personal shots remain unchanged.';
  }finally{
   if(owner===this.identity?.id&&epoch===this.epoch){
    this.communityLoading=false;
    const rerun=this.communityReloadRequested;
    this.communityReloadRequested=false;
    if(rerun)this.loadCommunity().catch(err=>this.error(err));
    else this.render();
   }
  }
 }
 settings(){
  const v=M.activeVersion(this.state),setup=M.activeSetup(this.state),pref=this.raw?.preferences;
  this.prefRevision=pref?.revision;
  this.show('Settings',`<p class="settings-account helper">${e(this.identity.email)}</p>
   <section class="settings-section settings-preferences" aria-labelledby="preferences-heading">
    <h3 class="settings-heading" id="preferences-heading">Preferences</h3>
    <form id=preferences>${select('Appearance','theme',[{value:'system',label:'System'},{value:'light',label:'Light'},{value:'dark',label:'Dark'}],this.state.theme)}
     <label class="field space-top"><span>Tasting Preferences</span><textarea name=tasting_preferences>${e(this.state.preferences)}</textarea></label>
     <button class="primary full space-top">Save Preferences</button></form>
   </section>
   <section class="settings-section" aria-labelledby="setup-heading">
    <h3 class="settings-heading" id="setup-heading">Your Setup</h3>
    ${setup?`<div class="settings-setup"><div><small>Active Setup</small><strong>${e(setup.name)}</strong></div>${button('Rename','rename-setup',`data-id="${e(setup.id)}"`,'ghost compact')}</div>`:''}
    ${button(`${icon('plus',18)}<span>Add Another Setup</span>${icon('chevron',16)}`,'new-setup','','settings-row')}
    ${v?`<details class="advanced settings-advanced"><summary>Advanced Setup Options</summary><form id=advanced>
     ${checkbox('track_temperature','Track Brew Temperature',v.advanced.temperature)}
     ${select('Temperature Units','temperature_unit',['F','C'],v.tempUnit)}
     ${checkbox('track_slow_feed','Track Slow Feeding',v.advanced.slowFeed)}
     <button class="primary full">Save Advanced Options</button></form></details>`:''}
   </section>
   ${this.status?.admin?`<section class="settings-section settings-admin" aria-label="Administration"><h3 class="settings-heading">Administration</h3>${button(`${icon('shield',18)}<span>Admin Dashboard</span>${icon('chevron',16)}`,'open-admin','','settings-row')}</section>`:''}
   <section class="settings-section" aria-label="Community and privacy">
    <details class="advanced settings-advanced">
     <summary>Community &amp; Privacy</summary>
     <p class="helper">Eligible Dialed-In shots from approved coffees contribute anonymously after validation. Community does not show private notes, account names, or personal setup details. Authorized administrators can review account-linked records and notes. Remove Access is reversible and retains your records and Community contributions.</p>
    </details>
   </section>
   <section class="settings-section settings-system" aria-label="Cloud Sync">
    ${button(`${icon('cloud',18)}<span>Cloud Sync Details</span>${icon('chevron',16)}`,'sync','','settings-row')}
   </section>
   <div class="settings-signout">${button(`${icon('signout',18)}<span>Sign Out On This Device</span>`,'signout','','settings-row signout-row')}</div>`);
  const sp=this.raw?.setupPreferences.find(p=>p.setup_version_id===v?.id);this.setupPrefRevision=sp?.revision;
 }
 showSetup(){
  this.show('New Setup',`<form id=new-setup>
   ${field('Setup Name','name','',{required:true,placeholder:'Home'})}
   <div class="setup-basket-field space-top">${field('Basket Dose (g)','basket_dose_g','',{required:true,type:'number',step:'.1',min:5,max:40})}</div>
   <section class="grinder-range-section" aria-labelledby="grinder-range-heading">
    <div class="grinder-range-heading">
     <h3 id="grinder-range-heading">Grinder Espresso Range</h3>
     <button type="button" class="inline-info-button" data-action="grinder-range-info" aria-label="About Grinder Espresso Range" aria-expanded="false" aria-controls="grinder-range-description"><span aria-hidden="true">i</span></button>
    </div>
    <p class="helper grinder-range-description" id="grinder-range-description" hidden>Enter the range of grind settings you would normally use for espresso, not the grinder's entire adjustment range.</p>
    <div class="form-grid">
     ${field('Finest Espresso Setting','finest_setting','',{required:true,type:'number',step:'.1',min:0})}
     ${field('Coarsest Espresso Setting','coarsest_setting','',{required:true,type:'number',step:'.1',min:0})}
    </div>
   </section>
   <details class=advanced><summary>Equipment Details (Optional)</summary>
    ${field('Machine','machine_model')}${field('Grinder','grinder_model')}${field('Burr Set','burr_set')}${field('Basket Model','basket_model')}
   </details>
   <button class="primary full space-top">Create Setup</button></form>`);
 }
 showRenameSetup(id){
  const setup=this.state.setups.find(x=>x.id===id),record=this.raw?.setups?.find(x=>x.id===id);
  if(!setup||!record)throw new Error('Refresh your cloud data before renaming this setup.');
  this.renameSetupId=id;this.renameSetupRevision=record.revision;
  this.show('Rename Setup',`<form id=rename-setup>${field('Setup Name','name',setup.name,{required:true,extra:'maxlength="100" autocomplete="off"'})}
   <p class="helper space-top">Renaming does not change your equipment history, shots, or recommendations.</p>
   <button class="primary full space-top">Save Name</button></form>`);
 }
 showEditCoffee(id){
  const c=this.state.coffees.find(x=>x.id===id);
  const entry=this.raw?.library?.find(l=>l.id===id);
  if(!c||!entry)throw new Error('Refresh this coffee before editing.');
  const original=this.raw?.submissions?.find(x=>x.id===entry.submission_id);
  const canonical=this.raw?.coffees?.find(x=>x.id===entry.coffee_id);
  const correction=canonical?this.raw?.submissions?.filter(x=>x.canonical_coffee_id===canonical.id&&x.status==='pending')
   .sort((a,b)=>(b.updated_at||'').localeCompare(a.updated_at||'')||(b.id||'').localeCompare(a.id||''))[0]:null;
  // Once approved, shared facts and their revision are authoritative. The
  // original submission may predate later administrator corrections.
  const source=canonical?correction:original;
  if(!canonical&&source?.status!=='pending')throw new Error('This coffee submission is no longer editable.');
  const data=source?.proposed_data||canonical||{};
  this.editCoffeeId=id;this.editCoffeeRevision=source?.revision??canonical?.revision;
  const sourceUrl=source?source.source_url||'':original?.source_url||'';
  if(!this.editCoffeeRevision)throw new Error('Coffee revision unavailable. Refresh and retry.');
  this.show(canonical?'Suggest Coffee Corrections':'Edit Coffee Details',`<form id=edit-coffee>
   ${field('Coffee Name','name',data.name||'',{required:true})}
   ${field('Roaster','roaster',data.roaster||'',{required:true})}
   ${field('Release / Harvest (If Shown)','release_label',data.release_label||'')}
   <div class="form-grid coffee-detail-grid">
    ${field('Origin','origin',data.origin||'')}
    ${select('Roast Level','roast_level',['',...C.ROASTS],C.canonicalRoastLevel(data.roast_level||'')||'')}
    ${field('Elevation','elevation_m',data.elevation_m||'')}
    ${select('Process','process',['',...C.PROCESSES],data.process||'')}
    ${field('Variety','variety',data.variety||'')}
    ${field('Producer','producer',data.producer||'')}
   </div>
   ${field('Tasting Notes','tasting_notes',data.tasting_notes||'')}
   ${field('Official Source URL (Optional)','source_url',sourceUrl,{type:'url',placeholder:'https://roaster.com/products/coffee'})}
   <p class="helper space-top">${canonical?'Verified coffee corrections are submitted for review, not immediately applied to shared facts. Your historical shots remain intact.':'Your Pending coffee details update immediately for your account without changing saved shots.'}</p>
   <button class="primary full space-top" type="submit">${canonical?'Submit Correction For Review':'Save Coffee Details'}</button>
  </form>`);
 }
 showAdd(){this.addCoffeeDraft=null;this.pendingMergeSubmissionId=null;this.coffeeUrlPreviewInput=null;
  this.show('New Coffee',`<form id=new-coffee>
   <div class="coffee-url-first">${field('Roaster Page URL','source_url','',{type:'url',placeholder:'https://roaster.com/products/coffee'})}
    <div class="coffee-url-actions">${button('Autofill From URL','preview-coffee-url','','secondary coffee-url-autofill-button')}
     <span class="helper">Optional · Official coffee product page</span></div>
   </div>
   <div id="coffee-url-feedback" aria-live="polite"></div>
   ${field('Name / Bag Label','name','',{required:true})}
   ${field('Roaster','roaster','',{required:true})}
   ${field('Release / Harvest (If Shown)','release_label','')}
   <div class="form-grid coffee-detail-grid">${field('Origin','origin')}${select('Roast Level','roast_level',['',...C.ROASTS],'')}${field('Elevation','elevation_m')}${select('Process','process',['',...C.PROCESSES],'')}${field('Variety','variety')}${field('Producer','producer')}</div>
   ${field('Tasting Notes','tasting_notes')}
   <button class="primary full space-top">Add Coffee</button>
   <p class="helper space-top">Check all suggested information before saving. Missing details can be entered manually.</p>
  </form>`);
 }
 async finishCoffeeAdd(d,matched,chosenId=null,{confirmedDistinct=false}={}){
  if(chosenId){
   await this.mutate('add_verified_coffee',{coffee_id:chosenId,library_entry_id:uuid()},{onlineOnly:true});
   const library=this.raw?.library?.find(x=>x.coffee_id===chosenId);
   this.tempCoffee=library?.id||null;
   // New coffee is ready to expand intentionally, not auto-expanded.
   sheet.close();this.notice='Added the existing verified coffee. No duplicate was created.';this.render();return;
  }
  const lid=uuid(),{source_url,proposed_data}=proposalWithRecognizedRoaster(d,matched);
  await this.mutate('submit_coffee',{library_entry_id:lid,source_url,proposed_data,confirmed_distinct:confirmedDistinct},{onlineOnly:true});
  this.tempCoffee=lid;sheet.close();
  const entry=this.raw?.library?.find(x=>x.id===lid);
  const proposal=this.raw?.submissions?.find(x=>x.id===entry?.submission_id);
  if(entry?.coffee_id){
   this.notice='Coffee automatically approved and added to the shared catalog.';
  }else{
   this.notice='Saved privately because a possible duplicate needs review. You can log shots now.';
   if(proposal?.id&&proposal?.source_url&&this.client.verifyCoffeeSource){
    try{
     const checked=await this.inSession(()=>this.client.verifyCoffeeSource(proposal.id));
     if(checked?.ok===true&&checked?.status==='verified'){
      await this.inSession(()=>this.sync());this.notice=checked.source_verified===true
       ?'Official source verified. Your coffee is now in the shared catalog.'
       :'Coffee is already approved in the shared catalog.';
     }else if(checked?.reason==='needs_confirmation'){
      this.notice='Coffee saved. A possible duplicate needs confirmation; nothing was merged.';
     }else this.notice='Pending identity review. Your private coffee and shots remain saved.';
    }catch(error){if(error.code==='account_changed')throw error;this.notice='Saved privately; source verification is unavailable and identity review can be retried.';}
   }
  }
  this.render();
 }
  async syncFirstStylePrompts(owner){
  if(!owner||!this.status?.admitted||globalThis.navigator?.onLine===false)return;
  let ids=[];
  try{ids=await this.inSession(()=>this.store.pendingFirstStylePrompts(owner));}catch{return;}
  for(const id of ids){
   try{
    await this.inSession(()=>this.client.claimFirstStylePrompt(id));
    await this.inSession(()=>this.store.acknowledgeFirstStylePrompt(owner,id));
   }catch(error){if(error.code==='account_changed')throw error;break;}
  }
 }
 async loadRecommendationEvidence(id){
  if(!this.status?.admitted||globalThis.navigator?.onLine===false||!this.identity?.id)return;
  const style=M.coffeeState(this.state,id).style,key=id+':'+style;
  if(Object.hasOwn(this.recommendationEvidence[id]||{},style)||
     this.recommendationEvidenceRequests.has(key))return;
  this.recommendationEvidenceRequests.add(key);
  const owner=this.identity.id,epoch=this.epoch;
  try{
   const evidence=await this.inSession(()=>this.client.recommendationCommunityEvidence(id,style));
   if(this.identity?.id===owner&&this.epoch===epoch){
    (this.recommendationEvidence[id] ||= {})[style]=evidence;
    this.state.communityEvidence=this.recommendationEvidence;
    this.render();
   }
  }catch(error){
   if(isAccessDenied(error))throw error;
   // Missing Community data must never block logging or personal recipes.
  }finally{this.recommendationEvidenceRequests.delete(key);}
 }
 async expandCoffee(id){
  if(this.expanded.has(id)){
   this.expanded.delete(id);if(this.tempCoffee===id)this.tempCoffee=null;
   if(this.firstStylePromptId===id)this.firstStylePromptId=null;
   this.render();return;
  }
  const coffee=this.state.coffees.find(x=>x.id===id);if(!coffee)return;
  this.expanded.add(id);this.firstStylePromptId=null;this.render();
   await this.loadRecommendationEvidence(id);
 if(!this.identity?.id||this.state.shots.some(sh=>sh.coffeeId===id))return;
  const owner=this.identity.id,epoch=this.epoch,key=owner+':'+id;
  if(this.firstStyleClaimInFlight.has(key))return;
  this.firstStyleClaimInFlight.add(key);
  let first=false;
  try{
   first=await this.inSession(()=>this.store.claimFirstStylePrompt(owner,id));
   if(this.status?.admitted&&globalThis.navigator?.onLine!==false){
    try{
     // Atomic owner+coffee server claim prevents repeat across devices.
     const remote=await this.inSession(()=>this.client.claimFirstStylePrompt(id));
     first=first&&remote?.show===true;
     await this.inSession(()=>this.store.acknowledgeFirstStylePrompt(owner,id));
    }catch(error){if(error.code==='account_changed')throw error;/* Retain local-first offline guidance. */}
   }
   if(first&&epoch===this.epoch&&this.identity?.id===owner&&this.expanded.has(id)&&
      !this.state.shots.some(sh=>sh.coffeeId===id))this.firstStylePromptId=id;
  }finally{this.firstStyleClaimInFlight.delete(key);}
  this.render();
 }
 async startFirstShot(id,container){
  const coffee=this.state.coffees.find(x=>x.id===id),style=container?.querySelector('[name=first_style]')?.value;
  if(!coffee||!C.STYLES.filter(s=>s!=='Custom').includes(style))throw new Error('Choose a starting shot style.');
  const version=M.activeVersion(this.state),setup=M.activeSetup(this.state),previous=M.coffeeState(this.state,id).style;
  if(style!==previous&&this.status?.admitted&&globalThis.navigator?.onLine!==false&&!this.pending.length){
   const rev=this.raw?.workspaceCoffees?.find(x=>x.library_entry_id===id&&x.setup_version_id===version.id)?.revision??0;
   try{
    await this.mutate('set_style',{setup_id:setup.id,setup_version_id:version.id,library_entry_id:id,style,expected_revision:rev},{onlineOnly:true});
   }catch(error){
    if(error.code==='account_changed')throw error;
    // Saving the first shot will also persist its style and never change Current before that shot.
    this.notice='The style choice will be saved with your first shot.';
   }
  }
  this.firstStylePromptId=null;this.showLog(id,null,style);
 }
 showLog(cid,editing=null,styleOverride=null){
  const c=this.state.coffees.find(c=>c.id===cid),v=M.activeVersion(this.state);this.logCoffee=cid;this.editing=editing;
  this.draft=editing?C.clone(editing):E.prefill(this.state,cid,styleOverride?{style:styleOverride}:{});this.draft.id ||= uuid();this.logUnit=editing?.snapshot.tempUnit||v.tempUnit;
  const d=this.draft,rec=E.recommendation(this.state,cid,styleOverride?{style:styleOverride}:{});this.show(editing?'Edit Shot':'Log A Shot',`<form id=shot novalidate><p class=recipe-label>${e(c.name)} · ${e(d.style)}</p>${!editing?`<div id=log-reference>${recipeGrid(rec,v.advanced.temperature,v.tempUnit)}</div>`:''}<div class="form-grid space-top">${field('Dose (g)','doseG',d.doseG,{required:true,type:'number',step:'.1'})}${field('Yield (g)','yieldG',d.yieldG,{required:true,type:'number',step:'.1'})}${field('Time (s)','timeS',d.timeS,{required:true,type:'number',step:'.1'})}<div>${field('Grind Setting','grindSetting',d.grindSetting,{required:true,type:'number',step:'.1'})}${!editing?button('Use Recommendation','use-grind','','use-recommendation'):''}</div>${v.advanced.temperature||editing?.tempC!=null?`<div>${field(`Temperature (°${this.logUnit}, Optional)`,'temperature',C.tempDisplay(d.tempC,this.logUnit),{type:'number',step:'1'})}${!editing?button('Use Recommendation','use-temp','','use-recommendation'):''}</div>`:''}</div>${v.advanced.slowFeed&&!editing?checkbox('slowFeed','Slow Feed',d.feedMode==='slow'):''}<div id=ratings>${scales(d.tasteScales)}</div><label class=field><span>Notes (Optional · Private)</span><textarea name=notes>${e(d.notes||'')}</textarea></label><aside id="shot-dose-advisory" class="helper" role="status" hidden><span data-dose-message></span> <button type="button" class="ghost compact" data-action="dismiss-dose-advisory">Dismiss</button></aside><p class=helper role=alert></p><button class="primary full space-top" type=submit>Save Shot & Get Suggestion</button></form>`);
  this.updateDoseAdvisory();
 }
 updateDoseAdvisory(){
  const panel=sheet.querySelector?.('#shot-dose-advisory');
  if(!panel)return;
  const d=this.draft;
  if(!d||this.editing||this.dismissedDoseAdvisories.has(d.id)){panel.hidden=true;return;}
  const version=M.activeVersion(this.state),coffee=M.coffeeState(this.state,this.logCoffee);
  const basketId=d.basketId||coffee?.basketId||version?.defaultBasketId;
  const reference=version?.baskets?.find(b=>b.id===basketId)?.doseG;
  const current=sheet.querySelector?.('#shot')?.elements?.doseG?.value??d.doseG;
  const message=basketDoseAdvisory(current,reference);
  panel.hidden=!message;
  const label=panel.querySelector?.('[data-dose-message]');
  if(label)label.textContent=message||'';
 }
 readDraft(){const f=sheet.querySelector('#shot');if(!f)return;for(const key of ['doseG','yieldG','timeS','grindSetting'])this.draft[key]=f.elements[key].value;this.draft.notes=f.elements.notes.value;
  // The displayed unit is rounded for readability. A notes/rating edit must
  // not round-trip and change an otherwise untouched historical measurement.
  if(f.elements.temperature&&f.elements.temperature.value!==String(C.tempDisplay(this.draft.tempC,this.logUnit)))this.draft.tempC=C.tempInput(f.elements.temperature.value,this.logUnit);
  if(f.elements.slowFeed)this.draft.feedMode=f.elements.slowFeed.checked?'slow':'standard';}
 async click(ev){const target=ev.target.closest('[data-action]');if(!target)return;const a=target.dataset.action,id=target.dataset.id;
  try{
   if(a==='dismiss-dose-advisory'){if(this.draft?.id)this.dismissedDoseAdvisories.add(this.draft.id);const panel=sheet.querySelector?.('#shot-dose-advisory');if(panel)panel.hidden=true;return;}
   if(a==='close'){sheet.close();return;}
   if(a==='auth-view'){this.authView=target.dataset.view;this.notice='';if(this.authView!=='check-email')this.confirmationEmail='';this.render();return;}
   if(a==='settings'){this.settings();return;}
   if(a==='new-setup'){this.showSetup();return;}
   if(a==='grinder-range-info'||a==='next-shot-info'){
    const description=a==='grinder-range-info'
     ?sheet.querySelector('#grinder-range-description')
     :document.getElementById(target.getAttribute('aria-controls'));
    const container=a==='grinder-range-info'?sheet:target.closest('.feedback-panel');
    if(description&&container?.contains(description)){
     description.hidden=!description.hidden;
     target.setAttribute('aria-expanded',String(!description.hidden));
    }
    return;
   }

   if(a==='open-admin'){location.assign('/admin.html');return;}
   if(a==='rename-setup'){this.showRenameSetup(id);return;}
   if(a==='add'){this.showAdd();return;}
    if(a==='preview-coffee-url'){
     const form=sheet.querySelector('#new-coffee'),panel=form?.querySelector('#coffee-url-feedback');
     if(!form||!panel||this.coffeeUrlBusy)return;
     const raw=String(form.elements.source_url.value||'').trim();
     if(!raw){panel.innerHTML=coffeeUrlPreviewMarkup({ok:false,reason:'invalid_url'});return;}
     this.coffeeUrlBusy=true;this.coffeeUrlPreviewInput=null;
     const original=target.textContent;target.disabled=true;target.textContent='Checking URL...';
     try{
      const found=await this.inSession(()=>this.client.previewCoffeeUrl(raw));
      if(!sheet.open||sheet.querySelector('#new-coffee')!==form||form.elements.source_url.value.trim()!==raw)return;
      
      this.coffeeUrlPreviewInput=found?.ok?raw:null;
      // One click populates available blanks, then the member reviews and
      // presses Add Coffee. Never overwrite typed facts or silently approve.
      if(found?.ok)applyCoffeeUrlFields(form,found);
      panel.innerHTML=coffeeUrlPreviewMarkup(found);
     }catch{
      if(sheet.querySelector('#new-coffee')===form)panel.innerHTML=coffeeUrlPreviewMarkup({ok:false,reason:'preview_unavailable'});
     }finally{this.coffeeUrlBusy=false;target.disabled=false;target.textContent=original;}
     return;
    }
    if(a==='retry-member-auto-approval'){
     if(this.pending.length||this.syncState==='offline'||globalThis.navigator?.onLine===false)
      throw new Error('Reconnect and sync changes before retrying coffee approval.');
     const entry=this.raw?.library?.find(x=>x.id===id);
     const submission=this.raw?.submissions?.find(x=>x.id===entry?.submission_id);
     if(!submission||submission.status!=='pending'||!Number.isSafeInteger(Number(submission.revision)))
      throw new Error('This Pending coffee needs a fresh sync before approval.');
     const result=await this.inSession(()=>this.client.memberRetryPendingApproval(submission.id,Number(submission.revision)));
     if(result?.ok===true&&result?.status==='verified'){
      await this.inSession(()=>this.sync());
      this.notice='Coffee automatically approved. Your original history is preserved.';
     }else if(result?.code==='needs_confirmation'){
      this.notice='Possible duplicate: review the existing match or ask an administrator. Your shots remain saved.';
     }else this.notice='This coffee remains Pending until its identity is resolved.';
     this.render();return;
    }
    if(a==='retry-pending-source'){
     if(this.pending.length||this.syncState==='offline'||globalThis.navigator?.onLine===false)
      throw new Error('Reconnect and sync pending changes before checking official source evidence.');
     const entry=this.raw?.library?.find(x=>x.id===id);
     const submission=this.raw?.submissions?.find(x=>x.id===entry?.submission_id);
     if(!submission||submission.status!=='pending'||!submission.source_url)
      throw new Error('This coffee has no eligible Pending source check.');
     if(!this.client.verifyCoffeeSource)throw new Error('Official verification is unavailable.');
     const result=await this.inSession(()=>this.client.verifyCoffeeSource(submission.id));
     if(result?.ok===true&&result?.status==='verified'){
      await this.inSession(()=>this.sync());
      this.notice=result.source_verified===true
       ?'Official roaster evidence verified. Your coffee is now in the shared catalog.'
       :'Coffee is already approved in the shared catalog.';
     }else if(result?.reason==='needs_confirmation'||result?.code==='needs_confirmation'){
      this.notice='A possible duplicate needs confirmation. Your coffee and shot history remain saved.';
     }else this.notice='Official verification did not establish the exact coffee. It remains usable privately.';
     this.render();return;
    }
    if(a==='check-pending-match'){
     const entry=this.raw?.library?.find(x=>x.id===id);
     const submission=this.raw?.submissions?.find(x=>x.id===entry?.submission_id);
     if(!submission||submission.status!=='pending')throw new Error('This coffee is no longer Pending.');
     const matched=await this.inSession(()=>this.client.findCoffeeMatches({...submission.proposed_data,source_url:submission.source_url}));
     if(!matched?.candidates?.length){
      this.notice='No verified match yet. Your coffee and shot history remain safe.';this.render();return;
     }
     this.pendingMergeSubmissionId=submission.id;this.addCoffeeMatches=matched;
     this.show('Is this the same coffee?',matchReviewMarkup(matched,{pending:true}));return;
    }
    if(a==='choose-coffee-match'||a==='add-distinct-coffee'){
     if(this.pendingMergeSubmissionId){
      if(a==='add-distinct-coffee'){this.pendingMergeSubmissionId=null;sheet.close();return;}
      if(!this.addCoffeeMatches?.candidates?.some(c=>c.id===id))throw new Error('That verified match was not offered.');
      await this.mutate('confirm_coffee_existing',{submission_id:this.pendingMergeSubmissionId,coffee_id:id},{onlineOnly:true});
      this.pendingMergeSubmissionId=null;sheet.close();this.notice='Matched to the original verified coffee. Your original shots are preserved.';this.render();return;
     }
     if(this.addingCoffee)return;
     if(!this.addCoffeeDraft)throw new Error('Add Coffee Details were lost. Please enter them again.');
     const idToUse=a==='choose-coffee-match'?id:null;
     if(idToUse && !this.addCoffeeMatches?.candidates?.some(c=>c.id===idToUse))
      throw new Error('That verified coffee is not in the current match list.');
     this.addingCoffee=true;
     try{await this.finishCoffeeAdd(this.addCoffeeDraft,this.addCoffeeMatches,idToUse,{confirmedDistinct:a==='add-distinct-coffee'});}
     finally{this.addingCoffee=false;}
     return;
    }
   if(a==='expand'){await this.expandCoffee(id);return;}
    if(a==='first-shot-log'){await this.startFirstShot(id,target.closest('.coffee-body'));return;}
   if(a==='shot-expand'){this.shotExpanded.has(id)?this.shotExpanded.delete(id):this.shotExpanded.add(id);this.render();return;}
   if(a==='shot-toggle-all'){const ids=this.state.shots.filter(sh=>sh.coffeeId===id&&!sh.hidden).map(sh=>sh.id);const collapse=ids.length>0&&ids.every(shotId=>this.shotExpanded.has(shotId));for(const shotId of ids){if(collapse)this.shotExpanded.delete(shotId);else this.shotExpanded.add(shotId);}this.render();return;}
   if(a==='search-toggle'){this.searchOpen=!this.searchOpen;if(!this.searchOpen)this.search='';this.render();return;}
   if(a==='log'){this.showLog(id);return;}
   if(a==='edit-coffee'){if(this.pending.length)throw new Error('Finish syncing before editing coffee details.');this.showEditCoffee(id);return;}
   if(a==='edit'){if(this.pending.length)throw new Error('Finish syncing before editing existing shots.');const sh=this.state.shots.find(x=>x.id===id);this.showLog(sh.coffeeId,sh);return;}
   if(a==='rate'){this.readDraft();this.draft.tasteScales[target.dataset.key]=Number(target.dataset.value);sheet.querySelector('#ratings').innerHTML=scales(this.draft.tasteScales);const alert=sheet.querySelector('[role=alert]');if(alert)alert.textContent='';return;}
   if(a==='use-grind'||a==='use-temp'){this.readDraft();const r=E.recommendation(this.state,this.logCoffee,{style:this.draft.style,basketId:this.draft.basketId,feedMode:this.draft.feedMode});if(a==='use-grind')sheet.querySelector('[name=grindSetting]').value=r.grind.value;else{this.draft.tempC=r.tempC;sheet.querySelector('[name=temperature]').value=C.tempDisplay(r.tempC,this.logUnit);}this.readDraft();return;}
   if(a==='switch'){this.show('Your Workspaces',this.state.setups.map(x=>`<div class="switch-row"><div class="switch-info"><strong>${e(x.name)}</strong>${x.id===this.state.activeSetupId?'<small>Current Setup</small>':''}</div><div class="switch-actions">${button('Use','choose-setup',`data-id="${e(x.id)}"`,'secondary compact')}${button('Rename','rename-setup',`data-id="${e(x.id)}"`,'ghost compact')}</div></div>`).join(''));return;}
   if(a==='choose-setup'){await this.mutate('select_setup',{setup_id:id,expected_revision:this.raw.preferences.revision},{onlineOnly:true});this.expanded.clear();const pin=M.workspace(this.state).currentCoffeeId;if(pin)this.expanded.add(pin);sheet.close();this.render();return;}
   if(a==='style'){const p=M.coffeeState(this.state,id);this.styleCoffee=id;this.styleRevision=this.raw.workspaceCoffees.find(x=>x.library_entry_id===id&&x.setup_version_id===M.activeVersion(this.state).id)?.revision||0;this.show('Shot Style',`<form id=style>${select('Style','style',C.STYLES.filter(s=>s!=='Custom'),p.style)}<p class="helper space-top">Styles are guidelines, not pass/fail rules.</p><button class="primary full">Use Style</button></form>`);return;}
   if(a==='make-current'){const sh=this.state.shots.find(x=>x.id===id),rp=this.raw.recipePreferences.find(x=>x.library_entry_id===sh.coffeeId&&x.setup_version_id===sh.setupVersionId&&x.style===sh.style);await this.mutate('make_current',{shot_id:id,expected_revision:rp?.revision||0},{onlineOnly:true});return;}
   if(a==='community'){this.view='community';await this.loadCommunity();return;}
   if(a==='home'){this.view='coffees';this.render();return;}
   if(a==='community-refresh'){await this.loadCommunity();return;}
    if(a==='community-search-clear'){this.communitySearch='';this.communityCoffee='all';await this.loadCommunity();return;}
   if(a==='community-more'){await this.loadCommunity({more:true});return;}
   if(a==='community-correct-outlier'){
    if(this.pending.length)throw new Error('Finish syncing before editing an existing shot.');
    const review=this.reviews.find(r=>r.shot_id===id);
    const sh=this.state.shots.find(x=>x.id===id);
    if(!review||!sh||sh.revision!==Number(review.revision))throw new Error('Refresh the shot before correcting it.');
    this.view='coffees';this.expanded.add(sh.coffeeId);this.render();this.showLog(sh.coffeeId,sh);return;
   }
   if(a==='community-confirm-outlier'){
    if(!navigator.onLine||this.pending.length)throw new Error('Reconnect and finish syncing before confirming a measurement.');
    const review=this.reviews.find(r=>r.shot_id===id);
    if(!review||Number(review.revision)!==Number(target.dataset.revision))throw new Error('Refresh this shot before confirming.');
    target.disabled=true;
    let result;
    try{
     result=await this.inSession(()=>this.client.confirmCommunityOutlier(id,review.revision));
     if(!result?.ok)throw new Error('This shot changed or no longer needs review. Please refresh.');
    }catch(error){target.disabled=false;throw error;}
    this.reviews=this.reviews.filter(r=>r.shot_id!==id);
    // Server confirmation succeeded; dismiss the required modal before
    // refreshing, so a subsequent network error cannot trap the member.
    this.syncReviewDialog();
    await this.inSession(()=>this.sync());
    this.notice='Unusual extraction confirmed. Your qualifying anonymous Community observation is saved.';
    this.render();return;
   }
   if(a==='sync'){const events=await this.inSession(()=>this.queue.pending());this.show('Cloud Sync Details',`<h3>${e(({synced:'Synced',offline:'Offline',syncing:'Syncing',connecting:'Connecting',conflict:'Needs Attention',pending:'Pending'})[this.syncState]||'Needs Attention')}</h3><p class=helper>${events.length} changes waiting. Conflicts are retained rather than overwritten.</p>${events.map(x=>`<div class=preview-card><strong>${e(x.action)}</strong><p class=helper>${e(x.status)} ${e(x.error?.message||'')}</p></div>`).join('')}${button('Try Syncing Now','sync-now','','primary full')}${events.length?button('Save Pending Changes','export','','ghost full'):''}${events.length?'<p class="helper space-top">This download preserves pending changes on this device; it is not a complete account backup.</p>':''}`);return;}
   if(a==='sync-now'){await this.inSession(()=>this.sync());this.notice='Sync checked. Pending conflicts require review; nothing was discarded.';this.render();return;}
   if(a==='export'){exportFile(await this.inSession(()=>this.store.export(this.identity.id)));return;}
   if(a==='signout'){const queued=await this.inSession(()=>this.queue.pending());if(queued.length&&!globalThis.confirm?.('You have '+queued.length+' unsynced change(s). They remain saved on this device for this account and will sync only after you sign in to the same account again. Sign out anyway?'))return;const epoch=this.epoch;await this.client.signOut();if(epoch===this.epoch){this.identity=null;this.resetAccount();this.render();}return;}
  }catch(err){this.error(err);}
 }
 input(ev){if(ev.target.name==='doseG'&&ev.target.closest?.('#shot'))this.updateDoseAdvisory();if(ev.target.name==='source_url'&&ev.target.closest('#new-coffee')){if(this.coffeeUrlPreviewInput!==ev.target.value.trim()){this.coffeeUrlPreviewInput=null;const panel=sheet.querySelector('#coffee-url-feedback');if(panel)panel.replaceChildren();}}if(ev.target.id==='search'){const value=ev.target.value,position=ev.target.selectionStart;this.search=value;this.render();const input=root.querySelector('#search');input.focus();input.setSelectionRange(position,position);}}
 change(ev){if(ev.target.id==='sort'){this.sort=ev.target.value;this.render();}if(ev.target.id==='community-style'){this.communityStyle=ev.target.value;this.communityCoffee='all';this.loadCommunity().catch(err=>this.error(err));}if(ev.target.id==='community-coffee'){this.communityCoffee=ev.target.value;this.render();}if(ev.target.name==='slowFeed'&&this.draft){this.readDraft();const v=M.activeVersion(this.state),rec=E.recommendation(this.state,this.logCoffee,{style:this.draft.style,basketId:this.draft.basketId,feedMode:this.draft.feedMode});const box=sheet.querySelector('#log-reference');if(box)box.innerHTML=recipeGrid(rec,v.advanced.temperature,v.tempUnit);}}
 async submit(ev){ev.preventDefault();if(this.busy)return;const form=ev.target,id=form.id,d=Object.fromEntries(new FormData(form));this.busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   if(id==='auth-signup'||id==='auth-password'){const issue=validateNewPassword(d.password);if(issue)throw new Error(issue);}
    if(id==='auth-signin'){await this.client.signIn(d.email,d.password);const epoch=this.epoch;const identity=await this.client.identity();if(epoch===this.epoch)this.identity=identity;await this.connect();}
   else if(id==='community-search'){
     const query=String(d.query||'').trim();if(query.length>80)throw new Error('Community search must be 80 characters or fewer.');
     this.communitySearch=query;this.communityCoffee='all';await this.loadCommunity();
    }
    else if(id==='auth-signup'){await this.client.signUp(d.email,d.password);this.confirmationEmail=d.email.trim();this.authView='check-email';this.notice='';this.render();root.querySelector('#confirmation-title')?.focus();}
   else if(id==='auth-reset'){this.notice=await this.client.requestReset(d.email);this.render();}
   else if(id==='auth-password'){await this.inSession(()=>this.client.setPassword(d.password));this.recovery=false;this.notice='Password updated.';await this.connect();}
   else if(id==='auth-invite'){await this.inSession(()=>this.client.redeemInvite(d.token));await this.connect();}
   else if(id==='new-setup'){await this.mutate('create_setup',{...d,id:uuid(),basket_dose_g:Number(d.basket_dose_g),finest_setting:Number(d.finest_setting),coarsest_setting:Number(d.coarsest_setting)},{onlineOnly:true});sheet.close();}
   else if(id==='rename-setup'){
    await this.mutate('rename_setup',{setup_id:this.renameSetupId,name:d.name,expected_revision:this.renameSetupRevision},{onlineOnly:true});
    sheet.close();this.notice='Setup Name saved.';this.render();
   }
   else if(id==='new-coffee'){
     // Lookup is read-only. No near-match is ever merged without confirmation.
     const matched=await this.inSession(()=>this.client.findCoffeeMatches(d));
     const choice=nextCoffeeAction(matched);
     if(choice==='reuse_verified')await this.finishCoffeeAdd(d,matched,matched.exact_id);
     else if(choice==='ask_user'){
      this.addCoffeeDraft=d;this.addCoffeeMatches=matched;
      this.show('Check For An Existing Coffee',matchReviewMarkup(matched));
     }
     else await this.finishCoffeeAdd(d,matched);
    }
   else if(id==='edit-coffee'){
    if(!navigator.onLine||this.pending.length)throw new Error('Reconnect and sync before editing coffee details.');
    if(!this.editCoffeeId||!this.editCoffeeRevision)throw new Error('Refresh coffee details before editing.');
    const {source_url,...details}=d;
    const result=await this.inSession(()=>this.client.editCoffeeDetails(
      this.editCoffeeId,this.editCoffeeRevision,details,source_url||null
    ));
    if(!result?.ok)throw new Error(result?.code==='conflict'?'Coffee details changed on another device. Refresh and try again.':'Coffee details could not be saved.');
    sheet.close();await this.inSession(()=>this.sync());
    this.notice=result.kind==='correction_requested'?'Coffee correction submitted for review. The verified shared coffee remains unchanged.':'Pending coffee details saved without changing shot history.';
    this.render();
   }
   else if(id==='preferences'){await this.mutate('save_preferences',{...d,expected_revision:this.prefRevision},{onlineOnly:true});this.prefRevision=this.raw.preferences.revision;sheet.querySelector('[role=alert]').textContent='Preferences saved.';}
   else if(id==='advanced'){await this.mutate('save_setup_settings',{setup_id:M.activeSetup(this.state).id,setup_version_id:M.activeVersion(this.state).id,expected_revision:this.setupPrefRevision,track_temperature:'track_temperature' in d,track_slow_feed:'track_slow_feed' in d,temperature_unit:d.temperature_unit},{onlineOnly:true});this.setupPrefRevision=this.raw.setupPreferences.find(x=>x.setup_version_id===M.activeVersion(this.state).id).revision;sheet.querySelector('[role=alert]').textContent='Advanced settings saved.';}
   else if(id==='style'){await this.mutate('set_style',{setup_id:M.activeSetup(this.state).id,setup_version_id:M.activeVersion(this.state).id,library_entry_id:this.styleCoffee,style:d.style,expected_revision:this.styleRevision},{onlineOnly:true});sheet.close();}
   else if(id==='shot'){
    this.readDraft();const d=this.draft,validation=M.validateShot(d);if(validation.length)throw new Error(validation.join(' '));
    // New-shot basket variance is a nonblocking advisory. Existing edits never rewarn.
    let payload;if(this.editing){payload={id:d.id,expected_revision:this.editing.revision,dose_g:Number(d.doseG),yield_g:Number(d.yieldG),time_s:Number(d.timeS),grind_setting:Number(d.grindSetting),temperature_c:C.num(d.tempC),taste:d.tasteScales,notes:d.notes};}else payload=shotPayload(this.state,this.logCoffee,d);
    await this.mutate('save_shot',payload);this.dismissedDoseAdvisories.delete(d.id);this.firstStylePromptId=null;this.expanded=new Set([this.logCoffee]);this.tempCoffee=null;this.justSavedId=d.id;sheet.close();this.notice=this.pending.length?'Saved on this device; waiting to sync.':'Shot saved to your cloud account.';this.render();
   }
  }catch(err){this.error(err);}finally{this.busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
}
export async function startCloudApp(){
 try{
  secureOrigin();if(!CLOUD_CONFIG.enabled)throw new Error('Cloud testing is not configured for this build. Your local app is unchanged.');
  if(!globalThis.supabase?.createClient)throw new Error('Build the pinned Supabase SDK assets before deploying this owner test.');
  // Shell worker stores only static public files; it never handles identity data.
  if(globalThis.navigator?.serviceWorker)globalThis.navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(reg=>{
   // iOS Home Screen apps can stay resident across deploys without a navigation.
   // Check when returning to the app; the new worker activates for the next
   // navigation, never discarding an in-progress draft or offline shot queue.
   let lastCheck=0;
   const check=()=>{if(globalThis.document?.visibilityState==='hidden'||Date.now()-lastCheck<60_000)return;
    lastCheck=Date.now();reg.update().catch(()=>{});};
   check();globalThis.document?.addEventListener?.('visibilitychange',check);
  }).catch(()=>{});
  const sdk=globalThis.supabase.createClient(CLOUD_CONFIG.supabaseUrl,CLOUD_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'dic_cloud_auth_v1'}});
  const client=createCloudClient(sdk,{redirectUrl:new URL(location.pathname,location.origin).href});const app=new CloudApp(client);await app.init();return app;
 }catch(err){root.innerHTML=`<main class="shell welcome"><h1>The Dial In Collective</h1><h2 class=space-top>Cloud setup in progress</h2><p class=helper>${e(err.message)}</p></main>`;}
}
startCloudApp();
export {CloudApp};
