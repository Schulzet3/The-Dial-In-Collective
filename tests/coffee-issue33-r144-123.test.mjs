import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen123,selected123Source} from '../scripts/audit/issue33-r144-123-check.mjs';
const facts='<p>Producer: Miriam Monteiro de Aguiar: Fazenda Cachoeira</p>'+
 '<p>Origin: Santo Antônio do Amparo, Minas Gerais, Brazil</p>'+
 '<p>We Taste: Hazelnut, Toffee, Milk Chocolate, Praline, Golden Raisin</p>'+
 '<p>Varietals: Yellow Catucaí, Catiguá MG2, Paraíso, Yellow Catuaí Arara, Pacamara Topazio</p>'+
 '<p>Altitude: 1000 masl</p><p>Process: Natural</p>'+
 '<p>Behold our year-round Token Dark Roast; this medium-dark roast emphasizes sweetness.</p>';
const page=(own=facts,title=chosen123.name,other='',seo='Unrelated Colombia washed light floral')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+title+'</h1><div class="product__description">'+own+
 '</div></article></main>'+other+'</body></html>';
const selected=x=>selected123Source(x);
test('#123 exact own chosen H1 and seven labeled/roast facts',()=>{
 const d=selected(page());assert.equal(d.exactH1,true);assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
});
test('#123 different selected coffee H1 rejected even when exact H1 in SEO',()=>{
 assert.equal(selected(page(facts,'The Token Light Blend','','The Token Dark Blend')).exactH1,false);
});
test('#123 title Dark is not permission to replace explicit medium-dark own roast',()=>{
 assert.equal(selected(page(facts.replace('medium-dark roast','rich roast'))).direct.mediumDark,false);
});
test('#123 old SEO cannot supply missing selected producer',()=>{
 assert.equal(selected(page(facts.replace('Producer: Miriam Monteiro de Aguiar: Fazenda Cachoeira','Producer: unpublished'),
  chosen123.name,'','Producer: Miriam Monteiro de Aguiar: Fazenda Cachoeira')).direct.producer,false);
});
test('#123 navigation cannot donate missing origin',()=>{
 assert.equal(selected(page(facts.replace('Origin: Santo Antônio do Amparo, Minas Gerais, Brazil','Origin: unpublished'),
  chosen123.name,'<nav>'+facts+'</nav>')).direct.origin,false);
});
test('#123 aside unrelated process cannot donate chosen process',()=>{
 assert.equal(selected(page(facts.replace('Process: Natural','Process: unpublished'),
  chosen123.name,'<aside>'+facts+'</aside>')).direct.process,false);
});
test('#123 footer cannot donate tasting quintet',()=>{
 assert.equal(selected(page(facts.replace('We Taste: Hazelnut, Toffee, Milk Chocolate, Praline, Golden Raisin','We Taste: absent'),
  chosen123.name,'<footer>'+facts+'</footer>')).direct.tastes,false);
});
test('#123 embedded script JSON cannot donate altitude',()=>{
 assert.equal(selected(page(facts.replace('Altitude: 1000 masl','Altitude: absent'),
  chosen123.name,'<script type="application/ld+json">'+facts+'</script>')).direct.altitude,false);
});
test('#123 template cannot donate five varieties',()=>{
 assert.equal(selected(page(facts.replace('Varietals: Yellow Catucaí, Catiguá MG2, Paraíso, Yellow Catuaí Arara, Pacamara Topazio','Varietals: absent'),
  chosen123.name,'<template>'+facts+'</template>')).direct.varieties,false);
});
test('#123 partial producer attribution must not satisfy full direct chosen declaration',()=>{
 assert.equal(selected(page(facts.replace('Producer: Miriam Monteiro de Aguiar: Fazenda Cachoeira','Producer: Miriam Monteiro'))).direct.producer,false);
});
test('#123 one missing tasting note cannot pass complete source proof',()=>{
 assert.equal(selected(page(facts.replace('Golden Raisin','Dried Berry'))).direct.tastes,false);
});
test('#123 product extra lot suffix is a distinct identity until verified',()=>{
 assert.equal(selected(page(facts,chosen123.name+' 2027 Lot')).exactH1,false);
});
test('#123 selected direct roast should survive unrelated contradictory SEO',()=>{
 const d=selected(page(facts,chosen123.name,'','Dark single origin and decaf'));
 assert.equal(d.direct.mediumDark,true);
});