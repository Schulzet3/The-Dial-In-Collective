// Issue #33 R56: original603 #603 current exact selected merchant, not the old oracle.
import {coffeeIdentityKey} from '../../src/server/coffee-product-identity.mjs';
export const R56_SELECTED=Object.freeze({
 number:603,host:'zekescoffee.com',path:'/products/nicaragua-segovia-1-lb-16-oz',
 name:'Nicaragua Segovia, 1 lb (16 oz)'
});
export function r56IdentityFailures(r, s=R56_SELECTED){
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 check(r?.number===s.number,'original603_row_mismatch');
 check(r?.official_url==='https://'+s.host+s.path,'original603_official_url_changed');
 let current=null;try{current=new URL(r?.final_url);}catch{}
 check(current?.protocol==='https:'&&current?.hostname===s.host&&current?.pathname===s.path&&
  !current?.search&&!current?.hash,'redirect_changed_original_current_selected_path');
 check(r?.status==='FETCHED'&&r?.parser_ok===true,'current_selected_source_unavailable_or_parser_failed');
 check(r?.selected_heading_identity_verified===true,'original_current_identity_unverified');
 const headings=r?.selected_h1||[];
 check(headings.length===1,'selected_h1_ambiguous_or_missing');
 check(headings.length===1&&coffeeIdentityKey(headings[0])===coffeeIdentityKey(s.name)&&
  coffeeIdentityKey(r?.current_fields?.name||'')===coffeeIdentityKey(s.name),
  'current_selected_identity_or_parser_name_mismatch');
 check(r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,
  'add_coffee_or_source_review_unverified');
 return failures;
}
// A dry mill is processing infrastructure, never automatically the selected coffee's
// farm or growing locality. Observe primary current-product prose, not SEO or cards.
export function r56DryMillProvenance(text){
 const t=String(text||'').replace(/\s+/gu,' ');
 return {
  selectedDryMillTown:/\bdry\s+mill\b.{0,145}\bPalacaguina\b/iu.test(t),
  expresslyGrownInThatTown:/(?:farmers?|farms?|coffee\s+(?:grown|cultivated|harvested))\s+(?:in|near|from|at)\s+(?:the\s+town\s+of\s+)?Palacaguina\b/iu.test(t)
 };
}
