import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen204,source204} from '../scripts/audit/issue33-r163-204-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h1>YABITU KOBA NATURAL, Ethiopia</h1><h5>FRUIT PUNCH | LIME | KIWI</h5>'+
 '<p>Region: Koba, Uraga, Guji</p><p>Producer: Small producers from Uraga</p>'+
 '<p>Altitude: 2300 meters</p><p>Varietal: Heirloom</p><p>Process: Natural</p>'+
 '<p>Last year, we released Yabitu Koba as a washed coffee. This year we brought Yabitu Koba Natural.</p>'+
 '<p>This lot is processed as a natural, with the whole cherry drying. Notes of fruit punch, kiwi, and lime.</p>';
const page=(body=own,other='')=>'<html><head><title>Old Yabitu Koba Washed</title><meta name="description" content="Old washed Guatemala dark roast"></head><body><nav>Old Washed</nav><main><article class="product">'+body+'</article></main>'+other+'<footer>light to medium roasts</footer></body></html>';
test('#204 current selected H1 and direct source evidence',()=>{
 const s=source204(page());assert.equal(s.identity,true);assert.deepEqual(Object.entries(s.direct).filter(([,v])=>!v),[]);
});
test('#204 reused slug cannot prove different selected H1',()=>{
 assert.equal(source204(page(own.replace('YABITU KOBA NATURAL, Ethiopia</h1>','YABITU KOBA WASHED, Ethiopia</h1>'))).identity,false);
});
test('#204 removed current natural cannot borrow related natural',()=>{
 const s=source204(page(own.replace('This lot is processed as a natural','This lot process is unknown'),'<aside>This lot is processed as a natural</aside>'));
 assert.equal(s.direct.natural,false);
});
test('#204 related product cannot provide missing current flavor',()=>{
 const s=source204(page(own.replaceAll('fruit punch','unpublished').replaceAll('kiwi','unpublished'),'<aside>fruit punch, kiwi</aside>'));
 assert.equal(s.direct.fruit_punch,false);assert.equal(s.direct.kiwi,false);
});
test('#204 related origin cannot supply removed selected region',()=>{
 assert.equal(source204(page(own.replace('Region: Koba, Uraga, Guji','Region: not available'),'<aside>Region: Koba, Uraga, Guji</aside>')).direct.region,false);
});
test('#204 actual parser should use selected natural not historical washed',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen204.url});
 assert.equal(p.fields?.process,'Natural',JSON.stringify(p));
});
test('#204 historical washed mention not authoritative without current process',()=>{
 const p=extractPublicCoffeeFacts(page(own.replace('Process: Natural','Process: not published').replace('This lot is processed as a natural','The processing method of this lot is not published')),{source_url:chosen204.url});
 assert.notEqual(p.fields?.process,'Washed',JSON.stringify(p));
});
test('#204 own sensory notes should not be replaced by SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen204.url});
 assert.ok(String(p.fields?.tasting_notes||'').toLowerCase().includes('fruit punch'),JSON.stringify(p));
});
test('#204 no unpublished roast inferred from site footer',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen204.url});
 assert.ok(!p.fields?.roast_level,JSON.stringify(p));
});
test('#204 unrelated new coffee H1 fails identity',()=>{assert.equal(source204(page(own.replace('YABITU KOBA NATURAL, Ethiopia</h1>','KARINGA, Kenya</h1>'))).identity,false);});
