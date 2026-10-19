// Pure, safely escaped administrator view. The database returns only
// explicitly whitelisted coffee metadata, never owner IDs or private notes.
import {e} from '../lib/ui.js';

export const formatCount=value=>value!=null&&value!==''&&Number.isSafeInteger(Number(value))&&Number(value)>=0?String(Number(value)):'—';
export function renderAdminDenied(message='Administrator access required.'){
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective</span><a href="/">Back To App</a></header>
 <section class="admin-panel admin-empty"><h1>Admin Access Unavailable</h1><p>${e(message)}</p><p class="helper">Access is controlled by your account's server-side administrator role.</p></section>`;
}
export function renderAdminDashboard(data={},access=null,issued=null){
 const stats=data?.counts||{};
 const queue=Array.isArray(data?.queue)?data.queue:[];
 const total=Number(data?.queue_total)||0;
 const stat=(label,value)=>`<div class="admin-stat"><span>${e(label)}</span><strong>${formatCount(value)}</strong></div>`;
 const preview=item=>`<article class="admin-queue-item">
  <div class="admin-queue-title"><div><span class="admin-state">${e(item.status==='conflict'?'Conflict':'Pending')}</span>
   <h3>${e(item.name||'Unnamed coffee')}</h3><p class="helper">${e(item.roaster||'Roaster not supplied')}</p></div>
   <span class="admin-date">${e(String(item.created_at||'').slice(0,10))}</span></div>
  <div class="admin-facts">${[
   ['Release',item.release_label],['Origin',item.origin],['Process',item.process],['Roast',item.roast_level]
  ].filter(([,v])=>v).map(([k,v])=>`<span><b>${e(k)}:</b> ${e(v)}</span>`).join('')}</div>
  ${item.source_url?`<p class="admin-source">Evidence URL (review manually): <span>${e(item.source_url)}</span></p>`:''}
  <p class="admin-subtle">Review-only preview · No decision has been applied</p>
 </article>`;
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective <small>Admin</small></span><div class="admin-nav"><button id="admin-refresh" type="button" class="ghost compact">Refresh</button><a href="/">Back To App</a></div></header>
 <section class="admin-intro"><span class="admin-eyebrow">Private Operator Dashboard</span><h1>Review Queue</h1>
 <p>Only genuine coffee identity and source conflicts require attention. This first milestone is read-only.</p></section>
 <section class="admin-stats" aria-label="Application status">
 ${stat('Pending Coffees',stats.pending_coffees)}${stat('Conflicts',stats.conflicts)}
 ${stat('Verified Coffees',stats.verified_coffees)}${stat('Admitted Accounts',stats.active_accounts)}
 ${stat('Logged Shots',stats.shot_records)}
 </section>
 ${access?renderAdminAccessPanel(access,issued):''}
 <section class="admin-panel"><div class="admin-section-header"><div><h2>Pending Coffee Verification</h2>
 <p class="helper">${formatCount(total)} outstanding · oldest first</p></div></div>
 ${queue.length?queue.map(preview).join(''):'<p class="admin-empty helper">No coffee submissions need review.</p>'}
 ${total>queue.length?'<p class="helper">Showing the first 50. Further queue navigation will be added before the beta.</p>':''}
 </section>
 <section class="admin-panel admin-health"><h2>Infrastructure</h2><p>Database status and access are checked on refresh. Verified backup freshness is managed separately in GitHub and private Google Drive; it is not reported as healthy without evidence.</p><p class="helper">Coffee approvals, merges and abuse-review actions are not yet enabled. Invitation management is administrator-only.</p></section>`;
}

/** Strictly administrator-only UI projection. The list never contains a
 * plaintext token: freshly generated secrets appear once per browser tab. */
export function renderAdminAccessPanel(access={},issued=null){
 const invites=Array.isArray(access?.invites)?access.invites:[];
 const members=Array.isArray(access?.members)?access.members:[];
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
  <h2 id="admin-members-heading">Member Access <span class="helper">${formatCount(access.members_total)}</span></h2>
  <p class="helper">No automatic account expiration. Remove or restore access without deleting saved shots and notes. Administrator accounts cannot be removed here.</p>
  <ul class="admin-member-list">${memberRows||'<li class="helper">No admitted members yet.</li>'}</ul>
  ${Number(access.members_total)>members.length?'<p class="helper">Showing the 50 most recently admitted members.</p>':''}
 </section>`;
}
