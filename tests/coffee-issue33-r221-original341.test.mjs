import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://sodality.coffee/products/qunqana-honey';
function parse(extra='',description=[
  'Notes: Margarita, Lemon - Lime, White Wine, Cooked Fruit, Toffee',
  'Producer: Multiple local small-holder farmers','Process: Honey',
  'Variety: Ethiopian Heirloom','Elevation: 1900-2100 masl',
  'Qunqana washing station in located in the Bensa region of Sidama in Ethiopia.',
  'Its founders Asefa Dukamo and MuluGeta Dukamo opened this washing station under Daye Bensa Coffee.',
  'Due to honey processing, we taste a bit of a washed process, with a bit of the natural process.',
  'Brew Profile: METHOD: Orea, RATIO: COFFEE 1:16 WATER, BLOOM: 20% / 30 SECONDS'
]){
 const ld={'@context':'https://schema.org','@type':'Product',name:'Qunqana Honey',url};
 const html='<html><head><title>Old unrelated Kenya Swiss Water Dark Espresso</title>'+
  '<script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body>'+
  '<main><article class="product"><h1>Qunqana Honey</h1><section class="product-description">'+
  description.map(s=>'<p>'+s+'</p>').join('')+'</section></article></main>'+extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#341 chosen product remains Qunqana Honey rather than SEO, menu or sibling',()=>{
 const p=parse('<aside class="related-products">Kenya Swiss Water Rwanda Dark Roast</aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Qunqana Honey');
 assert.ok(!(p.conflicts||[]).includes('name'));
});
test('#341 exact selected five tasting notes never absorb sibling decaf flavor',()=>{
 const p=parse('<aside class="related-products">Swiss Water Cocoa Rye Whiskey Almond</aside>');
 for(const x of ['Margarita','Lemon','Lime','White Wine','Cooked Fruit','Toffee'])
   assert.match(String(p.fields.tasting_notes||''),new RegExp(x,'i'));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Cocoa|Whiskey|Rye|Swiss Water/i);
});
test('#341 explicitly Honey green process not Washed or Natural from sensory comparisons',()=>{
 const p=parse();
 assert.equal(p.fields.process,'Honey');
 assert.ok(!p.fields.decaffeination_method);
});
test('#341 multiple smallholders own producer, washing station founders are not inferred grower',()=>{
 const p=parse();
 assert.match(String(p.fields.producer||''),/small.holder/i);
 assert.doesNotMatch(String(p.fields.producer||''),/Dukamo|Daye Bensa/i);
});
test('#341 chosen origin varietal elevation only from selected product',()=>{
 const p=parse();
 assert.match(String(p.fields.origin||''),/Ethiopia|Sidama|Bensa/i);
 assert.match(String(p.fields.variety||''),/Ethiopian Heirloom/i);
 assert.match(String(p.fields.elevation_m||''),/1900/i);
});
test('#341 Orea 1:16 brew is never an espresso recipe; no unsupported roast',()=>{
 const p=parse();
 assert.ok(!p.fields.espresso_recipe);
 assert.ok(!p.fields.roast_level);
});
test('R221 current official source workflow PR/push track all directly tested and imported dependencies',()=>{
 const w=readFileSync(new URL('../.github/workflows/issue33-r221-original341.yml',import.meta.url),'utf8');
 const [pr,post='']=w.split(/^  push:\s*$/m),push=post.split(/^permissions:\s*$/m)[0];
 for(const f of [
  'tests/coffee-issue33-r221-original341.test.mjs',
  'scripts/audit/issue33-r221-original341-check.mjs',
  'docs/workstreams/ops-issue33-r221-341-20261115.md',
  'scripts/audit/issue33-original603-focused-source-review.mjs',
  'scripts/audit/issue33-selected-product-heading.mjs',
  'src/server/coffee-page-metadata.mjs','src/server/coffee-selected-description-sensory.mjs',
  'src/server/coffee-direct-product-prose.mjs','src/server/coffee-product-scope.mjs',
  'src/server/coffee-selected-offer-h2.mjs','src/server/coffee-html-structure.mjs',
  'src/server/coffee-url-guard.mjs','site/cloud/coffee-url-autofill.js',
  'tests/coffee-issue33-r217-workflow-dependencies.test.mjs'
 ]){
  assert.ok(pr.includes('      - '+f),'PR missing '+f);
  assert.ok(push.includes('      - '+f),'push missing '+f);
 }
 assert.match(w,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS:\s*'341'/);
});
