import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedWoodsChecks} from '../scripts/audit/issue33-r90-woods-412-414-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const names={412:'Brown Bear',413:'Decaf',414:'Woods Blend'};
const urls={412:'https://woodscoffee.com/products/brown-bear',413:'https://woodscoffee.com/products/decaf',414:'https://woodscoffee.com/products/woods-blend'};
const story={
 412:'A rich, full bodied dark roast with hints of chocolate, vanilla, and spice. Dark Roast. Notes: Rich | Earth | Spice.',
 413:'A medium roast that delivers notes of sweet, floral, and spice. Using the Swiss Water Process, 99.9% caffeine free. Medium Roast. Notes: Sweet | Floral | Spice.',
 414:'Our most popular roast! A medium roast with delicate sweetness and hints of cinnamon. Semi-sweet cocoa with a dry finish. Medium Roast. Notes: Almonds | Mild Fruit | Cocoa Powder.'
};
const page=(n,s=story[n],extra='')=>'<main><article class="product"><h1>'+names[n]+'</h1><div class="product__description">'+s+'</div></article></main>'+extra;
for(const n of [412,413,414]){
 test('#'+n+' selected title and own literal direct prose',()=>{
  const r=selectedWoodsChecks(n,page(n),[names[n]]);
  assert.equal(r.uniqueSelected,true);assert.equal(r.ownDescription,true);
 });
 test('#'+n+' missing, wrong and duplicated H1 rejected',()=>{
  for(const h of [[],['Unrelated Coffee'],[names[n],names[n]]])
   assert.equal(selectedWoodsChecks(n,page(n),h).uniqueSelected,false);
 });
 test('#'+n+' nav, ads, reviews cannot repair missing selected facts',()=>{
  const other='<nav>'+story[n]+'</nav><aside>'+story[n]+'</aside><footer>'+story[n]+'</footer><script>'+story[n]+'</script>';
  assert.equal(selectedWoodsChecks(n,page(n,'',other),[names[n]]).ownDescription,false);
 });
 test('#'+n+' selected source change triggers review instead of stale claim',()=>{
  const lost=n===412?'full bodied dark roast':n===413?'Swiss Water Process':'Cocoa Powder';
  assert.equal(selectedWoodsChecks(n,page(n,story[n].replace(lost,'RETRACTED')),[names[n]]).ownDescription,false);
 });
 test('#'+n+' current parser does not infer unrelated coffee or origin',()=>{
  const unrelated=story[n===412?413:412];
  const r=extractPublicCoffeeFacts(page(n,story[n],'<aside>'+unrelated+'</aside>'),{source_url:urls[n]});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(!/guatemala|ethiopia|guji/i.test(r.fields.origin||''));
  if(n!==413)assert.ok(!r.fields.decaffeination_method);
 });
}
test('selected Swiss Water decaf is not green cherry processing',()=>{
 const r=extractPublicCoffeeFacts(page(413),{source_url:urls[413]});
 assert.equal(r.ok,true,JSON.stringify(r));assert.ok(!r.fields.process||r.fields.process==='Other/Unknown');
});
test('Woods Blend title does not supply origin or farmer',()=>{
 const r=extractPublicCoffeeFacts(page(414),{source_url:urls[414]});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!r.fields.origin&&!r.fields.producer&&!r.fields.variety);
});
