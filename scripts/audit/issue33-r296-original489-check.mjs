#!/usr/bin/env node
// Original603 #489 current selected official Ghost Town Sholi. Fail closed on source drift.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r296';
const official='https://www.ghosttowncoffee.com/products/rwanda-sholi-coop-natural-copy';
const selected='Rwanda - Sholi Cooperative - Washed';
const failures=[]; const must=(ok,code)=>{if(!ok)failures.push(code)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[489]'&&report?.records?.length===1,'one_original489_only');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_immutable');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_manual_certification_or_provider_write');
must(report?.source_sha===process.env.DIC_R296_EVENT_SHA,'event_source_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R296_CHECKOUT_SHA,'checkout_source_sha');
must(requiredFocusedSourceFailures([489],report?.records||[]).length===0,'identity_parser_add_coffee_source_review');
const r=report?.records?.find(x=>x.number===489)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-489.html'))}
catch(e){failures.push('raw_missing_'+(e.code||e.message))}
let final;try{final=new URL(r.final_url)}catch{}
const scoped=productMarkup(raw?.toString('utf8')||'');
const headings=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:#39|apos);/gi,"'").replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===official,'exact_original_public_https_fetched');
must(final?.protocol==='https:'&&final.hostname===new URL(official).hostname&&final.pathname===new URL(official).pathname,'current_same_exact_selected_url');
must(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_html_sha256_and_byte_parity');
const independentlyParsed=extractPublicCoffeeFacts(raw?.toString('utf8')||'',{source_url:official});
const districtAlternatives=independentlyParsed.conflict_options?.origin||[];
must(!f.origin&&r.conflicts?.includes('origin')&&
 !independentlyParsed.fields?.origin&&independentlyParsed.conflicts?.includes('origin'),
 'contradictory_selected_district_origin_withheld');
must(districtAlternatives.some(option=>/Muhanga District/i.test(option.value))&&
 districtAlternatives.some(option=>/Muganga District/i.test(option.value)),
 'both_exact_selected_district_alternatives_reviewable');

must(headings.length===1&&headings[0]===selected&&f.name===selected&&r.archived_coffee===selected&&
 identicalCurrentSelectedTitle(selected,headings[0],f.name),'one_exact_selected_h1_and_parser_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review');
must(['sholi','chocolate','raspberry','toasted coconut','vanilla','washed','bourbon'].every(x=>direct.includes(x)),'own_selected_literal_facts');
must(['chocolate','raspberry','coconut','vanilla'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'all_direct_selected_taste_notes');
must(!/banana|pineapple|other coffee/i.test(String(f.tasting_notes||'')),'exclude_unrelated_sensory');
must(/washed/i.test(String(f.process||''))&&!/natural/i.test(String(f.process||'')),'selected_washed_over_recycled_natural_slug');
must(/bourbon/i.test(String(f.variety||'')),'direct_selected_varietal');
must(/1800|1,800/.test(String(f.elevation_m||''))&&/2000|2,000/.test(String(f.elevation_m||'')),'direct_altitude_range');
must(/sholi/i.test(String(f.producer||''))&&!/other farmer/i.test(String(f.producer||'')),'named_cooperative_not_unrelated_farmer');
must(!f.decaffeination_method&&!f.roast_level&&!f.release_label,'no_unpublished_decaf_roast_or_harvest_lot');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_flavor_fallback');
const bothDistrictSpellings=/muhanga district/i.test(direct)&&/muganga district/i.test(direct);
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R296_EVENT_SHA,
 checkout_sha:process.env.DIC_R296_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 selected_district_spelling_discrepancy:bothDistrictSpellings?'MUHANGA_IN_NARRATIVE_VS_MUGANGA_LABELED_REGION_DO_NOT_RECONCILE_BY_GUESS':'NOT_BOTH_VISIBLE',
 records:[{number:489,final_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,
 selected_h1:headings,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r296-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R296 AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
