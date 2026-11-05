// #33 frozen603 #570 exact current farm vs historical region-only extraction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentFarmGrowingLocality as select} from '../src/server/coffee-selected-farm-growing-locality.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Honduras - Expreso Paraiseño',url='https://www.slowburncoffee.com/products/honduras-expreso-paraiseno';
const first='In the Lodoza, El Paraíso region of Honduras, the Padilla family acquired land in 2019 that today is Finca Expreso Paraiseño. Ideal for coffee production.';
const second='The coffee grown at the farm is the product of commitment, grown from the beautiful lands of La Lodoza, El Paraíso, with plenty of passion.';
const block=(x=first,y=second)=>[{tag:'h1',text:name},{tag:'p',section:'Product Details',text:x},{tag:'p',section:'Product Details',text:y}];
const page=(x=first,y=second,extra='')=>'<html><head><meta property="og:type" content="product"></head><body><article class="product"><h1>'+name+'</h1><h2>Product Details</h2><p>'+x+'</p><p>'+y+'</p><p>✹ Farm : Expreso Paraiseño ✹ Region : El Paraiso ✹ Owner : Gerardo Peñalva ✹ Varietals : Parainema ✹ Processing : Fully washed ✹ Altitude : 1,450 meters</p>'+extra+'</article></body></html>';
test('exact current matching named farm permits only corroborated farm growing locality',()=>{
 assert.equal(select({name,origin:'El Paraíso, Honduras',blocks:block()})?.value,'La Lodoza, El Paraíso, Honduras');
});
test('real parser and Add Coffee keep current farm origin and unrelated fields',()=>{
 const v=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(v.ok,true,JSON.stringify(v));
 assert.equal(v.fields.origin,'La Lodoza, El Paraíso, Honduras',JSON.stringify(v));
 assert.equal(v.fields.name,name);
 assert.ok(!v.conflicts?.includes('origin'),JSON.stringify(v.conflicts));
 assert.match(coffeeUrlPreviewMarkup(v),/La Lodoza, El Paraíso, Honduras/);
});
test('unmatched farm, outdated story, unsupported country or region cannot refine',()=>{
 for(const [x,y] of [[first.replace('Expreso Paraiseño','Other Farm'),second],['Previously '+first,second],[first,'Previously '+second],[first,second.replace('La Lodoza','La Elsewhere')],[first,second.replace('farm','mill')]])
  assert.equal(select({name,origin:'El Paraíso, Honduras',blocks:block(x,y)}),null,x+'|'+y);
 for(const origin of ['Honduras','Olancho, Honduras','El Paraíso, Guatemala','La Lodoza, El Paraíso, Honduras'])
  assert.equal(select({name,origin,blocks:block()}),null,origin);
 assert.equal(select({name:'Honduras - Other Coffee',origin:'El Paraíso, Honduras',blocks:block()}),null);
});
test('other product, educational paragraph and opposing selected growing locality fail closed',()=>{
 assert.equal(select({name,origin:'El Paraíso, Honduras',blocks:[...block(),{tag:'h1',text:'Another Coffee'}]}),null);
 assert.equal(select({name,origin:'El Paraíso, Honduras',blocks:[{tag:'h1',text:name},{tag:'p',text:first,educational:true},{tag:'p',text:second,educational:true}]}),null);
 assert.equal(select({name,origin:'El Paraíso, Honduras',blocks:[...block(),{tag:'p',text:second.replace('La Lodoza','La Otherplace'),section:'Product Details'}]}),null);
 const v=extractPublicCoffeeFacts(page('This selected coffee is lovely.','')+'<aside><p>'+first+second+'</p></aside>',{source_url:url});
 assert.notEqual(v.fields.origin,'La Lodoza, El Paraíso, Honduras');
});
