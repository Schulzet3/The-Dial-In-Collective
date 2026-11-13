import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {chosen257,source257} from '../scripts/audit/issue33-r181-257-check.mjs';
const own='<h1>Hacienda Rio Negro</h1>'+
 '<p>In Costa Rica’s southern Coto Brus region, just beside the forests of Parque Nacional La Amistad, Hacienda Río Negro thrives under the same stewardship as Hacienda La Minita. Grown between 1,000 and 1,300 meters and processed at the farm’s own Beneficio Río Negro mill, this washed coffee has cantelope and brown sugar layered with notes of toffee.</p>'+
 '<p>Flavor Profile: Cantelope, Brown Sugar, Silky</p>'+
 '<p>Origin: Coto Brus, Costa Rica</p><p>Process: Washed</p>'+
 '<p>Cultivar: Mixed</p><p>Elevation: 1000-1300 MASL</p>';
const page=(selected=own,other='')=>'<html><head><title>OLD Colombia Dark Coffee</title><meta name="description" content="Former coffee Peru Cherry Decaf"></head><body><nav>Other Peru origin</nav><main><article class="product">'+selected+'</article></main>'+other+'<footer>Related Coffee Colombia Natural</footer></body></html>';
const parse=(selected=own,other='')=>extractPublicCoffeeFacts(page(selected,other),{source_url:chosen257.url});
test('#257 selected actual H1 identity is exact Hacienda Rio Negro',()=>{
 const s=source257(page());assert.equal(s.identity,true);assert.deepEqual(s.headings,[chosen257.name]);
});
test('#257 current exact coffee story is Costa Rica washed and owned current product scope',()=>{
 const s=source257(page());assert.equal(s.origin,true);assert.equal(s.direct_process,true);assert.equal(s.selected_story,true);
});
test('#257 current selected notes include narrative toffee and distinct flavor panel',()=>{
 const s=source257(page());assert.equal(s.narrative_toffee,true);assert.equal(s.direct_profile,true);
});
test('#257 own altitude, cultivar and current sensory evidence present',()=>{
 const s=source257(page());assert.equal(s.altitude,true);assert.equal(s.selected_cultivar,true);
});
test('#257 actual parser identifies selected product despite hostile SEO and navigation',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,2200));
 assert.equal(p.fields?.name,chosen257.name,JSON.stringify(p).slice(0,2200));
 assert.ok(!String(p.fields?.origin||'').toLowerCase().includes('peru'),JSON.stringify(p).slice(0,2200));
});
test('#257 parser preserves selected flavor label and excludes former coffee notes',()=>{
 const p=parse();const notes=String(p.fields?.tasting_notes||'').toLowerCase();
 assert.ok(notes.includes('cantelope')&&notes.includes('brown sugar'),JSON.stringify(p).slice(0,2500));
 assert.ok(!notes.includes('cherry'),JSON.stringify(p).slice(0,2400));
});
test('#257 source negative: replaced selected H1 never certifies prior exact coffee',()=>{
 assert.equal(source257(page(own.replace('Hacienda Rio Negro</h1>','Hacienda La Minita</h1>'))).identity,false);
});
test('#257 related-product toffee or Colombia cannot substitute for own notes or origin',()=>{
 const edited=own.replace('notes of toffee','notes of citrus').replace('Coto Brus, Costa Rica','Coto Brus, Costa Rica');
 const s=source257(page(edited,'<aside class="related-products">Other coffee has notes of toffee, Colombia, washed</aside>'));
 assert.equal(s.narrative_toffee,false);
});
test('#257 old SEO cannot donate decaf processing or espresso recipe',()=>{
 const p=parse();assert.ok(!p.fields?.decaffeination_method&&!p.fields?.espresso_recipe,JSON.stringify(p).slice(0,2500));
});
test('#257 mill and sister estate must not be mistaken for observed named farmers',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,2400));
 assert.ok(!/hacienda la minita/i.test(String(p.fields?.producer||'')),JSON.stringify(p).slice(0,2400));
});

const narrativeFacts=p=>(p.source_facts||[]).filter(f=>f.field==='sensory_context'&&
 f.label==='Selected current narrative additional tasting note (review only)');
test('#257 direct seller toffee is recorded as review-only, labeled flavors remain canonical',()=>{
 const p=parse();const f=narrativeFacts(p);
 assert.equal(f.length,1,JSON.stringify(f));assert.equal(f[0].value,'toffee');
 assert.equal(p.fields?.tasting_notes,'Cantelope, Brown Sugar, Silky');
});
test('#257 a note without two same-sentence labeled anchors is not borrowed',()=>{
 const p=parse(own.replace('cantelope and brown sugar layered','gentle sweetness layered'));
 assert.equal(narrativeFacts(p).length,0,JSON.stringify(narrativeFacts(p)));
});
test('#257 previous-lot narrative is excluded from current source review',()=>{
 const p=parse(own.replace('brown sugar layered with notes of toffee','brown sugar previously layered with notes of toffee'));
 assert.equal(narrativeFacts(p).length,0,JSON.stringify(narrativeFacts(p)));
});
test('#257 with-milk conditional narrative is not an intrinsic flavor suggestion',()=>{
 const p=parse(own.replace('brown sugar layered with notes of toffee','brown sugar layered with notes of toffee when served with milk'));
 assert.equal(narrativeFacts(p).length,0,JSON.stringify(narrativeFacts(p)));
});
test('#257 related-sibling note cannot supply missing selected toffee',()=>{
 const p=parse(own.replace('notes of toffee','notes of chocolate'),'<aside class="related-products"><p>Cantelope and Brown Sugar layered with notes of toffee.</p></aside>');
 assert.ok(narrativeFacts(p).every(x=>x.value!=='toffee'),JSON.stringify(narrativeFacts(p)));
});
