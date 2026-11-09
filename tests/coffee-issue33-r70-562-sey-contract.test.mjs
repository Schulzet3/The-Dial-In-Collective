import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedElTambo562DirectFacts as audit} from '../scripts/audit/issue33-r70-562-sey-contract.mjs';
const hero=w=>'<div class="coffee_title coffee_title'+w+'"><span class="coffeeTitle_producer">Daniel Caro Lopez</span><span class="coffeeTitle_farm">EL TAMBO - END OF SEASON</span><span class="coffeeTitle_varietyProcess">CHIROSO - WASHED</span><span class="coffeeTitle_country">Colombia</span></div>';
const detail=(k,v)=>'<div class="coffee_technicalDetails_detail"><span class="coffee_technicalDetails_detail_title">'+k+'</span><p class="coffee_technicalDetails_detail_description">'+v+'</p></div>';
const facts=detail('VARIETAL','Chiroso')+detail('REGION','Güíntar, Anzá')+detail('ALTITUDE','2,200 masl')+detail('HARVEST','July 2026')+detail('PROCESSING','Hand-picked at peak ripeness. Floated. De-pulped on the day of harvest. Fermented underwater for 6 days. Dried on raised beds until moisture content reaches ~10%.');
const chosen=(h=hero('Mobile')+hero('Desktop'),notes='In the cup we find lychee, oolong, and mango.',spec=facts)=>'<nav>historical 2025 product link</nav><section data-section-id="selected" data-section-type="product" class="content content_product content_product_coffee">'+h+'<div class="coffee_keyInfo_shortBlurb">'+notes+'</div><div class="coffee_details coffee_technicalDetails">'+spec+'</div><h2>ABOUT DANIEL CARO LOPEZ</h2><p>Long-term historical biography</p></section>';
test('exact current 2026 El Tambo END OF SEASON hero, notes, selected lot and process',()=>{let r=audit(chosen());assert.ok(r&&Object.values(r).every(Boolean),JSON.stringify(r));});
test('old 2025 same farm cannot qualify as 2026 current source',()=>{
 const old=chosen(hero('Mobile').replace('END OF SEASON','2025')+hero('Desktop').replace('END OF SEASON','2025'),'In the cup we find tamarind and rose.',facts.replace('July 2026','January, 2025').replace('6 days','80 hours'));
 let r=audit(old);for(const k of ['selectedHero','selected2026Notes','selectedHarvest','selected2026Process'])assert.equal(r[k],false);
});
test('same producer does not authorize old notes, old process or wrong field',()=>{
 assert.equal(audit(chosen(undefined,'In the cup we find tamarind and rose.')).selected2026Notes,false);
 assert.equal(audit(chosen(undefined,undefined,facts.replace('6 days','80 hours'))).selected2026Process,false);
 assert.equal(audit(chosen(undefined,undefined,facts.replace('Güíntar, Anzá','Huila'))).selectedRegion,false);
});
test('script, SEO or data-sheets attribute is not visible current tasting claim',()=>{
 const phantom='<script>In the cup we find lychee, oolong, and mango.</script><span data-sheets-value="In the cup we find lychee, oolong, and mango."></span>';
 assert.equal(audit(chosen(undefined,phantom)).selected2026Notes,false);
});
test('2025 sibling outside selected root does not poison selected 2026 content',()=>{
 let r=audit(chosen()+'<h2>Related Products</h2><p>2025: tamarind, rose, January 2025, 80 hours</p>');
 assert.equal(r.selected2026Notes,true);assert.equal(r.sibling2025FactsNotSelected,true);
});
test('related product inside root cannot supply a missing selected growing field',()=>{
 const without=facts.replace(detail('REGION','Güíntar, Anzá'),'')+'<h2>Related Products</h2>'+detail('REGION','Güíntar, Anzá');
 assert.equal(audit(chosen(undefined,undefined,without)).selectedRegion,false);
});
test('no second selected product root, duplicate hero or collection masquerading as product',()=>{
 assert.equal(audit(chosen()+chosen()),null);
 assert.equal(audit(chosen(hero('Mobile')+hero('Mobile'))).selectedHero,false);
 assert.equal(audit(chosen().replace('data-section-type="product"','data-section-type="collection"')),null);
});
