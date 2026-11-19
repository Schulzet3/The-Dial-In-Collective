#!/usr/bin/env node
// #33 R266: CURRENT exact seller still lists original603 #518 "Embu Kenya". Archived cached "Kenya" listing is NOT current raw proof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r266';
const url='https://www.limacoffeeroasters.com/products/kenya-kichwa-tembo',name='Embu Kenya';
const errors=[],check=(p,key)=>{if(!p)errors.push(key)};
let report,raw,reportBytes;
try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes)}catch(e){errors.push('missing_report_'+e.code)}
try{raw=readFileSync(join(dir,'case-518.html'))}catch(e){errors.push('missing_raw_html_'+e.code)}
const row=report?.records?.[0]||{},fields=row.current_fields||{},chosen=productMarkup(raw?.toString('utf8')||'');
const h1=selectedProductHeadings(chosen);
const own=chosen.replace(/<(script|style|noscript|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ');
check(JSON.stringify(report?.case_numbers)==='[518]'&&!(report?.negative_identity_case_numbers||[]).length&&report?.records?.length===1,'only_positive_original518');
check(report?.source_sha===process.env.DIC_R266_EVENT_SHA,'event_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R266_CHECKOUT_SHA,'checkout_sha');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_writes_no_603_certificate');
check(row.number===518&&row.official_url===url&&row.archived_coffee===name,'exact_original518');
check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,'guarded_public_exact_selected_parser');
let final;try{final=new URL(row.final_url)}catch{};
const expected=new URL(url);
check(final?.protocol==='https:'&&final?.host===expected.host&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final?.search&&!final?.hash,'exact_final_url');
check(raw?.length>0&&row.html_bytes===raw.length&&row.html_sha256===sha(raw),'raw_html_sha');
check(h1.length===1&&h1[0]===name&&fields.name===name,'actual_selected_Embu_Kenya');
check(requiredFocusedSourceFailures([518],[row]).length===0,'positive_selected_identity_guard_result');
check(/REGION\s*\/{3}\s*Gicherori,\s*Embu County/i.test(own),'direct_selected_region');
check(/PRODUCER\s*\/{3}\s*Kibugu FCS,\s*Gikirima Factory/i.test(own),'direct_selected_producer');
check(/COUNTRY\s*\/{3}\s*Kenya/i.test(own),'direct_selected_country');
check(/TASTING NOTES\s*\/{3}\s*peach,\s*black tea,\s*green apple,\s*honey/i.test(own),'direct_selected_tasting');
check(/PROCESS\s*\/{3}\s*Washed/i.test(own),'direct_selected_process');
check(/VARIETY\s*\/{3}\s*SL\s*34,\s*SL\s*28/i.test(own),'direct_selected_variety');
check(/1800\s*-\s*1900/i.test(own),'direct_selected_altitude');
check(/Gicherori.*Embu County.*Kenya/i.test(fields.origin||''),'parsed_own_region_country');
check(/Kibugu FCS,\s*Gikirima Factory/i.test(fields.producer||''),'parsed_own_producer');
check(/Washed/i.test(fields.process||'')&&/SL\s*34,\s*SL\s*28/i.test(fields.variety||'')&&/1800\s*-\s*1900/i.test(String(fields.elevation_m||'')),'parsed_direct_process_variety_elevation');
for(const flavor of ['peach','black tea','green apple','honey'])
 check(String(fields.tasting_notes||'').toLowerCase().includes(flavor),'parsed_selected_flavor_'+flavor.replaceAll(' ','_'));
check(!fields.decaffeination_method&&!fields.release_label&&!fields.roast_level,'unpublished_decaf_release_roast_withheld');
check(!/lemonade|blackberry|cranberry|various smallholders/i.test(JSON.stringify(fields)),'no_stale_index_kenya_fields');
check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,'explicit_add_coffee_and_source_review');
const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R266_CHECKOUT_SHA,source_report_sha256:reportBytes?sha(reportBytes):null,original518_url:url,archived_original:name,current_selected_h1:h1,raw_html_sha256:raw?sha(raw):null,raw_html_bytes:raw?.length||0,current_fields:fields,source_review_conflicts:row.conflicts||[],positive_selected_source_confirmed:row.selected_heading_identity_verified===true,errors,passed:errors.length===0,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r266-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R266 CURRENT EXACT SELECTED EMBU AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
