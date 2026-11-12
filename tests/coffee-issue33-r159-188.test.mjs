import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen188,selected188Source} from '../scripts/audit/issue33-r159-188-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const product='<h1>42 Series- Ethiopia Dehab’s Diamond</h1><h2>Tasting notes</h2>'+
 '<p>Bright, fruit-tea, and sweet honeysuckle. We taste notes of peach, nougat, and chocolate covered cherries.</p>'+
 '<h2>Roast</h2><p>Light Roast</p><h2>The story</h2>'+
 '<p>Dehab Bitewlign has worked hard as an amazing coffee producer in Ethiopia.</p>'+
 '<p>Her farms are in the buffer and core zones of the UNESCO Kaffa Forest biosphere.</p>';
const page=(p=product,extra='')=>'<html><head><title>Old Peruvian Medium coffee</title>'+
 '<meta name="description" content="A different coffee from an old URL"></head>'+
 '<body><nav>Other roast Dark</nav><main><article class="product">'+p+
 '</article></main>'+extra+'<footer>Related Espresso Brazil Dark Roast</footer></body></html>';
test('#188 exact selected coffee H1 and all own story facts',()=>{
 const r=selected188Source(page());assert.equal(r.exactSelectedTitle,true);
 assert.ok(Object.values(r.direct).every(Boolean),JSON.stringify(r));
});
test('#188 URL slug and stale HTML SEO title are not selected identity',()=>{
 const r=selected188Source(page(product.replace('<h1>42 Series- Ethiopia Dehab’s Diamond</h1>','<h1>Another Coffee</h1>')));
 assert.equal(r.exactSelectedTitle,false);
});
test('#188 direct notes missing: related coffee text cannot reconstitute own flavors',()=>{
 const p=product.replace('Bright, fruit-tea, and sweet honeysuckle. We taste notes of peach, nougat, and chocolate covered cherries.','Selected tasting notes unpublished');
 const r=selected188Source(page(p,'<section class="related-products"><h1>Other coffee</h1><p>sweet honeysuckle, notes of peach, nougat, chocolate covered cherries</p></section>'));
 assert.equal(r.direct.peach,false);assert.equal(r.direct.cherries,false);
});
test('#188 absent roast label not inferred from unselected footer or page SEO',()=>{
 const p=product.replace('<h2>Roast</h2><p>Light Roast</p>','<h2>Roast</h2><p>Not published</p>');
 assert.equal(selected188Source(page(p,'<footer>Light Roast</footer>')).direct.roast,false);
});
test('#188 producer role not borrowed from generic roaster header',()=>{
 const p=product.replace('Dehab Bitewlign has worked hard as an amazing coffee producer in Ethiopia.','Producer not published.');
 assert.equal(selected188Source(page(p,'<aside>Dehab Bitewlign</aside>')).direct.producer,false);
});
test('#188 no Kaffa estate inference from unrelated footer',()=>{
 const p=product.replace('Her farms are in the buffer and core zones of the UNESCO Kaffa Forest biosphere.','Origin Ethiopia');
 assert.equal(selected188Source(page(p,'<footer>Kaffa Forest</footer>')).direct.forest,false);
});
test('#188 same chosen product retains full narrative tasting description',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen188.url});
 assert.ok(p.ok!==false,JSON.stringify(p));
 assert.ok(['peach','nougat','chocolate covered cherries'].every(x=>String(p.fields?.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p));
});
test('#188 decaf/process/altitude absent cannot be borrowed from unrelated navigation',()=>{
 const p=extractPublicCoffeeFacts(page(product,'<aside>Related coffee is Swiss Water Decaf, Washed, 2000 masl</aside>'),{source_url:chosen188.url});
 assert.ok(!p.fields?.decaffeination_method,JSON.stringify(p));
 assert.ok(!p.fields?.process||p.fields.process==='Other/Unknown',JSON.stringify(p));
});
test('#188 product-owned categorical Light is retained',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen188.url});
 assert.equal(p.fields?.roast_level,'Light',JSON.stringify(p));
});
