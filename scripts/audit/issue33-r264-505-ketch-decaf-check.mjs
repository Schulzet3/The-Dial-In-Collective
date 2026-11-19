#!/usr/bin/env node
// Issue33 R264: fail closed if #505 current exact selected official source cannot be verified.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const url='https://www.ketchcoffee.com/products/tier-2-decaf-colombia-el-vergel-estate-natural-process';
const name='Tier 2: Decaf Colombia EL Vergel Estate Natural Process';
const normalize=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const errors=[],ok=(test,label)=>{if(!test)errors.push(label);};
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
let bytes,report;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes);}catch{}
ok(JSON.stringify(report?.case_numbers)==='[505]'&&report?.records?.length===1,'one_original505_only');
ok(report?.source_sha===process.env.DIC_R264_EVENT_SHA,'event_sha');
ok(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R264_CHECKOUT_SHA,'checkout_sha');
ok(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
ok(report?.original_corpus_modified===false&&report?.production_operations===0&&report?.manual_certified===0,'historical_semantic_not_automatically_certified');
const r=report?.records?.[0]||{},f=r.current_fields||{};
let html;try{html=readFileSync(join(dir,'case-505.html'));}catch{}
const selected=productMarkup(html?.toString('utf8')||''),h1=selectedProductHeadings(selected);
ok(r.official_url===url&&r.archived_coffee===name,'original_selected_exact_identity');
ok(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'guarded_actual_parser_selected');
ok(html?.length>0&&r.html_bytes===html.length&&r.html_sha256===sha(html),'raw_current_html_digest');
let final;try{final=new URL(r.final_url);}catch{}
const expected=new URL(url);
ok(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,'same_exact_selected_url');
ok(h1.length===1&&normalize(h1[0])===normalize(name),'exact_unique_selected_h1');
const text=selected.replace(/<(script|style|noscript|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ');
ok(/Producers?\s*:\s*Elias\s+and\s+Shady\s+Bayter/i.test(text),'same_selected_grower');
ok(/Process\s*:\s*Natural\s*\+\s*EA\s+Sugarcane\s+Decaf/i.test(text),'same_selected_green_and_decaf');
ok(/Roast\s+Level/i.test(text)&&/Light/i.test(text)&&/Medium.dark/i.test(text),'two_purchasable_roasts');
ok(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'Add_Coffee_and_Source_Review');
ok(normalize(f.name)===normalize(name),'canonical_selected_name');
ok(/ketch/i.test(f.roaster||''),'canonical_selected_roaster');
ok(/colombia/i.test(f.origin||'')&&/tolima/i.test(f.origin||''),'canonical_direct_country_region');
ok(f.process==='Natural','canonical_green_Natural');
ok(f.decaffeination_method==='Sugar Process','canonical_decaf_Sugar_Process');
ok(/elias/i.test(f.producer||'')&&/shady/i.test(f.producer||''),'canonical_current_growers');
ok(/caturra/i.test(f.variety||''),'canonical_current_cultivar');
ok(/1450/.test(f.elevation_m||''),'canonical_current_masl');
ok(!f.roast_level,'purchased_roast_not_autoselected');
ok(!/tier\s*2/i.test(f.release_label||''),'seller_price_tier_not_release');
ok(!/washed/i.test(f.process||''),'no_sibling_washed_green_leak');
const out={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R264_CHECKOUT_SHA,source_report_sha256:bytes?sha(bytes):null,official_url:r.final_url,
 selected_h1:h1,html_sha256:html?sha(html):null,html_bytes:html?.length||0,current_fields:f,conflicts:r.conflicts||[],
 errors,passed:errors.length===0,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r264-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[ISSUE33 R264 ORIGINAL505 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
