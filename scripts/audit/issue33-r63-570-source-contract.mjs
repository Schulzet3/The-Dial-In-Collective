// Issue #33 R63: one original frozen source row (#570), not all 603.
import {coffeeIdentityKey} from '../../src/server/coffee-product-identity.mjs';
export const R63_SELECTED = Object.freeze({
  number:570,host:'www.slowburncoffee.com',
  path:'/products/honduras-expreso-paraiseno',
  name:'Honduras - Expreso Paraiseño'
});
export function r63IdentityFailures(r,s=R63_SELECTED){
  const failures=[],check=(condition,id)=>{if(!condition)failures.push(id);};
  check(r?.number===s.number,'original603_case_identity_mismatch');
  check(r?.official_url==='https://'+s.host+s.path,'wrong_original_selected_url');
  let u=null;try{u=new URL(r?.final_url);}catch{}
  check(u?.protocol==='https:'&&u?.hostname===s.host&&u?.pathname===s.path&&
    !u?.search&&!u?.hash,'redirect_unselected_product_or_query');
  check(r?.status==='FETCHED'&&r?.parser_ok===true,'current_html_or_parser_unverified');
  check(r?.selected_heading_identity_verified===true,'selected_heading_identity_unverified');
  const h=r?.selected_h1||[];
  check(h.length===1&&coffeeIdentityKey(h[0])===coffeeIdentityKey(s.name)&&
    coffeeIdentityKey(r?.current_fields?.name||'')===coffeeIdentityKey(s.name),
    'current_selected_h1_or_extracted_name_mismatch');
  check(r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,
    'actual_add_coffee_source_review_unverified');
  return failures;
}
export function r63CurrentLodozaEvidence(text){
  const t=String(text||'').replace(/\s+/gu,' ');
  return {
    selectedCurrentFarm:/\bFinca\s+Expreso\s+Paraiseño\b/iu.test(t),
    selectedGrowingLocality:/\bcoffee\s+grown\s+at\s+the\s+farm\b[^.]{0,230}\bgrown\s+from\s+the\s+beautiful\s+lands\s+of\s+La\s+Lodoza,\s*El\s+Para[íi]so\b/iu.test(t),
    selectedRegionSpec:/\bRegion\s*:\s*El\s+Para[íi]so\b/iu.test(t),
    selectedWashedSpec:/\bProcessing\s*:\s*Fully\s+washed\b/iu.test(t),
    selectedTypedOwner:/\bOwner\s*:\s*Gerardo\s+Peñalva\b/iu.test(t),
    separatePadillaNarrative:/\bJavier\s+Padilla\b/iu.test(t)
  };
}