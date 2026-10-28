import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedPageCoffeeEvidence,selectedStructuredCoffeeEvidence} from '../src/server/coffee-selected-source-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';

const value=(rows,key)=>rows.find(row=>row.field===key)?.value;
const pageFacts=(html,name,seoTitle='',seoDescription='',seoPublisher='')=>
 selectedPageCoffeeEvidence({html,name,seoTitle,seoDescription,seoPublisher});
function productPage({name,title=name,url,site,description='',body=''}) {
 const esc=text=>text.replaceAll('&','&amp;').replaceAll('"','&quot;');
 return '<html><head><title>'+title+'</title>'+
  '<meta property="og:type" content="product"><meta property="og:title" content="'+esc(name)+'">'+
  '<meta property="og:url" content="'+url+'"><meta property="og:site_name" content="'+site+'">'+
  '<meta property="og:description" content="'+esc(description)+'">'+
  '<link rel="canonical" href="'+url+'"></head><body><main>'+body+'</main></body></html>';
}
const badge=(name,label,n)=>
 '<div class="title-row"><h1 class="product-title">'+name+'</h1></div>'+
 '<div class="methodical-custom-labels"><div class="methodical-custom-label-'+n+'">'+label+'</div></div>';

test('only exact selected Methodical H1 adjacent release badges create release labels',()=>{
 for(const [name,label,n,slug] of [
  ['Ethiopia, Layo Teraga','Limited Release','1','ethiopia-layo-teraga'],
  ['Colombia, Andrés Cardona','Single Origin Staple','3','colombia-andres-cardona']
 ]) {
  const html=badge(name,label,n),url='https://methodicalcoffee.com/products/'+slug;
  assert.equal(value(pageFacts(html,name),'release_label'),label);
  assert.equal(value(pageFacts(html,'Unrelated coffee'),'release_label'),undefined);
  const original=extractPublicCoffeeFacts(productPage({name,url,site:'Methodical Coffee',body:html+'<p>Process: Washed</p>'}),{source_url:url});
  assert.equal(original.fields.release_label,label);
 }
 for(const html of [
  '<div class="methodical-custom-labels"><div class="methodical-custom-label-1">Limited Release</div></div>',
  badge('Another Coffee','Limited Release','1'),
  '<h1 class="product-title">Ethiopia, Layo Teraga</h1><div class="related-products">Limited Release</div>',
  badge('Ethiopia, Layo Teraga','Seasonal','1')
 ])assert.equal(value(pageFacts(html,'Ethiopia, Layo Teraga'),'release_label'),undefined);
});

test('exact product SEO and corroborated selected roast words recover Light without color inference',()=>{
 const rows=[
  ['Colombia Camacho Rosado Extralight','For our ultralight lovers - this version shows sorghum sweetness and tulip tones.'],
  ['Colombia Camacho Fragancia','This Washed Fragancia is a very light, soft and elegant cup. This is a stellar megalight roast. Roast Color: 149.3 (higher is lighter).']
 ];
 for(const [name,desc] of rows){
  const title=name+' | S&W Craft Roasting',url='https://swroasting.coffee/coffee/selected';
  assert.equal(value(pageFacts('',name,title,desc,'S&W Craft Roasting'),'roast_level'),'Light');
  const found=extractPublicCoffeeFacts(productPage({name,title,url,site:'S&W Craft Roasting',description:desc,body:'<h1>'+name+'</h1><p>Origin: Colombia</p>'}),{source_url:url});
  assert.equal(found.fields.roast_level,'Light');
  assert.equal(found.conflicts?.includes('roast_level'),undefined);
 }
 const selected='Colombia Camacho Fragancia',title=selected+' | S&W Craft Roasting';
 for(const [n,t,d,p] of [
  ['Other Coffee',title,'This Washed Fragancia is a very light cup. This is a stellar megalight roast.','S&W Craft Roasting'],
  [selected,'Other Coffee | S&W Craft Roasting','This Washed Fragancia is a very light cup. This is a stellar megalight roast.','S&W Craft Roasting'],
  [selected,title,'Roast Color: 149.3 (higher is lighter).','S&W Craft Roasting'],
  [selected,title,'Our other coffee is a stellar megalight roast.','S&W Craft Roasting'],
  [selected,title,'This Washed Fragancia is a very light cup. This is a stellar megalight roast.','Other Roaster']
 ])assert.equal(value(pageFacts('',n,t,d,p),'roast_level'),undefined);
});

test('current selected COMSA producer identity requires exact title and agricultural context',()=>{
 const title='Honduras Comsa – Washed, Espresso';
 const description='<p>The Comsa Cooperative, founded in 2001, grants liberty in individual farmers to experiment with their own organic practices, milling, and drying areas.</p>';
 assert.equal(value(selectedStructuredCoffeeEvidence({title,description}),'producer'),'Comsa Cooperative');
 const request=shopifyProductRequest('https://www.thecoffeeexchange.com/products/honduras-comsa-espresso-roast');
 const found=extractShopifyAjaxData({handle:'honduras-comsa-espresso-roast',title,description},request);
 assert.equal(found.fields.producer,'Comsa Cooperative');
 assert.equal(value(selectedStructuredCoffeeEvidence({title:'Honduras Other Lot',description}),'producer'),undefined);
 assert.equal(value(selectedStructuredCoffeeEvidence({title,description:'Another group founded in 2001 supplies farmers.'}),'producer'),undefined);
 assert.equal(extractShopifyAjaxData({handle:'other-lot',title,description},request),null);
});

test('exact Red Room page extracts three actual notes, never the cinematic metaphor or unrelated product',()=>{
 const name='Red Room (Blend)',site='Black Coffee Roasting Company';
 const title=name+' - '+site,url='https://www.blackcoffeeroastingco.com/product/red-room-blend/';
 const desc='Silky smooth with a layered depth. Clove, tamarind, starfruit, and a touch of noir cinema. Roast Level: Dark';
 assert.equal(value(pageFacts('',name,title,desc,site),'tasting_notes'),'Clove, tamarind, starfruit');
 const found=extractPublicCoffeeFacts(productPage({name,title,url,site,description:desc,
  body:'<h1>Red Room (Blend)</h1><p>Roast Level: Dark</p>'}),{source_url:url});
 assert.equal(found.fields.tasting_notes,'Clove, tamarind, starfruit');
 for(const [n,t,d,p] of [
  ['Different Blend',title,desc,site],
  [name,'Different Blend - '+site,desc,site],
  [name,title,'Notes from our other coffee: clove, tamarind, starfruit',site],
  [name,title,desc,'Unknown Roaster']
 ])assert.equal(value(pageFacts('',n,t,d,p),'tasting_notes'),undefined);
});
