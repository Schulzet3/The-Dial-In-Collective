import test from 'node:test';
import assert from 'node:assert/strict';
import {selected187Source,chosen187} from '../scripts/audit/issue33-r158-187-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const product='<h1>Bolivia</h1><p>Single Origin</p><p>Light Roast</p>'+
 '<p>Tasting Notes: Nougat | Milk Chocolate | Golden Raisin</p>'+
 '<h2>The story</h2><p>The light-to-medium roast keeps things bright and open.</p>'+
 '<h3>Origin & process</h3><p>Bolivia (washed)</p><h3>Roast</h3><p>Light Roast</p>'+
 '<h2>AIPEP</h2><p>Region/City Yungas Mountains, Caranavi Province, Pumiri</p>'+
 '<p>Elevation 3,600–4,900 ft</p>';
const page=(body=product,head='',tail='')=>
 '<html><head><title>Old Medium Roast Peru</title><meta name="description" content="Old Medium Roast Peru"></head>'+
 '<body><nav>Featured Dark Brazil</nav><main><article class="product">'+body+
 '</article></main>'+head+tail+'<footer>Related coffee Medium Peru</footer></body></html>';
test('#187 exact original identity and direct selected official labeled roast, source fields',()=>{
 const q=selected187Source(page());
 assert.equal(q.exactSelectedTitle,true);
 assert.ok(Object.values(q.direct).every(Boolean),JSON.stringify(q));
});
test('#187 roaster prose light-to-medium is not a false independently selected roast label',()=>{
 const q=selected187Source(page(product.replace('<h3>Roast</h3><p>Light Roast</p>','')));
 assert.equal(q.direct.label_roast,false);
});
test('#187 category is from selected roast, not other product SEO',()=>{
 const q=selected187Source(page(product.replace('<h3>Roast</h3><p>Light Roast</p>','').replace('<p>Light Roast</p>','')));
 assert.equal(q.direct.label_roast,false);assert.equal(q.direct.hero_roast,false);
});
test('#187 selected original identity not satisfied by stale SEO or product slug',()=>{
 const q=selected187Source(page(product.replace('<h1>Bolivia</h1>','<h1>Peru Cajamarca</h1>')));
 assert.equal(q.exactSelectedTitle,false);
});
test('#187 only current selected own notes; not related products or footer',()=>{
 const no=product.replace('Tasting Notes: Nougat | Milk Chocolate | Golden Raisin','Notes unpublished');
 const q=selected187Source(page(no,'<section class="related-products">'+product+'</section>'));
 assert.equal(q.direct.labeled_tastes,false);
});
test('#187 current selected Washed not borrowed from unrelated header/footer',()=>{
 const q=selected187Source(page(product.replace('Bolivia (washed)','Origin not published'),'<footer>Bolivia (washed)</footer>'));
 assert.equal(q.direct.washed_green,false);
});
test('#187 exact selected title cannot inherit other coffee H1',()=>{
 const q=selected187Source(page(product+'<section class="related-products"><h1>Peru</h1></section>'));
 assert.equal(q.exactSelectedTitle,true);
});
test('#187 unselected metadata cannot produce selected roast without chosen evidence',()=>{
 const q=extractPublicCoffeeFacts(page(product.replace('<h3>Roast</h3><p>Light Roast</p>','').replace('<p>Light Roast</p>','')), {source_url:chosen187.url});
 assert.ok(q.ok!==true||q.fields.roast_level!=='Medium',JSON.stringify(q));
});
test('#187 no selected decaf assertion from generic page mentions',()=>{
 const q=extractPublicCoffeeFacts(page(product,'<aside>Our Decaf uses Swiss Water Process</aside>'),{source_url:chosen187.url});
 assert.ok(!q.fields?.decaffeination_method,JSON.stringify(q));
});
