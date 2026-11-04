// Original603 #527, 2026-11-04 official raw selected HTML hash
// 8deb2be902148578157e39b26ec503e3117c423a1cb1768067e6195f0c5efb58.
// Faithful synthetic DOM roles below, NOT a replacement for live source run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {refineSelectedNamedTastingNotes} from '../src/server/coffee-flavor-evidence.mjs';
const url='https://www.mysticmonkcoffee.com/products/kenya-peaberry';
const compact='Honeydew Melon, Jasmine, Red Wine';
const selected='The Kenya Peaberry offers notes of honeydew melon and pear, with a hint of jasmine, and the pleasant winey brightness that Kenyan coffees are known for.';
const clean=(str,max=6001)=>String(str).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const page=(description,notes=compact,related='',heading=true)=>{
 const chips=notes.split(',').map(value=>'<div class="roast-note-item"><img src="/cdn/shop/files/tasting_notes.svg" alt="'+value.trim()+'"><p>'+value.trim()+'</p></div>').join('');
 const layout='<div class="product-info__block-item" data-block-type="liquid"><div class="roast-level-container product-info__block-item" data-block-type="roast-profile">'+
  '<div class="heading-with-tooltip"><h4 class="roast-title">Roast Level</h4></div><div class="roast-labels"><span>Light Roast</span><span>Dark Roast</span></div>'+
  (heading?'<div class="heading-with-tooltip"><h4 class="roast-subtitle">Tasting Notes</h4></div>':'')+
  '<div class="roast-notes">'+chips+'</div></div></div>';
 const story='<div class="product-info__block-item" data-block-type="story"><div class="product-block"><div class="prose prose-justify-start"><p>'+description+'</p></div></div></div>';
 return '<html><head><meta property="og:type" content="product"/><link rel="canonical" href="'+url+'"/></head><body><main><article class="product"><h1>Kenya Peaberry</h1>'+layout+story+'</article></main>'+related+'</body></html>';
};
const parse=(description=selected,notes=compact,related='',heading=true)=>
 extractPublicCoffeeFacts(page(description,notes,related,heading),{source_url:url});

test('#527 direct current named Tasting Notes prose adds literal pear without discarding printed chips',()=>{
 const html=page(selected);
 const output=refineSelectedNamedTastingNotes(html,{clean,notes:compact});
 for(const value of ['Honeydew Melon','pear','Jasmine','Red Wine'])
  assert.match(output,new RegExp(value,'i'),output);
 const r=parse();
 assert.equal(r.ok,true,JSON.stringify(r));
 // The selected layout must produce a canonical note before a server
 // refinement can act. If it does, assert exact proposal and no false conflict.
 if(r.fields.tasting_notes){
  for(const value of ['Honeydew Melon','pear','Jasmine','Red Wine'])
   assert.match(r.fields.tasting_notes,new RegExp(value,'i'),JSON.stringify(r));
  assert.ok(!r.conflicts?.includes('tasting_notes'),JSON.stringify(r));
 }
 assert.equal(r.fields.roast_level,undefined,'scale endpoints alone are not a selected roast category');
});
test('conditional milk, history, foreign name and unrelated product cannot donate pear',()=>{
 for(const text of [
  selected.replace('offers notes','used to offer notes'),
  selected.replace('Kenya Peaberry','Another Coffee'),
  selected.replace('with a hint of jasmine,','with a hint of jasmine, when served with milk,'),
  'Previously, '+selected,
  'Our Kenya Peaberry offers notes of honeydew melon and pear, with a hint of jasmine, when served with milk.'
 ]){
  const html=page(text),added=refineSelectedNamedTastingNotes(html,{clean,notes:compact});
  assert.equal(added,'',text);
  const r=parse(text);
  assert.doesNotMatch(r.fields.tasting_notes||'',/pear/i,text);
 }
 const related=parse('The Kenya Peaberry offers notes of honeydew melon and jasmine.',
  compact,'<aside class="related-products"><h2>Tasting Notes</h2><p>'+selected+'</p></aside>');
 assert.doesNotMatch(related.fields.tasting_notes||'',/pear/i);
});
test('unpublished, contradictory, missing heading or insufficient overlap must stay blank of pear',()=>{
 for(const data of [
  {text:selected,notes:'Cocoa, Caramel, Orange'},
  {text:selected,notes:'Honeydew Melon, Plum, Red Wine'},
  {text:selected.replace('with a hint of jasmine','with a hint of cinnamon'),notes:compact}
 ]){
  assert.equal(refineSelectedNamedTastingNotes(page(data.text,data.notes),{clean,notes:data.notes}),'');
  const r=parse(data.text,data.notes);
  assert.doesNotMatch(r.fields.tasting_notes||'',/pear/i,data.text);
 }
 assert.equal(refineSelectedNamedTastingNotes(page(selected,compact,'',false),{clean,notes:compact}),'');
});
