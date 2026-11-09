// Issue #33 R61: exact chosen original603 #573 Stage Line product, never SEO/slugs.
import {coffeeIdentityKey} from '../../src/server/coffee-product-identity.mjs';
export const R61_SELECTED=Object.freeze({
 number:573,host:'www.stageline.coffee',
 path:'/product-page/ethiopia-worasa-daniel-mijane',name:'Ethiopia Wate Gogogu'
});
export function r61IdentityFailures(r,s=R61_SELECTED){
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 check(r?.number===s.number,'original603_row_mismatch');
 check(r?.official_url==='https://'+s.host+s.path,'original603_selected_official_url_changed');
 let current=null;try{current=new URL(r?.final_url);}catch{}
 check(current?.protocol==='https:'&&current?.hostname===s.host&&current?.pathname===s.path&&
  !current?.search&&!current?.hash,'redirect_or_unselected_product');
 check(r?.status==='FETCHED'&&r?.parser_ok===true,'selected_source_or_parser_unverified');
 check(r?.selected_heading_identity_verified===true,'selected_heading_not_verified');
 const h=r?.selected_h1||[];
 check(h.length===1,'missing_or_ambiguous_selected_h1');
 check(h.length===1&&coffeeIdentityKey(h[0])===coffeeIdentityKey(s.name)&&
  coffeeIdentityKey(r?.current_fields?.name||'')===coffeeIdentityKey(s.name),
  'selected_current_identity_or_parser_name_mismatch');
 check(r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,
  'add_coffee_or_source_review_unverified');
 return failures;
}
// Requires a current-product deictic attribution. An educational Guji paragraph
// or a previous Worka Sakaro lot must never establish this coffee's growing region.
export function r61CurrentGujiEvidence(text){
 const t=String(text||'').replace(/\s+/gu,' ');
 return {
  directCurrentSelectedGuji:/\bThis\s+time\s+from\s+(?:the\s+)?Guji\s+region\b/iu.test(t),
  priorLotMention:/\bprevious\s+Worka\s+Sakaro\s+lot\b/iu.test(t),
  selectedWashed:/\bProcess\s*:\s*Washed\b/iu.test(t)
 };
}
