import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dakotaSelectedSourceFailures} from '../scripts/audit/issue33-r394-dakota-check.mjs';
const html={
 88:'<main><h1>701 Blend</h1><section><p>Medium Roast</p><p>Tasting notes: nutty, cocoa, with a slight lemongrass finish.</p></section></main>',
 90:'<main><h1>Great Plains Decaf</h1><section><p>Medium Roast</p><p>Swiss Water Processed</p><p>Chocolate, caramel, and apple.</p></section></main>'
};
const hash=s=>createHash('sha256').update(s).digest('hex');
const row=(number,name,notes,more={})=>({
 number,status:'FETCHED',parser_ok:true,selected_heading_identity_verified:true,
 selected_h1:[name],add_coffee_ui_rendered:true,source_review_rendered:true,
 official_url:'https://dakotaroasters.com/products/'+(number===88?'701-blend':'great-plains-decaf'),
 final_url:'https://dakotaroasters.com/products/'+(number===88?'701-blend':'great-plains-decaf'),
 html_sha256:hash(html[number]),html_bytes:Buffer.byteLength(html[number]),conflicts:[],seo_fallback_fields:[],
 current_fields:{name,roaster:'Dakota Roasters Coffee Company',roast_level:'Medium',
 tasting_notes:notes,...more}
});
const good=()=>({case_numbers:[88,90],manual_certified:0,public_only:true,
 original_corpus_modified:false,production_operations:0,fetched:2,parsed:2,records:[
 row(88,'701 Blend','nutty, cocoa, with a slight lemongrass finish.'),
 row(90,'Great Plains Decaf','chocolate, caramel, and apple',{decaffeination_method:'Water Process'})
]});
test('exact selected first-party, green processing separate from Swiss Water, no-save UI',()=>{
 assert.deepEqual(dakotaSelectedSourceFailures(good(),html),[]);
});
for(const [label,mutate,htmlPatch] of [
 ['related product masquerades as H1',s=>{}, {88:'<main><h1>Other Blend</h1><section>701 Blend Medium Roast nutty cocoa lemongrass</section></main>'}],
 ['recycled selected product title',s=>{s.records[0].current_fields.name='Another Blend'},{}],
 ['misclassified regular blend decaf',s=>{s.records[0].current_fields.decaffeination_method='Water Process'},{}],
 ['unsupported inferred origin is not evidence',s=>{s.records[1].current_fields.decaffeination_method='Sugar Process'},{}],
 ['SEO flavor substitute',s=>{s.records[0].seo_fallback_fields=['tasting_notes']},{}],
 ['green process conflated with decaffeination',s=>{s.records[1].current_fields.process='Washed'},{}],
 ['source hash drift',s=>{s.records[1].html_sha256='bad'},{}],
 ['unverified Add Coffee UI',s=>{s.records[1].add_coffee_ui_rendered=false},{}],
 ['source contradiction',s=>{s.records[1].conflicts=['decaffeination_method']},{}]
])test('reject '+label,()=>{
 const s=good();mutate(s);
 assert.notDeepEqual(dakotaSelectedSourceFailures(s,{...html,...htmlPatch}),[]);
});
