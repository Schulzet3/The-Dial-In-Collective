#!/usr/bin/env node
// Exact current official #562 selected read-only afterproof, NOT 603 manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {selectedElTambo562DirectFacts} from './issue33-r70-562-sey-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('read_only_source_dir_required');
const root=resolve(dir),failures=[],check=(v,k)=>{if(!v)failures.push(k);};
let bytes=null,reportBytes=null,report={},rec={};
try{reportBytes=readFileSync(join(root,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'));}catch{}
const official='https://www.seycoffee.com/products/2026-daniel-caro-lopez-el-tambo-end-of-season-colombia';
const alternate='https://www.seycoffee.com/collections/archived-coffees/products/2026-daniel-caro-lopez-el-tambo-end-of-season-colombia';
check(Boolean(reportBytes),'source_json_missing');
check(JSON.stringify(report.case_numbers)==='[562]'&&report.records?.length===1,'wrong_original603_record_subset');
check(report.source_sha===process.env.GITHUB_SHA,'not_current_source_sha');
check(report.manual_certified===0&&report.production_operations===0&&report.real_auth===false&&report.original_corpus_modified===false,
 'false_certification_or_disallowed_operation');
check(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
 'immutable_original603_csv_bytes_changed');
rec=report.records?.find(x=>x.number===562)||{};
check(rec.official_url===official&&[official,alternate].includes(rec.final_url),'original_selected_product_url_or_redirect_changed');
if(rec.alternate_url_attempted)check(rec.alternate_url_attempted===alternate&&rec.alternate_identity_match===true,'archive_alternate_identity_not_proven');
check(rec.status==='FETCHED'&&rec.parser_ok===true,'current_source_fetch_or_parser_unverified');
try{bytes=readFileSync(join(root,'case-562.html'));}catch{}
check(Boolean(bytes)&&bytes.length===rec.html_bytes&&sha(bytes)===rec.html_sha256,
 'raw_current_selected_html_size_hash_failed');
const id=rec.selected_embedded_product_identity||{};
check(rec.selected_heading_identity_verified===true&&
 (rec.selected_h1?.length===1||(
 JSON.stringify(rec.selected_h1)==='[]'&&
 id.method==='shopify_product_tracker_and_matching_visible_mobile_desktop_hero'&&
 /^[0-9]{7,20}$/.test(String(id.verified_product_id||''))&&
 id.visible_producer==='Daniel Caro Lopez'&&id.visible_country==='Colombia')),
 'no_direct_selected_2026_product_hero_and_shopify_id');
const direct=bytes?selectedElTambo562DirectFacts(bytes.toString('utf8')):null;
for(const key of ['selectedHero','selected2026Notes','selectedRegion','selectedVariety','selectedElevation','selectedHarvest',
 'selected2026Process','selectedLotBeforeProducerBio','sibling2025FactsNotSelected'])
 check(direct?.[key]===true,'selected_direct_'+key+'_missing_or_qualified');
const f=rec.current_fields||{};
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/gu,'').toLowerCase();
check(/Daniel Caro Lopez/i.test(String(f.name||''))&&/El Tambo/i.test(String(f.name||''))&&/2026/i.test(String(f.name||''))&&f.roaster==='SEY','current_chosen_product_or_roaster_mismatch');
check(/Daniel Caro Lopez/i.test(String(f.producer||''))&&/colombia/.test(normal(f.origin))&&/anza/.test(normal(f.origin)),'current_selected_producer_or_growing_region_missing');
check(f.process==='Washed'&&f.variety==='Chiroso'&&/2,200/.test(String(f.elevation_m||''))&&/July 2026/i.test(String(f.release_label||'')),'2026_lot_process_variety_elevation_harvest_mismatch');
check(/lychee.*oolong.*mango/iu.test(String(f.tasting_notes||''))&&!/tamarind|rose/iu.test(String(f.tasting_notes||'')),'2025_sibling_tasting_notes_contamination_or_missing');
check(JSON.stringify(rec.conflicts||[])==='[]'&&JSON.stringify(rec.seo_fallback_fields||[])==='[]',
 'false_direct_conflict_or_meta_fallback');
check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,
 'missing_add_coffee_or_source_review');
const verdict={kind:'ISSUE33_R70_562_2026_ENDSEASON_SELECTED_DIRECT',
 source_sha:report.source_sha||null,original603_register_sha256:report.original603_register_sha256||null,
 source_json_sha256:reportBytes?sha(reportBytes):null,manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,
 observed:{number:562,official_url:rec.official_url||null,final_url:rec.final_url||null,
 selected_h1:rec.selected_h1||[],selected_embedded_product_identity:id,
 html_bytes:bytes?.length||null,html_sha256:bytes?sha(bytes):null,
 direct_current_selected:direct,actual_fields:f,conflicts:rec.conflicts||[],
 add_coffee:rec.add_coffee_ui_rendered===true,source_review:rec.source_review_rendered===true}};
writeFileSync(join(root,'r70-562-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R70 EXACT CURRENT SELECTED #562] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
