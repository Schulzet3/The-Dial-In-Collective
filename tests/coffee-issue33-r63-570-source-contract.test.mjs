import test from 'node:test';
import assert from 'node:assert/strict';
import {R63_SELECTED,r63IdentityFailures,r63CurrentLodozaEvidence} from '../scripts/audit/issue33-r63-570-source-contract.mjs';
const s=R63_SELECTED;
const selected=()=>({
 number:570,official_url:'https://'+s.host+s.path,final_url:'https://'+s.host+s.path,
 status:'FETCHED',parser_ok:true,selected_heading_identity_verified:true,
 selected_h1:[s.name],current_fields:{name:s.name,origin:'El Paraíso, Honduras'},
 add_coffee_ui_rendered:true,source_review_rendered:true
});
test('R63 selected current original603 #570 and actual UI identity contract',()=>{
 assert.deepEqual(r63IdentityFailures(selected()),[]);
});
test('R63 rejects reused slug/other product/foreign domain, identity and UI failures',()=>{
 const edits=[
 r=>r.number=569,r=>r.official_url='https://www.slowburncoffee.com/products/other',
 r=>r.final_url='https://www.slowburncoffee.com/products/guatemala-finca-la-bendicion',
 r=>r.final_url='https://www.untrusted.example/products/honduras-expreso-paraiseno',
 r=>r.final_url+='?unreviewed=1',r=>r.final_url+='#more',
 r=>r.selected_h1=['Guatemala - Finca La Bendicion'],
 r=>r.selected_h1=[],r=>r.selected_h1=[s.name,'Other coffee'],
 r=>r.current_fields.name='Other coffee',r=>r.selected_heading_identity_verified=false,
 r=>r.parser_ok=false,r=>r.status='UNAVAILABLE',
 r=>r.add_coffee_ui_rendered=false,r=>r.source_review_rendered=false
 ];
 for(const edit of edits){const r=selected();edit(r);
  assert.ok(r63IdentityFailures(r).length,JSON.stringify(r));}
});
test('R63 selected direct growing-locality wording is required, not a sibling or generic country fact',()=>{
 const direct='In the Lodoza, El Paraíso region of Honduras, the Padilla family acquired land in 2019 that today is Finca Expreso Paraiseño. Today, Javier Padilla is committed to growing excellent quality coffee. The coffee grown at the farm is the product of commitment, grown from the beautiful lands of La Lodoza, El Paraíso, with plenty of passion. Farm: Expreso Paraiseño Region: El Paraiso Owner: Gerardo Peñalva Processing: Fully washed';
 const fact=r63CurrentLodozaEvidence(direct);
 assert.deepEqual(fact,{selectedCurrentFarm:true,selectedGrowingLocality:true,
  selectedRegionSpec:true,selectedWashedSpec:true,selectedTypedOwner:true,
  separatePadillaNarrative:true});
 assert.equal(r63CurrentLodozaEvidence('Honduras coffee often grows in El Paraíso.').selectedGrowingLocality,false);
 assert.equal(r63CurrentLodozaEvidence('Other coffee grown at the farm is from La Lodoza, El Paraíso.').selectedGrowingLocality,false);
 assert.equal(r63CurrentLodozaEvidence('This farm was processed in La Lodoza, El Paraíso.').selectedGrowingLocality,false);
 assert.equal(r63CurrentLodozaEvidence('Producer Gerardo Peñalva, other coffee from La Lodoza.').selectedGrowingLocality,false);
 assert.equal(r63CurrentLodozaEvidence('This product is Honduras, process washed.').selectedGrowingLocality,false);
});