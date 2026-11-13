import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen165,selected165Source} from '../scripts/audit/issue33-r149-165-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const facts="<p>For 2023, we are proud to be entering our fifth consecutive year of working directly with the San Lazaro farm. Finca San Lazaro sits high above the town of San Marcos de Colon near the border with Nicaragua. The coffee is grown in volcanic soil at approximately 1,600 meters above sea level within La Botija Biological Reserve.</p>"+
 "<p>The San Lazaro farm serves others through the non-profit ministry known as Mission Lazarus.</p>"+
 "<p>Here's what you can expect from this coffee in 2023/24: More creamy caramel characteristics than last year's harvest with nice sweetness and a soft citrus acidity reminiscent of mandarin orange.</p>"+
 '<p>Flavor Notes: Caramel, Toasted Almond, Easy-Drinking</p>';
const page=(own=facts,h1=chosen165.name,elsewhere='',seo='Ironclad selected Honduras San Lazaro coffee')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body><main>'+
 '<article class="product"><h1>'+h1+'</h1><div class="product__description">'+own+
 '</div></article></main>'+elsewhere+'</body></html>';
const selected=x=>selected165Source(x);
test('#165 exact selected H1 and seven direct current product facts',()=>{
 const x=selected(page());assert.equal(x.exactH1,true);
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#165 changed chosen coffee or next-harvest H1 never certifies old identity',()=>{
 for(const name of ['Honduras San Lazaro 2026','Blue Ridge Blend','Ethiopia Worka Sakaro Anaerobic Natural'])
  assert.equal(selected(page(facts,name)).exactH1,false,name);
});
test('#165 SEO title cannot substitute for selected product H1',()=>{
 assert.equal(selected(page(facts,'Blue Ridge Blend','',chosen165.name)).exactH1,false);
});
test('#165 unrelated aside cannot supply missing farm country region',()=>{
 const x=selected(page(facts.replace('Finca San Lazaro sits high above the town of San Marcos de Colon','Farm location unpublished'),chosen165.name,'<aside>'+facts+'</aside>'));
 assert.equal(x.direct.geography,false);
});
test('#165 hidden template cannot supply the altitude',()=>{
 assert.equal(selected(page(facts.replace('approximately 1,600 meters above sea level','elevation unpublished'),chosen165.name,'<template>'+facts+'</template>')).direct.altitude,false);
});
test('#165 unrelated navigation cannot supply the biological reserve',()=>{
 assert.equal(selected(page(facts.replace('within La Botija Biological Reserve','reserve unpublished'),chosen165.name,'<nav>'+facts+'</nav>')).direct.reserve,false);
});
test('#165 footer cannot turn an unmentioned ministry into an individual producer',()=>{
 assert.equal(selected(page(facts.replace('Mission Lazarus','a nonprofit'),chosen165.name,'<footer>'+facts+'</footer>')).direct.ministry,false);
});
test('#165 hidden script cannot give a missing flavor label',()=>{
 assert.equal(selected(page(facts.replace('Flavor Notes: Caramel, Toasted Almond, Easy-Drinking','No flavors published'),chosen165.name,'<script>'+facts+'</script>')).direct.flavors,false);
});
test('#165 direct historical 2023/24 is not a claim that 2026 lot is verified',()=>{
 assert.equal(selected(page(facts)).direct.temporal,true);
 assert.equal(selected(page(facts.replace('2023/24','lot not specified'))).direct.temporal,false);
});
test('#165 prose mentioning processing by agronomists does not specify processing method',()=>{
 const p=extractPublicCoffeeFacts(page(facts+'<p>This coffee is cultivated and processed by female agronomists.</p>'),{source_url:chosen165.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosen165.name);
 assert.equal(p.fields.process,undefined,JSON.stringify(p.fields));
});
test('#165 chosen flavor label wins over dated narrative mandarin-orange example',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen165.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosen165.name);
 assert.ok(String(p.fields.tasting_notes||'').includes('Toasted Almond'),JSON.stringify(p.fields));
 assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('#165 unrelated SEO roast/decaf cannot become chosen source fact',()=>{
 const p=extractPublicCoffeeFacts(page(facts,chosen165.name,'','Blue Ridge Medium Roast Swiss Water Decaf Blueberry'),{source_url:chosen165.url});
 assert.ok(p.ok!==true||(!p.fields?.roast_level&&!p.fields?.decaffeination_method),JSON.stringify(p));
});
test('#165 actual selected coffee is parseable with neutral SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen165.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosen165.name);
 assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.decaffeination_method,undefined);
});
