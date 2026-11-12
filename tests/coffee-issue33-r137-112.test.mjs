import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen112,selected112Source} from '../scripts/audit/issue33-r137-112-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>Jairo Arcila is a third-generation coffee grower from Quindio, Colombia.</p>'+
 '<p>Among his farms is Santa Monica.</p>'+
 '<p>This coffee has undergone a 72 hour fermentation with added wine yeast.</p>'+
 '<div>Region: Quindio<br>Altitude: 2100 MASL<br>Variety: Castillo<br>'+
 'Process: Honey + Wine Yeast Fermentation<br>'+
 'We Taste: Passion Fruit / Pineapple Gummy Bears / Rose</div>';
const page=(body=own,h1=chosen112.name,elsewhere='',seo='Other Product Gesha Pink Bourbon')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+body+
 '</section></article></main>'+elsewhere+'</body></html>';
const direct=html=>selected112Source(html).direct;
test('#112 exact current Finca Santa Monica H1 and eight direct source facts',()=>{
 const v=selected112Source(page());assert.equal(v.exactH1,true);
 assert.ok(Object.values(v.direct).every(Boolean),JSON.stringify(v.direct));
});
test('#112 replacement H1 fails even with retained old description',()=>{
 assert.equal(selected112Source(page(own,'Replacement Costa Rica')).exactH1,false);
});
test('#112 SEO cannot donate Honey to selected coffee when absent',()=>{
 assert.equal(direct(page(own.replace('Process: Honey + Wine Yeast Fermentation','Process: not published'),'Finca Santa Monica, Colombia','','Process: Honey + Wine Yeast Fermentation')).honeyWithWineYeast,false);
});
test('#112 related sidebar cannot donate selected region',()=>{
 assert.equal(direct(page(own.replace('Region: Quindio','Region not published'),chosen112.name,'<aside>'+own+'</aside>')).regionQuindio,false);
});
test('#112 unrelated nav cannot donate selected variety',()=>{
 assert.equal(direct(page(own.replace('Variety: Castillo','Variety not published'),chosen112.name,'<nav>'+own+'</nav>')).castillo,false);
});
test('#112 footer unrelated product cannot donate selected citrus notes',()=>{
 assert.equal(direct(page(own.replace('Pineapple Gummy Bears','Missing notes'),chosen112.name,'<footer>'+own+'</footer>')).directTaste,false);
});
test('#112 historic other lot cannot donate current named Jairo grower',()=>{
 assert.equal(direct(page(own.replace('Jairo Arcila is a third-generation coffee grower','Unnamed producer'),chosen112.name,'<aside>'+own+'</aside>')).currentGrower,false);
});
test('#112 selected own fermentation statement required not generic fermentations',()=>{
 assert.equal(direct(page(own.replace('This coffee has undergone a 72 hour fermentation with added wine yeast','Other coffees have wine yeast fermentation'))).currentLot72Hours,false);
});
test('#112 altitude cannot be supplied by navigation',()=>{
 assert.equal(direct(page(own.replace('2100 MASL','altitude unpublished'),chosen112.name,'<nav>'+own+'</nav>')).altitude2100,false);
});
test('#112 form-embedded same-selected specs are valid',()=>{
 assert.ok(Object.values(direct(page('<form action="/cart/add">'+own+'</form>'))).every(Boolean));
});
test('#112 actual parser reads current selected Honey rather than marketing',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen112.url});
 assert.equal(p.ok,true);assert.notEqual(p.fields?.process,'Natural');
});
test('#112 historic unrelated Gesha / Pink Bourbon / Tabi cannot replace selected Castillo',()=>{
 const p=extractPublicCoffeeFacts(page(own+'<p>In a different year, he planted Gesha and Pink Bourbon at another farm.</p>'),{source_url:chosen112.url});
 assert.equal(p.ok,true);assert.ok(!String(p.fields?.variety||'').toLowerCase().includes('gesha'));
});
