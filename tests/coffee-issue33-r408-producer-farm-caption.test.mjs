import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts,selectedLabeledPersonFarmRoles} from '../src/server/coffee-page-metadata.mjs';
const source_url='https://roaster.example/products/the-token-dark-blend';
const full='Miriam Monteiro de Aguiar: Fazenda Cachoeira';
const caption={field:'producer',label:'Producer',value:full,source_type:'html',section:'Exact selected product'};
const story={text:'This coffee comes from Miriam Monteiro de Aguiar. Miriam represents the fifth generation of coffee farmers.',educational:false};
const roles=extra=>selectedLabeledPersonFarmRoles({publishedProducer:full,sourceFacts:[caption],selectedProse:[story],...extra});
function parse(body){
 const p={'@type':'Product',name:'The Token Dark Blend',url:source_url,brand:'Favor Coffee Company'};
 return extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify(p)+
  '</script><main><h1>The Token Dark Blend</h1>'+body+'</main>',{source_url});
}
test('current selected producer person and separately named Fazenda must retain two roles',()=>{
 assert.deepEqual(roles(),{producer:'Miriam Monteiro de Aguiar',farm:'Fazenda Cachoeira',literal:full});
 const r=parse('<p>Producer: '+full+'</p><p>'+story.text+'</p><p>Process: Natural</p>');
 assert.equal(r.fields.producer,'Miriam Monteiro de Aguiar');
 assert.equal(r.roaster_details?.farm,'Fazenda Cachoeira');
 assert.equal(r.fields.process,'Natural');
 assert.ok(r.source_facts?.some(x=>x.field==='producer'&&x.value===full),'retain the seller literal');
});
test('no split from untyped, metadata, unrelated, educational or uncorroborated evidence',()=>{
 for(const invalid of [
  {sourceFacts:[]},{sourceFacts:[{...caption,source_type:'page_metadata'}]},
  {sourceFacts:[{...caption,section:'Different coffee in the source'}]},
  {sourceFacts:[{...caption,conflicting:true}]},{selectedProse:[]},
  {selectedProse:[{...story,educational:true}]},
  {selectedProse:[{text:'Producer: '+full,educational:false}]},
  {selectedProse:[{text:'This selected lot is grown by Carmen Vega.',educational:false}]},
  {existingFarm:'Fazenda Other'}
 ])assert.equal(roles(invalid),null,JSON.stringify(invalid));
});
test('reject business/collective identities, malformed values and incompatible named farms',()=>{
 for(const literal of ['Cooperative Sol: Fazenda Cachoeira',
  'Coffee Trading Group: Fazenda Cachoeira','Miriam Monteiro de Aguiar: Kenya AA',
  'Miriam Monteiro de Aguiar: Fazenda Cachoeira: Other',
  'Miriam Monteiro de Aguiar and Ana Torres: Fazenda Cachoeira']){
  assert.equal(roles({publishedProducer:literal,sourceFacts:[{...caption,value:literal}]}),null,literal);
 }
});
test('missing independent current grower evidence preserves visible source for manual review',()=>{
 const r=parse('<p>Producer: '+full+'</p><p>Process: Natural</p>');
 assert.notEqual(r.fields.producer,'Miriam Monteiro de Aguiar');
 assert.ok(r.source_facts?.some(x=>x.value===full));
 const other=parse('<p>Producer: Cooperative Sol</p><p>Grown by Maria Perez.</p>');
 assert.equal(other.fields.producer,'Cooperative Sol');
});
