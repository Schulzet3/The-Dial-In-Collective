import test from 'node:test';
import assert from 'node:assert/strict';
import {selected300,selectedUrl,selectedName,norm} from '../scripts/audit/issue33-r351-original300-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const own='<p>The Black Lion - Yirgacheffe Heirloom is one of Sextant’s prized natural process organic coffee offerings. '+
 'This heavy, juicy, and aromatic coffee packs a ton of flavor. Sweet and slightly Floral notes are accentuated '+
 'when drying under the Ethiopian sun creating a malty and Blueberry finish.</p>'+
 '<p>Yirgacheffe is a small but fertile region, producing some of the world’s most well-known coffees. '+
 'Yirgacheffe coffees are comprised of uncatalogued and unique coffee varietals, called heirlooms.</p>'+
 '<p>This coffee is perfect as a single prover, French press, Moka pot, and Aeropress.</p>';
const page=(body=own,title=selectedName,elsewhere='')=>'<html><head><title>Other coffee dark roast</title></head><body>'+
 '<nav>Other Coffee: Medium roast, Swiss Water, producer John, tasting notes pineapple.</nav>'+
 '<article class="product"><h1>'+title+'</h1><div class="product__description">'+body+'</div></article>'+
 elsewhere+'<footer>Other lot natural coffee from Guatemala</footer></body></html>';
test('R351 exact selected title, literal organic Natural and malty Blueberry finish',()=>{
 const s=selected300(page());assert.equal(s.exact,true);assert.equal(s.selectedNatural,true);
 assert.equal(s.selectedFloral,true);assert.equal(s.selectedFinish,true);assert.equal(s.selectedYirgacheffe,true);
});
test('R351 wrong product H1 cannot be certified by still-matching chosen prose',()=>{
 assert.equal(selected300(page(own,'Different 2026 Yirgacheffe Coffee')).exact,false);
});
test('R351 excluded sibling and unrelated nav description cannot satisfy own selected evidence',()=>{
 const s=selected300(page('<p>Chosen Black Lion page is sold out without coffee details.</p>',selectedName,'<aside>'+own+'</aside>'));
 assert.equal(s.exact,true);assert.equal(s.selectedNatural,false);assert.equal(s.selectedFinish,false);
});
test('R351 generic sun drying without actual Natural process does not prove Natural',()=>{
 const p=extractPublicCoffeeFacts(page('<p>Sweet and floral when drying under the Ethiopian sun.</p>'),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.notEqual(norm(p.fields?.process),'natural');
});
test('R351 selected coffee has no licensed roast level inferred from flavor color or SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.ok(!p.fields?.roast_level);
});
test('R351 selected current brew suggestions not an espresso recipe or grower credit',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.ok(!p.fields?.producer);assert.ok(!p.fields?.decaffeination_method);
});
test('R351 no-save Add Coffee and review snapshot preserve selected product identity',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selectedUrl});
 assert.equal(p.ok,true);assert.equal(norm(p.fields?.name),norm(selectedName));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:selectedUrl})?.type,'coffee_source_review');
});
test('R351 unavailable, wrong identity and missing UI always fail hard current source gate',()=>{
 const good={number:300,status:'FETCHED',archived_coffee:selectedName,parser_ok:true,
 selected_h1:[selectedName],selected_h1_present_in_scoped_html:true,
 selected_heading_identity_verified:true,current_fields:{name:selectedName},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([300],[good]),[]);
 for(const bad of [{...good,status:'UNAVAILABLE'},{...good,selected_heading_identity_verified:false},
  {...good,add_coffee_ui_rendered:false},{...good,source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([300],[bad]).length>0);
});
