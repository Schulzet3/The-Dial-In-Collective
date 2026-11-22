#!/usr/bin/env node
// Issue #33 R412: source-bound original603 #126 and #127, never wholesale 603 certification.
// Fail closed on required exact official selected source, H1, parser and unsaved UI.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'';
const expectedSha=process.env.DIC_EXPECTED_SHA||'';
if(!dir||!/^[a-f0-9]{40}$/.test(expectedSha))throw Error('r412_exact_commit_and_artifacts_required');
const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const failures=[],inspected=[];
const hash=v=>createHash('sha256').update(v).digest('hex');
if(report.source_sha!==expectedSha)failures.push('wrong_source_commit');
if(JSON.stringify(report.case_numbers)!=='[126,127]'||report.records?.length!==2)
 failures.push('required_bounded_126_127_cohort_missing');
const expected={
 126:{url:'https://fostercoffee.co/products/yes-its-decaf-decaf',title:"Yes It's Decaf (Decaf)"},
 127:{url:'https://friedrichscoffee.com/product/colombia-lisandro-cardenas-finca-las-brisas',title:'Colombia – Lisandro Cárdenas — Finca Las Brisas'}
};
for(const n of [126,127]){
 const r=report.records?.find(x=>x.number===n);
 if(!r){failures.push('missing_case_'+n);continue;}
 if(r.status!=='FETCHED'||r.parser_ok!==true||r.selected_heading_identity_verified!==true||
    r.add_coffee_ui_rendered!==true||r.source_review_rendered!==true)
  failures.push('required_official_parser_H1_unsaved_UI_'+n);
 const h=readFileSync(join(dir,'case-'+n+'.html'),'utf8');
 const actualHash=hash(h),e=expected[n],facts=r.current_fields||{};
 if(actualHash!==r.html_sha256||!/^[a-f0-9]{64}$/.test(actualHash))
  failures.push('raw_html_sha_not_verified_'+n);
 if(r.official_url!==e.url||r.final_url?.replace(/\/$/,'')!==e.url||
    facts.name!==e.title||!r.selected_h1?.some(x=>x.trim()===e.title))
  failures.push('current_official_H1_identity_changed_'+n);
 const own=productMarkup(h).replace(/<[^>]{0,1600}>/g,' ')
  .replace(/&(?:nbsp|amp|quot|#39);/gi,' ').replace(/\s+/g,' ').trim();
 const parsed=extractPublicCoffeeFacts(h,{source_url:r.final_url||e.url});
 if(parsed?.ok!==true||parsed?.fields?.name!==facts.name)
  failures.push('actual_current_parser_replay_mismatch_'+n);
 if(n===126){
  // The first party selected page separates Washed green processing from
  // Mountain Water decaffeination. Its learning-center link is not a recipe.
  if(!/Country\s+Mexico/i.test(own)||!/Region\s+Amatenago/i.test(own)||
     !/Producer\s+Smallholder Farms/i.test(own)||
     !/Washed\s*:\s*Mountain Water Decaf/i.test(own)||
     !/Sweet\s*,?\s*Smooth\s*,?\s*Bright\s*,?\s*Floral/i.test(own))
   failures.push('decaf_selected_product_direct_specs_not_found');
  if(facts.process!=='Washed'||facts.decaffeination_method!=='Water Process'||
     !/Mexico/i.test(facts.origin||'')||
     !/Smallholder Farms/i.test(facts.producer||'')||
     !/Sweet/i.test(facts.tasting_notes||'')||!/Floral/i.test(facts.tasting_notes||''))
   failures.push('decaf_selected_green_vs_water_method_or_taste_wrong');
  if(facts.variety&&!/\bvariet(?:y|ies)\b/i.test(own))
   failures.push('decaf_unpublished_variety_inferred');
 }else{
  // All positive fields must be on the single chosen product, not below the
  // related-product grid (Indonesia, Brazil, Guatemala, or other coffees).
  if(!/Lisandro Cárdenas/i.test(own)||!/100% Gesha/i.test(own)||
     !/Huila, Colombia/i.test(own)||!/The Process:\s*Meticulous Natural/i.test(own)||
     !/The Roast:\s*Light-Medium/i.test(own)||!/cooked cherry/i.test(own))
   failures.push('lisandro_selected_first_party_direct_specs_missing');
  if(!/Lisandro Cárdenas/i.test(facts.producer||'')||
     !/Gesha/i.test(facts.variety||'')||facts.process!=='Natural'||
     !/Medium-Light|Light-Medium/i.test(facts.roast_level||'')||
     !/Huila/i.test(facts.origin||'')||!/cooked cherry/i.test(facts.tasting_notes||''))
   failures.push('lisandro_selected_roles_or_fields_mismatched');
  if(/Indonesia Java|Brazil\s*[–-]\s*Light|Guatemala\s*[–-]\s*Medium/i.test(
   [facts.name,facts.producer,facts.origin,facts.tasting_notes].join(' ')))
   failures.push('unrelated_product_content_in_selected_fields');
 }
 if(parsed?.roaster_recipe?.dose_g||parsed?.roaster_recipe?.yield_g)
  failures.push('unpublished_espresso_recipe_inferred_'+n);
 inspected.push({number:n,url:r.official_url,current_final_url:r.final_url,
  html_sha256:actualHash,selected_h1:r.selected_h1,fields:facts,
  conflicts:r.conflicts||[],recipe:parsed?.roaster_recipe||null,
  selected_excerpt:own.slice(0,1100),parser_ok:r.parser_ok,
  unsaved_ui:r.add_coffee_ui_rendered===true,source_review:r.source_review_rendered===true});
}
const verdict={source_sha:report.source_sha,case_numbers:[126,127],
 first_party_raw_html_rehashed:true,manual_certified:0,no_member_write:true,
 failures,inspected};
writeFileSync(join(dir,'r412-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R412 BOUNDED FIRST PARTY AFTERPROOF] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
