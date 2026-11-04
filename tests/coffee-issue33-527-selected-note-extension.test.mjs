// Original603 #527 source-bound current selected tasting-note omission.
// The actual official HTML (2026-11-04) is independently SHA256 recorded
// in the #33 journal. These synthetic tests are NOT raw HTML acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://www.mysticmonkcoffee.com/products/kenya-peaberry';
const compact='Honeydew Melon, Jasmine, Red Wine';
const selected='The Kenya Peaberry offers notes of honeydew melon and pear, with a hint of jasmine, and the pleasant winey brightness that Kenyan coffees are known for.';
const page=(description,notes=compact,related='')=>'<html><head><link rel="canonical" href="'+url+'"/></head><body><main><article class="product"><h1>Kenya Peaberry</h1><div class="product__description"><p>Tasting Notes: '+notes+'</p><h2>Tasting Notes</h2><p>'+description+'</p></div></article></main>'+related+'</body></html>';
const parse=(description=selected,notes=compact,related='')=>extractPublicCoffeeFacts(page(description,notes,related),{source_url:url});
test('#527 one exact named selected tasting section supplements one missing literal note',()=>{
 const result=parse();
 assert.equal(result.ok,true,JSON.stringify(result));
 for(const value of ['Honeydew Melon','pear','Jasmine','Red Wine'])
  assert.match(result.fields.tasting_notes||'',new RegExp(value,'i'),JSON.stringify(result));
 assert.ok(!result.conflicts?.includes('tasting_notes'),JSON.stringify(result.conflicts));
 assert.equal(result.fields.roast_level,undefined);
});
test('conditional milk/history, foreign selected name and unrelated product cannot donate a note',()=>{
 for(const text of [
  selected.replace('offers notes','used to offer notes'),
  selected.replace('Kenya Peaberry','Another Coffee'),
  selected.replace('offers notes','offers notes').replace('with a hint of jasmine,','with a hint of jasmine, when served with milk,'),
  'Previously, '+selected,
  'Our Kenya Peaberry offers notes of honeydew melon and pear, with a hint of jasmine, when served with milk.'
 ]){
  const result=parse(text);
  assert.doesNotMatch(result.fields.tasting_notes||'',/pear/i,text);
 }
 const related=parse('The current selected coffee offers notes of honeydew melon and jasmine.',
  compact,'<aside class="related-products"><h2>Tasting Notes</h2><p>'+selected+'</p></aside>');
 assert.doesNotMatch(related.fields.tasting_notes||'',/pear/i);
});
test('two independent contradictory profiles, missing heading and no two literal anchors do not merge',()=>{
 for(const data of [
  {text:selected,notes:'Cocoa, Caramel, Orange'},
  {text:selected,notes:'Honeydew Melon, Plum, Red Wine'},
  {text:selected.replace('with a hint of jasmine','with a hint of cinnamon'),notes:compact},
 ]){
  const result=parse(data.text,data.notes);
  assert.doesNotMatch(result.fields.tasting_notes||'',/pear/i,data.text+' '+data.notes);
 }
 const noLabel=extractPublicCoffeeFacts('<main><h1>Kenya Peaberry</h1><p>Tasting Notes: '+compact+'</p><p>'+selected+'</p></main>',{source_url:url});
 assert.doesNotMatch(noLabel.fields.tasting_notes||'',/pear/i);
});
