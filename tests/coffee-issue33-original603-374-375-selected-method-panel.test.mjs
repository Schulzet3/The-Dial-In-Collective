// Issue #33 R23: current selected #374 and #375 card exact HTML SHA256
// #374 f201441c4d24c8a7a401c23ed2c8a881c12f5f1a85b73d083297c845a80e0fe3
// #375 b5427d6bd0ff740d38f334dad0fa1cf031ad5e163562d4ee1c0e278bee752bd4
// Verified public GitHub run 42441176732 artifact 13601970662.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://talkingcrowcoffeeroasters.com/products/decaf-peru-swiss-water-process';
const html=(name,body,other='',seo='')=>'<html><head><meta property="og:type" content="product">'+seo+
 '</head><body><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product__description rte">'+body+'</div></article>'+other+'</main></body></html>';
const panel=(milling='Washed',method='Swiss Water Process (chemical-free)')=>
 '<div class="tc-details-card"><p class="tc-details-card__title">What Defines This Coffee</p>'+
 '<span class="tc-section-label">ORIGIN STORY</span><p class="tc-section-body">Cajamarca, Peru.</p>'+
 '<span class="tc-section-label">PROCESSING DETAILS</span>'+
 '<p class="tc-section-body">Method: '+method+'</p>'+
 '<p class="tc-section-body">Milling: '+milling+'</p>'+
 '<p class="tc-section-body">Roast Level: Medium</p>'+
 '<span class="tc-section-label">FLAVOR PROFILE</span>'+
 '<p class="tc-section-body">Tasting Notes: Mango, Orange, Nougat, Cocoa</p></div>';
const parse=(name,body,other='',seo='')=>
 extractPublicCoffeeFacts(html(name,body,other,seo),{source_url:url});

test('selected current #374 processing Method Swiss Water separate from Washed coffee processing and UI',()=>{
 const r=parse('Decaf Peru Cajamarca',panel('Washed'));
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Washed',JSON.stringify(r.fields));
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
 assert.ok(r.source_facts.some(x=>x.field==='decaffeination_method'&&
   /Method: Swiss Water Process/.test(x.value)),JSON.stringify(r.source_facts));
});
test('selected current #375 processing Method Swiss Water separate from Natural coffee processing',()=>{
 const r=parse('Decaf Brazil Whiskey Barrel Aged',panel('Natural process'));
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Natural',JSON.stringify(r.fields));
});
test('non-selected Method, FAQ, unrelated SEO, and vague Method cannot supply a decaf treatment',()=>{
 for(const body of [
  '<p>Method: Swiss Water Process (chemical-free)</p>',
  '<span class="tc-section-label">FLAVOR PROFILE</span><p>Method: Swiss Water Process</p>',
  '<h2>Common Questions</h2><p>Method: Swiss Water Process</p>',
  '<span class="tc-section-label">PROCESSING DETAILS</span><p>Method: Pour Over</p>',
  '<span class="tc-section-label">PROCESSING DETAILS</span><p>Method: Water washed</p>'
 ]){
  const r=parse('Decaf Peru Cajamarca',body);
  assert.equal(r.fields.decaffeination_method,undefined,body+' '+JSON.stringify(r.fields));
 }
 const unrelated=parse('Decaf Peru Cajamarca','<p>Milling: Washed</p>',
  '<section class="product-recommendations">'+panel()+'</section>',
  '<meta name="description" content="Method: Swiss Water Process">');
 assert.equal(unrelated.fields.decaffeination_method,undefined);
 const noH1=html('Decaf Peru Cajamarca',panel()).replace('<h1>Decaf Peru Cajamarca</h1>','');
 assert.equal(extractPublicCoffeeFacts(noH1,{source_url:url}).fields?.decaffeination_method,undefined);
});
test('regular and half-caf products never receive selected full decaffeination method',()=>{
 for(const name of ['Colombia Regular','Colombia Half-Caf']){
  const r=parse(name,panel());
  assert.equal(r.fields.decaffeination_method,undefined,name);
 }
});
test('selected conflicting named methods withhold autofill and retain source review',()=>{
 const r=parse('Decaf Peru Cajamarca',panel()+
  '<span class="tc-section-label">PROCESSING DETAILS</span>'+
  '<p class="tc-section-body">Method: Ethyl Acetate Decaf</p>');
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
 assert.ok(r.source_facts.some(x=>x.field==='decaffeination_method'&&x.conflicting),
  JSON.stringify(r.source_facts));
});
test('after flavor heading, unrelated or FAQ Method is excluded without overriding valid selected Method',()=>{
 const r=parse('Decaf Peru Cajamarca',panel()+
  '<p class="tc-section-body">Method: Ethyl Acetate Decaf</p>'+
  '<h2>Common Questions</h2><p>Method: Ethyl Acetate Decaf</p>');
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
});
