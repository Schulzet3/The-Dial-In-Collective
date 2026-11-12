import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen108,selected108Source} from '../scripts/audit/issue33-r132-108-check.mjs';
const body='<p>1 lb bag | Dark Roast</p><p>A world-renowned coffee-growing region. This coffee is wet-milled producing a classic coffee flavor.</p><h2>Tasting Notes</h2><p>Syrupy full body, dark chocolate, mild cherry.</p>';
const page=(description=body,h1=chosen108.name,extra='',seo='Former Coffee')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+description+'</section></article>'+extra+'</main></body></html>';
test('#108 exact selected H1, dark roast, three notes, literal wet-milled',()=>{
 const s=selected108Source(page());
 assert.equal(s.exactH1,true);
 assert.ok(Object.values(s.direct).every(Boolean),JSON.stringify(s.direct));
 assert.equal(s.explicitNamedGreenProcess,false);
});
test('#108 current replacement H1 cannot be certified from archived SEO and original slug',()=>{
 assert.equal(selected108Source(page(body,'Different Current Sumatra','','Sumatra Mandheling')).exactH1,false);
});
test('#108 nav/aside/footer cannot repair missing selected dark roast and tasting notes',()=>{
 const s=selected108Source(page(body.replace('Dark Roast','roast unknown').replace('dark chocolate','note unknown'),
  chosen108.name,'<nav>'+body+'</nav><aside>'+body+'</aside><footer>'+body+'</footer>'));
 assert.equal(s.direct.dark,false);assert.equal(s.direct.notes,false);
});
test('#108 related product wet-milled statement cannot become selected milling evidence',()=>{
 const s=selected108Source(page(body.replace('wet-milled','processed'),
  chosen108.name,'<aside class="related-products">'+body+'</aside>'));
 assert.equal(s.direct.currentMilling,false);
});
test('#108 wet-milled is not an explicit Washed or Wet Hulled canonical processing specification',()=>{
 const s=selected108Source(page());
 assert.equal(s.direct.currentMilling,true);
 assert.equal(s.explicitNamedGreenProcess,false);
});
test('#108 real selected labeled Washed processing would be a new explicit source to adjudicate',()=>{
 const s=selected108Source(page(body+'<p>Process: Washed</p>'));
 assert.equal(s.explicitNamedGreenProcess,true);
});
test('#108 stale head metadata is not selected tasting evidence',()=>{
 const s=selected108Source(page(body.replace('mild cherry','note absent'),chosen108.name,
  '<aside>mild cherry</aside>','Syrupy full body, dark chocolate, mild cherry'));
 assert.equal(s.direct.notes,false);
});
test('#108 selected identical title and absent source flavor must remain incomplete',()=>{
 const s=selected108Source(page(body.replace('dark chocolate','not published')));
 assert.equal(s.exactH1,true);assert.equal(s.direct.notes,false);
});
