import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen226,source226} from '../scripts/audit/issue33-r167-226-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h1>Brazil Natural</h1><p>Origin: Mogiana, Brazil</p><p>Roast Level: Medium</p>'+
 '<p>Process: Natural</p><p>Grown and harvested by Diogo, a fifth-generation coffee farmer in the Mogiana region of Brazil, where Yellow Bourbon coffee is consistently considered Brazil’s premium variety.</p>'+
 '<p>Flavor notes: citrus, almond, dark chocolate</p>';
const page=(ownBody=own,elsewhere='')=>'<html><head><title>Old Ethiopia Washed</title><meta name="description" content="Old Peru Caturra strawberry"></head><body>'+
 '<nav>Kenya selected washed</nav><main><article class="product">'+ownBody+'</article></main>'+elsewhere+
 '<footer>Guatemala Honey Robusta</footer></body></html>';
test('#226 selected official heading and direct own evidence',()=>{
 const x=source226(page());assert.equal(x.identity,true);assert.deepEqual(Object.entries(x.direct).filter(([,v])=>!v),[]);
});
test('#226 recycled selected coffee identity cannot certify old original',()=>{
 assert.equal(source226(page(own.replace('<h1>Brazil Natural</h1>','<h1>2026 Peru Geisha</h1>'))).identity,false);
});
test('#226 absent own notes must not borrow unrelated recommendations',()=>{
 const x=source226(page(own.replace('Flavor notes: citrus, almond, dark chocolate','Flavor notes: unpublished'),'<aside>Flavor notes: citrus, almond, dark chocolate</aside>'));
 assert.equal(x.direct.notes,false);
});
test('#226 absent own Natural process must not borrow other product',()=>{
 const x=source226(page(own.replace('Process: Natural','Process: undisclosed'),'<aside>Process: Natural</aside>'));
 assert.equal(x.direct.process,false);
});
test('#226 unrelated grower in footer must not be selected producer',()=>{
 const x=source226(page(own.replace('Grown and harvested by Diogo','Grown and harvested by local smallholders'),'<aside>Grown and harvested by Diogo</aside>'));
 assert.equal(x.direct.grower,false);
});
test('#226 contextual Yellow Bourbon variety is not a stated cultivar of this selected product',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen226.url});
 assert.ok(!p.fields?.variety,JSON.stringify(p));
});
test('#226 actual parser retains chosen Natural processing and Medium roast',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen226.url});
 assert.equal(p.fields?.process,'Natural',JSON.stringify(p));assert.equal(p.fields?.roast_level,'Medium',JSON.stringify(p));
});
test('#226 actual parser retains own origin and exact selected flavor notes rather than SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen226.url});
 assert.ok(String(p.fields?.origin||'').toLowerCase().includes('brazil'),JSON.stringify(p));
 assert.ok(['citrus','almond','chocolate'].every(x=>String(p.fields?.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p));
});
test('#226 actual parser must never infer decaffeination or elevation from nothing',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen226.url});
 assert.ok(!p.fields?.decaffeination_method&&!p.fields?.elevation_m,JSON.stringify(p));
});
