// Issue #33 R53 original603 #590/#591: current exact selected official identity only.
// This does not certify historical oracle values or a sibling/changed coffee.
export const R53_EXACT_CASES = Object.freeze([
 {number:590,host:'www.vailcoffee.com',path:'/products/reserve-coffee-3',selected:'Honduras Finca Quebrada Onda - HONEY'},
 {number:591,host:'www.vailcoffee.com',path:'/products/reserve-coffee-4',selected:'Decaf Ethiopian Yirgacheffe SW'}
]);
const norm=s=>String(s??'').replace(/\s+/gu,' ').trim();
export function selectedR53Failures(rec,spec) {
 const fail=[],check=(ok,key)=>{if(!ok)fail.push(key+'_'+spec.number);};
 check(rec?.number===spec.number,'wrong_original_case');
 check(rec?.official_url==='https://'+spec.host+spec.path,'original_exact_url_mismatch');
 let url=null;try{url=new URL(rec?.final_url)}catch{}
 check(url?.protocol==='https:'&&url?.hostname===spec.host&&url?.pathname===spec.path&&!url.search&&!url.hash,'selected_url_redirect_or_query_mismatch');
 check(rec?.status==='FETCHED'&&rec?.parser_ok===true,'source_or_actual_parser_unverified');
 check(rec?.selected_heading_identity_verified===true,'selected_current_heading_identity_unverified');
 check(norm(rec?.current_fields?.name)===spec.selected,'current_selected_name_mismatch');
 check(rec?.add_coffee_ui_rendered===true&&rec?.source_review_rendered===true,'add_coffee_source_review_not_exercised');
 check(rec?.original_product_not_certified!==true,'changed_identity_negative');
 return fail;
}
