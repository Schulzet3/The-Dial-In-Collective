import test from 'node:test';
import assert from 'node:assert/strict';
import {R61_SELECTED,r61IdentityFailures,r61CurrentGujiEvidence} from '../scripts/audit/issue33-r61-573-selected-guji-contract.mjs';
const s=R61_SELECTED;
const fixture=()=>({
 number:573,official_url:'https://'+s.host+s.path,
 final_url:'https://'+s.host+s.path,status:'FETCHED',parser_ok:true,
 selected_heading_identity_verified:true,selected_h1:[s.name],
 current_fields:{name:s.name,origin:'Ethiopia'},
 add_coffee_ui_rendered:true,source_review_rendered:true
});
test('R61 exact current selected coffee identity and UI review guard',()=>{
 assert.deepEqual(r61IdentityFailures(fixture()),[]);
});
test('R61 rejects alternate product, slug/SEO, missing H1 and preview failures',()=>{
 const changes=[
  r=>r.number=572,r=>r.official_url='https://other.example/coffee',
  r=>r.final_url+='?preview=1',r=>r.final_url='https://www.stageline.coffee/product-page/other',
  r=>r.selected_h1=['Worasa Daniel Mijane'],r=>r.selected_h1=[],
  r=>r.current_fields.name='Previous Worka Sakaro',r=>r.selected_heading_identity_verified=false,
  r=>r.parser_ok=false,r=>r.status='UNAVAILABLE',
  r=>r.add_coffee_ui_rendered=false,r=>r.source_review_rendered=false
 ];
 for(const change of changes){const r=fixture();change(r);assert.ok(r61IdentityFailures(r).length,JSON.stringify(r));}
});
test('R61 requires explicit this-current-lot growing region, not generic Guji education or previous lot',()=>{
 const actual='Another beautiful washed Ethiopian coffee from Negusse Debla, same producer of our previous Worka Sakaro lot. This time from the Guji region and a Grade 1. Guji has quite the reputation. Process: Washed';
 assert.deepEqual(r61CurrentGujiEvidence(actual),{directCurrentSelectedGuji:true,priorLotMention:true,selectedWashed:true});
 assert.equal(r61CurrentGujiEvidence('Guji has quite the reputation for the best coffees.').directCurrentSelectedGuji,false);
 assert.equal(r61CurrentGujiEvidence('Our previous Worka Sakaro lot came from Guji region.').directCurrentSelectedGuji,false);
 assert.equal(r61CurrentGujiEvidence('This time from Guji region.').directCurrentSelectedGuji,true);
 assert.equal(r61CurrentGujiEvidence('This coffee is Ethiopia.').directCurrentSelectedGuji,false);
});
