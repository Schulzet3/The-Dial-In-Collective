import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen164,selected164Source} from '../scripts/audit/issue33-r148-164-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const facts='<p>Worka Sakaro is a small area in the Gedeb district close to Yirgacheffe. Approximately 300 small farm holders deliver cherry yearly to the local mill.</p>'+
 '<p>Elevation: 2,000 - 2,200 Meters Above Sea Level (MASL)</p>'+
 '<p>Arabica Varieties: Heirloom</p><p>Milling Process: Anaerobic "Wine Process" Natural</p>'+
 '<p>Flavor Notes: Strawberry, Jasmine, Exquisite</p>';
const page=(own=facts,h1=chosen164.name,elsewhere='',seo='Blue Ridge Blend Medium Colombia Huila')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body><main>'+
 '<article class="product"><h1>'+h1+'</h1><div class="product__description">'+own+
 '</div></article></main>'+elsewhere+'</body></html>';
const selected=x=>selected164Source(x);
test('#164 exact selected H1 plus six direct product facts',()=>{
 const x=selected(page());assert.equal(x.exactH1,true);
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#164 changed coffee or new lot is not prior selected identity',()=>{
 for(const title of ['Ethiopia Worka Sakaro 2027','Blue Ridge Blend','FrankenBlend Mermoose'])
  assert.equal(selected(page(facts,title)).exactH1,false,title);
});
test('#164 never use SEO title as selected product',()=>{
 assert.equal(selected(page(facts,'Different Ethiopia Lot','',chosen164.name)).exactH1,false);
});
test('#164 cannot infer Gedeb selected region from aside',()=>{
 const x=selected(page(facts.replace('Worka Sakaro is a small area in the Gedeb district close to Yirgacheffe','Selected region unpublished'),chosen164.name,'<aside>'+facts+'</aside>'));
 assert.equal(x.direct.geography,false);
});
test('#164 cannot import altitude from product-related footer',()=>{
 const x=selected(page(facts.replace('Elevation: 2,000 - 2,200 Meters Above Sea Level','Elevation: unpublished'),chosen164.name,'<footer>'+facts+'</footer>'));
 assert.equal(x.direct.altitude,false);
});
test('#164 cannot infer heirloom varietal from script metadata',()=>{
 assert.equal(selected(page(facts.replace('Arabica Varieties: Heirloom','Variety: unpublished'),chosen164.name,'<script>'+facts+'</script>')).direct.variety,false);
});
test('#164 cannot transfer milling process from another coffee in navigation',()=>{
 assert.equal(selected(page(facts.replace('Milling Process: Anaerobic "Wine Process" Natural','Process: unpublished'),chosen164.name,'<nav>'+facts+'</nav>')).direct.processing,false);
});
test('#164 cannot transfer missing flavor from hidden template',()=>{
 assert.equal(selected(page(facts.replace('Strawberry, Jasmine, Exquisite','Strawberry, Jasmine'),chosen164.name,'<template>'+facts+'</template>')).direct.flavors,false);
});
test('#164 cannot invent an individual named farmer from collective delivery',()=>{
 assert.equal(selected(page()).direct.collective,true);
 assert.doesNotMatch(facts,/Producer: [A-Z][a-z]+ [A-Z][a-z]+/);
});
test('#164 incomplete selected processing statement is not full anaerobic and natural evidence',()=>{
 assert.equal(selected(page(facts.replace('Anaerobic "Wine Process" Natural','Natural'))).direct.processing,false);
});
test('#164 direct selected fact omission cannot be patched from SEO',()=>{
 const x=selected(page(facts.replace('Strawberry, Jasmine, Exquisite','Unpublished'),'','', 'Flavor Notes: Strawberry, Jasmine, Exquisite'));
 assert.equal(x.direct.flavors,false);
});
test('#164 actual parser retains anaerobic priority over natural for selected named field',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen164.url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,chosen164.name);
 assert.equal(p.fields.process,'Anaerobic',JSON.stringify(p.fields));
 assert.ok((p.fields.tasting_notes||'').includes('Jasmine'),JSON.stringify(p.fields));
});
test('#164 current selected public preview does not infer roast or decaf from unrelated SEO',()=>{
 const p=extractPublicCoffeeFacts(page(facts,chosen164.name,'','Medium Dark Roast Decaf Swiss Water Colombia'));
 assert.equal(p.ok,true);
 assert.equal(p.fields.decaffeination_method,undefined);
 assert.equal(p.fields.roast_level,undefined);
});
