#!/usr/bin/env node
// Original603 #519: current exact selected official HTML, parser, Add Coffee and Source Review. No automatic 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r267';
const url='https://www.limacoffeeroasters.com/products/wilder-garcia-geisha-microlot',name='Wilder Garcia Geisha - Microlot';
const errors=[],check=(ok,label)=>{if(!ok)errors.push(label)};
let report,bytes,raw;
try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes)}catch(e){errors.push('missing_focused_report_'+e.code)}
try{raw=readFileSync(join(dir,'case-519.html'))}catch(e){errors.push('missing_raw_exact_source_'+e.code)}
const row=report?.records?.[0]||{}, fields=row.current_fields||{},chosen=productMarkup(raw?.toString('utf8')||'');
const h1=selectedProductHeadings(chosen);
const direct=chosen.replace(/<(script|style|noscript|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ');
check(JSON.stringify(report?.case_numbers)==='[519]'&&report?.records?.length===1&&!report?.negative_identity_case_numbers?.length,'one_exact_positive_case');
check(report?.source_sha===process.env.DIC_R267_EVENT_SHA,'exact_workflow_event_source_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R267_CHECKOUT_SHA,'exact_checkout_source_sha');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_immutable_sha256');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_write_or_603_certification');
check(row.number===519&&row.archived_coffee===name&&row.official_url===url,'exact_original_case');
check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,'fresh_exact_selected_parser');
let final;try{final=new URL(row.final_url)}catch{};
const expected=new URL(url);
check(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,'exact_seller_url_no_redirect_to_other_product');
check(raw?.length>0&&row.html_bytes===raw?.length&&row.html_sha256===hash(raw),'raw_html_sha256_provenance');
check(h1.length===1&&h1[0]===name&&fields.name===name,'selected_h1_not_global_nav_or_related');
check(requiredFocusedSourceFailures([519],[row]).length===0,'positive_selected_identity_review_guard');
check(/PRODUCER\s*\/{3}\s*Wilder Garcia/i.test(direct),'direct_selected_producer');
check(/REGION\s*\/{3}\s*Cajamarca,\s*Peru/i.test(direct),'direct_selected_origin');
const noteAt=direct.search(/TASTING NOTES\s*\/{3}/i);
const ownNotes=noteAt<0?'':direct.slice(noteAt,noteAt+240).toLowerCase();
check(noteAt>=0&&['green grape','honeysuckle','coconut water','orange blossom'].every(f=>ownNotes.includes(f)),'direct_selected_tasting');
check(/PROCESS\s*\/{3}\s*Washed/i.test(direct)&&/VARIETY\s*\/{3}\s*Geisha/i.test(direct)&&/MASL\s*\/{3}\s*1800/i.test(direct),'direct_selected_process_variety_masl');
check(/Wilder Garcia/i.test(fields.producer||'')&&/Cajamarca.*Peru/i.test(fields.origin||''),'parsed_own_producer_and_origin');
check(/Washed/i.test(fields.process||'')&&/Geisha/i.test(fields.variety||'')&&/1800/i.test(String(fields.elevation_m||'')),'parsed_selected_process_variety_elevation');
for(const flavor of ['green grape','honeysuckle','coconut water','orange blossom'])check(String(fields.tasting_notes||'').toLowerCase().includes(flavor),'selected_tasting_'+flavor.replaceAll(' ','_'));
check(!fields.decaffeination_method&&!fields.roast_level,'no_unpublished_decaf_or_roast');
check(!/don alvaro|nicaragua|global coffee awards|8oz box|papaya|toffee/i.test(fields.tasting_notes||''),'no_related_or_award_flavor_leakage');
check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,'actual_Add_Coffee_and_Source_Review');
const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R267_CHECKOUT_SHA,report_sha256:bytes?hash(bytes):null,case:519,official_url:url,h1,current_fields:fields,source_review_conflicts:row.conflicts||[],raw_html_bytes:raw?.length||0,raw_html_sha256:raw?hash(raw):null,passed:errors.length===0,errors,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r267-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R267 ORIGINAL519 EXACT SOURCE AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
