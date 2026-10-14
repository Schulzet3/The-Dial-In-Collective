import {e,button,icon,shotSummary,styleBadge,humanDate,chips,radar} from '../lib/ui.js';

// Measurements and context stay above the taste details; historical readings
// remain distinct from model-derived recipe windows.
export const feedLabel=mode=>mode==='slow'?'Slow Feed':mode==='standard'?'Standard Feed':'Feed not recorded';

export function shotCard(shot,{expanded=false,activeVersionId=null,unit='F'}={}){
 const recordUnit=shot.snapshot?.tempUnit||unit;
 const context=[
  shot.snapshot?.setupName,
  shot.snapshot?.basketDoseG!=null?`${shot.snapshot.basketDoseG} g Basket Dose`:null,
  feedLabel(shot.feedMode)
 ].filter(Boolean);
 const canEdit=!shot.cloudPending;
 const canChoose=canEdit&&shot.dialedIn&&shot.setupVersionId===activeVersionId;
 return `<section class="shot">
  <button class="shot-toggle" data-action="shot-expand" data-id="${e(shot.id)}" aria-expanded="${expanded}">
   <div class="shot-overview">
    ${shotSummary(shot,recordUnit)}
    <div class="shot-context">${context.map(item=>`<span class="shot-context-item">${e(item)}</span>`).join('')}</div>
    <div class="shot-meta">${styleBadge(shot.style)}
     <span class="shot-date">${e(humanDate(shot.timestamp))}</span>
     ${shot.cloudPending?'<span class="preview-pill">Pending sync</span>':shot.dialedIn?'<span class="status-badge">Dialed In</span>':''}
    </div>
   </div>${icon('chevron',15)}
  </button>
  ${expanded?`<div class="shot-body">
   ${chips(shot.tasteScales)}${radar(shot.tasteScales)}
   ${shot.notes?`<p class="note">${e(shot.notes)}</p>`:''}
   ${canEdit?`<div class="shot-actions">
    ${button('Edit','edit',`data-id="${e(shot.id)}"`,'primary compact')}
    ${canChoose?button('Make Current Recipe','make-current',`data-id="${e(shot.id)}"`,'ghost compact'):''}
   </div>`:''}
  </div>`:''}
 </section>`;
}
