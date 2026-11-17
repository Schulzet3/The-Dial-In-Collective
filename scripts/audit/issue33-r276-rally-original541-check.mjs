#!/usr/bin/env node
// R276 #541: enforce current original selected identity and direct, source-hashed provenance.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r276';
const errors=[],ok=(c,s)=>{if(!c)errors.push(s);};
let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes);}catch(e){errors.push('missing_report_'+(e.code||e.message));}
const r=report?.records?.find(x=>x.number===541)||{},f=r.current_fields||{};
ok(JSON.stringify(report?.case_numbers)==='[541]'&&report?.records?.length===1,'single_exact_original541');
ok(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_frozen603_sha');
ok(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_or_production_claim');
ok(report?.source_sha===process.env.DIC_R276_EVENT_SHA,'event_sha_bound');
ok(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R276_CHECKOUT_SHA,'checkout_sha_bound');
let raw;try{raw=readFileSync(join(dir,'case-541.html'));}catch(e){errors.push('raw_'+(e.code||e.message));}
const selected=productMarkup(raw?.toString('utf8')||'');
const h=selectedProductHeadings(selected);
const selectedText=selected.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
let final;try{final=new URL(r.final_url)}catch{}
ok(r.official_url==='https://www.rallycoffee.co/products/costa-rica-las-lajas'&&r.status==='FETCHED'&&r.parser_ok===true,'exact_original_fetched_parsed');
ok(final?.protocol==='https:'&&final.hostname==='www.rallycoffee.co'&&final.pathname==='/products/costa-rica-las-lajas','same_selected_url');
ok(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_html_sha256');
ok(h.length===1&&norm(h[0])==='Costa Rica Las Lajas'&&norm(f.name)==='Costa Rica Las Lajas'&&norm(r.archived_coffee)==='Costa Rica Las Lajas','current_h1_selected_identity');
ok(requiredFocusedSourceFailures([541],[r]).length===0,'exact_source_and_add_coffee_source_review');
ok(['oscar','francisca','las lajas','perla negra','natural-process','raised beds'].every(s=>selectedText.includes(s)),'same_selected_direct_published_process_producers');
ok(/costa rica/i.test(String(f.origin||'')),'direct_selected_costa_rica');
ok(/oscar/i.test(String(f.producer||''))&&/francisca/i.test(String(f.producer||'')),'direct_selected_producer_pair');
ok(f.process==='Natural','current_direct_perla_negra_natural');
ok(!f.decaffeination_method&&!f.roast_level,'no_unpublished_roast_or_decaf');
ok(!/colombia|papaya|strawberry/i.test(String(f.tasting_notes||'')),'no_cross_coffee_flavor_transfer');
ok(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.includes('tasting_notes')&&r.metadata_review_notice_rendered===true,'identity_matched_seo_tasting_review_not_confirmed');
const out={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R276_CHECKOUT_SHA,report_sha256:bytes?sha(bytes):null,original:541,selected_h1:h,raw_html_sha256:raw?sha(raw):null,html_bytes:raw?.length||0,fields:f,seo_fallback_fields:r.seo_fallback_fields||[],metadata_review_notice_rendered:r.metadata_review_notice_rendered,conflicts:r.conflicts||[],add_coffee:r.add_coffee_ui_rendered,source_review:r.source_review_rendered,passed:errors.length===0,errors,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r276-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R276 RALLY ORIGINAL541] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
