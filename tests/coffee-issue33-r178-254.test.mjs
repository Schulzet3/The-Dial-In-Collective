import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {chosen254,source254} from '../scripts/audit/issue33-r178-254-check.mjs';
const own='<h1>LIGHT WORK | LIGHT ROAST | COLOMBIA</h1>'+
 '<p>PROCESS -- WASHED</p><p>REGION -- HUILA, COLOMBIA</p>'+
 '<p>ALTITUDE -- 1400-1800 MASL</p><p>CULTIVARS -- CATURRA, CASTILLO, COLOMBIA, BOURBON</p>'+
 '<p>NOTES -- ORANGE, HONEY, APPLE, GRAPE</p>'+
 '<p>Hey! So, your coffee was produced by the 85 women members of "El Bombo" -- a farm cooperative based in Huila, Colombia. El Bombo is focused on strengthening gender equity among women producers.</p>';
const page=(selected=own,other='')=>'<html><head><title>Old Peru Light Roast</title><meta name="description" content="Dark Peru roast, cherry notes, producer Lima"></head><body><nav>Old Peru Caturra</nav><main><article class="product">'+selected+'</article></main>'+other+'<footer>Related Brazil Natural Coffee</footer></body></html>';
const parse=(selected=own,other='')=>extractPublicCoffeeFacts(page(selected,other),{source_url:chosen254.url});
test('#254 exact selected Colombian H1 not inherited Peru URL slug',()=>{
 const s=source254(page());assert.equal(s.identity,true);assert.deepEqual(s.headings,['LIGHT WORK | LIGHT ROAST | COLOMBIA']);
});
test('#254 current own product directly publishes Huila washed origin and full altitude range',()=>{
 const s=source254(page());assert.equal(s.process,true);assert.equal(s.geography,true);assert.equal(s.altitude,true);
});
test('#254 own selected four cultivars and four tasting notes',()=>{
 const s=source254(page());assert.equal(s.cultivars,true);assert.equal(s.four_notes,true);
});
test('#254 named women's cooperative is literal current selected source, not an inferred individual grower',()=>{
 assert.equal(source254(page()).women_cooperative,true);
});
test('#254 actual parser honors current product name over stale Peru SEO',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r).slice(0,1800));
 assert.equal(r.fields?.name,chosen254.name,JSON.stringify(r).slice(0,1800));
});
test('#254 direct selected Light roast outranks stale SEO Dark',()=>{
 const r=parse();assert.equal(r.fields?.roast_level,'Light',JSON.stringify(r).slice(0,2000));
});
test('#254 direct selected Colombia not Peru slug or old metadata',()=>{
 const r=parse();assert.ok(!String(r.fields?.origin||'').toLowerCase().includes('peru'),JSON.stringify(r).slice(0,2000));
});
test('#254 unrelated related-product flavor and producer are excluded',()=>{
 const r=parse(own,'<aside class="related-products"><h2>Peru Dark</h2><p>Producer Lima, notes cherry. Process Natural.</p></aside>');
 assert.ok(!String(r.fields?.tasting_notes||'').toLowerCase().includes('cherry'),JSON.stringify(r).slice(0,1800));
 assert.ok(!String(r.fields?.producer||'').toLowerCase().includes('lima'),JSON.stringify(r).slice(0,1800));
});
test('#254 changed selected H1 must not certify archived Colombia coffee',()=>{
 assert.equal(source254(page(own.replace('LIGHT WORK | LIGHT ROAST | COLOMBIA','LIGHT WORK | LIGHT ROAST | PERU'))).identity,false);
});
test('#254 removed explicit cooperative cannot count as farm producer evidence',()=>{
 assert.equal(source254(page(own.replace(/<p>Hey![\s\S]*?<\/p>/,'<p>Unrelated coffee farmer.</p>'))).women_cooperative,false);
});
test('#254 missing notes cannot pass direct four-note source proof',()=>{
 assert.equal(source254(page(own.replace('ORANGE, HONEY, APPLE, GRAPE','ORANGE, HONEY'))).four_notes,false);
});
test('#254 no decaf method or espresso recipe may be invented from missing publication',()=>{
 const r=parse();assert.ok(!r.fields?.decaffeination_method&&!r.fields?.espresso_recipe,JSON.stringify(r).slice(0,1600));
});
