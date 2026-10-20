// Alternate families from member-scoped, successful SHOT evidence only.
// Presentation is deliberately read-only except for the existing authenticated,
// version-checked Make Current Recipe mutation. No new family inference happens here.
import * as M from '../lib/model.js';
import * as E from '../lib/engine.js';
import {e,button,fmt} from '../lib/ui.js';

const singular=(n)=>n===1?'successful shot':'successful shots';

export function alternateRecipesMarkup(state,coffeeId,style,rec,{canSelect=true}={}){
 const version=M.activeVersion(state);
 if(!version||!rec?.familyId||!Number.isFinite(rec.doseG)||rec.doseG<=0)return '';
 const alternates=E.familiesFor(state,coffeeId,style)
  .filter(f=>f.id!==rec.familyId)
  .map(f=>{
   const all=E.familyShots(state,f.id).filter(sh=>sh.coffeeId===coffeeId&&sh.style===style&&
    Number.isFinite(sh.doseG)&&sh.doseG>0&&Number.isFinite(sh.yieldG));
   const local=all.filter(sh=>sh.setupVersionId===version.id);
   const ratioShots=local.length?local:all;
   const ratio=E.stats(ratioShots.map(sh=>sh.yieldG/sh.doseG),
    {singleWidth:1/rec.doseG});
   if(!ratio||!Number.isFinite(ratio.center))return null;
   const comparable=local.filter(sh=>sh.basketId===rec.basketId&&sh.feedMode===rec.feedMode);
   const time=comparable.length?E.stats(comparable.map(sh=>sh.timeS),{singleWidth:2}):null;
   const calibrated=comparable.filter(sh=>sh.calibrationId===version.calibrationId&&
    Number.isFinite(sh.grindSetting));
   const grind=calibrated.length?E.stats(calibrated.map(sh=>sh.grindSetting)):null;
   const selected=[...local].filter(sh=>!sh.cloudPending).sort((a,b)=>b.timestamp.localeCompare(a.timestamp))[0];
   return {id:f.id,all,local,ratio,time,grind,selected,comparable};
  }).filter(Boolean)
  .sort((a,b)=>Number(Boolean(b.local.length))-Number(Boolean(a.local.length))||
   b.local.length-a.local.length||a.ratio.center-b.ratio.center);
 if(!alternates.length)return '';
 const items=alternates.map(a=>{
  const count=a.local.length||a.all.length,local=Boolean(a.local.length),source=local?'on this setup':'from another setup';
  const ratioText='1:'+fmt(a.ratio.center,2);
  const hasRange=count>1&&a.ratio.high>a.ratio.low;
  const range=hasRange?' · Ratio '+fmt(a.ratio.low,2)+'–'+fmt(a.ratio.high,2):'';
  const estimate=' · ~'+fmt(a.ratio.center*rec.doseG)+' g out at '+fmt(rec.doseG)+' g in';
  const time=a.time?' · Time '+(a.comparable.length>1?
   fmt(a.time.low)+'–'+fmt(a.time.high):fmt(a.time.center))+' s':'';
  const grind=a.grind?' · Grind '+(a.grind.count>1&&a.grind.high>a.grind.low?
   fmt(a.grind.low)+'–'+fmt(a.grind.high):fmt(a.grind.center)):'';
  const caution=local?'':' · Grind and time not copied across setups';
  const action=canSelect&&a.selected?button('Make Current Recipe','make-current',
   'data-id="'+e(a.selected.id)+'" aria-label="Make '+e(ratioText)+' current recipe"',
   'ghost compact'):'';
  return '<div class="alternate-recipe"><div class="alternate-recipe-head"><strong>'+e(ratioText)+
   '</strong><span class="helper">'+count+' '+singular(count)+' '+source+'</span></div>'+
   '<p class="helper alternate-recipe-detail">'+range+estimate+time+grind+caution+'</p>'+
   action+'</div>';
 }).join('');
 return '<details class="inline-disclosure alternate-recipes" data-retain="alternate-'+e(coffeeId)+
  '-'+e(style)+'"><summary>Alternate Dialed-In Recipes ('+alternates.length+
  ')</summary><div class="alternate-recipe-list">'+items+'</div></details>';
}
