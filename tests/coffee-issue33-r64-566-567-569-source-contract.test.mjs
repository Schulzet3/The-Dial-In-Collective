import test from 'node:test';
import assert from 'node:assert/strict';
import {R64_SELECTED,r64IdentityFailures,r64SelectedSourceMarkers} from '../scripts/audit/issue33-r64-566-567-569-source-contract.mjs';
const example=s=>({number:s.number,official_url:'https://'+s.host+s.path,
 final_url:'https://'+s.host+s.path,status:'FETCHED',parser_ok:true,
 selected_heading_identity_verified:true,selected_h1:[s.name],
 current_fields:{name:s.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('R64 each of three exact selected original603 product identities passes',()=>{
 for(const s of R64_SELECTED)assert.deepEqual(r64IdentityFailures(example(s)),[]);
});
test('R64 strict negative: sibling/related/recycled URL and wrong selected H1 cannot be accepted',()=>{
 for(const s of R64_SELECTED){
  for(const corrupt of [
    r=>r.official_url+='?other=1',r=>r.final_url+='?selected=another',
    r=>r.final_url='https://www.sidecarcoffee.com/products/espresso',
    r=>r.final_url='https://unauthorized.example'+s.path,
    r=>r.selected_h1=['Other coffee'],r=>r.selected_h1=[s.name,'Other coffee'],
    r=>r.current_fields.name='Other coffee',r=>r.selected_heading_identity_verified=false,
    r=>r.parser_ok=false,r=>r.status='UNAVAILABLE',
    r=>r.add_coffee_ui_rendered=false,r=>r.source_review_rendered=false,
    r=>r.number=999
  ]){const r=example(s);corrupt(r);assert.ok(r64IdentityFailures(r).length,JSON.stringify(r));}
 }
});
test('R64 direct product text markers require selected wording, not unrelated menu/marketing prose',()=>{
 const ug='Uganda Rwenzori Natural. This natural-process coffee comes from the Rwenzori mountains. Dried berry and caramel.';
 const hond='Honduras Light Roast Alexia Mejia. This washed Parainema coffee is grown by Alexia Mejia.';
 const guat='Guatemala - Finca La Bendicion. Finca La Bendición. Processing: Fully washed. Marionberry, Honeysuckle.';
 assert.deepEqual(r64SelectedSourceMarkers(hond,566),{ownProduct:true,namedPerson:true,washedMention:true,parainemaMention:true});
 assert.deepEqual(r64SelectedSourceMarkers(ug,567),{ownProduct:true,specificRegion:true,naturalMention:true,berryTaste:true});
 assert.deepEqual(r64SelectedSourceMarkers(guat,569),{ownProduct:true,namedFarm:true,typedWashed:true,ownTasting:true});
 assert.equal(r64SelectedSourceMarkers('Sidecar sells all kinds of coffee',566).ownProduct,false);
 assert.equal(r64SelectedSourceMarkers('Related coffee: Ethiopia Guji blueberry and caramel',567).ownProduct,false);
 assert.equal(r64SelectedSourceMarkers('Recommended: Guatemala other farm, tasted marionberry',569).ownProduct,false);
});
