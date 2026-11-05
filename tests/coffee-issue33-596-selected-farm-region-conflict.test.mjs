// Exact selected original603 #596: conflicting Region spelling vs named farm.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedFarmStoryRegionMismatch as check} from '../src/server/coffee-title-region-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name='Guatemala Huehuetenango Los Dos Socios';
const url='https://www.wreckingballcoffee.com/products/guatemala-huehuetenango-los-dos-socios-12oz';
const story='Finca Los Dos Socios is located in the highlands of La Libertad, Huehuetenango. A second-generation farmer, Don Concepción Villatoro, has been devoted to coffee his entire life.';
const blocks=(text=story,h1=name)=>[{tag:'h1',text:h1},{tag:'p',text,section:'The Full Story'}];
const parse=(region='Huehuetenago',text=story,heading=name,extra='')=>{
 const html='<html><head><meta property="og:type" content="product"></head><body>'+
  '<main><article class="product"><h1>'+heading+'</h1><div class="product-description">'+
  '<h2>What’s in it:</h2><p>Country: Guatemala</p><p>Region: '+region+'</p>'+
  '<p>Farm: Finca Los Dos Socios</p><p>Process: Washed</p>'+
  '<h2>The Full Story:</h2><p>'+text+'</p></div></article></main>'+extra+
  '</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
};
test('current farm story and exact selected title corroborate a one-letter disagreement',()=>{
 const found=check({name,origin:'Huehuetenago, Guatemala',blocks:blocks()});
 assert.equal(found?.value,'La Libertad, Huehuetenango, Guatemala');
 assert.match(found.quote,/Finca Los Dos Socios is located/);
});
test('actual parser and Add Coffee withhold misspelled region, retain both literals',()=>{
 const q=parse();assert.equal(q.ok,true,JSON.stringify(q));
 assert.equal(q.fields.origin,undefined,JSON.stringify(q));
 assert.ok(q.conflicts?.includes('origin'),JSON.stringify(q));
 assert.match(JSON.stringify(q.conflict_options||{}),/Huehuetenago/);
 assert.match(JSON.stringify(q.conflict_options||{}),/Huehuetenango/);
 assert.ok(coffeeUrlPreviewMarkup(q));
 assert.ok(coffeeSourceReviewSnapshot({...q,source_url:url}));
 assert.equal(q.fields.process,'Washed');
});
test('consistent region label not withheld',()=>{
 assert.equal(check({name,origin:'Huehuetenango, Guatemala',blocks:blocks()}),null);
 const q=parse('Huehuetenango');
 assert.equal(q.ok,true,JSON.stringify(q));
 assert.ok(!q.conflicts?.includes('origin'),JSON.stringify(q));
});
test('historical, hypothetical, other farm, other location and wrong H1 fail closed',()=>{
 for(const text of [
  story.replace('is located','was previously located'),
  story.replace('is located','might be located'),
  story.replace('Finca Los Dos Socios','Finca Unrelated Estate'),
  'Finca Los Dos Socios is located in the highlands of La Libertad, Another Region.'
 ])assert.equal(check({name,origin:'Huehuetenago, Guatemala',blocks:blocks(text)}),null,text);
 assert.equal(check({name,origin:'Huehuetenago, Guatemala',blocks:blocks(story,'Another Coffee')}),null);
});
test('related, educational and cross-country stories do not leak',()=>{
 assert.equal(check({name,origin:'Huehuetenago, Guatemala',
  blocks:[{tag:'h1',text:name},{tag:'p',text:story,educational:true}]}),null);
 assert.equal(check({name,origin:'Huehuetenago, Colombia',blocks:blocks()}),null);
 const q=parse('Huehuetenago','A balanced sweet cup.',name,
  '<aside class="related-products"><p>'+story+'</p></aside>');
 assert.equal(q.ok,true,JSON.stringify(q));
 assert.ok(!q.conflicts?.includes('origin'),JSON.stringify(q));
});
test('two direct current farm locations cannot pick one',()=>{
 assert.equal(check({name,origin:'Huehuetenago, Guatemala',
  blocks:[{tag:'h1',text:name},{tag:'p',text:story},
   {tag:'p',text:'Finca Los Dos Socios is located in the highlands of Otra Vista, Huehuetenango.'}]}),null);
});
