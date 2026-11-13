import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {chosen253,source253} from '../scripts/audit/issue33-r177-253-check.mjs';
const own='<h1>GET RIGHT | MEDIUM ROAST | BRAZIL</h1>'+
 '<p>PROCESS -- NATURAL</p><p>REGION -- MINAS GERAIS, BRAZIL</p>'+
 '<p>ALTITUDE -- 1100 MASL</p><p>CULTIVARS -- CATUAI</p>'+
 '<p>NOTES -- ALMOND, BROWN SUGAR, VANILLA</p>'+
 '<p>Your coffee is comprised of three different farms spread across the Minas Gerais region of Brazil. The small variations in flavor from the Fazenda Furnas, Apostolo Simao, and Boa Vista farms combine to create a cup that is consistently clean and delicious.</p>';
const page=(selected=own,other='')=>'<html><head><title>Old Peru Dark Roast</title><meta name="description" content="Dark Peru roast with strawberry notes"></head><body><nav>Light Colombia Espresso</nav><main><article class="product">'+selected+'</article></main>'+other+'<footer>Related Colombia Honey Process</footer></body></html>';
const parse=(selected=own,other='')=>extractPublicCoffeeFacts(page(selected,other),{source_url:chosen253.url});
test('#253 exact own selected H1, not a Brazil-looking URL slug',()=>{
 const s=source253(page());assert.equal(s.identity,true);assert.deepEqual(s.headings,['GET RIGHT | MEDIUM ROAST | BRAZIL']);
});
test('#253 own product publishes natural processing and Minas Gerais',()=>{
 const s=source253(page());assert.equal(s.process,true);assert.equal(s.geography,true);
});
test('#253 own product publishes altitude, cultivar, three notes and farms',()=>{
 const s=source253(page());assert.equal(s.altitude,true);assert.equal(s.cultivar,true);assert.equal(s.own_notes,true);assert.equal(s.three_named_farms,true);
});
test('#253 current selected name outranks stale Peru title and Colombian navigation',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r).slice(0,1800));
 assert.equal(r.fields?.name,chosen253.name,JSON.stringify(r).slice(0,1800));
});
test('#253 stale metadata must not replace own product sensory facts',()=>{
 const r=parse();const notes=String(r.fields?.tasting_notes||'').toLowerCase();
 assert.ok(!notes.includes('strawberry'),JSON.stringify(r).slice(0,2000));
});
test('#253 own exact MEDIUM ROAST remains a positive bounded roast fact',()=>{
 const r=parse();assert.equal(r.fields?.roast_level,'Medium',JSON.stringify(r).slice(0,2100));
});
test('#253 another coffee in related aside is not own producer, notes or process',()=>{
 const r=parse(own,'<aside class="related-products"><h2>Colombia Natural</h2><p>Producer Bogota, notes strawberry. Process Washed. Roast Dark.</p></aside>');
 assert.ok(!String(r.fields?.tasting_notes||'').toLowerCase().includes('strawberry'),JSON.stringify(r).slice(0,1900));
 assert.ok(!String(r.fields?.producer||'').toLowerCase().includes('bogota'),JSON.stringify(r).slice(0,1900));
});
test('#253 changed selected product H1 is not certified as original #253',()=>{
 assert.equal(source253(page(own.replace('GET RIGHT | MEDIUM ROAST | BRAZIL','GET RIGHT | DARK ROAST | PERU'))).identity,false);
});
test('#253 missing direct farm story does not satisfy complete source evidence',()=>{
 assert.equal(source253(page(own.replace(/<p>Your coffee is comprised[\s\S]*?<\/p>/,'<p>Browse our other farms</p>'))).three_named_farms,false);
});
test('#253 no decaffeination method or espresso recipe is invented',()=>{
 const r=parse();assert.ok(!r.fields?.decaffeination_method&&!r.fields?.espresso_recipe,JSON.stringify(r).slice(0,2100));
});
