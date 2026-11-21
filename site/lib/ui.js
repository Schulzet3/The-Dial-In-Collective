import {SCALES,tasteSeverity,tasteLabel,tempDisplay,tempInput,CONFIG,finite,tastesComplete} from './constants.js';
export const e = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 signout:'M9 4H4v16h5m5-12 4 4-4 4m-6-4h10',
 coffee:'M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 1 1 0 6h-2M7 3v2m4-2v2m4-2v2',
 plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',chevron:'m6 9 6 6 6-6',
 settings:'M9.5 2h5l.5 3 2 .9 2.5-1.1L22 9.1 19.8 11v2l2.2 1.9-2.5 4.3-2.5-1.1-2 .9-.5 3h-5L9 19l-2-.9-2.5 1.1L2 14.9 4.2 13v-2L2 9.1l2.5-4.3L7 5.9 9 5l.5-3ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
 back:'m14 6-6 6 6 6',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
 moon:'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z', check:'m5 12 4 4L19 6',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3v6l4 2',
 scale:'M12 3v17M5 20h14M5 7h14M5 7 2 14h6L5 7Zm14 0-3 7h6l-3-7Z',
 drop:'M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z',
 thermometer:'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3-7v10',
 pin:'M8 3h8l-1 6 4 4v2H5v-2l4-4-1-6Zm4 12v7',
 spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
 users:'M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v4',
 history:'M3 10a9 9 0 1 1 1 8M3 4v6h6m3-4v6l4 2',
 link:'m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
 search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
 heart:'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 2 10 8 15 6-5 12-11 8-15Z',
 cloud:'M6 18a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 0 10H6Z',
 arrow:'M12 5v14m-5-5 5 5 5-5',
 shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z',
 beaker:'M8 3h8m-7 0v7l-5 9q-1 2 2 2h12q3 0 2-2l-5-9V3M7 15h10',
 image:'M3 3h18v18H3V3Zm0 14 5-5 4 4 4-6 5 7M7 7h1',
 edit:'m15 4 5 5M4 20l4-1L21 6l-5-5L3 14l1 6Z',
 lock:'M6 10h12v11H6V10Zm2 0V6a4 4 0 0 1 8 0v4',
 book:'M12 5S6 2 2 4v16c4-2 10 1 10 1s6-3 10-1V4c-4-2-10 1-10 1Zm0 0v16',
 mail:'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 2 10 7 10-7',
 warning:'m12 3 10 18H2L12 3Zm0 6v5m0 3v1',
 bolt:'m13 2-8 12h6l-1 8 9-13h-7l1-7Z'
};
export const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.coffee}"/></svg>`;
export const button=(text,action,attrs='',cls='secondary')=>`<button type="button" class="${cls}" data-action="${action}" ${attrs}>${text}</button>`;
export function field(label,name,value='',options={}) {
 const {type='text',required=false,placeholder='',step,help='',extra='',min,max,wide=false}=options;
 return `<label class="field ${wide?'wide':''}"><span>${e(label)}${required?' <span class="required">*</span>':''}</span><input name="${name}" type="${type}" value="${e(value)}" ${required?'required':''} ${placeholder?`placeholder="${e(placeholder)}"`:''} ${step?`step="${step}" inputmode="decimal"`:''} ${min!=null?`min="${min}"`:''} ${max!=null?`max="${max}"`:''} ${extra}>${help?`<small>${e(help)}</small>`:''}</label>`;
}
export function select(label,name,items,value='',extra='') {return `<label class="field"><span>${e(label)}</span><select name="${name}" ${extra}>${items.map(x=>{const val=typeof x==='object'?x.value:x,lab=typeof x==='object'?x.label:x;return `<option value="${e(val)}" ${val===value?'selected':''}>${e(lab)}</option>`;}).join('')}</select></label>`;}
export const checkbox=(name,label,checked=false,help='')=>`<label class="checkline"><input type="checkbox" name="${name}" ${checked?'checked':''}><span>${e(label)}${help?`<small>${e(help)}</small>`:''}</span></label>`;
// Preserve historical/unrecognized shot styles without crashing Shot History.
export function styleBadge(style){
 const recorded=typeof style==='string'&&style.trim()!=='';
 const label=recorded?style:'Style not recorded';
 const safeClass=recorded&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(style)?'style-'+style.toLowerCase():'style-unknown';
 return `<span class="style-badge ${safeClass}">${style==='Turbo'?icon('bolt',12):''}${e(label)}</span>`;
}
// A missing historic measurement is unknown, not zero. Keep genuine 0 and numeric strings.
const numericMeasurement=v=>typeof v==='number'?Number.isFinite(v):
 typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v));
export const fmt=(v,places=1)=>numericMeasurement(v)?Number(v).toFixed(places):'\u2014';
export const range=(v,unit='')=>`${fmt(v.low)}<span class="range-dash">\u2013</span>${fmt(v.high)}${unit?` <span class="unit">${unit}</span>`:''}`;
// UI must not silently round the unchanged measured grinder control into a
// second change while showing yield-only or preparation-only guidance.
// New recommendations still use their existing 0.1 output precision.
const fmtMeasuredControl=v=>numericMeasurement(v)&&
 Math.abs(Number(v)*10-Math.round(Number(v)*10))>1e-8?String(Number(v)):fmt(v);
export function recipeGrid(rec,showTemp=false,unit='F') {
 if(!rec)return '';
 // Imported/legacy setup units are untrusted. Match the approved F/C physical display boundary.
 const safeUnit=unit==='C'?'C':'F';
 const stat=(label,value,sub,ico)=>`<div class="metric"><div class="metric-label">${icon(ico,15)} ${label}</div><div class="metric-value">${value}</div>${sub?`<div class="metric-sub">${sub}</div>`:''}</div>`;
 // One all-green measured shot is a valid personal success, not a reliable distribution.
 // Disclose early evidence only for the untouched personal recipe window;
 // adjustment and cross-setup summaries must not inherit this caption.
 const singleSuccessNote=rec.familyId!=null&&rec.established===true&&
  rec.observations===1&&rec.source==='Your dialed in window';
 return `<div class="recipe-grid">${stat('Dose',`${rec.measuredDoseUnchanged?fmtMeasuredControl(rec.doseG):fmt(rec.doseG)} <span class="unit">g</span>`,'Basket-based','scale')}${stat('Yield',range(rec.yield,'g'),`Center ${rec.source==='Adjustment from your latest taste rating'||rec.diagnosticOnly?fmtMeasuredControl(rec.yield.center):fmt(rec.yield.center)} g \u00b7 1:${fmt(rec.ratio.center,2)}`,'drop')}${stat('Time',range(rec.time,'s'),`Center ${fmt(rec.time.center)} s`,'clock')}${stat('Grind',rec.grind.range?range(rec.grind.range):(rec.source==='Adjustment from your latest taste rating'||rec.diagnosticOnly?fmtMeasuredControl(rec.grind.value):fmt(rec.grind.value)),`${rec.grind.range?`Try ${fmt(rec.grind.value)} · `:''}${e(rec.grind.source)}`,'settings')}${showTemp?stat('Temperature',`${tempDisplay(rec.tempC,safeUnit)}<span class="unit">\u00b0${safeUnit}</span>`,'','thermometer'):''}</div>${singleSuccessNote?'<p class="helper recipe-evidence-note">One successful shot so far. Repeat to refine this starting window; it is not a guaranteed result.</p>':''}${rec.basketCompatibilityNote?`<p class="helper recipe-evidence-note">${e(rec.basketCompatibilityNote)}</p>`:''}`;
}

// Show before → after only for one measured, controllable adjustment.
// Shot time is an observed result. Never invent a previous actual value.
export function nextShotAdjustment(advice,shot,showTemp=false,unit='F'){
 const next=advice?.next;if(!next||!shot||typeof next!=='object')return null;
 const before={grindSetting:shot.grindSetting,yieldCenter:shot.yieldG,tempC:shot.tempC,doseG:shot.doseG};
 if(Object.keys(next).some(k=>!(k in before)))return null;
 const changes=[];
 for(const key of Object.keys(next)){
  if(next[key]==null)continue;
  if(!Number.isFinite(next[key])||!Number.isFinite(before[key]))return null;
  if(Math.abs(next[key]-before[key])>1e-8)changes.push(key);
 }
 if(changes.length!==1)return null;
 const key=changes[0];if(key==='tempC'&&(!showTemp||!Number.isFinite(shot.tempC)))return null;
 // A real difference can still round to one identical visible setting;
 // never display an impossible 158 → 158 °F (or 70 → 70 °C) arrow.
 const names={grindSetting:'Grind',yieldCenter:'Yield',tempC:'Temperature',doseG:'Dose'};
 // Imported/legacy unit labels must never misstate a temperature adjustment.
 const safeUnit=unit==='C'?'C':'F';
 const units={grindSetting:'',yieldCenter:'g',tempC:`°${safeUnit}`,doseG:'g'};
 const format=(n,isOriginal=false)=>key==='tempC'?String(tempDisplay(n,safeUnit)):key==='grindSetting'?fmtMeasuredControl(n):(key==='yieldCenter'||key==='doseG')&&isOriginal?fmtMeasuredControl(n):fmt(n);
 const controls=[['doseG','dose'],['grindSetting','grind'],['yieldCenter','yield'],['tempC','temperature']];
 const unchanged=controls.filter(([k])=>k!==key&&(k!=='tempC'||(showTemp&&Number.isFinite(shot.tempC)))).map(([,name])=>name);
 const keep=unchanged.length===3?`${unchanged[0]}, ${unchanged[1]}, and ${unchanged[2]}`:
  unchanged.length===2?`${unchanged[0]} and ${unchanged[1]}`:unchanged.join('');
 const displayedBefore=format(before[key],true),displayedAfter=format(next[key]);
 if(displayedBefore===displayedAfter)return null;
 return {label:names[key],before:displayedBefore,after:displayedAfter,unit:units[key],keep};
}
export function nextShotTitle(advice){
 if(advice?.title==='Try a little finer')return 'Try grinding slightly finer';
 if(advice?.title==='Try a little coarser')return 'Try grinding slightly coarser';
 return advice?.title||'Next Shot';
}
export function nextShotGuidance(advice,shot,showTemp=false,unit='F'){
 const adjustment=nextShotAdjustment(advice,shot,showTemp,unit);
 // Whether a numeric arrow is possible or not, never conceal a supplied
 // source/uncertainty note. Keep the original textual guidance as fallback.
 const note=advice?.evidenceNote?'<p class="next-shot-evidence">'+e(advice.evidenceNote)+'</p>':'';
 if(!adjustment){
  // A clipped near-floor suggestion can disappear under approved whole-degree
  // F/C display rounding; don't repeat an inaccurate full-degree claim.
  const target=advice?.next,original=shot&&{grindSetting:shot.grindSetting,yieldCenter:shot.yieldG,doseG:shot.doseG};
  const displayUnit=unit==='C'?'C':'F';
  const tinyTemperatureStep=showTemp&&Number.isFinite(shot?.tempC)&&Number.isFinite(target?.tempC)&&
   Math.abs(shot.tempC-target.tempC)>1e-8&&
   tempDisplay(shot.tempC,displayUnit)===tempDisplay(target.tempC,displayUnit)&&
   ['grindSetting','yieldCenter','doseG'].every(key=>target[key]==null||
    (Number.isFinite(target[key])&&Number.isFinite(original?.[key])&&Math.abs(target[key]-original[key])<=1e-8));
  const wording=tinyTemperatureStep?
   'The suggested temperature difference is smaller than one displayed degree. Keep your logged measurements unchanged and check whether your machine can make that small adjustment before trying it.':
   advice?.text||'';
  return `<p class="helper next-shot-original-advice">${e(wording)}</p>${note}`;
 }
 const {label,before,after,unit:measure,keep}=adjustment;
 const spoken=e(`${label} from ${before} to ${after}${measure?' '+measure:''}`);
 const source=advice?.text?.includes('Sized from your own comparable adjustments.')?
  '<p class="next-shot-evidence">Adjustment sized from your comparable shots.</p>':'';
 // The numeric arrow supplements the engine's coaching; it must not replace it.
 const coaching=advice?.text?'<p class="helper next-shot-coaching">'+e(advice.text)+'</p>':'';
 return `<div class="next-shot-change" role="group" aria-label="${spoken}"><span class="next-shot-variable">${e(label)}</span><span class="next-shot-number">${e(before)}</span><span class="next-shot-arrow" aria-hidden="true">→</span><span class="next-shot-number">${e(after)}</span>${measure?`<span class="next-shot-unit">${e(measure)}</span>`:''}</div><p class="next-shot-keep">Keep ${e(keep)} unchanged.</p>${coaching}${source}${note}`;
}


// Bind latest-shot feedback to the exact recipe context being shown.
// A newer shot from another basket, feed mode or grinder calibration remains
// in History, but must not drive this card's Next Shot adjustment.
export function lastRecipeContextShot(shots,coffeeId,recipe,version){
 if(!Array.isArray(shots)||!recipe?.style||!recipe?.basketId||!recipe?.feedMode||
  !version?.id||!version?.calibrationId)return null;
 let latest=null,latestInstant=-Infinity;
 for(const sh of shots){
  if(!sh||sh.hidden||sh.coffeeId!==coffeeId||sh.setupVersionId!==version.id||
   sh.calibrationId!==version.calibrationId||sh.style!==recipe.style||
   sh.basketId!==recipe.basketId||sh.feedMode!==recipe.feedMode||
   // An incomplete imported rating stays in History but must not displace
   // the newest genuinely five-rated shot used for actionable feedback.
   !tastesComplete(sh.tasteScales)||
   typeof sh.timestamp!=='string'||!sh.timestamp.trim())continue;
  // Different ISO offsets must be compared as actual instants. Preserve
  // legacy undated/malformed shots without making them current feedback.
  const at=Date.parse(sh.timestamp);
  if(!Number.isFinite(at))continue;
  // Keep archived ratings/notes intact, but only valid measured controls
  // can become the visibly selected next-shot feedback reference.
  if(!['doseG','yieldG','timeS'].every(field=>{
   const [low,high]=CONFIG.bounds[field];
   return finite(sh[field])&&sh[field]>=low&&sh[field]<=high;
  })||!finite(sh.yieldG/sh.doseG)||!finite(sh.grindSetting)||
   (finite(version.grinderMin)&&sh.grindSetting<version.grinderMin)||
   (finite(version.grinderMax)&&sh.grindSetting>version.grinderMax)||
   (sh.tempC!=null&&(!finite(sh.tempC)||
    sh.tempC<CONFIG.bounds.tempC[0]||sh.tempC>CONFIG.bounds.tempC[1])))continue;
  // A present-day calibration cannot validate an imported shot against its
  // explicitly recorded ORIGINAL grinder limits. Keep that shot in History.
  const oldMin=sh.snapshot?.grinderMin,oldMax=sh.snapshot?.grinderMax;
  if((finite(oldMin)&&finite(oldMax)&&oldMax<=oldMin)||
     (finite(oldMin)&&sh.grindSetting<oldMin)||
     (finite(oldMax)&&sh.grindSetting>oldMax))continue;
  if(at>latestInstant){latest=sh;latestInstant=at;}
 }
 return latest;
}

// Legacy or partially rated shots must not display absent taste scores as
// red failures in chips or ideal-green data points on the compass.
const hasRecordedTaste=value=>Number.isInteger(value)&&value>=1&&value<=5;
export function chips(t){
 return `<div class="taste-chips">${SCALES.map(sc=>{
  const value=t?.[sc.key],rated=hasRecordedTaste(value);
  const label=sc.label==='Astringency / Dryness'?'Dryness':sc.label;
  // Every recorded taste needs its readable value, not just a severity color.
  const extra=!rated?': Not rated':`: ${tasteLabel(sc,value)}`;
  return `<span class="taste-chip ${rated?`severity-${tasteSeverity(sc,value)}`:'is-unrated'}">${e(label)}${e(extra)}</span>`;
 }).join('')}</div>`;
}
export function radar(t){
 const cx=140,cy=125,r=80,pt=(i,n)=>{const a=(i*72-90)*Math.PI/180;return [cx+Math.cos(a)*n,cy+Math.sin(a)*n];};
 const poly=n=>SCALES.map((_,i)=>pt(i,n).join(',')).join(' ');
 const complete=SCALES.every(sc=>hasRecordedTaste(t?.[sc.key]));
 const dots=SCALES.map((sc,i)=>{
  const value=t?.[sc.key];if(!hasRecordedTaste(value))return null;
  const severity=tasteSeverity(sc,value),p=pt(i,16+severity*16);
  return {p,severity};
 }).filter(Boolean);
 const names=SCALES.map(sc=>`${sc.label} ${hasRecordedTaste(t?.[sc.key])?tasteLabel(sc,t[sc.key]):'Not rated'}`).join(', ');
 const outline=complete?`<polygon points="${dots.map(d=>d.p.join(',')).join(' ')}" class="radar-result ${SCALES.every(sc=>t[sc.key]===sc.ideal)?'is-ideal':''}"/>`:'';
 return `<svg class="radar" viewBox="0 0 280 250" role="img" aria-label="Taste compass: ${e(names)}"><title>Taste compass. Green near the center means ideal for your taste. Unrated tastes are not plotted.</title>${[.2,.4,.6,.8,1].map(k=>`<polygon points="${poly(r*k)}" class="radar-grid"/>`).join('')}${SCALES.map((sc,i)=>{const [x,y]=pt(i,r),[tx,ty]=pt(i,r+20);return `<path d="M${cx} ${cy}L${x} ${y}" class="radar-grid"/><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle">${e(sc.key==='astringency'?'Dryness':sc.label)}</text>`;}).join('')}${outline}${dots.map(d=>`<circle cx="${d.p[0]}" cy="${d.p[1]}" r="4.5" class="dot severity-${d.severity}"/>`).join('')}</svg>`;
}
// Keep the editable Log Shot draft writable even when an archived import
// has a missing/nonobject taste record. Never mutate the original shot and
// never synthesize a recorded score; valid partial choices survive.
export function editableTasteScales(value) {
 return value && typeof value==='object' && !Array.isArray(value) ? {...value} : {};
}

export function scales(t={}) {
 t=t && typeof t==='object'?t:{};
 return `<fieldset class="sensory"><legend>How did it taste?</legend>${SCALES.map(sc=>`<div class="scale" data-scale="${sc.key}"><div class="scale-top"><span>${e(sc.label)}</span><output>${e(tasteLabel(sc,t[sc.key]))}</output></div><div class="scale-control"><small>${e(sc.low)}</small><div role="group" aria-label="${e(sc.label)}">${(sc.reverse?[5,4,3,2,1]:[1,2,3,4,5]).map(n=>`<button type="button" class="scale-button severity-${tasteSeverity(sc,n)} ${t[sc.key]===n?'chosen':''}" data-action="rate" data-key="${sc.key}" data-value="${n}" aria-label="${e(sc.label)}: ${e(tasteLabel(sc,n))}" aria-pressed="${t[sc.key]===n}"><span>${t[sc.key]===n?'\u2713':''}</span></button>`).join('')}</div><small>${e(sc.high)}</small></div><p>${e(sc.hint)}</p></div>`).join('')}</fieldset>`;
}
// Update a single sensory row in place. Replacing #ratings after each tap
// destroyed the focused button and its keyboard/assistive-technology position.
// All five selections remain explicit; only the tapped scale is changed.
export function updateTasteSelection(ratings,key,value) {
 const scale=SCALES.find(s=>s.key===key);
 if(!ratings||!scale||!Number.isInteger(value)||value<1||value>5)return false;
 const row=ratings.querySelector('[data-scale="'+key+'"]');
 if(!row)return false;
 const output=row.querySelector('output');
 if(output)output.textContent=tasteLabel(scale,value);
 for(const control of row.querySelectorAll('[data-action="rate"]')){
  const selected=Number(control.dataset.value)===value;
  control.classList.toggle('chosen',selected);
  control.setAttribute('aria-pressed',String(selected));
  const mark=control.querySelector('span');
  if(mark)mark.textContent=selected?'\u2713':'';
 }
 return true;
}

// Do not falsely mark an edited measurement or note as corrected while its
// current value still violates the SAME existing model Save bounds. Keep the
// original alert and aria-invalid until the member actually fixes it.
// Temperature display units are explicitly provided by the existing Log form.
function unresolvedShotField(target){
 if(typeof target.value!=='string')return false;
 const value=target.value,name=target.name;
 if(name==='notes')return Array.from(value).length>16000;
 // Optional temperature is entered in the member's displayed F/C unit,
 // while the existing model Save boundary is 70-100 degrees C.
 // Do not dismiss a flagged error when the unit cannot be established.
 if(name==='temperature'){
  const trimmed=value.trim();
  if(!trimmed)return false;
  const unit=target.dataset?.temperatureUnit;
  if(unit!=='F'&&unit!=='C')return true;
  const c=tempInput(trimmed,unit),[low,high]=CONFIG.bounds.tempC;
  return c==null||c<low||c>high;
 }
 if(!['doseG','yieldG','timeS','grindSetting'].includes(name))return false;
 const trimmed=value.trim();
 if(!trimmed||!Number.isFinite(Number(trimmed)))return true;
 const n=Number(trimmed);
 if(name==='grindSetting')return n<0;
 const [low,high]=CONFIG.bounds[name];
 return n<low||n>high;
}
// An edited field invalidates its old local Save validation summary. Ordinary
// inputs must not dismiss unrelated cloud/sync errors, and other fields' status
// is left intact until the member corrects or submits those fields.
export function acknowledgeShotInput(target,feedback){
 if(!target)return false;
 const invalid=target.getAttribute?.('aria-invalid')==='true';
 if(invalid&&unresolvedShotField(target))return true;
 target.removeAttribute?.('aria-invalid');
 if(target.getAttribute?.('aria-describedby')==='shot-validation-feedback')
  target.removeAttribute?.('aria-describedby');
 const form=target.closest?.('form');
 if(invalid&&feedback&&typeof form?.querySelector==='function'&&
    !form.querySelector('[aria-invalid="true"]'))feedback.textContent='';
 return invalid;
}
// A rating tap can fix one missing taste while other marked invalid fields
// remain unresolved. Retain the shared alert until the final flagged control
// is corrected. A routine tap must never dismiss a cloud/sync error.
export function acknowledgeShotRating(group,feedback){
 if(!group)return false;
 const invalid=group.getAttribute?.('aria-invalid')==='true';
 group.removeAttribute?.('aria-invalid');
 if(group.getAttribute?.('aria-describedby')==='shot-validation-feedback')
  group.removeAttribute?.('aria-describedby');
 const form=group.closest?.('form');
 if(invalid&&feedback&&typeof form?.querySelector==='function'&&
    !form.querySelector('[aria-invalid="true"]'))feedback.textContent='';
 return invalid;
}

// Model validation remains authoritative. Move focus to the first invalid
// measurement or missing sensory choice only after submit buttons are reenabled.
export function focusShotValidationError(form,errors,tastes={}) {
 if(!form?.isConnected||!Array.isArray(errors)||!errors.length)return false;
 const invalid=[];
 const checks=[
  ['Dose must','[name="doseG"]'],['Yield must','[name="yieldG"]'],
  ['Time must','[name="timeS"]'],['Enter the actual grind setting','[name="grindSetting"]'],
  ['Check temperature','[name="temperature"]']
 ];
 const describe=element=>{
  if(!element)return;
  element.setAttribute('aria-invalid','true');
  element.setAttribute('aria-describedby','shot-validation-feedback');
 };
 for(const [message,selector] of checks){
  if(errors.some(error=>error.startsWith(message))){
   const control=form.querySelector(selector);if(control){describe(control);invalid.push(control);}
  }
 }
 if(errors.some(error=>error.startsWith('Rate all five taste scales'))){
  for(const scale of SCALES){
   if(Number.isInteger(tastes?.[scale.key])&&tastes[scale.key]>=1&&tastes[scale.key]<=5)continue;
   const group=form.querySelector('[data-scale="'+scale.key+'"] [role="group"]');
   if(group){describe(group);const control=group.querySelector('button');if(control)invalid.push(control);}
  }
 }
 if(errors.some(error=>error.startsWith('Notes must'))){
  const control=form.querySelector('[name="notes"]');if(control){describe(control);invalid.push(control);}
 }
 if(!invalid.length)return false;
 invalid[0].focus();
 return true;
}

// History must show the ORIGINAL recorded measurements, not subtly rounded
// recommendations. Reuse the established scalar formatting guard; do not
// mutate archived dose/yield/time/grind values or invent absent readings.
export function shotSummary(sh,unit='F') {
 const dose=numericMeasurement(sh.doseG)?Number(sh.doseG):NaN;
 const yieldG=numericMeasurement(sh.yieldG)?Number(sh.yieldG):NaN;
 const ratio=Number.isFinite(dose)&&dose>0&&Number.isFinite(yieldG)&&yieldG>0?` \u00b7 1:${fmt(yieldG/dose,2)}`:'';
  // Archived unit labels are untrusted; never interpolate arbitrary HTML or invent a physical unit.
  const safeUnit=unit==='C'?'C':'F';
 const temperature=numericMeasurement(sh.tempC)?` \u00b7 ${tempDisplay(sh.tempC,safeUnit)}\u00b0${safeUnit}`:'';
 const grind=numericMeasurement(sh.grindSetting)?` \u00b7 Grind ${fmtMeasuredControl(sh.grindSetting)}`:'';
 return `<span class="shot-numbers">${fmtMeasuredControl(sh.doseG)}g \u2192 ${fmtMeasuredControl(sh.yieldG)}g${ratio} \u00b7 ${fmtMeasuredControl(sh.timeS)}s${temperature}${grind}</span>`;
}
// An archived YYYY-MM-DD carries a calendar date, not a UTC instant.
// Parsing it with new Date(dateOnly) shifts a real Nov 5 to Nov 4 in
// America/Denver. Keep offset-bearing shot timestamps on the existing
// local-instant display path and reject impossible legacy calendar dates.
export const humanDate=d=>{
 if(typeof d!=='string'||!d.trim())return '';
 const calendar=d.trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(calendar)){
  const validated=new Date(calendar+'T12:00:00Z');
  if(!Number.isFinite(validated.getTime())||validated.toISOString().slice(0,10)!==calendar)return '';
  const [year,month,day]=calendar.split('-');
  return Number(month)+'/'+Number(day)+'/'+year;
 }
 try{
  const date=new Date(d);
  return Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'});
 }catch{return '';}
};
export const previewNotice=()=>`<div class="preview-note">${icon('eye',16)}<div><strong>Design preview</strong><span>Fictional sample data. Nothing is shared, synced or sent to an account.</span></div></div>`;
