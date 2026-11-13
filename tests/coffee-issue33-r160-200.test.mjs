import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen200,selected200Source} from '../scripts/audit/issue33-r160-200-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h1>Costa Rica Hacienda La Amistad 12 Oz</h1>'+
 '<p>Roast Level: Light</p><p>Process: Washed</p><p>Elevation: 1200-1600 MASL</p>'+
 '<p>Producer Info: Hacienda La Amistad is a third-generation family-run estate in Coto Brus Puntarenas in Southwest Costa Rica.</p>'+
 '<p>The estate offers washed, honey, and natural process coffees across its farms.</p>'+
 '<p>Variety: Caturra, Catuai</p>'+
 '<p>Tasting Notes: Green Apple, Dark Caramel, &amp; Cacao Nibs</p>'+
 '<p>Description: bright semi-sweet tartness, caramel and a lingering chocolate finish.</p>';
const page=(p=own,other='')=>'<html><head><title>Old Dark Roast Colombia</title>'+
 '<meta name="description" content="Vintage Peru coffee, dark roast"></head><body>'+
 '<nav>Other Peru Natural coffees</nav><main><article class="product">'+p+'</article></main>'+
 other+'<footer>Related Dark Ethiopian Swiss Water decaf</footer></body></html>';
test('#200 selected purchasable H1 and nine source-specific facts',()=>{
 const x=selected200Source(page());
 assert.equal(x.exactSelectedTitle,true);
 assert.deepEqual(Object.entries(x.direct).filter(([,v])=>!v),[]);
});
test('#200 stale SEO and URL path never prove a substituted selected identity',()=>{
 const x=selected200Source(page(own.replace('<h1>Costa Rica Hacienda La Amistad 12 Oz</h1>','<h1>Unrelated coffee</h1>')));
 assert.equal(x.exactSelectedTitle,false);
});
test('#200 absent selected tasting list not backfilled from recommendations',()=>{
 const p=own.replace('Tasting Notes: Green Apple, Dark Caramel, &amp; Cacao Nibs','Tasting Notes: unavailable');
 const x=selected200Source(page(p,'<section class="related-products"><h2>Other coffee</h2><p>Green Apple, Dark Caramel, Cacao Nibs</p></section>'));
 assert.equal(x.direct.green_apple,false);assert.equal(x.direct.cacao_nibs,false);
});
test('#200 roast removed from selected coffee not borrowed from sidebar',()=>{
 const p=own.replace('Roast Level: Light','Roast Level: not published');
 assert.equal(selected200Source(page(p,'<aside>Roast Level: Light</aside>')).direct.roast,false);
});
test('#200 processing removed not inferred from estate offering washed/honey/natural options',()=>{
 const p=own.replace('Process: Washed','Process: not published');
 assert.equal(selected200Source(page(p)).direct.washed,false);
});
test('#200 producer must be linked to the chosen estate, not generic site slogan',()=>{
 const p=own.replace('Producer Info: Hacienda La Amistad is a third-generation family-run estate in Coto Brus Puntarenas in Southwest Costa Rica.','Producer Info: not published');
 assert.equal(selected200Source(page(p,'<aside>Hacienda La Amistad is our favorite</aside>')).direct.estate,false);
});
test('#200 own elevation unavailable is not supplied by related product',()=>{
 const p=own.replace('Elevation: 1200-1600 MASL','Elevation: not published');
 assert.equal(selected200Source(page(p,'<footer>Elevation 1200-1600 MASL</footer>')).direct.elevation,false);
});
test('#200 own country and tasting notes are extracted by actual parser',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen200.url});
 assert.notEqual(p.ok,false,JSON.stringify(p));
 assert.equal(p.fields?.roast_level,'Light',JSON.stringify(p));
 assert.ok(String(p.fields?.origin||'').toLowerCase().includes('costa rica'),JSON.stringify(p));
 assert.ok(['green apple','dark caramel','cacao nibs'].every(s=>String(p.fields?.tasting_notes||'').toLowerCase().includes(s)),JSON.stringify(p));
});
test('#200 actual parser keeps explicit selected washed processing distinct from estate alternatives',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen200.url});
 assert.equal(p.fields?.process,'Washed',JSON.stringify(p));
});
test('#200 unrelated navigation/footer decaf cannot set a decaffeination method',()=>{
 const p=extractPublicCoffeeFacts(page(own,'<aside>Other product Swiss Water Decaf</aside>'),{source_url:chosen200.url});
 assert.ok(!p.fields?.decaffeination_method,JSON.stringify(p));
});
