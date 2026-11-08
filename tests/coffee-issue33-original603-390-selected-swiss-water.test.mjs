import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeSourceReviewSnapshot,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Santa Ana Swiss Water® Decaf';
const url='https://topecacoffee.com/products/santa-ana-swiss-water®-decaf';
const intro='This Swiss Water Decaf from our farms in El Salvador delivers on all fronts to be as rich, smooth and delicious as its fully caffeinated counterparts.';
function productForm({title=name,description=intro,extra='',klass='product-form'}={}){
 return '<form class="'+klass+'"><div class="product-form--block"><h2>'+title+'</h2></div>'+
 '<div class="product-form--block"><div class="product-form--block--description"><h3>'+
 description+'</h3></div></div><div class="product-form--block">'+extra+'</div></form>';
}
function page(body=productForm(),{chosen=name,seo=''}={}){
 return '<html><head><meta property="og:type" content="product"><meta property="og:title" content="'+chosen+'">'+
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',
 name:chosen,brand:{'@type':'Brand',name:'Topeca Coffee Roasters'}})+'</script>'+seo+
 '</head><body><main>'+body+'</main></body></html>';
}
const parse=(body=productForm(),options={})=>extractPublicCoffeeFacts(page(body,options),{source_url:url});
test('current exact selected H2/form/direct H3 water decaf is independent of green blend process',()=>{
 const out=parse(productForm({extra:'<h4>Terroir Information – Single Origin</h4><p>Processing Method: Blend of Washed and Natural</p>'}));
 assert.equal(out.ok,true,JSON.stringify(out));
 assert.equal(out.fields.name,name);
 assert.equal(out.fields.decaffeination_method,'Water Process',JSON.stringify(out.fields));
 assert.notEqual(out.fields.process,'Washed');
 assert.ok(out.source_facts.some(x=>x.field==='decaffeination_method'&&x.source_type==='html'&&x.value===name));
 const review=coffeeSourceReviewSnapshot({...out,source_url:url});
 assert.ok(review.published_source_information.some(x=>x.field==='decaffeination_method'&&x.value===name));
 assert.match(coffeeUrlPreviewMarkup(out),/Water Process/);
});
test('SEO, related, missing or mismatched current form/H2/H3, past, negated, half-caf, contradictory method all fail closed',()=>{
 const cases=[
  page('<section class="related-products">'+productForm()+'</section>'),
  page(productForm({title:'Other Coffee'})),
  page(productForm({description:'The Swiss Water method is described in our FAQ.'})),
  page(productForm({description:'Previously this Swiss Water Decaf was made elsewhere.'})),
  page(productForm({description:'This Swiss Water Decaf is not decaffeinated by water.'})),
  page(productForm({klass:'different-form'})),
  page('<h2>'+name+'</h2><h3>'+intro+'</h3>'),
  page('<h1>Different Coffee</h1>'+productForm()),
  page(productForm({extra:'<p>Decaffeination Method: Sugarcane</p>'})),
  page(productForm({title:'Santa Ana Half-Caf'}),{chosen:'Santa Ana Half-Caf'}),
  page(productForm({title:'Santa Ana Mountain Water Decaf'}),{chosen:'Santa Ana Mountain Water Decaf'})
 ];
 for(const source of cases){
  const out=extractPublicCoffeeFacts(source,{source_url:url});
  assert.equal(out?.fields?.decaffeination_method,undefined,
   JSON.stringify({name:out?.fields?.name,method:out?.fields?.decaffeination_method,source:source.slice(0,240)}));
 }
});
test('exact Mountain Water selected title with same-form direct own descriptive H3 also qualifies',()=>{
 const title='Santa Ana Mountain Water Decaf';
 const source=page(productForm({title,description:'This Mountain Water Decaf from our farms is rich and smooth.'}),{chosen:title});
 const out=extractPublicCoffeeFacts(source,{source_url:url});
 assert.equal(out.fields.decaffeination_method,'Water Process');
});
