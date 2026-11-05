// Original603 #18 current selected farm; all fixtures below are synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedCurrentFarmBridge} from '../src/server/coffee-identity-evidence.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const name='Honduras Sebastian Mejia Parainema Natural';
const story='Sebastian Mejia comes from a coffee-growing family. Financial challenges led his family to sell that old land, opening the door to a new beginning in La Peña, Santa Barbara. There, Sebastian and his family invested in what is now Finca Gonzalo, a 2.8-hectare farm sitting at 1,530 meters above sea level. Today, Parainema is the primary variety grown at Finca Gonzalo.';
const blocks=text=>[{tag:'p',text,educational:false,section:'About This Coffee'}];
const page=(title,body)=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+title+'</h1><p>Producer: Sebastian Mejia</p><p>Origin: Honduras</p><p>'+body+'</p></article></main></body></html>';
const parse=(title=name,body=story)=>extractPublicCoffeeFacts(page(title,body),{source_url:'https://bebrightcoffee.com/products/honduras-sebastian-mejia-parainema-natural'});
test('current selected exact producer present farm connects preceding town and region',()=>{
 const direct=selectedCurrentFarmBridge(blocks(story),{name,producer:'Sebastian Mejia',origin:'Honduras'});
 assert.equal(direct?.value,'La Peña, Santa Barbara, Honduras');
 const r=parse();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'La Peña, Santa Barbara, Honduras',JSON.stringify(r));
 assert.match(coffeeUrlPreviewMarkup(r),/La Peña, Santa Barbara, Honduras/);
});
test('generic same source pattern applies without roaster, farm or country allowlist',()=>{
 const other='The family moved to new property in Nyeri, Central Highlands. There, Victoria and her family invested in what is now Finca Summer, a 3-hectare farm growing coffee.';
 assert.equal(selectedCurrentFarmBridge(blocks(other),{name:'Kenya Victoria Adams',producer:'Victoria Adams',origin:'Kenya'})?.value,'Nyeri, Central Highlands, Kenya');
});
test('other current identity, producer, country, or conflicting origin rejects locality',()=>{
 for(const args of [
  {name:'Honduras Other Coffee',producer:'Sebastian Mejia',origin:'Honduras'},
  {name:'Sebastian Mejia Natural',producer:'Sebastian Mejia',origin:''},
  {name,producer:'Daniel Mejia',origin:'Honduras'},
  {name,producer:'Sebastian Mejia',origin:'Guatemala'},
  {name,producer:'Sebastian Mejia',origin:'Santa Maria, Honduras'}
 ])assert.equal(selectedCurrentFarmBridge(blocks(story),args),null,JSON.stringify(args));
});
test('historical and hypothetical farms without positive NOW bridge cannot donate locality',()=>{
 for(const modified of [
  story.replace('what is now','what was previously'),
  story.replace('There, Sebastian and his family','There, another family'),
  story.replace('in La Peña, Santa Barbara. There','in La Peña. There'),
  story.replace('a 2.8-hectare farm','a shipping warehouse'),
  story.replace('invested in what is now','formerly worked near'),
  story.replace('There, Sebastian','Historically, Sebastian')
 ])assert.equal(selectedCurrentFarmBridge(blocks(modified),{name,producer:'Sebastian Mejia',origin:'Honduras'}),null,modified);
});
test('related and educational prose cannot donate an exact lot locality',()=>{
 for(const section of ['Related Products','Other Coffees','What is origin?'])
  assert.equal(selectedCurrentFarmBridge([{tag:'p',text:story,section,educational:section==='What is origin?'}],
   {name,producer:'Sebastian Mejia',origin:'Honduras'}),null,section);
});
test('two different current farms in different regions are not resolved by source order',()=>{
 const extra=' A fresh start in Sierra Vista, West Plateau. There, Sebastian and his family invested in what is now Finca Alba, a 3-hectare farm growing coffee.';
 assert.equal(selectedCurrentFarmBridge(blocks(story+extra),{name,producer:'Sebastian Mejia',origin:'Honduras'}),null);
});
