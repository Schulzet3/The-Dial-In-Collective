import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen208,source208} from '../scripts/audit/issue33-r164-208-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h1>Costa Rica Guanacaste</h1><p>Medium</p>'+
 '<p>Almond, Orange, Toffee</p>'+
 '<p>This delicious washed coffee is from the Tarrazú valley in Costa Rica. We find notes of sweet almond, orange, and toffee in each cup.</p>'+
 '<section>Details<p>Origin Costa Rica</p><p>Region Tarrazu</p><p>Process Washed</p><p>Elevation 1500 m</p></section>';
const page=(body=own,other='')=>'<html><head><title>Old Peru Decaf</title><meta name="description" content="Old Peru anaerobic light roast blueberries"></head><body>'+
 '<nav>Old Peru</nav><main><article class="product">'+body+'</article></main>'+other+'<footer>light roast anaerobic Kenya</footer></body></html>';
test('#208 current selected identity and visible direct facts',()=>{
 const s=source208(page());assert.equal(s.identity,true);assert.deepEqual(Object.entries(s.direct).filter(([,v])=>!v),[]);
});
test('#208 recycled slug or conflicting chosen H1 must not certify',()=>{
 assert.equal(source208(page(own.replace('<h1>Costa Rica Guanacaste</h1>','<h1>Peru New Harvest</h1>'))).identity,false);
});
test('#208 unrelated card cannot supply absent own flavor',()=>{
 const body=own.replaceAll('Almond, Orange, Toffee','Unpublished')
  .replaceAll('sweet almond, orange, and toffee','unpublished');
 assert.equal(source208(page(body,'<aside>Almond, Orange, Toffee</aside>')).direct.notes,false);
});
test('#208 related product cannot supply absent region',()=>{
 const body=own.replaceAll('Tarrazú valley','unknown area').replace('Region Tarrazu','Region unknown');
 assert.equal(source208(page(body,'<aside>Region Tarrazu</aside>')).direct.tarrazu,false);
});
test('#208 unselected recommendation cannot supply washed source',()=>{
 const body=own.replace('washed coffee','coffee').replace('Process Washed','Process unavailable');
 assert.equal(source208(page(body,'<aside>Process Washed</aside>')).direct.washed,false);
});
test('#208 unrelated product cannot supply absent altitude',()=>{
 const body=own.replace('Elevation 1500 m','Elevation unavailable');
 assert.equal(source208(page(body,'<aside>Elevation 1500 m</aside>')).direct.elevation,false);
});
test('#208 real parser retains selected washed process from own facts',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen208.url});
 assert.equal(p.fields?.process,'Washed',JSON.stringify(p));
});
test('#208 SEO prior-roast metadata cannot override explicitly selected process',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen208.url});
 assert.notEqual(p.fields?.process,'Anaerobic',JSON.stringify(p));
});
test('#208 current own sensory notes not borrowed from unrelated SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen208.url});
 assert.ok(['almond','orange','toffee'].every(v=>String(p.fields?.tasting_notes||'').toLowerCase().includes(v)),JSON.stringify(p));
});
test('#208 unrelated navigation cannot fabricate producer or variety',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen208.url});
 assert.ok(!p.fields?.producer&&!p.fields?.variety,JSON.stringify(p));
});
