#!/usr/bin/env node
// #33 R290: selected real HTTPS evidence MUST fail on missing/changed identity or unsupported source.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r290';
const name="Peru Churupampa, City (mild) Roast, Fair Trade-Organic",url="https://www.rustydogcoffee.com/products/peru";
const errors=[],must=(condition,key)=>{if(!condition)errors.push(key)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('focused_report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[561]'&&report?.records?.length===1,'exact_one_original_selected');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_original_csv_sha256');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_certification_or_provider_write');
must(report?.source_sha===process.env.DIC_R290_EVENT_SHA,'event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R290_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([561],report?.records||[]).length===0,'current_fetch_parser_identity_add_coffee_source_review');
const r=report?.records?.find(x=>x.number===561)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-561.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
let actualUrl;try{actualUrl=new URL(r.final_url)}catch{}
const chosen=productMarkup(raw?.toString('utf8')||'');
const headings=selectedProductHeadings(chosen);
const plain=chosen.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===url,'public_fetched_exact_original');
must(actualUrl?.protocol==='https:'&&actualUrl.hostname===new URL(url).hostname&&actualUrl.pathname===new URL(url).pathname,'current_selected_url');
must(raw?.length>0&&raw?.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_bytes_sha_match');
must(headings.length===1&&headings[0]===name&&f.name===name&&r.archived_coffee===name,'current_exact_selected_h1_identity');
must(['cupping notes','lime','grape','brown sugar','finca churupampa','chirinos','cajamarca','washed','fair trade','organic'].every(x=>plain.includes(x)),'exact_current_direct_literals');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'editable_add_coffee_source_review');
must(/peru/i.test(String(f.origin||''))&&/cajamarca|chirinos/i.test(String(f.origin||'')),'chosen_geography');
must(/finca churupampa/i.test(String(f.producer||'')),'direct_labeled_grower');
must(/washed/i.test(String(f.process||'')),'chosen_washed');
must(['lime','grape','brown sugar'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'selected_three_cupping_notes');
must(!/swiss water|ethiopia|unrelated/i.test(String(f.tasting_notes||'')),'no_unrelated_taste');
must(!/215 neighboring|export marketing|ethiopian farmer/i.test(String(f.producer||'')),'no_neighbor_sourcing_as_current_grower');
must(!f.decaffeination_method,'no_unsupported_decaf');
const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R290_EVENT_SHA,checkout_sha:process.env.DIC_R290_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 records:[{number:561,source_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:headings,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r290-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R290 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
