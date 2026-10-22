import {CLOUD_CONFIG} from '../cloud/config.js';
import {secureOrigin,isAccessDenied} from '../cloud/client.js';
import {e} from '../lib/ui.js';
import {applyAppearance,readAppearance} from '../cloud/appearance.js';
applyAppearance(readAppearance(),{remember:false});
import {renderAdminDashboard,renderAdminDenied} from './view.js';

const root=document.querySelector('#admin-root');
const notice=message=>`<header class="admin-top"><span class="admin-brand">The Dial In Collective</span><a href="/">Back To App</a></header><section class="admin-panel admin-empty"><h1>Admin Dashboard Unavailable</h1><p>${e(message)}</p></section>`;
async function start(){
 let invalidated=false;
 let issued=null; // generated code exists only in live tab memory
 let busy=false;
 let mergeChoices=Object.create(null);
 let recordPages=Object.fromEntries(['pending','conflicts','approved','shots','accounts','invites'].map(k=>[k,0]));
 let records={};
 const openSections=new Set();
 const openCoffeeGroups=new Set();
 const invalidate=message=>{
  issued=null;mergeChoices=Object.create(null);records={};invalidated=true;root.innerHTML=renderAdminDenied(message);
 };
 try {
  secureOrigin();
  if(!CLOUD_CONFIG.enabled||!globalThis.supabase?.createClient)throw new Error('Cloud access is not configured.');
  const sdk=globalThis.supabase.createClient(CLOUD_CONFIG.supabaseUrl,CLOUD_CONFIG.publishableKey,
   {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'dic_cloud_auth_v1'}});
  let owner;
  // Clear already-rendered private records synchronously on a cross-tab
  // session change. Do not call the SDK inside its auth callback.
  sdk.auth.onAuthStateChange((event,session)=>{
   const next=session?.user?.id||null;
   if(event==='SIGNED_OUT'||(owner!==undefined&&next!==owner)){
    invalidate('Your session changed. Return to the main app and reopen Admin.');
   }
   owner=next;
  });
  const {data:identity,error:userError}=await sdk.auth.getUser();
  if(invalidated)return;
  if(owner!==undefined&&owner!==(identity?.user?.id||null)){root.innerHTML=renderAdminDenied();return;}
  owner=identity?.user?.id||null;
  if(userError||!identity?.user){root.innerHTML=renderAdminDenied('Sign in to your account from the main app first.');return;}
  const {data:status,error:statusError}=await sdk.rpc('dic_session_status');
  if(invalidated)return;
  if(statusError)throw statusError;
  if(!status?.authenticated||!status?.admitted||!status?.admin){
   root.innerHTML=renderAdminDenied();return;
  }
  async function adminRpc(name,args){
   const {data,error}=await sdk.rpc(name,args);
   if(invalidated)throw new Error('Your session changed. Return to the app.');
   if(error){if(isAccessDenied(error))invalidate('Administrator access could not be confirmed. Return to the main app.');throw error;}
   if(data?.ok===false)throw new Error(data.code==='needs_confirmation'?'Possible existing coffee. Resolve the duplicate before approval.':'The administrator action was rejected.');
   return data;
  }
  async function refresh(){
   try{
    const {data:preferences,error:appearanceError}=await sdk.from('account_preferences').select('theme').eq('owner_id',identity.user.id).maybeSingle();
    if(invalidated)return;
    if(!appearanceError&&preferences?.theme)applyAppearance(preferences.theme);
   }catch{/* Cosmetic fallback only; administrator authorization stays mandatory. */}
   if(invalidated)return;

   const trigger=root.querySelector('#admin-refresh');if(trigger)trigger.disabled=true;
   try{
    const [dashboard,access,...pages]=await Promise.all([
    adminRpc('dic_admin_dashboard'),adminRpc('dic_admin_access_overview'),
    ...['pending','conflicts','approved','shots','accounts','invites'].map(async kind=>{
     try{return await adminRpc('dic_admin_records',{p_kind:kind,p_offset:recordPages[kind],p_limit:50});}
     catch(error){if(isAccessDenied(error))throw error;return {items:[],total:0,offset:0,error:'Detailed listing is temporarily unavailable.'};}
    })
   ]);
   records=Object.fromEntries(['pending','conflicts','approved','shots','accounts','invites'].map((kind,i)=>[kind,pages[i]]));
   if(invalidated)return;
   root.innerHTML=renderAdminDashboard(dashboard,access,issued,mergeChoices,records,{openSections,openCoffeeGroups});
   }finally{if(trigger)trigger.disabled=false;}
  }
  function actionMessage(message){
   if(invalidated)return;
   const area=root.querySelector('#admin-action-notice');
   if(area)area.textContent=String(message||'');
   else root.innerHTML=notice(message);
  }
  async function guarded(action){
   if(busy||invalidated)return;
   busy=true;
   try{await action();}
   catch(err){actionMessage(err.message||'The administrator action failed.');}
   finally{busy=false;}
  }
  // Preserve operator disclosure state during re-render; toggle requires capture.
  root.addEventListener?.('toggle',event=>{
   const details=event.target;
   if(details?.matches?.('details[data-admin-coffee]')){
    if(details.open)openCoffeeGroups.add(details.dataset.adminCoffee);
    else openCoffeeGroups.delete(details.dataset.adminCoffee);
    return;
   }
   if(!details?.matches?.('details[data-admin-section]'))return;
   if(details.open)openSections.add(details.dataset.adminSection);
   else openSections.delete(details.dataset.adminSection);
  },true);
  // Delegate actions from stable root, which survives refresh renders.
  root.addEventListener?.('submit',event=>{
   if(event.target?.matches?.('[data-record-form]')){
    event.preventDefault();
    guarded(async()=>{
     const form=event.target,type=form.dataset.type,id=form.dataset.id;
     const rev=Number(form.dataset.revision),reason=String(form.elements.namedItem('reason')?.value||'').trim();
     if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isSafeInteger(rev)||rev<1||reason.length<8)throw new Error('A valid record, revision and correction reason are required.');
     const changes=Object.fromEntries(Array.from(form.elements).filter(el=>el.name&&el.name!=='reason').map(el=>[el.name,el.value]));
     if(!globalThis.confirm?.('Save this administrator correction? The original values will remain in the audit record.'))return;
     await adminRpc(type==='shot'?'dic_admin_edit_shot':'dic_admin_edit_coffee',{
      p_record_id:id,p_expected_revision:rev,p_details:changes,p_reason:reason,p_kind:type
     });
     await refresh();actionMessage('Audited correction saved.');
    });return;
   }
   
   if(event.target?.id!=='admin-invite-form')return;
   event.preventDefault();
   guarded(async()=>{
    const form=event.target;
    const label=String(form.elements.namedItem('label')?.value||'').trim();
    // A code is always single-use; no client-selectable or server-accepted capacity.
    const data=await adminRpc('dic_admin_issue_invite',{p_label:label});
    if(!data?.invite_code)throw new Error('No code returned. Review invitations before retrying.');
    issued=data; // displayed once only; never stored to disk or GitHub.
    await refresh();
   });
  });
  root.addEventListener?.('click',event=>{
   const card=event.target?.closest?.('a.admin-stat[href^="#admin-"]');
   if(card){
    const section=root.querySelector('#'+card.getAttribute('href').slice(1));
    const disclosure=section?.querySelector?.('details[data-admin-section]');
    if(disclosure){
     event.preventDefault();disclosure.open=true;openSections.add(disclosure.dataset.adminSection);
     disclosure.querySelector('summary')?.focus?.({preventScroll:true});
     section.scrollIntoView?.({block:'start'});
    }
    return;
   }
   const button=event.target?.closest?.('[data-action],#admin-refresh');
   if(!button)return;
   const action=button.dataset.action||'refresh';
   if(action==='record-page'){
    const kind=button.dataset.kind,offset=Number(button.dataset.offset);
    if(!['pending','conflicts','approved','shots','accounts','invites'].includes(kind)||!Number.isSafeInteger(offset)||offset<0)return;
    guarded(async()=>{recordPages[kind]=offset;const target=['accounts','invites'].includes(kind)?'accounts':kind;openSections.add(target);await refresh();root.querySelector('#admin-'+target)?.scrollIntoView?.({block:'start'});});return;
   }
   if(action==='edit-toggle'){
    const form=Array.from(root.querySelectorAll('[data-record-form]')).find(f=>f.dataset.id===button.dataset.id);
    if(form)form.hidden=!form.hidden;return;
   }
   if(action==='extract-coffee-url'){
    guarded(async()=>{
     const form=Array.from(root.querySelectorAll('[data-record-form]')).find(f=>f.dataset.id===button.dataset.id);
     const url=String(form?.elements.namedItem('source_url')?.value||'').trim();
     if(!form||!/^https:\/\//i.test(url))throw new Error('Enter an HTTPS coffee product URL.');
     const {data,error}=await sdk.auth.getSession();
     if(error||!data?.session?.access_token)throw new Error('Sign in again before URL extraction.');
     const response=await fetch('/api/coffee-preview',{method:'POST',credentials:'same-origin',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({source_url:url})});
     const preview=await response.json();
     // A delayed response belongs only to the same live administrator draft and URL.
     if(invalidated||!root.contains(form)||String(form.elements.namedItem('source_url')?.value||'').trim()!==url)return;
     if(!response.ok||!preview?.ok)throw new Error('Unable to extract coffee metadata from this URL.');
     let populated=0;
     for(const [key,value] of Object.entries(preview.fields||{})){
      const name=key==='espresso_notes'?'espressoNotes':key;
      const field=form.elements.namedItem(name);
      if(field&&!field.readOnly&&!field.disabled&&typeof value==='string'&&!field.value.trim()){field.value=value;populated++;}
     }
     actionMessage('URL preview filled '+populated+' blank fields. Review and save explicitly; source identity is not automatically verified.');
    });return;
   }
   
   if(action==='copy-invite'){
    guarded(async()=>{
     if(!issued?.invite_code)throw new Error('There is no recent invitation code to copy.');
     if(!globalThis.navigator?.clipboard?.writeText)throw new Error('Clipboard unavailable. Select the displayed code to copy manually.');
     await globalThis.navigator.clipboard.writeText(issued.invite_code);
     actionMessage('Code copied. Share it privately with your tester.');
    });
    return;
   }
   if(action==='refresh'){
    issued=null; // Never retrieve plaintext from an overview endpoint.
    guarded(()=>refresh());return;
   }
   const id=button.dataset.id||'';
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id))return;
   if(action==='review-merge-prepare'){
    guarded(async()=>{
     const result=await adminRpc('dic_admin_coffee_candidates',{p_submission_id:id});
     const candidates=Array.isArray(result?.candidates)?result.candidates:[];
     if(!candidates.length)throw new Error('No compatible approved coffee found. Approve as distinct only after checking this is not a duplicate.');
     mergeChoices[id]=candidates;await refresh();
    });return;
   }
   if(['review-approve','review-merge','review-hold'].includes(action)){
    const revision=Number(button.dataset.revision);
    if(!Number.isSafeInteger(revision)||revision<1)return;
    const decision=action==='review-approve'?'approve':action==='review-merge'?'merge':'hold';
    const selected=decision==='merge'?root.querySelector('#admin-merge-'+id)?.value:null;
    if(decision==='merge'&&!mergeChoices[id]?.some(c=>c.id===selected))return;
    const reason=globalThis.prompt?.('Required audit reason for this coffee decision:','');
    if(!reason||reason.trim().length<8)return;
    if(!globalThis.confirm?.('Apply '+decision+' to this submitted coffee? The decision is logged and cannot overwrite another member’s shots.'))return;
    guarded(async()=>{
     const result=await adminRpc('dic_admin_review_coffee',{
      p_submission_id:id,p_expected_revision:revision,p_action:decision,
      p_reason:reason.trim(),p_canonical_id:selected||null
     });
     if(!result?.ok)throw new Error('The review did not complete. Refresh before retrying.');
     delete mergeChoices[id];issued=null;await refresh();
     actionMessage(decision==='hold'?'Coffee held for clarification.':'Coffee reviewed successfully.');
    });return;
   }
   if(action==='revoke-invite'){
    if(!globalThis.confirm?.('Revoke this invitation code? Existing accounts keep access.'))return;
    guarded(async()=>{
     issued=null;
     await adminRpc('dic_admin_revoke_invite',{p_invite_id:id});
     await refresh();
     actionMessage('Invitation revoked. Existing accounts were not affected.');
    });
   }else if(action==='remove-member'||action==='restore-member'){
    const enabled=action==='restore-member';
    if(!globalThis.confirm?.(enabled?'Restore access for this member?':'Remove this member’s access? Their shots and notes will remain saved.'))return;
    guarded(async()=>{
     issued=null;
     await adminRpc('dic_admin_set_member_access',{p_member_id:id,p_enabled:enabled});
     await refresh();
     actionMessage(enabled?'Member access restored.':'Member access removed. Their saved history was preserved.');
    });
   }
  });
  await refresh();
 } catch(error) {if(!invalidated)root.innerHTML=notice(error.message||'Unable to verify administrator access.');}
}
start();
