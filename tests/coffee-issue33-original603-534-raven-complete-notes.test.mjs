import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Original frozen603 row #534, exact selected official Raven Espresso:
// https://www.nunatakcoffee.com/products/raven-espresso
// Source-shaped fixtures, NOT newly captured/raw-hash verified official HTML.
const sourceUrl='https://nunatak.example/products/raven-espresso';
const first='Straight shots mysteriously balance different worlds. They begin with a profound dark chocolate sweetness that is tamed with a velvet-like nuttiness, and end with a bright effervescent finish.';
const second="Raven's brilliance is truly revealed when layered with milk, showcasing an artistic dance of creamy chocolate, blueberry preserves, and hazelnut liqueur.";
function selectedPage({description=first+' '+second,other=''}={}){
 const html='<html><head><meta property="og:type" content="product">'+
  '<link rel="canonical" href="'+sourceUrl+'"></head><body><main><article class="product">'+
  '<h1>Raven Espresso</h1><div class="product__description"><p>'+description+
  '</p></div></article>'+other+'</main></body></html>';
 const result=extractPublicCoffeeFacts(html,{source_url:sourceUrl});
 assert.equal(result?.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'Raven Espresso',JSON.stringify(result.fields));
 return result;
}

test('original603 #534 selected Raven straight-shot AND milk sensory notes remain available',()=>{
 const result=selectedPage();
 const notes=result.fields.tasting_notes||'';
 assert.match(notes,/dark chocolate/i,'Own straight-shot dark chocolate must be retained');
 assert.match(notes,/velvet-like nuttiness/i,'Own straight-shot nuttiness must be retained');
 assert.match(notes,/blueberry preserves/i,'Own with-milk profile must not be silently omitted');
 assert.match(notes,/hazelnut liqueur/i,'Own with-milk profile must not be silently omitted');
});

test('related product cannot donate its sensory terms to selected Raven',()=>{
 const result=selectedPage({description:first,other:
  '<section class="product-recommendations"><h2>Other Coffees</h2><h3>Different Coffee</h3>'+
  '<p>With milk, this different coffee tastes like tomato soup and banana pudding.</p></section>'});
 const notes=result.fields.tasting_notes||'';
 assert.doesNotMatch(notes,/tomato soup|banana pudding/i);
});

test('unrelated marketing/education may not supply missing selected milk flavor',()=>{
 const result=selectedPage({description:first,other:
  '<section class="coffee-education"><h2>How to drink espresso</h2>'+
  '<p>Some espresso coffees taste like blueberry preserves or hazelnut liqueur in milk.</p></section>'});
 const notes=result.fields.tasting_notes||'';
 assert.doesNotMatch(notes,/blueberry preserves|hazelnut liqueur/i);
});
