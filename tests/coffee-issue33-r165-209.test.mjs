import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen209,source209} from '../scripts/audit/issue33-r165-209-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>Medium</p><h1>Lazy Day Decaf</h1><p>Cinnamon, Raisin, Cherry</p>'+
 '<p>Our classic decaffeinated coffee hails from a few regions in Colombia. It is decaffeinated using the Ethyl Acetate process. The cup boasts flavors of cinnamon, raisin, and sweet cherries.</p>'+
 '<section>Details<p>Origin Colombia</p><p>Region Huila</p><p>Process EA Decaf</p></section>';
const page=(body=own,other='')=>'<html><head><title>Old Burundi Natural</title><meta name="description" content="Peru washed bourbon blueberry"></head><body>'+
 '<nav>Old Burundi</nav><main><article class="product">'+body+'</article></main>'+other+'<footer>Kenya Washed producer Njeri</footer></body></html>';
test('#209 current selected heading and own direct facts',()=>{
 const s=source209(page());assert.equal(s.identity,true);assert.deepEqual(Object.entries(s.direct).filter(([,v])=>!v),[]);
});
test('#209 recycled slug with different selected identity is rejected',()=>{
 assert.equal(source209(page(own.replace('<h1>Lazy Day Decaf</h1>','<h1>Fresh Peru Harvest</h1>'))).identity,false);
});
test('#209 unrelated card cannot supply missing selected sensory notes',()=>{
 const body=own.replaceAll('Cinnamon, Raisin, Cherry','Unpublished').replaceAll('cinnamon, raisin, and sweet cherries','unknown flavors');
 assert.equal(source209(page(body,'<aside>Cinnamon, Raisin, Cherry</aside>')).direct.notes,false);
});
test('#209 unrelated card cannot supply missing selected EA method',()=>{
 const body=own.replace('decaffeinated using the Ethyl Acetate process','decaffeinated using an unpublished method').replace('Process EA Decaf','Process unknown');
 assert.equal(source209(page(body,'<aside>Process EA Decaf</aside>')).direct.ea,false);
});
test('#209 unrelated recommendation cannot supply absent Huila',()=>{
 const body=own.replace('Region Huila','Region unpublished');
 assert.equal(source209(page(body,'<aside>Region Huila</aside>')).direct.huila,false);
});
test('#209 no selected roast tier is not rescued from footer or SEO',()=>{
 const body=own.replace('<p>Medium</p>','');
 assert.equal(source209(page(body,'<aside>Medium</aside>')).direct.medium,false);
});
test('#209 actual parser distinguishes EA decaf from green processing',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.equal(p.fields?.decaffeination_method,'Sugar Process',JSON.stringify(p));
 assert.notEqual(p.fields?.process,'Washed',JSON.stringify(p));
 assert.notEqual(p.fields?.process,'Natural',JSON.stringify(p));
});
test('#209 actual parser preserves published tasting notes',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.ok(['cinnamon','raisin','cherry'].every(v=>String(p.fields?.tasting_notes||'').toLowerCase().includes(v)),JSON.stringify(p));
});
test('#209 actual parser does not use unrelated origin or process from SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.notEqual(p.fields?.origin,'Peru',JSON.stringify(p));
 assert.notEqual(p.fields?.process,'Washed',JSON.stringify(p));
});
test('#209 actual parser keeps own Medium roast',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.equal(p.fields?.roast_level,'Medium',JSON.stringify(p));
});
test('#209 navigation and unrelated card cannot fabricate a producer or varietal',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.ok(!p.fields?.producer&&!p.fields?.variety,JSON.stringify(p));
});
