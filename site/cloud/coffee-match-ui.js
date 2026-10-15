// Candidates come from the read-only Supabase matcher; never elevate an
// unverified submission or infer coffee/release identity from a roaster name.
import {e,button} from '../lib/ui.js';
export function nextCoffeeAction(result){
 if(typeof result?.exact_id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.exact_id)&&result?.classification==='exact_verified')return 'reuse_verified';
 if(result?.classification==='needs_confirmation'&&Array.isArray(result?.candidates)&&result.candidates.length)return 'ask_user';
 return 'submit_pending';
}
export function proposalWithRecognizedRoaster(d,result){
 const {source_url,...facts}=d;
 const entered=String(facts.roaster||'').trim();
 const recognized=result?.roaster?.recognized===true;
 const canonical=recognized?String(result.roaster.canonical_name||'').trim():null;
 if(canonical && canonical!==entered) return {source_url,proposed_data:{...facts,roaster:canonical,roaster_as_entered:entered}};
 return {source_url,proposed_data:facts};
}
export function matchReviewMarkup(result,{pending=false}={}){
 const choices=Array.isArray(result?.candidates)?result.candidates.slice(0,6):[];
 return `<p class="helper">This may be an existing verified coffee. Different harvests or releases can be distinct, even when the roaster and name match.</p>
  <div class="coffee-matches">${choices.map(c=>`<div class="coffee-match">
   <div class="coffee-match-text"><strong>${e(c.name||'Coffee')}</strong><span>${e(c.roaster||'')}${c.release_label?` · ${e(c.release_label)}`:''}</span>
   ${c.origin?`<small>${e(c.origin)}</small>`:''}</div>
   ${button('Use Existing','choose-coffee-match',`data-id="${e(c.id)}"`,'secondary compact')}
  </div>`).join('')}</div>
  <p class="helper">If this is a different release, you can still add it and log shots immediately. It stays private while its identity is verified.</p>
  ${button(pending?'Keep This Coffee Separate':'This Is A Different Coffee','add-distinct-coffee','','ghost full')}`;
}
