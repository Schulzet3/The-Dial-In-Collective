import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeHtmlAttributes,productMarkup} from '../src/server/coffee-product-scope.mjs';
import {extractCoffeeIdentityEvidence} from '../src/server/coffee-identity-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://roaster.example/products/current-coffee';
const page=body=>'<main><h1>Current Coffee</h1>'+body+'</main>';
const parse=(body,{description='',origin='',name='Current Coffee'}={})=>{
 const product={'@type':'Product',name,url:source_url,description,
  ...(origin?{additionalProperty:[{name:'Origin',value:origin}]}:{})};
 return extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify(product)+
  '</script><main><h1>'+name+'</h1>'+body+'</main>',{source_url});
};
const clean=html=>String(html).replace(/<[^<>]*>/g,' ').replace(/\s+/g,' ').trim();
// Minimal current-source relationship, not a claim to contain an original
// complete capture. The frozen corpus and public acceptance stay independent.
const nyeri='This coffee comes from Nyeri on the western slopes of Mount Kenya';
const selectedNotes='Star anise, Dark fudge, Verbena';
const foreignNotes='Orange, Praline, Cream';
const card=(attributes='class="woocommerce-LoopProduct-link"')=>
 '<li class="product type-product"><div><a '+attributes+' href="/products/another-coffee">'+
 '<h3>Another Coffee</h3><p>Tasting notes: '+foreignNotes+'</p></a></div></li>';

test('a current region and explicitly linked mountain refine the same selected origin',()=>{
 const result=parse('<p>Region: Nyeri</p><p>Country: Kenya</p>',{
  description:nyeri,name:'Ruarai Kenya'
 });
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Nyeri, Mount Kenya, Kenya');
 assert.ok(!result.conflicts?.includes('origin'));
 const facts=extractCoffeeIdentityEvidence('<p>'+nyeri+'</p>',{
  name:'Ruarai Kenya',fields:{origin:'Nyeri, Kenya'},clean
 }).facts;
 assert.ok(facts.some(f=>f.label==='Origin'&&f.value==='Nyeri, Mount Kenya, Kenya'));
});

test('the new geographic relationship does not admit denied or historical prose',()=>{
 for(const sentence of [
  'Last year this coffee came from Nyeri on the western slopes of Mount Kenya',
  'This coffee does not come from Nyeri on the western slopes of Mount Kenya',
  'Other coffees come from Nyeri on the western slopes of Mount Kenya',
  'Our staff visited a coffee farm in Nyeri on the western slopes of Mount Kenya'
 ]){
  const facts=extractCoffeeIdentityEvidence('<p>'+sentence+'</p>',{name:'Current Coffee',clean}).facts;
  assert.ok(!facts.some(f=>/^(?:Origin|Region|Country)$/.test(f.label)),sentence);
 }
});

test('a genuinely different labeled region remains a source conflict',()=>{
 const result=parse('<p>Country: Kenya</p><p>Region: Kirinyaga</p>',{
  description:nyeri,origin:'Nyeri, Kenya',name:'Ruarai Kenya'
 });
 assert.equal(result.fields.origin,undefined);
 assert.ok(result.conflicts?.includes('origin'));
 assert.ok(!result.available.includes('origin'));
});

test('orphaned WooCommerce recommendation cards cannot contaminate selected tasting notes',()=>{
 const body='<p>Tasting notes: '+selectedNotes+'</p>'+
  '<section class="related products"><h2>Related products</h2></section>'+
  '<ul class="products">'+card()+'</ul>'+
  '<section><h2>Our Story</h2><p>Producer: Ana Torres</p></section>';
 const scoped=productMarkup(page(body)),result=parse(body);
 assert.doesNotMatch(scoped,/Another Coffee|Orange, Praline, Cream/);
 assert.match(scoped,/Ana Torres/);
 assert.equal(result.fields.tasting_notes,selectedNotes);
 assert.equal(result.fields.producer,'Ana Torres');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
 assert.ok(!JSON.stringify(result.source_facts).includes(foreignNotes));
});

test('class-like text in unusual quoted attributes does not hide genuine product evidence',()=>{
 for(const attributes of [
  '@click="class=\'woocommerce-LoopProduct-link\'"',
  '1="class=\'woocommerce-LoopProduct-link\'"',
  'title="class=\'woocommerce-LoopProduct-link\'"',
  'data-state=\'class="woocommerce-LoopProduct-link"\'',
  ':class="\'woocommerce-LoopProduct-link\'"'
 ]){
  const body='<li class="product type-product"><a '+attributes+' href="/products/current-coffee">'+
   '<p>Producer: Ana Torres</p><p>Tasting notes: '+selectedNotes+'</p></a></li>';
  assert.match(productMarkup(page(body)),/Ana Torres/,attributes);
  const result=parse(body);
  assert.equal(result.fields.producer,'Ana Torres',attributes);
  assert.equal(result.fields.tasting_notes,selectedNotes,attributes);
 }
});

test('real loop-link attributes remain effective without treating generic product containers as cards',()=>{
 const actual=card('@click="class=\'ordinary-link\'" 1="hidden" class="woocommerce-LoopProduct-link"');
 assert.doesNotMatch(productMarkup(page(actual)),/Another Coffee|Orange, Praline, Cream/);
 const selected='<div class="product type-product"><a class="woocommerce-LoopProduct-link" href="/products/current-coffee">'+
  '<p>Producer: Ana Torres</p></a></div>';
 assert.match(productMarkup(page(selected)),/Ana Torres/);
 // Do not climb through a nearer, different LI and classify its outer
 // selected-product LI using the nested link's unrelated ownership.
 const nested='<li class="product type-product"><p>Producer: Ana Torres</p>'+
  '<ul><li><a class="woocommerce-LoopProduct-link" href="/products/current-coffee">Details</a></li></ul></li>';
 assert.match(productMarkup(page(nested)),/Ana Torres/);
});

test('genuine selected tasting conflicts and actual hidden panels remain guarded',()=>{
 const result=parse('<p>Tasting notes: '+selectedNotes+'</p><p>Tasting notes: Mango, Peach</p>');
 assert.equal(result.fields.tasting_notes,undefined);
 assert.ok(result.conflicts?.includes('tasting_notes'));
 const hidden=page('<div @click="class=\'ordinary\'" hidden><p>Producer: Hidden Person</p></div>'+
  '<p>Producer: Ana Torres</p>');
 assert.doesNotMatch(productMarkup(hidden),/Hidden Person/);
 assert.match(productMarkup(hidden),/Ana Torres/);
});

test('complete attribute consumption preserves first values and fails closed on an unfinished quote',()=>{
 const attrs=coffeeHtmlAttributes('@click="hidden class=\'forged\'" 1="aria-hidden=\'true\'" class="real" CLASS="later" data-guide="espresso"');
 assert.equal(attrs.class,'real');
 assert.equal(attrs['data-guide'],'espresso');
 assert.equal(attrs.hidden,undefined);
 assert.equal(attrs['aria-hidden'],undefined);
 const unfinished=coffeeHtmlAttributes('@click="unterminated class=\'forged\' hidden');
 assert.equal(unfinished.class,undefined);
 assert.equal(unfinished.hidden,undefined);
});

test('leading equals signs stay inside unusual names and cannot hide the selected coffee',()=>{
 for(const attributes of ['=hidden','=aria-hidden="true"']){
  const scoped=productMarkup(page('<div '+attributes+'><p>Producer: Ana Torres</p></div>'));
  assert.match(scoped,/Ana Torres/,attributes);
 }
 const forged='<li class="product type-product"><a =class="woocommerce-LoopProduct-link" href="/products/current-coffee">'+
  '<p>Producer: Ana Torres</p></a></li>';
 assert.match(productMarkup(page(forged)),/Ana Torres/);
 const real=card('=class="ordinary-link" =data="class=\'forged\' hidden" class="woocommerce-LoopProduct-link"');
 assert.doesNotMatch(productMarkup(page(real)),/Another Coffee|Orange, Praline, Cream/);
 const attrs=coffeeHtmlAttributes('=hidden =aria-hidden="true" =class="forged" =data="class=\'forged\' hidden" class="real"');
 assert.equal(attrs.hidden,undefined);
 assert.equal(attrs['aria-hidden'],undefined);
 assert.equal(attrs.class,'real');
});

test('attribute and class token boundaries follow HTML whitespace and the real tag end',()=>{
 const ended=coffeeHtmlAttributes('id="current" > hidden class="woocommerce-LoopProduct-link"');
 assert.equal(ended.id,'current');assert.equal(ended.hidden,undefined);assert.equal(ended.class,undefined);
 const quoted=coffeeHtmlAttributes('title="a > hidden class=\'forged\'" class="real"');
 assert.equal(quoted.title,"a > hidden class='forged'");assert.equal(quoted.class,'real');
 assert.equal(quoted.hidden,undefined);
 assert.equal(coffeeHtmlAttributes('/hidden').hidden,'');
 assert.equal(coffeeHtmlAttributes('data-x=0\u00a0hidden').hidden,undefined);
 assert.equal(coffeeHtmlAttributes('\u00a0hidden').hidden,undefined);
 assert.match(productMarkup(page('<div \u00a0hidden><p>Producer: Ana Torres</p></div>')),/Ana Torres/);
 const classText='<li class="product type-product"><a class="ordinary\u00a0woocommerce-LoopProduct-link" href="/current">'+
  '<p>Producer: Ana Torres</p></a></li>';
 assert.match(productMarkup(page(classText)),/Ana Torres/);
 const joinedNames='<li class="product\u00a0type-product"><a class="woocommerce-LoopProduct-link" href="/current">'+
  '<p>Producer: Ana Torres</p></a></li>';
 assert.match(productMarkup(page(joinedNames)),/Ana Torres/);
});
