import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCoffeeSourceFacts,reconcileSelectedCoffeeReviewActorRoles} from '../src/server/coffee-source-facts.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://onyxcoffeelab.com/products/mexico-finca-santa-cruz-gesha';
const chosen='Mexico Finca Santa Cruz Gesha';
const raw='<html><body><main><article><h1>'+chosen+'</h1><div class="product__description">'+
 '<dl><dt>F i n c a</dt><dd>S a n t a</dd></dl>'+
 '<section><h2>Harvest</h2><p>Harvest: Mexico</p><p>Harvest: 2025/26</p></section>'+
 '<p>Producer: José “Pepe” Argüello</p><p>Process: Washed</p><p>Origin: Chiapas, Mexico</p>'+
 '</div></article></main></body></html>';
test('R342 retain animated-label and educational harvest literal evidence without false review field roles',()=>{
 const facts=collectCoffeeSourceFacts(raw,{name:chosen,source_url:url});
 const farm=facts.find(f=>f.label==='F i n c a'&&f.value==='S a n t a');
 const wrongHarvest=facts.find(f=>f.label==='Harvest'&&f.value==='Mexico');
 assert.ok(farm,'literal animated title fragment retained');
 assert.ok(wrongHarvest,'literal educational harvest country retained');
 assert.ok(!farm.field,'animated fragment cannot become producer');
 assert.ok(!wrongHarvest.field,'country heading cannot become release');
 assert.ok(facts.some(f=>f.label==='Producer'&&f.value.includes('Argüello')&&f.field==='producer'),'real grower still typed');
 assert.ok(facts.some(f=>f.label==='Process'&&f.value==='Washed'&&f.field==='process'),'true process still typed');
});
test('R342 final merge of selected review facts does not re-tag animated text or country-only Harvest',()=>{
 const data=[
  {label:'F i n c a',value:'S a n t a',field:'producer',source_url:url,source_type:'html'},
  {label:'Harvest',value:'Mexico',field:'release_label',section:'Harvest',source_url:url,source_type:'html'},
  {label:'Producer',value:'José “Pepe” Argüello',field:'producer',source_url:url,source_type:'html'},
  {label:'Harvest',value:'2025/26',field:'release_label',section:'Harvest',source_url:url,source_type:'html'},
  {label:'Process',value:'Washed',field:'process',source_url:url,source_type:'html'}
 ];
 const out=reconcileSelectedCoffeeReviewActorRoles(data,{source_url:url,selected_producer:'José “Pepe” Argüello'});
 assert.ok(!out[0].field);assert.ok(!out[1].field);
 assert.equal(out[2].field,'producer');assert.equal(out[3].field,'release_label');assert.equal(out[4].field,'process');
 assert.equal(out[0].value,'S a n t a');assert.equal(out[1].value,'Mexico');
});
test('R342 neg: similarly named other lot and genuine release remain independent',()=>{
 const facts=collectCoffeeSourceFacts('<main><article><h1>'+chosen+'</h1><p>Producer: María Santos</p>'+
 '<p>Release: Lot SC-2244</p><p>Process: Washed</p></article></main>',{name:chosen,source_url:url});
 assert.ok(facts.some(x=>x.field==='producer'&&x.value.includes('María Santos')));
 assert.ok(facts.some(x=>x.field==='release_label'&&x.value.includes('Lot SC-2244')));
 assert.ok(facts.some(x=>x.field==='process'&&x.value==='Washed'));
});
test('R342 canonical selected provenance remains a named grower, not animation or education',()=>{
 const parsed=extractPublicCoffeeFacts(raw,{source_url:url});
 assert.equal(parsed.ok,true);
 assert.notEqual(parsed.fields?.producer,'S a n t a');
 assert.notEqual(parsed.fields?.release_label,'Mexico');
 assert.notEqual(parsed.fields?.process,'Natural');
});
