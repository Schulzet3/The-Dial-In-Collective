import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Costa Rica Las Lajas',url='https://www.rallycoffee.co/products/costa-rica-las-lajas';
const page=(body,other='',title='Old SEO coffee')=>'<html><head><title>'+title+'</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+body+'</div></article></main>'+other+'</body></html>';
const selected='Las Lajas is produced by Oscar and Francisca Chacón, third-generation coffee producers in Costa Rica. Perla Negra is a natural-process coffee made from carefully selected ripe cherries. The coffee is dried slowly on raised beds.';
const row={number:541,archived_coffee:name,status:'FETCHED',parser_ok:true,selected_h1:[name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
test('original #541 requires exact current identity, rendered Add Coffee and Source Review',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([541],[row]),[]);
 for(const v of [[],[row,row],[{...row,status:'UNAVAILABLE'}],[{...row,parser_ok:false}],[{...row,selected_heading_identity_verified:false}],[{...row,add_coffee_ui_rendered:false}],[{...row,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([541],v).length);
});
test('exact selected Las Lajas prose is not replaced by stale title or sibling coffee',()=>{
 const html=page(selected,'<aside class="related-products"><h2>Colombia Seasonal</h2>Honey process. Strawberry, papaya, chocolate. Dark roast. Swiss Water.</aside>');
 assert.deepEqual(selectedProductHeadings(productMarkup(html)),[name]);
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,name);
 assert.doesNotMatch(String(p.fields.origin||''),/colombia/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/strawberry|papaya/i);
 assert.ok(!p.fields.decaffeination_method);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('unrelated selected heading is not certified merely because original #541 URL matches',()=>{
 const html=page(selected).replace('<h1>'+name+'</h1>','<h1>Colombia Seasonal</h1>');
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true);
 assert.notEqual(p.fields.name,name);
 assert.notDeepEqual(selectedProductHeadings(productMarkup(html)),[name]);
});
test('missing selected source cannot be rescued by menu-only producer and process',()=>{
 const html=page('No selected processing, farm or origin available.','<aside class="related-products">Oscar and Francisca Chacón. Natural-process Perla Negra from Costa Rica, berry and vanilla.</aside>');
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/berry|vanilla/i);
});

test('SEO-only same-product tasting suggestion is explicitly labelled as unconfirmed metadata, never silently certified',()=>{
 const html=page(selected);
 const p=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(p.ok,true);
 const fallback={...p,fields:{...p.fields,tasting_notes:'cooked cranberry, orange, hibiscus'},seo_fallback_fields:['tasting_notes']};
 assert.match(coffeeUrlPreviewMarkup(fallback),/metadata-only suggestions:/);
 assert.match(coffeeUrlPreviewMarkup(fallback),/not confirmed product facts/i);
 assert.doesNotMatch(coffeeUrlPreviewMarkup({...fallback,seo_fallback_fields:[]}),/metadata-only suggestions:/);
});
