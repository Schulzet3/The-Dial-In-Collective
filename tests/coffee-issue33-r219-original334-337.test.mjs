import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const cases=[
 {n:334,name:'Colombia La Muralla',url:'https://smallplanescoffee.com/products/colombia-la-muralla',
  specs:['Country: Colombia','Department: Huila','Municipality: San Agustín','Producer: La Muralla Community',
   'Variety: Castillo, Colombia, Caturra, Pink Bourbon','Elevation: 1,700-1,900 masl','Process: Washed',
   'Roast Level: Light-Medium','Notes: Pomegranate, Brown Butter, Goldenberry'],
  roast:'Medium-Light',notes:['Pomegranate','Brown Butter','Goldenberry']},
 {n:337,name:'Corpse Pose Decaf',url:'https://snowyelk.com/products/corpse-pose-decaf',
  specs:['Tasting Notes: Nutty and smooth with a delicate sweetness and hints of chocolate',
   'Roast Level: Medium','Origin: Peru','Process: Washed, Swiss Water Processed',
   'The Swiss Water Process is a chemical-free decaffeination process, naturally removing caffeine while ensuring the integrity, taste, and quality of the coffee beans.'],
  roast:'Medium',notes:['Nutty','chocolate']}
];
function parse(c,other=''){
 const ld={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'Current Seller'}};
 const html='<!doctype html><html><head><title>OLDER OTHER COFFEE DARK HONEY SUGARCANE GUATEMALA</title>'+
 '<script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body>'+
 '<main><article class="product"><h1>'+c.name+'</h1><section class="product-description">'+
 c.specs.map(s=>'<p>'+s+'</p>').join('')+'</section></article></main>'+other+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('selected H1 and exact product URL outrank stale title, SEO, and other-coffee labels',()=>{
 for(const c of cases){const p=parse(c);assert.equal(p.ok,true,'#'+c.n);assert.equal(p.fields.name,c.name);
  assert.ok(!(p.conflicts||[]).includes('name'));assert.doesNotMatch(String(p.fields.name),/Guatemala|Honey/i);}
});
test('#334 selected country, growing municipality and producer are not sibling or blend component',()=>{
 const p=parse(cases[0],'<aside class="related-products">Other Arboretum blend, Ethiopia Natural.</aside>');
 assert.match(String(p.fields.origin||''),/Huila|Colombia/i);
 assert.match(String(p.fields.producer||''),/La Muralla/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Ethiopia/i);
 assert.notEqual(p.fields.process,'Natural');
});
test('#334 direct Light-Medium roast and Washed green process remain distinct',()=>{
 const p=parse(cases[0]);assert.equal(p.fields.name,cases[0].name);assert.equal(p.fields.process,'Washed');
 assert.equal(p.fields.roast_level,'Medium-Light');assert.ok(!p.fields.decaffeination_method);
});
test('#334 labeled NOTES outrank unlabeled shop prose or stale SEO',()=>{
 const p=parse(cases[0],'<aside class="related-products">Guatemala Mango Swiss Water other product</aside>');
 for(const note of cases[0].notes)assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Mango|Guatemala/i);
});
test('#337 own full-decaf method Swiss Water separated from genuine green Washed',()=>{
 const p=parse(cases[1]);assert.equal(p.fields.name,cases[1].name);
 assert.equal(p.fields.process,'Washed');assert.equal(p.fields.decaffeination_method,'Water Process');
 assert.notEqual(p.fields.decaffeination_method,'Sugar Process');
});
test('#337 own roast, Peru origin and selected tasting; no awards as flavors',()=>{
 const p=parse(cases[1]);assert.equal(p.fields.roast_level,'Medium');
 assert.match(String(p.fields.origin||''),/Peru/i);
 for(const note of cases[1].notes)assert.match(String(p.fields.tasting_notes||''),new RegExp(note,'i'));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Bronze|Golden Bean|Mango/i);
});
test('neither selected seller page implies an espresso recipe or automatic user save',()=>{
 for(const c of cases){const p=parse(c,'<aside class="related-products">Other 1:17 filter recipe</aside>');
  assert.ok(!p.fields.espresso_recipe,'#'+c.n+' invented espresso recipe');}
});
test('R219 dedicated workflow PR and push path filters include owned direct dependencies',()=>{
 const w=readFileSync(new URL('../.github/workflows/issue33-r219-original334-337.yml',import.meta.url),'utf8');
 const [pr,post='']=w.split(/^  push:\s*$/m),push=post.split(/^permissions:\s*$/m)[0];
 for(const f of [
  'tests/coffee-issue33-r219-original334-337.test.mjs',
  'scripts/audit/issue33-r219-original334-337-check.mjs',
  'docs/workstreams/ops-issue33-r219-334-337-20261115.md',
  'scripts/audit/issue33-original603-focused-source-review.mjs',
  'scripts/audit/issue33-selected-product-heading.mjs',
  'src/server/coffee-page-metadata.mjs','src/server/coffee-direct-product-prose.mjs',
  'src/server/coffee-product-scope.mjs','src/server/coffee-selected-offer-h2.mjs',
  'src/server/coffee-html-structure.mjs','src/server/coffee-url-guard.mjs',
  'site/cloud/coffee-url-autofill.js'
 ]){assert.ok(pr.includes('      - '+f),'PR missing '+f);
   assert.ok(push.includes('      - '+f),'push missing '+f);}
 assert.match(w,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS:\s*'334,337'/);
});
