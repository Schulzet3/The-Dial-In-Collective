#!/usr/bin/env node
// Exact current official #563 selected read-only afterproof, NOT 603 manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {selectedHalo563DirectFacts} from './issue33-r69-563-halo-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('read_only_source_dir_required');
const root=resolve(dir),failures=[],check=(v,k)=>{if(!v)failures.push(k);};
let bytes=null,reportBytes=null,report={},rec={};
try{reportBytes=readFileSync(join(root,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'));}catch{}
const official='https://www.seycoffee.com/products/2026-halo-hartume-2nd-selection-ethiopia';
check(Boolean(reportBytes),'source_json_missing');
check(JSON.stringify(report.case_numbers)==='[563]'&&report.records?.length===1,'wrong_original603_record_subset');
check(report.source_sha===process.env.GITHUB_SHA,'not_current_source_sha');
check(report.manual_certified===0&&report.production_operations===0&&report.real_auth===false&&report.original_corpus_modified===false,
 'false_certification_or_disallowed_operation');
check(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
 'immutable_original603_csv_bytes_changed');
rec=report.records?.find(x=>x.number===563)||{};
check(rec.official_url===official&&rec.final_url===official,'original_selected_product_url_or_redirect_changed');
check(rec.status==='FETCHED'&&rec.parser_ok===true,'current_source_fetch_or_parser_unverified');
try{bytes=readFileSync(join(root,'case-563.html'));}catch{}
check(Boolean(bytes)&&bytes.length===rec.html_bytes&&sha(bytes)===rec.html_sha256,
 'raw_current_selected_html_size_hash_failed');
const id=rec.selected_embedded_product_identity||{};
check(JSON.stringify(rec.selected_h1)==='[]'&&rec.selected_heading_identity_verified===true&&
 id.method==='shopify_product_tracker_and_matching_visible_mobile_desktop_hero'&&
 id.selected_title==='2026 Halo Hartume; 2nd Selection - Ethiopia'&&
 id.verified_product_id==='15445945843966'&&id.visible_producer==='Halo Hartume'&&id.visible_country==='Ethiopia'&&
 id.official_url===official,'no_exact_current_purchasable_2026_second_selection_hero_identity');
const direct=bytes?selectedHalo563DirectFacts(bytes.toString('utf8')):null;
for(const key of ['selectedHero','notes','selectedRegion','selectedVariety','selectedElevation','selectedHarvest',
 'selectedWashedProcess','directFactsBeforeStationHistory','historicalStationNotLotOrigin'])
 check(direct?.[key]===true,'selected_direct_'+key+'_missing_or_qualified');
const f=rec.current_fields||{};
check(f.name==='SEY - 2026 Halo Hartume; 2nd Selection - Ethiopia'&&f.roaster==='SEY',
 'chosen_current_product_identity_or_roaster_mismatch');
check(f.producer==='Halo Hartume'&&f.origin==='Gedeb, Yirgacheffe, Ethiopia',
 'station_historical_background_or_other_lot_poisoned_origin_producer');
check(f.process==='Washed'&&f.variety==='Ethiopian Landrace'&&
 f.elevation_m==='1,900 - 2,210 masl'&&f.release_label==='January 2026',
 'direct_selected_current_processing_variety_altitude_harvest_mismatch');
check(f.tasting_notes==='melon, plum, and lemon verbena'&&
 !/nectarine|lemongrass|jasmine|honey suckle|fresh peach|tamarind|rose/iu.test(String(f.tasting_notes||'')),
 'selected_current_2nd_selection_notes_contaminated_by_sibling_or_hidden_attribute');
check(JSON.stringify(rec.conflicts||[])==='[]'&&JSON.stringify(rec.seo_fallback_fields||[])==='[]',
 'false_direct_conflict_or_meta_fallback');
check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,
 'missing_add_coffee_or_source_review');
const verdict={kind:'ISSUE33_R69_563_SELECTED_CURRENT_SHOPIFY_DIRECT',
 source_sha:report.source_sha||null,original603_register_sha256:report.original603_register_sha256||null,
 source_json_sha256:reportBytes?sha(reportBytes):null,manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,
 observed:{number:563,official_url:rec.official_url||null,final_url:rec.final_url||null,
 selected_h1:rec.selected_h1||[],selected_embedded_product_identity:id,
 html_bytes:bytes?.length||null,html_sha256:bytes?sha(bytes):null,
 direct_current_selected:direct,actual_fields:f,conflicts:rec.conflicts||[],
 add_coffee:rec.add_coffee_ui_rendered===true,source_review:rec.source_review_rendered===true}};
writeFileSync(join(root,'r69-563-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R69 EXACT CURRENT SELECTED #563] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
