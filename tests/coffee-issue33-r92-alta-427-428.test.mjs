import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,directSelectedAlta} from '../scripts/audit/issue33-r92-alta-427-428-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const story={
 427:'El Madron - Organic - Decaf. Origin : Chiapas, Mexico. Roast Level : Medium. Varietals : Typica, Caturra. Process Method : Washed, Mountain Water Process. Altitude : 1800m. We Taste : Toffee, Pumpkin Spice, Lime. The bean is decaffeinated with the Mountain Water Process.',
 428:'Kirima Batian. ROAST LEVEL: Light Roast. VARIETALS: SL28, SL34, Batian. PROCESSING: Washed. ALTITUDE: 1,847m. WE TASTE: Cherry, Raisin, Lemon. This lot is from Kiaguthu Washing Station in Othaya Nyeri Kenya and Othaya Farmers Cooperative Society.'
};
const page=(n,body=story[n],outside='')=>'<article class="product"><h1>'+cases[n].name+'</h1><div class="product__description">'+body+'</div></article>'+outside;
for(const n of [427,428]){
 test('#'+n+' current exact selected official description evidence',()=>{
  const r=directSelectedAlta(n,page(n),[cases[n].name]);assert.equal(r.uniqueSelected,true);assert.equal(r.ownDirectProductFacts,true);
 });
 test('#'+n+' missing or repeated selected heading fails identity',()=>{
  for(const bad of [[],['Other Coffee'],[cases[n].name,cases[n].name]])
   assert.equal(directSelectedAlta(n,page(n),bad).uniqueSelected,false);
 });
 test('#'+n+' sidebar, menus, scripts and footers cannot fill missing selected facts',()=>{
  const outside=['nav','aside','footer','script'].map(t=>'<'+t+'>'+story[n]+'</'+t+'>').join('');
  assert.equal(directSelectedAlta(n,page(n,'',outside),[cases[n].name]).ownDirectProductFacts,false);
 });
 test('#'+n+' retracted current own fact is not certified from stale source',()=>{
  const removed=n===427?'Washed, Mountain Water Process':'Kiaguthu Washing Station';
  assert.equal(directSelectedAlta(n,page(n,story[n].replace(removed,'NO LONGER PUBLISHED')),[cases[n].name]).ownDirectProductFacts,false);
 });
 test('#'+n+' actual parser does not borrow adjacent unrelated coffee',()=>{
  const other=n===427?428:427;
  const result=extractPublicCoffeeFacts(page(n,story[n],'<aside>'+story[other]+'</aside>'),{source_url:cases[n].url});
  assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!/santos lopez|passiflora|woods blend/i.test(JSON.stringify(result.fields)));
 });
}
test('mountain water decaffeination is not green cherry processing',()=>{
 const result=extractPublicCoffeeFacts(page(427),{source_url:cases[427].url});
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.fields.decaffeination_method,'Water Process');
 assert.ok(!result.fields.process||result.fields.process==='Washed'||result.fields.process==='Other/Unknown');
});
test('Kenya washed Kirima is not decaf or a separate Costa Rica selection',()=>{
 const result=extractPublicCoffeeFacts(page(428),{source_url:cases[428].url});
 assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!result.fields.decaffeination_method);
 assert.ok(!/costa rica|chiapas|mexico/i.test(result.fields.origin||''));
});
