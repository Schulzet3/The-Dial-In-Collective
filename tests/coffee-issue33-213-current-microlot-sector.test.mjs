import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentNamedMicroLotSector as detect} from '../src/server/coffee-selected-microlot-sector-origin.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Volcan 37',origin='Huehuetenango, Sierra de Los Cuchumatanes, Guatemala',producer='Juan Hernandez Aguilar';
const sentence='Cultivated in the Sierra de Los Cuchumatanes mountains of Huehuetenango, this micro-lot from Juan is located in a sector of Rio Ocho that he refers to as Q’Ail.';
const blocks=(story=sentence,additional=[])=>[
 {tag:'h1',text:name,educational:false},
 {tag:'p',text:'Origin: Guatemala',section:'',educational:false},
 {tag:'p',text:'Juan Hernandez Aguilar is a small indigenous Mayan producer. '+story,section:'Behind the Beans',educational:false},
 ...additional
];
const args=(story=sentence,more=[])=>({name,origin,producer,blocks:blocks(story,more)});
test('exact selected producer/region/lot/sector allows direct refinement',()=>{
 const result=detect(args());
 assert.equal(result?.value,'Q’Ail, Rio Ocho, Huehuetenango, Guatemala');
 assert.match(result.quote,/micro-lot from Juan/);
});
test('identity, region, producer and directly printed country all must match',()=>{
 const a=args();
 for(const bad of [
  {...a,name:'Other coffee'},
  {...a,origin:'Kigali, Sierra de Los Cuchumatanes, Guatemala'},
  {...a,origin:'Huehuetenango, Andes, Guatemala'},
  {...a,producer:'Santos Aguilar'},
  {...a,blocks:blocks().filter(b=>b.tag!=='h1')},
  {...a,blocks:blocks().filter(b=>!b.text.startsWith('Origin:'))},
  {...a,blocks:blocks().map(b=>b.text==='Origin: Guatemala'?{...b,text:'Origin: Kenya'}:b)},
  {...a,blocks:blocks().map(b=>b.tag==='h1'?{...b,text:'Different coffee'}:b)}
 ])assert.equal(detect(bad),null,JSON.stringify(bad).slice(0,220));
});
test('stale/related/hypothetical/second competing current sectors withheld',()=>{
 for(const s of [
  'Previously '+sentence,'Our other coffee: '+sentence,'Hypothetical: '+sentence,
  'This coffee is processed at Rio Ocho, not grown there.',
  sentence.replace('from Juan','from Alice')
 ])assert.equal(detect(args(s)),null,s);
 assert.equal(detect({...args(),blocks:blocks(sentence,[
  {tag:'p',text:sentence.replace('Q’Ail','Q’Another'),section:'Behind the Beans',educational:false}
 ])}),null);
 assert.equal(detect({...args(),blocks:blocks(sentence,[
  {tag:'p',text:'Origin: Kenya',section:'Behind the Beans',educational:false}
 ])}),null);
 assert.equal(detect({...args(),blocks:blocks(sentence).map(b=>b.section==='Behind the Beans'?{...b,educational:true}:b)}),null);
 assert.equal(detect({...args(),blocks:blocks(sentence).map(b=>b.section==='Behind the Beans'?{...b,section:'Other coffees'}:b)}),null);
});
test('synthetic exact current page continues rendering Add Coffee and Source Review',()=>{
 const html='<html><body><main><h1>Volcan 37</h1><p>Roast: Medium</p><p>Origin: Guatemala</p>'+
 '<p>Producer: Juan Hernandez Aguilar</p><h6>Behind the Beans</h6>'+
 '<p>Juan Hernandez Aguilar is a small indigenous Mayan producer who speaks Mam. '+sentence+'</p>'+
 '</main></body></html>';
 const url='https://mapscoffee.com/products/volcan-37';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true);
 assert.match(coffeeUrlPreviewMarkup(result),/coffee-url-preview/);
 assert.ok(coffeeSourceReviewSnapshot({...result,source_url:url}));
 // Real full selected official HTML acceptance is required after merge.
 assert.ok(!String(result.fields?.origin||'').includes('Q’Ail')||
  result.fields.origin==='Q’Ail, Rio Ocho, Huehuetenango, Guatemala');
});
