import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedProducerTeamNameDisagreement as disagree} from '../src/server/coffee-page-metadata.mjs';
const selected=text=>'<main><article class="product"><h1>Granos A Cielo</h1><p>'+text+'</p></article></main>';
const clean=s=>String(s).replace(/<[^<>]*>/g,' ').replace(/\s+/g,' ').trim();
const label='Hazel Arias and Nelsyn Yoseles';
test('selected current same-coffee project team contradicts current producer surname',()=>{
 const a=disagree(selected('Granos al Cielo is a project led by Hazel Arias and Nelsyn Hernández, built on family legacy.'),{producer:label,clean});
 assert.equal(a?.label,label);assert.equal(a?.narrative,'Hazel Arias and Nelsyn Hernández');
});
test('identical product team is not contradictory',()=>assert.equal(disagree(selected('This project is led by Hazel Arias and Nelsyn Yoseles, built on family legacy.'),{producer:label,clean}),null));
test('unrelated team is not evidence for Producer conflict',()=>assert.equal(disagree(selected('This project is led by Maria Silva and Laura Hernández, built on family legacy.'),{producer:label,clean}),null));
test('same first names but no shared complete leader is not enough',()=>assert.equal(disagree(selected('This project is led by Hazel Garcia and Nelsyn Hernández, built on family legacy.'),{producer:label,clean}),null));
test('absence of a named team does not undermine selected Producer label',()=>assert.equal(disagree(selected('Washed processing, orange, chocolate and brown sugar.'),{producer:label,clean}),null));
test('one person or anonymous suppliers cannot form a selected team conflict',()=>{
 const h=selected('This project is led by Hazel Arias and Nelsyn Hernández, built on family legacy.');
 assert.equal(disagree(h,{producer:'Anonymous smallholder families',clean}),null);
 assert.equal(disagree(h,{producer:'Hazel Arias',clean}),null);
});
