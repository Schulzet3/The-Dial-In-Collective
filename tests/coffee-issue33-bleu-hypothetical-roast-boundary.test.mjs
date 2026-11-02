// Issue #33 original603 #26: official selected Bleu Ethiopia Yirgacheffe.
// Synthetic adversarial fixtures; not current DNS-pinned raw HTML or member acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://bleucoffee.com/products/ethiopia';
const selected='<main><article class="product"><h1>Ethiopia Yirgacheffe</h1>'+
 '<div itemprop="description"><p>Single Origin | 10 oz</p>'+
 '<p>Processed by the washed method (fruit skin and pulp are removed before drying).</p>'+
 '<p>A washed Ethiopia cup with a developed roast profile that amplifies chocolate and floral notes.</p>'+
 '<p>Cultivated at elevations higher than six thousand feet in the highlands of Ethiopia, '+
 'the coffees are known for their heavy sweetness when given a Dark Roast, '+
 'and for the bright acidity when given a Medium Roast.</p>'+
 '<p>Special Orders: We are happy to accommodate special order requests in regards to roast profiles.</p>'+
 '<p>Ethiopia Flavor: Richly sweet, roast-rounded. Dark chocolate, gardenia, red plum, hazelnut.</p>'+
 '</div></article></main>';
const parse=(head='',extra='')=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product">'+head+
 '</head><body>'+selected+extra+'</body></html>',{source_url:url});

test('#26 hypothetical Dark/Medium roast descriptions are not a selected fixed roast tier',()=>{
 const result=parse();
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Ethiopia Yirgacheffe');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.roast_level,undefined,JSON.stringify(result.fields));
 assert.notEqual(result.fields.producer,'Bleu Coffee');
});

test('#26 unrelated SEO and related-product roast cannot donate a selected roast or identity',()=>{
 const head='<title>Kenya AA - Light Roast | Bleu Coffee</title>'+
  '<meta property="og:title" content="Kenya AA - Light Roast">'+
  '<meta property="og:description" content="Kenya AA Medium Roast">';
 const related='<aside class="related-products"><h2>More coffees</h2>'+
  '<h3>Kenya AA</h3><p>Roast: Light</p><p>Process: Natural</p></aside>';
 const result=parse(head,related);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Ethiopia Yirgacheffe');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.roast_level,undefined,JSON.stringify(result.fields));
 assert.doesNotMatch(JSON.stringify(result.fields),/Kenya AA/i);
});
