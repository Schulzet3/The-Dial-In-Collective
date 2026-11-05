// Issue33 original603 #106 source-provenance: country-first named region.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCountryFirstTitleRegion as refine} from '../src/server/coffee-title-region-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const name='Colombia Valley de Cauca';
const url='https://earthbackcoffee.com/products/colombia-valley-de-cauca-medium-dark-roast';
const story='Farmers in this region are working with experts on small lots building a reputation for superb coffee.';
const p=(s=story)=>[{tag:'h1',text:name},{tag:'p',text:s}];
const check=(args={})=>refine({name,country:'Colombia',origin:'Colombia',blocks:p(),...args});
function parse({title=name,body=story,additional='',selectedH1=true}={}){
 const product='<main><article class="product">'+(selectedH1?'<h1>'+title+'</h1>':'')+
  '<div class="product-description"><p>'+body+'</p><p>Tasting Notes</p><p>Mild cherry, milk chocolate, balanced.</p></div></article></main>';
 const html='<html><head><meta property="og:type" content="product"></head><body>'+product+additional+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('exact selected geographical H1 and farmers in this region corroborate literal locality',()=>{
 const x=check();assert.equal(x?.value,'Valley de Cauca, Colombia');assert.match(x.quote,/Farmers in this region/);
});
test('actual parser can refine the selected country without inventing crop details',()=>{
 const x=parse();assert.equal(x.ok,true,JSON.stringify(x));
 assert.equal(x.fields.name,name);assert.equal(x.fields.origin,'Valley de Cauca, Colombia',JSON.stringify(x));
 assert.equal(x.fields.process,undefined);assert.equal(x.fields.release_label,undefined);
});
test('country-only title or unsupported region does not promote geography',()=>{
 assert.equal(check({name:'Colombia'}),null);
 assert.equal(check({blocks:p('This is a satisfying roast from Colombia.')}),null);
});
test('mismatched selected H1 or competing H1 rejects inferred region',()=>{
 assert.equal(check({blocks:[{tag:'h1',text:'Another Coffee'},{tag:'p',text:story}]}),null);
 assert.equal(check({blocks:[...p(),{tag:'h1',text:'Related Coffee'}]}),null);
});
test('already-specific or foreign current origin cannot be overwritten',()=>{
 assert.equal(check({origin:'Antioquia, Colombia'}),null);
 assert.equal(check({origin:'Guatemala'}),null);
});
test('blend, roast, process, farm and shipping labels cannot be regions',()=>{
 for(const value of ['Colombia Valley Blend','Colombia Valley Cauca Dark Roast',
 'Colombia Finca Cauca','Colombia Natural Wash','Colombia Valley Farm'])
 assert.equal(check({name:value,blocks:[{tag:'h1',text:value},{tag:'p',text:story}]}),null);
});
test('previous or unrelated lot does not corroborate current region',()=>{
 for(const body of ['Farmers in this region for another coffee once grew this lot.',
 'Farmers in this region supplied a previous product.'])assert.equal(check({blocks:p(body)}),null);
});
test('unrelated metadata and other coffee cannot donate a region',()=>{
 const x=parse({title:'Colombia',body:'Our coffee is tasty.',additional:'<aside>Colombia Valley de Cauca Farmers in this region are excellent.</aside>'});
 assert.equal(x.ok,true,JSON.stringify(x));assert.notEqual(x.fields.origin,'Valley de Cauca, Colombia');
});
