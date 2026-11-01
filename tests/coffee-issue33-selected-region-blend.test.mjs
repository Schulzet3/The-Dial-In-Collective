import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const source_url='https://roaster.example/products/brazil-oberon';
const exact='Brazil Oberon is a 100 percent Cerrado blend that consistently captures the qualities this region is celebrated for: a creamy body, sweet chocolate and citric notes, and a light acidity.';
function parse(sentence,name='Brazil Oberon',tag='h1'){
 const p={'@type':'Product',name,brand:'Example Roaster',url:source_url};
 const html='<script type="application/ld+json">'+JSON.stringify(p)+'</script><main><'+tag+'>'+name+'</'+tag+'><p>'+sentence+'</p></main>';
 const r=extractPublicCoffeeFacts(html,{source_url});assert.equal(r.ok,true,JSON.stringify(r));return r;
}
test('direct selected regional-blend prose recovers literal region with either H1 or H3 identity',()=>{
 for(const tag of ['h1','h3']){
  const r=parse(exact,'Brazil Oberon',tag);
  assert.equal(r.fields.origin,'Cerrado, Brazil');assert.ok(!r.conflicts?.includes('origin'));
 }
});
test('other SKU, prior story and disconnected regional sentence cannot donate origin',()=>{
 for(const [name,sentence] of [
  ['Brazil Aurora',exact],
  ['Brazil Oberon','Previously, '+exact],
  ['Brazil Oberon','Brazil Oberon is a 100 percent Cerrado blend. This region is celebrated for coffee.'],
  ['Brazil Oberon','This region produces excellent coffee. A different lot is a 100 percent Cerrado blend.']
 ]){
  const r=parse(sentence,name);assert.notEqual(r.fields.origin,'Cerrado, Brazil',sentence);
 }
});
test('cultivars and tasting terms cannot masquerade as growing regions',()=>{
 for(const word of ['Caturra','Chocolate','Caramel','Cocoa','Vanilla','Pumpkin Spice']){
  const r=parse('Brazil Oberon is a 100 percent '+word+' blend that captures the qualities this region is celebrated for.');
  assert.notEqual(r.fields.origin,word+', Brazil',word);
 }
});
test('country contradiction and detached region do not silently promote',()=>{
 for(const sentence of [
  'Brazil Oberon is a 100 percent Cerrado blend that captures the qualities this region is celebrated for in Colombia.',
  'Brazil Oberon is a 100 percent Cerrado blend, with no stated geographic relationship.',
  'Brazil Oberon is a 100 percent Cerrado blend that captures the qualities this region is celebrated for, unlike Peru coffee.'
 ]){
  assert.notEqual(parse(sentence).fields.origin,'Cerrado, Brazil',sentence);
 }
});
test('selected country remains without direct regional claim',()=>{
 assert.equal(parse('Cupping notes: Chocolate, nutty, fruity aftertaste.').fields.origin,'Brazil');
});
