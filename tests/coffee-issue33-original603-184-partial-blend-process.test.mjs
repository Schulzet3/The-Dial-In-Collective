// Issue #33 original603 #184: a named component's process does not prove the
// processing method for the whole selected multi-component blend.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedPartialBlendProcess} from '../src/server/coffee-blend-evidence.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const source_url='https://lamulitacoffee.com/products/exotic-mule';
const story="Get ready to indulge in Exotic Mule. This blend features Villa Betulia's Yellow Natural Pacamara, grown by Luis Anibal Calderon, and pairs it with a regional coffee from Huila. The result is a smooth cup.";
function page({storyText=story,name='Exotic Mule',process='Natural',extra=''}={}){
 return '<html><head><link rel="canonical" href="'+source_url+'"></head><body><main><article class="product">'+
  '<h1>'+name+'</h1><p>Medium Roast</p><p>Cupping Notes: Chocolate, Red Fruits, and Hazelnut</p>'+
  '<div class="product-description"><p>'+storyText+'</p>'+
  '<ul><li>Origin: Huila</li><li>Varietal: Yellow Pacamara</li><li>Process: '+process+'</li>'+
  '<li>Farmer: Luis Anibal Calderon</li></ul></div></article></main>'+extra+'</body></html>';
}
const parse=html=>extractPublicCoffeeFacts(html,{source_url});
test('incomplete selected two-component #184 withholds whole-blend process; keeps other fields and review',()=>{
 const r=parse(page());
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Exotic Mule');
 assert.equal(r.fields.process,undefined);
 assert.match(r.roaster_details?.processing_detail||'',/no published process/i);
 assert.ok(r.source_facts?.some(x=>x.field==='component_process'&&/Huila/.test(x.value)));
 assert.match(r.fields.tasting_notes||'',/Chocolate/);
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url}));
});
test('explicit whole-blend method or proof for both components keeps method',()=>{
 for(const s of [story+' Both components are Natural processed.',story+' This blend is Natural processed.']){
  const r=parse(page({storyText:s}));
  assert.equal(r.fields.process,'Natural');
  assert.equal(r.source_facts?.some(x=>x.field==='component_process'),false);
 }
});
test('single coffee, first component without method, or different caption must retain valid method',()=>{
 assert.equal(parse(page({storyText:'This coffee comes from one farm in Huila.'})).fields.process,'Natural');
 assert.equal(parse(page({storyText:story.replace('Yellow Natural Pacamara','Yellow Pacamara')})).fields.process,'Natural');
 assert.equal(parse(page({process:'Washed'})).fields.process,'Washed');
});
test('related products or other selected H1 cannot supply component facts',()=>{
 const other='<aside class="related-products"><h2>Other Coffee</h2><p>'+story+'</p></aside>';
 const r=parse(page({storyText:'This selected coffee is processed Natural.',extra:other}));
 assert.equal(r.fields.process,'Natural');
 assert.equal(selectedPartialBlendProcess('<h1>Other Coffee</h1><p>'+story+'</p>',{name:'Exotic Mule',process:'Natural'}),null);
});
test('generic named other blend with a different first processing method',()=>{
 const changed=story.replace('Exotic Mule','House Morning').replace('Yellow Natural Pacamara','Red Washed Bourbon');
 const r=parse(page({name:'House Morning',storyText:changed,process:'Washed'}));
 assert.equal(r.fields.process,undefined);
 assert.match(r.roaster_details?.processing_detail||'',/Washed/);
});
