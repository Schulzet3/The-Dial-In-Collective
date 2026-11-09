// #33 R51 strict bounded selected-product acceptance, never a 603-coffee certification.
export const R51_EXACT_SOURCE_CASES=Object.freeze([
 {number:583,host:'www.thecoffeeexchange.com',path:'/products/dominican-republic-red-honey-process-vienna-roast-limited-offering',name:'Dominican Republic – Red Honey, Vienna',process:'Honey'},
 {number:584,host:'www.thecoffeeexchange.com',path:'/products/honduras-comsa-espresso-roast',name:'Honduras Comsa – Washed, Espresso',process:'Washed'},
 {number:585,host:'www.thecoffeeexchange.com',path:'/products/peru-cafe-canchaque-natural-process-american-roast-limited-offering',name:'Peru Cafe Canchaque – Natural, American',process:'Natural'}
]);
export function selectedR51CaseFailures(r,spec) {
 const failures=[];
 const require=(ok,label)=>{if(!ok)failures.push(label+'_'+spec.number);};
 const f=r?.current_fields||{};
 require(r?.number===spec.number,'wrong_case');
 require(r?.official_url==='https://'+spec.host+spec.path,'original_source_url_changed');
 let u=null;
 try{u=new URL(r?.final_url)}catch{}
 require(u?.protocol==='https:'&&u.hostname===spec.host&&u.pathname===spec.path,'redirect_or_identity_page_changed');
 require(r?.status==='FETCHED'&&r?.parser_ok===true,'actual_selected_source_or_parser_unverified');
 require(r?.selected_heading_identity_verified===true,'current_selected_product_identity_unverified');
 require(f.name===spec.name,'current_product_name_changed');
 require(r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,'add_coffee_or_source_review_not_exercised');
 require(f.process===spec.process,'selected_literal_process_missing_or_changed');
 require(!Array.isArray(r?.conflicts)||!r.conflicts.includes('process'),'contradictory_selected_process');
 return failures;
}
