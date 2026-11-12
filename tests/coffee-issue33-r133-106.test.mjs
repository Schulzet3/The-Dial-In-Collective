import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen106,selected106Source} from '../scripts/audit/issue33-r133-106-check.mjs';
const own='<p>1 lb bag | Medium-Dark Roast</p><p>Farmers in this region are working with experts on small lots.</p><h2>Tasting Notes</h2><p>Mild cherry, milk chocolate, balanced.</p>';
const page=(description=own,h1=chosen106.name,extra='',seo='Archived Different Coffee')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+description+'</section></article>'+extra+'</main></body></html>';
test('#106 exact chosen headline and selected roast and three source-bound notes',()=>{
 const s=selected106Source(page());assert.equal(s.exactH1,true);
 assert.ok(Object.values(s.direct).every(Boolean),JSON.stringify(s.direct));
 assert.equal(s.explicitNamedGreenProcess,false);
});
test('#106 changed selected identity cannot use old slug or SEO title',()=>{
 const s=selected106Source(page(own,'Replacement Coffee','','Colombia Valley de Cauca'));
 assert.equal(s.exactH1,false);
});
test('#106 nav, aside, footer cannot fill absent selected roasting or sensory claim',()=>{
 const missing=own.replace('Medium-Dark Roast','Roast not specified').replace('milk chocolate','other note');
 const s=selected106Source(page(missing,chosen106.name,'<nav>'+own+'</nav><aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(s.direct.mediumDark,false);assert.equal(s.direct.notes,false);
});
test('#106 adjacent Earthback Sumatra cannot contaminate current roast or notes',()=>{
 const other='<aside class="recommended">Dark Roast. Syrupy full body, dark chocolate, mild cherry.</aside>';
 const missing=own.replace('Medium-Dark Roast','roast not specified').replace('Mild cherry','not published');
 const s=selected106Source(page(missing,chosen106.name,other,'Sumatra Mandheling'));
 assert.equal(s.direct.mediumDark,false);assert.equal(s.direct.notes,false);
});
test('#106 generic farmers in this region is not named green processing evidence',()=>{
 const s=selected106Source(page());assert.equal(s.explicitNamedGreenProcess,false);
});
test('#106 a future literal process label needs fresh manual adjudication',()=>{
 const s=selected106Source(page(own+'<p>Process: Washed</p>'));
 assert.equal(s.explicitNamedGreenProcess,true);
});
test('#106 selected product form must retain own direct roasting and notes',()=>{
 const s=selected106Source(page('<form action="/cart/add" class="product-form">'+own+'</form>'));
 assert.ok(Object.values(s.direct).every(Boolean),JSON.stringify(s.direct));
});
test('#106 absent selected chocolate cannot be supplied by old head metadata',()=>{
 const s=selected106Source(page(own.replace('milk chocolate','not listed'),chosen106.name,'','Mild cherry, milk chocolate, balanced'));
 assert.equal(s.direct.notes,false);
});
