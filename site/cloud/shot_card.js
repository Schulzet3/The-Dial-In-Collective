import {e,button,icon,shotSummary,styleBadge,humanDate,chips,radar} from '../lib/ui.js';

// One-line shot summary on wide screens, like the original JSX.
// Equipment context is preserved at the bottom of expanded details.
export const feedLabel=mode=>mode==='slow'?'Slow Feed':mode==='standard'?'Standard Feed':'Feed Not Recorded';

export function shotCard(shot,{expanded=false,activeVersionId=null,unit='F'}={}){
 const recordUnit=shot.snapshot?.tempUnit||unit;
 const context=[
  ['Setup',shot.snapshot?.setupName],
  ['Basket Dose',shot.snapshot?.basketDoseG!=null?`${shot.snapshot.basketDoseG} g`:null],
  ['Feed',feedLabel(shot.feedMode)]
 ].filter(([,value])=>value!=null&&value!=='');
 const canEdit=!shot.cloudPending;
 const canChoose=canEdit&&shot.dialedIn&&shot.setupVersionId===activeVersionId;
 return `<section class="shot">
  <button class="shot-toggle" data-action="shot-expand" data-id="${e(shot.id)}" aria-expanded="${expanded}" aria-label="Toggle details for shot on ${e(humanDate(shot.timestamp))}">
   <div class="shot-overview">
    <div class="shot-topline">
     ${shotSummary(shot,recordUnit)}
     <span class="shot-date">${e(humanDate(shot.timestamp))}</span>
    </div>
    <div class="shot-meta">${styleBadge(shot.style)}
     ${shot.cloudPending?'<span class="preview-pill">Pending Sync</span>':shot.dialedIn?'<span class="status-badge">Dialed In</span>':''}
    </div>
   </div>${icon('chevron',15)}
  </button>
  ${shot.notes?`<p class="note shot-note">${e(shot.notes)}</p>`:''}
  ${canEdit?`<div class="shot-summary-actions">${button('Edit','edit',`data-id="${e(shot.id)}"`,'text-button')}</div>`:''}
  ${expanded?`<div class="shot-body">
   ${chips(shot.tasteScales)}${radar(shot.tasteScales)}
   ${canChoose?`<div class="shot-actions">${button('Make Current Recipe','make-current',`data-id="${e(shot.id)}"`,'ghost compact')}</div>`:''}
   ${context.length?`<dl class="shot-record-context">${context.map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`:''}
  </div>`:''}
 </section>`;
}
