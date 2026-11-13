// Issue #33 R180: six selected Chiapas communities are geographic source credits, not six named producers.
// Synthetic role regression. Exact current official HTML/actual parser was independently proven in R179.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://others.coffee/products/out-side-dark-brazil';
const h1='OUT SIDE | DARKER ROAST | MEXICO';
const communitySentence='Hey! So, this coffee was produced by smallholder growers across the Chiapas communities of Chilon, Simojovel, Yalajon, Sitala, Sabanila, and Ocosingo.';
const facts='<p>PROCESS -- WASHED</p><p>REGION -- CHIAPAS, MEXICO</p><p>ALTITUDE -- 900-1250 MASL</p><p>CULTIVARS -- TYPICA AND BOURBON</p><p>NOTES -- COCOA, CARAMEL, BROWN SPICE</p>';
function parse({story=communitySentence,related=''}={}){
 const html='<html><head><title>Former Peru page</title><meta name="description" content="Older Brazilian roast"></head><body>'+
 '<main><article class="product"><h1>'+h1+'</h1>'+facts+'<p>'+story+'</p></article></main>'+
 related+'<footer>Prior Colombia DARKER ROAST</footer></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#255 chosen coffee credits actual smallholder grower cohort, not six named farms',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r).slice(0,2200));
 assert.equal(r.fields?.producer,'smallholder growers',JSON.stringify(r.fields));
 assert.match(String(r.fields?.origin||''),/chiapas.*mexico/i);
 assert.equal(r.fields?.process,'Washed');
});
test('#255 six named communities do not become fabricated named people, farms or cooperatives',()=>{
 const r=parse();const producer=String(r.fields?.producer||'');
 for(const town of ['Chilon','Simojovel','Yalajon','Sitala','Sabanila','Ocosingo'])
  assert.ok(!producer.toLowerCase().includes(town.toLowerCase()),town+' improperly in producer: '+producer);
 assert.ok(!/^(?:six|6)\s+(?:farms|producers)/i.test(producer),producer);
});
test('#255 current selected producer credit cannot be replaced by unrelated named estates or prior lots',()=>{
 const related='<aside class="related-products"><h2>Peru last lot</h2><p>Producer: Chilon Estate; natural, cherry</p></aside>'+
 '<section class="customer-reviews"><p>Previously sold Colombia coffee with Sabanila Farm</p></section>';
 const r=parse({related});assert.equal(r.ok,true,JSON.stringify(r).slice(0,1800));
 assert.equal(r.fields?.producer,'smallholder growers',JSON.stringify(r.fields));
 assert.ok(!/peru|brazil|colombia/i.test(String(r.fields?.origin||'')),JSON.stringify(r.fields));
 assert.ok(!/cherry/i.test(String(r.fields?.tasting_notes||'')),JSON.stringify(r.fields));
});
