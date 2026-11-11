import test from 'node:test';
import assert from 'node:assert/strict';
import {selected108,currentDirectProof,selected108FieldsOk} from '../scripts/audit/issue33-r108-551-552-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const u='Flavor Notes- Dark Chocolate, Raisins, Vanilla. Elevation: 1300 to 2000 meters. Varietals: Bourbon,Kenya SL14,Kenya SL28. Milling Process: Fully Washed. Drying Process: Patio Drying. Kawacom buys home-processed coffee from smallholders across the Kapchorwa, Bulambuli and Kween districts on Mt. Elgon.';
const z='Flavor notes: Dried blueberry, peach, lavender, chocolate. Country of Origin: Zambia. Region: Northern Province. Farm Name: Isanya Estate. Processing: Natural/Dry Processed. Growing Altitude: >1600m. Harvest Season: 2020/21. Variety: Catimor 129, Java.';
const page=(n,description,aside='')=>'<html><head><meta property="og:type" content="product"><meta property="og:url" content="'+selected108[n].url+'"></head><body><main><article class="product"><h1>'+selected108[n].name+'</h1><section class="product__description">'+description.split('. ').map(x=>'<p>'+x+'</p>').join('')+'</section></article>'+aside+'</main></body></html>';
test('551 direct selected literals and exact product identity, not menu/SEO',()=>{
 const p=currentDirectProof(page(551,u),551);
 assert.equal(p.uniqueH1,true);assert.ok(p.direct.every(x=>x.matched),JSON.stringify(p));
});
test('552 direct selected literals and exact product identity, not other lot',()=>{
 const p=currentDirectProof(page(552,z),552);
 assert.equal(p.uniqueH1,true);assert.ok(p.direct.every(x=>x.matched),JSON.stringify(p));
});
test('same URL with recycled title or two current titles fails identity',()=>{
 for(const n of [551,552]){
   const html=page(n,n===551?u:z);
   assert.equal(currentDirectProof(html.replace('<h1>'+selected108[n].name+'</h1>','<h1>Another coffee</h1>'),n).uniqueH1,false);
   assert.equal(currentDirectProof(html.replace('</h1>','</h1><h1>Other coffee</h1>'),n).uniqueH1,false);
 }
});
test('related, navigation, or metadata-only facts do not establish direct facts',()=>{
 for(const n of [551,552]){
   const p=currentDirectProof(page(n,'No source-printed growing or flavor facts.','<aside>'+(n===551?u:z)+'</aside><nav>'+(n===551?u:z)+'</nav>'),n);
   assert.equal(p.uniqueH1,true);
   assert.ok(p.direct.some(x=>!x.matched),JSON.stringify(p));
 }
});
test('changed selected processing or identity invalidates official direct contract',()=>{
 assert.ok(currentDirectProof(page(551,u.replace('Fully Washed','Natural')),551).direct.some(x=>!x.matched));
 assert.ok(currentDirectProof(page(552,z.replace('Isanya Estate','Unrelated Farm')),552).direct.some(x=>!x.matched));
});
test('current Uganda parser retains selected washed notes and variety without malformed leading colon',()=>{
 const p=extractPublicCoffeeFacts(page(551,u),{source_url:selected108[551].url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(selected108FieldsOk(551,p.fields),JSON.stringify(p.fields));
});
test('current Zambia parser retains only selected natural-lot facts and all four notes',()=>{
 const p=extractPublicCoffeeFacts(page(552,z),{source_url:selected108[552].url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(selected108FieldsOk(552,p.fields),JSON.stringify(p.fields));
});
test('foreign coffee content cannot replace the selected product title or tasting notes',()=>{
 const extra='<aside><h2>Kenya Neighbor</h2>washed mango jasmine elderflower</aside>';
 const p=extractPublicCoffeeFacts(page(552,z,extra),{source_url:selected108[552].url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/mango|jasmine|elderflower/i);
});
