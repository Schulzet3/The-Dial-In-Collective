// Issue #33 source-bound #456: botanical species prefix is not a cultivar.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withoutStandaloneCoffeeSpeciesPrefix} from '../src/server/coffee-cultivar-species-prefix.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://www.coffeestamp.com/products/zambia-kateshi-estate';
const val='Arabica; Castillo, Catimor 129, F6';
const expected='Castillo, Catimor 129, F6';
const page=(variety=val,extra='')=>'<html><head><meta property="og:type" content="product"><link rel="canonical" href="'+url+'"></head>'+
 '<body><main><article class="product"><h1>Zambia- Kateshi Estate</h1>'+
 '<div class="product-description rte"><p>Roast: Light</p><p>Varietal: '+variety+'</p>'+
 '<p>Process: Natural dry Process with extended anaerobic fermentation</p></div></article></main>'+
 extra+'</body></html>';
test('explicit Arabica species plus several exact current cultivars keeps all cultivars without species',()=>{
 assert.equal(withoutStandaloneCoffeeSpeciesPrefix(val),expected);
 assert.equal(withoutStandaloneCoffeeSpeciesPrefix('A rabica; Castillo, Catimor 129, F6'),expected);
 assert.equal(withoutStandaloneCoffeeSpeciesPrefix('Arabica; Bourbon, Caturra'),'Bourbon, Caturra');
});
test('no guess when species alone, unlisted cultivar, process, blend or prose',()=>{
 for(const v of ['Arabica','100% Arabica','Arabica; Castillo','Arabica; Castillo, unknown',
  'Arabica; Castillo, Natural','Arabica; Castillo, Robusta',
  'Arabica; Castillo; Catimor 129, F6','Arabica; Castillo, Caturra from Colombia',
  'Arabica; field blend, Caturra','Typica Peaberry','Catimor 129, F6'])
  assert.equal(withoutStandaloneCoffeeSpeciesPrefix(v),v);
});
test('real current-product parser, Add Coffee and Source Review show specific cultivars',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Zambia- Kateshi Estate');
 assert.equal(r.fields.variety,expected,JSON.stringify(r));
 assert.equal(r.fields.process,'Anaerobic',JSON.stringify(r));
 assert.ok(!r.conflicts?.includes('variety'),JSON.stringify(r.conflicts));
 assert.match(coffeeUrlPreviewMarkup(r),/Castillo, Catimor 129, F6/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});
test('other coffee and SEO variety claims cannot contaminate current product',()=>{
 const html=page('Arabica', '<aside class="related-products"><h2>Another coffee</h2><p>Varietal: '+val+'</p></aside>');
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.ok(!/Castillo|Catimor|F6/i.test(r.fields?.variety||''),JSON.stringify(r));
});
