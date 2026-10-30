// Issue #33 original603 #205: a selected product can contradict itself.
// Preserve both published source claims, not a fabricated second coffee.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts,markSelectedTastingSourceDisagreements} from '../src/server/coffee-page-metadata.mjs';
import {coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const src='https://roaster.example/products/breakfast-blend';
const preferred='brown sugar, almond, cherry & red apple';
const conflicting='Nutmeg, Whole Bean Vanilla, Creamy Butter';
const row=(label,value,more={})=>({field:'tasting_notes',label,value,source_type:'html',source_url:src,...more});

test('distinct same-product Flavor caption survives flagged for member review',()=>{
 const facts=[row('Flavor',conflicting),row('Tasting Notes',preferred)];
 const result=markSelectedTastingSourceDisagreements(facts,preferred);
 assert.strictEqual(result,facts,'source evidence array must not be discarded or reordered');
 assert.equal(result[0].value,conflicting);
 assert.equal(result[0].conflicting,true);
 assert.notEqual(result[1].conflicting,true);
 const snapshot=coffeeSourceReviewSnapshot({ok:true,source_url:src,fields:{name:'Breakfast Blend',tasting_notes:preferred},source_facts:result});
 assert.equal(snapshot.field_suggestions.tasting_notes,preferred);
 assert.ok(snapshot.published_source_information.some(f=>f.value===conflicting&&f.conflicting===true));
});

test('equivalent and subset details cannot create false review conflict',()=>{
 for(const alternative of [
  'brown sugar, almond, cherry, red apple',
  'brown sugar, almond',
  'brown sugar, almond, cherry, red apple, orange',
  'Brown Sugar / Almond / Cherry / Red Apple'
 ]){
  const facts=[row('Flavor',alternative)];
  markSelectedTastingSourceDisagreements(facts,preferred);
  assert.notEqual(facts[0].conflicting,true,alternative);
 }
});

test('unlabeled prose, metadata, general guidance and unrelated sources are not reclassified',()=>{
 const facts=[row('Product description',conflicting),row('Flavor',conflicting,{source_type:'site_metadata'}),
 row('Flavor',conflicting,{section:'Different coffee in the source'}),
 row('Tasting Notes',conflicting,{section:'Roaster general guidance'}),
 row('Flavor',conflicting,{source_type:'html',conflicting:true})];
 markSelectedTastingSourceDisagreements(facts,preferred);
 assert.ok(facts.slice(0,4).every(f=>f.conflicting!==true));
 assert.equal(facts[4].conflicting,true);
});

test('unavailable preferred current notes cannot invent a competing canonical profile',()=>{
 const facts=[row('Flavor',conflicting)];
 assert.strictEqual(markSelectedTastingSourceDisagreements(facts,''),facts);
 assert.notEqual(facts[0].conflicting,true);
});

test('selected current product direct description is not replaced by contrary selected spec',()=>{
 const body='<main><h1>Breakfast Blend</h1><section class="product-details">'+
  '<article><ul class="product-template__details-table">'+
  '<li class="description rte"><p class="label mb3 h4">Product Info</p>'+
  '<p><span>Breakfast Blend showcases a seasonal blend. Smooth bodied with notes of '+preferred+'.</span></p></li>'+
  '<li class="detail"><p class="label">Roast:</p><p class="item custom_metafield">Medium</p></li>'+
  '<li class="detail"><p class="label">Flavor:</p><p class="item custom_metafield">'+conflicting+'</p></li>'+
  '</ul></article></section></main>';
 const r=extractPublicCoffeeFacts('<html><body>'+body+'</body></html>',{source_url:src});
 assert.equal(r.ok,true);
 assert.equal(r.fields.tasting_notes,preferred,'current selected product description takes priority');
 assert.ok(r.source_facts?.some(f=>f.field==='tasting_notes'&&f.value===conflicting&&f.conflicting===true),
  'opposing selected Flavor caption remains visible as an explicit source discrepancy');
});
