import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const vienna={
 name:'Vienna Roast',url:'https://shop.inkcoffee.com/products/vienna',
 description:[
  'This popular favorite is roasted a tad bit darker than our High Altitude roasts, but not as dark and bittersweet as our French Roast coffee lending to a round caramelly, sweetness.',
  'Characteristics - Hints of dark roast, and caramel sweetness',
  'Origin - Americas','Roast - Dark','Body - Full','Acidity - Low'
 ]};
const colombia={
 name:'Colombia- Honey Process',url:'https://shop.justlovecoffee.com/products/colombia-honey-process',
 description:[
  'Colombia Honey Process – Light Roast',
  'Grown on the Las Mercedes farm in northern Colombia, the Gamboa family has been cultivating coffee for sixty years, carrying on a family tradition that dates back to 1920. Through careful cultivation and specialty processing methods, they produce exceptional coffees with distinctive flavor profiles. Our light-roasted Honey Process Colombian features vibrant notes of strawberry and orange, complemented by delicate floral undertones.',
  'The honey process removes the coffee cherry’s outer skin and some of its fruit before drying, creating unique fermentation characteristics that contribute to its bright, fruit-forward flavor.'
 ]};
function parse(c,{sibling='',description=c.description,title='OLD KENYA 2000 MASL DECAF'}={}){
 const ld={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:c===vienna?'ink! Coffee Company':'Just Love Coffee Roasters'}};
 const html='<!doctype html><html><head><title>'+title+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+c.name+'</h1><div class="product-description">'+description.map(x=>'<p>'+x+'</p>').join('')+'</div></article></main>'+sibling+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('#315 Vienna exact own roast and origin versus roaster comparator',()=>{
 const p=parse(vienna);assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,'Vienna Roast');
 assert.equal(p.fields?.roast_level,'Dark');
 assert.match(String(p.fields?.origin||''),/Americas/i);
 assert.match(String(p.fields?.tasting_notes||''),/caramel/i);
 assert.ok(!p.fields?.elevation_m&&!p.fields?.decaffeination_method);
});
test('#315 roaster High Altitude and French Roast comparison cannot supply a growing elevation',()=>{
 const p=parse(vienna,{sibling:'<aside class="related-products"><h2>Other coffees</h2><p>French Roast Brazil 1900 masl Swiss Water. Mango.</p></aside>'});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.roast_level,'Dark');
 assert.ok(!p.fields?.elevation_m&&!p.fields?.decaffeination_method);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/mango/i);
});
test('#316 own current family, process and light roast stay attached to Colombia Honey selected product',()=>{
 const p=parse(colombia);assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,colombia.name);
 assert.equal(p.fields?.process,'Honey');
 assert.equal(p.fields?.roast_level,'Light');
 assert.match(String(p.fields?.producer||''),/Gamboa/i);
 assert.match(String(p.fields?.tasting_notes||''),/strawberry/i);
 assert.match(String(p.fields?.tasting_notes||''),/orange/i);
});
test('#316 named present farm plus northern country is direct selected growing locality, not generic country only',()=>{
 const p=parse(colombia);assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.match(String(p.fields?.origin||''),/Northern Colombia/i,'explicit exact chosen coffee northern Colombia growing region should not be dropped');
 assert.doesNotMatch(String(p.fields?.producer||''),/Las Mercedes/i,'named family grower is a separate producer from farm');
});
test('#316 no geography or tasting from other coffee, recycled SEO or reviews',()=>{
 const p=parse(colombia,{sibling:'<aside class="related-products"><h2>Other coffee</h2><p>Kenya Ndaroini 2100 masl. Washed. Black tea and mango.</p></aside><section class="reviews">Ethiopia Sidama Dark roast</section>'});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields?.origin||''),/Kenya|Ethiopia/i);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/mango|black tea/i);
 assert.ok(!p.fields?.elevation_m&&!p.fields?.decaffeination_method);
});
