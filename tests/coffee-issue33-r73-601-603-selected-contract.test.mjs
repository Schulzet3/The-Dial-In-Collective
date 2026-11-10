import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedZekesR73DirectEvidence as audit} from '../scripts/audit/issue33-r73-zekes-selected-contract.mjs';
const name={601:'Colombia Huila, 1 lb (16 oz)',602:'Honduras Marcala Lenca, 1 lb (16 oz)',603:'Nicaragua Segovia, 1 lb (16 oz)'};
const story={
  601:'This coffee comes to us from Asociación Regional la Cascada de Bordones (The Regional Association La Cascada de Bordones). A fully washed lot, this coffee is grown in the department of Huila at an altitude ranging from 1700-1850masl and is patio dried. Slightly acidic with notes of molasses, milk chocolate and lime.',
  602:'This medium-light roasted coffee is DIRECTLY TRADED with our friends, The Garcias, in Marcala, Honduras. With the fourth generation of Garcias comes a new drive and desire to spread Lenca Farm grown coffee.',
  603:"Over 2,300 small-scale farmers have joined together to create the Central Multiple Service Cooperative, better known as PRODECOOP. The initial coffee processing takes place on the individual farms. Sun-drying and final processing takes place at the coop's dry mill, Las Segovias, located in the town of Palacaguina. Full-bodied and low acidity with notes of almond, cocoa and caramel."
};
const wrap=(n,body=story[n])=>'<main><h1>'+name[n]+'</h1><p>'+body+'</p></main>';
for(const n of [601,602,603])test('exact selected current case '+n+' accepts own complete source',()=>{
 assert.ok(Object.values(audit(n,wrap(n),[name[n]])).every(Boolean));
});
test('reused historical 601 URL slug cannot override current selected H1',()=>{
 assert.equal(audit(601,wrap(601),['Colombian Sierra Nevada']).identity,false);
 assert.equal(audit(601,wrap(601),[name[601],name[601]]).identity,false);
});
test('unrelated association cannot supply chosen Colombian producer',()=>{
 const altered=story[601].replace('Cascada de Bordones','Other Farmers Association');
 assert.equal(audit(601,wrap(601,altered),[name[601]]).matchedAssociation,false);
});
test('related recommendation, script, aside and navigation cannot fill absent source',()=>{
 for(const n of [601,602,603]){
  const alt='<main><h1>'+name[n]+'</h1><p>No selected source details.</p><script>'+story[n]+'</script><aside>'+story[n]+'</aside><nav>'+story[n]+'</nav></main>';
  const proof=audit(n,alt,[name[n]]);
  assert.equal(Object.values(proof).filter(Boolean).length,1);
 }
});
test('historic Felipe Garcia story cannot identify the currently selected family by itself',()=>{
 assert.equal(audit(602,wrap(602,'In 1915 Felipe Garcia cultivated coffee in Marcala, Honduras.'),[name[602]]).directCurrentGarcias,false);
});
test('a mill town address cannot claim selected farms grow there',()=>{
 const p=audit(603,wrap(603),[name[603]]);
 assert.equal(p.millNotFarm,true);
 assert.equal(p.individualFarmProcessing,true);
 assert.ok(!story[603].includes('farms in Palacaguina'));
});
test('wrong processing-site town is not evidence of current mill address',()=>{
 const p=audit(603,wrap(603,story[603].replace('Palacaguina','Managua')),[name[603]]);
 assert.equal(p.millNotFarm,false);
});
test('country or selected identity swapped fails closed across merchant products',()=>{
 for(const n of [601,602,603])for(const other of [601,602,603].filter(x=>x!==n))
  assert.equal(audit(n,wrap(other),[name[other]]).identity,false);
});
