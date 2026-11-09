#!/usr/bin/env node
// R54 bounded read-only current merchant source evidence and independently verifiable hashes.
// Not a 603/603 manual certificate, not an automatic selection of a historical lot.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {R54_CASES,r54CurrentIdentityFailures} from './issue33-r54-selected-current-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!root)throw Error('focused_artifact_dir_required');
const dir=resolve(root),bytes=readFileSync(join(dir,'focused-current-evidence.json'));
const result=JSON.parse(bytes.toString('utf8')),failures=[],checks=[];
const check=(yes,id)=>{if(!yes)failures.push(id);};
check(JSON.stringify(result.case_numbers)==='[594,597,600]','original603_number_subset_wrong');
check(result.source_sha===process.env.GITHUB_SHA,'source_sha_not_exact_workflow_head');
check(result.manual_certified===0&&result.production_operations===0&&
 result.real_auth===false&&result.original_corpus_modified===false,'unsafe_or_false_certification');
check(result.records?.length===3,'source_records_missing');
for(const spec of R54_CASES){
 const rec=result.records?.find(x=>x.number===spec.number)||{};
 failures.push(...r54CurrentIdentityFailures(rec,spec));
 let html='',length=0,rawMatches=false;
 try{const b=readFileSync(join(dir,'case-'+spec.number+'.html'));
  html=b.toString('utf8');length=b.length;rawMatches=length===rec.html_bytes&&sha(b)===rec.html_sha256;
 }catch{}
 check(rawMatches,'raw_official_html_sha256_or_byte_count_'+spec.number);
 const current=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim();
 const observed={number:spec.number,selected_h1:rec.selected_h1||[],parsed_name:rec.current_fields?.name||null,
  exact_original_url:rec.official_url||null,actual_url:rec.final_url||null,source_status:rec.status||'MISSING',
  html_bytes:length,html_sha256:rec.html_sha256||null,raw_sha256_verified:rawMatches,
  fields:rec.current_fields||{},conflicts:rec.conflicts||[],
  add_coffee:rec.add_coffee_ui_rendered===true,source_review:rec.source_review_rendered===true,
  original_identity_confirmed:rec.selected_heading_identity_verified===true};
 if(spec.number===594){
  observed.current_identity=/^Timor\s+Decaf\b/iu.test(observed.parsed_name||'')?'TIMOR_REPLACEMENT_NOT_ORIGINAL594':
   /^Sumatra\s+Decaf\b/iu.test(observed.parsed_name||'')?'ORIGINAL_SUMATRA_SELECTED':'UNRECOGNIZED';
  // Swiss Water belongs to CURRENT selected product only; reference to the
  // other coffee in an availability sentence cannot change current origin.
  observed.selected_swiss_water=/Swiss Water\s*®?\s*Process/iu.test(current);
  check(observed.selected_swiss_water,'current_named_decaf_evidence_missing_594');
  if(observed.selected_swiss_water)check(rec.current_fields?.decaffeination_method==='Water Process',
   'direct_current_swiss_water_decaf_not_retained_594');
  check(!rec.current_fields?.process,'unpublished_cherry_process_inferred_594');
  const foreign=observed.current_identity==='TIMOR_REPLACEMENT_NOT_ORIGINAL594'?'Sumatra':'Timor';
  check(!(rec.current_fields?.origin||'').toLowerCase().includes(foreign.toLowerCase()),
   'other_coffee_origin_leaked_594');
 } else if(spec.number===597){
  observed.direct_washed=/\bWashed Process\b/iu.test(current);
  observed.direct_meru=/\bRegion:\s*Meru\b/iu.test(current);
  check(observed.direct_washed&&observed.direct_meru,'selected_wreckingball_source_changed_597');
  if(observed.direct_washed)check(rec.current_fields?.process==='Washed','selected_washed_missing_597');
  if(observed.direct_meru)check(/Meru/iu.test(rec.current_fields?.origin||'')&&/Kenya/iu.test(rec.current_fields?.origin||''),
   'selected_meru_kenya_not_retained_597');
  observed.direct_variety=/\bVariety:\s*SL\s*28\s+and\s+Ruiru\s*11\b/iu.test(current);
  observed.direct_elevation=/\bElevation\s*[;:]\s*1400\s+meters?\s+above\s+sea\s+level\b/iu.test(current);
  check(observed.direct_variety&&observed.direct_elevation,'selected_cultivar_height_source_changed_597');
  if(observed.direct_variety)check(rec.current_fields?.variety==='SL28 and Ruiru 11',
   'selected_labeled_cultivar_omitted_597');
  if(observed.direct_elevation)check(
   /^1400\s+(?:m(?:eters?|etres?)|masl)\b/iu.test(rec.current_fields?.elevation_m||''),
   'selected_labeled_elevation_omitted_597');
 } else if(spec.number===600){
  observed.direct_medium=/\bMedium Roast\b/iu.test(current);
  observed.direct_washed=/\bProcess\s+Washed and Sun Dried\b/iu.test(current);
  observed.direct_notes=/NOTES:\s*MOCHA,\s*CASHEW,\s*HALVA/iu.test(current);
  check(observed.direct_medium&&observed.direct_washed&&observed.direct_notes,'selected_yellowstone_specs_changed_600');
  if(observed.direct_medium)check(rec.current_fields?.roast_level==='Medium','selected_medium_not_retained_600');
  if(observed.direct_washed)check(rec.current_fields?.process==='Washed','selected_washed_not_retained_600');
  if(observed.direct_notes)check(['mocha','cashew','halva'].every(x=>(rec.current_fields?.tasting_notes||'').toLowerCase().includes(x)),
   'selected_notes_not_retained_600');
 }
 checks.push(observed);
}
const verdict={kind:'ISSUE33_R54_CURRENT_EXACT_SELECTED_SOURCE_NOT_603_CERTIFICATION',
 source_sha:result.source_sha,original603_csv_sha256:result.original603_register_sha256,
 evidence_sha256:sha(bytes),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,checks};
writeFileSync(join(dir,'r54-594-597-600-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R54 SELECTED SOURCE VERDICT] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
