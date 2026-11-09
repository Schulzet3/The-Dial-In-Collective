// Issue #33 R52. Current selected URL/identity audit; no historical oracle fact is certification.
export const R52_EXACT_SOURCE_CASES=Object.freeze([
 {number:586,host:'www.unlockedcoffee.com',path:'/products/dedication-costa-rica',name:'Dedication- Costa Rica'},
 {number:587,host:'www.unlockedcoffee.com',path:'/products/honey-sky',name:'Honey Sky- Mexico, Chiapas'},
 {number:588,host:'www.unlockedcoffee.com',path:'/products/the-pleasant',name:'The Pleasant'}
]);
export function selectedR52CaseFailures(r,spec) {
 const failures=[];
 const required=(ok,key)=>{if(!ok)failures.push(key+'_'+spec.number);};
 required(r?.number===spec.number,'wrong_case');
 required(r?.official_url==='https://'+spec.host+spec.path,'original_source_url_changed');
 let url=null;
 try{url=new URL(r?.final_url)}catch{}
 required(url?.protocol==='https:'&&url?.hostname===spec.host&&url?.pathname===spec.path,'selected_url_or_redirect_changed');
 required(r?.status==='FETCHED'&&r?.parser_ok===true,'source_or_real_parser_not_verified');
 required(r?.selected_heading_identity_verified===true,'selected_visible_identity_not_verified');
 required(r?.current_fields?.name===spec.name,'current_product_name_changed');
 required(r?.add_coffee_ui_rendered===true&&r?.source_review_rendered===true,'add_coffee_or_source_review_not_exercised');
 required(!r?.original_product_not_certified,'negative_identity_exception');
 return failures;
}
