import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://www.mysticmonkcoffee.com/products/thanksgiving-blend';
const notes=['Cocoa','Peach','Raisin'];
const chips=notes.map(v=>'<div class="roast-note-item"><img src="/cdn/shop/files/tasting_notes.svg" alt="'+v+'"><p>'+v+'</p></div>').join('');
const page=(story,related='')=>'<html><head><meta property="og:type" content="product"><link rel="canonical" href="'+url+'"></head><body><main><article class="product"><h1>Thanksgiving Blend</h1>'+
'<div class="product-info__block-item" data-block-type="liquid"><div class="roast-level-container" data-block-type="roast-profile"><h4 class="roast-title">Roast Level</h4><span>Light Roast</span><span>Dark Roast</span><h4 class="roast-subtitle">Tasting Notes</h4><div class="roast-notes">'+chips+'</div></div></div>'+
'<div class="product-info__block-item" data-block-type="story"><div class="prose"><p>'+story+'</p></div></div></article></main>'+related+'</body></html>';
const own='Our Thanksgiving Blend has a smooth medium-dark cup, with layers of cocoa and peach, a hint of malt and a raisin-like sweetness.';
const parse=(story=own,related='')=>extractPublicCoffeeFacts(page(story,related),{source_url:url});
test('original528 selected original identity, actual parser and UI checks fail closed',()=>{
 const row={number:528,archived_coffee:'Thanksgiving Blend',status:'FETCHED',parser_ok:true,selected_h1:['Thanksgiving Blend'],selected_heading_identity_verified:true,selected_h1_present_in_scoped_html:true,current_fields:{name:'Thanksgiving Blend'},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([528],[row]),[]);
 for(const change of [{status:'UNAVAILABLE'},{selected_heading_identity_verified:false},{parser_ok:false},{add_coffee_ui_rendered:false},{source_review_rendered:false}])assert.ok(requiredFocusedSourceFailures([528],[{...row,...change}]).length,JSON.stringify(change));
});
test('selected product tasting chips win and direct medium-dark prose outranks graphic endpoints',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p));
 for(const n of notes)assert.match(p.fields.tasting_notes||'',new RegExp(n,'i'),JSON.stringify(p));
 assert.notEqual(p.fields.roast_level,'Dark',JSON.stringify(p));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('separate review or unrelated coffee cannot overwrite chosen chips',()=>{
 const p=parse(own+' Coffee Review: persimmon, nutmeg, pink peppercorn and gladiola.',
 '<aside class="related-products"><h2>Another coffee</h2><p>Roast: Dark. Tasting Notes: Dark Cherry, Wild Honey.</p></aside>');
 assert.equal(p.ok,true,JSON.stringify(p));
 for(const n of notes)assert.match(p.fields.tasting_notes||'',new RegExp(n,'i'),JSON.stringify(p));
 assert.doesNotMatch(p.fields.tasting_notes||'',/dark cherry|wild honey|persimmon|gladiola|pink peppercorn/i,JSON.stringify(p));
 assert.notEqual(p.fields.roast_level,'Dark',JSON.stringify(p));
});
test('old merchant catalog tasting and unsupported decaffeination are not invented',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(p.fields.tasting_notes||'',/dark cherry|wild honey/i,JSON.stringify(p));
 assert.ok(!p.fields.decaffeination_method,JSON.stringify(p));
});
