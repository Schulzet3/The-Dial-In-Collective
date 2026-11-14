import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const products=[
 {number:313,name:'6610',url:'https://shop.inkcoffee.com/products/6610',text:[
  '6610 ft. This is the altitude we roast our coffee and the reason our High Altitude, Slow roasting process brings out the deepest, smoothest flavors of each and every bean. A blend so rich yet so smooth.',
  'Characteristics - A bold blend of full-bodied coffees roasted special dark to reveal a rich taste, slightly smoky undertones and bittersweet, dark chocolate.',
  'Origin - Central & South America','Roast - Special Dark','Body - Full']},
 {number:314,name:'Espresso 89',url:'https://shop.inkcoffee.com/products/espresso-89',text:[
  'We usually prefer our espresso Northern Italian style; a complex blend roasted delicately and taken straight. But when we took this single origin to a slightly darker roast, we found the resulting caramelized sugars matched perfectly in milk.',
  'Characteristics - Darker roast chocolate taste, licorice sweetness, Big body',
  'Origin - Africa/Asia/Americas','Roast - Trade Secret','Body - Full']}
];
function parse(c,sibling=''){
 const ld={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'ink! Coffee Company'}};
 const html='<!doctype html><html><head><title>OLD KENYA 2400 MASL NATURAL DECAF</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+c.name+'</h1><div class="product-description">'+c.text.map(s=>'<p>'+s+'</p>').join('')+'</div></article></main>'+sibling+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('original #313 roasting facility 6610 ft cannot become green-growing elevation',()=>{
 const p=parse(products[0]);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,'6610');
 assert.ok(!p.fields?.elevation_m,'roast facility altitude is NOT where coffee was grown');
 assert.ok(!p.fields?.decaffeination_method&&!p.fields?.espresso_recipe);
});
test('original #313 selected labeled Special Dark is eligible roast, not a growing-site fact',()=>{
 const p=parse(products[0]);
 assert.equal(p.ok,true);
 assert.equal(p.fields?.roast_level,'Dark','special dark is explicitly chosen-product roast');
 assert.doesNotMatch(String(p.fields?.origin||''),/Kenya|Italy/i);
});
test('original #314 Trade Secret is not a roast degree and Italian is an espresso style',()=>{
 const p=parse(products[1]);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.fields?.name,'Espresso 89');
 assert.ok(!p.fields?.roast_level,'seller does not disclose a specific degree');
 assert.ok(!p.fields?.elevation_m);
 assert.doesNotMatch(String(p.fields?.origin||''),/Italy/i);
});
test('original #313 cannot borrow an altitude and decaf from sibling/review/SEO',()=>{
 const p=parse(products[0],'<aside class="related-products"><h2>Other coffee</h2><p>Grown 2200 masl in Kenya. Blueberry, mango. Swiss Water decaf.</p></aside><section class="reviews"><p>Light roast!</p></section>');
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.elevation_m&&!p.fields?.decaffeination_method);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/blueberry|mango/i);
});
test('original #314 cannot borrow a roast, origin, altitude or decaf from sibling',()=>{
 const p=parse(products[1],'<aside class="related-products"><h2>Other coffee</h2><p>French Dark roast. Grown in Brazil at 1800 masl. Swiss Water decaf.</p></aside><section class="reviews"><p>Kenyan coffee!</p></section>');
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.roast_level&&!p.fields?.elevation_m&&!p.fields?.decaffeination_method);
 assert.doesNotMatch(String(p.fields?.origin||''),/Brazil|Italy|Kenya/i);
});
