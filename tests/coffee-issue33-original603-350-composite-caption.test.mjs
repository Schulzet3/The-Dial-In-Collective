// Issue #33: selected current #350 showed a spurious process='Origin and' review fact.
// Generic composite-caption guard; synthetic regressions, never archived corpus edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://example.invalid/products/selected-guatemala';
function extract(body){
 const name='Selected Guatemala Coffee';
 const html='<html><head><meta property="og:type" content="product"></head>'+
  '<body><main class="product"><h1>'+name+'</h1><section class="product-details">'+body+
  '</section></main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true,JSON.stringify(result));
 return result;
}
const forged=(result)=>result.source_facts?.filter(f=>f.field==='process'&&
 /^(?:origin\\s+(?:and|&)\\s*|origin\\s*\\/\\s*)$/iu.test(f.value||''))||[];

test('composite Origin and process, ampersand and slash headings are not invented process values',()=>{
 for(const caption of ['Origin and process','Origin & process','Origin / process']){
  const r=extract('<h2>Specifications</h2><h3>'+caption+'</h3>'+
   '<p>From 115 current growers in Huehuetenango. Fully washed and sun dried.</p>'+
   '<div><h3>Process</h3><p>Fully washed, sun dried</p></div>'+
   '<div><h3>Origin</h3><p>Huehuetenango, Guatemala</p></div>');
  assert.equal(r.fields.process,'Washed',caption);
  assert.equal(r.fields.origin,'Huehuetenango, Guatemala',caption);
  assert.deepEqual(forged(r),[],caption+' cannot become a green method in Source Review');
  const review=coffeeSourceReviewSnapshot({...r,source_url:url});
  assert.ok(review,'current selected Source Review must still render');
  assert.equal(review.field_suggestions.process,'Washed');
  assert.equal((review.published_source_information||[]).some(f=>
   f.field==='process'&&/^(?:Origin and|Origin &|Origin \/)$/i.test(String(f.value||''))),false);
 }
});

test('literal process suffix evidence remains supported for chosen coffee',()=>{
 const honey=extract('<h4>Black Honey process</h4><p>Country: Costa Rica</p>');
 assert.equal(honey.fields.process,'Honey','keep recognized Honey category and source modifier');
 assert.ok(honey.source_facts?.some(f=>f.field==='process'&&
  /black honey/i.test(f.value||'')),'retain literal Black Honey in source evidence');
 const washed=extract('<h4>washed process</h4><p>Origin: Guatemala</p>');
 assert.equal(washed.fields.process,'Washed');
});

test('no selected process label means no process invented from composite heading',()=>{
 const r=extract('<h3>Origin and process</h3>'+
  '<p>From 115 growers in Huehuetenango; care and drying are discussed.</p>');
 assert.equal(r.fields.process,undefined);
 assert.deepEqual(forged(r),[]);
});
