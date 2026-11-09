import test from 'node:test';
import assert from 'node:assert/strict';
import {R65_SELECTED,r65IdentityFailures,r65SelectedLotEvidence} from '../scripts/audit/issue33-r65-579-source-contract.mjs';
const s=R65_SELECTED;
const current=()=>({
 number:s.number,official_url:'https://'+s.host+s.path,final_url:'https://'+s.host+s.path,
 status:'FETCHED',parser_ok:true,selected_heading_identity_verified:true,
 selected_h1:[s.name],current_fields:{name:s.name},
 add_coffee_ui_rendered:true,source_review_rendered:true
});
test('R65 exact current original603 #579 identity and actual preview contract',()=>{
 assert.deepEqual(r65IdentityFailures(current()),[]);
});
test('R65 rejects foreign product, recycled slug, SEO identities, redirects, and disabled UI',()=>{
 const attacks=[
 r=>r.number=580,r=>r.official_url+='?other=1',
 r=>r.final_url='https://www.swroasting.coffee/product/colombia-something/DIFFERENT',
 r=>r.final_url='https://evil.example/product/colombia-camacho-fragancia/XOJGV4EZXCTPBXV6RSP4SGVF',
 r=>r.final_url+='?lot=old',r=>r.final_url+='#archived',
 r=>r.selected_h1=[],r=>r.selected_h1=['Colombia Camacho Fragancia','Other coffee'],
 r=>r.selected_h1=['Colombia Campo Hermoso'],r=>r.current_fields.name='Colombia Campo Hermoso',
 r=>r.selected_heading_identity_verified=false,r=>r.status='UNAVAILABLE',
 r=>r.parser_ok=false,r=>r.add_coffee_ui_rendered=false,
 r=>r.source_review_rendered=false
 ];
 for(const edit of attacks){const row=current();edit(row);
   assert.ok(r65IdentityFailures(row).length,JSON.stringify(row));}
});
test('R65 exact same-product measured growing-region clause, no sibling/old-lot inference',()=>{
 const t='This Washed Fragancia is a very light, soft and elegant cup, with dragonfruit, starfruit, and hints of fresh basil in the finish. This is a stellar megalight roast. Roast Color: 149.3 (higher is lighter - this is incredibly light). Fragancia varietal grown by Luis Édgar Camacho in the Southern Huila region, Palestina, Santa Bárbara. Fully Washed Process, Overripe picking, 48 hr in-husk resting, 48 hr closed dry mass fermentation, Greenhouse drying for 15 days, 1720 masl.';
 assert.deepEqual(r65SelectedLotEvidence(t),{
  directSelectedGrowerAndRegion:true,directSelectedWashed:true,
  directSelectedElevation:true,directSelectedFlavors:true,
  numericRoastSampleUnqualified:true
 });
 for(const hostile of [
  'Other coffee from Southern Huila, Palestina, Santa Bárbara.',
  'Fragancia varietal grown by Luis Édgar Camacho in a previous lot.',
  'The Southern Huila region in Colombia grows many coffees.',
  'Related item: Luis Camacho - Colombia; unrelated Huila region.',
  'Fragancia grown by another family in the Southern Huila region, Palestina, Santa Bárbara.'
 ])assert.equal(r65SelectedLotEvidence(hostile).directSelectedGrowerAndRegion,false,hostile);
});
