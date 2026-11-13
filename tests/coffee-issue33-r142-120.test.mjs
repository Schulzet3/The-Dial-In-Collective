import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen120,selected120Source} from '../scripts/audit/issue33-r142-120-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const details='<p>solar flare is a limited summer release</p><p>Origin: Colombia – Huila</p>'+
 '<p>Coffee Farmer: Claudia Samboni</p><p>Farm: Finca Las Nubes</p>'+
 '<p>Variety: Pink Bourbon</p><p>Process: 200-hour anaerobic washed</p>'+
 '<p>Roast: Light</p><p>Flavor Notes: Watermelon, Grapefruit Juice, Orange Zest, and Rosewater</p>'+
 '<p>About the Artist: Joelle Ater created the art; not a coffee producer.</p>';
const html=(own=details,name=chosen120.name,extra='',seo='Old Guatemala Natural caramel')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+name+'</h1><div class="product__description">'+own+'</div></article></main>'+extra+'</body></html>';
const direct=v=>selected120Source(v).direct;
test('#120 current selected solar flare direct factual labels and exact H1',()=>{
 const d=selected120Source(html());assert.equal(d.exactH1,true);assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
});
test('#120 changed current H1 cannot certify the archived product',()=>assert.equal(selected120Source(html(details,'solar flare other artist')).exactH1,false));
test('#120 past SEO title cannot provide absent farmer',()=>{
 const v=html(details.replace('Coffee Farmer: Claudia Samboni','Farmer not published'),chosen120.name,'','Coffee Farmer: Claudia Samboni');
 assert.equal(direct(v).farmer,false);
});
test('#120 related artist/product aside cannot provide farmer',()=>{
 const v=html(details.replace('Coffee Farmer: Claudia Samboni','Farmer not published'),chosen120.name,'<aside>'+details+'</aside>');
 assert.equal(direct(v).farmer,false);
});
test('#120 previous coffee navigation cannot supply current origin',()=>{
 const v=html(details.replace('Origin: Colombia – Huila','Origin unavailable'),chosen120.name,'<nav>Origin: Colombia – Huila</nav>');
 assert.equal(direct(v).countryAndRegion,false);
});
test('#120 unrelated footer cannot supply 200-hour anaerobic washed processing',()=>{
 const v=html(details.replace('Process: 200-hour anaerobic washed','Process not published'),chosen120.name,'<footer>Process: 200-hour anaerobic washed</footer>');
 assert.equal(direct(v).process,false);
});
test('#120 partial washed alone is not evidence of the selected 200-hour anaerobic process',()=>{
 assert.equal(direct(html(details.replace('Process: 200-hour anaerobic washed','Process: Washed'))).process,false);
});
test('#120 script/JSON-LD cannot donate missing selected grape citrus sensory notes',()=>{
 const v=html(details.replace('Flavor Notes: Watermelon, Grapefruit Juice, Orange Zest, and Rosewater','Flavor Notes not published'),chosen120.name,'<script>'+details+'</script>');
 assert.equal(direct(v).flavors,false);
});
test('#120 related template cannot donate pink bourbon',()=>{
 const v=html(details.replace('Variety: Pink Bourbon','Variety unknown'),chosen120.name,'<template>'+details+'</template>');
 assert.equal(direct(v).variety,false);
});
test('#120 previous product roast hidden header cannot donate selected roast',()=>{
 const v=html(details.replace('Roast: Light','Roast unavailable'),chosen120.name,'<header>Roast: Light</header>');
 assert.equal(direct(v).lightRoast,false);
});
test('#120 current selected name is not stale SEO product',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:chosen120.url});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,chosen120.name);
 assert.ok(!/guatemala natural caramel/i.test(String(p.fields?.tasting_notes||'')),JSON.stringify(p.fields));
});
test('#120 artist is never selected farmer unless source directly says so',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:chosen120.url});
 assert.equal(p.ok,true);assert.ok(!/joelle ater/i.test(String(p.fields?.producer||'')),JSON.stringify(p.fields));
});
