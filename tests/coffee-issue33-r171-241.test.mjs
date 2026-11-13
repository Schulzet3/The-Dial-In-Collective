import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen241,source241} from '../scripts/audit/issue33-r171-241-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const direct='<h1>Buesaco</h1><div><h4>SMALLHOLDER FARMS</h4><p>BUESACO, COLOMBIA</p><p>Tangerine, Maple, Hazelnut</p>'+
 '<p>Buesaco starts with the juiciness of Tangerine, leading into the sweetness of Maple Syrup, and finishes with Hazelnut.</p></div>'+
 '<section><h2>Description</h2><h4>Harvest Details</h4><p>PROCESS</p><p>Washed</p><p>VARIETY</p><p>Castillo, Caturra, Colombia</p>'+
 '<p>ELEVATION</p><p>2100m</p><p>PRODUCER</p><p>Smallholder Farms</p><p>TASTING NOTES</p><p>Cherry, Tangerine, Nougat</p>'+
 '<p>Buesaco sits in the Nariño department of southern Colombia.</p><h4>FAVORITE BREW METHOD</h4><p>TYPE</p><p>Kalita Wave 155</p><p>RATIO</p><p>1:18</p></section>';
const page=(own=direct,other='')=>'<html><head><title>Old Kenya Washed</title><meta name="description" content="Former Ethiopia berry"></head><body>'+
 '<nav>Other products with maple and hazelnut</nav><main><article class="product">'+own+'</article></main>'+other+
 '<footer>Kenya roast recipe</footer></body></html>';
test('#241 current chosen Buesaco has two distinguishable selected sensory descriptions',()=>{
 const s=source241(page());assert.equal(s.identity,true);assert.equal(s.distinct_selected_lists,true);
 assert.deepEqual(Object.entries(s.direct).filter(([,v])=>!v),[]);
});
test('#241 recycled slug and changed current H1 fail selected identity',()=>{
 assert.equal(source241(page(direct.replace('<h1>Buesaco</h1>','<h1>Different coffee 2026</h1>'))).identity,false);
});
test('#241 cannot borrow hero sensory from another product',()=>{
 const body=direct.replace('Tangerine, Maple, Hazelnut','Published flavors unavailable');
 assert.equal(source241(page(body,'<aside>Tangerine, Maple, Hazelnut</aside>')).direct.hero_notes,false);
});
test('#241 cannot borrow labeled harvest notes from footer',()=>{
 const body=direct.replace('Cherry, Tangerine, Nougat','Flavor profile unpublished');
 assert.equal(source241(page(body,'<footer>TASTING NOTES Cherry, Tangerine, Nougat</footer>')).direct.harvest_notes,false);
});
test('#241 current chosen explicit Washed versus unrelated Natural must not swap',()=>{
 const p=extractPublicCoffeeFacts(page(direct,'<aside>PROCESS Natural</aside>'),{source_url:chosen241.url});
 assert.notEqual(p.fields?.process,'Natural',JSON.stringify(p));
});
test('#241 Kalita filter-only 1:18 is never an espresso recipe',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen241.url});
 assert.ok(!p.fields?.espresso_recipe,JSON.stringify(p));
});
test('#241 unrelated historical SEO must not become flavor or origin',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen241.url});
 assert.ok(!String(p.fields?.tasting_notes||'').includes('Ethiopia'),JSON.stringify(p));
 assert.ok(!String(p.fields?.origin||'').includes('Ethiopia'),JSON.stringify(p));
});
test('#241 prose region may enrich source proof, not invent unnamed growers',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen241.url});
 assert.notEqual(p.fields?.producer,'Old Kenyan Grower',JSON.stringify(p));
});
