import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
// Immutable original603 #534, current official selected Product Info, source-shaped
// synthetic HTML. Not a fresh raw current official HTML digest.
const sourceUrl='https://nunatak.example/products/raven-espresso';
const straight='Straight shots mysteriously balance different worlds. They begin with a profound dark chocolate sweetness that is tamed with a velvet-like nuttiness, and end with a bright effervescent finish.';
const milk="Raven's brilliance is truly revealed when layered with milk, showcasing an artistic dance of creamy chocolate, blueberry preserves, and hazelnut liqueur.";
function selectedPage({description=straight+' '+milk,other=''}={}){
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+sourceUrl+'"></head><body><main><article class="product">'+
  '<h1>Raven Espresso</h1><div class="product__description"><p>'+description+
  '</p></div></article>'+other+'</main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:sourceUrl});
 assert.equal(result?.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Raven Espresso',JSON.stringify(result.fields));
 return result;
}
const contexts=result=>(result.source_facts||[]).filter(f=>
 f.field==='sensory_context'&&f.label==='Selected product with-milk sensory description');
test('original603 #534 retains selected with-milk flavor as qualified Source Review, not canonical unqualified notes',()=>{
 const result=selectedPage(),notes=result.fields.tasting_notes||'';
 assert.match(notes,/dark chocolate/i);
 assert.match(notes,/velvet-like nuttiness/i);
 assert.doesNotMatch(notes,/blueberry preserves|hazelnut liqueur/i);
 assert.equal(contexts(result).length,1);
 const fact=contexts(result)[0];
 assert.match(fact.value,/when layered with milk/i);
 assert.match(fact.value,/blueberry preserves/i);
 assert.match(fact.value,/hazelnut liqueur/i);
 assert.equal(fact.source_url,sourceUrl);
 assert.equal(fact.source_type,'html');
});
test('related product cannot donate its with-milk flavor context',()=>{
 const result=selectedPage({description:straight,other:
  "<section class=\"product-recommendations\"><h2>Other Coffees</h2><h3>Newport</h3><p>Newport's brilliance is revealed when layered with milk, showcasing chocolate and hazelnut liqueur.</p></section>"});
 assert.equal(contexts(result).length,0);
 assert.doesNotMatch(result.fields.tasting_notes||'',/hazelnut liqueur/i);
});
test('education cannot donate selected coffee preparation sensory context',()=>{
 const result=selectedPage({description:straight,other:
  "<section class=\"coffee-education\"><h2>How to drink espresso</h2><p>Raven's brilliance is revealed when layered with milk, showcasing chocolate and hazelnut liqueur.</p></section>"});
 assert.equal(contexts(result).length,0);
});
test('other coffee named inside selected description is never selected context',()=>{
 const result=selectedPage({description:straight+
  " Newport's brilliance is revealed when layered with milk, showcasing chocolate and hazelnut liqueur."});
 assert.equal(contexts(result).length,0);
});
test('a previous harvest cannot donate its with-milk flavor profile',()=>{
 const result=selectedPage({description:straight+
  " Previously, Raven's brilliance was revealed when layered with milk, showcasing chocolate and hazelnut liqueur."});
 assert.equal(contexts(result).length,0);
});
test('two incompatible current with-milk profiles remain unasserted',()=>{
 const result=selectedPage({description:straight+' '+milk+
  " Raven's brilliance is revealed when layered with milk, showcasing caramel and citrus."});
 assert.equal(contexts(result).length,0);
});

test('real Nunatak Shopify product-details LI with Product Info label preserves conditional notes only for review',()=>{
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+sourceUrl+'"></head><body><main><article class="product">'+
  '<h1>Raven Espresso</h1></article><section class="section__product-details">'+
  '<article><ul class="product-template__details-table mb0"><li class="description rte">'+
  '<p class="label mb3 h4">Product Info</p>'+straight+' '+milk+
  '</li></ul></article></section></main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:sourceUrl});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Raven Espresso');
 assert.equal(contexts(result).length,1,'Shopify direct LI text must remain selected source-review context');
 assert.match(contexts(result)[0].value,/when layered with milk/i);
 assert.match(contexts(result)[0].value,/blueberry preserves/i);
 assert.doesNotMatch(result.fields.tasting_notes||'',/blueberry preserves|hazelnut liqueur/i);
});
test('Shopify Product Info named different coffee cannot supply selected conditional flavors',()=>{
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+sourceUrl+'"></head><body><main><article class="product">'+
  '<h1>Raven Espresso</h1><ul class="product-template__details-table">'+
  '<li class="description rte"><p class="label">Product Info</p>'+straight+
  " Newport's brilliance is revealed when layered with milk, showcasing chocolate and hazelnut liqueur."+
  '</li></ul></article></main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:sourceUrl});
 assert.equal(result.ok,true);
 assert.equal(contexts(result).length,0);
});
