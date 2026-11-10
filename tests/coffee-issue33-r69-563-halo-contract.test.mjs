import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedHalo563DirectFacts} from '../scripts/audit/issue33-r69-563-halo-contract.mjs';
const hero=which=>'<div class="coffee_title coffee_title'+which+'"><span class="coffeeTitle_producer">Halo Hartume</span><span class="coffeeTitle_farm">2ND SELECTION</span><span class="coffeeTitle_varietyProcess">ETHIOPIAN LANDRACE - WASHED</span><span class="coffeeTitle_country">Ethiopia</span></div>';
const detail=(title,value)=>'<div class="coffee_technicalDetails_detail"><span class="coffee_technicalDetails_detail_title">'+title+'</span><p class="coffee_technicalDetails_detail_description">'+value+'</p></div>';
const facts=detail('VARIETAL','Ethiopian Landrace')+detail('REGION','Gedeb, Yirgacheffe')+detail('ALTITUDE','1,900 - 2,210 masl')+detail('HARVEST','January 2026')+detail('PROCESSING','Hand-picked at peak ripeness; dry-fermented for 12 hours; wet-fermented for an additional 12 hours; meticulously hand-washed');
const selected=(h=hero('Mobile')+hero('Desktop'),notes='In the cup we find melon, plum, and lemon verbena.',spec=facts)=>'<nav>Other coffees</nav><section data-section-id="official-current" data-section-type="product" class="content content_product content_product_coffee">'+h+'<div class="coffee_keyInfo_shortBlurb">'+notes+'</div><div class="coffee_details coffee_technicalDetails">'+spec+'</div><h2>ABOUT HALO HARTUME</h2><p>Worasa Mijane founded an old site at Worka Sakaro</p></section>';
test('exact selected 2026 second selection own visible paired hero and five typed details',()=>{
 const facts=selectedHalo563DirectFacts(selected()); assert.ok(Object.values(facts).every(Boolean),JSON.stringify(facts));
});
test('other 2026 selection and stale historical lot do not qualify as chosen coffee',()=>{
 for(const other of ['1ST SELECTION','2025 SELECTION','OTHER COFFEE'])
  assert.equal(selectedHalo563DirectFacts(selected(hero('Mobile').replace('2ND SELECTION',other)+hero('Desktop').replace('2ND SELECTION',other))).selectedHero,false);
});
test('unqualified 2026 Halo nectarine tart plum lemongrass cannot replace 2nd selection',()=>{
 assert.equal(selectedHalo563DirectFacts(selected(undefined,'In the cup we find nectarine, tart plum, and lemongrass.')).notes,false);
});
test('invisible data-sheets-value, scripts and SEO are not selected tasting notes',()=>{
 const markup='<span data-sheets-value="In the cup we find melon, plum, and lemon verbena."></span><script>In the cup we find melon, plum, and lemon verbena.</script>';
 assert.equal(selectedHalo563DirectFacts(selected(undefined,markup)).notes,false);
});
test('hidden foreign Gesha notes in attributes do not contaminate real chosen visible notes',()=>{
 const s='<span data-sheets-value="Other Gesha: jasmine and honeysuckle, fresh peach"></span>In the cup we find melon, plum, and lemon verbena.';
 assert.equal(selectedHalo563DirectFacts(selected(undefined,s)).notes,true);
});
test('related product panel cannot supply missing selected growing field',()=>{
 const source=selected(undefined,'In the cup we find melon, plum, and lemon verbena.<h2>Related Products</h2>',null);
 const s=source.replace('<div class="coffee_details coffee_technicalDetails">null</div>','')+facts;
 assert.equal(selectedHalo563DirectFacts(s).selectedRegion,false);
});
test('historic Worka Sakaro biography cannot substitute current lot growing region',()=>{
 const d=selectedHalo563DirectFacts(selected(undefined,undefined,facts.replace('Gedeb, Yirgacheffe','Worka Sakaro')));
 assert.equal(d.selectedRegion,false);assert.equal(d.historicalStationNotLotOrigin,false);
});
test('wrong harvest, contradictory process are not validated',()=>{
 const d=selectedHalo563DirectFacts(selected(undefined,undefined,facts.replace('January 2026','January 2025').replace('wet-fermented','sun-dried')));
 assert.equal(d.selectedHarvest,false);assert.equal(d.selectedWashedProcess,false);
});
test('two competing product roots, duplicated mobile hero and nonproduct wrapper fail closed',()=>{
 assert.equal(selectedHalo563DirectFacts(selected()+selected()),null);
 assert.equal(selectedHalo563DirectFacts(selected(hero('Mobile')+hero('Mobile'))).selectedHero,false);
 assert.equal(selectedHalo563DirectFacts(selected().replace('data-section-type="product"','data-section-type="collection"')),null);
});
