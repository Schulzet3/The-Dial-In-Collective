import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen122,selected122Source} from '../scripts/audit/issue33-r143-122-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const details='<p>Producer: Jessica & Florence Marigi of Malaki Estate</p>'+
 '<p>Origin: Kiambu, Kenya</p><p>We Taste: Lemon Lime Soda, Ruby Grapefruit, Raspberry</p>'+
 '<p>Varietals: SL-28, SL-34</p><p>Altitude: 1900 masl</p><p>Process: Washed</p>'+
 '<p>Malaki Estate was founded in 1959 by Edward Marigi and is now managed by his wife, Florence, and his daughter, Jessica.</p>';
const page=(own=details,title=chosen122.name,other='',seo='Kenya Final Batch Light Natural old stock')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+title+'</h1><div class="product__description">'+own+'</div></article></main>'+other+'</body></html>';
const direct=x=>selected122Source(x).direct;
test('#122 selected current H1 and six own labels plus management',()=>{
 const p=selected122Source(page());assert.equal(p.exactH1,true);
 assert.ok(Object.values(p.direct).every(Boolean),JSON.stringify(p.direct));
});
test('#122 changed selected coffee cannot certify archived identity',()=>{
 assert.equal(selected122Source(page(details,'Kenya - Kiambu: Malaki Estate AB')).exactH1,false);
});
test('#122 stale Final Batch in SEO cannot alter chosen H1',()=>{
 const p=selected122Source(page(details,chosen122.name,'','Kenya - Kiambu: Malaki Estate AA *Final Batch*'));
 assert.equal(p.exactH1,true);
});
test('#122 old SEO country cannot donate missing chosen origin',()=>{
 assert.equal(direct(page(details.replace('Origin: Kiambu, Kenya','Origin not published'),chosen122.name,'','Origin: Kiambu, Kenya')).origin,false);
});
test('#122 unrelated aside cannot supply chosen producer',()=>{
 const own=details.replace('Producer: Jessica & Florence Marigi of Malaki Estate','Producer unavailable');
 assert.equal(direct(page(own,chosen122.name,'<aside>'+details+'</aside>')).producer,false);
});
test('#122 navigation cannot supply selected sensory triplet',()=>{
 const own=details.replace('We Taste: Lemon Lime Soda, Ruby Grapefruit, Raspberry','We Taste: unpublished');
 assert.equal(direct(page(own,chosen122.name,'<nav>'+details+'</nav>')).tastes,false);
});
test('#122 footer cannot supply absent cultivar',()=>{
 const own=details.replace('Varietals: SL-28, SL-34','Varietals not published');
 assert.equal(direct(page(own,chosen122.name,'<footer>'+details+'</footer>')).varieties,false);
});
test('#122 script/JSON-LD cannot supply current 1900 masl',()=>{
 const own=details.replace('Altitude: 1900 masl','Altitude unavailable');
 assert.equal(direct(page(own,chosen122.name,'<script type="application/ld+json">'+details+'</script>')).altitude,false);
});
test('#122 template cannot supply missing washed process',()=>{
 const own=details.replace('Process: Washed','Process unpublished');
 assert.equal(direct(page(own,chosen122.name,'<template>'+details+'</template>')).process,false);
});
test('#122 founder is not a current grower without selected producer declaration',()=>{
 const own=details.replace('Producer: Jessica & Florence Marigi of Malaki Estate','Producer unpublished');
 assert.equal(direct(page(own)).producer,false);
});
test('#122 selected negative one missing taste fails exact taste certificate',()=>{
 const own=details.replace('We Taste: Lemon Lime Soda, Ruby Grapefruit, Raspberry','We Taste: Lemon Lime Soda, Raspberry');
 assert.equal(direct(page(own)).tastes,false);
});
test('#122 no published roast or decaf in selected fields; old SEO must not donate',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen122.url});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,chosen122.name);
 assert.ok(!p.fields?.decaffeination_method,JSON.stringify(p.fields));
 assert.ok(!p.fields?.roast_level,JSON.stringify(p.fields));
});
test('#122 real parser on selected explicit fact labels preserves current identity',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen122.url});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,chosen122.name);
 assert.ok(!/final batch|old stock/i.test(String(p.fields?.name||'')+' '+String(p.fields?.tasting_notes||'')));
});
