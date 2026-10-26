import {SCALES,tasteSeverity,tasteLabel,tempDisplay} from './constants.js';
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
export function styleBadge(style){return `<span class="style-badge style-${e(style.toLowerCase())}">${style==='Turbo'?icon('bolt',12):''}${e(style)}</span>`;}
export const fmt=(v,places=1)=>Number.isFinite(Number(v))&&v!=null?Number(v).toFixed(places):'\u2014';
export const range=(v,unit='')=>`${fmt(v.low)}<span class="range-dash">\u2013</span>${fmt(v.high)}${unit?` <span class="unit">${unit}</span>`:''}`;
export function recipeGrid(rec,showTemp=false,unit='F') {
 if(!rec)return '';
 const stat=(label,value,sub,ico)=>`<div class="metric"><div class="metric-label">${icon(ico,15)} ${label}</div><div class="metric-value">${value}</div>${sub?`<div class="metric-sub">${sub}</div>`:''}</div>`;
 return `<div class="recipe-grid">${stat('Dose',`${fmt(rec.doseG)} <span class="unit">g</span>`,'Basket-based','scale')}${stat('Yield',range(rec.yield,'g'),`Center ${fmt(rec.yield.center)} g \u00b7 1:${fmt(rec.ratio.center,2)}`,'drop')}${stat('Time',range(rec.time,'s'),`Center ${fmt(rec.time.center)} s`,'clock')}${stat('Grind',rec.grind.range?range(rec.grind.range):fmt(rec.grind.value),`${rec.grind.range?`Try ${fmt(rec.grind.value)} · `:''}${e(rec.grind.source)}`,'settings')}${showTemp?stat('Temperature',`${tempDisplay(rec.tempC,unit)}<span class="unit">\u00b0${unit}</span>`,'','thermometer'):''}</div>`;
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
 const names={grindSetting:'Grind',yieldCenter:'Yield',tempC:'Temperature',doseG:'Dose'};
 const units={grindSetting:'',yieldCenter:'g',tempC:`°${unit}`,doseG:'g'};
 const format=n=>key==='tempC'?String(tempDisplay(n,unit)):fmt(n);
 const controls=[['doseG','dose'],['grindSetting','grind'],['yieldCenter','yield'],['tempC','temperature']];
 const unchanged=controls.filter(([k])=>k!==key&&(k!=='tempC'||(showTemp&&Number.isFinite(shot.tempC)))).map(([,name])=>name);
 const keep=unchanged.length===3?`${unchanged[0]}, ${unchanged[1]}, and ${unchanged[2]}`:
  unchanged.length===2?`${unchanged[0]} and ${unchanged[1]}`:unchanged.join('');
 return {label:names[key],before:format(before[key]),after:format(next[key]),unit:units[key],keep};
}
export function nextShotTitle(advice){
 if(advice?.title==='Try a little finer')return 'Try grinding slightly finer';
 if(advice?.title==='Try a little coarser')return 'Try grinding slightly coarser';
 return advice?.title||'Next Shot';
}
export function nextShotGuidance(advice,shot,showTemp=false,unit='F'){
 const adjustment=nextShotAdjustment(advice,shot,showTemp,unit);
 if(!adjustment)return `<p class="helper next-shot-original-advice">${e(advice?.text||'')}</p>`;
 const {label,before,after,unit:measure,keep}=adjustment;
 const spoken=e(`${label} from ${before} to ${after}${measure?' '+measure:''}`);
 const source=advice?.text?.includes('Sized from your own comparable adjustments.')?
  '<p class="next-shot-evidence">Adjustment sized from your comparable shots.</p>':'';
 return `<div class="next-shot-change" role="group" aria-label="${spoken}"><span class="next-shot-variable">${e(label)}</span><span class="next-shot-number">${e(before)}</span><span class="next-shot-arrow" aria-hidden="true">→</span><span class="next-shot-number">${e(after)}</span>${measure?`<span class="next-shot-unit">${e(measure)}</span>`:''}</div><p class="next-shot-keep">Keep ${e(keep)} unchanged.</p>${source}`;
}

export function chips(t){return `<div class="taste-chips">${SCALES.map(sc=>`<span class="taste-chip severity-${tasteSeverity(sc,t?.[sc.key])??4}">${e(sc.label==='Astringency / Dryness'?'Dryness':sc.label)}${sc.ideal===3&&t?.[sc.key]!==3?`: ${e(tasteLabel(sc,t?.[sc.key]))}`:''}</span>`).join('')}</div>`;}
export function radar(t) {
 const cx=140,cy=125,r=80,pt=(i,n)=>{const a=(i*72-90)*Math.PI/180;return [cx+Math.cos(a)*n,cy+Math.sin(a)*n];};
 const poly=n=>SCALES.map((_,i)=>pt(i,n).join(',')).join(' ');
 const dots=SCALES.map((sc,i)=>{const severity=tasteSeverity(sc,t?.[sc.key])??0;const p=pt(i,16+severity*16);return {p,severity};});
 return `<svg class="radar" viewBox="0 0 280 250" role="img" aria-label="Taste compass: ${SCALES.map(sc=>`${sc.label} ${tasteLabel(sc,t?.[sc.key])}`).join(', ')}"><title>Taste compass. Green near the center means ideal for your taste.</title>${[.2,.4,.6,.8,1].map(k=>`<polygon points="${poly(r*k)}" class="radar-grid"/>`).join('')}${SCALES.map((sc,i)=>{const [x,y]=pt(i,r),[tx,ty]=pt(i,r+20);return `<path d="M${cx} ${cy}L${x} ${y}" class="radar-grid"/><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle">${e(sc.key==='astringency'?'Dryness':sc.label)}</text>`;}).join('')}<polygon points="${dots.map(d=>d.p.join(',')).join(' ')}" class="radar-result ${SCALES.every(sc=>t?.[sc.key]===sc.ideal)?'is-ideal':''}"/>${dots.map(d=>`<circle cx="${d.p[0]}" cy="${d.p[1]}" r="4.5" class="dot severity-${d.severity}"/>`).join('')}</svg>`;
}
export function scales(t={}) {
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

export function shotSummary(sh,unit='F') {return `<span class="shot-numbers">${fmt(sh.doseG)}g \u2192 ${fmt(sh.yieldG)}g \u00b7 ${fmt(sh.timeS)}s${sh.tempC!=null?` \u00b7 ${tempDisplay(sh.tempC,unit)}\u00b0${unit}`:''}${sh.grindSetting!=null?` \u00b7 Grind ${fmt(sh.grindSetting)}`:''}</span>`;}
export const humanDate=d=>{try{const date=new Date(d);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'});}catch{return '';}};
export const previewNotice=()=>`<div class="preview-note">${icon('eye',16)}<div><strong>Design preview</strong><span>Fictional sample data. Nothing is shared, synced or sent to an account.</span></div></div>`;
