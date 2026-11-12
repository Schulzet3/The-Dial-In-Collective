// A button-copied starting reference is provenance, never a measured preference
// or evidence of a validated espresso outcome.
const eligible=new Set(['grind','temperature']);
export function recordRecommendationUse(previous,control,source,communityEvidence=null){
 if(!eligible.has(control))return previous||null;
 const label=String(source||'Starting recommendation').slice(0,90);
 // Do not falsely attribute one copied control to another source after a
 // recipe-context change, e.g. changing Slow Feed before a second copy.
 const retained=previous?.kind==='member_selected_starting_reference'&&
  previous.source_label===label&&Array.isArray(previous.used_controls)?
  previous.used_controls.filter(x=>eligible.has(x)):[];
 return {
  kind:'member_selected_starting_reference',source_label:label,
  used_controls:[...new Set([...retained,control])],
  ...(communityEvidence?{community_tier:communityEvidence.tier,
   contributor_count:communityEvidence.contributorCount,
   shot_count:communityEvidence.shotCount}:{})
 };
}
export function reconcileRecommendationUse(context,applied={},actual={}){
 if(context?.kind!=='member_selected_starting_reference')return context||null;
 const used=(Array.isArray(context.used_controls)?context.used_controls:[])
  .filter(control=>{
   if(!eligible.has(control)||!Object.hasOwn(applied,control))return false;
   const expected=Number(applied[control]),current=Number(actual[control]);
   return actual[control]!=null&&String(actual[control]).trim()!==''&&
    Number.isFinite(expected)&&Number.isFinite(current)&&current===expected;
  });
 return used.length?{...context,used_controls:[...new Set(used)]}:null;
}
