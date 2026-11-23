#!/usr/bin/env node
// Issue #33 R417 — selected first-party Gnosis originals #137/#138.
// Fail closed for missing/challenged selected HTML, stale SKU, parser or UI.
// The frozen CSV remains read-only; this is not individual manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'';
const expectedSha=process.env.DIC_EXPECTED_SHA||'';
if(!dir||!/^[0-9a-f]{40}$/.test(expectedSha))throw Error('r417_exact_sha_and_artifacts_required');
const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const failures=[],inspected=[];
const hash=x=>createHash('sha256').update(x).digest('hex');
if(report.source_sha!==expectedSha)failures.push('wrong_immutable_source_sha');
if(JSON.stringify(report.case_numbers)!=='[137,138]'||report.records?.length!==2)
 failures.push('wrong_or_missing_original_603_cohort');
const expected={
 137:{url:'https://gnosiscoffee.com/products/costa-rica-san-diego-light-roast',
  name:'Costa Rica Honey',roast:'Light',directNotes:['Honey','Raspberry','Almond']},
 138:{url:'https://gnosiscoffee.com/products/red-bourbon-decaf',
  name:'Red Bourbon DECAF',roast:'Light',
  directNotes:['Bergamot','Red Fruit','Cola','Peach','Caramel']}
};
for(const n of [137,138]){
 const e=expected[n],r=report.records?.find(x=>x.number===n);
 if(!r){failures.push('missing_required_original_'+n);continue;}
 if(r.status!=='FETCHED'||r.parser_ok!==true||r.selected_heading_identity_verified!==true||
    r.add_coffee_ui_rendered!==true||r.source_review_rendered!==true)
  failures.push('official_source_H1_parser_unsaved_UI_unverified_'+n);
 let html='';
 try{html=readFileSync(join(dir,'case-'+n+'.html'),'utf8');}
 catch{failures.push('current_first_party_HTML_unavailable_'+n);continue;}
 const digest=hash(html);
 if(digest!==r.html_sha256||!/^[a-f0-9]{64}$/.test(digest))
  failures.push('actual_first_party_HTML_SHA_mismatch_'+n);
 const f=r.current_fields||{};
 if(r.official_url!==e.url||r.final_url?.replace(/\/$/,'')!==e.url||
    f.name!==e.name||!r.selected_h1?.some(x=>x.trim()===e.name))
  failures.push('selected_product_H1_URL_or_identity_changed_'+n);
 const selected=productMarkup(html).replace(/<[^>]{0,2000}>/g,' ')
  .replace(/&(?:nbsp|amp|quot|#39);/gi,' ').replace(/\s+/g,' ').trim();
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||e.url});
 if(replay?.ok!==true||replay?.fields?.name!==f.name||
    replay.fields?.tasting_notes!==f.tasting_notes)
  failures.push('current_extractor_replay_not_identical_'+n);
 const direct=e.directNotes.join(', ');
 if(!selected.toLowerCase().includes(direct.toLowerCase()))
  failures.push('direct_current_selected_literal_notes_missing_'+n);
 const notes=String(f.tasting_notes||'').toLowerCase();
 if(!e.directNotes.every(note=>notes.includes(note.toLowerCase())))
  failures.push('direct_selected_literal_flavors_omitted_'+n);
 if(f.roast_level!==e.roast)failures.push('current_selected_light_roast_missing_'+n);
 if(n===137){
  if(f.process!=='Honey'||!/\bCosta Rica\b/i.test(f.origin||''))
   failures.push('selected_honey_or_country_wrong_137');
  if(/wilton|para[ií]so\s*92|cola|caramel/i.test([f.producer,f.tasting_notes].join(' ')))
   failures.push('other_Gnosis_coffee_facts_onto_137');
 }else{
  if(f.decaffeination_method!=='Sugar Process'||!/red bourbon/i.test(f.variety||'')||
     !/\bColombia\b/i.test(f.origin||''))
   failures.push('selected_EA_decaf_variety_or_country_wrong_138');
  if(!/\bWilton\s+Ben[ií]tez\b/i.test(f.producer||''))
   failures.push('selected_named_person_grower_missing_138');
  // Harvest step one is not the selected green-bean processing method.
  const stage=(r.source_facts||[]).find(fact=>fact.label==='Processing Method'&&
   fact.value==='1. Hand-harvested at peak ripeness');
  if(!stage||stage.field||stage.source_type!=='html'||
     stage.source_url!==e.url||stage.section!=='Red Bourbon DECAF / Processing Method')
   failures.push('numbered_postharvest_stage_falsely_typed_as_process_138');
  if(f.process!=='Natural')failures.push('independent_selected_natural_process_changed_138');
  if(/\b(?:Honey,\s*Raspberry|San Diego Mill|Costa Rica)\b/i.test([f.origin,f.producer,f.tasting_notes].join(' ')))
   failures.push('different_Gnosis_product_cross_contamination_138');
 }
 if(replay?.roaster_recipe?.dose_g||replay?.roaster_recipe?.yield_g)
  failures.push('unpublished_espresso_recipe_invented_'+n);
 inspected.push({number:n,official_url:r.official_url,final_url:r.final_url,
  raw_html_sha256:digest,selected_h1:r.selected_h1,selected_excerpt:selected.slice(0,650),
  parsed_fields:f,conflicts:r.conflicts||[],
  direct_selected_notes:e.directNotes,unsaved_add_coffee:r.add_coffee_ui_rendered===true,
  source_review:r.source_review_rendered===true});
}
const verdict={source_sha:report.source_sha,originals:[137,138],
 current_first_party_HTML_sha256_independently_verified:true,manual_certified:0,
 no_signed_in_or_member_write:true,failures,inspected};
writeFileSync(join(dir,'r417-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R417 ORIGINAL SELECTED SOURCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
