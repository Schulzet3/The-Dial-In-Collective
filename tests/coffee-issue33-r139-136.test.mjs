import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen136,selected136Source} from '../scripts/audit/issue33-r139-136-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const specs='<p>Colombia</p><p>Antioquia</p><p>Producer: Mina Rica Farm, San Gabriel</p>'+
 '<p>Castillo</p><p>Washed</p><p>Butterscotch, Brown Sugar, Dark Chocolate, Citrus, Cherry.</p>'+
 '<p>1700 masl</p><p>Roast Level: Medium</p>'+
 '<p>About the farmer: Owner Carolina is a third-generation coffee farmer.</p>';
const page=(s=specs,h=chosen136.name,extra='',seo='Old Coffee by Mario Natural')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+h+'</h1><div class="product__description">'+s+
 '</div></article></main>'+extra+'</body></html>';
const direct=html=>selected136Source(html).direct;
test('#136 selected current H1/direct exact product specs',()=>{
 const r=selected136Source(page());assert.equal(r.exactH1,true);assert.ok(Object.values(r.direct).every(Boolean),JSON.stringify(r.direct));
});
test('#136 changed current product H1 rejects old specs',()=>assert.equal(selected136Source(page(specs,'Other Coffee')).exactH1,false));
test('#136 SEO cannot fill missing direct chosen producer',()=>{
 const s=specs.replace('Producer: Mina Rica Farm, San Gabriel','Producer unlisted');
 assert.equal(direct(page(s,chosen136.name,'','Producer: Mina Rica Farm, San Gabriel')).producer,false);
});
test('#136 unrelated recommendation cannot fill selected producer',()=>{
 const s=specs.replace('Producer: Mina Rica Farm, San Gabriel','Producer unlisted');
 assert.equal(direct(page(s,chosen136.name,'<aside>Producer: Mina Rica Farm, San Gabriel</aside>')).producer,false);
});
test('#136 nav cannot provide selected washed processing',()=>{
 const s=specs.replace('<p>Washed</p>','');
 assert.equal(direct(page(s,chosen136.name,'<nav>Washed</nav>')).washed,false);
});
test('#136 footer cannot supply selected 1700m',()=>{
 const s=specs.replace('<p>1700 masl</p>','');
 assert.equal(direct(page(s,chosen136.name,'<footer>1700 masl</footer>')).height,false);
});
test('#136 stale SEO cannot provide chosen medium roast',()=>{
 const s=specs.replace('<p>Roast Level: Medium</p>','');
 assert.equal(direct(page(s,chosen136.name,'','Roast Level: Medium')).medium,false);
});
test('#136 related product cannot donate final Cherry taste',()=>{
 const s=specs.replace(', Cherry.','.');
 assert.equal(direct(page(s,chosen136.name,'<aside>'+specs+'</aside>')).tastes,false);
});
test('#136 old Mario SEO must not replace current selected name/producer',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen136.url});assert.equal(p.ok,true);
 assert.equal(p.fields?.name,chosen136.name);
 assert.ok(!/Mario/i.test(String(p.fields?.producer||'')),JSON.stringify(p.fields));
});
test('#136 unrelated photo alt cannot inject Gesha into selected Castillo',()=>{
 const p=extractPublicCoffeeFacts(page(specs,chosen136.name,'<img alt="Unrelated Panama Gesha Natural from Mario">'),{source_url:chosen136.url});
 assert.equal(p.ok,true);assert.ok(!/\bGesha\b/i.test(String(p.fields?.variety||'')),JSON.stringify(p.fields));
});
