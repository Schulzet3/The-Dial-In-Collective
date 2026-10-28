import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const blackWhite='https://www.blackwhiteroasters.com/products/r-diego-horta-anaerobic-natural';
const selected='Diego Horta - Anaerobic Natural';
const label='Product label for Diego Horta - Anaerobic Natural with flavor description, high funk, and lighter roast, on a solid color background.';
const page=body=>extractPublicCoffeeFacts('<main><h1>'+selected+'</h1>'+body+'</main>',{source_url:blackWhite});

test('exact selected photographed label relative roast is reviewable without inventing a canonical tier',()=>{
 const r=page('<img alt="'+label+'"><p>Origin | Santa Maria, Huila, Colombia</p><p>Process | Anaerobic Natural</p>');
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roast_hint||'',/Lighter.*choose.*manually/i);
 assert.equal(r.fields.process,'Anaerobic');
});
test('selected Sebastian Red Fruits Decaf long image alt preserves Lighter as a manual hint',()=>{
 const name='Sebastian Ramirez - Red Fruits Decaf';
 const alt='Product label for Sebastian Ramirez - Red Fruits Decaf with flavor description, mild funk, and lighter roast, on a color gradient background.';
 const r=extractPublicCoffeeFacts('<main><h1>'+name+'</h1><img alt="'+alt+'"><p>Process | Co-ferment</p></main>',{source_url:'https://www.blackwhiteroasters.com/products/r-sebastian-ramirez-red-fruits-decaf'});
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roast_hint||'',/Lighter.*manually/i);
});
test('other coffee image captions, unrelated guides and multiple H1 titles cannot create selected roast hints',()=>{
 for(const html of [
  '<img alt="Product label for Another Coffee with high funk and lighter roast, on a background.">',
  '<img alt="General education for a lighter roast profile with lower bitterness">',
  '<h1>Another Coffee</h1><img alt="'+label+'">'
 ]){
  const r=page(html);
  // Two competing H1s can legitimately reject the entire product preview.
  // Neither a rejected preview nor a valid one may receive this false hint.
  if(r.ok)assert.equal(r.fields.roast_level,undefined);
  else assert.equal(r.ok,false);
  assert.doesNotMatch(r.roast_hint||'',/Roaster describes.*Lighter/i);
 }
});
test('explicit selected supported tier remains authoritative over relative selected image text',()=>{
 const r=page('<img alt="'+label+'"><p>Roast: Medium</p>');
 assert.equal(r.fields.roast_level,'Medium');
 assert.ok(!r.conflicts?.includes('roast_level'));
});
test('Beanstock historical same-country slug and stale SEO cannot fill a noncurrent product process',()=>{
 const url='https://beanstockcoffee.com/products/colombian-supremo-organic';
 const title='New!! Colombia Organic Tolima Suave';
 const description='<p>Sweet and well-balanced with notes of caramel, milk chocolate and Honey Crisp Apple.</p>'+
  '<p>Cafe Tolima Suave is an association that represents 154 coffee producers in Planadas, Tolima.</p><p>Medium Roast</p>';
 const html='<html><head><meta property="og:title" content="Colombia FUDAM La Union">'+
  '<meta name="description" content="Historic FUDAM Washed coffee"></head><body><main><h1>'+title+'</h1>'+description+'</main></body></html>';
 const request=shopifyProductRequest(url);
 const base=extractPublicCoffeeFacts(html,{source_url:url});
 const ajax=extractShopifyAjaxData({handle:request.handle,title,vendor:'Beanstock Coffee',description,tags:['Medium Roast']},request);
 const merged=mergePublicProductPreview(base,ajax);
 assert.equal(merged.fields.name,title);
 assert.equal(merged.fields.roast_level,'Medium');
 assert.equal(merged.fields.process,undefined);
 assert.ok(!JSON.stringify(merged.fields).includes('FUDAM'));
 assert.ok(!JSON.stringify(merged.fields).includes('Washed'));
});

test('the real Add Coffee preview visibly shows the relative selected-image roast hint but never auto-fills a tier',()=>{
 const r=page('<img alt="'+label+'"><p>Origin | Santa Maria, Huila, Colombia</p>');
 const markup=coffeeUrlPreviewMarkup(r,{applied:true});
 assert.equal(r.fields.roast_level,undefined);
 assert.match(markup,/Roaster describes the coffee as lighter/i);
 assert.match(markup,/Choose the closest supported level manually/i);
 assert.doesNotMatch(markup,/<dt>Roast Level<\/dt><dd>(?:Light|Very Light|Ultra Light)<\/dd>/i);
});

test('FUDAM currently selected page excludes stale Tolima metadata and never invents processing',()=>{
 const url='https://beanstockcoffee.com/products/colombian-supremo-organic';
 const current='New!! Colombia Fair Trade Organic FUDAM LA Union';
 const html='<html><head><meta property="og:title" content="New!! Colombia Organic Tolima Suave">'+
  '<meta name="description" content="Historic Tolima Washed and Honey Crisp Apple"></head><body><main>'+
  '<h1>'+current+'</h1><p>Origin: Colombia</p><p>Roast Level: Medium</p>'+
  '<p>Producer: FUDAM</p><p>Tasting Notes: carmelized sugar and dark chocolate</p></main></body></html>';
 const parsed=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(parsed.fields.name,current);
 assert.equal(parsed.fields.roast_level,'Medium');
 assert.equal(parsed.fields.process,undefined);
 assert.doesNotMatch(JSON.stringify(parsed.fields),/Tolima|Washed|Honey Crisp/i);
 assert.match(coffeeUrlPreviewMarkup(parsed,{applied:true}),/FUDAM/);
});
