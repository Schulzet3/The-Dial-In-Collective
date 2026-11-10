// Only independently eligible, verified, same-style Community aggregates enter
// the weak starting-prior channel. Never treat this as an owned Dialed In family.
const levels={exact:3,related_release:4,similar_coffee:6};
// Aggregated numeric columns may arrive as decimal strings; never coerce booleans
// or arrays/objects into physical espresso measurements.
const finiteNumericReading=v=>(typeof v==='number'||(typeof v==='string'&&v.trim()!==''))&&Number.isFinite(Number(v));
const confirmedFamilyCount=c=>Number.isInteger(c.confirmed_personal_family_count)&&c.confirmed_personal_family_count>=0?c.confirmed_personal_family_count:0;
export function selectCommunityPrior(data,style){
 if(!data||data.style!==style||!Array.isArray(data.candidates))return null;
 const choices=data.candidates.filter(c=>
  c?.style===style&&Object.hasOwn(levels,c.tier)&&
  c.source==='eligible_verified_community'&&c.calibrated_grind===false&&
  Number.isInteger(c.contributor_count)&&c.contributor_count>0&&
  Number.isInteger(c.shot_count)&&c.shot_count>=c.contributor_count&&
  finiteNumericReading(c.ratio)&&Number(c.ratio)>0.5&&Number(c.ratio)<8&&
  finiteNumericReading(c.time_s)&&Number(c.time_s)>=1&&Number(c.time_s)<=180);
 if(!choices.length)return null;
 const ranked=[...choices].sort((a,b)=>levels[a.tier]-levels[b.tier]||
  b.contributor_count-a.contributor_count||b.shot_count-a.shot_count||
  confirmedFamilyCount(b)-confirmedFamilyCount(a)||
  a.ratio-b.ratio);
 const c=ranked[0];
 return {tier:c.tier,tierNumber:levels[c.tier],ratio:Number(c.ratio),time:Number(c.time_s),
  shotCount:c.shot_count,contributorCount:c.contributor_count,
  confirmedPersonalFamilyCount:confirmedFamilyCount(c),
  confirmedFamilyContributors:Number.isInteger(c.confirmed_family_contributors)
   &&c.confirmed_family_contributors>=0?c.confirmed_family_contributors:0,
  communityGroupIdentityVerified:false,
  evidence:'community_eligible',style,established:false,calibratedGrind:false};
}
