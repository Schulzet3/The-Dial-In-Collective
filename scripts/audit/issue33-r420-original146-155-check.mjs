#!/usr/bin/env node
// R420: exact selected official original603 #146/#155 only; not a 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'',expectedSha=process.env.DIC_EXPECTED_SHA||'';
if(!dir||!/^[a-f0-9]{40}$/.test(expectedSha))throw Error('r420_required_source_and_evidence');
const source=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const failures=[],inspected=[],requireFact=(ok,reason)=>{if(!ok)failures.push(reason);};
requireFact(source.source_sha===expectedSha,'wrong_immutable_source');
requireFact(JSON.stringify(source.case_numbers)==='[146,155]'&&source.records?.length===2,'wrong_original_cohort');
requireFact(source.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register_changed');
requireFact(source.original_corpus_modified===false&&source.manual_certified===0&&source.production_operations===0,'original_or_provider_integrity');
for(const c of [
 {n:146,name:"Hello Darlin' - Papua New Guinea",url:'https://hellolarsonscoffee.com/products/hello-darlin-1'},
 {n:155,name:'Ecuador Juan Peña Natural Mejorado',url:'https://hscoffeeroasters.com/products/ecuador-juan-pena-natural-mejorado'}
]){
 const r=source.records?.find(x=>x.number===c.n);
 if(!r){failures.push('missing_case_'+c.n);continue;}
 requireFact(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true&&
  r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'official_selected_H1_parser_or_unsaved_UI_failed_'+c.n);
 let html='';
 try{html=readFileSync(join(dir,'case-'+c.n+'.html'),'utf8');}
 catch{failures.push('raw_current_HTML_missing_'+c.n);continue;}
 const digest=sha(html),fields=r.current_fields||{};
 requireFact(digest===r.html_sha256&&/^[a-f0-9]{64}$/.test(digest),'raw_HTML_SHA_mismatch_'+c.n);
 requireFact(r.official_url===c.url&&r.final_url?.replace(/\/$/,'')===c.url,'selected_source_URL_changed_'+c.n);
 requireFact(fields.name===c.name&&r.selected_h1?.some(h=>h===c.name),'selected_identity_or_H1_changed_'+c.n);
 const selected=productMarkup(html).replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ');
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||c.url});
 requireFact(parsed?.ok===true&&parsed.fields?.name===fields.name,'real_parser_identity_replay_failed_'+c.n);
 requireFact(parsed?.fields?.tasting_notes===fields.tasting_notes,'real_parser_notes_replay_mismatch_'+c.n);
 requireFact(!parsed?.roaster_recipe?.dose_g&&!parsed?.roaster_recipe?.yield_g,
   'invented_espresso_dose_yield_'+c.n);
 requireFact(!fields.release_label&&!fields.decaffeination_method,'unpublished_release_or_decaf_'+c.n);
 if(c.n===146){
  requireFact(/Papua New Guinea/i.test(selected)&&/fruity/i.test(selected),
    'selected_product_direct_description_missing_146');
  const contamination=/Blueberry Cobbler|Peanut Butter|Highlander Grogg|Cinnamon Roll|Chocolate Cherry|Raspberry White Chocolate/i;
  requireFact(!contamination.test(Object.values(fields).join(' ')),
    'optional_added_sku_flavor_leaked_to_coffee_fields_146');
  requireFact(!fields.roast_level,'variant_choice_medium_or_dark_invented_as_fixed_roast_146');
  requireFact(!fields.producer&&!fields.process&&!fields.variety&&!fields.elevation_m,
    'unpublished_farm_process_variety_or_elevation_146');
 }else{
  requireFact(/Fruit loops,\s*rose,\s*orchid/i.test(selected),
    'selected_direct_flavor_profile_missing_155');
  requireFact(/Farm:\s*Hacienda La Papaya/i.test(selected)&&/Producer:\s*Juan Peña/i.test(selected),
    'direct_selected_farm_and_producer_missing_155');
  requireFact(/Process:\s*Natural/i.test(selected)&&/Variety:\s*Typica Mejorado/i.test(selected),
    'direct_selected_process_or_variety_missing_155');
  requireFact(['Fruit loops','rose','orchid'].every(x=>
    String(fields.tasting_notes||'').toLowerCase().includes(x.toLowerCase())),
    'direct_labeled_flavor_notes_omitted_155');
  requireFact(/Juan Peña/i.test(fields.producer||'')&&
    /Ecuador/i.test(fields.origin||'')&&/Saraguro/i.test(fields.origin||'')&&
    fields.process==='Natural'&&/Typica Mejorado/i.test(fields.variety||''),
    'direct_selected_producer_origin_variety_process_incorrect_155');
  requireFact(!fields.roast_level,'unpublished_roast_invented_155');
  requireFact(!/Blueberry Cobbler|Highlander Grogg/i.test(Object.values(fields).join(' ')),
    'cross_roaster_option_leak_155');
 }
 inspected.push({number:c.n,url:c.url,current_HTML_sha256:digest,current_H1:r.selected_h1,
  current_fields:fields,conflicts:r.conflicts||[],unsaved_add_coffee:r.add_coffee_ui_rendered,
  source_review:r.source_review_rendered});
}
const verdict={source_sha:source.source_sha,originals:[146,155],manual_certified:0,
 provider_writes:0,raw_official_HTML_SHA256_independently_computed:true,failures,inspected};
writeFileSync(join(dir,'r420-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R420 EXACT CURRENT SELECTED] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
