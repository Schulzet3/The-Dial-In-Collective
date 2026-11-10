import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedWhiteRhinoChecks} from '../scripts/audit/issue33-r89-whiterhino-409-411-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const cases={
 409:{name:'Decaf',url:'https://whiterhinocoffee.com/products/decaf',
  story:'A wonderful Guatemalan coffee sourced sustainably by Swiss Water Process. Roast: Medium. Origin: Guatemala. Process: Washed, Swiss Water Process. Growing Altitude: 1320 - 1600 meters. Tasting Notes: Caramel Apple, Black Tea, Raisin.'},
 410:{name:'Ethiopia Kayon Mountain',url:'https://whiterhinocoffee.com/products/ethiopia-kayon-mountain',
  story:'The Kayon Mountain Coffee Farm has been owned by Ismael Hassen Aredo. Roast: Light. Origin: Oromia, Guji, Shakiso, Ethiopia. Process: Washed. Growing Altitude: 1900-2200 MASL. Tasting Notes: Nectarine, Jasmine, Toffee, Honeysuckle.'},
 411:{name:'Hidden Eagle (Espresso Blend)',url:'https://whiterhinocoffee.com/products/hidden-eagle-espresso',
  story:'A medium roasted espresso made of Natural Brazil and Washed Peru coffees. Roast: Medium. Origin: Brazil & Peru. Process: Natural & Washed. Growing Altitude: 900-1800 meters. Tasting Notes: Cocoa, Nut Butter, Honey, Dried Apricot, Caramel.'}
};
const page=(c,story=c.story,extra='')=>'<main><article class="product"><h1>'+c.name+'</h1><div class="product__description">'+story+'</div></article></main>'+extra;
for(const n of [409,410,411]){
 const c=cases[n];
 test('#'+n+' exact current H1 and same-product literal specs',()=>{
  const r=selectedWhiteRhinoChecks(n,page(c),[c.name]);
  assert.equal(r.uniqueSelected,true);assert.equal(r.ownDescription,true);assert.ok(r.ownSourcePhrases.every(Boolean));
 });
 test('#'+n+' absent duplicate swapped H1 fails closed',()=>{
  for(const names of [[],[c.name,c.name],['Coffee From Another Roaster']])
   assert.equal(selectedWhiteRhinoChecks(n,page(c),names).uniqueSelected,false);
 });
 test('#'+n+' navigation and neighboring products never replace selected prose',()=>{
  const aside='<nav>'+c.story+'</nav><aside>'+c.story+'</aside><footer>'+c.story+'</footer><script>'+c.story+'</script>';
  assert.equal(selectedWhiteRhinoChecks(n,page(c,'',aside),[c.name]).ownDescription,false);
 });
 test('#'+n+' selected source removal is an explicit failure',()=>{
  const removed=c.story.replaceAll(n===409?'Swiss Water Process':n===410?'Ismael Hassen':'Washed Peru','RETRACTED');
  assert.equal(selectedWhiteRhinoChecks(n,page(c,removed),[c.name]).ownDescription,false);
 });
 test('#'+n+' actual parser retains source-selected identity with hostile other-coffee aside',()=>{
  const other=cases[n===409?410:409];
  const r=extractPublicCoffeeFacts(page(c,c.story,'<aside>'+other.story+'</aside>'),{source_url:c.url});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(!/kayon|ethiopia|guji/i.test(n===409?r.fields.origin||'':''),JSON.stringify(r.fields));
  assert.ok(!/guatemala/i.test(n===410?r.fields.origin||'':''),JSON.stringify(r.fields));
 });
}
test('White Rhino lower generic Ethiopia/Colombia panel is not a Kayon selected origin',()=>{
 const c=cases[410];
 const html=page(c,c.story,'<aside><h2>Tasting Notes</h2>Origin: Ethiopia Colombia. Growing Altitude: 1200-2100 meters.</aside>');
 const r=extractPublicCoffeeFacts(html,{source_url:c.url});
 assert.equal(r.ok,true,JSON.stringify(r));assert.ok(!/colombia/i.test(r.fields.origin||''));
});
test('White Rhino no direct prose does not license invented named grower',()=>{
 const c=cases[410],r=extractPublicCoffeeFacts(page(c,'This is a lovely light roast.'),{source_url:c.url});
 assert.equal(r.ok,true,JSON.stringify(r));assert.ok(!/ismael hassen/i.test(r.fields.producer||''));
});