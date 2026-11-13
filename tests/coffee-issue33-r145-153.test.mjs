import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen153,selected153Source} from '../scripts/audit/issue33-r145-153-check.mjs';
const facts='<p>FLAVOR: Raspberry • Winey • Cinnamon • Orange</p>'+
 '<p>PROCESS: Natural Anaerobic Dragon</p><p>Roast: Light</p>'+
 '<p>Origin: Tepic, Nayarit, Mexico</p><p>Elevation: 1,400 meters</p>'+
 '<p>Producers: Various Smallholders</p><p>Varieties: Caturra • Bourbon</p>';
const page=(own=facts,title=chosen153.name,elsewhere='',seo='Colombia washed dark decaf')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+title+'</h1><div class="product__description">'+own+
 '</div></article></main>'+elsewhere+'</body></html>';
const chosen=x=>selected153Source(x);
test('#153 exact H1 and all seven direct chosen facts',()=>{
 const x=chosen(page());assert.equal(x.exactH1,true);assert.ok(Object.values(x.direct).every(Boolean),JSON.stringify(x.direct));
});
test('#153 different chosen product H1 cannot be repaired by old SEO',()=>{
 assert.equal(chosen(page(facts,'MEXICO NAYARIT WAS HED', '',chosen153.name)).exactH1,false);
});
test('#153 changed lot suffix is not exact selected identity',()=>{
 assert.equal(chosen(page(facts,chosen153.name+' 2027 Lot')).exactH1,false);
});
test('#153 own missing taste cannot be borrowed from SEO',()=>{
 assert.equal(chosen(page(facts.replace('FLAVOR: Raspberry • Winey • Cinnamon • Orange','FLAVOR: unpublished'),
 chosen153.name,'','FLAVOR: Raspberry • Winey • Cinnamon • Orange')).direct.notes,false);
});
test('#153 partial four-taste list fails',()=>{
 assert.equal(chosen(page(facts.replace('Winey • ','Dried Fruit • '))).direct.notes,false);
});
test('#153 unrelated aside cannot supply chosen process',()=>{
 assert.equal(chosen(page(facts.replace('PROCESS: Natural Anaerobic Dragon','PROCESS: unpublished'),
 chosen153.name,'<aside>'+facts+'</aside>')).direct.method,false);
});
test('#153 unrelated footer cannot supply chosen roast',()=>{
 assert.equal(chosen(page(facts.replace('Roast: Light','Roast: unknown'),
 chosen153.name,'<footer>'+facts+'</footer>')).direct.roast,false);
});
test('#153 nav cannot provide missing chosen origin',()=>{
 assert.equal(chosen(page(facts.replace('Origin: Tepic, Nayarit, Mexico','Origin: unknown'),
 chosen153.name,'<nav>'+facts+'</nav>')).direct.origin,false);
});
test('#153 scripts cannot supply missing altitude',()=>{
 assert.equal(chosen(page(facts.replace('Elevation: 1,400 meters','Elevation: unknown'),
 chosen153.name,'<script type="application/ld+json">'+facts+'</script>')).direct.elevation,false);
});
test('#153 templates cannot supply missing farm role',()=>{
 assert.equal(chosen(page(facts.replace('Producers: Various Smallholders','Producers: unpublished'),
 chosen153.name,'<template>'+facts+'</template>')).direct.producer,false);
});
test('#153 another product cannot supply missing varieties',()=>{
 assert.equal(chosen(page(facts.replace('Varieties: Caturra • Bourbon','Varieties: unknown'),
 chosen153.name,'<section class="related-products">'+facts+'</section>')).direct.variety,false);
});
test('#153 variety partial match fails complete two-variety direct proof',()=>{
 assert.equal(chosen(page(facts.replace('Caturra • Bourbon','Caturra only'))).direct.variety,false);
});
test('#153 direct own method survives unrelated contradictory SEO',()=>{
 assert.equal(chosen(page(facts,chosen153.name,'','Washed natural Brazil')).direct.method,true);
});
