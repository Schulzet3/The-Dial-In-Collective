import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedFoundedFarmerOrganization} from '../src/server/coffee-narrative-evidence.mjs';
import {selectedFruityCoffeeNarrative} from '../src/server/coffee-flavor-evidence.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const originUrl='https://blackriverroasters.com/products/organic-honduras-comsa';
const formed='In the year 2000, 62 Honduran coffee farmers joined together with a common goal to transform their farms from conventional to organic production and formed COMSA (Cafe Organico Marcala, S.A).';
const page=(name,body)=>'<main><h1>'+name+'</h1><div itemprop="description"><p>'+body+'</p></div></main>';

test('#10 named farmer-founded organization is a selected producer, not a general inferred grower',()=>{
 assert.equal(selectedFoundedFarmerOrganization([formed],'Organic Honduras COMSA'),'COMSA');
 const result=extractPublicCoffeeFacts(page('Organic Honduras COMSA',formed),{source_url:originUrl});
 assert.equal(result.ok,true);
 assert.equal(result.fields.producer,'COMSA');
 assert.match(coffeeUrlPreviewMarkup(result),/COMSA/);
});
test('#10 farming history cannot donate COMSA to a different selected coffee',()=>{
 for(const name of ['Organic Honduras Other','Honduras COMSAX','COMSA-style Blend']){
  assert.equal(selectedFoundedFarmerOrganization([formed],name),'');
  const result=extractPublicCoffeeFacts(page(name,formed),{source_url:originUrl});
  assert.notEqual(result.fields.producer,'COMSA');
 }
 assert.equal(selectedFoundedFarmerOrganization(['The roaster sells a COMSA coffee.'],'Organic Honduras COMSA'),'');
 assert.equal(selectedFoundedFarmerOrganization(['62 coffee farmers formed OTHER (a collective) and 80 farmers formed COMSA (another)'],'Organic Honduras COMSA'),'');
});
const woodshed='Our Ethiopian coffee is very fruity, clean body with stone fruits such as orange blossom with a crisp finish.';
const tastingUrl='https://www.woodshedroast.com/products/ethiopian';
test('#75 selected coffee sensory narrative supplies only its literal descriptors',()=>{
 const html=page('Ethiopian | Single Origin Coffee',woodshed);
 const extracted=selectedFruityCoffeeNarrative(html,{clean:(value,max)=>String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max)});
 assert.equal(extracted,'fruity, stone fruits, orange blossom');
 const result=extractPublicCoffeeFacts(html,{source_url:tastingUrl});
 assert.equal(result.ok,true);
 assert.equal(result.fields.tasting_notes,'fruity, stone fruits, orange blossom');
 assert.match(coffeeUrlPreviewMarkup(result),/orange blossom/);
});
test('#75 regional education and other products cannot supply selected flavors',()=>{
 for(const [name,story] of [
  ['Colombia Coffee',woodshed],
  ['Ethiopian Coffee','Ethiopian coffee is very fruity, clean body with stone fruits such as orange blossom with a crisp finish.'],
  ['Ethiopian Coffee','Our Ethiopian coffee was historically very fruity, clean body with stone fruits such as orange blossom with a crisp finish.'],
  ['Kenya Coffee','Our Ethiopian coffee is very fruity, clean body with stone fruits such as orange blossom with a crisp finish.']
 ]){
  const html=page(name,story);
  assert.equal(selectedFruityCoffeeNarrative(html,{clean:(value,max)=>String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}),'');
 }
});
