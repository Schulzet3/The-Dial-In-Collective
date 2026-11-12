import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen109,selected109Source} from '../scripts/audit/issue33-r135-109-check.mjs';

const own='<table><tr><th>PRODUCER AMOUNT</th><td>Anasora Farm Site 12 oz. retail bag, 2 lb. bag, 5 lb. bag</td></tr>'
 +'<tr><th>ORIGIN</th><td>Guji, Ethiopia</td></tr><tr><th>ALTITUDE</th><td>2300 masl</td></tr>'
 +'<tr><th>VARIETY</th><td>Heirloom</td></tr><tr><th>PROCESS</th><td>Natural</td></tr>'
 +'<tr><th>NOTES</th><td>Strawberry syrup, Blueberry, Blackberry juice</td></tr></table>'
 +'<p>The Anasora farm is a semi-forest with indigenous trees and spice crops mixed in.</p>';
const page=(desc=own,h1=chosen109.name,other='',seo='Old unrelated product')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head>'
 +'<body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+desc
 +'</section></article>'+other+'</main></body></html>';
const checked=html=>selected109Source(html).direct;
test('#109 selected H1 and seven direct field/source checks',()=>{
 const x=selected109Source(page());
 assert.equal(x.exactH1,true);assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#109 changed product H1 cannot keep historical coffee identity',()=>{
 assert.equal(selected109Source(page(own,'New Replacement Coffee')).exactH1,false);
});
test('#109 old SEO title cannot provide a missing selected flavor',()=>{
 assert.equal(checked(page(own.replace('Blackberry juice','not printed'),chosen109.name,'','Blackberry juice')).notes,false);
});
test('#109 related sidebar cannot supply missing selected Guji origin',()=>{
 assert.equal(checked(page(own.replace('Guji, Ethiopia','Origin unspecified'),chosen109.name,'<aside>'+own+'</aside>')).gujiEthiopia,false);
});
test('#109 navigation cannot supply missing selected Natural process',()=>{
 assert.equal(checked(page(own.replace('<td>Natural</td>','<td>Unspecified</td>'),chosen109.name,'<nav>'+own+'</nav>')).natural,false);
});
test('#109 footer cannot supply missing selected Heirloom variety',()=>{
 assert.equal(checked(page(own.replace('Heirloom','Unspecified'),chosen109.name,'<footer>'+own+'</footer>')).heirloom,false);
});
test('#109 related-product farm site does not fill absent selected farm-site label',()=>{
 assert.equal(checked(page(own.replace('Anasora Farm Site','Producer omitted'),chosen109.name,'<aside>'+own+'</aside>')).farmSite,false);
});
test('#109 source label must be explicit and cannot be inferred from an unnamed farm story',()=>{
 assert.equal(checked(page(own.replace('PRODUCER AMOUNT','Bag sizes'))).producerAmountLabel,false);
});
test('#109 selected altitude must be directly printed',()=>{
 assert.equal(checked(page(own.replace('2300 masl','altitude not published'))).altitude2300,false);
});
test('#109 exact three flavor phrases are not synthesized from only two',()=>{
 assert.equal(checked(page(own.replace('Strawberry syrup','Berry juice'))).notes,false);
});
test('#109 form-embedded direct source remains in selected product',()=>{
 const x=selected109Source(page('<form action="/cart/add">'+own+'</form>'));
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#109 an unrelated selected H1 fails despite correct old story',()=>{
 assert.equal(selected109Source(page(own,'Ethiopian Guji Replacement')).exactH1,false);
});
