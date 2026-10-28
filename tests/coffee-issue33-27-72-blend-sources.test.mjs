import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractSelectedBlendCommunityCredit} from '../src/server/coffee-blend-evidence.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';

const origin='Guatemala / Nicaragua';
const intro='The Horizon Organic blend features two great coffee communities sharing one vision of producing high-quality coffee through sustainable, organic practices. ';
const chapter='Huehuetenango, Guatemala, buried deep in the mountainous region of the country that borders Mexico, is home to some of the best coffees in Guatemala. It is also the home of one of Thrive’s favorite organic producing communities, ACODIHUE. ACODIHUE is an association of mostly women who grow organic coffee.';
const widget='<div id="meet-farmers-inline"><h3 class="mf-meet-kicker">MEET Marta Solares</h3><h2>Marta Solares</h2><h3>FARM:</h3><p>La Esperanza</p><h3>REGION:</h3><p>San Jose Pinula, Guatemala</p></div>';
function page({name='Horizon Organic',introText=intro,body=chapter,country=origin,includeWidget=true}={}){
 return '<main><h1>'+name+'</h1><p>Origin: '+country+'</p>'+
  '<p>Region: Huehuetenango(GT) / Matagalpa(NI)</p><p>Roast: Medium</p>'+
  '<p>Tasting Notes: Fruity, Toasted Cereal, Chocolate</p>'+
  '<p>Process: Washed</p><p>Varietal: Caturra, Pache Verde</p><p>Elevation: 1750 masl</p>'+
  '<p>'+introText+body+'</p>'+(includeWidget?widget:'')+'</main>';
}
const url='https://thrivefarmers.com/products/horizon-organic';
test('#72 exact current multi-origin blend has named Guatemalan community but no whole-blend producer',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.producer,undefined);
 assert.equal(r.fields.roast_level,'Medium');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.tasting_notes,'Fruity, Toasted Cereal, Chocolate');
 assert.match(r.fields.origin||'',/Guatemala/);
 assert.match(r.fields.origin||'',/Nicaragua/);
 assert.match(r.roaster_details?.blend_components||'',/Guatemala \(Huehuetenango\): ACODIHUE/);
 assert.match(r.roaster_details?.blend_components||'',/component only/);
 assert.match(r.producer_review_note||'',/ACODIHUE.*Guatemala.*Nicaragua/);
 assert.ok(!r.conflicts?.includes('producer'));
 assert.ok(r.source_facts?.some(f=>f.field==='component_producer'&&f.value==='ACODIHUE'&&f.source_url===url));
 const preview=coffeeUrlPreviewMarkup({...r,source:'official_roaster_product_metadata',source_url:url});
 assert.match(preview,/Producer review:/);
 assert.match(preview,/ACODIHUE/);
 assert.doesNotMatch(preview,/<dt>Producer<\/dt><dd>ACODIHUE/);
 assert.doesNotMatch(JSON.stringify(r.fields),/Marta Solares|La Esperanza/);
 const snapshot=coffeeSourceReviewSnapshot({...r,source_url:url},{checkedAt:'2026-10-28T00:00:00Z'});
 assert.match(snapshot.producer_review_note,/ACODIHUE/);
 assert.match(snapshot.roaster_details.blend_components,/component only/);
 assert.ok(snapshot.published_source_information.some(f=>f.field==='component_producer'&&f.value==='ACODIHUE'));
});
test('#72 component credit is never included in Add Coffee autofill persistence',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 const producer={value:'',tagName:'INPUT',dispatchEvent(){}};
 const form={elements:{namedItem(name){return name==='producer'?producer:null;}}};
 assert.deepEqual(applyCoffeeUrlFields(form,r),{filled:0,skipped:0});
 assert.equal(producer.value,'');
});
test('component association is withheld for single-origin, wrong product identity, generic or vague narrative',()=>{
 for(const html of [
  page({country:'Guatemala'}),
  page({name:'Other coffee'}),
  page({body:'This coffee comes from Guatemala. A roaster education guide discusses ACODIHUE in general, without any selected component credit.'}),
  page({body:'Huehuetenango, Guatemala is home to ACODIHUE. This coffee is locally roasted.'})
 ]){
  const r=extractPublicCoffeeFacts(html,{source_url:url});
  assert.equal(r.ok,true);
  assert.equal(r.producer_review_note,undefined);
  assert.ok(!r.roaster_details?.blend_components?.includes('ACODIHUE (named producing community'));
 }
 assert.equal(extractSelectedBlendCommunityCredit('',{name:'Horizon Organic',origin,clean:x=>x}),null);
});
test('detached farmer biography cannot populate canonical Producer or component community',()=>{
 const onlyBio=page({body:'Our coffee comes from organic farms.'}).replace(widget,
  '<div id="meet-farmers-inline"><h3 class="mf-meet-kicker">MEET Marta Solares</h3><p>'+intro+chapter+'</p>'+
  '<h3>FARM:</h3><p>La Esperanza</p></div>');
 const r=extractPublicCoffeeFacts(onlyBio,{source_url:url});
 assert.equal(r.producer_review_note,undefined);
 assert.equal(r.fields.producer,undefined);
 assert.doesNotMatch(JSON.stringify(r.fields),/La Esperanza/);
});
test('ambiguous component countries do not receive a producer guess',()=>{
 const r=extractPublicCoffeeFacts(page({body:'Huehuetenango, Guatemala and Matagalpa, Nicaragua are home to coffee farmers. '+chapter}),{source_url:url});
 assert.equal(r.producer_review_note,undefined);
});
test('#27 exact natural reserve, broader Ecuador and source producer agree; contradictory country blocks origin',()=>{
 const source='https://www.greatcirclecoffee.com/products/la-josefina-sudan-rume';
 const html='<main><h1>La Josefina Sudán Rumé / Natural Extended Fermentation</h1>'+
  '<p>Origin: Ecuador</p><p>Region: Cayambe-Coca Natura Reserve</p>'+
  '<p>Location: Cayambe-Coca Natural Reserve, Ecuador</p>'+
  '<p>Producer: Leopoldo Andrade / Ligia Merizalde</p></main>';
 const r=extractPublicCoffeeFacts(html,{source_url:source});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Cayambe-Coca Natural Reserve, Ecuador');
 assert.equal(r.fields.producer,'Leopoldo Andrade / Ligia Merizalde');
 assert.ok(!r.conflicts?.includes('origin'));
 const opposite=extractPublicCoffeeFacts(html.replace('Origin: Ecuador','Origin: Peru'),{source_url:source});
 assert.equal(opposite.fields.origin,undefined);
 assert.ok(opposite.conflicts?.includes('origin'));
});
