// Issue #33 R54: exact current original603 selected product checks only.
// #594's historic URL may be reused between Sumatra and Timor.
// Never treat old title, URL slug, metadata or sibling copy as chosen current identity.
import {coffeeIdentityKey} from '../../src/server/coffee-product-identity.mjs';
export const R54_CASES=Object.freeze([
 {number:594,host:'www.woodshedroast.com',path:'/products/timor-decaf-swiss-water-process',kind:'rotating'},
 {number:597,host:'www.wreckingballcoffee.com',path:'/products/kenya-estate',selected:'Kenya Nkumari, P1 C'},
 {number:600,host:'yellowstonecoffee.com',path:'/products/vietnam-lam-dong',selected:'VIETNAM LAM DONG'}
]);
export function r54CurrentIdentityFailures(rec,spec){
 const errors=[],check=(ok,k)=>{if(!ok)errors.push(k+'_'+spec.number);};
 check(rec?.number===spec.number,'wrong_original603_row');
 const original='https://'+spec.host+spec.path;
 check(rec?.official_url===original,'original_selected_url_mismatch');
 let actual=null;try{actual=new URL(rec?.final_url);}catch{}
 check(actual?.protocol==='https:'&&actual?.hostname===spec.host&&actual?.pathname===spec.path&&
  !actual.search&&!actual.hash,'unexpected_redirect_or_query');
 check(rec?.status==='FETCHED'&&rec?.parser_ok===true,'selected_public_fetch_or_parser_missing');
 check(rec?.add_coffee_ui_rendered===true&&rec?.source_review_rendered===true,'preview_or_source_review_missing');
 const headings=rec?.selected_h1||[];
 check(headings.length===1,'missing_or_ambiguous_selected_h1');
 const h=headings.length===1?String(headings[0]):'';
 const parsed=rec?.current_fields?.name||'';
 check(Boolean(h)&&coffeeIdentityKey(h)===coffeeIdentityKey(parsed),'selected_h1_parser_name_disagree');
 if(spec.kind==='rotating'){
  const current=/^(?:Sumatra|Timor)\s+Decaf\b/iu.test(h);
  check(current,'not_a_named_current_selected_decaf');
  // Exact archived #594 is SUMATRA. If site now sells Timor, identity must
  // remain explicitly UNVERIFIED for original #594, not quietly inherited.
  const unchanged=/^Sumatra\s+Decaf\b/iu.test(h);
  check(rec?.selected_heading_identity_verified===unchanged,'original_identity_mismatch_not_acknowledged');
  if(!unchanged)check(rec?.selected_heading_identity_verified!==true,'changed_identity_false_certificate');
 }else{
  check(coffeeIdentityKey(h)===coffeeIdentityKey(spec.selected),'current_original_product_changed');
  check(rec?.selected_heading_identity_verified===true,'identity_not_source_verified');
 }
 return errors;
}
