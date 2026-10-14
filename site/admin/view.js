// Pure, safely escaped administrator view. The database returns only
// explicitly whitelisted coffee metadata, never owner IDs or private notes.
import {e} from '../lib/ui.js';

export const formatCount=value=>value!=null&&value!==''&&Number.isSafeInteger(Number(value))&&Number(value)>=0?String(Number(value)):'—';
export function renderAdminDenied(message='Administrator access required.'){
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective</span><a href="/">Back to app</a></header>
 <section class="admin-panel admin-empty"><h1>Admin access unavailable</h1><p>${e(message)}</p><p class="helper">Access is controlled by your account's server-side administrator role.</p></section>`;
}
export function renderAdminDashboard(data={}){
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
 return `<header class="admin-top"><span class="admin-brand">The Dial In Collective <small>Admin</small></span><div class="admin-nav"><button id="admin-refresh" type="button" class="ghost compact">Refresh</button><a href="/">Back to app</a></div></header>
 <section class="admin-intro"><span class="admin-eyebrow">Private operator dashboard</span><h1>Review queue</h1>
 <p>Only genuine coffee identity and source conflicts require attention. This first milestone is read-only.</p></section>
 <section class="admin-stats" aria-label="Application status">
 ${stat('Pending coffees',stats.pending_coffees)}${stat('Conflicts',stats.conflicts)}
 ${stat('Verified coffees',stats.verified_coffees)}${stat('Admitted accounts',stats.active_accounts)}
 ${stat('Logged shots',stats.shot_records)}
 </section>
 <section class="admin-panel"><div class="admin-section-header"><div><h2>Pending coffee verification</h2>
 <p class="helper">${formatCount(total)} outstanding · oldest first</p></div></div>
 ${queue.length?queue.map(preview).join(''):'<p class="admin-empty helper">No coffee submissions need review.</p>'}
 ${total>queue.length?'<p class="helper">Showing the first 50. Further queue navigation will be added before the beta.</p>':''}
 </section>
 <section class="admin-panel admin-health"><h2>Infrastructure</h2><p>Database status and access are checked on refresh. Verified backup freshness is managed separately in GitHub and private Google Drive; it is not reported as healthy without evidence.</p><p class="helper">Approval, merge, invitation rotation and abuse-review actions are not yet enabled.</p></section>`;
}
