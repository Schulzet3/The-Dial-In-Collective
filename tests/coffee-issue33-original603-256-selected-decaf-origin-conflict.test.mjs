// Issue #33 current official #256 selected-decaf source contradiction.
// Synthetic exact-source semantic regressions; original HTML is hashed in CI artifact.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {conflictingCurrentSelectedDecafSource} from '../src/server/coffee-selected-decaf-origin-conflict.mjs';
const name='Coast Decaf';
const story='Coast Decaf moves at your pace. Crafted from Mexican coffees decaffeinated with a natural sugar process, it offers brown sugar.';
const blocks=({nameText=name,body=story,origin='African Blend',extra=[]}={})=>[
 {tag:'h1',text:nameText},{tag:'p',text:body,section:''},
 ...(origin?[{tag:'span',text:'Origin: '+origin,section:''}]:[]),...extra
];
const make=body=>extractPublicCoffeeFacts('<html><head><meta property="og:type" content="product"></head><body><main>'
 +'<article class="product"><h1>'+name+'</h1><div class="product__description"><p>'+body+'</p>'
 +'<div class="product__specs"><span>Origin: African Blend</span><span>Process: Washed</span></div>'
 +'</div></article></main></body></html>',
 {source_url:'https://pinewoodcoffeeco.com/products/coast-decaf'});
test('direct selected source and conflicting explicit Origin label withhold instead of guess',()=>{
 const direct=conflictingCurrentSelectedDecafSource({name,origin:'African Blend',blocks:blocks()});
 assert.equal(direct?.prose_country,'Mexico');
 assert.equal(direct?.selected_origin,'African Blend');
 const r=make(story);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,undefined,JSON.stringify(r.fields));
 assert.ok(r.conflicts.includes('origin'),JSON.stringify(r));
 assert.ok(r.source_facts.some(f=>f.field==='origin'&&f.value==='Mexico'&&f.conflicting));
 assert.ok(r.source_facts.some(f=>f.field==='origin'&&f.value==='African Blend'&&f.conflicting));
 assert.equal(r.fields.process,'Washed',JSON.stringify(r.fields));
});
test('source country compatible with current origin label is not a false conflict',()=>{
 for(const [demonym,origin] of [['Mexican','Mexico'],['Kenyan','African Blend'],['Colombian','South America']]){
  const body='Our decaf coffee is special. Crafted from '+demonym+' coffees decaffeinated with a natural sugar process.';
  assert.equal(conflictingCurrentSelectedDecafSource({name,origin,blocks:blocks({body,origin})}),null);
 }
});
test('wrong current identity, no labeled Origin, extra H1, no decaf and SEO-only are excluded',()=>{
 assert.equal(conflictingCurrentSelectedDecafSource({name,origin:'African Blend',blocks:blocks({nameText:'Different Coffee'})}),null);
 assert.equal(conflictingCurrentSelectedDecafSource({name,origin:'African Blend',blocks:blocks({origin:''})}),null);
 assert.equal(conflictingCurrentSelectedDecafSource({name,origin:'African Blend',blocks:[...blocks(),{tag:'h1',text:'Other Coffee'}]}),null);
 assert.equal(conflictingCurrentSelectedDecafSource({name:'Coast Coffee',origin:'African Blend',blocks:blocks()}),null);
 assert.equal(conflictingCurrentSelectedDecafSource({name,origin:'African Blend',blocks:[
  {tag:'h1',text:name},{tag:'span',text:'Origin: African Blend'},
  {tag:'meta',text:story}
 ]}),null);
});
test('historic, other-coffee, missing method and related section prose never veto',()=>{
 for(const body of [
  'Previously Coast Decaf was crafted from Mexican coffees decaffeinated with a natural sugar process.',
  'Coast Decaf is from Africa. Another coffee crafted from Mexican coffees decaffeinated with a natural sugar process.',
  'Coast Decaf is crafted from Mexican coffees with sugarcane tasting notes.',
  'Coast Decaf is roasted for espresso.'
 ]){
  assert.equal(conflictingCurrentSelectedDecafSource({name,origin:'African Blend',blocks:blocks({body})}),null,body);
 }
 assert.equal(conflictingCurrentSelectedDecafSource({name,origin:'African Blend',blocks:blocks({
  body:'Coast Decaf has chocolate notes.',
  extra:[{tag:'p',text:story,section:'Other Coffees'}]
 })}),null);
});
test('without a selected country contradiction, current Origin stays eligible',()=>{
 const r=make('Coast Decaf is a smooth cup with molasses and brown sugar.');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!r.conflicts.includes('origin'),JSON.stringify(r));
});
