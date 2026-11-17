import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {entries,selectedEvidence,selectedFields} from '../scripts/audit/issue33-r260-499-500-check.mjs';
const map=Object.fromEntries(entries.map(x=>[x.number,x]));
const words={
 499:'<p>Our ALUX medium dark roast blend is your ticket out of the mundane. It is a fusion of high-altitude Guatemalan, Mexican, and Colombian coffee, each bringing their A-game.</p><p>Notes: Berries, Bakers Chocolate, Almonds</p>',
 500:'<p>A Mexican and Guatemalan dark roast blend bold, rich, and unapologetically deep. From the volcanic soils of Chiapas to the highlands of Huehuetenango, this blend marries the earthy, chocolatey notes of Mexico with the bright, complex flavors of Guatemala. The dark roast adds a layer of smoky intensity, while still letting the origins shine through.</p><p>Notes: Heavy Body, Caramel, Dark Chocolate, Roasted Almonds</p>'
};
const html=(n,description=words[n],other='')=>'<html><body><main><article class="product"><h1>'+map[n].name+'</h1><div class="product__description">'+description+'</div></article></main>'+other+'</body></html>';
const parse=(n,d=words[n],o='')=>extractPublicCoffeeFacts(html(n,d,o),{source_url:map[n].url});
for(const n of [499,500]){
 test('#'+n+' chosen IXXA identity and direct selected prose (not SEO or siblings)',()=>{
  const own=productMarkup(html(n)),heads=selectedProductHeadings(own),proof=selectedEvidence(n,own,heads);
  assert.equal(proof.identity,true);
  assert.equal(proof.direct,true);
  for(const wrong of [[],['Different Blend'],[map[n].name,map[n].name]])
   assert.equal(selectedEvidence(n,own,wrong).identity,false);
 });
 test('#'+n+' current selected notes, roast, blend countries, privacy/explicit preview',()=>{
  const p=parse(n);
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.equal(p.fields.name,map[n].name,JSON.stringify(p.fields));
  const checks=selectedFields(n,p.fields);
  // Synthetic product omits the roaster/site branding; keep roaster mandatory in actual official afterproof.
  delete checks.roaster;
  for(const [key,ok] of Object.entries(checks))assert.ok(ok,key+' '+JSON.stringify(p.fields));
  assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
  assert.ok(coffeeSourceReviewSnapshot({...p,source_url:map[n].url}));
 });
 test('#'+n+' no unrelated related-product, customer review, grind-medium, or date contamination',()=>{
  const related='<aside class="related-products">A different coffee: Colombia, Kenya, Natural, Gesha, washed, Banana, 2100m. Dark Roast</aside>'+
  '<section id="reviews">I taste mint tobacco. Espresso grind Medium (2026).</section>';
  const p=parse(n,words[n],related);
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.doesNotMatch(JSON.stringify(p.fields||{}),/banana|gesha|tobacco|2100|\bkenya\b|mint/i);
  assert.ok(!p.fields.process&&!p.fields.elevation_m);
 });
}
test('unavailable exact selected source has no authority to use archived seller fields',()=>{
 const failures=requiredFocusedSourceFailures([499,500],[{number:499,status:'UNAVAILABLE',parser_ok:false},{number:500,status:'UNAVAILABLE',parser_ok:false}]);
 assert.equal(failures.filter(x=>x.reason==='required_official_source_not_fetched').length,2);
});
