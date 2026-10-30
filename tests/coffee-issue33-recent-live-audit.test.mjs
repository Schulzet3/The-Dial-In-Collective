import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_READY_CASES,assessReadyPreview} from '../scripts/audit/issue33-recent-ready-live-probe.mjs';
const rendered='Which roast did you buy? Choose the purchased roast to see its matching notes and recipe.';
const sampleKetch={
 ok:true,fields:{name:'Tier 2: Legacy Farms Honduras Natural Process',
  origin:'Cerro Bueno, Honduras',variety:'Lempira',process:'Natural'},
 roast_variants:[
  {id:'light',fields:{roast_level:'Light',tasting_notes:'Floral, blackberry'},
   sensory:{sweetness:'6',acidity:'3',body:'7',bitterness:'0'},
   roaster_recipe:{ratio:3,dose_g:18,yield_g:54,temperature_reference:'203–205°F'}},
  {id:'medium-dark',fields:{roast_level:'Medium-Dark',tasting_notes:'Blackberry, caramelized sugar'},
   sensory:{sweetness:'5-7',acidity:'2',body:'7',bitterness:'0'},
   roaster_recipe:{ratio:2,temperature_reference:'200–202°F'}}
 ]};
test('live-source suite runs exactly named official product URLs with no arbitrary input',()=>{
 assert.equal(CURRENT_READY_CASES.length,6);
 assert.ok(CURRENT_READY_CASES.every(x=>x.url.startsWith('https://')&&/\/products\//.test(x.url)));
 assert.equal(new Set(CURRENT_READY_CASES.map(x=>x.id)).size,CURRENT_READY_CASES.length);
});
test('Locked Ketch Tier2 shared identity and individually selected recipes pass the live acceptance contract',()=>{
 const audit=assessReadyPreview('ketch-tier2-locked-honduras',sampleKetch,{renderedHtml:rendered});
 assert.deepEqual(audit.failed,[]);
 assert.ok(audit.passed>=14);
});
test('an unchosen roast with donated global tasting notes fails, rather than green status',()=>{
 const preview=structuredClone(sampleKetch);
 preview.fields.tasting_notes='Blackberry';
 const audit=assessReadyPreview('ketch-tier2-locked-honduras',preview,{renderedHtml:rendered});
 assert.ok(audit.failed.some(f=>f.label==='ketch:global_notes_not_assumed'));
});
test('a missing full live HTML read is unverified even when mock Shopify data looks correct',()=>{
 const audit=assessReadyPreview('ketch-tier2-locked-honduras',sampleKetch,{
  renderedHtml:rendered,realHtmlReceived:false});
 assert.ok(audit.failed.some(f=>f.label==='source:full_html_retrieved'));
});
test('current Ketch Mexico cannot inherit Honduras origin or legacy variety',()=>{
 const preview={...structuredClone(sampleKetch),
  fields:{name:'Tier 3: Mexico San Isidro Zoquiapan',origin:'Cerro Bueno, Honduras',variety:'Lempira'}};
 const audit=assessReadyPreview('ketch-tier3-current-mexico',preview,{renderedHtml:rendered});
 assert.ok(audit.failed.some(f=>f.label==='ketch3:current_mexico_geography'));
 assert.ok(audit.failed.some(f=>f.label==='ketch3:no_stale_legacy_variety'));
});
test('Leap current decaf has to preserve the selected product Swiss Water prose evidence',()=>{
 const result={ok:true,fields:{name:'Decaf Coffee',decaffeination_method:'Water Process'}};
 const missing=assessReadyPreview('leap-current-decaf-prose',result,{renderedHtml:rendered});
 assert.ok(missing.failed.some(f=>f.label==='leap:direct_current_method_source_fact'));
 const sourced=assessReadyPreview('leap-current-decaf-prose',{
  ...result,source_facts:[{field:'decaffeination_method',
   value:'The SWISS WATER Process is a chemical-free decaffeination process.'}]
 },{renderedHtml:rendered});
 assert.deepEqual(sourced.failed,[]);
});
test('IXXA must actually recover Chiapas as well as Tenejapa from live source',()=>{
 const result={ok:true,fields:{name:'Organic Ki-Saya - Tenejapa Microlot',
  origin:'Tenejapa',tasting_notes:'Chocolate, creamy caramel, honey, hazelnut'}};
 const audit=assessReadyPreview('ixxa-current-ki-saya',result,{renderedHtml:rendered});
 assert.ok(audit.failed.some(f=>f.label==='ixxa:paired_locality_region'));
});

test('two selected roast options are not a source conflict even if fields remain unchosen',()=>{
 const fixture={...structuredClone(sampleKetch),conflicts:['roast_level'],
  conflict_options:{roast_level:[{value:'Light'},{value:'Medium-Dark'}]}};
 const result=assessReadyPreview('ketch-tier2-locked-honduras',fixture,{renderedHtml:rendered});
 assert.ok(result.failed.some(x=>x.label==='ketch:no_purchase_option_conflict'));
});

// The sixth real-source case must fail closed on seasonal roast contamination.
test('44 North current decaf exact roast beats generic seasonal catalog copy',()=>{
 const good={ok:true,fields:{name:'Decaf - Honduras COMSA',origin:'Municipality of La Encarnacion, Honduras',
  roast_level:'Medium',decaffeination_method:'Water Process',
  tasting_notes:'Rich body with aroma of lemongrass and notes of warm peach.'},
  roast_variants:[],conflicts:[]};
 const accepted=assessReadyPreview('44north-decaf-rotating-program',good,{renderedHtml:rendered});
 assert.deepEqual(accepted.failed,[]);
 const conflicted={...good,fields:{...good.fields,roast_level:undefined},conflicts:['roast_level']};
 const denied=assessReadyPreview('44north-decaf-rotating-program',conflicted,{renderedHtml:rendered});
 assert.ok(denied.failed.some(x=>x.label==='44north-decaf:no_false_roast_conflict'));
 assert.ok(denied.failed.some(x=>x.label==='44north-decaf:exact_selected_roast'));
});
