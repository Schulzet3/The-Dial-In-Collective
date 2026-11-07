import {CONFIG,RATIOS,TIMES,TEMPS,roastIndex,num,round,clamp,norm,finite,newId,now,isDialed,tastesComplete} from './constants.js';
import {activeSetup,activeVersion,workspace,coffeeState,ensureCoffeeState,selectedBasket,feedMode,snapshot,hasLocalSuccess,validateShot,logAudit} from './model.js';
import {selectCommunityPrior} from './community-evidence.js';
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
 const p=readPreference(preferences),light=roastIndex(coffee.roastLevel)>=0&&roastIndex(coffee.roastLevel)<=3;
 if(light&&p==='clarity')return {style:'Turbo',reason:'Light roast and your preference for clarity suggest a Turbo starting point.'};
 return {style:'Traditional',reason:p==='body'?'A conventional starting point for your preference for body.':'A balanced starting point; choose any style you prefer.'};
}
export function baseline(coffee,style,dose,preferences='') {
 const index=roastIndex(coffee.roastLevel),r=index<0?roastIndex('Medium'):index;
 let ratio=RATIOS[style]?.[r]??2;let time=TIMES[style]?.[r>=roastIndex('Medium-Dark')?1:0]||[25,32];let temp=TEMPS[r];
 const reasons=[];const pref=readPreference(preferences);
 if(style==='Traditional'&&coffee.roasterRecipe?.ratio>0){ratio=ratio*.35+coffee.roasterRecipe.ratio*.65;reasons.push('Starting ratio informed by the roaster recipe.');}
 if(pref&&style!=='Custom'){ratio+=pref==='clarity'?.15:-.15;reasons.push(`Ratio nudged by your preference for ${pref}.`);}
 if(index<0)reasons.push('Roast level unknown; Medium is a recipe fallback, not a coffee fact.');
 return {doseG:dose,ratio:{low:Math.max(.8,ratio-CONFIG.rangeHalfWidth),high:ratio+CONFIG.rangeHalfWidth,center:ratio},time:{low:time[0],high:time[1],center:mean(time)},tempC:temp,reasons,source:'Starting recommendation',observations:0,familyId:null,established:false};
}
// Never promote an archived/imported `dialedIn` marker into personal recipe
// evidence without verifying its five original recorded ideal ratings.
export function familyShots(s,id) {return s.shots.filter(x=>!x.hidden&&x.dialedIn===true&&isDialed(x.tasteScales)&&x.familyId===id);}
// Five green ratings do not validate malformed imported physical measurements.
// Preserve all originals in History; only measured rows inform recipe evidence.
function measuredRecipeShots(shots) {
 return shots.filter(sh=>finite(sh.doseG)&&sh.doseG>0&&
  finite(sh.yieldG)&&sh.yieldG>0&&finite(sh.yieldG/sh.doseG)&&
  finite(sh.timeS)&&sh.timeS>0);
}
export function familyStats(s,id) {
 const historical=familyShots(s,id);if(!historical.length)return null;
 const shots=measuredRecipeShots(historical);
 return {ratio:stats(shots.map(x=>x.yieldG/x.doseG),{singleWidth:1/(mean(shots.map(x=>x.doseG))||18)}),time:stats(shots.map(x=>x.timeS),{singleWidth:2}),count:shots.length,confirmed:shots.length>=2};
}
export function familiesFor(s,coffeeId,style) {return s.families.filter(f=>f.coffeeId===coffeeId&&f.style===style&&measuredRecipeShots(familyShots(s,f.id)).length);}
export function assignFamily(s,shot) {
 const ratio=shot.yieldG/shot.doseG;
 let best=null,dist=Infinity;
 for(const f of familiesFor(s,shot.coffeeId,shot.style)){
  // Keep incomplete legacy shots in History; they cannot anchor a recipe ratio.
  const value=familyStats(s,f.id)?.ratio?.center;
  if(!finite(value))continue;
  const d=Math.abs(value-ratio);
  if(d<dist&&d<=CONFIG.ratioFamilyDistance){best=f;dist=d;}
 }
 if(!best){best={id:newId('family'),coffeeId:shot.coffeeId,style:shot.style,seedRatio:ratio,createdAt:now()};s.families.push(best);}
 return best.id;
}
// Distinct successful ratio families remain internal, never merged into one range.
// Explicit favorite shots are authoritative; an automatically seeded Current is not.
function recipeHardwareTier(sh,version,basket,feed){
 if(sh.setupVersionId===version.id){
  if(sh.basketId===basket.id&&sh.feedMode===feed&&sh.calibrationId===version.calibrationId)return 6;
  if(sh.basketId===basket.id&&sh.feedMode===feed)return 5;
  if(sh.feedMode===feed&&sh.calibrationId===version.calibrationId)return 4;
  if(sh.feedMode===feed)return 3;
  return 2;
 }
 if(norm(version.grinder)&&norm(version.burrs)&&
    norm(sh.snapshot?.grinder)===norm(version.grinder)&&
    norm(sh.snapshot?.burrs)===norm(version.burrs))return 1;
 return 0;
}
export function chooseRecipeFamily(s,coffeeId,style,version,basket,feed,p=coffeeState(s,coffeeId)){
 const options=familiesFor(s,coffeeId,style).map(f=>{
  const shots=measuredRecipeShots(familyShots(s,f.id).filter(sh=>sh.coffeeId===coffeeId&&sh.style===style));
  if(!shots.length)return null;
  const tier=Math.max(...shots.map(sh=>recipeHardwareTier(sh,version,basket,feed)));
  const matched=shots.filter(sh=>recipeHardwareTier(sh,version,basket,feed)===tier);
  return {family:f,shots,tier,matched,ratio:quantile(matched.map(sh=>sh.yieldG/sh.doseG),.5)};
 }).filter(Boolean);
 if(!options.length)return null;
 const preferredId=p.currentFamilies?.[style],favoriteId=p.favoriteShots?.[preferredId];
 const manual=options.find(x=>x.family.id===preferredId&&favoriteId&&x.shots.some(sh=>
  sh.id===favoriteId&&sh.setupVersionId===version.id&&!sh.cloudPending));
 if(manual)return {...manual,basis:'manual',reason:options.length>1?'Your chosen successful recipe.':null};
 const tier=Math.max(...options.map(x=>x.tier));
 let relevant=options.filter(x=>x.tier===tier);
 // A repeated success wins over an equally compatible one-shot candidate.
 const repeated=relevant.filter(x=>x.matched.length>=2);
 if(repeated.length)relevant=repeated;
 const preference=readPreference(s.preferences);
 const spread=Math.max(...relevant.map(x=>x.ratio))-Math.min(...relevant.map(x=>x.ratio));
 let selected,basis;
 if(preference&&relevant.length>=2&&spread>=CONFIG.ratioFamilyDistance){
  selected=[...relevant].sort((a,b)=>(preference==='clarity'?b.ratio-a.ratio:a.ratio-b.ratio)||
   b.matched.length-a.matched.length||a.family.id.localeCompare(b.family.id))[0];
  basis='taste_proxy';
 }else{
  selected=[...relevant].sort((a,b)=>b.matched.length-a.matched.length||
   Number(b.family.id===preferredId)-Number(a.family.id===preferredId)||
   a.family.id.localeCompare(b.family.id))[0];
  basis='equipment_evidence';
 }
 // Five all-green ratings do NOT identify family-specific flavor. The ratio
 // direction is a transparent, low-confidence tie breaker, not measured taste.
 const reason=options.length<2?null:basis==='taste_proxy'?
  'Your '+preference+' preference slightly favors this '+
   (preference==='clarity'?'longer':'shorter')+
   '-ratio successful approach; taste differences are not verified.':
  tier>=2?'Selected from your most compatible successful setup history.':
  'Successful recipe reference from another setup; not yet proven on this setup.';
 return {...selected,basis,reason};
}

export function setupSimilarity(a,b) {
 const w=CONFIG.similarity;return Object.entries(w).reduce((sum,[key,value])=>sum+(key==='basket' ? (a.basketDoseG&&b.basketDoseG&&a.basketDoseG===b.basketDoseG?value:0) : (norm(a[key])&&norm(a[key])===norm(b[key])?value:0)),0);
}
function hardwareMatch(sh,v) {
 return sh.setupVersionId===v.id || (!!norm(v.grinder)&&!!norm(v.burrs)&&norm(sh.snapshot?.grinder)===norm(v.grinder)&&norm(sh.snapshot?.burrs)===norm(v.burrs));
}
export function grindStep(v) {return Math.max(.1,round(Math.abs(v.grinderMax-v.grinderMin)*CONFIG.grindRangeFraction));}
export function translateGrind(sh,v) {
 const old=sh.snapshot;
 // Legacy snapshots may omit one end of the recorded espresso range; do not
 // coerce null into a numeric zero or transfer across invalid calibrations.
 if(!old||!finite(sh.grindSetting)||!finite(old.grinderMin)||
    !finite(old.grinderMax)||old.grinderMax<=old.grinderMin||
    !finite(v.grinderMin)||!finite(v.grinderMax)||v.grinderMax<=v.grinderMin)return null;
 // Do not silently clip an out-of-range historical measurement to a valid
 // endpoint. Its position on that older espresso scale is not evidence.
 if(sh.grindSetting<old.grinderMin||sh.grindSetting>old.grinderMax)return null;
 const pos=(sh.grindSetting-old.grinderMin)/(old.grinderMax-old.grinderMin);
 return round(v.grinderMin+pos*(v.grinderMax-v.grinderMin));
}
export function grindGuidance(s,c,style,basket,feed,familyId=null) {
 // A legacy success flag alone is not evidence of five actually ideal ratings.
 const validSuccess=sh=>sh.dialedIn===true&&isDialed(sh.tasteScales);
 const v=activeVersion(s),qual=s.shots.filter(sh=>!sh.hidden&&validSuccess(sh)&&sh.style===style&&sh.feedMode===feed&&hardwareMatch(sh,v)&&finite(sh.grindSetting));
 // Current-calibration history outside the entered espresso range remains
  // untouched in History, but is not proven current-scale grind evidence.
  const current=qual.filter(sh=>sh.calibrationId===v.calibrationId&&
   sh.grindSetting>=v.grinderMin&&sh.grindSetting<=v.grinderMax),same=current.filter(sh=>sh.coffeeId===c.id&&(!familyId||sh.familyId===familyId));
 const basketHits=same.filter(sh=>sh.basketId===basket.id);
 if(basketHits.length)return {value:round(quantile(basketHits.map(sh=>sh.grindSetting),.5)),source:'Your successful setting',proven:true};
 if(same.length)return {value:round(quantile(same.map(sh=>sh.grindSetting),.5)),source:'Reference from your other basket or setup',proven:false};
 const cross=qual.filter(sh=>sh.coffeeId===c.id&&sh.setupVersionId!==v.id&&(!familyId||sh.familyId===familyId));
 // A matching grinder/burr set does not mean the stored dial number is on
 // today's calibration scale. Use only snapshots with two valid bounds and
 // translate their relative positions; still an unproven starting reference.
 const translatedCross=cross.map(sh=>translateGrind(sh,v)).filter(finite);
 if(translatedCross.length)return {value:round(quantile(translatedCross,.5)),
  source:'Starting reference from matching grinder and burrs (relative range estimate)',proven:false};
 const sameOld=qual.filter(sh=>sh.coffeeId===c.id&&sh.calibrationId!==v.calibrationId&&sh.setupVersionId===v.id&&(!familyId||sh.familyId===familyId));
 // Old calibration rows may legitimately seed an estimated translation, but
 // legacy rows without an equipment snapshot must not yield null guidance.
 // Legacy success records without a parseable chronological timestamp remain
 // preserved, but cannot establish the latest previous-calibration reference.
 const translated=sameOld.filter(sh=>sh.snapshot&&typeof sh.timestamp==='string'&&sh.timestamp.trim()&&
   Number.isFinite(Date.parse(sh.timestamp)))
  .sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp))
  .map(sh=>translateGrind(sh,v)).find(finite);
 if(finite(translated))return {value:translated,source:'Estimated from previous calibration',proven:false};
 const rank=roastIndex(c.roastLevel);
 const similar=current.filter(sh=>sh.coffeeId!==c.id&&rank>=0&&roastIndex(s.coffees.find(x=>x.id===sh.coffeeId)?.roastLevel)===rank);
 if(similar.length)return {value:round(quantile(similar.map(sh=>sh.grindSetting),.5)),source:`From ${similar.length} successful shot${similar.length===1?'':'s'} on your similar coffees`,proven:false};
 // Neighbor tiers may inform a strictly lower-confidence prior only when
 // one side is a NEW lightest category. Preserve five old tiers' matching.
 const nearby=current.filter(sh=>{
  const other=roastIndex(s.coffees.find(x=>x.id===sh.coffeeId)?.roastLevel);
  return sh.coffeeId!==c.id&&rank>=0&&other>=0&&Math.abs(other-rank)===1&&(rank<2||other<2);
 });
 if(nearby.length)return {value:round(quantile(nearby.map(sh=>sh.grindSetting),.5)),source:'Nearby light-roast reference, unproven on this coffee',proven:false};
 // An unproven slow-feed grind must not reuse a Standard Feed number:
 // slower feeding changes burr loading, sometimes by a large amount. Prefer
 // actual successful slow-feed shots above; transfer a per-calibration paired
 // Standard/Slow difference only when the member has measured both modes.
 const starterFraction=['Turbo','Fast-Flow'].includes(style)?.75:.5;
 if(feed==='slow'){
  const span=v.grinderMax-v.grinderMin;
  const paired=new Map();
  for(const sh of s.shots){
   if(sh.hidden||!validSuccess(sh)||sh.setupVersionId!==v.id||
      sh.calibrationId!==v.calibrationId||sh.style!==style||
      sh.basketId!==basket.id||!finite(sh.grindSetting)||
      sh.grindSetting<v.grinderMin||sh.grindSetting>v.grinderMax||
      !['standard','slow'].includes(sh.feedMode))continue;
   const row=paired.get(sh.coffeeId)||{standard:[],slow:[]};
   row[sh.feedMode].push(sh.grindSetting);paired.set(sh.coffeeId,row);
  }
  const gaps=[...paired.values()].filter(x=>x.standard.length&&x.slow.length)
   .map(x=>quantile(x.standard,.5)-quantile(x.slow,.5))
   .filter(x=>x>=.1&&x<=span);
  const shift=gaps.length?quantile(gaps,.5):span*.4;
  const standard=s.shots.filter(sh=>!sh.hidden&&validSuccess(sh)&&
   sh.setupVersionId===v.id&&sh.calibrationId===v.calibrationId&&
   sh.coffeeId===c.id&&sh.style===style&&sh.basketId===basket.id&&
   sh.feedMode==='standard'&&finite(sh.grindSetting)&&
   sh.grindSetting>=v.grinderMin&&sh.grindSetting<=v.grinderMax);
  const anchor=standard.length?quantile(standard.map(sh=>sh.grindSetting),.5):
   v.grinderMin+span*starterFraction;
  const value=round(clamp(anchor-shift,v.grinderMin,v.grinderMax));
  return {value,source:gaps.length?
   'Slow Feed starting estimate from your paired feed-mode results':
   standard.length?'Slow Feed starting estimate adjusted from your Standard Feed result':
   'Cautious Slow Feed starting estimate (not yet proven)',proven:false};
 }
 return {value:round(v.grinderMin+(v.grinderMax-v.grinderMin)*starterFraction),source:'Espresso range starting estimate',proven:false};
}
export function learnSensitivity(shots) {
 const groups=new Map();
 for(const s of shots){
  // Legacy and offline entries can be partial. Only complete measured inputs
  // with parseable instants can calibrate a grind-to-time response.
  if(!finite(s.grindSetting)||!finite(s.timeS)||s.timeS<=0||
     !finite(s.doseG)||s.doseG<=0||!finite(s.yieldG)||s.yieldG<=0||
     s.hidden||s.feedMode==null||typeof s.timestamp!=='string'||!s.timestamp.trim()||
     !Number.isFinite(Date.parse(s.timestamp)))continue;const key=[s.coffeeId,s.style,s.setupVersionId,s.calibrationId,s.basketId,s.feedMode].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
 const slopes=[];
 for(const group of groups.values()){
  group.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  for(let i=1;i<group.length;i++){
   const a=group[i-1],b=group[i],dg=b.grindSetting-a.grindSetting;
   if(Math.abs(dg)<.09||Math.abs(a.doseG-b.doseG)>.6||Math.abs(a.yieldG-b.yieldG)>3)continue;
   // A missing temperature on only one side is not a controlled comparison.
   if((a.tempC==null)!==(b.tempC==null))continue;
   if(a.tempC!=null&&(!finite(a.tempC)||!finite(b.tempC)||Math.abs(a.tempC-b.tempC)>1))continue;
   const slope=(b.timeS-a.timeS)/dg;if(slope<-.5&&slope>-1000)slopes.push(slope);
  }
 }
 return slopes.length>=2?{secondsPerUnit:quantile(slopes,.5),samples:slopes.length}:null;
}
// A historical success marker is not temperature evidence without five recorded green ratings.
function temperatureGuidance(s,c,style,v,defaultC,familyId=null) {
 const sh=s.shots.filter(sh=>!sh.hidden&&sh.dialedIn===true&&isDialed(sh.tasteScales)&&
  sh.coffeeId===c.id&&finite(sh.tempC)&&
  (sh.setupVersionId===v.id||(norm(v.machine)&&norm(sh.snapshot?.machine)===norm(v.machine))));
 if(familyId){
  const exact=sh.filter(x=>x.style===style&&x.familyId===familyId&&x.setupVersionId===v.id);
  return exact.length?mean(exact.map(x=>x.tempC)):defaultC;
 }
 const match=sh.filter(x=>x.style===style&&x.setupVersionId===v.id);
 return match.length?mean(match.map(x=>x.tempC)):defaultC;
}
// Conservative personal fallback for an unproven coffee: same equipment setup,
// shot style and known feed condition; same roast, then closer metadata and basket.
// Unverified/unsuccessful shots and community records cannot seed this reference.
export function personalSimilarCoffeeReference(s,coffee,version,style,feed,basketId){
 const targetRank=roastIndex(coffee?.roastLevel);
 if(targetRank<0)return null;
 const byId=new Map(s.coffees.map(c=>[c.id,c]));
 const matches=[],nearby=[];
 for(const sh of s.shots){
  if(sh.hidden||sh.dialedIn!==true||!isDialed(sh.tasteScales)||sh.coffeeId===coffee.id||
     sh.setupVersionId!==version.id||sh.style!==style||sh.feedMode!==feed||
     !finite(sh.yieldG)||!finite(sh.doseG)||!finite(sh.timeS)||sh.doseG<=0||
     sh.yieldG<=0||!finite(sh.yieldG/sh.doseG)||sh.timeS<=0)continue;
  const other=byId.get(sh.coffeeId);
  const rank=roastIndex(other?.roastLevel);
  if(rank<0)continue;
  const distance=Math.abs(rank-targetRank);
  if(distance>1||(distance===1&&targetRank>=2&&rank>=2))continue;
  let similarity=1;
  if(coffee.process&&other.process&&norm(coffee.process)===norm(other.process))similarity+=2;
  if(coffee.origin&&other.origin&&norm(coffee.origin)===norm(other.origin))similarity+=2;
  if(coffee.variety&&other.variety&&norm(coffee.variety)===norm(other.variety))similarity+=1;
  if(sh.basketId===basketId)similarity+=1;
  (distance===0?matches:nearby).push({sh,similarity});
 }
 const chosen=matches.length?matches:nearby;
 if(!chosen.length)return null;
 const highest=Math.max(...chosen.map(x=>x.similarity));
 const strongest=chosen.filter(x=>x.similarity>=highest-1);
 const sameBasket=strongest.filter(x=>x.sh.basketId===basketId);
 const eligible=sameBasket.length?sameBasket:strongest;
 return {ratio:quantile(eligible.map(x=>x.sh.yieldG/x.sh.doseG),.5),
  time:quantile(eligible.map(x=>x.sh.timeS),.5),
  count:eligible.length,
  coffees:new Set(eligible.map(x=>x.sh.coffeeId)).size,
  closeness:highest,nearby:!matches.length};
}
export function recommendation(s,coffeeId,options={}) {
 const c=s.coffees.find(c=>c.id===coffeeId),v=activeVersion(s),p=coffeeState(s,coffeeId);
 if(!c||!v)return null;
 const style=options.style||p.style,basket=v.baskets.find(x=>x.id===options.basketId)||selectedBasket(s,coffeeId),feed=options.feedMode||feedMode(v);
 const rec=baseline(c,style,basket.doseG,s.preferences);
 if(style==='Custom'&&p.custom){rec.ratio={low:p.custom.ratioLow,high:p.custom.ratioHigh,center:(p.custom.ratioLow+p.custom.ratioHigh)/2};rec.time={low:p.custom.timeLow,high:p.custom.timeHigh,center:(p.custom.timeLow+p.custom.timeHigh)/2};rec.reasons=[];}
 // Section 25.2 tier 5: personal success on similar coffees from THIS setup.
 // Do not override more relevant exact-coffee successful family data or the
 // higher-priority same-coffee cross-style evidence.
 // Imported success markers cannot suppress or transfer style evidence without all five original ideal scores.
 const exactOther=s.shots.some(sh=>!sh.hidden&&sh.dialedIn===true&&isDialed(sh.tasteScales)&&sh.coffeeId===coffeeId&&sh.setupVersionId===v.id&&sh.style!==style&&sh.style!=='Custom');
 // For Fast-Flow, comparable same-style successes outrank a Turbo cross-style fallback.
 const provisional=style==='Custom'||(exactOther&&style!=='Fast-Flow')?null:personalSimilarCoffeeReference(s,c,v,style,feed,basket.id);
 const familyChoice=chooseRecipeFamily(s,coffeeId,style,v,basket,feed,p);
 const chosen=familyChoice?.family||null;
 const peer=style==='Custom'||chosen||(exactOther&&style!=='Fast-Flow')?null:
  selectCommunityPrior(s.communityEvidence?.[coffeeId]?.[style],style);
 // Community exact release and related release outrank personal similar coffee;
 // personal similar outranks Community similar. No cross-style time/grind copying.
 const peerFirst=peer&&(peer.tierNumber<=4||!provisional);
 if(!chosen&&peerFirst){
  const confidence=(peer.tier==='exact'?.4:peer.tier==='related_release'?.22:.10)*
   Math.min(1,.45+.12*Math.min(peer.contributorCount,4));
  const ratio=round(rec.ratio.center+(peer.ratio-rec.ratio.center)*confidence,2);
  const time=round(rec.time.center+(peer.time-rec.time.center)*confidence);
  const rHalf=(rec.ratio.high-rec.ratio.low)/2,tHalf=(rec.time.high-rec.time.low)/2;
  rec.ratio={low:round(Math.max(.8,ratio-rHalf),2),center:ratio,high:round(ratio+rHalf,2)};
  rec.time={low:round(Math.max(1,time-tHalf)),center:time,high:round(time+tHalf)};
  rec.source='Unproven '+peer.tier.replaceAll('_',' ')+' Community starting reference';
  rec.communityEvidence={tier:peer.tier,shotCount:peer.shotCount,contributorCount:peer.contributorCount,
   ratioFamiliesAreEstimated:true,grindCalibrated:false};
  rec.reasons.unshift('Cautious '+peer.tier.replaceAll('_',' ')+' Community starting reference from '+
    peer.contributorCount+' independent contributor'+(peer.contributorCount===1?'':'s')+
    ' and '+peer.shotCount+' eligible '+style+' shot'+(peer.shotCount===1?'':'s')+
    '; not proven on your equipment.');
 }
 if(!chosen&&!peerFirst&&provisional){
  // Conservative shrinkage toward the existing roast/style prior avoids
  // treating a small number of similar coffees as an exact recipe.
  const weight=Math.min(.5,.16+.07*Math.min(provisional.count,3)+.025*Math.max(0,provisional.closeness-1))*(provisional.nearby?.5:1);
  const ratioCenter=round(rec.ratio.center+(provisional.ratio-rec.ratio.center)*weight,2);
  const ratioHalf=(rec.ratio.high-rec.ratio.low)/2;
  rec.ratio={low:round(Math.max(.8,ratioCenter-ratioHalf),2),center:ratioCenter,high:round(ratioCenter+ratioHalf,2)};
  const timeCenter=round(rec.time.center+(provisional.time-rec.time.center)*weight);
  const timeHalf=(rec.time.high-rec.time.low)/2;
  rec.time={low:round(Math.max(1,timeCenter-timeHalf)),center:timeCenter,high:round(timeCenter+timeHalf)};
  rec.source='Your successful similar coffees on this setup';
  rec.observations=provisional.count;
  rec.established=false;
  rec.reasons.unshift(provisional.nearby?`Cautious starting reference from ${provisional.count} successful ${style} shot${provisional.count===1?'':'s'} on nearby light-roast coffees; not proven for ${c.roastLevel}.`:`Starting reference from ${provisional.count} successful ${style} shot${provisional.count===1?'':'s'} on ${provisional.coffees} similar ${c.roastLevel} coffee${provisional.coffees===1?'':'s'} on this setup.`);
 }
 if(chosen){
  const all=familyChoice.shots,local=all.filter(sh=>sh.setupVersionId===v.id);
  const basketFeed=local.filter(sh=>sh.basketId===basket.id&&sh.feedMode===feed);
  const feedLocal=local.filter(sh=>sh.feedMode===feed);
  // Differences in time or temperature at the SAME ratio are observations,
  // not proof of a second recipe. Do not invent a time/temperature threshold.
  const comparable=basketFeed.filter(sh=>sh.calibrationId===v.calibrationId);
  const ratios=new Set(comparable.map(sh=>String(sh.yieldG/sh.doseG)));
  const differingTime=new Set(comparable.map(sh=>sh.timeS)).size>1;
  const differingTemp=new Set(comparable.map(sh=>sh.tempC==null?'unspecified':sh.tempC)).size>1;
  const unprovenNonRatioVariation=comparable.length>=2&&ratios.size===1&&(differingTime||differingTemp);
  const ratioEvidence=basketFeed.length?basketFeed:feedLocal.length?feedLocal:local.length?local:all;
  rec.ratio=stats(ratioEvidence.map(x=>x.yieldG/x.doseG),{singleWidth:CONFIG.singleYieldHalfWidth/basket.doseG});
  // Time from another setup, basket or feed must not masquerade as local proof.
  if(comparable.length)rec.time=stats(comparable.map(x=>x.timeS),{singleWidth:CONFIG.singleTimeHalfWidth});
  rec.familyId=chosen.id;rec.observations=ratioEvidence.length;rec.established=local.length>0;
  rec.source=local.length?'Your dialed in window':'Starting reference from your other setup';
  rec.familySelection={basis:familyChoice.basis,candidates:familiesFor(s,coffeeId,style).length,
   equipmentTier:familyChoice.tier,reason:familyChoice.reason,
    sameRatioNonRatioVariation:unprovenNonRatioVariation,
    nonRatioSignificance:unprovenNonRatioVariation?'unproven':'not_indicated'};
  rec.reasons=familyChoice.reason?[familyChoice.reason]:local.length?[]:
   ['Your successful ratio from another setup; time and grind remain starting estimates.'];
 } else if(style==='Fast-Flow'&&!provisional&&!peerFirst) {
  // Only closely compatible Turbo success can weakly inform the STARTING ratio.
  // Never import its measured time, grind, family, confirmation or shot count.
  const turbo=s.shots.filter(sh=>!sh.hidden&&sh.dialedIn===true&&isDialed(sh.tasteScales)&&sh.style==='Turbo'&&
   sh.coffeeId===coffeeId&&sh.setupVersionId===v.id&&sh.basketId===basket.id&&
   sh.feedMode===feed&&finite(sh.doseG)&&sh.doseG>0&&finite(sh.yieldG)&&
   finite(sh.timeS)&&sh.timeS>=8&&sh.timeS<=20&&
   sh.yieldG/sh.doseG>=1.8&&sh.yieldG/sh.doseG<=3.2);
  if(turbo.length){
   const r=roastIndex(c.roastLevel)<0?roastIndex('Medium'):roastIndex(c.roastLevel);
   const residual=mean(turbo.map(sh=>sh.yieldG/sh.doseG-RATIOS.Turbo[r]));
   const bias=clamp(residual*.2,-.12,.12);
   for(const k of ['low','center','high'])rec.ratio[k]=round(rec.ratio[k]+bias,2);
   rec.source='Unproven Fast-Flow starting estimate';
   rec.turboFallback={style:'Turbo',compatibleShots:turbo.length,ratioOnly:true};
   rec.reasons.unshift('Cautious ratio-only reference from '+turbo.length+' compatible Turbo shot'+(turbo.length===1?'':'s')+'; Fast-Flow time, grind and success remain independent.');
  }
 } else if(!peerFirst&&style!=='Custom'&&style!=='Fast-Flow') {
  // Weak residual only for legacy styles. Fast-Flow never shares this generic cross-style path.
  // Archived five-green taste ratings do not validate malformed measured
  // dose/yield/time. Only genuinely measured ratios may weakly bias another
  // style's starting ratio; no cross-style time or grind transfer.
  const other=s.shots.filter(sh=>!sh.hidden&&sh.dialedIn===true&&isDialed(sh.tasteScales)&&
   sh.coffeeId===coffeeId&&sh.style!==style&&sh.style!=='Fast-Flow'&&
   sh.style!=='Custom'&&RATIOS[sh.style]&&
   finite(sh.doseG)&&sh.doseG>0&&finite(sh.yieldG)&&sh.yieldG>0&&
   finite(sh.yieldG/sh.doseG)&&finite(sh.timeS)&&sh.timeS>0);
  if(other.length){const r=roastIndex(c.roastLevel)<0?roastIndex('Medium'):roastIndex(c.roastLevel);const residual=mean(other.map(sh=>sh.yieldG/sh.doseG-RATIOS[sh.style][r]));const bias=clamp(residual*.2,-.15,.15);for(const k of ['low','high','center'])rec.ratio[k]+=bias;rec.reasons.push('Small ratio adjustment informed by your other styles; time and grind stay style-specific.');}
 }
 rec.grind=grindGuidance(s,c,style,basket,feed,rec.familyId);
 rec.tempC=temperatureGuidance(s,c,style,v,rec.tempC,rec.familyId);
 rec.style=style;rec.basketId=basket.id;rec.feedMode=feed;
 rec.yield={low:round(rec.ratio.low*rec.doseG),high:round(rec.ratio.high*rec.doseG),center:round(rec.ratio.center*rec.doseG)};
 // Successful shot families are chosen independently of any retired Experiment workflow.
 const last=s.shots.filter(sh=>!sh.hidden&&sh.coffeeId===coffeeId&&sh.setupVersionId===v.id&&sh.style===style&&sh.basketId===basket.id&&sh.feedMode===feed&&sh.calibrationId===v.calibrationId&&typeof sh.timestamp==='string'&&sh.timestamp.trim()&&Number.isFinite(Date.parse(sh.timestamp))).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp))[0];
 if(!options.ignoreAdvice&&last&&!hasLocalSuccess(s,coffeeId,style)){
  // Keep the recipe card consistent with fresh taste feedback, even before a
  // derived suggestion is cached (e.g. immediately after an offline shot).
  const cached=last.suggestion;
  // Legacy evenness feedback stored unchanged controls as 'next'; re-evaluate
  // without mutating the original shot or its stored suggestion.
  const oldNoOp=cached?.next&&cached.next.grindSetting===last.grindSetting&&
   cached.next.yieldCenter===last.yieldG&&
   (cached.next.tempC==null||cached.next.tempC===last.tempC);
  // Re-evaluate legacy cached +1/+2 g proposals for the displayed next recipe
  // without rewriting the historical shot or its original suggestion.
  const oldSmallYield=cached?.next&&finite(cached.next.yieldCenter)&&
   finite(last.yieldG)&&cached.next.grindSetting===last.grindSetting&&
   (cached.next.tempC==null||cached.next.tempC===last.tempC)&&
   Math.abs(cached.next.yieldCenter-last.yieldG)>1e-8&&
   Math.abs(cached.next.yieldCenter-last.yieldG)<meaningfulYieldStep(last);
  const a=(oldNoOp||oldSmallYield)?nextAdvice(s,last,rec):cached||nextAdvice(s,last,rec);
  if(a.next||a.kind==='diagnostic'){
   // An applied next-shot adjustment keeps every other measured control
   // steady. Do not silently reset dose/temperature to starting defaults.
   // The owner-Locked Dose caption remains unchanged; the initial starting
   // recipe above still uses basket dose, while this adjustment uses actuals.
   const diagnostic=a.kind==='diagnostic';
   rec.reasons=diagnostic?['Review distribution and tamp consistency before changing a setting.']:[];
   rec.source=diagnostic?'Your last measured shot (preparation check)':'Adjustment from your latest taste rating';
   rec.diagnosticOnly=diagnostic;
   rec.doseG=a.next?.doseG??last.doseG;
   rec.tempC=a.next?.tempC??last.tempC??null;
   rec.grind={value:a.next?.grindSetting??last.grindSetting,
    source:diagnostic?'Last measured grind; no change suggested':'Next setting to try',proven:false};
   const nextYield=a.next?.yieldCenter??last.yieldG;
   rec.yield={low:Math.max(5,round(nextYield-1)),high:round(nextYield+1),center:round(nextYield)};
   rec.ratio={low:rec.yield.low/rec.doseG,high:rec.yield.high/rec.doseG,center:rec.yield.center/rec.doseG};
  }
 }
 // Every recommendation is a selectable tenth inside this setup's actual
 // espresso range. The guard also protects older measurements and fallbacks.
 if(rec.grind&&finite(rec.grind.value))rec.grind.value=clamp(round(rec.grind.value),v.grinderMin,v.grinderMax);
 if(!rec.established&&!rec.diagnosticOnly&&!rec.grind?.proven&&finite(rec.grind?.value)&&rec.source!=='Adjustment from your latest taste rating'){
  const step=grindStep(v);
  // A calibrated starting search band is NOT a statistical confidence interval.
  // A pure espresso-scale heuristic is intentionally less precise than personal evidence.
  const half=rec.grind.source==='Espresso range starting estimate'?step*2:step;
  const lo=Math.min(v.grinderMin,v.grinderMax),hi=Math.max(v.grinderMin,v.grinderMax);
  const low=round(clamp(rec.grind.value-half,lo,hi)),high=round(clamp(rec.grind.value+half,lo,hi));
  if(low<high)rec.grind.range={low,high};
 }
 return rec;
}
export function prefill(s,coffeeId,options={}) {
 const v=activeVersion(s),p=coffeeState(s,coffeeId),basket=v.baskets.find(x=>x.id===options.basketId)||selectedBasket(s,coffeeId),style=options.style||p.style,feed=options.feedMode||feedMode(v);
 const shots=s.shots.filter(x=>!x.hidden&&x.coffeeId===coffeeId&&x.setupVersionId===v.id&&typeof x.timestamp==='string'&&x.timestamp.trim()&&Number.isFinite(Date.parse(x.timestamp))).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
 // Imported archival measurements remain in History but cannot prefill an
 // impossible dose or an out-of-espresso-range grind into a new shot.
 const [minDose,maxDose]=CONFIG.bounds.doseG;
 const doses=shots.filter(x=>x.basketId===basket.id&&finite(x.doseG)&&x.doseG>=minDose&&x.doseG<=maxDose),
  grinds=shots.filter(x=>x.basketId===basket.id&&x.style===style&&x.feedMode===feed&&x.calibrationId===v.calibrationId&&
   finite(x.grindSetting)&&x.grindSetting>=v.grinderMin&&x.grindSetting<=v.grinderMax);
 const temps=shots.filter(x=>finite(x.tempC)),same=temps.find(x=>x.style===style),temp=same||temps[0];
 return {doseG:doses[0]?.doseG??basket.doseG,yieldG:'',timeS:'',grindSetting:grinds[0]?.grindSetting??'',tempC:v.advanced.temperature?(temp?.tempC??null):null,tempSource:temp&&temp.style!==style?`Last used on ${temp.style}`:'',style,basketId:basket.id,feedMode:feed,tasteScales:{extraction:null,body:null,clarity:null,sweetness:null,astringency:null},notes:''};
}

 // Owner-approved measured-yield exploration (2026-11-04, #455).
 // Five grams is a product experiment step for a typical 36 g double, NOT a
 // scientific perceptibility threshold. Proportionate short yields by ~5/36.
function meaningfulYieldStep(shot){
 const yieldG=shot.yieldG;
 return yieldG>=36?5:Math.max(1,Math.min(5,Math.round(yieldG*5/36)));
}
function yieldTarget(shot,direction,anchor=shot.yieldG){
 const target=round(anchor+direction*meaningfulYieldStep(shot));
 return target>=5&&target<=200&&
  Math.abs(target-shot.yieldG)+1e-8>=meaningfulYieldStep(shot)?target:null;
}
// Directional hints must come from earlier measured *same-coffee* shots with
// unchanged setup, calibration, style, basket, feed, dose, grind, temperature
// and all four other green sensory ratings. This is not causal proof.
function comparableSweetnessYields(s,shot){
 const keys=['coffeeId','setupVersionId','calibrationId','style','basketId','feedMode'];
 // ISO timestamps with explicit offsets must be ordered by actual instants,
 // not by lexical text; an invalid legacy date cannot establish chronology.
 const shotAt=typeof shot.timestamp==='string'?Date.parse(shot.timestamp):NaN;
 if(keys.some(key=>shot[key]==null)||!Number.isFinite(shotAt))return [];
 return s.shots.filter(prior=>{
  if(prior.id===shot.id||prior.hidden||keys.some(key=>prior[key]!==shot[key]))return false;
  const priorAt=typeof prior.timestamp==='string'?Date.parse(prior.timestamp):NaN;
  if(!Number.isFinite(priorAt)||priorAt>=shotAt)return false;
  // An archived taste observation is not valid measured-yield evidence when
  // its dose/yield is zero, negative, nonnumeric or has an overflowing ratio.
  if(!finite(prior.doseG)||prior.doseG<=0||
   !finite(prior.grindSetting)||!finite(prior.yieldG)||prior.yieldG<=0||
   !finite(prior.yieldG/prior.doseG)||
   Math.abs(prior.doseG-shot.doseG)>.1||
   Math.abs(prior.grindSetting-shot.grindSetting)>.05||
   Math.abs(prior.yieldG-shot.yieldG)<meaningfulYieldStep(shot))return false;
  const bothUnknown=prior.tempC==null&&shot.tempC==null;
  if(!bothUnknown&&!(finite(prior.tempC)&&finite(shot.tempC)&&
   Math.abs(prior.tempC-shot.tempC)<=.1))return false;
  const t=prior.tasteScales;
  return tastesComplete(t)&&t.extraction===3&&t.body===3&&
   t.clarity===5&&t.astringency===1;
 });
}
function sweetnessOnlyYieldAdvice(s,shot){
 const comparisons=comparableSweetnessYields(s,shot);
 const signals=comparisons.map(prior=>{
  const change=prior.tasteScales.sweetness-shot.tasteScales.sweetness;
  return change===0?0:Math.sign(change)*Math.sign(prior.yieldG-shot.yieldG);
 }).filter(Boolean);
 if(signals.some(x=>x!==signals[0]))return {
  title:'Compare your sweetness results',
  text:'Comparable shots point in conflicting yield directions. Review your taste notes before choosing another single adjustment.',
  next:null
 };
 let direction=signals.length?signals[0]:1,anchor=shot.yieldG,basis=signals.length?'observed':'exploratory';
 if(!signals.length){
  const flat=comparisons.filter(x=>x.tasteScales.sweetness===shot.tasteScales.sweetness);
  const sides=new Set(flat.map(x=>Math.sign(x.yieldG-shot.yieldG)));
  if(sides.size>1)return {
   title:'Review your yield experiments',
   text:'Comparable longer and shorter yields both gave the same sweetness rating. No supported next yield direction; compare the other taste notes before changing a control.',
   next:null
  };
  if(flat.length){
   direction=[...sides][0];
   anchor=direction<0?Math.min(...flat.map(x=>x.yieldG)):Math.max(...flat.map(x=>x.yieldG));
   basis='plateau';
  }
 }
 const center=yieldTarget(shot,direction,anchor);
 if(center==null)return {title:'Review before adjusting',
  text:'The next meaningful yield experiment would exceed the allowed 5–200 g range. Keep the original shot and compare its taste notes.',
  next:null};
 const longer=center>shot.yieldG;
 const detail=basis==='observed'?
  'Earlier comparable same-coffee ratings suggest this yield direction, but do not prove causation. Compare all five ratings.':
  basis==='plateau'?
  'A comparable earlier yield had the same sweetness rating. This exploratory trial checks beyond that earlier setting; compare all five ratings.':
  'Exploratory starting step, not a proven sweetness fix. Compare all five ratings after this shot.';
 return {title:longer?'Explore a longer yield':'Explore a shorter yield',
  text:'Try '+center.toFixed(1)+' g out with dose, grind and temperature unchanged. Then compare all five taste ratings.',
  evidenceNote:detail,
  next:{grindSetting:shot.grindSetting,yieldCenter:center}};
}

function nextAdviceRaw(s,shot,rec) {
 const v=activeVersion(s),t=shot.tasteScales;
 if(!tastesComplete(t))return {title:'Finish your taste ratings',text:'Rate all five sensory qualities before using taste feedback to adjust the next shot.',next:null};
 if(isDialed(t))return {title:'Dialed in. Nicely done.',text:'Balanced, sweet and clean for your taste. This shot adds to your successful recipe window.',next:null};
 const step=grindStep(v),fast=shot.timeS<rec.time.low,slow=shot.timeS>rec.time.high;
 const direction=t.extraction<3?'finer':t.extraction>3?'coarser':null;
 if(t.astringency>=3 || t.clarity<=2) return {title:'Check evenness first',text:'Try distributing the grounds more evenly while keeping tamp and recipe settings unchanged. Dryness or muddled flavors can have more than one cause.',kind:'diagnostic',next:null};
 if((direction==='finer'&&fast)||(direction==='coarser'&&slow)){
  // The response of another bean is not a calibrated response for this coffee.
  // Roast/processing/PSD and puck permeability can differ even on one grinder.
  // Use the existing bounded fixed step when this exact coffee has too few
  // controlled same-calibration, same-style, same-feed, same-basket pairs.
  const exact=s.shots.filter(x=>x.coffeeId===shot.coffeeId&&
   x.setupVersionId===shot.setupVersionId&&x.calibrationId===shot.calibrationId&&
   x.feedMode===shot.feedMode&&x.style===shot.style&&x.basketId===shot.basketId);
  const sens=learnSensitivity(exact);
  let move=step;if(sens){move=Math.max(.1,round(Math.min(step*4,Math.abs((rec.time.center-shot.timeS)/sens.secondsPerUnit))));}
  const val=clamp(round(shot.grindSetting+(direction==='finer'?-move:move)),v.grinderMin,v.grinderMax);
  if(val!==shot.grindSetting)return {title:`Try a little ${direction}`,text:`Try grind ${val.toFixed(1)}. Keep dose and yield similar, then taste again.${sens?' Sized from your own comparable adjustments.':''}`,next:{grindSetting:val,yieldCenter:shot.yieldG}};
 }
 if(t.extraction!==3){
  const center=yieldTarget(shot,t.extraction<3?1:-1);
  if(center==null)return {title:'Check your extraction',text:'A meaningful yield change would exceed the allowed 5–200 g limit. Keep this shot as recorded.',next:null};
  return {title:t.extraction<3?'Try a longer yield':'Try a shorter yield',
   text:'Aim around '+center.toFixed(1)+' g out with dose and grind unchanged. Compare the balance.',
   next:{grindSetting:shot.grindSetting,yieldCenter:center}};
 }
 if(t.body!==3){
  const center=yieldTarget(shot,t.body<3?-1:1);
  if(center==null)return {title:'Check your texture',text:'A meaningful yield change would exceed the allowed 5–200 g limit. Keep this shot as recorded.',next:null};
  return {title:t.body<3?'Try more concentration':'Try opening up the texture',
   text:'Keep dose and grind steady; aim around '+center.toFixed(1)+' g out. Let taste decide.',
   next:{grindSetting:shot.grindSetting,yieldCenter:center}};
 }
 if(t.astringency>1&&v.advanced.temperature&&finite(shot.tempC)&&shot.tempC>70){const temp=clamp(shot.tempC-1,70,100);return {title:'Try a small temperature change',text:'Try about 1 degree C (2 degrees F) cooler while keeping the other variables steady.',next:{grindSetting:shot.grindSetting,yieldCenter:shot.yieldG,tempC:temp}};}
 if(t.extraction===3&&t.body===3&&t.clarity===5&&t.astringency===1&&t.sweetness<5)
  return sweetnessOnlyYieldAdvice(s,shot);
 const center=yieldTarget(shot,1);
 if(center==null)return {title:'Review before adjusting',
  text:'A meaningful yield experiment would exceed the allowed 5–200 g limit. Keep the original recipe unchanged.',next:null};
 return {title:'Explore a small refinement',
  text:'Try '+center.toFixed(1)+' g out with the same grind; compare all five ratings.',
  evidenceNote:'Exploratory yield step, not a proven fix for these ratings. Compare all five ratings.',
  next:{grindSetting:shot.grindSetting,yieldCenter:center}};
}
// Applies to every next-shot advice path, including non-grind taste advice
// which retains the last shot's setting even when history used an old range.
export function nextAdvice(s,shot,rec){
 const advice=nextAdviceRaw(s,shot,rec),v=activeVersion(s);
 if(!v||!advice?.next||!finite(advice.next.grindSetting))return advice;
 return {...advice,next:{...advice.next,
  grindSetting:clamp(round(advice.next.grindSetting),v.grinderMin,v.grinderMax)}};
}
export function isExtreme(s,shot) {
 // Incomplete imported measurements remain in History, but cannot establish
 // the four measured reference shots or median for an outlier prompt.
 const prior=s.shots.filter(x=>!x.hidden&&x.dialedIn===true&&isDialed(x.tasteScales)&&
  x.coffeeId===shot.coffeeId&&x.style===shot.style&&
  x.setupVersionId===shot.setupVersionId&&x.id!==shot.id&&
  finite(x.doseG)&&x.doseG>0&&finite(x.yieldG)&&x.yieldG>0&&
  finite(x.yieldG/x.doseG)&&finite(x.timeS)&&x.timeS>0);
 if(prior.length<4)return false;
 return Math.abs(shot.yieldG/shot.doseG-quantile(prior.map(x=>x.yieldG/x.doseG),.5))>1.25||Math.abs(shot.timeS-quantile(prior.map(x=>x.timeS),.5))>25;
}
export function saveShot(s,coffeeId,input,{allowLegacyCustom=false}={}) {
 const errors=validateShot(input,{allowLegacyCustom});if(errors.length)throw new Error(errors.join(' '));
 const c=s.coffees.find(x=>x.id===coffeeId),set=activeSetup(s),v=activeVersion(s),p=ensureCoffeeState(s,coffeeId);
 if(!c||!v)throw new Error('Coffee or setup not found.');
 const sh={id:input.id||newId('shot'),coffeeId,setupId:set.id,setupVersionId:v.id,calibrationId:v.calibrationId,basketId:input.basketId,style:input.style,timestamp:input.timestamp||now(),doseG:round(input.doseG),yieldG:round(input.yieldG),timeS:round(input.timeS),grindSetting:round(input.grindSetting),tempC:v.advanced.temperature?num(input.tempC):null,feedMode:input.feedMode,notes:String(input.notes||''),tasteScales:{...input.tasteScales},dialedIn:isDialed(input.tasteScales),snapshot:snapshot(s,coffeeId,input.basketId),hidden:false,usedRecommendation:input.usedRecommendation||{},revision:1};
 if(s.shots.some(x=>x.id===sh.id))return s.shots.find(x=>x.id===sh.id); // idempotent save
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
 const merged={...old,...input};const errors=validateShot(merged,{allowLegacyCustom:old.style==='Custom'});if(errors.length)throw new Error(errors.join(' '));
 logAudit(s,'shot.edited',{shotId:id,before:{doseG:old.doseG,yieldG:old.yieldG,timeS:old.timeS,grindSetting:old.grindSetting,tempC:old.tempC,tasteScales:{...old.tasteScales},familyId:old.familyId},previousRevision:old.revision});
 const previousFamily=old.familyId;
 for(const k of ['doseG','yieldG','timeS','grindSetting'])old[k]=round(merged[k]);
 old.tempC=num(merged.tempC);old.notes=String(merged.notes||'');old.tasteScales={...merged.tasteScales};old.dialedIn=isDialed(old.tasteScales);old.editedAt=now();old.revision++;old.familyId=null;
 if(old.dialedIn)old.familyId=assignFamily(s,old);
 old.outlierReview=isExtreme(s,old)?'pending':'not_needed';
 old.suggestion=old.dialedIn?{title:'Dialed in. Nicely done.',text:'Corrected result contributes to your successful window.',next:null}:{title:'Shot corrected',text:'Your recipe windows now reflect the corrected taste ratings.',next:null};
 // A deliberate Make Current choice follows the SAME corrected successful shot,
 // rather than silently becoming an automatic preference for another family.
 // If that shot is no longer successful, release the invalid manual favorite.
 for(const set of s.setups)for(const w of Object.values(set.workspaces))for(const p of Object.values(w.coffees)){
  for(const [style,fid] of Object.entries(p.currentFamilies)){
   if(fid!==previousFamily||style!==old.style)continue;
   if(p.favoriteShots?.[fid]===id){
    if(old.dialedIn&&old.familyId===fid)continue;
    delete p.favoriteShots[fid];
    if(old.dialedIn){p.currentFamilies[style]=old.familyId;p.favoriteShots[old.familyId]=id;}
    else delete p.currentFamilies[style];
   }else if(!familyShots(s,fid).length){
    if(old.dialedIn)p.currentFamilies[style]=old.familyId;
    else delete p.currentFamilies[style];
   }
  }
 }
 return old;
}
export function hideShot(s,id) {const sh=s.shots.find(x=>x.id===id);if(!sh)return;sh.hidden=true;sh.hiddenAt=now();logAudit(s,'shot.hidden',{shotId:id,retainQualifyingContribution:sh.dialedIn});}
export function makeCurrent(s,shotId) {
 const sh=s.shots.find(x=>x.id===shotId);if(sh?.dialedIn!==true||!isDialed(sh.tasteScales)||sh.hidden)throw new Error('Choose a visible all-green shot.');
 if(sh.setupVersionId!==activeVersion(s).id)throw new Error('This is a reference from another setup. Log a successful shot here first.');
 const p=ensureCoffeeState(s,sh.coffeeId);p.currentFamilies[sh.style]=sh.familyId;p.favoriteShots[sh.familyId]=sh.id;p.style=sh.style;
 logAudit(s,'recipe.preferred',{coffeeId:sh.coffeeId,familyId:sh.familyId,shotId});
}
export function contributorWeight(n) {return n<=1?1:n===2?1.2:n<=4?1.4:n<=7?1.6:n<=12?1.8:2;}
export function communitySummary(shots) {
 // Only physically measured, finite, positive dose/yield ratios can support a
 // contributor statistic. Keep malformed historical records untouched in History.
 const valid=shots.filter(s=>s.dialedIn===true&&isDialed(s.tasteScales)&&s.outlierReview!=='pending'&&
  finite(s.doseG)&&s.doseG>0&&finite(s.yieldG)&&s.yieldG>0&&finite(s.yieldG/s.doseG));const users=new Map();
 for(const sh of valid){const id=sh.contributorId||'local_user';if(!users.has(id))users.set(id,[]);users.get(id).push(sh);}
 let total=0,sum=0;
 const contributors=[...users.values()].map(arr=>({center:stats(arr.map(s=>s.yieldG/s.doseG)).center,weight:contributorWeight(arr.length)}));
 const centers=contributors.map(x=>x.center),median=quantile(centers,.5),mad=quantile(centers.map(x=>Math.abs(x-median)),.5);
 for(const item of contributors){const value=contributors.length>=5?clamp(item.center,median-Math.max(.1,3*mad),median+Math.max(.1,3*mad)):item.center;sum+=value*item.weight;total+=item.weight;}
 return {shotCount:valid.length,contributors:users.size,ratio:total?sum/total:null,confirmed:users.size>=2,confidence:users.size<2?'Early Data':users.size<10?'Moderate Confidence':'Strong Confidence'};
}
