import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen107,selected107Source} from '../scripts/audit/issue33-r134-107-check.mjs';

const own='<p>1 lb bag | Medium Roast</p><p>Washed bean, very uniform. Small farmers working hard within the co-op improve quality and it shows.</p><h2>Tasting Notes</h2><p>Well balanced, bright and floral, with tangerine and lemongrass notes.</p>';
const page=(desc=own,h1=chosen107.name,extra='',seo='Old unrelated product')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+desc+'</section></article>'+extra+'</main></body></html>';
test('#107 exact current chosen H1, Medium, Washed and four selected phrases',()=>{
 const x=selected107Source(page());assert.equal(x.exactH1,true);
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#107 renamed product at recycled URL is not old selected identity',()=>{
 assert.equal(selected107Source(page(own,'Ethiopian Replacement','','Ethiopian Yirgacheffe')).exactH1,false);
});
test('#107 an old title or meta description cannot supply missing current notes',()=>{
 const x=selected107Source(page(own.replace('tangerine','not printed'),chosen107.name,'','Tangerine from old coffee'));
 assert.equal(x.direct.notes,false);
});
test('#107 unrelated navigation, sidebar and footer cannot supply selected process',()=>{
 const missing=own.replace('Washed bean','Processing unpublished');
 const x=selected107Source(page(missing,chosen107.name,'<nav>'+own+'</nav><aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(x.direct.washedBean,false);
});
test('#107 unrelated related-coffee can never supply absent notes',()=>{
 const missing=own.replace('lemongrass','not printed');
 const x=selected107Source(page(missing,chosen107.name,'<aside class="recommendations">'+own+'</aside>'));
 assert.equal(x.direct.notes,false);
});
test('#107 own source process disappearance fails despite matching roast and selected name',()=>{
 assert.equal(selected107Source(page(own.replace('Washed bean','Beautiful beans'))).direct.washedBean,false);
});
test('#107 selected product form content is retained as first-party evidence',()=>{
 const x=selected107Source(page('<form action="/cart/add" class="product-form">'+own+'</form>'));
 assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#107 whole selected flavor clause is not inferred from a partial note pair',()=>{
 const x=selected107Source(page(own.replace('bright and floral','subtle and mellow')));
 assert.equal(x.direct.notes,false);
});
test('#107 roast mentioned exclusively in another product cannot fill chosen medium',()=>{
 const x=selected107Source(page(own.replace('Medium Roast','Roast unspecified'),chosen107.name,
  '<aside>1 lb bag | Medium Roast</aside>'));
 assert.equal(x.direct.medium,false);
});
test('#107 changed heading but preserved selected prose is still identity mismatch',()=>{
 const x=selected107Source(page(own,'Sumatra Mandheling'));
 assert.equal(x.exactH1,false);
});
