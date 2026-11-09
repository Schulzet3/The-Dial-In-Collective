// #33 R65: independent evidence for EXACT original603 selected product #579.
import {coffeeIdentityKey} from '../../src/server/coffee-product-identity.mjs';
export const R65_SELECTED=Object.freeze({
 number:579,host:'www.swroasting.coffee',
 path:'/product/colombia-camacho-fragancia/XOJGV4EZXCTPBXV6RSP4SGVF',
 name:'Colombia Camacho Fragancia'
});
export function r65IdentityFailures(r,s=R65_SELECTED){
 const fails=[],ok=(yes,why)=>{if(!yes)fails.push(why);};
 ok(r?.number===s.number,'wrong_original603_case');
 ok(r?.official_url==='https://'+s.host+s.path,'selected_url_not_exact');
 let url=null;try{url=new URL(r?.final_url);}catch{}
 ok(url?.protocol==='https:'&&url?.hostname===s.host&&url?.pathname===s.path&&
   !url?.search&&!url?.hash,'foreign_product_redirect_or_query');
 ok(r?.status==='FETCHED'&&r?.parser_ok===true,'selected_html_or_actual_parser_not_verified');
 ok(r?.selected_heading_identity_verified===true,'current_heading_not_independently_verified');
 ok(r?.selected_h1?.length===1&&
   coffeeIdentityKey(r.selected_h1[0])===coffeeIdentityKey(s.name)&&
   coffeeIdentityKey(r?.current_fields?.name||'')===coffeeIdentityKey(s.name),
   'selected_H1_or_current_name_not_matching');
 ok(r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,
   'actual_Add_Coffee_or_Source_Review_not_verified');
 return fails;
}
// Bounded SAME SELECTED PRODUCT claim; never assign a locality from isolated
// South Huila education, an unrelated coffee, an old SKU, or review prose.
export function r65SelectedLotEvidence(text){
 const t=String(text||'').replace(/\s+/gu,' ');
 const sameSentence=/\bFragancia\s+varietal\s+grown\s+by\s+Luis\s+.{0,20}Camacho\s+in\s+the\s+Southern\s+Huila\s+region,\s*Palestina,\s*Santa\s+B.rbara\b/iu.test(t);
 return {
   directSelectedGrowerAndRegion:sameSentence,
   directSelectedWashed:/\bFully\s+Washed\s+Process\b/iu.test(t),
   directSelectedElevation:/\b1720\s*masl\b/iu.test(t),
   directSelectedFlavors:/\bdragonfruit,\s*starfruit,\s*and\s+hints\s+of\s+fresh\s+basil\b/iu.test(t),
   numericRoastSampleUnqualified:/\bRoast\s+Color\s*:\s*149\.3\b/iu.test(t)
 };
}
