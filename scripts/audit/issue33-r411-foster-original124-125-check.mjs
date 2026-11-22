#!/usr/bin/env node
// Issue #33 R411: exact original selected Foster #124/#125, not 603-row certification.
// Fail closed on missing official source/H1/current parser/unsaved UI; no private data.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'';
const expectedSha=process.env.DIC_EXPECTED_SHA||'';
if(!dir||!/^[a-f0-9]{40}$/.test(expectedSha))throw Error('r411_exact_source_and_artifacts_required');
const source=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const failures=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
if(source.source_sha!==expectedSha)failures.push('checked_out_exact_source_sha');
if(JSON.stringify(source.case_numbers)!=='[124,125]'||source.records?.length!==2)
 failures.push('required_exact_124_125_cohort_missing');
const expected={
 124:{url:'https://fostercoffee.co/products/medina-colombia-retail',title:'Medina (Colombia)'},
 125:{url:'https://fostercoffee.co/products/sookoo-ethiopia',title:'Sookoo (Ethiopia)'}
};
const inspected=[];
for(const n of [124,125]){
 const r=source.records?.find(x=>x.number===n);
 if(!r){failures.push('missing_case_'+n);continue;}
 if(r.status!=='FETCHED'||r.parser_ok!==true||r.selected_heading_identity_verified!==true||
    r.add_coffee_ui_rendered!==true||r.source_review_rendered!==true)
  failures.push('guarded_selected_source_parser_unsaved_ui_'+n);
 const h=readFileSync(join(dir,'case-'+n+'.html'),'utf8');
 const actual=hash(h),wanted=expected[n],facts=r.current_fields||{};
 if(actual!==r.html_sha256||!/^[a-f0-9]{64}$/.test(actual))
  failures.push('raw_official_html_sha_mismatch_'+n);
 if(r.official_url!==wanted.url||r.final_url?.replace(/\/$/,'')!==wanted.url||
   facts.name!==wanted.title||!r.selected_h1?.some(x=>x.trim()===wanted.title))
  failures.push('current_exact_chosen_identity_or_url_'+n);
 const own=productMarkup(h).replace(/<[^>]{0,1600}>/g,' ')
  .replace(/&(?:nbsp|amp|quot|#39);/gi,' ').replace(/\s+/g,' ').trim();
 const parsed=extractPublicCoffeeFacts(h,{source_url:r.final_url||wanted.url});
 if(parsed?.ok!==true||parsed?.fields?.name!==facts.name)
  failures.push('current_parser_replay_mismatch_'+n);
 if(n===124){
  // Only this exact selected product prints an explicit espresso guide.
  if(!/Nicolas Medina Perdomo/i.test(own)||!/Pink Bourbon/i.test(own)||
     !/washed/i.test(own)||!/18\s*g\s*coffee\s*in/i.test(own)||
     !/38\s*g\s*espresso\s*out/i.test(own)||!/28\s*[-–—]\s*30\s*seconds/i.test(own))
   failures.push('selected_medina_direct_specs_or_espresso_missing');
  if(!/Nicolas Medina Perdomo/i.test(facts.producer||'')||
     !/Pink Bourbon/i.test(facts.variety||'')||facts.process!=='Washed')
   failures.push('selected_medina_direct_growing_fields_missing');
  const recipe=parsed?.roaster_recipe||null;
  if(!recipe||recipe.dose_g!==18||recipe.yield_g!==38||
     recipe.time_s_min!==28||recipe.time_s_max!==30)
   failures.push('medina_selected_espresso_reference_not_exact');
 }else{
  // Current selected product gives own tasting/origin. Frozen Guji/Washed,
  // producer, elevation and cultivars MUST NOT be carried over without
  // fresh selected-product evidence on this page/lot.
  if(!/Almond\s+Apple\s+Citrus\s+fruit\s+Winey/i.test(own)||
     !/Current\s+origin\s+Ethiopia/i.test(own))
   failures.push('sookoo_own_selected_taste_or_origin_not_found');
  if(!/Almond/i.test(facts.tasting_notes||'')||!/Winey/i.test(facts.tasting_notes||''))
   failures.push('sookoo_selected_taste_not_retained');
  if((facts.origin||'').includes('Guji')&&!/\bGuji\b/i.test(own))
   failures.push('sookoo_archived_guji_promoted_without_current_source');
  for(const [field,stale] of [['process',/\bWashed\b/i],['variety',/\b(?:Gibirinna|Serto|74110|74112)\b/i],
    ['producer',/\bSookoo Coffee\b/i],['elevation_m',/\b(?:2000|2,000|2150|2,150)\b/i]]){
   if(facts[field]&&!stale.test(own))
    failures.push('sookoo_'+field+'_not_supported_by_selected_page');
  }
  if(parsed?.roaster_recipe?.dose_g||parsed?.roaster_recipe?.yield_g)
   failures.push('sookoo_unpublished_espresso_recipe_inferred');
 }
 inspected.push({number:n,original_official_url:r.official_url,source_sha256:actual,
  selected_h1:r.selected_h1,fields:facts,conflicts:r.conflicts||[],
  roaster_recipe:parsed?.roaster_recipe||null,selected_own_excerpt:own.slice(0,1100),
  parser_ok:r.parser_ok,unsaved_ui:r.add_coffee_ui_rendered===true,
  source_review:r.source_review_rendered===true});
}
const verdict={source_sha:source.source_sha,case_numbers:[124,125],
 first_party_raw_html_rehashed:true,manual_certified:0,no_member_write:true,failures,inspected};
writeFileSync(join(dir,'r411-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R411 FOSTER EXACT SELECTED SOURCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
