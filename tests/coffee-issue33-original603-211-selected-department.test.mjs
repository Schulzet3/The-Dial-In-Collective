import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentColombianDepartmentOrigin as detect} from '../src/server/coffee-selected-department-origin.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://mapscoffee.com/products/emerald-of-the-andes';
const claim='These beans come from the Nariño department, which was named after a Colombian patriot and champion of human rights in Latin America.';
const html=s=>'<html><body><main><h1>Emerald of the Andes</h1><p>Roast: Medium</p><p>Origin: Colombia</p><h6>Behind the Beans</h6><p>'+s+'</p><p>Sourced from small family farms, each producer picks their coffee.</p></main></body></html>';
const blocks=(s,additional=[])=>[
 {tag:'h1',text:'Emerald of the Andes',start:0,end:22,educational:false},
 {tag:'p',text:'Origin: Colombia',start:23,end:50,educational:false},
 {tag:'p',text:s,start:51,end:300,educational:false},
 {tag:'p',text:'Sourced from small family farms',start:301,end:400,educational:false},
 ...additional
];
test('real parser source-bound present Colombian department and UI review',()=>{
 const r=extractPublicCoffeeFacts(html(claim),{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Nariño, Colombia');
 assert.match(coffeeUrlPreviewMarkup(r),/Nariño/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
 assert.ok(r.source_facts.some(f=>/Nariño department/.test(f.value)&&f.field==='origin'));
});
test('exact selected identity, explicit Colombia caption and current growers required',()=>{
 assert.equal(detect({name:'Emerald of the Andes',origin:'Colombia, Latin America',blocks:blocks(claim)})?.value,'Nariño, Colombia');
 for(const args of [
 {name:'Other coffee',origin:'Colombia',blocks:blocks(claim)},
 {name:'Emerald of the Andes',origin:'Kenya',blocks:blocks(claim)},
 {name:'Emerald of the Andes',origin:'Colombia',blocks:blocks(claim).slice(0,3)},
 {name:'Emerald of the Andes',origin:'Colombia',blocks:blocks(claim).filter(b=>!b.text.startsWith('Origin:'))}
 ])assert.equal(detect(args),null);
});
test('previous lot, general geography, other source and current conflicts never fill',()=>{
 for(const s of ['Colombia and the Andes are in Latin America.',
 'Previously these beans come from the Nariño department.',
 'These beans used to come from the Nariño department.',
 'Our other coffee comes from the Nariño department.'])
 assert.equal(detect({name:'Emerald of the Andes',origin:'Colombia',blocks:blocks(s)}),null,s);
 assert.equal(detect({name:'Emerald of the Andes',origin:'Colombia',blocks:blocks(claim,[
  {tag:'p',text:'These beans come from the Huila department.',start:401,end:480,educational:false}
 ])}),null);
 assert.equal(detect({name:'Emerald of the Andes',origin:'Colombia',blocks:blocks(claim,[
  {tag:'p',text:'Origin: Huila, Colombia',start:401,end:480,educational:false}
 ])}),null);
});
