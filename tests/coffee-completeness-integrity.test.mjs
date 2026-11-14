import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
const source_url='https://roaster.example/products/coffee';
const parse=body=>extractPublicCoffeeFacts('<main><h1>Current Coffee</h1>'+body+'</main>',{source_url});
test('equivalent cultivar lists preserve source spelling across metadata and public endpoints',()=>{
 const first={ok:true,fields:{name:'Current Coffee',variety:'SL28 & SL34, Catuaí'}};
 const second={ok:true,fields:{name:'Current Coffee',variety:'Catuai / SL 34 / SL 28'}};
 const merged=mergePublicProductPreview(first,second);
 assert.equal(merged.fields.variety,first.fields.variety);assert.equal(merged.conflicts,undefined);
 const data={'@type':'Product',name:'Current Coffee',url:source_url,additionalProperty:[{name:'Variety',value:first.fields.variety}]};
 const r=parse('<script type="application/ld+json">'+JSON.stringify(data)+'</script><p>Varietal: '+second.fields.variety+'</p>');
 assert.equal(r.fields.variety,first.fields.variety);assert.equal(r.conflicts,undefined);
});
test('distinct explicit cultivars stay conflicted after suffix and endpoint fallback',()=>{
 const r=parse('<p>Variety: Caturra</p><h4>Bourbon Ají variety</h4>');
 assert.equal(r.fields.variety,undefined);assert.ok(r.conflicts.includes('variety'));
 const merged=mergePublicProductPreview(r,{ok:true,fields:{name:'Current Coffee',variety:'Caturra'}});
 assert.equal(merged.fields.variety,undefined);assert.ok(merged.conflicts.includes('variety'));
});
test('farm and explicitly named grower remain separate source facts',()=>{
 const r=parse('<p>This bourbon ají lot from producer Arbey Cordoba and his farm El Diviso is really good.</p>');
 assert.equal(r.roaster_details?.named_producer,'Arbey Cordoba');
 assert.equal(r.roaster_details?.farm,'El Diviso');
 const rich=parse('<p><strong>Grower:</strong><br>Alicia Torres<br><strong>Country:</strong><br>Kenya</p>');
 assert.notEqual(rich.roaster_details?.named_producer,'Alicia Torres Country');
});
test('catalog fallback disclosure never claims that saved fields were just fetched from a webpage',()=>{
 const html=coffeeUrlPreviewMarkup({ok:true,source:'approved_catalog',fields:{name:'Coffee'},refresh_reason:'source_unavailable'});
 assert.match(html,/Autofill Results/);assert.match(html,/current roaster page could not be rechecked/);
 assert.doesNotMatch(html,/Unverified Page|Official Source Preview|Approved Catalog|Suggested Details From Webpage/);
});
test('explicit recommendation components cannot donate facts even without a heading',()=>{
 const r=parse('<p>Origin: Ethiopia</p><product-recommendations><p>Variety: Pacamara</p></product-recommendations><section><h2>About this coffee</h2><p>Producer: Rosa Martinez</p></section>');
 assert.equal(r.fields.origin,'Ethiopia');assert.equal(r.fields.variety,undefined);assert.equal(r.fields.producer,'Rosa Martinez');
});
test('flat recommendation sections stop at a sibling current-product story and remain idempotent',()=>{
 const body='<main><h1>Current Coffee</h1><h2>Related products</h2><article><h3>Other Coffee</h3><p>Variety: Pacamara</p></article><h2>About this coffee</h2><p>Variety: Bourbon Ají</p></main>';
 const scoped=productMarkup(body);assert.equal(productMarkup(scoped),scoped);
 assert.doesNotMatch(scoped,/Pacamara/);assert.match(scoped,/Bourbon Ají/);
});
test('animated heading reconstruction cannot drop ordinary identity text',()=>{
 const result=extractPublicCoffeeFacts('<main><h1><div class="word">Decaf <span>G</span><span>e</span><span>s</span><span>h</span><span>a</span></div></h1></main>',{source_url});
 assert.match(result.fields.name,/^Decaf\b/);assert.notEqual(result.fields.name,'Gesha');
});
test('conflicting countries cannot fabricate a region-country combination',()=>{
 const result=parse('<p>Country: Kenya</p><p>Country: Colombia</p><p>Region: Huila</p>');
 assert.equal(result.fields.origin,undefined);assert.ok(result.conflicts.includes('origin'));
 const reverse=parse('<p>Region: Nyeri</p><p>Country: Kenya</p>');
 assert.equal(reverse.fields.origin,'Nyeri, Kenya');
});
test('product seller can supply an explicit same-site roastery but not an unrelated marketplace',()=>{
 const product={'@type':'Product',name:'Current Coffee',url:source_url,offers:[{seller:{name:'Mountain Coffee Roasters',url:'https://roaster.example'}}]};
 const withProduct=()=>parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script>');
 assert.equal(withProduct().fields.roaster,'Mountain Coffee Roasters');
 product.offers[0].seller.url='https://different.example';assert.equal(withProduct().fields.roaster,undefined);
 product.offers[0].seller={name:'Example Marketplace',url:'https://roaster.example'};assert.equal(withProduct().fields.roaster,undefined);
});
