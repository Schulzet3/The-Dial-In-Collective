import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const rows=[
 {number:328,name:'Ethiopia Yirgacheffe',url:'https://singlespeedcoffeeroasters.com/products/copy-of-espresso-blend',text:'Origin: Africa. Region: Yirgacheffe. Farm: Smallholder Farms. Producer: Local Producers. Elevation: 1.800-2.000. Varietal: Heirloom. Process: Washed. Roast level: Light/Medium. Cupping Notes: Floral - black tea - lemon - orange - bright and crisp.'},
 {number:329,name:'Costa Rican - Tesoros Volcanicos',url:'https://singlespeedcoffeeroasters.com/products/costa-rican-tesoros-volcanicos',text:'Tesoros Volcanicos blends smallholder lots from various regions. The cocoa and caramel notes West Valley is known for, body and sweet floral notes from Brunca, and brilliant citrus from Tarrazu. Origin: Costa Rica. Region: West Valley, Brunca, Tarrazu. Farm: Small holders. Producer: Regional Producers. Process: Washed. Roast level: Light/Medium. Cupping Notes: Moderate acidity and body - clean - sweet - balanced.'},
 {number:330,name:'Sumatra Mandheling',url:'https://singlespeedcoffeeroasters.com/products/sumatra-mandheling',text:'Lintong lies southwest of Lake Toba. Origin: Indonesia. Region: Lintong TP. Farm: Small holder farms. Producer: Local Producers. Varietal: Sigararutang, Jember Lini S795, Andungsari. Process: Wet Hulled. It is pulped, stored overnight and dried on patios. Roast level: Medium/Dark. Cupping Notes: Milk Chocolate, Green Pepper, Earthy.'}
];
function parse(c,related='',seo='WRONG OTHER COFFEE SWISS WATER GUATEMALA MANGO'){
 const schema={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'Single Speed Coffee Roasters'}};
 const html='<!doctype html><html><head><title>'+seo+'</title><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+c.name+'</h1><div class="product-description"><p>'+c.text+'</p></div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('#328 exact identity wins over copy-of-espresso-blend URL and stale SEO',()=>{
 const p=parse(rows[0]);assert.equal(p.ok,true);assert.equal(p.fields.name,rows[0].name);
 assert.doesNotMatch(String(p.fields.name),/Espresso Blend|Guatemala/i);assert.ok(!p.fields.decaffeination_method);
});
test('#328 direct region and Washed; no related coffee or SEO sensory leakage',()=>{
 const p=parse(rows[0],'<aside class="related-products">Other Kenyan anaerobic mango</aside>');
 assert.equal(p.fields.process,'Washed');
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Kenyan|mango|Guatemala/i);
});
test('#329 exact selected Costa Rican multi-region identity remains distinct',()=>{
 const p=parse(rows[1]);assert.equal(p.ok,true);assert.equal(p.fields.name,rows[1].name);
 assert.doesNotMatch(String(p.fields.origin||''),/Guatemala/i);assert.ok(!p.fields.decaffeination_method);
});
test('#329 direct cocoa/caramel description should survive in canonical or review evidence',()=>{
 const p=parse(rows[1]);assert.ok((p.source_facts||[]).some(f=>/cocoa|caramel/i.test(String(f.value||'')))||/cocoa|caramel/i.test(String(p.fields.tasting_notes||'')));
});
test('#330 source wet-hulled is not automatically converted to green Washed',()=>{
 const p=parse(rows[2]);assert.equal(p.fields.name,rows[2].name);assert.notEqual(p.fields.process,'Washed');
 assert.ok(!p.fields.decaffeination_method);
});
test('#330 selected milk chocolate/green pepper not sibling mango',()=>{
 const p=parse(rows[2],'<aside class="related-products">OTHER GUATEMALA SWISS WATER MANGO</aside>');
 assert.match(String(p.fields.tasting_notes||''),/Milk Chocolate|Green Pepper|Earthy/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/mango|Guatemala/i);
});
test('all cases remain separate user-selected, no espresso recipe or name conflict',()=>{
 for(const c of rows){const p=parse(c);assert.equal(p.ok,true);assert.equal(p.fields.name,c.name);
 assert.ok(!p.fields.espresso_recipe);assert.ok(!(p.conflicts||[]).includes('name'));}
});
test('R216 workflow includes actual executed source inputs, own test and journal on PR and push',()=>{
 const w=readFileSync(new URL('../.github/workflows/issue33-r216-original328-330.yml',import.meta.url),'utf8');
 const [pr,more='']=w.split(/^  push:\s*$/m),push=more.split(/^permissions:\s*$/m)[0];
 for(const f of ['scripts/audit/issue33-original603-focused-source-review.mjs','scripts/audit/issue33-selected-product-heading.mjs','src/server/coffee-product-scope.mjs','src/server/coffee-page-metadata.mjs','src/server/coffee-direct-product-prose.mjs','docs/workstreams/ops-issue33-r216-328-330-20261115.md','tests/coffee-issue33-r216-original328-330.test.mjs']){
 assert.ok(pr.includes('      - '+f),'PR missing '+f);assert.ok(push.includes('      - '+f),'push missing '+f);}
 assert.match(w,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS:\s*'328,329,330'/);
});
