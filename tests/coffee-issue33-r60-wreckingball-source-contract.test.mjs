import test from 'node:test';
import assert from 'node:assert/strict';
import {R60_CASES,r60DirectSelectedClaims,r60IdentityFailures}
 from '../scripts/audit/issue33-r60-selected-wreckingball-contract.mjs';
const positive=(s)=>({number:s.number,official_url:s.url,final_url:s.url,
 status:'FETCHED',parser_ok:true,selected_h1:[s.name],
 selected_heading_identity_verified:true,current_fields:{name:s.name},
 add_coffee_ui_rendered:true,source_review_rendered:true});
test('R60 both immutable original603 product identities require exact selected H1 and parser',()=>{
 for(const spec of R60_CASES){
  assert.deepEqual(r60IdentityFailures(positive(spec),spec),[]);
  for(const mutate of [
    r=>r.selected_h1=['Related Guatemala Coffee'],
    r=>r.current_fields.name='Recycled SEO product',
    r=>r.selected_heading_identity_verified=false,
    r=>r.final_url+='?variant=old-lot',
    r=>r.final_url='https://unrelated.example/products/coffee',
    r=>r.status='UNAVAILABLE',
    r=>r.parser_ok=false,
    r=>r.add_coffee_ui_rendered=false,
    r=>r.source_review_rendered=false]){
    const rec=positive(spec);mutate(rec);
    assert.ok(r60IdentityFailures(rec,spec).length,JSON.stringify(rec));
  }
 }
});
test('R60 genuine selected Gera region does not make named Sulladjah the sole growing location',()=>{
 const s=R60_CASES[0];
 const p=r60DirectSelectedClaims(s.name,`Region: Gera, Limmu Natural Process: Sun Dried Natural Sulladjah is a place, but this coffee is not specifically from that area alone. Tastes like: Caramel, milk chocolate with a lovely mild berry finish.`);
 assert.equal(p.labeled_region,true);
 assert.equal(p.explicitly_not_sulladjah_only,true);
 assert.equal(p.literal_process,true);
 assert.equal(p.selected_sensory,true);
 assert.equal(r60DirectSelectedClaims('Other related Ethiopian coffee','Region: Gera, Limmu').selected,false);
 assert.equal(r60DirectSelectedClaims(s.name,'Related products with Region: Sidama').labeled_region,false);
});
test('R60 only selected current 2026 Los Dos Socios farm evidence is eligible for adjudication',()=>{
 const s=R60_CASES[1];
 const text=`Country: Guatemala Region: Huehuetenago Grower: Concepción Villatoro Process: Washed, 42 hour fermentation Roast: Medium/Medium-Light We are delighted to bring you the 2026 lot. The Full Story: Finca Los Dos Socios is located in the highlands of La Libertad, Huehuetenango.`;
 const claims=r60DirectSelectedClaims(s.name,text);
 assert.equal(claims.labeled_country,true);
 assert.equal(claims.labeled_region_typo,true);
 assert.equal(claims.named_farm_growing_location,true);
 assert.equal(claims.current_2026_lot,true);
 assert.equal(claims.literal_washed,true);
 assert.equal(claims.ambiguous_roast,true);
 assert.equal(r60DirectSelectedClaims('2025 other product',text).selected,false);
 assert.equal(r60DirectSelectedClaims(s.name,text.replace('2026 lot','2024 lot')).current_2026_lot,false);
 assert.equal(r60DirectSelectedClaims(s.name,text.replace('Finca Los Dos Socios','Other Farm')).named_farm_growing_location,false);
 assert.equal(r60DirectSelectedClaims(s.name,'Country: Guatemala Region: Huehuetenago').named_farm_growing_location,false);
});
