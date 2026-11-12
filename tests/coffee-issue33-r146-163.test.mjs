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


import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const direct163='A true coffee aficionado’s decaf. The Colombia Las Montanas EA Natural Decaf is decaffeinated using Ethyl Acetate (EA), also commonly referred to as "sugarcane process decaf." In this method, the raw beans are steamed and caffeine is removed.';
function parsed163(desc=direct163,name=chosen163.name,extra=''){
 const html='<main><article class="product"><h1>'+name+'</h1><div class="product__description">'+
 '<p>'+desc+'</p><p>Department: Caldas</p><p>Country: Colombia</p>'+
 '<p>Altitude: 1,600 meters above sea level</p><p>Variety: Typica, Castillo</p>'+
 '<p>Process: Washed</p><p>Roast Profile: Medium</p>'+
 '<p>Flavor Notes: Lemon, Cherry, Balanced</p></div></article></main>'+extra;
 return extractPublicCoffeeFacts(html,{source_url:chosen163.url});
}
test('#163 real parser selected trailing EA Natural Decaf restores Sugar Process independently of green Washed',()=>{
 const p=parsed163();assert.equal(p.ok,true);
 assert.equal(p.fields.name,chosen163.name);
 assert.equal(p.fields.decaffeination_method,'Sugar Process',JSON.stringify(p.fields));
 assert.equal(p.fields.process,'Washed');
 assert.ok((p.source_facts||[]).some(f=>f.field==='decaffeination_method'&&/Ethyl Acetate/.test(f.value)));
 assert.match(coffeeUrlPreviewMarkup(p),/Sugar Process/);
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:chosen163.url}));
});
test('#163 other/regular/half-caf H1 cannot inherit decaf treatment',()=>{
 for(const name of ['Regular Colombia Las Montanas','Half-Caf Colombia Las Montanas','Decaf Colombia Los Santos'])
  assert.equal(parsed163(direct163,name).fields.decaffeination_method,undefined,name);
});
test('#163 different named decaf in own description is not selected current method',()=>{
 assert.equal(parsed163(direct163.replace('Colombia Las Montanas EA Natural Decaf','Colombia Los Santos EA Natural Decaf')).fields.decaffeination_method,undefined);
});
test('#163 education/marketing alone cannot infer selected decaf process',()=>{
 assert.equal(parsed163('Many Colombian coffees are decaffeinated using Ethyl Acetate (EA) from sugarcane.').fields.decaffeination_method,undefined);
});
test('#163 historical prior lot EA process cannot be inherited',()=>{
 assert.equal(parsed163(direct163.replace('The Colombia Las Montanas','Previously, the Colombia Las Montanas')).fields.decaffeination_method,undefined);
});
test('#163 unrelated aside cannot supply missing selected EA method',()=>{
 assert.equal(parsed163('The selected method is not published.',chosen163.name,'<aside>'+direct163+'</aside>').fields.decaffeination_method,undefined);
});
test('#163 changed selected H1 is not rescued by old selected source text',()=>{
 assert.equal(parsed163(direct163,'Decaf Colombia Las Montanas 2027 Lot').fields.decaffeination_method,undefined);
});
test('#163 opposing own Swiss Water decaf evidence must leave conflict blank',()=>{
 const p=parsed163(direct163+' This coffee is decaffeinated using Swiss Water Process.');
 assert.equal(p.fields.decaffeination_method,undefined,JSON.stringify(p.fields));
});


test('#163 directly named selected EA with following THIS COFFEE conflicting Swiss Water is review-only',()=>{
 const p=parsed163(direct163+' This coffee is decaffeinated using Swiss Water Process.');
 assert.equal(p.fields.decaffeination_method,undefined);
 const provenance=(p.source_facts||[]).map(f=>f.value||'').join(' ');
 assert.match(provenance,/Swiss Water/);
 assert.match(provenance,/Ethyl Acetate/);
});
test('#163 generic competing phrase without exact chosen named antecedent cannot fill decaf',()=>{
 const p=parsed163('An unrelated old lot was decaffeinated using EA. This coffee is decaffeinated using Swiss Water Process.');
 assert.equal(p.fields.decaffeination_method,undefined);
});


import {selectedNamedCurrentDecafEvidence} from '../src/server/coffee-direct-product-prose.mjs';
test('#163 long paragraph selected method recovered without duplicating short named direct evidence',()=>{
 const extra='Product-specific harvest and roasting description without extra method assertions. '.repeat(6);
 const p=parsed163(direct163+' '+extra);
 assert.equal(p.fields.decaffeination_method,'Sugar Process');
 const name='TRANQUILO, Decaffeinated, 12 oz';
 const text='Savor world-class coffee without caffeine. Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia.';
 const html='<main><h1>'+name+'</h1><p>'+text+'</p></main>';
 const clean=x=>String(x).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
 const chosen=selectedNamedCurrentDecafEvidence(html,{name,clean});
 assert.equal(chosen.length,1,JSON.stringify(chosen));
});


test('#163 same-method short selected named sentence keeps single direct provenance witness',()=>{
 const name='TRANQUILO, Decaffeinated, 12 oz';
 const text='Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia.';
 const html='<main><h1>'+name+'</h1><p>'+text+'</p></main>';
 const clean=x=>String(x).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
 assert.equal(selectedNamedCurrentDecafEvidence(html,{name,clean}).length,1);
});
