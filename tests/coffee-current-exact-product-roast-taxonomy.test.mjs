import test from 'node:test';
import assert from 'node:assert/strict';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://roaster.example.org/products/organic-ki-saya-tenejapa-microlot';
const request=shopifyProductRequest(url);
const base={title:'Organic Ki-Saya - Tenejapa Microlot',handle:'organic-ki-saya-tenejapa-microlot',
 description:'<p>Our coffee comes from high-altitude farms in Chiapas.</p>',
 options:[{name:'Grind',values:['Whole Bean','Drip (Medium)','Espresso (Fine)']}]};
const endpoint=(data={})=>extractShopifyAjaxData({...base,...data},request);
const page=(body)=>extractPublicCoffeeFacts('<main><h1>'+base.title+'</h1>'+body+'</main>',{source_url:url});

test('a sole literal roast tier in the exact selected Shopify product tags supplies its roast',()=>{
 for(const tag of ['Medium','Light','Very Light','Ultra Light','Light Medium','Medium-Dark','Dark']){
  const result=endpoint({tags:[tag]});
  assert.equal(result.fields.roast_level,tag==='Light Medium'?'Medium-Light':tag);
  assert.ok(!result.conflicts?.includes('roast_level'));
 }
 const merged=mergePublicProductPreview(page('<p>Notes of chocolate and honey.</p>'),endpoint({tags:['Medium']}));
 assert.equal(merged.fields.roast_level,'Medium');
});

test('grind sizes, unsupported tags and other product data cannot claim a roast',()=>{
 for(const tags of [[],['Coffee'],['Medium Grind'],['Light+'],['Full City'],['Medium+'],['Light','Dark'],['dark','Medium','Medium Dark'],['Light','Coffee'],['Blend','Medium'],['Central America','Direct Trade','Honduras','Light','Organic']]){
  const result=endpoint({tags});
  assert.equal(result.fields.roast_level,undefined,JSON.stringify(tags));
 }
 assert.equal(endpoint({handle:'another-coffee',tags:['Medium']}),null,'Shopify endpoint handle guard');
 assert.equal(page('<div class="related-products"><h2>Other Coffee</h2><span>Medium</span></div>').fields.roast_level,undefined);
});

test('independent explicit roast evidence still vetoes a contradictory bare tag',()=>{
 const result=endpoint({description:'<p>Roast Level: Dark</p>',tags:['Medium']});
 assert.equal(result.fields.roast_level,undefined);
 assert.ok(result.conflicts?.includes('roast_level'));
});

test('collection tagging cannot erase a directly published current roast',()=>{
 const result=endpoint({description:'<p>This medium-light roasted coffee is directly traded with the growers.</p>',
  tags:['Central America','Direct Trade','Honduras','Light','Organic','Sustainable','Varietal']});
 assert.equal(result.fields.roast_level,'Medium-Light');
 assert.ok(!result.conflicts?.includes('roast_level'));
});
