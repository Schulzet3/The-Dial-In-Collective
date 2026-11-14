// User-approved Issue #33: exact selected product titles with typed country,
// cultivar and process segments must not persist the complete marketing title.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCoffeeNameFromCountryVarietyProcessTitle as shortName} from '../src/server/coffee-identity-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';

const title='COSTA RICA | Las Lajas - Finca San Isidro | Caturra & Catuai | Natural';
const name='Las Lajas - Finca San Isidro';
const baseUrl='https://proudmarycoffee.com/products/costa-rica-las-lajas-finca-san-isidro-caturra-catuai-natural-2026';
const qrUrl=baseUrl+'?utm_source=qr-code&utm_medium=coffee-bag';
const handle='costa-rica-las-lajas-finca-san-isidro-caturra-catuai-natural-2026';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const product={'@context':'https://schema.org','@type':'Product',name:title,url:baseUrl,
 brand:{'@type':'Brand',name:'Proud Mary Coffee USA'},
 additionalProperty:[{name:'Country',value:'Costa Rica'},{name:'Variety',value:'Caturra & Catuai'},{name:'Process',value:'Natural'}]};
const html='<html><head><meta property="og:url" content="'+baseUrl+'">'+
 '<script type="application/ld+json">'+JSON.stringify(product)+'</script></head><body>'+
 '<main><article class="product"><h1>'+escape(title)+'</h1>'+
 '<p>Country: Costa Rica</p><p>Variety: Caturra &amp; Catuai</p><p>Process: Natural</p>'+
 '</article></main></body></html>';

test('typed four-part title uses only the literal middle coffee name',()=>{
 assert.equal(shortName(title),name);
 assert.equal(shortName('COSTA RICA | Las Lajas - Finca La Julia | San Isidro | Black Honey'),'Las Lajas - Finca La Julia');
 assert.equal(shortName('ETHIOPIA | Konga Yirgacheffe | Heirloom | Natural'),'Konga Yirgacheffe');
});

test('unknown and ambiguous pipe titles are unchanged, not guessed',()=>{
 for(const full of [
  'COSTA RICA | Las Lajas - Finca San Isidro | Cocoa & Clove | Natural',
  'COSTA RICA | Las Lajas - Finca San Isidro | Caturra & Catuai | Experimental Method',
  'Our Collection | Las Lajas - Finca San Isidro | Caturra & Catuai | Natural',
  'Costa Rica | Special Limited Coffee | Caturra & Catuai',
  'LIMITED | COSTA RICA | Las Lajas - Finca San Isidro | Caturra & Catuai | Natural',
  'Las Lajas - Finca San Isidro',
  'Costa Rica | Natural | Caturra & Catuai | Natural Honey Cake'
 ])assert.equal(shortName(full),full,full);
 assert.equal(shortName(null),null);
 assert.equal(shortName('x'.repeat(201)),'x'.repeat(201));
});

test('the exact selected Product HTML parses the short name and retains original source title',()=>{
 const result=extractPublicCoffeeFacts(html,{source_url:baseUrl});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,name);
 assert.equal(result.fields.origin,'Costa Rica');
 assert.equal(result.fields.variety,'Caturra & Catuai');
 assert.equal(result.fields.process,'Natural');
 assert.ok(result.source_facts?.some(f=>f.field==='name'&&f.value===title));
 assert.ok(result.available?.includes('name'));
});

test('exact-handle public Shopify JSON still passes selection and merges without reverting name',()=>{
 const request=shopifyProductRequest(qrUrl);
 assert.ok(request);
 assert.equal(request.handle,handle);
 const data={handle,title,description:'<p>Country: Costa Rica</p><p>Variety: Caturra &amp; Catuai</p><p>Process: Natural</p>',
  vendor:'Proud Mary Coffee USA',tags:[]};
 const endpoint=extractShopifyAjaxData(data,request);
 assert.equal(endpoint?.ok,true,JSON.stringify(endpoint));
 assert.equal(endpoint.fields.name,name);
 const page=extractPublicCoffeeFacts(html,{source_url:baseUrl});
 const merged=mergePublicProductPreview(page,endpoint);
 assert.equal(merged.fields.name,name);
 assert.equal(extractShopifyAjaxData({...data,handle:'some-other-coffee'},request),null);
});
