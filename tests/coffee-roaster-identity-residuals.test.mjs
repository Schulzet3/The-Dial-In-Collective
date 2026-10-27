import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
const url='https://roaster.example.org/products/current-coffee';
function page(brand,site,organizations=[]){
 const data=[{'@type':'Product',name:'Current Coffee',url,brand},...organizations];
 return '<head><meta property="og:site_name" content="'+site.replaceAll('&','&amp;').replaceAll('"','&quot;')+'">'+
  '<script type="application/ld+json">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script></head><main><h1>Current Coffee</h1></main>';
}
const read=(brand,site,orgs=[])=>extractPublicCoffeeFacts(page(brand,site,orgs),{source_url:url});
test('a compatible published site identity supplies its full business suffix and spacing',()=>{
 for(const [brand,site] of [['Gnosis','Gnosis Coffee'],['Cumbre Coffee','Cumbre Coffee Roasters'],
  ['Favor Coffee Roasters','Favor Coffee Company'],['earthbackcoffee','Earthback Coffee'],
  ['VTArtisanCoffee','VT Artisan Coffee & Tea Co.'],['1951 Coffee','1951 Coffee Company'],
  ['Cherry River Roasting Company','Cherry River Coffee Roasters'],["Hello Larson's Coffee Roastery",'Hello Larsons Coffee Roastery']]){
  assert.equal(read(brand,site).fields.roaster,site);
 }
});
test('same-site organization evidence corroborates an uppercase acronym or singular vendor spelling',()=>{
 for(const [brand,site] of [['MCT Coffee','Montana Coffee Traders'],['Thrive Farmer','Thrive Farmers']]){
  assert.equal(read(brand,site,[{'@type':'Organization',name:site,url:'https://roaster.example.org'}]).fields.roaster,site);
  assert.equal(read(brand,site,[{'@type':'Organization',name:site,url:'https://different.example.org'}]).fields.roaster,brand);
  assert.equal(read(brand,site).fields.roaster,brand);
 }
});
test('a literal structured identity removes SEO decoration only with a corroborating same-site URL',()=>{
 const decorated='Creative Coffees Roastery | Winchester KY',name='Creative Coffees Roastery';
 assert.equal(read('',decorated,[{'@type':'Organization',name,url:'https://roaster.example.org/'}]).fields.roaster,name);
 assert.equal(read('',decorated,[{'@type':'Organization',name,url:'https://different.example.org/'}]).fields.roaster,decorated);
});
test('a compatible organization may expand an existing site name but cannot supply an unrelated roaster',()=>{
 assert.equal(read('','Stage Line Coffee',[{'@type':'Organization',name:'Stage Line Coffee Roasters'}]).fields.roaster,'Stage Line Coffee Roasters');
 assert.equal(read('Guest Coffee Roasters','Marketplace Coffee',[{'@type':'Organization',name:'Marketplace Coffee Company',url:'https://roaster.example.org'}]).fields.roaster,'Guest Coffee Roasters');
 assert.equal(read('Blue Coffee','Blueberry Coffee Roasters').fields.roaster,'Blue Coffee');
 assert.equal(read('Simpatico Coffee','Simpatico Low Acid Coffee').fields.roaster,'Simpatico Coffee');
});
test('exact endpoint merge enriches only a compatible terminal business suffix and keeps site spelling',()=>{
 const base=read('','Manuscript Coffee');
 const extra=read('Manuscript Coffee Roasters','');
 assert.equal(mergePublicProductPreview(base,extra).fields.roaster,'Manuscript Coffee Roasters');
 assert.equal(mergePublicProductPreview(read('','ContempoRoast Coffee & Roastery'),read('ContempoRoast','')).fields.roaster,'ContempoRoast Coffee & Roastery');
 assert.equal(mergePublicProductPreview(read('','Favor Coffee Company'),read('Favor Coffee Roasters','')).fields.roaster,'Favor Coffee Company');
});
test('the selected product seller may expand the same site brand using its exact published sameAs URL',()=>{
 const product={'@type':'Product',name:'Current Coffee',url,offers:{'@type':'Offer',seller:{'@type':'Organization',name:'Stage Line Coffee Roasters',sameAs:'https://roaster.example.org'}}};
 const html='<meta property="og:site_name" content="Stage Line Coffee"><script type="application/ld+json">'+JSON.stringify(product)+'</script>';
 assert.equal(extractPublicCoffeeFacts(html,{source_url:url}).fields.roaster,'Stage Line Coffee Roasters');
 product.offers.seller.sameAs='https://different.example.org';
 const other='<meta property="og:site_name" content="Stage Line Coffee"><script type="application/ld+json">'+JSON.stringify(product)+'</script>';
 assert.equal(extractPublicCoffeeFacts(other,{source_url:url}).fields.roaster,'Stage Line Coffee');
});
test('a selected Product without its own URL can bind its seller through the exact current Offer URL',()=>{
 const product={'@type':'Product',name:'Current Coffee',offers:{'@type':'Offer',url,seller:{'@type':'Organization',name:'Stage Line Coffee Roasters',sameAs:'https://roaster.example.org'}}};
 const readOffer=()=>extractPublicCoffeeFacts('<meta property="og:site_name" content="Stage Line Coffee"><script type="application/ld+json">'+JSON.stringify(product)+'</script>',{source_url:url});
 assert.equal(readOffer().fields.roaster,'Stage Line Coffee Roasters');
 product.offers.url='https://roaster.example.org/products/different-coffee';
 assert.equal(readOffer().fields.roaster,'Stage Line Coffee');
 product.url='https://roaster.example.org/products/different-coffee';product.offers.url=url;
 assert.equal(readOffer().ok,false);
});
