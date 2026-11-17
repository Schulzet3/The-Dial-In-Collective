#!/usr/bin/env node
// #33 R266: verify the live selected product replacing original603 #518, NOT the archived Embu Kenya lot.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r266';
const url='https://www.limacoffeeroasters.com/products/kenya-kichwa-tembo';
const errors=[],check=(p,key)=>{if(!p)errors.push(key)};
let report,raw,reportBytes;
try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes)}catch(e){errors.push('missing_report_'+e.code)}
try{raw=readFileSync(join(dir,'case-518.html'))}catch(e){errors.push('missing_raw_html_'+e.code)}
const row=report?.records?.[0]||{},fields=row.current_fields||{};
const chosen=productMarkup(raw?.toString('utf8')||'');
const h1=selectedProductHeadings(chosen);
const own=chosen.replace(/<(script|style|noscript|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ');
check(JSON.stringify(report?.case_numbers)==='[518]'&&JSON.stringify(report?.negative_identity_case_numbers)==='[518]'&&report?.records?.length===1,'only_negative_original518');
check(report?.source_sha===process.env.DIC_R266_EVENT_SHA,'event_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R266_CHECKOUT_SHA,'checkout_sha');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_writes_no_603_certificate');
check(row.number===518&&row.official_url===url&&row.archived_coffee==='Embu Kenya','exact_original518');
check(row.status==='FETCHED'&&row.parser_ok===true,'real_guarded_https_and_parser');
let final;try{final=new URL(row.final_url)}catch{};
const expected=new URL(url);
check(final?.protocol==='https:'&&final?.host===expected.host&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final?.search&&!final?.hash,'exact_final_url');
check(raw?.length>0&&row.html_bytes===raw.length&&row.html_sha256===sha(raw),'raw_html_sha');
check(h1.length===1&&h1[0]==='Kenya'&&fields.name==='Kenya','actual_current_selected_kenya_not_archived_emb u'.replace(' ','')); 
check(row.selected_heading_identity_verified===false&&row.original_product_not_certified===true&&row.current_identity_exception==='CHANGED_SELECTED_PRODUCT_EXPLICIT_NEGATIVE_DO_NOT_TRANSFER_ARCHIVED_FIELDS','old_original_not_certified');
check(requiredFocusedSourceFailures([518],[row],{negativeIdentityNumbers:[518]}).length===0,'negative_identity_guard_result');
check(/COUNTRY\s*\/{3}\s*Kenya/i.test(own)&&/REGION\s*\/{3}\s*Various Smallholders/i.test(own),'selected_new_country_and_region');
check(/TASTING NOTES\s*\/{3}\s*lemonade,\s*blackberry,\s*cranberry/i.test(own)&&/PROCESS\s*\/{3}\s*Washed/i.test(own),'selected_new_flavor_and_process');
check(/Kenya/i.test(fields.origin||'')&&/Washed/i.test(fields.process||''),'new_country_process');
for(const flavor of ['lemonade','blackberry','cranberry','black tea'])
 check(String(fields.tasting_notes||'').toLowerCase().includes(flavor),'selected_flavor_'+flavor.replaceAll(' ','_'));
check(!fields.producer&&!fields.variety&&!fields.elevation_m&&!fields.decaffeination_method,'unpublished_specific_fields_absent');
check(!/Gicherori|Kibugu|Gikirima|SL[\s-]?34|SL[\s-]?28|Peach|Green Apple/i.test(JSON.stringify(fields)),'no_old_emb u_history_leak'.replace(' ',''));
check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,'editable_add_coffee_and_source_review');
const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R266_CHECKOUT_SHA,source_report_sha256:reportBytes?sha(reportBytes):null,original518_url:url,archived_original:'Embu Kenya',current_selected_h1:h1,raw_html_sha256:raw?sha(raw):null,raw_html_bytes:raw?.length||0,current_fields:fields,source_review_conflicts:row.conflicts||[],original_product_not_certified:row.original_product_not_certified===true,errors,passed:errors.length===0,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r266-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R266 CURRENT REPLACEMENT IDENTITY AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
