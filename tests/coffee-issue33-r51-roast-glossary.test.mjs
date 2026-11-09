import test from 'node:test';
import assert from 'node:assert/strict';
import {extractRoastVisualEvidence} from '../src/server/roast-level-evidence.mjs';
const glossary='<p><strong>American Roast:</strong> Our lightest roast, characterized by a dry surface, leading to a light body and a bright, piquant flavor</p>'+
 '<p><strong>Full City Roast:</strong> A medium/light roast, slightly darker than our American, has a rich, sweet, full-body creating a complex cup</p>'+
 '<p><strong>Vienna Roast:</strong> A medium/dark roast that brings the ambrosial coffee oils to the surface and brews a savory, pleasantly bittersweet cup</p>';
const page=(name='Peru Cafe Canchaque – Natural, American',label='American Roast - 1 lb',body=glossary)=>
 '<html><main><article><h1>'+name+'</h1><label class="variant__label">'+label+
 '</label><div class="collapsible-content__inner rte">'+body+'</div></article></main></html>';
test('R51 actual merchant-shaped selected H1 variant and glossary grant Light',()=>{
 const r=extractRoastVisualEvidence(page());
 assert.equal(r.value,'Light');
 assert.equal(r.source,'selected_roaster_defined_american_roast');
});
test('R51 no other coffee, mixed H1, wrong variant, incomplete or inconsistent guide may donate Light',()=>{
 const negatives=[
  page('Peru Cafe Canchaque – Natural, Vienna'),
  page('Honduras Comsa – Washed, Espresso'),
  page('Peru Cafe Canchaque – Natural, American','Vienna Roast - 1 lb'),
  page('Peru Cafe Canchaque – Natural, American','American - Ground'),
  page('Peru Cafe Canchaque – Natural, American','American Roast - 1 lb',glossary.replace('Our lightest roast','Our darkest roast')),
  page('Peru Cafe Canchaque – Natural, American','American Roast - 1 lb',glossary.replace('slightly darker than our American','similarly bright to our American')),
  page('Peru Cafe Canchaque – Natural, American','American Roast - 1 lb',glossary.replace('A medium/dark roast','A very light roast')),
  '<html><main><h1>Peru Cafe Canchaque – Natural, American</h1><h1>Other Coffee</h1><label class="variant__label">American Roast - 1 lb</label>'+glossary+'</main></html>',
  page('Peru Cafe Canchaque – Natural, American','American Roast - 1 lb','<product-recommendations>'+glossary+'</product-recommendations>'),
  '<html><head><meta name="description" content="American Roast - 1 lb"></head><main><h1>Peru Cafe Canchaque – Natural, American</h1>'+glossary+'</main></html>'
 ];
 for(const raw of negatives){
  const r=extractRoastVisualEvidence(raw);
  assert.notEqual(r.source,'selected_roaster_defined_american_roast',raw.slice(0,140));
 }
});
