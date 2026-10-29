import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';

// These cases preserve the owner-Locked distinction: two real purchase roasts
// for ONE selected green coffee are options, not a contradictory roast claim.
const url='https://roaster.example.org/products/current-split-roast';
const fields={name:'Current Split Roast',roaster:'Example Roaster'};
const variants=[
 {id:'light',fields:{roast_level:'Light',tasting_notes:'Cocoa, cherry'},roaster_recipe:{ratio:3}},
 {id:'medium-dark',fields:{roast_level:'Medium-Dark',tasting_notes:'Cocoa, caramel'},roaster_recipe:{ratio:2}}
];
const html=(roasts=['Light','Medium-Dark'])=>({
 ok:true,source_url:url,fields:{...fields},
 conflicts:['roast_level'],
 conflict_options:{roast_level:roasts.map(value=>({value,label:'Current selected product source'}))},
 source_facts:[]
});
const json=(overrides={})=>({
 ok:true,source_url:url,fields:{...fields},
 roast_variants:variants,roast_tag_ambiguity_only:true,
 conflicts:['roast_level'],
 conflict_options:{roast_level:[{value:'Light'},{value:'Medium-Dark'}]},
 source_facts:[],...overrides
});
test('same-coffee available selected roast options clear only ambiguous catalog roast tags',()=>{
 const result=mergePublicProductPreview(html(),json());
 assert.equal(result.fields.roast_level,undefined);
 assert.equal(result.fields.tasting_notes,undefined);
 assert.equal(result.roaster_recipe,undefined);
 assert.ok(!result.conflicts?.includes('roast_level'),JSON.stringify(result.conflict_options));
 assert.equal(result.conflict_options?.roast_level,undefined);
 assert.deepEqual(result.roast_variants.map(v=>v.id),['light','medium-dark']);
});
test('a direct current HTML roast outside offered purchase options remains a real conflict',()=>{
 const result=mergePublicProductPreview(html(['Light','Dark']),json());
 assert.ok(result.conflicts?.includes('roast_level'));
 assert.equal(result.fields.roast_level,undefined);
 assert.ok(result.conflict_options?.roast_level?.length);
});
test('an independent direct conflicting endpoint roast specification cannot be waived as catalog tags',()=>{
 const result=mergePublicProductPreview(html(),json({
  roast_tag_ambiguity_only:false,
  current_product_spec_fields:['roast_level']
 }));
 assert.ok(result.conflicts?.includes('roast_level'));
});
test('current-product JSON and HTML with distinct identities cannot merge roast purchase alternatives',()=>{
 const result=mergePublicProductPreview(html(),json({fields:{...fields,name:'Other Coffee'}}));
 assert.deepEqual(result,html());
});
test('a categorical tag hint must not overwrite a genuine explicit selected roast conflict',()=>{
 const result=mergePublicProductPreview(html(),json({
  roast_tag_ambiguity_only:true,
  current_product_spec_fields:['roast_level']
 }));
 assert.ok(result.conflicts?.includes('roast_level'));
});
