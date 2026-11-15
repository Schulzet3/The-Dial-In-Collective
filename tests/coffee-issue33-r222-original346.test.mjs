import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://sparkyscraftcoffeeroasting.com/products/below-zero-blend';
const own=[
 'Washing Station | Idido',
 'Process | Natural',
 'Variety | Heirloom Ethiopian Varieties',
 'Elevation | 1850-1880 MASL',
 'Region | Idido, Yirgacheffe',
 'Country | Ethiopia',
 'Harvest | October-January'
];
const geography=[
 'Idido is the village, or kebele, where this coffee is grown and processed, in a microregion of Yirgacheffe.',
 'Coffee thrives in Yirgacheffe forests, developing nuanced floral characteristics, articulate sweetness and sparkling acidity.',
 'However coffee has adapted to arid Harrar in northeast Ethiopia. The varieties planted there have historically had more chocolatey rich undertones.'
];
function parse(description=[...own,...geography],extra=''){
 const ld={'@context':'https://schema.org','@type':'Product',name:'Below Zero Ethiopia Natural',url};
 const html='<html><head><title>Old Dark Roast Swiss Water | Shop</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head>'+
 '<body><main><article class="product"><h1>Below Zero Ethiopia Natural</h1><section class="product-description">'+
 description.map(s=>'<p>'+s+'</p>').join('')+'</section></article></main>'+extra+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#346 exact chosen product wins against stale SEO and different coffee',()=>{
 const p=parse(undefined,'<aside class="related-products"><h2>Kenya Dark Roast Swiss Water</h2>Chocolate Walnut Sweetness</aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Below Zero Ethiopia Natural');
 assert.ok(!(p.conflicts||[]).includes('name'));
});
test('#346 labeled own Natural process is not confused with prose about regions',()=>{
 const p=parse();
 assert.equal(p.fields.process,'Natural');
 assert.ok(!p.fields.decaffeination_method);
});
test('#346 own selected variety elevation and origin survive',()=>{
 const p=parse();
 assert.match(String(p.fields.variety||''),/Heirloom/i);
 assert.match(String(p.fields.elevation_m||''),/1850/i);
 assert.match(String(p.fields.origin||''),/Yirgacheffe|Ethiopia|Idido/i);
});
test('#346 generic Yirgacheffe florals and Harrar chocolate are NOT selected tasting notes',()=>{
 const p=parse();
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/floral|chocolatey|articulate sweetness|sparkling acidity/i);
});
test('#346 station is not an individually identified grower; no unsupported roast/espresso',()=>{
 const p=parse();
 assert.doesNotMatch(String(p.fields.producer||''),/Harrar|Yirgacheffe forests|Ethiopian varieties/i);
 assert.ok(!p.fields.roast_level);
 assert.ok(!p.fields.espresso_recipe);
});
test('#346 actual own labeled Notes can override empty generic background',()=>{
 const p=parse([...own,'Notes: Lychee, Raspberry, Bergamot',...geography]);
 const t=String(p.fields.tasting_notes||'');
 for(const name of ['Lychee','Raspberry','Bergamot'])assert.match(t,new RegExp(name,'i'));
 assert.doesNotMatch(t,/Harrar|chocolatey|generic Yirgacheffe/i);
});
test('#346 sibling reviews and footer not selected source notes',()=>{
 const p=parse([...own,...geography],'<aside class="related-products"><h2>Swiss Water Decaf</h2>Notes: Marshmallow, Cocoa</aside><section class="customer-reviews">Customer says Best chocolate ever</section>');
 const t=String(p.fields.tasting_notes||'');
 assert.doesNotMatch(t,/Marshmallow|Cocoa|Best chocolate/i);
 assert.ok(!p.fields.decaffeination_method);
});
test('R222 public original346 workflow PR/push trigger selected direct and imported source dependencies',()=>{
 const w=readFileSync(new URL('../.github/workflows/issue33-r222-original346.yml',import.meta.url),'utf8');
 const [pr,post='']=w.split(/^  push:\s*$/m),push=post.split(/^permissions:\s*$/m)[0];
 for(const f of [
  '.github/workflows/issue33-r222-original346.yml',
  'tests/coffee-issue33-r222-original346.test.mjs',
  'scripts/audit/issue33-r222-original346-check.mjs',
  'docs/workstreams/ops-issue33-r222-346-20261115.md',
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
 assert.match(w,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS:\s*'346'/);
});
