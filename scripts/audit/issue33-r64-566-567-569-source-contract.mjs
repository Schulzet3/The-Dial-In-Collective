// Issue #33 R64: only three pinned original603 selected products, never whole-corpus certification.
import {coffeeIdentityKey} from '../../src/server/coffee-product-identity.mjs';
export const R64_SELECTED=Object.freeze([
 Object.freeze({number:566,host:'www.sidecarcoffee.com',path:'/products/honduras-alexia-mejia',name:'Honduras Light Roast Alexia Mejia',country:'Honduras'}),
 Object.freeze({number:567,host:'www.sidecarcoffee.com',path:'/products/uganda-rwenzori',name:'Uganda Rwenzori Natural',country:'Uganda'}),
 Object.freeze({number:569,host:'www.slowburncoffee.com',path:'/products/guatemala-finca-la-bendicion',name:'Guatemala - Finca La Bendicion',country:'Guatemala'})
]);
export function r64IdentityFailures(r){
 const s=R64_SELECTED.find(x=>x.number===r?.number),bad=[];
 const check=(ok,name)=>{if(!ok)bad.push(name)};
 check(Boolean(s),'nonselected_original603_case');
 if(!s)return bad;
 const url='https://'+s.host+s.path;
 check(r.official_url===url,'unapproved_original_url');
 let u;try{u=new URL(r.final_url)}catch{}
 check(u?.protocol==='https:'&&u?.hostname===s.host&&u?.pathname===s.path&&
  !u?.search&&!u?.hash,'selected_product_url_changed_or_redirected');
 check(r.status==='FETCHED'&&r.parser_ok===true,'official_source_or_parser_not_verified');
 check(r.selected_heading_identity_verified===true,'selected_heading_not_verified');
 const h=r.selected_h1||[];
 check(h.length===1&&coffeeIdentityKey(h[0])===coffeeIdentityKey(s.name)&&
  coffeeIdentityKey(r.current_fields?.name||'')===coffeeIdentityKey(s.name),
  'h1_or_extracted_identity_does_not_match_current_selected');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
  'actual_add_coffee_and_source_review_not_verified');
 return bad;
}
export function r64SelectedSourceMarkers(text,number){
 const t=String(text||'').replace(/\s+/gu,' ');
 const shared={};
 if(number===566)return {...shared,
  ownProduct:/Honduras\s+Light\s+Roast\s+Alexia\s+Mejia/iu.test(t),
  namedPerson:/Alexia\s+Mejia/iu.test(t),
  washedMention:/\bwashed\b/iu.test(t),
  parainemaMention:/\bParainema\b/iu.test(t)};
 if(number===567)return {...shared,
  ownProduct:/Uganda\s+Rwenzori\s+Natural/iu.test(t),
  specificRegion:/\bRwenzori\b/iu.test(t),
  naturalMention:/\bnatural[ -]process\b/iu.test(t),
  berryTaste:/\bdried\s+berry\b/iu.test(t)&&/\bcaramel\b/iu.test(t)};
 if(number===569)return {...shared,
  ownProduct:/Guatemala\s*-\s*Finca\s+La\s+Bendicion/iu.test(t),
  namedFarm:/\bFinca\s+La\s+Bendici[oó]n\b/iu.test(t),
  typedWashed:/\bProcessing\s*:\s*(?:Fully\s+)?washed\b/iu.test(t),
  ownTasting:/\bMarionberry\b/iu.test(t)&&/\bHoneysuckle\b/iu.test(t)};
 return {nonselectedCase:true};
}
