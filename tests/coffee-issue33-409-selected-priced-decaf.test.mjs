// Issue #33 original603 #409–#411: current White Rhino H1 includes
// commerce price, while the selected #409 description names Swiss Water.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
const url='https://whiterhinocoffee.com/products/decaf';
const own='A wonderful Guatemalan coffee sourced, sustainably, by Swiss Water Process to use a chemical-free decaf processing method.';
const page=(name,description='',{process='Washed',extra='',h1=name}={})=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product">'+
 '<h1>'+h1+'</h1><p>'+description+'</p><p>Roast: Medium</p><p>Origin: Guatemala</p>'+
 '<p>Process: '+process+'</p><p>Tasting Notes: Caramel Apple, Black Tea, Raisin</p>'+
 '</article></main>'+extra+'</body></html>';
const parse=html=>extractPublicCoffeeFacts(html,{source_url:url});

test('selected price-decorated Decaf heading and SAME-product prose produce Water Process separately from Washed',()=>{
 const r=parse(page('Decaf',own,{process:'Washed',h1:'Decaf <span class="price">$18.00</span>'}));
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Decaf');
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r));
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.origin,'Guatemala');
 assert.equal(r.fields.roast_level,'Medium');
 assert.ok(!r.conflicts.includes('decaffeination_method'),JSON.stringify(r.conflicts));
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&/Swiss Water Process/.test(f.value)),
  'member source review retains literal direct current-product method statement');
 assert.ok(coffeeUrlPreviewMarkup(r).includes('<dt>Coffee Name</dt><dd>Decaf</dd>'));
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});
test('selected process card may also name Swiss Water while the separate green process stays Washed',()=>{
 const r=parse(page('Decaf',own,{process:'Washed, Swiss Water Process',h1:'Decaf $18.00'}));
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Decaf');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.decaffeination_method,'Water Process');
});
test('original-versus-selected-versus-parser identity accepts ONLY price-decorated same selected name',()=>{
 for(const [expected,heading,parsed,allowed] of [
  ['Decaf','Decaf $18.00','Decaf',true],
  ['Ethiopia Kayon Mountain','Ethiopia Kayon Mountain $22.00','Ethiopia Kayon Mountain',true],
  ['Hidden Eagle (Espresso Blend)','Hidden Eagle (Espresso Blend) $18.00','Hidden Eagle (Espresso Blend)',true],
  ['Decaf','Another Decaf $18.00','Decaf',false],
  ['Decaf','Decaf $18.00','Another Decaf',false],
  ['Decaf','Decaf $18.00 from last year','Decaf',false],
  ['Decaf','Decaf $18.00','Decaf $18.00',false]
 ])assert.equal(identicalCurrentSelectedTitle(expected,heading,parsed),allowed,expected+' '+heading);
});
test('negative, unrelated, mixed-caffeine, SEO, and nonselected claims cannot supply decaf treatment',()=>{
 const variants=[
  page('Decaf','A wonderful Guatemalan coffee not sourced, sustainably, by Swiss Water Process to use a chemical-free decaf processing method.'),
  page('Decaf','A wonderful Guatemalan coffee sourced, sustainably, by Swiss Water Process rather than a decaf processing method.'),
  page('Decaf','Another coffee sourced, sustainably, by Swiss Water Process to use a chemical-free decaf processing method.'),
  page('Regular',own),
  page('Half-Caf',own),
  page('Decaf','',{extra:'<aside><h2>Related Coffee</h2><p>'+own+'</p></aside>'}),
  '<html><head><meta property="og:type" content="product"><meta name="description" content="'+own+'"></head>'+
   '<body><main><article class="product"><h1>Decaf</h1><p>Process: Washed</p></article></main></body></html>'
 ];
 for(const html of variants){
  const r=parse(html);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.fields.decaffeination_method,undefined,'unrelated source must not fill decaf method');
 }
});
