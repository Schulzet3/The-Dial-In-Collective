#!/usr/bin/env node
// #33 R416: two selected first-party Friedrichs original603 coffees. Hard-fail source loss.
// Source-level review is NOT a complete frozen603 semantic certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'';
const expectedSha=process.env.DIC_EXPECTED_SHA||'';
if(!dir||!/^[a-f0-9]{40}$/.test(expectedSha))throw Error('r416_exact_commit_and_artifacts_required');
const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const failures=[],inspected=[],hash=v=>createHash('sha256').update(v).digest('hex');
if(report.source_sha!==expectedSha)failures.push('wrong_source_commit');
if(JSON.stringify(report.case_numbers)!=='[128,129]'||report.records?.length!==2)
 failures.push('required_exact_two_selected_coffees_missing');
const expected={
 128:{url:'https://friedrichscoffee.com/product/rise-and-shine',title:'Rise and Shine – Medium',roast:'Medium',description:/An amiable blend of Latin American coffees/i},
 129:{url:'https://friedrichscoffee.com/product/traders-blend',title:'Traders Blend – Medium Dark',roast:'Medium-Dark',description:/A rich blend of some of our Latin American favorites/i}
};
for(const n of [128,129]){
 const r=report.records?.find(x=>x.number===n);
 if(!r){failures.push('missing_original_'+n);continue;}
 if(r.status!=='FETCHED'||r.parser_ok!==true||r.selected_heading_identity_verified!==true||
 r.add_coffee_ui_rendered!==true||r.source_review_rendered!==true)
  failures.push('required_current_official_H1_parser_unsaved_UI_'+n);
 let html='';
 try{html=readFileSync(join(dir,'case-'+n+'.html'),'utf8');}
 catch{failures.push('missing_raw_official_html_'+n);continue;}
 const actualHash=hash(html),e=expected[n],facts=r.current_fields||{};
 if(actualHash!==r.html_sha256||!/^[a-f0-9]{64}$/.test(actualHash))failures.push('raw_html_sha256_not_independent_'+n);
 if(r.official_url!==e.url||r.final_url?.replace(/\/$/,'')!==e.url||
    facts.name!==e.title||!r.selected_h1?.some(x=>x.trim()===e.title))
  failures.push('changed_or_unverified_selected_product_identity_'+n);
 const own=productMarkup(html).replace(/<[^>]{0,1600}>/g,' ').replace(/&(?:nbsp|amp|quot|#39);/gi,' ')
 .replace(/\s+/g,' ').trim();
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||e.url});
 if(parsed?.ok!==true||parsed?.fields?.name!==facts.name)
  failures.push('current_parser_replay_mismatch_'+n);
 if(!e.description.test(own)||!/Latin American/i.test(own))
  failures.push('selected_direct_description_missing_'+n);
 if(facts.roast_level!==e.roast||!/Latin America/i.test(facts.origin||''))
  failures.push('selected_title_roast_or_direct_blend_origin_wrong_'+n);
 // Historical expected notes Citrus fruitiness/Fruity are not in either selected description.
 // No other coffee's product card, taxonomic tag, menu or generic SEO is proof of tasting.
 if(facts.tasting_notes||facts.process||facts.variety||facts.producer||
  facts.decaffeination_method)
  failures.push('unpublished_selected_field_inferred_'+n);
 if(/Costa Rica|Organic Rise and Shine|Sleepyhead Blend|Home Fire Espresso|Decaf Daylight Espresso/i.test(
  [facts.name,facts.origin,facts.tasting_notes,facts.producer,facts.variety].join(' ')))
  failures.push('related_product_cross_contamination_'+n);
 if(parsed?.roaster_recipe?.dose_g||parsed?.roaster_recipe?.yield_g)
  failures.push('unpublished_selected_espresso_recipe_'+n);
 inspected.push({number:n,official_url:r.official_url,final_url:r.final_url,selected_h1:r.selected_h1,
  raw_html_sha256:actualHash,selected_excerpt:own.slice(0,850),fields:facts,
  conflicts:r.conflicts||[],unsaved_ui:r.add_coffee_ui_rendered===true,
  source_review:r.source_review_rendered===true});
}
const verdict={source_sha:report.source_sha,case_numbers:[128,129],
 first_party_raw_html_rehashed:true,manual_certified:0,no_member_write:true,failures,inspected};
writeFileSync(join(dir,'r416-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R416 EXACT SELECTED AFTERPROOF] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
