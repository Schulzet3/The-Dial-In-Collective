import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
// Bounded synthetic positive/hostile checks; genuine selected HTML is separate CI.
const cases={
 394:['Kamwangi - Kenya','https://vestacoffee.com/products/kamwangi-kenya'],
 395:['Wush Wush + Papayo, Anaerobic Natural - Elías & Shady Bayter','https://vestacoffee.com/products/papayo-wushwush-elias-shady-bayter'],
 396:['Wush Wush - Anaerobic Natural','https://vestacoffee.com/products/wush-wush-anaerobic-natural']
};
function parse(n,description,extra=''){
 const [name,url]=cases[n];
 const html='<html><head><title>'+name+' | VESTA Coffee Roasters</title>'+
  '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url})+
  '</script></head><body><main><article class="product"><h1>'+name+
  '</h1><div class="product-description">'+description.map(s=>'<p>'+s+'</p>').join('')+
  '</div></article></main>'+extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#394 chosen Kamwangi source keeps Washed and own notes',()=>{
 const p=parse(394,['Tasting Notes: Apricot, Blackberry, Toffee.',
   'Origin: Kenya. Region: Kirinyaga. Altitude: 1600-1800 MASL. Processing: Washed.',
   'Kamwangi washing station was established in 1975. VESTA welcomes this coffee this spring.']);
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[394][0]);
 assert.notEqual(p.fields.release_label,'1975');
 assert.notEqual(p.fields.release_label,'2026');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Molasses|Peach Tea/i);
});
test('#395 own Anaerobic Natural is not washed station or Ethiopian sibling',()=>{
 const p=parse(395,['Tasting Notes: Tangerine, Tropical Fruit, Molasses.',
  'Origin: Colombia, Tolima. Region: Fresno. Variety: Papayo + Wush Wush.',
  'Altitude: 1500 MASL. Processing: Anaerobic Natural. The ripe cherries ferment anaerobically for 48 hours.'],
  '<aside class="related-products"><p>Wush Wush - Anaerobic Natural from Ethiopia. Strawberry, Watermelon, Peach Tea.</p></aside>');
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[395][0]);
 assert.doesNotMatch(String(p.fields.origin||''),/Ethiopia/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Peach Tea/i);
 assert.notEqual(p.fields.process,'Washed');
});
test('#396 2025 MASL is altitude rather than a current release year',()=>{
 const p=parse(396,['Tasting Notes: Strawberry, Watermelon, Peach Tea.',
  'This Wush Wush is from producer Mamush Kabtimer in Chito, Gedio Zone, Ethiopia.',
  'Origin: Ethiopia. Altitude: 2025 masl. Processing: 120hr Anaerobic Natural.',
  'The fresh fruit ferments for 120 hours.'],
  '<footer>Copyright © 2026, VESTA Coffee Roasters</footer>');
 assert.equal(p.ok,true);assert.equal(p.fields.name,cases[396][0]);
 assert.notEqual(p.fields.release_label,'2025');
 assert.notEqual(p.fields.release_label,'2026');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Molasses|Tangerine/i);
});
test('mismatched selected original coffee must remain uncertified',()=>{
 for(const status of ['UNAVAILABLE','IDENTITY_MISMATCH']){
  assert.ok(requiredFocusedSourceFailures([395],[{number:395,status,parser_ok:false}])
   .some(x=>x.reason==='required_official_source_not_fetched'));
 }
});
test('parsed H1 absence is never accepted as current original product',()=>{
 const r={number:396,status:'FETCHED',parser_ok:true,add_coffee_ui_rendered:true,
  source_review_rendered:true,selected_heading_identity_verified:false};
 assert.ok(requiredFocusedSourceFailures([396],[r])
  .some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
test('unrelated selected cousin current identity cannot become positive #395',()=>{
 const r={number:395,status:'FETCHED',parser_ok:true,archived_coffee:cases[395][0],
 current_fields:{name:cases[396][0]},selected_h1:[cases[396][0]],
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:false,
 add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.ok(requiredFocusedSourceFailures([395],[r])
 .some(x=>x.reason==='selected_original_product_heading_identity_unverified'));
});
