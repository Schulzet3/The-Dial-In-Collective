import test from 'node:test';
import assert from 'node:assert/strict';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview,
 quarantineReusedShopifyProductCopy} from '../src/server/coffee-shopify-ajax.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://cortezcoffee.com/products/el-salvador-santa-ana-copy';
const request=shopifyProductRequest(url);
const title='ethiopia guji benti neka';
const oldStory='Sourced from smallholder farms in the Eastern Highlands and carefully processed at the Lahamenegu wet mill. Expect notes of dark chocolate, cane sugar, white grape and nectarine.';
const specs='<h3>Flavor Profile</h3><p>honey, lemon &amp; lime, pear, tea-like</p><h3>Origin Info</h3>'+
 '<ul><li>Origin: Wolisho, Ethiopia</li><li>Elevation: 1600m</li>'+
 '<li>Variety: Kurmue, Dago, Wolisho</li><li>Process: Washed</li></ul>'+
 '<p>Roast Level: Medium</p>';
const product=(description=specs,extras={})=>({handle:request.handle,title,
 description, vendor:'Cortez Coffee Roasters',...extras});
const endpoint=(description=specs,extras={})=>extractShopifyAjaxData(product(description,extras),request);
const page=(description)=>extractPublicCoffeeFacts('<main><h1>'+title+'</h1>'+description+'</main>',{source_url:url});

test('reused old-country slug follows current exact Product and quarantines the prior coffee story',()=>{
 const description='<p>'+oldStory+'</p>'+specs;
 const screened=quarantineReusedShopifyProductCopy(description,product(description));
 assert.equal(screened.quarantined,true);
 assert.doesNotMatch(screened.description,/Lahamenegu|Eastern Highlands|dark chocolate/);
 const current=endpoint(description);
 assert.equal(current.fields.name,title);
 assert.equal(current.fields.origin,'Wolisho, Ethiopia');
 assert.equal(current.fields.elevation_m,'1600');
 assert.equal(current.fields.process,'Washed');
 assert.equal(current.fields.roast_level,'Medium');
 assert.match(current.fields.tasting_notes||'',/honey/i);
 assert.ok(!JSON.stringify(current).includes('Lahamenegu'));
 const joined=mergePublicProductPreview(page(description),current);
 assert.equal(joined.fields.origin,'Wolisho, Ethiopia');
 assert.ok(!joined.conflicts?.includes('origin'));
 assert.ok(!JSON.stringify(joined.source_facts||[]).includes('Lahamenegu'));
 assert.ok(!Object.values(joined.fields).some(value=>/Lahamenegu|Eastern Highlands/i.test(String(value))));
});
test('independent contradictory direct current specifications remain withheld',()=>{
 const conflict=endpoint(specs+'<p>Origin: Kenya</p>');
 assert.equal(conflict.fields.origin,undefined);
 assert.ok(conflict.conflicts?.includes('origin'));
 const base=page(specs+'<p>Origin: Kenya</p>');
 const merged=mergePublicProductPreview(base,endpoint('<p>'+oldStory+'</p>'+specs));
 assert.ok(merged.conflicts?.includes('origin'),'direct HTML current conflict retained');
 assert.equal(merged.fields.origin,undefined);
});
test('current title and printed specs survive without any inferred URL-origin',()=>{
 const noLegacy=endpoint(specs);
 assert.equal(noLegacy.fields.name,title);
 assert.equal(noLegacy.fields.origin,'Wolisho, Ethiopia');
 assert.equal(noLegacy.legacy_copy_quarantined,undefined);
 const historical=extractShopifyAjaxData({handle:request.handle,title:'papua new guinea highlands',
  description:'<p>Origin: Eastern Highlands</p><p>Process: Washed</p>'},request);
 assert.equal(historical.fields.name,'papua new guinea highlands');
 assert.equal(historical.legacy_copy_quarantined,undefined);
});
test('genuinely current named coffee narrative and unlabelled brewing remain available',()=>{
 const description='<p>'+oldStory+'</p>'+specs+
  '<p>Ethiopia Guji Benti Neka is grown near Wolisho.</p>'+
  '<p>Espresso: 18g in, 36g out in 29 seconds.</p>';
 const screened=quarantineReusedShopifyProductCopy(description,product(description));
 assert.doesNotMatch(screened.description,/Lahamenegu/);
 assert.match(screened.description,/grown near Wolisho/);
 assert.match(screened.description,/Espresso: 18g/);
});
test('without a directly identified current country do not rewrite or discard source',()=>{
 for(const [handle,description] of [
  ['el-salvador-santa-ana-copy','<p>'+oldStory+'</p><p>Origin: Eastern Highlands</p>'],
  ['new-current-coffee','<p>'+oldStory+'</p>'+specs],
  ['ethiopia-guji-benti-neka','<p>'+oldStory+'</p>'+specs],
  ['el-salvador-santa-ana-copy','<p>'+oldStory+'</p><p>Origin: Ethiopia</p><p>Origin: Kenya</p>']
 ]){
  const checked=quarantineReusedShopifyProductCopy(description,{title,handle});
  assert.equal(checked.quarantined,false,handle+description.slice(0,40));
  assert.equal(checked.description,description);
 }
});
