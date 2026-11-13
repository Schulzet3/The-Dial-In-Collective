import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen203,selected203Source} from '../scripts/audit/issue33-r161-203-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h1>DECAF, Colombia 10oz</h1><p>Region: Huila, Colombia</p>'+
 '<p>Producer: Multi producer Lot</p><p>Varietal: Caturra, Castillo, Colombia</p>'+
 '<p>Process: Washed</p><p>Decaffeination: Sugarcane</p>'+
 '<p>This decaf is a medium roast and makes a Classic Colombian cup - marked by notes of rich milk chocolate and a caramel sweetness.</p>'+
 '<p>At its best, we get citric acidity, think orange or tangerine.</p>'+
 '<p>Sugarcane decaffeination utilizes ethyl acetate (EA) derived from molasses.</p>';
const page=(body=own,other='')=>'<html><head><title>Old 2024 Peru natural medium coffee</title>'+
 '<meta name="description" content="Old SEO Ethiopia decaf Swiss Water"></head><body>'+
 '<nav>Dark Guatemala and Swiss Water Decaf</nav><main><article class="product">'+body+
 '</article></main>'+other+'<footer>Other coffees with fruit, milk chocolate and caramel</footer></body></html>';
test('#203 direct current selected H1 plus eight own facts',()=>{
 const s=selected203Source(page());
 assert.equal(s.exactSelectedTitle,true);assert.deepEqual(Object.entries(s.direct).filter(([,v])=>!v),[]);
});
test('#203 reused URL/title SEO never substitutes a different selected purchase H1',()=>{
 const s=selected203Source(page(own.replace('<h1>DECAF, Colombia 10oz</h1>','<h1>New Peru Natural</h1>')));
 assert.equal(s.exactSelectedTitle,false);
});
test('#203 absent own decaffeination is not borrowed from a recommendation',()=>{
 const changed=own.replace('Decaffeination: Sugarcane','Decaffeination: not published')
  .replace('Sugarcane decaffeination utilizes ethyl acetate (EA) derived from molasses.','');
 const s=selected203Source(page(changed,'<aside>Decaffeination: Sugarcane</aside>'));
 assert.equal(s.direct.sugarcane_decaf,false);
});
test('#203 missing own washing not inferred from education about washed coffees',()=>{
 const s=selected203Source(page(own.replace('Process: Washed','Process: not published'),'<aside>Process: Washed</aside>'));
 assert.equal(s.direct.green_washed,false);
});
test('#203 own chocolate/caramel absent cannot be sourced from related products',()=>{
 const changed=own.replace('rich milk chocolate and a caramel sweetness','unpublished sensory details');
 const s=selected203Source(page(changed,'<section class="related-products"><h2>Others</h2><p>milk chocolate caramel sweetness</p></section>'));
 assert.equal(s.direct.milk_chocolate,false);assert.equal(s.direct.caramel,false);
});
test('#203 own medium roast absent cannot borrow old SEO or footer',()=>{
 const s=selected203Source(page(own.replace('medium roast','roast unavailable'),'<footer>medium roast</footer>'));
 assert.equal(s.direct.medium_roast,false);
});
test('#203 actual parser separates present selected Sugar Process from green Washed',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen203.url});
 assert.equal(p.fields?.process,'Washed',JSON.stringify(p));
 assert.equal(p.fields?.decaffeination_method,'Sugar Process',JSON.stringify(p));
});
test('#203 actual parser retains selected medium and source-specific country',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen203.url});
 assert.equal(p.fields?.roast_level,'Medium',JSON.stringify(p));
 assert.ok(String(p.fields?.origin||'').toLowerCase().includes('colombia'),JSON.stringify(p));
});
test('#203 selected decaf remains immune to unrelated Swiss Water SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen203.url});
 assert.notEqual(p.fields?.decaffeination_method,'Water Process',JSON.stringify(p));
});
test('#203 unrelated selected coffee cannot accept original identity proof',()=>{
 const s=selected203Source(page(own.replace('<h1>DECAF, Colombia 10oz</h1>','<h1>Colombia Regular Blend</h1>')));
 assert.equal(s.exactSelectedTitle,false);
});
