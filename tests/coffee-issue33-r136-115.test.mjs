import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen115,selected115Source} from '../scripts/audit/issue33-r136-115-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>Producer: Fikri Raihan Hakim - Frinsa Estate</p>'+
 '<p>Origin: Pangalengan, Garut, West Java, Indonesia</p>'+
 '<p>Elevation: 1350-1700 MASL</p><p>Variety: Field Blend</p>'+
 '<p>Process: Wet Hulled</p><p>Roast Level: Light-Medium</p>'+
 '<p>Flavor Notes: Orange, Graham Cracker, Pu-erh Tea</p>'+
 '<p>This Frinsa lot is processed via wet hulling which is a processing method born out of microclimate.</p>';
const page=(desc=own,h1='Frinsa',elsewhere='',seo='Historic Frinsa Lactic Honey')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+desc+
 '</section></article></main>'+elsewhere+'</body></html>';
const facts=html=>selected115Source(html).direct;
test('#115 exact Frinsa selected H1 and eight product-own direct facts',()=>{
 const d=selected115Source(page());
 assert.equal(d.exactH1,true);assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
});
test('#115 replacement current H1 cannot inherit archived Frinsa',()=>{
 assert.equal(selected115Source(page(own,'New Frinsa Lactic Honey')).exactH1,false);
});
test('#115 stale honey slug and SEO cannot replace missing current Wet Hulled',()=>{
 assert.equal(facts(page(own.replace('Process: Wet Hulled','Process: Not published'))).wetHulled,false);
});
test('#115 unrelated sidebar cannot provide missing exact process',()=>{
 assert.equal(facts(page(own.replace('Process: Wet Hulled','Process: Not published'),'Frinsa','<aside>'+own+'</aside>')).wetHulled,false);
});
test('#115 navigation cannot provide missing current own origin',()=>{
 assert.equal(facts(page(own.replace('Pangalengan, Garut, West Java, Indonesia','Origin not published'),'Frinsa','<nav>'+own+'</nav>')).currentOrigin,false);
});
test('#115 footer cannot provide current own notes',()=>{
 assert.equal(facts(page(own.replace('Pu-erh Tea','not printed'),'Frinsa','<footer>'+own+'</footer>')).threeNotes,false);
});
test('#115 does not infer another coffee producer from product recommendation',()=>{
 assert.equal(facts(page(own.replace('Fikri Raihan Hakim - Frinsa Estate','not published'),'Frinsa','<aside>'+own+'</aside>')).currentProducer,false);
});
test('#115 own Frinsa current lot quote is required, not general processing explanation',()=>{
 assert.equal(facts(page(own.replace('This Frinsa lot is processed via wet hulling','Other farms may use wet hulling'))).ownLotWetHulling,false);
});
test('#115 selected elevation is not inferred from sidebar',()=>{
 assert.equal(facts(page(own.replace('1350-1700 MASL','elevation not published'),'Frinsa','<aside>'+own+'</aside>')).currentElevation,false);
});
test('#115 form-embedded selected description remains valid',()=>{
 assert.ok(Object.values(facts(page('<form action="/cart/add">'+own+'</form>'))).every(Boolean));
});
test('#115 actual parser cannot infer Honey from reused historical URL slug',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen115.url});
 assert.equal(p.ok,true);assert.notEqual(p.fields?.process,'Honey');
});
test('#115 literal Wet Hulled is not a Washed or Natural subtype',()=>{
 for(const body of ['<p>Process: Wet Hulled</p>','<p>Process: Giling Basah</p>']){
  const p=extractPublicCoffeeFacts(page(body),{source_url:chosen115.url});
  assert.notEqual(p.fields?.process,'Washed');assert.notEqual(p.fields?.process,'Natural');
 }
});
