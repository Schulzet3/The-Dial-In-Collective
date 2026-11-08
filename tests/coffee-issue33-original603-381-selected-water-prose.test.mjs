// #33 R25 original603 #381 current Thrive Layover Decaf named Swiss Water DIV.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://thrivefarmers.com/products/layover-organic-decaf';
const selectedName='Layover Organic Decaf';
const claim="Layover is a decaf coffee that brings the flavor! This Nicaraguan coffee has notes of baking spice and dark chocolate, which are not lost at all throughout the decaffeinating process. We are proud to decaffeinate our farmers' coffee in a sustainable way, without the use of harsh chemicals. The Swiss Water Decaffeination Process is a chemical-free, environmentally friendly method that preserves the character of the bean and yields a 99.9% caffeine-free product. Enjoy a cup of our Thrive Farmers specialty coffee today!";
const description=(body=claim)=>'<div class="detailsWrapper">'+body+'</div>';
const page=(name=selectedName,desc=description(),other='',seo='')=>'<html><head><meta property="og:type" content="product">'+seo+'</head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description"><h3>PROCESS</h3><span>Washed</span>'+desc+'</div></article>'+other+'</main></body></html>';
const parse=(name=selectedName,desc=description(),other='',seo='')=>extractPublicCoffeeFacts(page(name,desc,other,seo),{source_url:url});
test('exact named selected Decaf DIV recovers Water Process, preserves Washed, Add Coffee and Source Review',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,selectedName);assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Washed',JSON.stringify(r.fields));
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&f.source_type==='html'&&/Swiss Water Decaffeination Process is/.test(f.value)));
 const review=coffeeSourceReviewSnapshot({...r,source_url:url});
 assert.ok(review.published_source_information.some(f=>f.field==='decaffeination_method'&&/Swiss Water Decaffeination Process is/.test(f.value)));
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
});
test('mismatched name, missing H1, nondecaf, half-caf, SEO and unrelated source never supply method',()=>{
 assert.equal(parse(selectedName,description(claim.replace(/^Layover is/,'AnotherLot is'))).fields.decaffeination_method,undefined);
 for(const name of ['Layover Organic Half-Caf','Layover Regular'])
  assert.equal(parse(name).fields.decaffeination_method,undefined);
 const missing=page().replace('<h1>'+selectedName+'</h1>','');
 assert.equal(extractPublicCoffeeFacts(missing,{source_url:url}).fields?.decaffeination_method,undefined);
 assert.equal(parse(selectedName,description('Washed Nicaraguan coffee.'),
   '<section class="product-recommendations">'+description(claim)+'</section>').fields.decaffeination_method,undefined);
 assert.equal(parse(selectedName,description('Washed Nicaraguan coffee.'),'',
  '<meta name="description" content="'+claim+'">').fields.decaffeination_method,undefined);
});
test('negation, historical, generic, incomplete, alternate product and FAQ are withheld',()=>{
 const cases=[
  claim.replace('Process is a chemical','Process is not a chemical'),
  claim.replace('The Swiss Water Decaffeination Process is','Previously the Swiss Water Decaffeination Process is'),
  'The Swiss Water Decaffeination Process is a chemical-free method yielding 99.9% caffeine-free product.',
  'Layover is a decaf coffee. It is chemical-free and organic.',
  claim.replace('Swiss Water','generic water'),
  'Our decaf is delicious. The Swiss Water Decaffeination Process is a chemical-free method yielding a 99.9% caffeine-free product.'
 ];
 for(const c of cases)assert.equal(parse(selectedName,description(c)).fields.decaffeination_method,undefined,c);
 for(const heading of ['Frequently Asked Questions','Common Questions','FAQ'])
  assert.equal(parse(selectedName,description('Unspecified treatment.')+
   '<h2>'+heading+'</h2>'+description(claim)).fields.decaffeination_method,undefined,heading);
});
