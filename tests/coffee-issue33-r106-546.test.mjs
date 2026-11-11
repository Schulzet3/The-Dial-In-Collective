import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen,selectedProof} from '../scripts/audit/issue33-r106-546-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://'+chosen.host+chosen.path;
const current='Sourced from Finca Berlin in the mountains of Táchira State, this exceptional microlot from producer Alfredo Rojas showcases the innovation and resurgence of Venezuelan specialty coffee. Processed using an anaerobic honey method. In the cup, vibrant notes of fresh coffee cherry and dried cascara lead the way, layered with mellow cocoa and warm spice.';
const specs='<h2>Tasting Notes</h2><ul><li>Fresh Coffee Cherry</li><li>Dried Cascara</li><li>Mellow Cocoa</li><li>Warm Spice</li></ul><h2>Roast Level</h2><p>Medium Roast</p><h2>Origin Details</h2><ul><li>Country: Venezuela</li><li>Region: Junín Municipality, Táchira State</li><li>Farm: Finca Berlin</li><li>Producer: Alfredo Rojas</li><li>Lot: Microlot</li><li>Elevation: ~1100 MASL</li><li>Variety: Monte Claro</li><li>Process: Anaerobic Honey</li><li>Harvest: September – January</li></ul>';
const html=(body=current,extra='',name=chosen.name)=>'<html><head><meta property="og:type" content="product"><meta property="og:url" content="'+url+'"><meta property="og:site_name" content="Reading Coffee Company"></head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description"><p>'+body+'</p>'+specs+'</div></article>'+extra+'</main></body></html>';
test('current selected official product has one exact H1 and all twelve direct literals',()=>{
 const x=selectedProof(html());assert.equal(x.uniqueH1,true);assert.equal(x.direct.length,12);assert.ok(x.direct.every(Boolean));
});
test('different, empty or duplicate product H1 fail exact current selected identity',()=>{
 for(const v of [html(current,'','Different coffee'),html(current,'',''),html().replace('</h1>','</h1><h1>Other Coffee</h1>')])
  assert.equal(selectedProof(v).uniqueH1,false);
});
test('navigation, sidebar or SEO facts cannot substitute for missing selected product content',()=>{
 const empty='<html><head><meta name="description" content="'+current+'"></head><body><main><article class="product"><h1>Venezuela</h1><p>Only a price.</p></article><aside>'+current+specs+'</aside></main></body></html>';
 const x=selectedProof(empty);assert.equal(x.uniqueH1,true);assert.ok(x.direct.every(v=>v===false));
});
test('a revised current lot or omitted spec fails literal source proof',()=>{
 const changed=html().replaceAll('Alfredo Rojas','Different producer').replace('Variety: Monte Claro','Variety: Caturra');
 const x=selectedProof(changed);
 assert.equal(x.direct[1],false);assert.equal(x.direct[10],false);
});
test('exact chosen selected product parser never promotes unrelated roaster taxonomy flavor as own tasting note',()=>{
 const p=extractPublicCoffeeFacts(html(current,'<aside>Flavors: Roasted Fruit. Other coffee: Red Apple, Brown Sugar.</aside>'),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosen.name);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/roasted fruit|red apple|brown sugar/i,JSON.stringify(p.fields));
});
test('selected printed origin and producer do not borrow from a neighbor product',()=>{
 const p=extractPublicCoffeeFacts(html(current,'<aside>Guatemala Huehuetenango, Rosa Maria, 2100 meters, Natural.</aside>'),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosen.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Huehuetenango|Rosa Maria|2100 meters/i);
});
test('current selected four explicit notes are retained and recurring harvest calendar is not a dated release',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosen.name);
 assert.ok(['fresh coffee cherry','dried cascara','mellow cocoa','warm spice'].every(t=>String(p.fields.tasting_notes||'').toLowerCase().includes(t)),JSON.stringify(p.fields));
 assert.doesNotMatch(String(p.fields.release_label||''),/September.*January/i);
});
