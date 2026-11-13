import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen235,selected235} from '../scripts/audit/issue33-r171-235-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const guide='<h2>Our Kona Coffees</h2><p>Cupping Notes on Mountain Thunder’s Coffee: American - Floral; Vienna - Nutty; French - bittersweet chocolatiness; Espresso - Smokey with caramel notes.</p>'+
 '<p>The Vienna (medium) is popular; our French (medium dark) and Espresso (dark) roasts are also available.</p>';
const description='<h2>About our 100% Kona Espresso Roast Coffee</h2>'+
 '<p>Mountain Thunder’s Espresso Roast Kona Coffee is a 100% Kona Coffee that is roasted a little longer and at a higher temperature.</p>'+
 '<p>Our Espresso Roast Kona Coffee is a dark roast, which creates a slightly bitter taste profile, with noticeable chocolate overtones. The acidity is low, and it has a smooth aftertaste.</p>'+
 '<h3>100% Kona Espresso Roast Coffee…Our Process</h3>'+
 '<p>Our Kona Espresso Roast Coffee starts its journey to your cup on the slopes of volcanoes in the Kona Coffee Belt, Hawaii Island.</p>';
const own='<h1>100% Kona Espresso Roast Coffee 16oz</h1>'+guide+description;
const page=(body=own,other='')=>'<html><head><title>Old Kenya Strawberry Medium</title>'+
 '<meta name="description" content="Historical Colombia strawberry process washed"></head><body>'+
 '<nav>Peru Caturra Washed</nav><main><article class="product">'+body+'</article></main>'+
 other+'<footer>Related Espresso Peru Blueberry</footer></body></html>';
const parse=(body=own,other='')=>extractPublicCoffeeFacts(page(body,other),{source_url:chosen235.url});
test('#235 exact current H1, direct selected Dark and chocolate, Kona Belt',()=>{
 const r=selected235(page());assert.equal(r.identity,true);assert.equal(r.direct_chocolate_dark,true);assert.equal(r.direct_kona_belt,true);
});
test('#235 current H1 outranks historical SEO and unrelated navigation',()=>{
 const r=parse();assert.equal(r.fields?.name,chosen235.name,JSON.stringify(r).slice(0,1500));
});
test('#235 actual parser recovers directly published selected chocolate overtones',()=>{
 const r=parse();assert.ok(/\bchocolate\b/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r).slice(0,2300));
});
test('#235 chosen Dark roast outranks generic Vienna and French roast guides',()=>{
 const r=parse();assert.equal(r.fields?.roast_level,'Dark',JSON.stringify(r).slice(0,2300));
});
test('#235 selected product Kona Belt retained, green process not inferred',()=>{
 const r=parse();assert.ok(/kona/i.test(String(r.fields?.origin||'')),JSON.stringify(r).slice(0,2300));
 assert.ok(!r.fields?.process,JSON.stringify(r).slice(0,2300));
});
test('#235 missing farm, elevation, variety, decaf and recipe remain blank',()=>{
 const r=parse();for(const k of ['elevation_m','producer','variety','decaffeination_method','espresso_recipe'])assert.ok(!r.fields?.[k],k+' '+JSON.stringify(r).slice(0,1500));
});
test('#235 sibling aside and old SEO cannot contribute strawberry notes',()=>{
 const body=own.replace('noticeable chocolate overtones','a smooth finish');
 const r=parse(body,'<aside><h2>Other coffee</h2><p>Tasting Notes: Chocolate, Strawberry</p></aside>');
 assert.ok(!/\bstrawberry\b/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r).slice(0,1800));
});
test('#235 changed selected H1 does not certify old espresso coffee',()=>{
 const changed=own.replace('<h1>100% Kona Espresso Roast Coffee 16oz</h1>','<h1>Peru Natural New Harvest</h1>');
 assert.equal(selected235(page(changed)).identity,false);
 const r=parse(changed);assert.notEqual(r.fields?.name,chosen235.name);
});
test('#235 unrelated product aside cannot supply Colombian origin',()=>{
 const r=parse(own,'<aside>Colombia Geisha, 1900m, Natural</aside>');
 assert.ok(!/colombia/i.test(String(r.fields?.origin||'')),JSON.stringify(r).slice(0,1800));
});

test('#235 unqualified own chocolate overtones cannot be replaced by a general roast-guide chocolate name',()=>{
 const body=own.replace('noticeable chocolate overtones','noticeable hazelnut overtones');
 const r=parse(body);
 assert.ok(/hazelnut/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r).slice(0,1900));
 assert.ok(!/chocolate/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r).slice(0,1900));
});
test('#235 two selected product overtone sources do not manufacture a chosen profile',()=>{
 const body=own.replace('noticeable chocolate overtones','noticeable hazelnut overtones')+
 '<p>Our Espresso Roast Kona Coffee is a dark roast with noticeable vanilla overtones.</p>';
 const r=parse(body);
 assert.ok(!/hazelnut|vanilla/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r).slice(0,1800));
});
test('#235 historical or conditional overtone claims cannot become selected facts',()=>{
 const body=own.replace('Our Espresso Roast Kona Coffee is a dark roast, which creates','Previously, our Espresso Roast Kona Coffee was a dark roast, which creates');
 const r=parse(body);
 assert.ok(!/chocolate/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r).slice(0,1600));
});
test('#235 overtone from other product section never substitutes selected facts',()=>{
 const body=own.replace('noticeable chocolate overtones','a smooth finish')+
 '<h2>About our Different Product</h2><p>Our Espresso Roast Kona Coffee is a dark roast with noticeable hazelnut overtones.</p>';
 const r=parse(body);
 assert.ok(!/hazelnut/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r).slice(0,1600));
});
