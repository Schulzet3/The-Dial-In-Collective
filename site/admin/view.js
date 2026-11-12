// Pure escaped administrator view. Legacy review overview is sanitized;
// separate live-admin-only records RPC can include creator identity and notes.
import {e} from '../lib/ui.js';
import {adminDisclosure,renderAdminRecordCollection} from './records.js';

export const formatCount=value=>value!=null&&value!==''&&Number.isSafeInteger(Number(value))&&Number(value)>=0?String(Number(value)):'—';
export function renderAdminDenied(message='Administrator access required.'){
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective</span><a href="/">Back To App</a></header>
 <section class="admin-panel admin-empty"><h1>Admin Access Unavailable</h1><p>${e(message)}</p><p class="helper">Access is controlled by your account's server-side administrator role.</p></section>`;
}

export function renderAdminAttention(stats={},pushStatus='unknown'){
 const count=key=>Number.isSafeInteger(Number(stats[key]))&&Number(stats[key])>=0?Number(stats[key]):0;
 const a=count('pending_verified_accounts'),b=count('pending_coffees'),c=count('conflicts'),d=count('unfinished_account_deletions');
 return '<section class="admin-panel admin-attention" aria-labelledby="admin-attention-heading">'
  +'<div class="admin-attention-header"><h2 id="admin-attention-heading">Requires Your Attention</h2><span class="admin-attention-count" role="status" aria-live="polite" aria-label="Items requiring attention">'+formatCount(a+b+c+d)+'</span></div>'
  +'<p class="helper">Ready account approvals '+formatCount(a)+' · Coffee reviews '+formatCount(b)+' · Conflicts '+formatCount(c)+' · Unfinished deletions '+formatCount(d)+'</p>'
  +'<div class="admin-member-actions">'+(pushStatus==='enabled'?'<button type="button" class="ghost compact" data-action="disable-admin-push">Disable Push Alerts</button>':pushStatus==='disabled'?'<button type="button" class="ghost compact" data-action="enable-admin-push">Enable Push Alerts</button>':'<span class="helper" role="status">Push status unavailable. Refresh to retry.</span>')+'</div><p class="helper">On iPhone, open the Home Screen app and allow notifications once. Alerts can arrive when Admin is closed.</p></section>';
}
export function renderPendingSignups(page={},fallback=null){
 const loaded=Array.isArray(page?.items)&&!page.error,items=loaded?page.items:[],total=loaded?page.total:fallback;
 const rows=items.map(item=>'<li class="admin-member-row"><div class="admin-member-main"><strong>'+e(String(item.email||'Email unavailable'))+'</strong><p class="helper">'+e(item.email_verified?'Email verified':'Awaiting email verification')+' · Registered '+e(String(item.created_at||'').slice(0,16))+'</p></div><div class="admin-member-actions">'
  +'<button type="button" class="ghost compact" data-action="approve-signup" data-id="'+e(String(item.id||''))+'" '+(item.email_verified?'':'disabled title="Email verification required"')+'>Approve</button>'
  +'<button type="button" class="ghost compact admin-delete-action" data-action="reject-signup" data-id="'+e(String(item.id||''))+'">Reject</button></div></li>').join('');
 const offset=Number(page?.offset)||0;
 const paging=loaded&&(offset>0||offset+items.length<page.total)?'<div class="admin-pagination"><button type="button" class="ghost compact" data-action="signup-page" data-offset="'+String(Math.max(0,offset-50))+'" '+(offset===0?'disabled':'')+'>Previous</button><button type="button" class="ghost compact" data-action="signup-page" data-offset="'+String(offset+50)+'" '+(offset+items.length>=page.total?'disabled':'')+'>Next</button></div>':'';
 return '<div class="admin-section-header"><h2>New Account Requests <span class="helper">'+formatCount(total)+'</span></h2><p class="helper">New accounts are locked until approved. Verify email before approval; rejection does not delete Auth accounts.</p></div>'
  +(loaded?'<ul class="admin-member-list">'+(rows||'<li class="helper">No pending account requests.</li>')+'</ul>'+paging:'<p class="helper" role="status">Signup requests could not be loaded. Retry; no empty state is assumed.</p>');
}

export function renderAdminDashboard(data={},access=null,_legacySlot=null,candidatesBySubmission={},records={},options={}){
 const stats=data?.counts||{};
 const searchText=String(options.searchText||'');
 const queue=Array.isArray(data?.queue)?data.queue:[];
 const count=(kind,fallback)=>{
  const page=records[kind];
  return Array.isArray(page?.items)&&!page.error&&Number.isSafeInteger(page.total)&&page.total>=0
   ?page.total:fallback;
 };
 const stat=(label,value,kind)=>`<a class="admin-stat" href="#admin-${e(kind)}"><span>${e(label)}</span><strong>${formatCount(value)}</strong><small>View all →</small></a>`;
 const reviewActions=item=>`<button type="button" class="ghost compact" data-action="admin-load-comparison" data-id="${e(String(item.id||''))}">Compare Possible Matches</button>
  <div class="admin-review-actions" aria-label="Review ${e(item.name||'coffee')}">
   <button type="button" data-action="review-approve" data-id="${e(String(item.id||''))}" data-revision="${e(String(item.revision??''))}">Approve Distinct Coffee</button>
   <button type="button" class="ghost compact" data-action="review-merge-prepare" data-id="${e(String(item.id||''))}">Resolve Duplicate</button>
  </div>
  ${Array.isArray(candidatesBySubmission[item.id])?`<div class="admin-candidates"><label>Approved coffee to reuse <select id="admin-merge-${e(String(item.id||''))}">${candidatesBySubmission[item.id].map(c=>`<option value="${e(String(c.id||''))}">${e(c.roaster||'')} · ${e(c.name||'')} ${e(c.release_label||'')}</option>`).join('')}</select></label><button type="button" data-action="review-merge" data-id="${e(String(item.id||''))}" data-revision="${e(String(item.revision??''))}">Confirm Duplicate Merge</button></div>`:''}
  <p class="admin-subtle">Approve a distinct coffee with one click. Potential duplicate conflicts require review; every decision is recorded.</p>

 `;
 const renderMatch=item=>{
  const matches=options.comparisons?.[item.id];
  const target=Array.isArray(matches)?matches[0]:null;
  const fields=[['name','Coffee Name'],['roaster','Roaster'],['origin','Origin'],['process','Process'],['release_label','Release / Harvest'],['producer','Producer'],['variety','Variety'],['roast_level','Roast Level'],['elevation_m','Elevation'],['tasting_notes','Tasting Notes'],['summary','Summary'],['espressoNotes','Espresso Notes'],['source_url','Source URL']];
  const val=(record,key)=>String(record?.[key]??'').trim();
  const norm=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const different=key=>!!target&&!!val(item,key)&&!!val(target,key)&&norm(val(item,key))!==norm(val(target,key));
  const facts=record=>'<dl class="admin-compare-facts">'+fields.map(([key,label])=>'<div class="admin-compare-row'+(different(key)?' is-conflict':'')+'"><dt>'+e(label)+'</dt><dd>'+e(val(record,key)||'—')+'</dd></div>').join('')+'</dl>';
  const discrepancies=target?fields.filter(([key])=>different(key)):[];
  return '<div class="admin-review-comparison"><section class="admin-compare-panel"><h4>Submitted Coffee (Pending)</h4>'+facts(item)+'</section><section class="admin-compare-panel"><h4>Possible Existing Match</h4>'+(target?'<p class="helper">'+e(target.name)+' · '+e(target.roaster)+' · Approved</p>'+facts(target):'<p class="helper">'+(matches?'No possible match found by the approved-coffee identity check.':'Load comparison to inspect existing coffees.')+'</p>')+'<div class="admin-compare-why"><strong>Why this needs review</strong><p>Potential identity overlap requires an administrator decision. Blank fields are not treated as contradictions.</p>'+discrepancies.map(([key,label])=>'<p class="admin-compare-conflict"><strong>'+e(label)+':</strong> Submitted '+e(val(item,key))+'; existing '+e(val(target,key))+'.</p>').join('')+'</div></section></div>';
 };
 const preview=item=>`<article class="admin-queue-item">
  <div class="admin-queue-title"><div><span class="admin-state">${e(item.status==='conflict'?'Conflict':'Pending')}</span>
   <h3>${e(item.name||'Unnamed coffee')}</h3><p class="helper">${e(item.roaster||'Roaster not supplied')}</p></div>
   <span class="admin-date">${e(String(item.created_at||'').slice(0,10))}</span></div>
  ${renderMatch(item)}
  
  ${reviewActions(item)}
  ${/^[a-f0-9-]{36}$/i.test(String(item.id||''))&&Number.isSafeInteger(Number(item.revision))&&Number(item.revision)>0?`<button type="button" class="ghost compact admin-delete-action" data-action="admin-delete-record" data-kind="submission" data-id="${e(String(item.id))}" data-revision="${e(String(item.revision))}">Delete Submission</button>`:''}
 </article>`;
 const reviewSection=(kind,empty)=>{
  const page=records[kind],complete=Array.isArray(page?.items)&&!page.error;
  // Page-2 and later records must retain the independent existing review RPCs.
  if(options.openSections?.has(kind)&&!page)return '<p class="helper" role="status">Loading records…</p>';
   if(searchText&&page?.error)return renderAdminRecordCollection(kind,page,{embedded:true,reviewActions,reviewComparison:renderMatch});
  if(complete)return renderAdminRecordCollection(kind,page,{embedded:true,reviewActions,reviewComparison:renderMatch});
  const rows=queue.filter(item=>(item.status==='conflict')===(kind==='conflicts'));
  const fallback=rows.length?rows.map(preview).join(''):page?.error?'':'<p class="admin-empty helper">'+e(empty)+'</p>';
  return fallback+(page?.error?renderAdminRecordCollection(kind,page,{embedded:true}):'');
 };
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective <small>Admin</small></span><div class="admin-nav"><button id="admin-refresh" type="button" class="ghost compact">Refresh</button><a href="/">Back To App</a></div></header>
 <section class="admin-intro"><span class="admin-eyebrow">Private Operator Dashboard</span><h1>Review Queue</h1>
 <p>Unique coffees are approved automatically. Only unresolved identity or possible duplicate conflicts require review.</p></section>
 <p id="admin-action-notice" class="helper" role="status" aria-live="polite" aria-atomic="true"></p>
 ${renderAdminAttention(stats,options.pushStatus)}
 <form id="admin-search-form" class="admin-search-form" role="search" autocomplete="off">
   <label for="admin-search-query">Search records</label>
   <input id="admin-search-query" name="query" maxlength="80" value="${e(searchText)}" placeholder="Coffee, roaster, member email, shot notes…" aria-label="Search all Admin records">
   <button type="submit" class="ghost compact">Search</button>
   ${searchText?'<button type="button" class="ghost compact" data-action="admin-search-clear">Clear</button>':''}
   <p class="helper">Searches complete server-side listings, not just the current page. Open a section to view its matching records.</p>
  </form>
  <section class="admin-stats" aria-label="Application status">
 ${stat('Pending Coffees',count('pending',stats.pending_coffees),'pending')}${stat('Conflicts',count('conflicts',stats.conflicts),'conflicts')}
 ${stat('Approved Coffees',count('approved',stats.verified_coffees),'approved')}${stat('Logged Shots',count('shots',stats.shot_records),'shots')}
 ${stat('New Accounts',stats.pending_accounts,'new-members')}${stat('Admitted Accounts',count('accounts',stats.active_accounts),'accounts')}
 </section>
 <section class="admin-panel admin-record-section" id="admin-pending" tabindex="-1">
 ${adminDisclosure('Pending Coffee Review','pending',count('pending',stats.pending_coffees),reviewSection('pending','No pending coffee submissions.'),{expanded:options.openSections?.has('pending')})}
 </section>
 <section class="admin-panel admin-record-section" id="admin-conflicts" tabindex="-1">
 ${adminDisclosure('Conflicts','conflicts',count('conflicts',stats.conflicts),reviewSection('conflicts','No coffee conflicts.'),{expanded:options.openSections?.has('conflicts')})}
 </section>
 ${renderAdminRecordCollection('approved',records.approved||(options.openSections?.has('approved')?{loading:true}:{total:stats.verified_coffees}),{expanded:options.openSections?.has('approved')})}
 ${renderAdminRecordCollection('shots',records.shots||(options.openSections?.has('shots')?{loading:true}:{total:stats.shot_records}),{expanded:options.openSections?.has('shots'),openCoffeeGroups:options.openCoffeeGroups})}
 <section class="admin-panel admin-record-section" id="admin-new-members" tabindex="-1">${renderPendingSignups(options.signupRequests,stats.pending_accounts)}</section>
 <section class="admin-panel admin-record-section" id="admin-accounts" tabindex="-1">${adminDisclosure('Accounts','accounts',count('accounts',stats.active_accounts),access?renderAdminAccessPanel(access,records.accounts):'<p class="helper" role="status">'+(options.openSections?.has('accounts')?'Loading account records…':'Open to load account records.')+'</p>',{expanded:options.openSections?.has('accounts')})}</section>
 <section class="admin-panel admin-health" id="admin-infrastructure" tabindex="-1">${adminDisclosure('Infrastructure','infrastructure',null,'<p>Database status and access are checked on refresh. Verified backup freshness is managed separately in GitHub and private Google Drive; it is not reported as healthy without evidence.</p><p class="helper">Manual coffee review is administrator-only. A manually approved coffee is not mislabeled as independently source-verified. Account approval is administrator-only.</p>',{expanded:options.openSections?.has('infrastructure')})}</section>`;
}

/** Strictly administrator-only member access projection. */
export function renderAdminAccessPanel(access={},accountPage=null){
 const hasAccountPage=Array.isArray(accountPage?.items)&&!accountPage?.error;
 const members=hasAccountPage?accountPage.items:Array.isArray(access?.members)?access.members:[];
 const offset=hasAccountPage&&Number.isSafeInteger(accountPage.offset)&&accountPage.offset>=0?accountPage.offset:0;
 const totalValue=hasAccountPage?accountPage.total:access.members_total;
 const total=Number.isSafeInteger(Number(totalValue))&&Number(totalValue)>=0?Number(totalValue):0;
 const accountRange=members.length?'Showing '+String(offset+1)+'–'+String(offset+members.length)+' of '+String(total):
  'No accounts on this page · '+String(total)+' total';
 // An overview fallback is the first page only. Never offer Next when the
 // paged endpoint failed, because it would repeat those same account rows.
 const fallbackNotice=!hasAccountPage&&(accountPage?.error||total>members.length)
  ?'<p class="helper" role="status">Complete account listing is temporarily unavailable. Showing '+e(String(members.length))+' most recent accounts.</p>':'';
 const memberRows=members.map(row=>{
  const admin=row.admin===true,enabled=row.enabled===true;
  return `<li class="admin-member-row">
   <div class="admin-member-main"><strong>${e(String(row.email||'Account email unavailable'))}</strong>
    <p class="helper">${admin?'Administrator · Permanent access':enabled?'Active · No automatic expiration':'Access removed · Personal history retained'}</p></div>
   ${admin?'<span class="admin-protected">Protected</span>':`<div class="admin-member-actions"><button type="button" class="ghost compact" data-action="${enabled?'remove-member':'restore-member'}" data-id="${e(String(row.id||''))}">${enabled?'Remove Access':'Restore Access'}</button><button type="button" class="ghost compact admin-delete-action" data-action="delete-account" data-id="${e(String(row.id||''))}">Delete Account</button></div>`}
  </li>`;
 }).join('');
 const unfinished=Array.isArray(access?.pending_deletions)?access.pending_deletions:[];
 const unfinishedHtml=unfinished.length?`<h3>Unfinished account deletions</h3>
  <p class="helper">The Auth account may already be gone. Retry to finish the original Community choice without starting a new deletion.</p>
  <ul class="admin-member-list">${unfinished.map(op=>`<li class="admin-member-row">
   <div class="admin-member-main"><strong>${e(String(op.email||'Account no longer available'))}</strong>
   <p class="helper">Pending ${e(String(op.phase||'unknown'))} · ${op.community_mode==='remove'?'Remove Community':'Keep Community'}</p></div>
   <button type="button" class="ghost compact" data-action="retry-account-delete" data-id="${e(String(op.id||''))}">Retry Completion</button>
  </li>`).join('')}</ul>`:'';
 return `<section class="admin-panel admin-access" aria-labelledby="admin-members-heading">
  <h2 id="admin-members-heading">Member Access <span class="helper">${formatCount(totalValue)}</span></h2>
  <p class="helper">No automatic account expiration. Remove or restore access without deleting saved shots and notes. Administrator accounts cannot be removed here.</p>
  <ul class="admin-member-list">${memberRows||'<li class="helper">No admitted members yet.</li>'}</ul>
  ${fallbackNotice}
  ${unfinishedHtml}
  ${hasAccountPage&&(offset>0||offset+members.length<total)?`<div class="admin-pagination"><span class="helper">${e(accountRange)}</span><button type="button" class="ghost compact" data-action="record-page" data-kind="accounts" data-offset="${Math.max(0,offset-50)}" ${offset===0?'disabled':''}>Previous</button><button type="button" class="ghost compact" data-action="record-page" data-kind="accounts" data-offset="${offset+50}" ${offset+members.length>=total?'disabled':''}>Next</button></div>`:''}
 </section>`;
}

// The confirmation is operator-only: no client secret, account IDs or email ever enter Community.
export function renderAdminDeleteAccountPrompt(impact={}){
 const count=key=>Number.isSafeInteger(Number(impact[key]))&&Number(impact[key])>=0?Number(impact[key]):0;
 const email=e(String(impact.email||'Member account'));
 const id=e(String(impact.member_id||''));
 return `<div class="admin-delete-overlay" id="admin-account-delete-modal">
  <section class="admin-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-delete-title" aria-describedby="admin-delete-details" tabindex="-1">
   <h2 id="admin-delete-title">Permanently Delete Account?</h2>
   <p><strong>${email}</strong></p>
   <p id="admin-delete-details">Deleting this account removes its Auth credentials, ${count('shots')} private shots,
   ${count('notes')} private notes, ${count('library_entries')} saved coffee entries and related private data.
   ${count('community_shots')} Community contributions (${count('eligible_community_shots')} eligible) belong to this member.</p>
   <p>Choose what happens to these Community contributions. This cannot be undone from Admin. Historical encrypted backups follow the existing retention policy.</p>
   <div class="admin-delete-choices">
    <button type="button" class="ghost" data-action="confirm-delete-account" data-mode="keep" data-id="${id}">Delete Account · Keep Community</button>
    <button type="button" class="ghost admin-delete-action" data-action="confirm-delete-account" data-mode="remove" data-id="${id}">Delete Account + Community Contributions</button>
   </div>
   <button type="button" class="ghost" data-action="cancel-delete-account" data-id="${id}">Cancel</button>
  </section>
 </div>`;
}
