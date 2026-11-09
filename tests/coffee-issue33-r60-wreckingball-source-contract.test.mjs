import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentTypedRoastLevel as refine} from '../src/server/coffee-selected-typed-roast-level.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
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
 const text=`Country: Guatemala Region: Huehuetenago Grower: Concepción Villatoro Process: Washed, 42 hour fermentation Roast: medium level We are delighted to bring you the 2026 lot. The Full Story: Finca Los Dos Socios is located in the highlands of La Libertad, Huehuetenango.`;
 const claims=r60DirectSelectedClaims(s.name,text);
 assert.equal(claims.labeled_country,true);
 assert.equal(claims.labeled_region_typo,true);
 assert.equal(claims.named_farm_growing_location,true);
 assert.equal(claims.current_2026_lot,true);
 assert.equal(claims.literal_washed,true);
 assert.equal(claims.ambiguous_roast,false);
 assert.equal(claims.direct_medium_level,true);
 assert.equal(r60DirectSelectedClaims('2025 other product',text).selected,false);
 assert.equal(r60DirectSelectedClaims(s.name,text.replace('2026 lot','2024 lot')).current_2026_lot,false);
 assert.equal(r60DirectSelectedClaims(s.name,text.replace('Finca Los Dos Socios','Other Farm')).named_farm_growing_location,false);
 assert.equal(r60DirectSelectedClaims(s.name,'Country: Guatemala Region: Huehuetenago').named_farm_growing_location,false);
});

const currentName='Guatemala Huehuetenango Los Dos Socios';
const currentOrigin='Huehuetenago, Guatemala';
const compound='Country: Guatemala, Region: Huehuetenago, Farm: Finca Los Dos Socios, Grower: Concepción Villatoro, Varieties: Bourbon and Caturra, Grade: SHG+,Process: washed, 42 hour fermentation, 12 hours drying on clay patio, Roast: medium level';
const selected=(text=compound,name=currentName)=>[
 {tag:'h1',text:name},{tag:'p',text,section:'What’s in it:',educational:false}
];
test('R60 directly selected compound medium level is parsed and displayed in real preview',()=>{
 assert.equal(refine({name:currentName,origin:currentOrigin,blocks:selected()})?.value,'Medium');
 const html='<html><head><meta property="og:type" content="product"></head>'+
 '<main><article class="product"><h1>'+currentName+'</h1>'+
 '<div class="product-description"><h3>What’s in it:</h3><p>'+compound+'</p>'+
 '<p>Tastes like: Balanced chocolate and caramel, orange citrusy acidity.</p></div></article></main></html>';
 const p=extractPublicCoffeeFacts(html,{source_url:R60_CASES[1].url});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1600));
 assert.equal(p.fields.roast_level,'Medium',JSON.stringify(p).slice(0,2000));
 assert.ok(p.source_facts?.some(f=>f.field==='roast_level'&&
  f.source_type==='html'&&f.value==='Roast: medium level'),JSON.stringify(p).slice(0,3000));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:R60_CASES[1].url}));
});
test('R60 refuse unrelated, old, ambiguous, duplicate, foreign or mismatched roast sources',()=>{
 const base={name:currentName,origin:currentOrigin,blocks:selected()};
 for(const bad of [
  {name:'Ethiopia Other Coffee'},
  {origin:'La Libertad, Huehuetenango, Guatemala'},
  {origin:'Huehuetenango, Guatemala'},
  {blocks:selected(compound,'Other product')},
  {blocks:[...selected(),{tag:'h1',text:'Other product'}]},
  {blocks:[{tag:'h1',text:currentName},{tag:'p',text:compound,educational:true}]},
  {blocks:[{tag:'h1',text:currentName},{tag:'p',text:compound,section:'Related products'}]},
  {blocks:selected('Previous lot: '+compound)},
  {blocks:selected(compound.replace('Roast: medium level','Roast: medium/medium-light'))},
  {blocks:selected(compound.replace('Roast: medium level','Roast: medium level or dark level'))},
  {blocks:selected(compound.replace('Country: Guatemala','Country: Ethiopia'))},
  {blocks:selected(compound.replace('Region: Huehuetenago','Region: Santa Ana'))},
  {blocks:selected(compound.replace('Grower: Concepción Villatoro','Growing: Concepción Villatoro'))},
  {blocks:selected(compound.replace('Process: washed','Process: unknown'))},
  {blocks:[...selected(),{tag:'p',text:'Roast: dark level',section:'What’s in it:'}]}
 ])assert.equal(refine({...base,...bad}),null,JSON.stringify(bad));
});
