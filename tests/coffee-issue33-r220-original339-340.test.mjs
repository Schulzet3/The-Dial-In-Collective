import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const summit={
 name:'The Summit',url:'https://snowyelk.com/products/the-summit',
 specs:['Tasting Notes: Chocolate brownie, pomegranate, and dried cherry',
  'Roast Level: Dark','Origin: Blend, Colombia & Brazil',
  'Process: Washed & Semi-Washed','Recommended Brewing Methods: Cold Brew, Drip Machine']};
const brisas={
 name:'Las Brisas',url:'https://sodality.coffee/products/las-brisas-nicaragua',
 specs:['Notes: Lemon Lime Soda, Greek Yogurt, Dried Fruit, Graham, Rooibos Tea',
  'Producer: Las Brisas Microfarm','Process: Washed',
  'Variety: Centroamericano','Elevation: 1300-1500 masl',
  'La Bastilla Coffee Estates, located in the north-east region of Jinotega, Nicaragua.',
  'Brew Profile: METHOD: April Dripper; COFFEE 1:16 WATER; BLOOM: 10% / 20 SECONDS']};
function parse(c,extra=''){
 const ld={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,
  brand:{'@type':'Brand',name:'Correct Seller'}};
 const html='<!doctype html><html><head><title>Old unrelated Guatemala Honey other coffee</title>'+
  '<script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body>'+
  '<main><article class="product"><h1>'+c.name+'</h1><section class="product-description">'+
  c.specs.map(s=>'<p>'+s+'</p>').join('')+'</section></article></main>'+
  extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('selected coffee names outrank stale SEO and other products',()=>{
 for(const c of [summit,brisas]){
  const p=parse(c,'<aside class="related-products">Swiss Water Mango Kenya G2 Guatemala</aside>');
  assert.equal(p.ok,true,c.name);assert.equal(p.fields.name,c.name);
  assert.ok(!(p.conflicts||[]).includes('name'));
 }
});
test('#339 own chocolate brownie pomegranate and cherry direct notes outrank site recommendations',()=>{
 const p=parse(summit,'<aside class="related-products">Other coffee: Greek Yogurt, Rooibos Tea, Swiss Water</aside>');
 for(const note of ['Chocolate brownie','pomegranate','dried cherry'])
  assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Greek Yogurt|Rooibos|Swiss Water/i);
});
test('#339 Colombia and Brazil blend, Dark roast and mixed processing preserved',()=>{
 const p=parse(summit);assert.equal(p.fields.roast_level,'Dark');
 assert.match(String(p.fields.origin||''),/Colombia/i);
 assert.match(String(p.fields.origin||''),/Brazil/i);
 assert.notEqual(p.fields.process,'Washed');
 assert.ok(!p.fields.decaffeination_method);
});
test('#340 own labeled tasting and producer fields from exact chosen product',()=>{
 const p=parse(brisas,'<aside class="related-products">Summit Dark pomegranate washed&semiwashed</aside>');
 for(const note of ['Lemon Lime Soda','Greek Yogurt','Dried Fruit','Graham','Rooibos Tea'])
  assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.match(String(p.fields.producer||''),/Las Brisas Microfarm/i);
 assert.equal(p.fields.process,'Washed');
 assert.match(String(p.fields.variety||''),/Centroamericano/i);
});
test('#340 no sourced roast, decaf method, or espresso prescription is not invented',()=>{
 const p=parse(brisas);assert.ok(!p.fields.roast_level);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(!p.fields.espresso_recipe);
});
test('cold-brew and April Dripper brew profiles never become selected espresso recipe',()=>{
 for(const c of [summit,brisas]){
  const p=parse(c);assert.ok(!p.fields.espresso_recipe,c.name);
 }
});
test('R220 official-source workflow PR and push paths track actual tested source dependencies',()=>{
 const w=readFileSync(new URL('../.github/workflows/issue33-r220-original339-340.yml',import.meta.url),'utf8');
 const [pr,post='']=w.split(/^  push:\s*$/m),push=post.split(/^permissions:\s*$/m)[0];
 for(const f of [
  'tests/coffee-issue33-r220-original339-340.test.mjs',
  'scripts/audit/issue33-r220-original339-340-check.mjs',
  'docs/workstreams/ops-issue33-r220-339-340-20261115.md',
  'scripts/audit/issue33-original603-focused-source-review.mjs',
  'scripts/audit/issue33-selected-product-heading.mjs',
  'src/server/coffee-page-metadata.mjs','src/server/coffee-selected-description-sensory.mjs',
  'src/server/coffee-direct-product-prose.mjs',
  'src/server/coffee-product-scope.mjs','src/server/coffee-selected-offer-h2.mjs',
  'src/server/coffee-html-structure.mjs','src/server/coffee-url-guard.mjs',
  'site/cloud/coffee-url-autofill.js'
 ]){
  assert.ok(pr.includes('      - '+f),'PR missing '+f);
  assert.ok(push.includes('      - '+f),'push missing '+f);
 }
 assert.match(w,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS:\s*'339,340'/);
});
