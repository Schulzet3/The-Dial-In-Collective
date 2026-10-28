import * as M from '../lib/model.js';
import * as C from '../lib/constants.js';
import * as E from '../lib/engine.js';
const number=x=>x==null?null:Number(x);
const rows=(raw,key)=>Array.isArray(raw?.[key])?raw[key]:[];
// First-match and row-order semantics stay intact; lookups no longer scan every dataset repeatedly.
const groupBy=(items,key)=>{const result=new Map();for(const item of items){const k=item[key];if(!result.has(k))result.set(k,[]);result.get(k).push(item);}return result;};
const firstBy=(items,key)=>{const result=new Map();for(const item of items)if(!result.has(item[key]))result.set(item[key],item);return result;};
export function hydrate(raw){
 const s=M.blankState();s.theme=raw.preferences?.theme||'system';s.preferences=raw.preferences?.tasting_preferences||'';s.activeSetupId=raw.preferences?.active_setup_id||null;
 const versionsBySetup=groupBy(rows(raw,'versions'),'setup_id'),
  prefsByVersion=firstBy(rows(raw,'setupPreferences'),'setup_version_id'),
  calibrationsBySetup=groupBy(rows(raw,'calibrations'),'setup_id'),
  basketsBySetup=groupBy(rows(raw,'basketVersions'),'setup_id'),
  basketById=firstBy(rows(raw,'baskets'),'id'),
  workspaceByVersion=firstBy(rows(raw,'workspaces'),'setup_version_id'),
  coffeesByVersion=groupBy(rows(raw,'workspaceCoffees'),'setup_version_id'),
  recipesByVersion=groupBy(rows(raw,'recipePreferences'),'setup_version_id'),
  coffeeById=firstBy(rows(raw,'coffees'),'id'),
  submissionById=firstBy(rows(raw,'submissions'),'id'),
  noteByShot=firstBy(rows(raw,'notes'),'shot_id');
 for(const setup of rows(raw,'setups')){
  const versions=(versionsBySetup.get(setup.id)||[]).map(v=>{
   const pref=prefsByVersion.get(v.id)||{};
   const calibrations=(calibrationsBySetup.get(setup.id)||[]).filter(g=>g.grinder_model===v.grinder_model&&g.burr_set===v.burr_set);
   const g=calibrations.find(g=>g.id===pref.calibration_id)||calibrations.at(-1)||{};
   const baskets=(basketsBySetup.get(setup.id)||[]).map(b=>{const meta=basketById.get(b.basket_id)||{};return {id:b.id,logicalId:b.basket_id,doseG:number(b.basket_dose_g),name:meta.name||'Basket',archived:!!meta.archived_at,createdAt:b.created_at};});
   return {id:v.id,label:v.label,createdAt:v.created_at,machine:v.machine_model||'',grinder:v.grinder_model||'',burrs:v.burr_set||'',grinderMin:number(g.finest_setting),grinderMax:number(g.coarsest_setting),calibrationId:g.id,calibrations:calibrations.map(g=>({id:g.id,min:number(g.finest_setting),max:number(g.coarsest_setting),at:g.created_at})),baskets,defaultBasketId:pref.default_basket_version_id,tempUnit:pref.temperature_unit||'F',advanced:{temperature:!!pref.track_temperature,slowFeed:!!pref.track_slow_feed,baskets:!!pref.multiple_baskets},slowFeed:!!pref.slow_feed};
  });
  const item={id:setup.id,name:setup.name,activeVersionId:setup.active_version_id,versions,workspaces:{}};
  for(const v of versions){const w=M.blankWorkspace();const rw=workspaceByVersion.get(v.id);w.currentCoffeeId=rw?.current_library_entry_id||null;
   for(const wc of (coffeesByVersion.get(v.id)||[])){const p=M.blankCoffeeState();p.style=wc.selected_style;p.basketId=wc.basket_version_id;w.coffees[wc.library_entry_id]=p;if(wc.last_logged_at)w.recent[wc.library_entry_id]=wc.last_logged_at;}
   for(const pref of (recipesByVersion.get(v.id)||[])){const p=w.coffees[pref.library_entry_id] ||= M.blankCoffeeState();if(pref.current_family_id)p.currentFamilies[pref.style]=pref.current_family_id;if(pref.reference_family_id)p.referenceFamilies[pref.style]=pref.reference_family_id;if(pref.favorite_shot_id)p.favoriteShots[pref.current_family_id]=pref.favorite_shot_id;}
   item.workspaces[v.id]=w;
  }
  s.setups.push(item);
 }
 for(const l of rows(raw,'library')){
  const canonical=coffeeById.get(l.coffee_id);const proposal=submissionById.get(l.submission_id);const data=canonical||proposal?.proposed_data||{};
  s.coffees.push({id:l.id,name:data.name||'Coffee under review',roaster:data.roaster||'',origin:data.origin||'',roastLevel:C.canonicalRoastLevel(data.roast_level||data.roastLevel)||'',elevationM:data.elevation_m||data.elevationM||'',process:data.process||'',isDecaf:!C.isHalfCaffName(data.name)&&(data.is_decaf===true||C.isFullyDecafName(data.name)),decaffeinationMethod:!C.isHalfCaffName(data.name)&&(data.is_decaf===true||C.isFullyDecafName(data.name))&&C.DECAFFEINATION_METHODS.includes(data.decaffeination_method)?data.decaffeination_method:'',variety:data.variety||'',producer:data.producer||'',tastingNotes:data.tasting_notes||data.tastingNotes||'',roasterUrl:proposal?.source_url||'',roasterRecipe:data.roaster_recipe||data.roasterRecipe||null,createdAt:l.created_at,hidden:!!l.hidden_at,status:canonical?'verified':'pending'});
 }
 s.families=rows(raw,'families').map(f=>({id:f.id,coffeeId:f.library_entry_id,style:f.style,seedRatio:number(f.statistics?.ratio?.center),createdAt:f.created_at}));
 const setupById=firstBy(s.setups,'id'),versionsBySetupId=new Map();
 for(const setup of s.setups)if(!versionsBySetupId.has(setup.id))versionsBySetupId.set(setup.id,firstBy(setup.versions,'id'));
 for(const sh of rows(raw,'shots')){
  const old=sh.equipment_snapshot||{},setup=setupById.get(sh.setup_id),version=versionsBySetupId.get(sh.setup_id)?.get(sh.setup_version_id);
  s.shots.push({id:sh.id,coffeeId:sh.library_entry_id,setupId:sh.setup_id,setupVersionId:sh.setup_version_id,calibrationId:sh.calibration_id,basketId:sh.basket_version_id,bagId:sh.bag_id,style:sh.style,timestamp:sh.pulled_at,doseG:number(sh.dose_g),yieldG:number(sh.yield_g),timeS:number(sh.time_s),grindSetting:number(sh.grind_setting),tempC:number(sh.temperature_c),feedMode:sh.feed_mode==='unknown'?null:sh.feed_mode,tasteScales:{extraction:sh.extraction,body:sh.body,clarity:sh.clarity,sweetness:sh.sweetness,astringency:sh.astringency},notes:noteByShot.get(sh.id)?.notes||'',dialedIn:sh.is_dialed_in,hidden:!!sh.hidden_at,familyId:sh.personal_family_id,revision:sh.revision,recommendationContext:sh.recommendation_context||null,outlierReview:'not_needed',snapshot:{setupId:sh.setup_id,setupName:setup?.name||'',versionId:sh.setup_version_id,machine:old.machine_model||'',grinder:old.grinder_model||'',burrs:old.burr_set||'',grinderMin:number(old.finest_setting),grinderMax:number(old.coarsest_setting),calibrationId:sh.calibration_id,basketId:sh.basket_version_id,basketDoseG:number(old.basket_dose_g),tempUnit:version?.tempUnit||'F'}});
 }
 // Advice is derived from server observations, never treated as measured input.
 // Restore it after hydration so the recipe card and latest-shot advice agree.
 const latestByVersion=new Map();
 for(const sh of s.shots){
  if(sh.hidden)continue;
  if(!latestByVersion.has(sh.setupVersionId))latestByVersion.set(sh.setupVersionId,new Map());
  const byCoffee=latestByVersion.get(sh.setupVersionId);
  if(!byCoffee.has(sh.coffeeId))byCoffee.set(sh.coffeeId,new Map());
  const byStyle=byCoffee.get(sh.coffeeId),old=byStyle.get(sh.style);
  if(!old||sh.timestamp.localeCompare(old.timestamp)>0)byStyle.set(sh.style,sh);
 }
 const active=s.activeSetupId;
 for(const setup of s.setups){s.activeSetupId=setup.id;const version=M.activeVersion(s);
  for(const coffee of s.coffees){for(const style of C.STYLES){
   const last=latestByVersion.get(version?.id)?.get(coffee.id)?.get(style);
   if(last){const rec=E.recommendation(s,coffee.id,{style,basketId:last.basketId,feedMode:last.feedMode||undefined,ignoreAdvice:true});if(rec)last.suggestion=E.nextAdvice(s,last,rec);}
  }}
 }
 s.activeSetupId=active;
 return s;
}
export function applyPending(state,events){
 const s=C.clone(state);
 for(const event of events){if(event.status!=='pending')continue;const p=event.payload;
  if(event.action==='save_shot'&&!s.shots.some(sh=>sh.id===p.id)&&(!p.expected_revision||p.expected_revision===0)){
   const previous=s.activeSetupId;s.activeSetupId=p.setup_id;
   if(M.activeVersion(s)?.id===p.setup_version_id){try{const sh=E.saveShot(s,p.library_entry_id,{id:p.id,timestamp:p.pulled_at,doseG:p.dose_g,yieldG:p.yield_g,timeS:p.time_s,grindSetting:p.grind_setting,tempC:p.temperature_c,style:p.style,basketId:p.basket_version_id,feedMode:p.feed_mode,tasteScales:p.taste,notes:p.notes},{allowLegacyCustom:p.style==='Custom'});if(p.bag_id!=null)sh.bagId=p.bag_id;sh.cloudPending=true;}catch{/* Kept in the durable outbox even if it cannot be rendered. */}}
   s.activeSetupId=previous;
  }
 }
 return s;
}
export function shotPayload(s,coffeeId,d){
 const v=M.activeVersion(s),setup=M.activeSetup(s);if(!v||!setup)throw new Error('Choose a setup.');
 const validation=M.validateShot(d);if(validation.length)throw new Error(validation.join(' '));
 return {id:d.id,setup_id:setup.id,setup_version_id:v.id,library_entry_id:coffeeId,basket_version_id:d.basketId,calibration_id:v.calibrationId,style:d.style,pulled_at:d.timestamp||new Date().toISOString(),dose_g:C.round(d.doseG),yield_g:C.round(d.yieldG),time_s:C.round(d.timeS),grind_setting:C.round(d.grindSetting),temperature_c:v.advanced.temperature?C.num(d.tempC):null,feed_mode:v.advanced.slowFeed?d.feedMode:'standard',taste:{...d.tasteScales},notes:String(d.notes||''),...(d.recommendationContext?{recommendation_context:d.recommendationContext}:{})};
}
