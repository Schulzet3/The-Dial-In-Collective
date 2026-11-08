// Issue #33 R30: current exact official #424/#441 selected-source EA defects.
// Public original603 official HTML SHA256 #424 d612bf0ad96a4574bfc2bc09910821db8e81ecd9cc1314b75f984642cf1eed4d
// #441 6ac73c53e9546baa00e6fbad8d60c6cbcb0c54b76d1693beecad78375964c678.
// These are source-shaped synthetic fixtures; not new frozen CSV/oracle rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const aldeaname='Flow State Decaf';
const flowIntro='Where focus meets joy, find your flow with this flavorful E.A. Process Decaf from Huila, Colombia. You’d never know it was decaffeinated with its red berry finesse and sweet, chocolatey finish.';
const flowExplanation='E.A. Processing is one of the most natural decaffination processes available. E.A. stands for Ethyl Acetate, which is derived from sugar cane.';
const blendname='Sebastian Ramirez - Red Fruits Decaf';
const blendProof='The original strawberry-cofermented coffee was blended with a traditional washed lot from Sebastián’s farm. That blended lot was then sent to the decaffeination facility, where it underwent a fascinating and confusing science experiment known as Ethyl Acetate Decaffeination (EAD). The TL;DR: a sugar alcohol byproduct is used as a solvent to help dissolve 95-97% of the caffeine out of the coffee as it is steamed.';
const urls={
 flow:'https://www.aldeacoffee.com/products/flow_state_decaf',
 blend:'https://www.blackwhiteroasters.com/products/r-sebastian-ramirez-red-fruits-decaf'
};
const page=(name,body,other='',seo='')=>'<html><head><meta property="og:type" content="product">'+seo+
 '</head><body><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product__description">'+body+'</div></article>'+other+'</main></body></html>';
const parse=(name,body,url=urls.flow,other='',seo='')=>
 extractPublicCoffeeFacts(page(name,body,other,seo),{source_url:url});

test('#424 selected own E.A. Process Decaf is Sugar Process, independent of green processing',()=>{
 const r=parse(aldeaname,'<p>'+flowIntro+'</p><h2>About the farmers</h2><p>'+flowExplanation+'</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,aldeaname);
 assert.equal(r.fields.decaffeination_method,'Sugar Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,undefined,JSON.stringify(r.fields));
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&/E\.A\. Process Decaf/.test(f.value)));
 assert.match(coffeeUrlPreviewMarkup(r),/Sugar Process/);
 const review=coffeeSourceReviewSnapshot({...r,source_url:urls.flow});
 assert.ok(review.published_source_information.some(f=>f.field==='decaffeination_method'&&/E\.A\. Process Decaf/.test(f.value)));
});

test('#441 direct current blended lot underwent EA Decaffeination, no CO2 fermentation transfer',()=>{
 const r=parse(blendname,'<p>'+blendProof+'</p><p>During co-fermentation CO2 was injected into the coffee mass.</p>'+
 '<p>Process | Co-ferment</p>',urls.blend);
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,blendname);
 assert.equal(r.fields.decaffeination_method,'Sugar Process',JSON.stringify(r.fields));
 assert.notEqual(r.fields.decaffeination_method,'Carbon Dioxide (CO2)');
 assert.notEqual(r.fields.process,'Washed');
 assert.notEqual(r.fields.process,'Natural');
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&/Ethyl Acetate Decaffeination/.test(f.value)));
 assert.match(coffeeUrlPreviewMarkup(r),/Sugar Process/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:urls.blend}));
});

test('EA claims require exact current chosen H1, fully decaf product, no cross-product SEO or FAQ borrowing',()=>{
 for(const [name,body,url] of [
  ['Flow State Half-Caf','<p>'+flowIntro+'</p>',urls.flow],
  ['Flow State Regular','<p>'+flowIntro+'</p>',urls.flow],
  ['Sebastian Ramirez Regular','<p>'+blendProof+'</p>',urls.blend],
  ['Sebastian Ramirez Half-Caf','<p>'+blendProof+'</p>',urls.blend]
 ])assert.equal(parse(name,body,url).fields.decaffeination_method,undefined,name);
 const missing=page(aldeaname,'<p>'+flowIntro+'</p>').replace('<h1>'+aldeaname+'</h1>','');
 assert.equal(extractPublicCoffeeFacts(missing,{source_url:urls.flow}).fields?.decaffeination_method,undefined);
 for(const [name,claim,url] of [[aldeaname,flowIntro,urls.flow],[blendname,blendProof,urls.blend]]){
  assert.equal(parse(name,'<p>Decaf with an unspecified current method.</p>',url,
   '<section class="product-recommendations"><h2>Other Coffees</h2><p>'+claim+'</p></section>'
   ).fields.decaffeination_method,undefined,'related '+name);
  assert.equal(parse(name,'<p>Selected current decaf, method unspecified.</p>',url,'',
   '<meta name="description" content="'+claim.replace(/"/g,'')+'">'
   ).fields.decaffeination_method,undefined,'seo '+name);
  assert.equal(parse(name,'<p>Selected current decaf, method unspecified.</p><h2>Frequently Asked Questions</h2><p>'+
    claim+'</p>',url).fields.decaffeination_method,undefined,'FAQ '+name);
 }
});

test('past methods, another coffee, negation and standalone E.A. education cannot supply treatment',()=>{
 for(const statement of [
  'Previously, '+flowIntro,
  'Another coffee features '+flowIntro,
  'This product does not use E.A. Process Decaf.',
  flowExplanation
 ])assert.equal(parse(aldeaname,'<p>'+statement+'</p>').fields.decaffeination_method,undefined,statement);
 for(const statement of [
  'Previously, '+blendProof,
  'Another coffee did this: '+blendProof,
  'The co-fermented coffee was blended with a washed lot. The blended lot was NOT sent to the decaffeination facility.',
  'CO2 was injected during fermentation of this decaf coffee.'
 ])assert.equal(parse(blendname,'<p>'+statement+'</p>',urls.blend).fields.decaffeination_method,undefined,statement);
});

test('competing directly selected water decaffeination must remain blank and reviewable',()=>{
 for(const [name,claim,url] of [[aldeaname,flowIntro,urls.flow],[blendname,blendProof,urls.blend]]){
  const r=parse(name,'<p>'+claim+'</p><p>This coffee is decaffeinated using Swiss Water.</p>',url);
  assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
  assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&f.conflicting),JSON.stringify(r.source_facts));
 }
});
