import {CLOUD_CONFIG} from '../cloud/config.js';
import {secureOrigin,isAccessDenied} from '../cloud/client.js';
import {e} from '../lib/ui.js';
import {applyAppearance,readAppearance} from '../cloud/appearance.js';
applyAppearance(readAppearance(),{remember:false});
import {renderAdminDashboard,renderAdminDenied,renderAdminDeleteAccountPrompt} from './view.js';

const root=document.querySelector('#admin-root');
const RECORD_KINDS=['pending','conflicts','approved','shots','accounts'];
const kindsForSection=kind=>RECORD_KINDS.includes(kind)?[kind]:[];
const notice=message=>`<header class="admin-top"><span class="admin-brand">The Dial In Collective</span><a href="/">Back To App</a></header><section class="admin-panel admin-empty"><h1>Admin Dashboard Unavailable</h1><p>${e(message)}</p></section>`;
async function start(){
 let invalidated=false;
  let pendingAccountDelete=null;
 let busy=false;
 let pendingSectionRefresh=false;
 let mergeChoices=Object.create(null);
  let comparisons=Object.create(null);
 let recordPages=Object.fromEntries(RECORD_KINDS.map(k=>[k,0]));
 let searchText='';
 let records={};
 let access=null;
 let signupRequests=null,signupOffset=0,lastAttentionCount=null;
 const openSections=new Set();
 const openCoffeeGroups=new Set();
 const invalidate=message=>{
  pendingAccountDelete=null;mergeChoices=Object.create(null);comparisons=Object.create(null);records={};access=null;pendingSectionRefresh=false;invalidated=true;root.innerHTML=renderAdminDenied(message);
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
    // The summary is always current; private listings are loaded only for
    // operator-expanded sections. Accounts share one disclosure; signup requests have their own review panel.
    const kinds=[...new Set([...openSections].flatMap(kindsForSection))];
    const loadAccess=openSections.has('accounts');
    const [dashboard,nextAccess,nextSignups,...pages]=await Promise.all([
     adminRpc('dic_admin_dashboard'),
     loadAccess?(searchText?Promise.resolve({members:[],members_total:0}):adminRpc('dic_admin_access_overview')):Promise.resolve(null),
      adminRpc('dic_admin_signup_requests',{p_offset:signupOffset,p_limit:50}),
     ...kinds.map(async kind=>{
      try{
       const args={p_kind:kind,p_offset:recordPages[kind],p_limit:50};
       if(searchText)args.p_query=searchText;
       const result=await adminRpc(searchText?'dic_admin_search_records':'dic_admin_records',args);
       return {...result,search:!!searchText};
      }
      catch(error){if(isAccessDenied(error))throw error;return {items:[],total:0,offset:recordPages[kind],error:'Detailed listing is temporarily unavailable.'};}
     })
    ]);
    if(invalidated)return;
    // No stale hidden-page totals override the fresh dashboard count.
    records=Object.fromEntries(kinds.map((kind,i)=>[kind,pages[i]]));
    access=loadAccess?nextAccess:null;
     signupRequests=nextSignups;
     const stats=dashboard?.counts||{};
     lastAttentionCount=['pending_verified_accounts','pending_coffees','conflicts','unfinished_account_deletions'].reduce((total,key)=>total+(Number.isSafeInteger(Number(stats[key]))?Number(stats[key]):0),0);
    // Keep the comparison scoped to a bounded, admin-authorized server search.
    // The first visible pending records are prefetched for the expanded queue;
    // others can request their own comparison without loading the entire catalog.
    const visible=['pending','conflicts'].flatMap(kind=>records[kind]?.items||[]).filter(item=>item.id&&!Object.hasOwn(comparisons,item.id)).slice(0,6);
    await Promise.all(visible.map(async item=>{
      try{
        const query=String(item.name||'').trim().slice(0,80);
        if(!query)return;
        const result=await adminRpc('dic_admin_review_candidates',{p_submission_id:item.id});
        if(!invalidated)comparisons[item.id]=Array.isArray(result?.candidates)?result.candidates:[];
      }catch(error){if(isAccessDenied(error))throw error;}
    }));
    if(invalidated)return;

    root.innerHTML=renderAdminDashboard(dashboard,access,null,mergeChoices,records,{openSections,openCoffeeGroups,searchText,comparisons,signupRequests});
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
   finally{
    busy=false;
    if(pendingSectionRefresh&&!invalidated){
     pendingSectionRefresh=false;
     guarded(()=>refresh());
    }
   }
  }
  // Small server-authoritative count refresh. Never load collapsed records.
  let countRefreshRunning=false;
  const countKeys={
   pending:'pending_coffees',conflicts:'conflicts',approved:'verified_coffees',
   shots:'shot_records',accounts:'active_accounts','new-members':'pending_accounts'
  };
  async function refreshVisibleCounts(){
   if(invalidated||busy||countRefreshRunning||document.hidden)return;
   countRefreshRunning=true;
   try{
    const summary=await adminRpc('dic_admin_dashboard');
    if(invalidated)return;
    const stats=summary?.counts||{};
     const attention=['pending_verified_accounts','pending_coffees','conflicts','unfinished_account_deletions']
      .reduce((total,key)=>total+(Number.isSafeInteger(Number(stats[key]))?Number(stats[key]):0),0);
     for(const node of root.querySelectorAll('.admin-attention-count'))node.textContent=String(attention);
     if(lastAttentionCount!==null&&attention>lastAttentionCount&&globalThis.Notification?.permission==='granted'){
      try{new globalThis.Notification('The Dial In Collective Admin',{body:'New items require administrator review.',tag:'dic-admin-attention'});}catch{/* In-app attention remains available. */}
     }
     lastAttentionCount=attention;
     for(const [kind,key] of Object.entries(countKeys)){
     const count=summary?.counts?.[key];
     if(count==null||!Number.isSafeInteger(Number(count))||Number(count)<0)continue;
     for(const node of root.querySelectorAll('.admin-stat[href="#admin-'+kind+'"] strong, details[data-admin-section="'+kind+'"] .admin-count')){
      // Expanded search sections retain their filtered total rather than
      // silently substituting the whole-database count.
      if(searchText&&openSections.has(kind))continue;
      node.textContent=String(Number(count));
     }
    }
   }catch(error){
    if(isAccessDenied(error)&&!invalidated)invalidate('Administrator access could not be confirmed.');
    // Transient failures retain last known counts, never present invented zeroes.
   }finally{countRefreshRunning=false;}
  }
  globalThis.setInterval?.(refreshVisibleCounts,45000);
  document.addEventListener?.('visibilitychange',()=>{
   if(!document.hidden)refreshVisibleCounts();
  });
  globalThis.addEventListener?.('focus',refreshVisibleCounts);
  function requestSectionRefresh(){
   if(invalidated)return;
   if(busy){pendingSectionRefresh=true;return;}
   guarded(()=>refresh());
  }
  // Preserve operator disclosure state during re-render; toggle requires capture.
  root.addEventListener?.('toggle',event=>{
   const details=event.target;
   if(details?.matches?.('details[data-admin-coffee]')){
    if(details.open)openCoffeeGroups.add(details.dataset.adminCoffee);
    else openCoffeeGroups.delete(details.dataset.adminCoffee);
    return;
   }
   if(!details?.matches?.('details[data-admin-section]')||!root.contains(details))return;
   const kind=details.dataset.adminSection;
   if(details.open){
    const newOpen=!openSections.has(kind);
    openSections.add(kind);
    if(newOpen&&kindsForSection(kind).length)requestSectionRefresh();
   }else openSections.delete(kind);
  },true);
  root.addEventListener?.('change',event=>{
   if(event.target?.name!=='is_decaf')return;
   const editor=event.target.closest?.('[data-record-form]');
   const method=editor?.querySelector?.('.admin-decaf-method');
   if(method)method.hidden=!event.target.checked;
   const select=method?.querySelector?.('select');
   if(select&&!event.target.checked)select.value='';
  });
  // Delegate actions from stable root, which survives refresh renders.
  root.addEventListener?.('submit',event=>{
   if(event.target?.id==='admin-search-form'){
    event.preventDefault();
    const term=String(event.target.elements?.namedItem?.('query')?.value||'').trim();
    if(term.length>80){actionMessage('Search must be 80 characters or fewer.');return;}
    guarded(async()=>{
     searchText=term;recordPages=Object.fromEntries(RECORD_KINDS.map(k=>[k,0]));
     await refresh();
    });return;
   }
   if(event.target?.matches?.('[data-record-form]')){
    event.preventDefault();
    guarded(async()=>{
     const form=event.target,type=form.dataset.type,id=form.dataset.id;
     const rev=Number(form.dataset.revision);
     if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isSafeInteger(rev)||rev<1)throw new Error('A valid record and current revision are required.');
     const changes=Object.fromEntries(Array.from(form.elements).filter(el=>el.name).map(el=>[el.name,el.name==='is_decaf'?el.checked:el.value]));
     if(type!=='shot'&&changes.is_decaf===false)changes.decaffeination_method='';
     await adminRpc(type==='shot'?'dic_admin_edit_shot':'dic_admin_edit_coffee',{
      p_record_id:id,p_expected_revision:rev,p_details:changes,p_reason:'',p_kind:type
     });
     await refresh();actionMessage('Audited correction saved.');
    });return;
   }
   
   // No invite-code forms: signup approval actions are server authorized.
  });
  root.addEventListener?.('click',event=>{
   const card=event.target?.closest?.('a.admin-stat[href^="#admin-"]');
   if(card && typeof card.getAttribute==='function'){
    const section=root.querySelector('#'+card.getAttribute('href').slice(1));
    const disclosure=section?.querySelector?.('details[data-admin-section]');
    if(disclosure){
     event.preventDefault();
     const newOpen=!disclosure.open;
     disclosure.open=true;openSections.add(disclosure.dataset.adminSection);
     if(newOpen)requestSectionRefresh();
     disclosure.querySelector('summary')?.focus?.({preventScroll:true});
     section.scrollIntoView?.({block:'start'});
    }
    return;
   }
   const button=event.target?.closest?.('[data-action],#admin-refresh');
   if(!button)return;
   const action=button.dataset.action||'refresh';
   if(action==='admin-search-clear'){
    guarded(async()=>{searchText='';recordPages=Object.fromEntries(RECORD_KINDS.map(k=>[k,0]));await refresh();});return;
   }
   if(action==='record-page'){
    const kind=button.dataset.kind,offset=Number(button.dataset.offset);
    if(!RECORD_KINDS.includes(kind)||!Number.isSafeInteger(offset)||offset<0)return;
    guarded(async()=>{recordPages[kind]=offset;const target=kind;openSections.add(target);await refresh();root.querySelector('#admin-'+target)?.scrollIntoView?.({block:'start'});});return;
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
   
   if(action==='refresh'){
    pendingAccountDelete=null;
    root.querySelector('#admin-account-delete-modal')?.remove?.();
     // Never retrieve plaintext from an overview endpoint.
    guarded(()=>refresh());return;
   }
   if(action==='enable-admin-notifications'){
     guarded(async()=>{
      if(typeof globalThis.Notification?.requestPermission!=='function')throw new Error('Browser notifications unavailable; in-app attention remains available.');
      const permission=await globalThis.Notification.requestPermission();
      actionMessage(permission==='granted'?'Browser alerts enabled while Admin is open.':'Browser alerts not enabled; in-app alerts remain available.');
     });return;
    }
    if(action==='signup-page'){
     const offset=Number(button.dataset.offset);
     if(!Number.isSafeInteger(offset)||offset<0)return;
     guarded(async()=>{signupOffset=offset;await refresh();root.querySelector('#admin-new-members')?.scrollIntoView?.({block:'start'});});return;
    }
    const id=button.dataset.id||'';
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id))return;
   if(action==='admin-delete-record'){
    guarded(async()=>{
     const kind=button.dataset.kind;
     const revision=Number(button.dataset.revision);
     if(!['shot','approved','submission'].includes(kind)||!Number.isSafeInteger(revision)||revision<1)
      throw new Error('Refresh the record before requesting deletion.');
     const impact=await adminRpc('dic_admin_delete_preview',{p_kind:kind,p_record_id:id});
     if(impact.revision!==revision)throw new Error('This record has changed. Refresh before deleting.');
     const count=key=>Number(impact[key]||0);
     const related='Associated records: '+count('library_entries')+' library entries, '+count('shots')+' shots, '+count('shot_notes')+' notes, '+count('linked_submissions')+' submissions, '+count('community_shots')+' Community contributions, '+count('source_records')+' source records.';
     if(impact.blocked)throw new Error('Deletion blocked to preserve Community contributions or other canonical references. '+related+' This record was not changed.');
     const warning='Delete this '+(kind==='shot'?'shot':kind==='approved'?'approved coffee':'pending submission')+'?\n\n'+related+'\n\nDeleting a coffee or submission also deletes its associated shots and notes. Community contributions linked to an individual deleted shot remain available anonymously; the private source link is detached. This cannot be undone without a verified backup.\n\nConfirm deletion?';
     if(!globalThis.confirm?.(warning))return;
     const result=await adminRpc('dic_admin_delete_record',{p_kind:kind,p_record_id:id,p_expected_revision:revision,p_expected_impact:impact});
     if(result?.ok!==true)throw new Error('Deletion did not complete. Review the record before retrying.');
     delete mergeChoices[id];delete comparisons[id];await refresh();
     actionMessage('Record deleted after server-verified impact confirmation.');
    });return;
   }
   if(action==='admin-load-comparison'){
    guarded(async()=>{
     const item=['pending','conflicts'].flatMap(k=>records[k]?.items||[]).find(row=>row.id===id);
     if(!item)throw new Error('Expand Pending Coffees or Conflicts before comparing.');
     const query=String(item.name||'').trim().slice(0,80);
     if(!query)throw new Error('Coffee name required for comparison.');
     const result=await adminRpc('dic_admin_review_candidates',{p_submission_id:id});
     comparisons[id]=Array.isArray(result?.candidates)?result.candidates:[];
     await refresh();
    });return;
   }
   if(action==='review-merge-prepare'){
    guarded(async()=>{
     const result=await adminRpc('dic_admin_coffee_candidates',{p_submission_id:id});
     const candidates=Array.isArray(result?.candidates)?result.candidates:[];
     if(!candidates.length)throw new Error('No compatible approved coffee found. Approve as distinct only after checking this is not a duplicate.');
     mergeChoices[id]=candidates;await refresh();
    });return;
   }
   if(['review-approve','review-merge'].includes(action)){
    const revision=Number(button.dataset.revision);
    if(!Number.isSafeInteger(revision)||revision<1)return;
    const decision=action==='review-approve'?'approve':'merge';
    const selected=decision==='merge'?root.querySelector('#admin-merge-'+id)?.value:null;
    if(decision==='merge'&&!mergeChoices[id]?.some(c=>c.id===selected))return;
    // Each deliberate resolution is one click. The server still checks role,
    // current revision and canonical identity, and writes private audit provenance.
    const reason='';
    guarded(async()=>{
     const result=await adminRpc('dic_admin_review_coffee',{
      p_submission_id:id,p_expected_revision:revision,p_action:decision,
      p_reason:reason,p_canonical_id:selected||null
     });
     if(!result?.ok)throw new Error('The review did not complete. Refresh before retrying.');
     delete mergeChoices[id];await refresh();
     actionMessage('Coffee reviewed successfully.');
    });return;
   }
   if(action==='retry-account-delete'){
     if(!globalThis.confirm?.('Retry the previous authorized account deletion? This may complete its existing Keep/Remove Community choice.'))return;
     guarded(async()=>{
      const {data,error}=await sdk.functions.invoke('dic-delete-member-account',{
       body:{operation_id:id}
      });
      if(invalidated)return;
      if(error||!data?.ok||!data?.completed)
       throw new Error('Deletion remains incomplete. Review the issue and retry this operation.');
      await refresh();
      actionMessage('Previous account deletion has completed.');
     });return;
   }
   if(action==='delete-account'){
     guarded(async()=>{
      const impact=await adminRpc('dic_admin_account_delete_preview',{p_member_id:id});
      if(impact?.member_id!==id)throw new Error('Account identity changed. Refresh before deleting.');
      pendingAccountDelete={id,impact};
      root.querySelector('#admin-account-delete-modal')?.remove?.();
      root.insertAdjacentHTML('beforeend',renderAdminDeleteAccountPrompt(impact));
      root.querySelector('#admin-account-delete-modal .admin-delete-dialog')?.focus?.();
     });return;
   }
   if(action==='cancel-delete-account'){
     pendingAccountDelete=null;
     root.querySelector('#admin-account-delete-modal')?.remove?.();
     return;
   }
   if(action==='confirm-delete-account'){
     guarded(async()=>{
      const pending=pendingAccountDelete,mode=button.dataset.mode;
      if(!pending||pending.id!==id||!['keep','remove'].includes(mode))
       throw new Error('Review the member impact before deleting.');
      const email=pending.impact.email||'this member';
      const count=Number(pending.impact.community_shots||0);
      const message='Permanently delete '+email+' and all private history?\n\n'
        +(mode==='keep'?'KEEP '+count+' anonymous Community contributions.':
          'REMOVE '+count+' Community contributions and their recommendation evidence.')
        +'\n\nThis cannot be undone from Admin. Confirm permanent deletion?';
      if(!globalThis.confirm?.(message))return;
      const requested=await adminRpc('dic_admin_account_delete_request',{
       p_member_id:id,p_community_mode:mode,p_expected_impact:pending.impact
      });
      if(!requested?.operation_id)throw new Error('Account deletion request was not recorded.');
      // The browser never receives a service key; the Edge function checks admin again.
      const {data,error}=await sdk.functions.invoke('dic-delete-member-account',{
       body:{operation_id:requested.operation_id}
      });
      if(invalidated)return;
      if(error||!data?.ok||!data?.completed)
       throw new Error('Deletion is incomplete. The account may be disabled; retry the SAME Community choice. Completion was not claimed.');
      pendingAccountDelete=null;
      root.querySelector('#admin-account-delete-modal')?.remove?.();
      await refresh();
      actionMessage('Account deleted. Community '+(mode==='keep'?'contributions retained.':'contributions removed.'));
     });return;
   }
   if(action==='approve-signup'||action==='reject-signup'){
     const decision=action==='approve-signup'?'approve':'reject';
     const row=signupRequests?.items?.find(item=>item.id===id);
     if(!row||row.review_state!=='pending'){actionMessage('Refresh this account request before reviewing.');return;}
     if(decision==='approve'&&!row.email_verified){actionMessage('The account must verify email first.');return;}
     if(!globalThis.confirm?.((decision==='approve'?'Approve ':'Reject ')+row.email+'? This controls app access without deleting the Auth account.'))return;
     guarded(async()=>{
      const result=await adminRpc('dic_admin_review_signup',{p_member_id:id,p_action:decision,p_expected_state:'pending'});
      if(!result?.ok)throw new Error(result?.code==='stale_review'?'The request changed; refresh.':'Review rejected; refresh and retry.');
      await refresh();actionMessage(decision==='approve'?'Account approved.':'Account rejected. Its Auth account remains intact.');
     });return;
    }
    if(action==='remove-member'||action==='restore-member'){
    const enabled=action==='restore-member';
    if(!globalThis.confirm?.(enabled?'Restore access for this member?':'Remove this member’s access? Their shots and notes will remain saved.'))return;
    guarded(async()=>{
     
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
