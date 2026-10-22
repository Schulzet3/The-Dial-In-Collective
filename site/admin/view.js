// Pure escaped administrator view. Legacy review overview is sanitized;
// separate live-admin-only records RPC can include creator identity and notes.
import {e} from '../lib/ui.js';
import {renderAdminRecordCollection} from './records.js';

export const formatCount=value=>value!=null&&value!==''&&Number.isSafeInteger(Number(value))&&Number(value)>=0?String(Number(value)):'—';
export function renderAdminDenied(message='Administrator access required.'){
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective</span><a href="/">Back To App</a></header>
 <section class="admin-panel admin-empty"><h1>Admin Access Unavailable</h1><p>${e(message)}</p><p class="helper">Access is controlled by your account's server-side administrator role.</p></section>`;
}
export function renderAdminDashboard(data={},access=null,issued=null,candidatesBySubmission={},records={}){
 const stats=data?.counts||{};
 const queue=Array.isArray(data?.queue)?data.queue:[];
 const count=(kind,fallback)=>{
  const page=records[kind];
  return Array.isArray(page?.items)&&!page.error&&Number.isSafeInteger(page.total)&&page.total>=0
   ?page.total:fallback;
 };
 const stat=(label,value,kind)=>`<a class="admin-stat" href="#admin-${e(kind)}"><span>${e(label)}</span><strong>${formatCount(value)}</strong><small>View all →</small></a>`;
 const reviewActions=item=>`  <div class="admin-review-actions" aria-label="Review ${e(item.name||'coffee')}">
   <button type="button" data-action="review-approve" data-id="${e(String(item.id||''))}" data-revision="${e(String(item.revision??''))}">Approve Distinct Coffee</button>
   <button type="button" class="ghost compact" data-action="review-merge-prepare" data-id="${e(String(item.id||''))}">Resolve Duplicate</button>
   <button type="button" class="ghost compact" data-action="review-hold" data-id="${e(String(item.id||''))}" data-revision="${e(String(item.revision??''))}">Hold for Clarification</button>
  </div>
  ${Array.isArray(candidatesBySubmission[item.id])?`<div class="admin-candidates"><label>Approved coffee to reuse <select id="admin-merge-${e(String(item.id||''))}">${candidatesBySubmission[item.id].map(c=>`<option value="${e(String(c.id||''))}">${e(c.roaster||'')} · ${e(c.name||'')} ${e(c.release_label||'')}</option>`).join('')}</select></label><button type="button" data-action="review-merge" data-id="${e(String(item.id||''))}" data-revision="${e(String(item.revision??''))}">Confirm Duplicate Merge</button></div>`:''}
  <p class="admin-subtle">Manual review requires a reason and server verification. Your decision is recorded.</p>

 `;
 const preview=item=>`<article class="admin-queue-item">
  <div class="admin-queue-title"><div><span class="admin-state">${e(item.status==='conflict'?'Conflict':'Pending')}</span>
   <h3>${e(item.name||'Unnamed coffee')}</h3><p class="helper">${e(item.roaster||'Roaster not supplied')}</p></div>
   <span class="admin-date">${e(String(item.created_at||'').slice(0,10))}</span></div>
  <div class="admin-facts">${[
   ['Release',item.release_label],['Origin',item.origin],['Process',item.process],['Roast',item.roast_level]
  ].filter(([,v])=>v).map(([k,v])=>`<span><b>${e(k)}:</b> ${e(v)}</span>`).join('')}</div>
  ${item.source_url?`<p class="admin-source">Evidence URL (review manually): <span>${e(item.source_url)}</span></p>`:''}
  ${reviewActions(item)}
 </article>`;
 const reviewSection=(kind,empty)=>{
  const page=records[kind],complete=Array.isArray(page?.items)&&!page.error;
  // Page-2 and later records must retain the independent existing review RPCs.
  if(complete)return renderAdminRecordCollection(kind,page,{embedded:true,reviewActions});
  const rows=queue.filter(item=>(item.status==='conflict')===(kind==='conflicts'));
  const fallback=rows.length?rows.map(preview).join(''):page?.error?'':'<p class="admin-empty helper">'+e(empty)+'</p>';
  return fallback+(page?.error?renderAdminRecordCollection(kind,page,{embedded:true}):'');
 };
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective <small>Admin</small></span><div class="admin-nav"><button id="admin-refresh" type="button" class="ghost compact">Refresh</button><a href="/">Back To App</a></div></header>
 <section class="admin-intro"><span class="admin-eyebrow">Private Operator Dashboard</span><h1>Review Queue</h1>
 <p>Unique coffees are approved automatically. Only unresolved identity or possible duplicate conflicts require review.</p></section>
 <section class="admin-stats" aria-label="Application status">
 ${stat('Pending Coffees',count('pending',stats.pending_coffees),'pending')}${stat('Conflicts',count('conflicts',stats.conflicts),'conflicts')}
 ${stat('Approved Coffees',count('approved',stats.verified_coffees),'approved')}${stat('Logged Shots',count('shots',stats.shot_records),'shots')}
 ${stat('Admitted Accounts',count('accounts',stats.active_accounts),'accounts')}
 </section>
 <section class="admin-panel admin-record-section" id="admin-pending" tabindex="-1"><h2>Pending Coffee Review</h2>
 ${reviewSection('pending','No pending coffee submissions.')}
 </section>
 <section class="admin-panel admin-record-section" id="admin-conflicts" tabindex="-1"><h2>Conflicts</h2>
 ${reviewSection('conflicts','No coffee conflicts.')}
 </section>
 ${renderAdminRecordCollection('approved',records.approved)}
 ${renderAdminRecordCollection('shots',records.shots)}
 <section id="admin-accounts" tabindex="-1"><h2 class="admin-accounts-title">Accounts</h2>${access?renderAdminAccessPanel(access,issued,records.accounts):'<p class="helper">Account list unavailable.</p>'}</section>
 <section class="admin-panel admin-health"><h2>Infrastructure</h2><p>Database status and access are checked on refresh. Verified backup freshness is managed separately in GitHub and private Google Drive; it is not reported as healthy without evidence.</p><p class="helper">Manual coffee review is administrator-only. A manually approved coffee is not mislabeled as independently source-verified. Invitation management is administrator-only.</p></section>`;
}

/** Strictly administrator-only UI projection. The list never contains a
 * plaintext token: freshly generated secrets appear once per browser tab. */
export function renderAdminAccessPanel(access={},issued=null,accountPage=null){
 const invites=Array.isArray(access?.invites)?access.invites:[];
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
 const inviteRows=invites.map(row=>{
  const state=['active','revoked','used','expired'].includes(row.status)?row.status:'unknown';
  const count=formatCount(row.uses)+' / '+(row.max_uses==null?'Unlimited':formatCount(row.max_uses));
  const expires=row.expires_at?'Expires '+String(row.expires_at).slice(0,10):'Never expires';
  return `<li class="admin-invite-row">
   <div class="admin-invite-main"><strong>${e(row.label||'Beta Invitation')}</strong>
    <span class="admin-state">${e(state)}</span>
    <p class="helper">${e(count)} uses · ${e(expires)} · Created ${e(String(row.created_at||'').slice(0,10))}</p></div>
   ${state==='active'?`<button type="button" class="ghost compact" data-action="revoke-invite" data-id="${e(String(row.id||''))}">Revoke Code</button>`:''}
  </li>`;
 }).join('');
 const memberRows=members.map(row=>{
  const admin=row.admin===true,enabled=row.enabled===true;
  return `<li class="admin-member-row">
   <div class="admin-member-main"><strong>${e(String(row.email||'Account email unavailable'))}</strong>
    <p class="helper">${admin?'Administrator · Permanent access':enabled?'Active · No automatic expiration':'Access removed · Personal history retained'}</p></div>
   ${admin?'<span class="admin-protected">Protected</span>':`<button type="button" class="ghost compact" data-action="${enabled?'remove-member':'restore-member'}" data-id="${e(String(row.id||''))}">${enabled?'Remove Access':'Restore Access'}</button>`}
  </li>`;
 }).join('');
 const secret=issued?.invite_code?`<div class="admin-new-code" role="status" aria-live="polite">
   <strong>New Invitation Code</strong><p class="helper">Copy it now. The code cannot be recovered after you leave or refresh this page.</p>
   <code id="admin-new-code">${e(issued.invite_code)}</code>
   <button type="button" class="ghost compact" data-action="copy-invite">Copy Code</button>
  </div>`:'';
 return `<section class="admin-panel admin-access" aria-labelledby="admin-access-heading">
  <div class="admin-section-header"><h2 id="admin-access-heading">Beta Invitations</h2>
  <p class="helper">Create and revoke private invitations. Codes never expire automatically; already admitted accounts stay permanent.</p></div>
  <form id="admin-invite-form" class="admin-invite-form" autocomplete="off">
   <label for="admin-invite-label">Label (optional)<input id="admin-invite-label" name="label" maxlength="80" placeholder="e.g., Testing friends"></label>
   <p class="admin-invite-rule helper">One code admits one verified account, once. No automatic expiry.</p>
   <button type="submit">Generate Code</button>
  </form>
  <p class="admin-invite-footnote helper">Unused codes never expire by date and can be revoked at any time. After one account uses a code, it cannot be used again. Already admitted accounts stay active until you remove their access.</p>
  ${secret}
  <p id="admin-action-notice" class="admin-action-notice" role="alert" aria-live="assertive"></p>
  <h3>Existing Codes <span class="helper">${formatCount(access.invites_total)}</span></h3>
  <ul class="admin-invite-list">${inviteRows||'<li class="helper">No codes created yet.</li>'}</ul>
  ${Number(access.invites_total)>invites.length?'<p class="helper">Showing the 50 most recent codes.</p>':''}
 </section>
 <section class="admin-panel admin-access" aria-labelledby="admin-members-heading">
  <h2 id="admin-members-heading">Member Access <span class="helper">${formatCount(totalValue)}</span></h2>
  <p class="helper">No automatic account expiration. Remove or restore access without deleting saved shots and notes. Administrator accounts cannot be removed here.</p>
  <ul class="admin-member-list">${memberRows||'<li class="helper">No admitted members yet.</li>'}</ul>
  ${fallbackNotice}
  ${hasAccountPage&&(offset>0||offset+members.length<total)?`<div class="admin-pagination"><span class="helper">${e(accountRange)}</span><button type="button" class="ghost compact" data-action="record-page" data-kind="accounts" data-offset="${Math.max(0,offset-50)}" ${offset===0?'disabled':''}>Previous</button><button type="button" class="ghost compact" data-action="record-page" data-kind="accounts" data-offset="${offset+50}" ${offset+members.length>=total?'disabled':''}>Next</button></div>`:''}
 </section>`;
}
