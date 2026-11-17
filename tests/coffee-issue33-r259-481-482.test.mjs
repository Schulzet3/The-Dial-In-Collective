import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {entries,identityProof,fieldProof} from '../scripts/audit/issue33-r259-481-482-check.mjs';
const cases=Object.fromEntries(entries.map(e=>[e.number,e]));
const source=(number,body,other='')=>'<html><head><title>'+cases[number].name+'</title></head><body><main><article class="product"><h1>'+cases[number].name+'</h1><div class="product__description">'+body+'</div></article></main>'+other+'</body></html>';
const content={
 481:'<p>TASTING NOTES: Brown Sugar, Red Apple</p><p>ORIGIN: Burundi, Gatara, Kayanza</p><p>PRODUCER / FARM: Masha Station</p><p>PROCESS: Washed</p><p>VARIETY: Red Bourbon</p><p>ELEVATION: 1,600–1,700 MASL</p><p>ROAST: Medium</p>',
 482:'<p>TASTING NOTES: Grapefruit, Cocoa</p><p>ORIGIN: Ecuador, Pichincha</p><p>PRODUCER / FARM: Pablo Ponce</p><p>PROCESS: Washed</p><p>VARIETY: Sidra</p><p>ELEVATION: 2450 MASL</p><p>ROAST: Medium</p>'
};
const parse=(n,body=content[n],other='')=>extractPublicCoffeeFacts(source(n,body,other),{source_url:cases[n].url});
for(const n of [481,482]){
 test('#'+n+' selected product has exactly its own matching H1 and direct fields',()=>{
  const markup=productMarkup(source(n,content[n]));
  const headings=selectedProductHeadings(markup);
  assert.equal(identityProof(n,markup,headings).selected,true);
  assert.ok(identityProof(n,markup,headings).own_fields);
  for(const wrong of [[],['Different Coffee'],[cases[n].name,cases[n].name]])
   assert.equal(identityProof(n,markup,wrong).selected,false);
 });
 test('#'+n+' direct selected facts and Add Coffee / Source Review remain source-bound',()=>{
  const p=parse(n);
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.equal(p.fields.name,cases[n].name,JSON.stringify(p.fields));
  const checks=fieldProof(n,p.fields);
  // Synthetic fixture declares no roaster name. Keep exact merchant identity
  // assertion for guarded real HTML afterproof, not this deliberately minimal mock.
  delete checks.roaster;
  for(const [key,passes] of Object.entries(checks))assert.ok(passes,key+' '+JSON.stringify(p.fields));
  assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
  assert.ok(coffeeSourceReviewSnapshot({...p,source_url:cases[n].url}));
 });
 test('#'+n+' cannot inherit sidebar/reviews or unrelated historical geography',()=>{
  const fake='<aside class="related-products"><h2>Different Coffee</h2>TASTING NOTES: Blueberry, Tobacco ORIGIN Italy PROCESS Natural VARIETY Gesha ROAST Dark</aside>'+
   '<section id="reviews">customer says cinnamon and Kenya at 2600 masl</section>';
  const p=parse(n,content[n],fake);
  assert.equal(p.ok,true,JSON.stringify(p));
  const serialized=JSON.stringify(p.fields||{});
  assert.doesNotMatch(serialized,/blueberry|tobacco|cinnamon|kenya|2600|\bitaly\b/i,serialized);
  assert.equal(p.fields.process,'Washed',serialized);
 });
}
test('selected product cannot transfer its farmer biography, generic history or sibling identity',()=>{
 const s=content[482]+'<p>Producer Pablo once lived in Milan, Italy. Coffee began in Ecuador in the nineteenth century.</p>';
 const p=parse(482,s);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(p.fields.origin||'',/italy|milan|1800|19th/i);
 assert.equal(p.fields.producer,'Pablo Ponce',JSON.stringify(p.fields));
});
test('unavailable official source is not historical/oracle certification',()=>{
 const errors=requiredFocusedSourceFailures([481,482],[{number:481,status:'UNAVAILABLE',parser_ok:false},{number:482,status:'UNAVAILABLE',parser_ok:false}]);
 assert.ok(errors.filter(x=>x.reason==='required_official_source_not_fetched').length>=2);
});
