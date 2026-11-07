// Issue #33 selected #273: exact current Quills source has testimonial H2
// before its product H1. This bounded fragment models the observed markup.
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCoffeeSourceFacts} from '../src/server/coffee-source-facts.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://quillscoffee.com/products/guatemala-quetzal';
const before='<section class="shopify-section"><slideshow-section><h2>Love for our coffee from customers</h2><p>Customer review.</p></slideshow-section></section>';
const product=(heading='')=>'<main><article class="wt-product"><section class="wt-product__main"><h1>Guatemala | Quetzal</h1>'+
 heading+'<div class="wt-product__description"><p><strong>Region:</strong> Huehuetenango, Guatemala</p>'+
 '<p><strong>Process:</strong> Washed</p></div></section></article></main>';
const selected=html=>collectCoffeeSourceFacts(html,{name:'Guatemala | Quetzal',source_url:url});
const field=(facts,label)=>facts.find(x=>x.label===label&&x.field);

test('#273 a prior testimonial H2 does not attribute later current product facts',()=>{
 const html='<html><body>'+before+product()+'</body></html>';
 const facts=selected(html);
 for(const [label,value] of [['Region','Huehuetenango, Guatemala'],['Process','Washed']]){
  const fact=field(facts,label);
  assert.ok(fact,'Missing direct selected '+label);
  assert.equal(fact.value,value);
  assert.equal(fact.section,undefined,'Earlier unrelated section must not be inherited');
 }
 const actual=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(actual.ok,true);
 assert.equal(actual.fields.name,'Guatemala | Quetzal');
 assert.equal(actual.fields.process,'Washed');
 const review=coffeeSourceReviewSnapshot({...actual,source_url:url}).published_source_information;
 assert.ok(review.some(x=>x.label==='Region'&&x.value==='Huehuetenango, Guatemala'));
 assert.ok(review.filter(x=>x.label==='Region').every(x=>!/Love for our coffee from customers/.test(x.section||'')));
});

test('direct selected H2 section survives H1 reset',()=>{
 const facts=selected(before+product('<h2>Coffee specifications</h2>'));
 assert.equal(field(facts,'Region')?.section,'Coffee specifications');
 assert.equal(field(facts,'Process')?.section,'Coffee specifications');
});

test('direct selected H3 section survives H1 reset',()=>{
 const facts=selected(before+product('<h3>Selected process and origin</h3>'));
 assert.equal(field(facts,'Region')?.section,'Selected process and origin');
 assert.equal(field(facts,'Process')?.section,'Selected process and origin');
});

test('a later independent H1 cannot inherit earlier product heading',()=>{
 const html='<main><h1>Older Coffee</h1><h2>Older Lot</h2><p>Process: Natural</p>'+
 '<h1>Guatemala | Quetzal</h1><p>Region: Huehuetenango, Guatemala</p></main>';
 assert.equal(field(selected(html),'Region')?.section,undefined);
});


test('real #273 Shopify layout: specs before H1 must not inherit prior testimonial section',()=>{
 const html='<main><section class="shopify-section"><h2>Love for our coffee from customers</h2></section>'+
  '<section class="shopify-section product-section"><div class="wt-product__wrapper">'+
  '<div class="wt-collapse__target--text rte"><p>Country: Guatemala</p>'+
  '<p>Region: Huehuetenango</p><p>Process: Washed</p></div>'+
  '<section class="wt-product__main"><h1>Guatemala | Quetzal</h1></section></div></section></main>';
 const facts=selected(html);
 for(const [label,value] of [['Country','Guatemala'],['Region','Huehuetenango'],['Process','Washed']]){
  const match=field(facts,label);
  assert.ok(match,`Missing ${label}`);assert.equal(match.value,value);
  assert.equal(match.section,undefined,`Prior unrelated Shopify section attributed to ${label}`);
 }
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.process,'Washed');
});

test('legitimate pre-H1 heading within selected Shopify section retains its provenance',()=>{
 const html='<main><section class="shopify-section"><h2>Customer testimonials</h2></section>'+
  '<section class="shopify-section product-section"><h2>Selected coffee specifications</h2>'+
  '<p>Region: Huehuetenango</p><p>Process: Washed</p>'+
  '<h1>Guatemala | Quetzal</h1></section></main>';
 const facts=selected(html);
 assert.equal(field(facts,'Region')?.section,'Selected coffee specifications');
 assert.equal(field(facts,'Process')?.section,'Selected coffee specifications');
});
