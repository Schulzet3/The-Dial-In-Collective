import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedJuneSource,juneTargets} from '../scripts/audit/issue33-r153-june-169-171-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const spec=(n)=>{const t=juneTargets[n];return '<div class="product__description"><h3>Details</h3>'+
 '<p>REGION: '+t.region+'</p><p>VARIETY: '+t.variety+'</p>'+
 '<p>FARM/MILL: '+t.mill+'</p><p>ALTITUDE: '+t.altitude+' MASL</p>'+
 '<p>PROCESS: Washed</p><p>'+t.notes.join(', ')+'</p></div>'};
const page=(n,{title=juneTargets[n].name,own=spec(n),other='',seo='Guatemala Las Moritas old SEO'}={})=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head>'+
 '<body><header>Current Coffee: Dark Roast Guatemala Honey Raisins</header>'+
 '<main id="MainContent"><section class="product"><div class="product__title"><h1>'+title+'</h1></div>'+
 '<div class="product__info"><span>Single Origin • Medium Roast</span>'+own+'</div></section></main>'+
 '<footer>Guatemala Las Moritas</footer>'+other+'</body></html>';
for(const n of [169,171]){
 test('#'+n+' selected H1 and selected direct facts belong to the chosen bag',()=>{
  const p=selectedJuneSource(page(n),n);assert.equal(p.exactSelectedTitle,true,JSON.stringify(p));
  assert.ok(Object.values(p.direct).every(x=>Array.isArray(x)?x.every(Boolean):x),JSON.stringify(p.direct));
 });
 test('#'+n+' stale SEO, headers and other product cards cannot authenticate a different coffee',()=>{
  const wrong=page(n,{title:'Guatemala Las Moritas',other:'<section class="related products">'+page(n)+'</section>'});
  assert.equal(selectedJuneSource(wrong,n).exactSelectedTitle,false);
 });
 test('#'+n+' nav/footer do not fill missing selected tasting notes',()=>{
  const p=selectedJuneSource(page(n,{own:spec(n).replace(juneTargets[n].notes.join(', '),'NOT LISTED'),
   other:'<nav>'+juneTargets[n].notes.join(', ')+'</nav><footer>'+juneTargets[n].notes.join(', ')+'</footer>'}),n);
  assert.ok(p.direct.notes.some(x=>!x),JSON.stringify(p.direct));
 });
 test('#'+n+' related cards cannot replace selected process',()=>{
  const p=selectedJuneSource(page(n,{own:spec(n).replace('PROCESS: Washed','PROCESS: UNPUBLISHED'),
    other:'<section class="related products"><article>PROCESS: Washed</article></section>'}),n);
  assert.equal(p.direct.process,false);
 });
 test('#'+n+' direct selected roast is independent of stale global dark tag',()=>{
  const p=selectedJuneSource(page(n),n);assert.equal(p.direct.roast,true);
  assert.equal(selectedJuneSource(page(n,{own:spec(n).replace('VARIETY:','VARIETY UNKNOWN:')}),n).exactSelectedTitle,true);
 });
}
test('#169 reused Guatemala slug must not become selected Guatemala coffee',()=>{
 const p=extractPublicCoffeeFacts(page(169,{seo:'Guatemala Las Moritas'}),{source_url:juneTargets[169].url});
 assert.ok(p.ok!==true||!/Guatemala Las Moritas/i.test(p.fields?.name||''),JSON.stringify(p));
});
test('#171 direct selected Peru name is not inferred from a stale page title',()=>{
 const p=extractPublicCoffeeFacts(page(171,{seo:'Guatemala Las Moritas'}),{source_url:juneTargets[171].url});
 assert.ok(p.ok!==true||!/Guatemala Las Moritas/i.test(p.fields?.name||''),JSON.stringify(p));
});
