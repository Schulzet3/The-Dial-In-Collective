import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen209,source209} from '../scripts/audit/issue33-r165-209-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h1>Lazy Day Decaf</h1><p>Medium</p><p>Cinnamon, Raisin, Cherry</p>'+
 '<p>Our classic decaffeinated coffee hails from a few regions in Colombia. It’s decaffeinated using the Ethyl Acetate process. This process gently extracts caffeine from the beans at a rate of 97%. It boasts flavors of cinnamon, raisin, and sweet cherries.</p>'+
 '<section><h3>Details</h3><p>Origin Colombia</p><p>Region Huila</p><p>Process EA Decaf</p></section>';
const page=(body=own,other='')=>'<html><head><title>Previous Peru natural roast</title><meta name="description" content="Unchosen Brazil coffee chocolate; Swiss Water; washed"></head><body><nav>Other Coffee Swiss Water</nav><main><article class="product">'+body+'</article></main>'+other+'<footer>Peru washed Swiss Water</footer></body></html>';
test('#209 exact selected H1 and own current notes, EA treatment, Huila specs',()=>{
 const s=source209(page());assert.equal(s.identity,true);assert.deepEqual(Object.entries(s.direct).filter(([,v])=>!v),[]);
});
test('#209 recycled URL or different current product H1 rejects old identity',()=>{
 assert.equal(source209(page(own.replace('<h1>Lazy Day Decaf</h1>','<h1>New Brazil Roast</h1>'))).identity,false);
});
test('#209 recommendation cannot supply missing own tasting notes',()=>{
 const body=own.replace('Cinnamon, Raisin, Cherry','Profile not published').replace('flavors of cinnamon, raisin, and sweet cherries','flavors not published');
 assert.equal(source209(page(body,'<aside>Cinnamon, Raisin, Cherry</aside>')).direct.notes,false);
});
test('#209 unrelated card cannot supply missing EA treatment',()=>{
 const body=own.replace('decaffeinated using the Ethyl Acetate process','decaffeinated using an unpublished method');
 assert.equal(source209(page(body,'<aside>decaffeinated using the Ethyl Acetate process</aside>')).direct.ea,false);
});
test('#209 related product cannot supply missing selected region',()=>{
 assert.equal(source209(page(own.replace('Region Huila','Region unpublished'),'<aside>Region Huila</aside>')).direct.region,false);
});
test('#209 unrelated spec cannot supply missing current Process EA Decaf caption',()=>{
 assert.equal(source209(page(own.replace('Process EA Decaf','Process unpublished'),'<aside>Process EA Decaf</aside>')).direct.method_caption,false);
});
test('#209 actual parser preserves explicit selected EA decaf method separately',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.equal(r.fields?.name,'Lazy Day Decaf',JSON.stringify(r));
 assert.equal(r.fields?.decaffeination_method,'Sugar Process',JSON.stringify(r));
});
test('#209 EA decaffeination does not imply green bean processing Washed or Natural',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.ok(!r.fields?.process,JSON.stringify(r));
});
test('#209 previous harvest SEO/nav Swiss Water must not override chosen EA',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.notEqual(r.fields?.decaffeination_method,'Water Process',JSON.stringify(r));
});
test('#209 ordinary coffee with only site-wide decaf education cannot adopt decaf method',()=>{
 const r=extractPublicCoffeeFacts(page('<h1>Regular Colombia</h1><p>Medium</p><p>Washed Colombia</p>','<aside>Our decaf is decaffeinated using the Ethyl Acetate process</aside>'),{source_url:chosen209.url});
 assert.ok(!r.fields?.decaffeination_method,JSON.stringify(r));
});
test('#209 unpublished selected producer, variety and elevation cannot be supplied by unrelated metadata',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:chosen209.url});
 assert.ok(!r.fields?.producer&&!r.fields?.variety&&!r.fields?.elevation_m,JSON.stringify(r));
});
