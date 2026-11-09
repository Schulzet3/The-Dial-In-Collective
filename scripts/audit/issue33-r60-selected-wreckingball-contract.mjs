// Issue #33 R60: current exact selected Wrecking Ball evidence only.
// This is a source-checking contract, never an extractor heuristic or a
// certification of all original603 products. The current selected H1 must match.
export const R60_CASES=Object.freeze([
 {number:595,name:'Ethiopia Gera, Natural Process, Gr. 1',
  url:'https://www.wreckingballcoffee.com/products/ethiopia-gedeb-banko-gotiti-12oz'},
 {number:596,name:'Guatemala Huehuetenango Los Dos Socios',
  url:'https://www.wreckingballcoffee.com/products/guatemala-huehuetenango-los-dos-socios-12oz'}
]);
const plain=x=>String(x||'').replace(/<[^<>]{0,2000}>/gu,' ')
 .replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim();
export function r60DirectSelectedClaims(name,html){
 const t=plain(html);
 if(name===R60_CASES[0].name){
  return {selected:true,
   labeled_region:/\bRegion:\s*Gera,\s*Limmu\b/iu.test(t),
   explicitly_not_sulladjah_only:/\bthis coffee is not specifically from that area alone\b/iu.test(t),
   literal_process:/\bNatural Process:\s*Sun Dried Natural\b/iu.test(t),
   selected_sensory:/\bTastes like:\s*Caramel,\s*milk chocolate\b/iu.test(t)};
 }
 if(name===R60_CASES[1].name){
  return {selected:true,
   labeled_country:/\bCountry:\s*Guatemala\b/iu.test(t),
   labeled_region_typo:/\bRegion:\s*Huehuetenago\b/iu.test(t),
   current_2026_lot:/\b(?:the|our)\s+2026 lot\b/iu.test(t),
   named_farm_growing_location:/\bFinca Los Dos Socios is located in the highlands of La Libertad,\s*Huehuetenango\b/iu.test(t),
   named_grower:/\bGrower:\s*Concepción Villatoro\b/iu.test(t),
   literal_washed:/\bProcess:\s*Washed,\s*42 hour fermentation\b/iu.test(t),
   ambiguous_roast:/\bRoast:\s*Medium\/Medium-Light\b/iu.test(t),
   direct_medium_level:/\bRoast:\s*medium level\b/iu.test(t)};
 }
 return {selected:false};
}
export function r60IdentityFailures(rec,spec){
 const errors=[],test=(ok,id)=>{if(!ok)errors.push(id+'_'+spec.number);};
 test(rec?.number===spec.number,'wrong_immutable_row');
 test(rec?.official_url===spec.url,'exact_original_url_changed');
 let u=null;try{u=new URL(rec?.final_url);}catch{}
 const wanted=new URL(spec.url);
 test(u?.protocol==='https:'&&u?.host===wanted.host&&u?.pathname===wanted.pathname&&
  !u.search&&!u.hash,'unsafe_redirect_or_wrong_product');
 test(rec?.status==='FETCHED'&&rec?.parser_ok===true,'fresh_selected_not_parsed');
 test(rec?.selected_h1?.length===1&&rec.selected_h1[0]===spec.name&&
  rec?.current_fields?.name===spec.name&&rec?.selected_heading_identity_verified===true,
  'selected_merchant_identity_mismatch');
 test(rec?.add_coffee_ui_rendered===true&&rec?.source_review_rendered===true,
  'real_preview_or_review_missing');
 return errors;
}
