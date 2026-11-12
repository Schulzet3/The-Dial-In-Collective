import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen176,selected176Source} from '../scripts/audit/issue33-r155-176-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>Single Origin: Chiapas Region</p><p>Producer: José Argüello</p>'+
 '<p>Tasting Notes: Sweet berries, Honey &amp; Fig</p>'+
 '<p>This coffee comes from producer José Argüello of Finca Santa Cruz in the Chiapas region of Mexico.</p>'+
 '<p>This coffee was allowed to ferment in cherry for up to 200 hours before being washed and dried on patios.</p>';
const page=(body=own,name=chosen176.name,extra='',seo='Mexico Nayarit Anaerobic Old Coffee')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<nav>Nayarit Anaerobic Natural</nav><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product__description">'+body+'</div></article></main>'+extra+
 '<footer>Related coffee Nayarit 2025</footer></body></html>';
test('#176 exact current selected title and direct source survives recycled URL slug',()=>{
 const p=selected176Source(page());assert.equal(p.exactSelectedTitle,true);
 assert.ok(Object.values(p.direct).every(x=>Array.isArray(x)?x.every(Boolean):x),JSON.stringify(p));
});
test('#176 escaped ampersand and literal ampersand preserve three direct notes',()=>{
 assert.equal(selected176Source(page(own.replace('Honey &amp; Fig','Honey & Fig'))).direct.selected_tastes,true);
});
test('#176 no tasting-label recovery from unrelated SEO or footer',()=>{
 const p=selected176Source(page(own.replace('Tasting Notes: Sweet berries, Honey &amp; Fig','Tasting Notes unpublished'),
 chosen176.name,'<nav>'+own+'</nav><footer>'+own+'</footer>'));
 assert.equal(p.direct.selected_tastes,false);
});
test('#176 stale original slug or related product cannot substitute exact selected title',()=>{
 const p=selected176Source(page(own,'Mexico Nayarit Anaerobic Process','<section class="related-products"><h1>'+chosen176.name+'</h1>'+own+'</section>'));
 assert.equal(p.exactSelectedTitle,false);
});
test('#176 missing current grower cannot borrow meta title or unrelated card',()=>{
 const p=selected176Source(page(own.replaceAll('José Argüello','Unknown farmer'),chosen176.name,'', 'Producer: José Argüello'));
 assert.equal(p.direct.grower,false);assert.equal(p.direct.own_farm,false);
});
test('#176 different selected origin must reject archived Chiapas facts',()=>{
 const p=selected176Source(page(own.replaceAll('Chiapas','Nayarit'),chosen176.name));
 assert.equal(p.direct.chiapas,false);assert.equal(p.direct.own_farm,false);
});
test('#176 process sentence cannot be borrowed from related product cards',()=>{
 const p=selected176Source(page(own.replace('ferment in cherry for up to 200 hours before being washed and dried on patios',
 'dried in cherry by unknown method'),chosen176.name,
 '<section class="related-products">'+own+'</section>'));
 assert.equal(p.direct.own_fermentation,false);
});
test('#176 in-cherry fermentation wording is not a selected anaerobic label',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen176.url});
 assert.ok(p.ok!==true||p.fields.process!=='Anaerobic',JSON.stringify(p));
});
test('#176 wrong selected coffee may not inherit original identity from old SEO',()=>{
 const p=extractPublicCoffeeFacts(page(own,'Guatemala Acatenango', '',chosen176.name+' Chiapas'),{source_url:chosen176.url});
 assert.ok(p.ok!==true||!/Mexico Finca Santa Cruz/i.test(p.fields?.name||''),JSON.stringify(p));
});
test('#176 old SEO anaerobic/roast cannot fill current selected fields',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen176.url});
 assert.ok(p.ok!==true||(!p.fields.decaffeination_method&&!p.fields.roast_level),JSON.stringify(p));
});
test('#176 missing chosen tasting notes cannot be repaired by old metadata',()=>{
 const h=page(own.replace('Tasting Notes: Sweet berries, Honey &amp; Fig','Tasting Notes unavailable'),
 chosen176.name,'','Tasting Notes: Sweet berries Honey Fig');
 assert.equal(selected176Source(h).direct.selected_tastes,false);
});
test('#176 strictly reject other selected lot or year under same URL',()=>{
 for(const name of ['Mexico Nayarit Anaerobic','Finca Santa Cruz Caturra','Mexico Finca Santa Cruz Geisha 2027'])
  assert.equal(selected176Source(page(own,name)).exactSelectedTitle,false);
});
