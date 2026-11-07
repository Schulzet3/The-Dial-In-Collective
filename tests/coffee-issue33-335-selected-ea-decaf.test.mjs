import test from 'node:test';
import assert from 'node:assert/strict';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

// Synthetic trimmed selected-product fixture; current real official HTML
// independently verified 2026-11-07 in Issue #33 R18 artifact 13592314014.
const url='https://smallplanescoffee.com/products/frontera-decaf';
const chosen='Decaf Desvelado';
const ea='Fully Washed, E.A. Processed Decaf';
function page({name=chosen,processing=ea,inside='',extra='',seo=''}={}){
 return '<html><head><meta property="og:type" content="product">'+seo+'</head><body>'+
 '<main><article class="product"><div class="product__info-container">'+
 '<h1>'+name+'</h1><div class="product__description rte">'+
 '<p><strong>Country:</strong> Colombia</p><p><strong>Region:</strong> Huila</p>'+
 '<p><strong>Municipality:</strong> Acevedo</p>'+
 '<p><strong>Processing:</strong> '+processing+'</p>'+
 '<p><strong>Tasting Notes:</strong> Caramel, Chocolate, Nutty</p>'+
 inside+'</div></div></article></main>'+extra+'</body></html>';
}
const parse=options=>extractPublicCoffeeFacts(page(options),{source_url:url});

test('selected E.A. Processed Decaf names Sugar Process independent of green Washed',()=>{
 for(const value of ['E.A. Processed Decaf','E.A. Processed','EA Processed Decaf','Fully Washed, E.A. Processed Decaf'])
  assert.equal(inferDecaffeinationMethod({name:chosen,selectedMethod:value}),'Sugar Process',value);
 for(const value of ['Fully Washed','Water washed','E.A. processing equipment','Not E.A. Processed Decaf'])
  assert.equal(inferDecaffeinationMethod({name:chosen,selectedMethod:value}),'',value);
});

test('exact selected #335 source Processing caption supports distinct method and Source Review',()=>{
 const r=parse(); assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,chosen);
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.decaffeination_method,'Sugar Process',JSON.stringify(r));
 assert.equal(r.fields.origin,'Acevedo, Huila, Colombia');
 assert.ok((r.source_facts||[]).some(f=>f.field==='decaffeination_method'&&
  /E\.?A\.? Processed Decaf/i.test(f.value)),JSON.stringify(r.source_facts));
 assert.match(coffeeUrlPreviewMarkup(r),/Sugar Process/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});

test('SEO, related product, different coffee, half caf and no selected decaf method cannot grant method',()=>{
 for(const options of [
  {processing:'Fully Washed'},
  {processing:'Fully Washed',seo:'<meta name="description" content="E.A. Processed Decaf">'},
  {processing:'Fully Washed',extra:'<aside class="product-recommendations"><h2>Other Decaf</h2><p>Processing: E.A. Processed Decaf</p></aside>'},
  {name:'Regular Colombia',processing:ea},
  {name:'Half-Caf Blend',processing:ea}
 ]){const r=parse(options);assert.equal(r.fields?.decaffeination_method,undefined,JSON.stringify(options)+' '+JSON.stringify(r.fields));}
});

test('opposing selected Swiss Water Process and E.A. Processed Decaf leave method blank',()=>{
 const r=parse({inside:'<p><strong>Decaffeination:</strong> Swiss Water Process</p>'});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r));
});

test('missing exact selected product H1 cannot grant E.A. method',()=>{
 const h=page().replace('<h1>'+chosen+'</h1>','');
 const r=extractPublicCoffeeFacts(h,{source_url:url});
 assert.equal(r.fields?.decaffeination_method,undefined,JSON.stringify(r.fields));
});
