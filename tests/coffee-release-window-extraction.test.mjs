import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';

const source_url='https://roaster.example.com/products/current-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function parse(body='',properties=[]){
 const product={'@type':'Product',name:'Current Coffee',url:source_url,brand:'Example Coffee',
  additionalProperty:properties.map(([name,value])=>({name,value}))};
 return extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+
  '<main><h1>Current Coffee</h1>'+body+'</main>',{source_url});
}

test('yearless harvest windows remain supplementary and do not become release identity',()=>{
 for(const value of ['January','July–September','Jan.–Mar.','April and May','Summer through Autumn','November / February']){
  const result=parse('<p>Harvest: '+escape(value)+'</p>');
  assert.equal(result.fields.release_label,undefined,value);
  assert.equal(result.roaster_details.harvest_season,value,value);
  assert.ok(result.source_facts.some(fact=>fact.value.includes(value)),value);
  assert.ok(!result.conflicts?.includes('release_label'),value);
 }
});

test('structured harvest windows are retained separately from dated and distinctive releases',()=>{
 const result=parse('<p>Harvest: January</p>',[['Harvest','January'],['Harvest Year','2026']]);
 assert.equal(result.fields.release_label,'2026');
 assert.equal(result.roaster_details.harvest_season,'January');
 assert.ok(!result.conflicts?.includes('release_label'));
 for(const value of ['July–September 2026','2025/2026','Summer 2026','Solstice Edition','Holy Grail No. 2','Lot #42']){
  const dated=parse('',[['Release',value]]);
  assert.equal(dated.fields.release_label,value,value);
 }
});

test('calendar windows cannot erase true year conflicts or concatenate contradictory periods',()=>{
 const yearConflict=parse('<p>Harvest: 2025</p><p>Harvest: 2026</p><p>Harvest: January</p>');
 assert.equal(yearConflict.fields.release_label,undefined);
 assert.ok(yearConflict.conflicts?.includes('release_label'));
 assert.equal(yearConflict.roaster_details.harvest_season,'January');
 assert.ok(yearConflict.source_facts.some(fact=>fact.value.includes('January')));
 const windows=parse('<p>Harvest: January</p><p>Harvest: June</p>');
 assert.equal(windows.fields.release_label,undefined);
 assert.equal(windows.roaster_details?.harvest_season,undefined);
 assert.ok(windows.source_facts.some(fact=>fact.field==='harvest_season'&&fact.conflicting));
 assert.ok(windows.source_facts.some(fact=>fact.value.includes('January')));
 assert.ok(windows.source_facts.some(fact=>fact.value.includes('June')));
});

test('exact-product endpoint merge preserves a dated release and the source harvest window',()=>{
 const html=parse('<p>Harvest: January</p>');
 const data={id:1,handle:'current-coffee',title:'Current Coffee',vendor:'Example Coffee',
  description:'<p>Harvest: January</p><p>Release: 2026</p>'};
 const endpoint=extractShopifyAjaxData(data,shopifyProductRequest(source_url));
 assert.equal(endpoint.fields.release_label,'2026');
 assert.equal(endpoint.roaster_details.harvest_season,'January');
 const merged=mergePublicProductPreview(html,endpoint);
 assert.equal(merged.fields.release_label,'2026');
 assert.equal(merged.roaster_details.harvest_season,'January');
 assert.ok(!merged.conflicts?.includes('release_label'));
});

test('separated label punctuation cannot turn a recurring harvest window into a release',()=>{
 const result=parse('<p><strong>Harvest</strong>: November – April<br><strong>Process</strong>: Washed</p>',[['Harvest',': November – April']]);
 assert.equal(result.fields.release_label,undefined);
 assert.ok(result.source_facts.some(fact=>fact.field==='harvest_season'&&fact.value.includes('November – April')));
 assert.ok(!result.source_facts.some(fact=>fact.field==='release_label'&&fact.value.includes('November – April')));
});

test('explicit current-coffee harvest timing prose is retained without inventing a release year',()=>{
 const result=parse('<p>Composed of traditional Ethiopian heirloom varieties, the coffee was harvested between October and January, when ripe cherries were hand-selected at peak maturity.</p>');
 assert.equal(result.fields.release_label,undefined);
 assert.equal(result.roaster_details.harvest_season,'October and January');
 assert.ok(result.source_facts.some(fact=>fact.value.includes('harvested between October and January')));
 for(const sentence of [
  'Another coffee was harvested between October and January.',
  'Last year the coffee was harvested between October and January.',
  'The coffee was not harvested between October and January.',
  'Generally, the coffee is harvested between October and January.',
  'The coffee was harvested between uncertain dates.',
 ]){
  const ignored=parse('<p>'+sentence+'</p>');
  assert.equal(ignored.fields.release_label,undefined,sentence);
  assert.equal(ignored.roaster_details?.harvest_season,undefined,sentence);
 }
 const conflicting=parse('<p>This coffee was harvested between October and January.</p><p>This coffee was harvested between June and July.</p>');
 assert.equal(conflicting.roaster_details?.harvest_season,undefined);
});

test('generic lot types stay source-only while dated, named and numbered release identifiers survive',()=>{
 for(const value of ['Microlot','Nano lot','Communal lot','Regional lot','Single-origin lot','Blend lot','Batch']){
  const result=parse('<p>Harvest: November–April</p><p>Lot: '+escape(value)+'</p>');
  assert.equal(result.fields.release_label,undefined,value);
  assert.equal(result.roaster_details.harvest_season,'November–April',value);
  assert.ok(result.source_facts.some(fact=>fact.field==='lot_type'&&fact.value===value),value);
 }
 for(const value of ['Microlot 7','Lot #42','Lot A','San Lorenzo X','Summer Solstice Edition']){
  const result=parse('<p>Harvest: November–April</p><p>Lot: '+escape(value)+'</p>');
  assert.equal(result.fields.release_label,value,value);
  assert.equal(result.roaster_details.harvest_season,'November–April',value);
 }
 assert.equal(parse('<p>Harvest: 2026</p><p>Lot: Microlot</p>').fields.release_label,'2026');
});
