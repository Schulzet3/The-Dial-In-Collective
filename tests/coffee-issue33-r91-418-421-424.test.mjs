import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCaseEvidence,cases} from '../scripts/audit/issue33-r91-418-421-424-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
const story={
 418:'FLAVOR NOTES Floral, Fruity, Berry. REGION Africa. ROAST Full City. The African Blend is grown exclusively in East Africa.',
 421:'A classic medium roast. A perfectly balanced medium blend with notes of cacao nibs and apricot. Try this mountain roast.',
 424:'RED BERRY, SMOOTH, NUTTY. A flavorful E.A. Process Decaf from Huila, Colombia with a chocolatey finish. Varietals: Caturra, Colombia, and Castillo.'
};
const selected=n=>'<article class="product"><h1>'+cases[n].name+'</h1><div class="product__description">'+story[n]+'</div></article>';
for(const n of [418,421,424]){
 test('#'+n+' own selected product facts accepted',()=>{
  assert.equal(selectedCaseEvidence(n,selected(n)).selectedPhrasesPresent,true);
 });
 test('#'+n+' navigation, footer, scripts cannot replace absent product facts',()=>{
  const outsiders=['nav','footer','aside','script'].map(tag=>'<'+tag+'>'+story[n]+'</'+tag+'>').join('');
  assert.equal(selectedCaseEvidence(n,'<main><h1>'+cases[n].name+'</h1></main>'+outsiders).selectedPhrasesPresent,false);
 });
 test('#'+n+' retracted own direct fact forces review',()=>{
  const missing=cases[n].phrases[0];
  assert.equal(selectedCaseEvidence(n,selected(n).replace(missing,'RETRACTED')).selectedPhrasesPresent,false);
 });
}
test('Ahrre regular African Blend does not become decaf from general policy',()=>{
 const result=inferDecaffeinationMethod({name:'AFRICAN BLEND',selectedMethod:'All Decaffeinated coffees are Swiss Water Process'});
 assert.equal(result,'');
});
test('Aldea literal E.A. decaf is Sugar Process, not coffee-cherry processing',()=>{
 assert.equal(inferDecaffeinationMethod({name:'Flow State Decaf',selectedMethod:'E.A. Process Decaf'}),'Sugar Process');
 assert.equal(inferDecaffeinationMethod({name:'Flow State Decaf',selectedMethod:'Ethyl Acetate decaffeination'}),'Sugar Process');
});
test('mixed-caffeine product and conflicting methods do not force Sugar Process',()=>{
 assert.equal(inferDecaffeinationMethod({name:'Half Caf Decaf',selectedMethod:'E.A. Process Decaf'}),'');
 assert.equal(inferDecaffeinationMethod({name:'Flow State Decaf',selectedMethod:'Swiss Water and E.A. Process Decaf'}),'');
});
test('product parser does not borrow Honduras from unrelated merchant boilerplate',()=>{
 const h='<main><article class="product"><h1>Flow State Decaf</h1><p>RED BERRY, SMOOTH, NUTTY. E.A. Process Decaf from Huila, Colombia.</p></article></main><footer>Our non-profit in Honduras.</footer>';
 const r=extractPublicCoffeeFacts(h,{source_url:cases[424].url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!/Honduras/i.test(r.fields.origin||''));
});
test('Alaska source selects product prose, not unrelated product names',()=>{
 const h='<main><article class="product"><h1>AK Mountain</h1><p>A classic medium roast with notes of cacao nibs and apricot.</p></article></main><aside>Fog Riser Light Roast: Kenya</aside>';
 const r=extractPublicCoffeeFacts(h,{source_url:cases[421].url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!/Kenya|Fog Riser/i.test(JSON.stringify(r.fields)));
});
