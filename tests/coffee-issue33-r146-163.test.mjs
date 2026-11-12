import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen163,selected163Source} from '../scripts/audit/issue33-r146-163-check.mjs';
const facts='<p>The Colombia Las Montanas EA Natural Decaf is decaffeinated using Ethyl Acetate (EA), also commonly referred to as "sugarcane process decaf."</p>'+
 '<p>Department: Caldas</p><p>Country: Colombia</p><p>Altitude: 1,600 meters above sea level</p>'+
 '<p>Variety: Typica, Castillo</p><p>Process: Washed</p><p>Roast Profile: Medium</p>'+
 '<p>Flavor Notes: Lemon, Cherry, Balanced</p>';
const page=(own=facts,title=chosen163.name,elsewhere='',seo='Brazil Natural Dark Full Caffeine')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+title+'</h1><div class="product__description">'+own+
 '</div></article></main>'+elsewhere+'</body></html>';
const source=x=>selected163Source(x);
test('#163 exact current chosen H1 and seven direct selected facts',()=>{
 const x=source(page());assert.equal(x.exactH1,true);
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#163 changed selected coffee cannot inherit original URL/SEO',()=>{
 assert.equal(source(page(facts,'Colombia Decaf New Harvest','',chosen163.name)).exactH1,false);
});
test('#163 lot suffix not an identical selected identity',()=>{
 assert.equal(source(page(facts,chosen163.name+' 2027 Lot')).exactH1,false);
});
test('#163 no decaf EA method inferred from page SEO',()=>{
 const x=page(facts.replace('decaffeinated using Ethyl Acetate (EA)','decaffeinated using unpublished method'),'','',
 'Ethyl Acetate (EA) Sugarcane process decaf');
 assert.equal(source(x).direct.decafEA,false);
});
test('#163 no cross-coffee EA method inherited from aside',()=>{
 assert.equal(source(page(facts.replace('decaffeinated using Ethyl Acetate (EA)','decaffeinated using unpublished method'),
 chosen163.name,'<aside>'+facts+'</aside>')).direct.decafEA,false);
});
test('#163 no cross-coffee roast inherited from footer',()=>{
 assert.equal(source(page(facts.replace('Roast Profile: Medium','Roast Profile: unpublished'),
 chosen163.name,'<footer>'+facts+'</footer>')).direct.roast,false);
});
test('#163 no cross-coffee country from navigation',()=>{
 assert.equal(source(page(facts.replace('Country: Colombia','Country: undisclosed'),
 chosen163.name,'<nav>'+facts+'</nav>')).direct.region,false);
});
test('#163 no stale script source for processing',()=>{
 assert.equal(source(page(facts.replace('Process: Washed','Process: undisclosed'),
 chosen163.name,'<script>'+facts+'</script>')).direct.processing,false);
});
test('#163 no template-supplied missing altitude',()=>{
 assert.equal(source(page(facts.replace('Altitude: 1,600 meters above sea level','Altitude: unknown'),
 chosen163.name,'<template>'+facts+'</template>')).direct.altitude,false);
});
test('#163 no related-product cultivar contamination',()=>{
 assert.equal(source(page(facts.replace('Variety: Typica, Castillo','Variety: unpublished'),
 chosen163.name,'<section class="related-products">'+facts+'</section>')).direct.variety,false);
});
test('#163 partial cultivar list does not prove original selected two',()=>{
 assert.equal(source(page(facts.replace('Typica, Castillo','Typica only'))).direct.variety,false);
});
test('#163 partial flavor list must not count complete',()=>{
 assert.equal(source(page(facts.replace('Lemon, Cherry, Balanced','Lemon, Cherry'))).direct.flavors,false);
});
test('#163 direct selected Washed processing and EA decaf remain distinct',()=>{
 const x=source(page());assert.equal(x.direct.decafEA,true);assert.equal(x.direct.processing,true);
});
