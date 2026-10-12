import {CONFIG,RATIOS,TIMES,TEMPS,ROASTS,STYLES,num,round,clamp,norm,finite,newId,now,isDialed} from './constants.js';
import {activeSetup,activeVersion,workspace,coffeeState,ensureCoffeeState,selectedBasket,feedMode,snapshot,hasLocalSuccess,validateShot,logAudit} from './model.js';
export const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
export function quantile(a,q) {const b=[...a].sort((x,y)=>x-y);if(!b.length)return null;const pos=(b.length-1)*q,lo=Math.floor(pos);return b[lo]+(b[Math.min(lo+1,b.length-1)]-b[lo])*(pos-lo);}
export function stats(a,{singleWidth=0}={}) {
 const x=a.filter(finite).sort((a,b)=>a-b);if(!x.length)return null;
 let low=x[0], high=x.at(-1), core=x;
 if(x.length>=CONFIG.robustAt){const trim=Math.floor(x.length*CONFIG.trimFraction);core=x.slice(trim,x.length-trim);low=quantile(x,.1);high=quantile(x,.9);}
 const center=mean(core),observedLow=low,observedHigh=high;
 if(x.length===1||Math.abs(high-low)<1e-8){low=center-singleWidth;high=center+singleWidth;}
 return {low,high,center,count:x.length,observedLow,observedHigh,robust:x.length>=CONFIG.robustAt,estimatedWidth:observedLow===observedHigh};
}
export function readPreference(text) {
 const t=norm(text), clarity=(t.match(/\b(clarity|clean|bright|floral|citrus|fruity|fruit|juicy|light roast|delicate|berry)\b/g)||[]),body=(t.match(/\b(body|rich|syrupy|thick|chocolate|creamy|texture|caramel|milk|latte|cappuccino)\b/g)||[]);
 return clarity.length>body.length?'clarity':body.length>clarity.length?'body':null;
}
export function suggestedStyle(coffee,preferences='') {
 const p=readPreference(preferences),light=['Light','Light-Medium'].includes(coffee.roastLevel);
 if(light&&p==='clarity')return {style:'Turbo',reason:'Light roast and your preference for clarity suggest a Turbo starting point.'};
 return {style:'Traditional',reason:p==='body'?'A conventional starting point for your preference for body.':'A balanced starting point; choose any style you prefer.'};
}
export function baseline(coffee,style,dose,preferences='') {
 const index=ROASTS.indexOf(coffee.roastLevel),r=index<0?2:index;
 let ratio=RATIOS[style]?.[r]??2;let time=TIMES[style]?.[r>=3?1:0]||[25,32];let temp=TEMPS[r];
 const reasons=[];const pref=readPreference(preferences);
 if(style==='Traditional'&&coffee.roasterRecipe?.ratio>0){ratio=ratio*.35+coffee.roasterRecipe.ratio*.65;reasons.push('Starting ratio informed by the roaster recipe.');}
 if(pref&&style!=='Custom'){ratio+=pref==='clarity'?.15:-.15;reasons.push(`Ratio nudged by your preference for ${pref}.`);}
 if(index<0)reasons.push('Roast level unknown; Medium is a recipe fallback, not a coffee fact.');
 return {doseG:dose,ratio:{low:Math.max(.8,ratio-CONFIG.rangeHalfWidth),high:ratio+CONFIG.rangeHalfWidth,center:ratio},time:{low:time[0],high:time[1],center:mean(time)},tempC:temp,reasons,source:'Starting recommendation',observations:0,familyId:null,established:false};
}
export function familyShots(s,id) {return s.shots.filter(x=>!x.hidden&&x.dialedIn&&x.familyId===id);}
export function familyStats(s,id) {
 const shots=familyShots(s,id);if(!shots.length)return null;
 return {ratio:stats(shots.map(x=>x.yieldG/x.doseG),{singleWidth:1/(mean(shots.map(x=>x.doseG))||18)}),time:stats(shots.map(x=>x.timeS),{singleWidth:2}),count:shots.length,confirmed:shots.length>=2};
}
export function familiesFor(s,coffeeId,style) {return s.families.filter(f=>f.coffeeId===coffeeId&&f.style===style&&familyShots(s,f.id).length);}
export function assignFamily(s,shot) {
 const ratio=shot.yieldG/shot.doseG;
 let best=null,dist=Infinity;
 for(const f of familiesFor(s,shot.coffeeId,shot.style)){const value=familyStats(s,f.id).ratio.center;const d=Math.abs(value-ratio);if(d<dist&&d<=CONFIG.ratioFamilyDistance){best=f;dist=d;}}
 if(!best){best={id:newId('family'),coffeeId:shot.coffeeId,style:shot.style,seedRatio:ratio,createdAt:now()};s.families.push(best);}
 return best.id;
}
export function setupSimilarity(a,b) {
 const w=CONFIG.similarity;return Object.entries(w).reduce((sum,[key,value])=>sum+(key==='basket' ? (a.basketDoseG&&b.basketDoseG&&a.basketDoseG===b.basketDoseG?value:0) : (norm(a[key])&&norm(a[key])===norm(b[key])?value:0)),0);
}
function hardwareMatch(sh,v) {
 return sh.setupVersionId===v.id || (!!norm(v.grinder)&&!!norm(v.burrs)&&norm(sh.snapshot?.grinder)===norm(v.grinder)&&norm(sh.snapshot?.burrs)===norm(v.burrs));
}
export function grindStep(v) {return Math.max(.1,round(Math.abs(v.grinderMax-v.grinderMin)*CONFIG.grindRangeFraction));}
export function translateGrind(sh,v) {
 const old=sh.snapshot;if(!old||!finite(sh.grindSetting)||!(old.grinderMax>old.grinderMin))return null;
 const pos=clamp((sh.grindSetting-old.grinderMin)/(old.grinderMax-old.grinderMin),0,1);
 return round(v.grinderMin+pos*(v.grinderMax-v.grinderMin));
}
export function grindGuidance(s,c,style,basket,feed,familyId=null) {
 const v=activeVersion(s),qual=s.shots.filter(sh=>!sh.hidden&&sh.dialedIn&&sh.style===style&&sh.feedMode===feed&&hardwareMatch(sh,v)&&finite(sh.grindSetting));
 const current=qual.filter(sh=>sh.calibrationId===v.calibrationId),same=current.filter(sh=>sh.coffeeId===c.id&&(!familyId||sh.familyId===familyId));
 const basketHits=same.filter(sh=>sh.basketId===basket.id);
 if(basketHits.length)return {value:round(quantile(basketHits.map(sh=>sh.grindSetting),.5)),source:'Your successful setting',proven:true};
 if(same.length)return {value:round(quantile(same.map(sh=>sh.grindSetting),.5)),source:'Reference from your other basket or setup',proven:false};
 const cross=qual.filter(sh=>sh.coffeeId===c.id&&sh.setupVersionId!==v.id&&(!familyId||sh.familyId===familyId));
 if(cross.length)return {value:round(quantile(cross.map(sh=>sh.grindSetting),.5)),source:'Starting reference from matching grinder and burrs',proven:false};
 const sameOld=qual.filter(sh=>sh.coffeeId===c.id&&sh.calibrationId!==v.calibrationId&&sh.setupVersionId===v.id);
 if(sameOld.length)return {value:translateGrind(sameOld.sort((a,b)=>b.timestamp.localeCompare(a.timestamp))[0],v),source:'Estimated from previous calibration',proven:false};
 const similar=current.filter(sh=>s.coffees.find(x=>x.id===sh.coffeeId)?.roastLevel===c.roastLevel);
 if(similar.length)return {value:round(quantile(similar.map(sh=>sh.grindSetting),.5)),source:'From your similar coffees',proven:false};
 return {value:round(v.grinderMin+(v.grinderMax-v.grinderMin)*(style==='Turbo'?.75:.5)),source:'Espresso range starting estimate',proven:false};
}
export function learnSensitivity(shots) {
 const groups=new Map();
 for(const s of shots){if(!finite(s.grindSetting)||!finite(s.timeS)||s.hidden||s.feedMode==null)continue;const key=[s.coffeeId,s.style,s.setupVersionId,s.calibrationId,s.basketId,s.feedMode].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
 const slopes=[];
 for(const group of groups.values()){
  group.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  for(let i=1;i<group.length;i++){
   const a=group[i-1],b=group[i],dg=b.grindSetting-a.grindSetting;
   if(Math.abs(dg)<.09||Math.abs(a.doseG-b.doseG)>.6||Math.abs(a.yieldG-b.yieldG)>3)continue;
   if(a.tempC!=null&&b.tempC!=null&&Math.abs(a.tempC-b.tempC)>1)continue;
   const slope=(b.timeS-a.timeS)/dg;if(slope<-.5&&slope>-1000)slopes.push(slope);
  }
 }
 return slopes.length>=2?{secondsPerUnit:quantile(slopes,.5),samples:slopes.length}:null;
}
function temperatureGuidance(s,c,style,v,defaultC,familyId=null) {
 const sh=s.shots.filter(sh=>!sh.hidden&&sh.dialedIn&&sh.coffeeId===c.id&&finite(sh.tempC)&& (sh.setupVersionId===v.id||(norm(v.machine)&&norm(sh.snapshot?.machine)===norm(v.machine))));
 const exact=sh.filter(sh=>sh.style===style&&sh.familyId===familyId);if(exact.length)return mean(exact.map(x=>x.tempC));
 const match=sh.filter(sh=>sh.style===style);return match.length?mean(match.map(x=>x.tempC)):sh.length?mean(sh.map(x=>x.tempC)):defaultC;
}
export function recommendation(s,coffeeId,options={}) {
 const c=s.coffees.find(c=>c.id===coffeeId),v=activeVersion(s),p=coffeeState(s,coffeeId);
 if(!c||!v)return null;
 const style=options.style||p.style,basket=v.baskets.find(x=>x.id===options.basketId)||selectedBasket(s,coffeeId),feed=options.feedMode||feedMode(v);
 const rec=baseline(c,style,basket.doseG,s.preferences);
 if(style==='Custom'&&p.custom){rec.ratio={low:p.custom.ratioLow,high:p.custom.ratioHigh,center:(p.custom.ratioLow+p.custom.ratioHigh)/2};rec.time={low:p.custom.timeLow,high:p.custom.timeHigh,center:(p.custom.timeLow+p.custom.timeHigh)/2};rec.reasons=[];}
 const fams=familiesFor(s,coffeeId,style);
 let chosen=fams.find(f=>f.id===p.currentFamilies[style])||fams.find(f=>f.id===p.referenceFamilies[style]);
 if(!chosen && fams.length){
  const snap=snapshot(s,coffeeId,basket.id);
  chosen=[...fams].sort((a,b)=>{
   const score=f=>familyShots(s,f.id).reduce((sum,sh)=>sum+(sh.setupVersionId===v.id?3:1+setupSimilarity(sh.snapshot,snap)),0);
   return score(b)-score(a);
  })[0];
 }
 if(chosen){
  const all=familyShots(s,chosen.id),local=all.filter(sh=>sh.setupVersionId===v.id),used=local.length?local:all;
  rec.ratio=stats(used.map(x=>x.yieldG/x.doseG),{singleWidth:CONFIG.singleYieldHalfWidth/basket.doseG});
  rec.time=stats(used.map(x=>x.timeS),{singleWidth:CONFIG.singleTimeHalfWidth});
  rec.familyId=chosen.id;rec.observations=used.length;rec.established=local.length>0;
  rec.source=local.length?'Your dialed in window':'Starting reference from your other setup';
  rec.reasons=[local.length?'Based on your successful shots in this recipe family.':'Your own successful recipe, adapted to this basket. Not yet proven on this setup.'];
 } else if(style!=='Custom') {
  // Weak cross-style ratio residual only: no copied time or grind numbers.
  const other=s.shots.filter(sh=>!sh.hidden&&sh.dialedIn&&sh.coffeeId===coffeeId&&sh.style!==style&&RATIOS[sh.style]);
  if(other.length){const r=Math.max(0,ROASTS.indexOf(c.roastLevel));const residual=mean(other.map(sh=>sh.yieldG/sh.doseG-RATIOS[sh.style][r]));const bias=clamp(residual*.2,-.15,.15);for(const k of ['low','high','center'])rec.ratio[k]+=bias;rec.reasons.push('Small ratio adjustment informed by your other styles; time and grind stay style-specific.');}
 }
 rec.grind=grindGuidance(s,c,style,basket,feed,rec.familyId);
 rec.tempC=temperatureGuidance(s,c,style,v,rec.tempC,rec.familyId);
 rec.style=style;rec.basketId=basket.id;rec.feedMode=feed;
 rec.yield={low:round(rec.ratio.low*rec.doseG),high:round(rec.ratio.high*rec.doseG),center:round(rec.ratio.center*rec.doseG)};
 const exp=s.experiments.find(e=>e.id===p.experiments[style]&&e.status==='active');rec.experimentId=exp?.id||null;
 // Advice takes over only during initial dialing or an explicitly active experiment.
 const last=s.shots.filter(sh=>!sh.hidden&&sh.coffeeId===coffeeId&&sh.setupVersionId===v.id&&sh.style===style&&sh.basketId===basket.id&&sh.feedMode===feed&&sh.calibrationId===v.calibrationId&&(!exp||sh.experimentId===exp.id)).sort((a,b)=>b.timestamp.localeCompare(a.timestamp))[0];
 if(!options.ignoreAdvice&&last?.suggestion && (!hasLocalSuccess(s,coffeeId,style)||exp)){
  const a=last.suggestion;
  if(a.next){if(a.next.grindSetting!=null)rec.grind={value:a.next.grindSetting,source:'Next setting to try',proven:false};if(a.next.yieldCenter!=null){rec.yield={low:Math.max(5,round(a.next.yieldCenter-1)),high:round(a.next.yieldCenter+1),center:round(a.next.yieldCenter)};rec.ratio={low:rec.yield.low/rec.doseG,high:rec.yield.high/rec.doseG,center:rec.yield.center/rec.doseG};}if(a.next.tempC!=null)rec.tempC=a.next.tempC;}
  if(exp){rec.source='Experiment starting window';rec.established=false;}
 }
 return rec;
}
export function prefill(s,coffeeId,options={}) {
 const v=activeVersion(s),p=coffeeState(s,coffeeId),basket=v.baskets.find(x=>x.id===options.basketId)||selectedBasket(s,coffeeId),style=options.style||p.style,feed=options.feedMode||feedMode(v);
 const shots=s.shots.filter(x=>!x.hidden&&x.coffeeId===coffeeId&&x.setupVersionId===v.id).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
 const doses=shots.filter(x=>x.basketId===basket.id),grinds=shots.filter(x=>x.basketId===basket.id&&x.style===style&&x.feedMode===feed&&x.calibrationId===v.calibrationId&&finite(x.grindSetting));
 const temps=shots.filter(x=>finite(x.tempC)),same=temps.find(x=>x.style===style),temp=same||temps[0];
 return {doseG:doses[0]?.doseG??basket.doseG,yieldG:'',timeS:'',grindSetting:grinds[0]?.grindSetting??'',tempC:v.advanced.temperature?(temp?.tempC??null):null,tempSource:temp&&temp.style!==style?`Last used on ${temp.style}`:'',style,basketId:basket.id,feedMode:feed,tasteScales:{extraction:null,body:null,clarity:null,sweetness:null,astringency:null},notes:''};
}
export function nextAdvice(s,shot,rec) {
 const v=activeVersion(s),t=shot.tasteScales;
 if(isDialed(t))return {title:'Dialed in. Nicely done.',text:'Balanced, sweet and clean for your taste. This shot adds to your successful recipe window.',next:null};
 const step=grindStep(v),fast=shot.timeS<rec.time.low,slow=shot.timeS>rec.time.high;
 const direction=t.extraction<3?'finer':t.extraction>3?'coarser':null;
 if(t.astringency>=3 || t.clarity<=2) return {title:'Check evenness first',text:'Try a more even distribution and level tamp before changing several settings. Dryness or muddled flavors can have more than one cause.',next:{grindSetting:shot.grindSetting,yieldCenter:shot.yieldG}};
 if((direction==='finer'&&fast)||(direction==='coarser'&&slow)){
  const pairs=s.shots.filter(x=>x.setupVersionId===shot.setupVersionId&&x.calibrationId===shot.calibrationId&&x.feedMode===shot.feedMode&&x.style===shot.style&&x.basketId===shot.basketId);
  const exact=pairs.filter(x=>x.coffeeId===shot.coffeeId),sens=learnSensitivity(exact)||learnSensitivity(pairs);
  let move=step;if(sens){move=Math.max(.1,round(Math.min(step*4,Math.abs((rec.time.center-shot.timeS)/sens.secondsPerUnit))));}
  const val=round(clamp(shot.grindSetting+(direction==='finer'?-move:move),v.grinderMin,v.grinderMax));
  if(val!==shot.grindSetting)return {title:`Try a little ${direction}`,text:`Try grind ${val.toFixed(1)}. Keep dose and yield similar, then taste again.${sens?' Sized from your own comparable adjustments.':''}`,next:{grindSetting:val,yieldCenter:shot.yieldG}};
 }
 if(t.extraction!==3){const delta=t.extraction<3?2:-2,center=clamp(shot.yieldG+delta,5,200);return {title:t.extraction<3?'Try a slightly longer yield':'Try a slightly shorter yield',text:`Aim around ${(center-1).toFixed(1)}-${(center+1).toFixed(1)} g out, with the same dose and grind. Compare the balance.`,next:{grindSetting:shot.grindSetting,yieldCenter:center}};}
 if(t.body!==3){const center=clamp(shot.yieldG+(t.body<3?-2:2),5,200);return {title:t.body<3?'Try a little more concentration':'Try opening up the texture',text:`Keep dose and grind steady; try ${(center-1).toFixed(1)}-${(center+1).toFixed(1)} g out. Let taste decide.`,next:{grindSetting:shot.grindSetting,yieldCenter:center}};}
 if(t.astringency>1&&v.advanced.temperature&&finite(shot.tempC)){const temp=clamp(shot.tempC-1,70,100);return {title:'Try a small temperature change',text:'Try about 1 degree C (2 degrees F) cooler while keeping the other variables steady.',next:{grindSetting:shot.grindSetting,yieldCenter:shot.yieldG,tempC:temp}};}
 const center=clamp(shot.yieldG+1,5,200);
 return {title:'A small refinement',text:`Try ${(center-1).toFixed(1)}-${(center+1).toFixed(1)} g out with the same grind. Compare sweetness and clarity before making a larger change.`,next:{grindSetting:shot.grindSetting,yieldCenter:center}};
}
export function experimentChanges(s,shot,rec) {
 if(!rec?.established || rec.experimentId)return [];
 const result=[];
 for(const [key,base] of [['doseG',rec.doseG],['yieldG',rec.yield.center],['timeS',rec.time.center]]) if(Math.abs(shot[key]-base)>=CONFIG.experiment[key]-1e-8)result.push(key);
 if(finite(shot.tempC)&&finite(rec.tempC)&&Math.abs(shot.tempC-rec.tempC)>=2-1e-8)result.push('tempC');
 if(rec.grind.proven&&Math.abs(shot.grindSetting-rec.grind.value)>=grindStep(activeVersion(s))-1e-8)result.push('grindSetting');
 return result;
}
export function isExtreme(s,shot) {
 const prior=s.shots.filter(x=>!x.hidden&&x.dialedIn&&x.coffeeId===shot.coffeeId&&x.style===shot.style&&x.setupVersionId===shot.setupVersionId&&x.id!==shot.id);
 if(prior.length<4)return false;
 return Math.abs(shot.yieldG/shot.doseG-quantile(prior.map(x=>x.yieldG/x.doseG),.5))>1.25||Math.abs(shot.timeS-quantile(prior.map(x=>x.timeS),.5))>25;
}
export function saveShot(s,coffeeId,input) {
 const errors=validateShot(input);if(errors.length)throw new Error(errors.join(' '));
 const c=s.coffees.find(x=>x.id===coffeeId),set=activeSetup(s),v=activeVersion(s),p=ensureCoffeeState(s,coffeeId);
 if(!c||!v)throw new Error('Coffee or setup not found.');
 const rec=recommendation(s,coffeeId,{style:input.style,basketId:input.basketId,feedMode:input.feedMode,ignoreAdvice:true});
 const sh={id:input.id||newId('shot'),coffeeId,setupId:set.id,setupVersionId:v.id,calibrationId:v.calibrationId,basketId:input.basketId,bagId:c.activeBagId,style:input.style,timestamp:input.timestamp||now(),doseG:round(input.doseG),yieldG:round(input.yieldG),timeS:round(input.timeS),grindSetting:round(input.grindSetting),tempC:v.advanced.temperature?num(input.tempC):null,feedMode:input.feedMode,notes:String(input.notes||'').slice(0,10000),tasteScales:{...input.tasteScales},dialedIn:isDialed(input.tasteScales),snapshot:snapshot(s,coffeeId,input.basketId),hidden:false,experimentId:p.experiments[input.style]||null,usedRecommendation:input.usedRecommendation||{},revision:1};
 if(s.shots.some(x=>x.id===sh.id))return s.shots.find(x=>x.id===sh.id); // idempotent save
 const diffs=experimentChanges(s,sh,rec);sh.experimentChanges=diffs;
 sh.outlierReview=isExtreme(s,sh)?'pending':'not_needed';
 sh.suggestion=nextAdvice(s,sh,recommendation(s,coffeeId,{style:input.style,basketId:input.basketId,feedMode:input.feedMode}));
 if(sh.dialedIn)sh.familyId=assignFamily(s,sh);else sh.familyId=null;
 s.shots.push(sh);
 if(sh.dialedIn&&!p.currentFamilies[sh.style])p.currentFamilies[sh.style]=sh.familyId;
 p.style=sh.style;p.basketId=sh.basketId;
 if(v.advanced.slowFeed)v.slowFeed=sh.feedMode==='slow';
 const w=workspace(s);w.currentCoffeeId=coffeeId;w.recent[coffeeId]=now();
 logAudit(s,'shot.saved',{shotId:sh.id});return sh;
}
export function editShot(s,id,input) {
 const old=s.shots.find(x=>x.id===id);if(!old)throw new Error('Shot not found.');
 const merged={...old,...input};const errors=validateShot(merged);if(errors.length)throw new Error(errors.join(' '));
 logAudit(s,'shot.edited',{shotId:id,before:{doseG:old.doseG,yieldG:old.yieldG,timeS:old.timeS,grindSetting:old.grindSetting,tempC:old.tempC,tasteScales:{...old.tasteScales},familyId:old.familyId},previousRevision:old.revision});
 const previousFamily=old.familyId;
 for(const k of ['doseG','yieldG','timeS','grindSetting'])old[k]=round(merged[k]);
 old.tempC=num(merged.tempC);old.notes=String(merged.notes||'');old.tasteScales={...merged.tasteScales};old.dialedIn=isDialed(old.tasteScales);old.editedAt=now();old.revision++;old.familyId=null;
 if(old.dialedIn)old.familyId=assignFamily(s,old);
 old.outlierReview=isExtreme(s,old)?'pending':'not_needed';
 old.suggestion=old.dialedIn?{title:'Dialed in. Nicely done.',text:'Corrected result contributes to your successful window.',next:null}:{title:'Shot corrected',text:'Your recipe windows now reflect the corrected taste ratings.',next:null};
 for(const set of s.setups)for(const w of Object.values(set.workspaces))for(const p of Object.values(w.coffees))for(const [style,fid] of Object.entries(p.currentFamilies))if(fid===previousFamily&&!familyShots(s,fid).length){if(old.dialedIn)p.currentFamilies[style]=old.familyId;else delete p.currentFamilies[style];}
 return old;
}
export function hideShot(s,id) {const sh=s.shots.find(x=>x.id===id);if(!sh)return;sh.hidden=true;sh.hiddenAt=now();logAudit(s,'shot.hidden',{shotId:id,retainQualifyingContribution:sh.dialedIn});}
export function startExperiment(s,id) {
 const sh=s.shots.find(x=>x.id===id);if(!sh)throw new Error('Shot not found.');
 const p=ensureCoffeeState(s,sh.coffeeId);
 const e={id:newId('experiment'),coffeeId:sh.coffeeId,setupVersionId:sh.setupVersionId,style:sh.style,originalFamilyId:p.currentFamilies[sh.style]||null,status:'active',createdAt:now()};
 s.experiments.push(e);p.experiments[sh.style]=e.id;sh.experimentId=e.id;sh.experimentDecision='yes';return e;
}
export function endExperiment(s,id) {const e=s.experiments.find(x=>x.id===id);if(!e)return;e.status='ended';e.endedAt=now();const p=ensureCoffeeState(s,e.coffeeId);delete p.experiments[e.style];}
export function makeCurrent(s,shotId) {
 const sh=s.shots.find(x=>x.id===shotId);if(!sh?.dialedIn||sh.hidden)throw new Error('Choose a visible all-green shot.');
 if(sh.setupVersionId!==activeVersion(s).id)throw new Error('This is a reference from another setup. Log a successful shot here first.');
 const p=ensureCoffeeState(s,sh.coffeeId);p.currentFamilies[sh.style]=sh.familyId;p.favoriteShots[sh.familyId]=sh.id;p.style=sh.style;
 const exp=p.experiments[sh.style];if(exp)endExperiment(s,exp);logAudit(s,'recipe.preferred',{coffeeId:sh.coffeeId,familyId:sh.familyId,shotId});
}
export function contributorWeight(n) {return n<=1?1:n===2?1.2:n<=4?1.4:n<=7?1.6:n<=12?1.8:2;}
export function communitySummary(shots) {
 const valid=shots.filter(s=>s.dialedIn&&s.outlierReview!=='pending');const users=new Map();
 for(const sh of valid){const id=sh.contributorId||'local_user';if(!users.has(id))users.set(id,[]);users.get(id).push(sh);}
 let total=0,sum=0;
 const contributors=[...users.values()].map(arr=>({center:stats(arr.map(s=>s.yieldG/s.doseG)).center,weight:contributorWeight(arr.length)}));
 const centers=contributors.map(x=>x.center),median=quantile(centers,.5),mad=quantile(centers.map(x=>Math.abs(x-median)),.5);
 for(const item of contributors){const value=contributors.length>=5?clamp(item.center,median-Math.max(.1,3*mad),median+Math.max(.1,3*mad)):item.center;sum+=value*item.weight;total+=item.weight;}
 return {shotCount:valid.length,contributors:users.size,ratio:total?sum/total:null,confirmed:users.size>=2,confidence:users.size<2?'Early Data':users.size<10?'Moderate Confidence':'Strong Confidence'};
}
