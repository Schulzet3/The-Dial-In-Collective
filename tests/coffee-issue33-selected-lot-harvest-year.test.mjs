// Issue #33 original603 #269: the grower's career in a named year
// does not establish this selected product's harvest/release identity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://queencitycollectivecoffee.com/products/liliana-ramirez-colombia';
const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const parse=(sentences,heading='Liliana Ramírez // Colombia')=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product"></head><body><main>'+
 '<article class="product"><h1>'+esc(heading)+'</h1><div class="product__description">'+
 sentences.map(sentence=>'<p>'+esc(sentence)+'</p>').join('')+
 '</div></article></main></body></html>',{source_url});

test('Liliana grower biography does not mislabel selected coffee as the 2026 release',()=>{
 const lines=[
  "We're beyond excited to introduce our first coffee from Liliana Ramírez.",
  'This lot is 100% Chiroso, processed using the traditional Tres Cochadas method.',
  "She told the exporter in 2025 that if they continued to work with her, she'd be able to move full time to her farm.",
  'And sure enough, for the 2026 harvest, she has been able to do so.'
 ];
 const result=parse(lines);
 assert.equal(result.ok,true);
 assert.equal(result.fields.release_label,undefined);
 assert.ok(!result.conflicts?.includes('release_label'));
 assert.ok(result.source_facts?.some(fact=>String(fact.value).includes('2026 harvest')),
  'Farmer biography must remain in source facts for member review');
});

test('unrelated farmer milestones and future career promises never date this lot',()=>{
 for(const story of [
  'For the 2026 harvest, she has been able to work full time on the farm.',
  'Since the 2025 harvest the farmer has changed jobs.',
  'During the 2024 crop, the producer began a new career.',
  'For the 2026 harvest, the producer can spend more time at home.'
 ]){
  const result=parse([story]);
  assert.equal(result.ok,true,story);
  assert.equal(result.fields.release_label,undefined,story);
 }
});

test('explicit same-sentence selected-coffee harvest still supplies current release year',()=>{
 for(const story of [
  'For the 2026 harvest, Liliana selected this lot.',
  'This coffee comes from the 2026 harvest.',
  'Preorder this coffee from the 2026 harvest.',
  'This lot belongs to the 2026 crop.'
 ]){
  const result=parse([story]);
  assert.equal(result.ok,true,story);
  assert.equal(result.fields.release_label,'2026',story);
 }
});

test('printed exact current-coffee harvest specification remains eligible',()=>{
 const result=parse(['Harvest: 2026','Our roaster records this exact current lot.']);
 assert.equal(result.fields.release_label,'2026');
 assert.ok(!result.conflicts?.includes('release_label'));
});

test('historical farmer biography cannot override a separately explicit 2025 release',()=>{
 const result=parse(['Release: 2025','For the 2026 harvest, she has been able to work full time on her farm.']);
 assert.equal(result.fields.release_label,'2025');
 assert.ok(!result.conflicts?.includes('release_label'));
});

test('dated year is never inferred from a generic calendar window or off-product story',()=>{
 for(const text of ['Harvest: December–April','Our farmers hoped for the 2026 crop.']){
  const result=parse([text]);
  assert.equal(result.fields.release_label,undefined,text);
 }
});
