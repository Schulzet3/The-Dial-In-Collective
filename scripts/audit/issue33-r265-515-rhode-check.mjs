#!/usr/bin/env node
// #33 R265 original515: fail-closed real exact selected seller / parser / Add Coffee / Source Review.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const url='https://www.lilrhodycoffee.com/products/rhode-scholar-dark-roast';
const name='Rhode Scholar - Dark Roast';
const errors=[];const check=(condition,code)=>{if(!condition)errors.push(code)};
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r265';
let sourceBytes,report,html;
try{sourceBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(sourceBytes);}catch(e){errors.push('missing_source_json:'+e.code)}
try{html=readFileSync(join(dir,'case-515.html'));}catch(e){errors.push('missing_raw_selected_html:'+e.code)}
const row=report?.records?.[0]||{},fields=row.current_fields||{};
const markup=productMarkup(html?.toString('utf8')||'');
const headings=selectedProductHeadings(markup);
const text=markup.replace(/<(script|style|noscript|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ');
check(JSON.stringify(report?.case_numbers)==='[515]'&&report?.records?.length===1,'only_original515');
check(report?.source_sha===process.env.DIC_R265_EVENT_SHA,'event_source_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R265_CHECKOUT_SHA,'checkout_source_sha');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_mutation_or_full_certification');
check(row.number===515&&row.official_url===url&&row.archived_coffee===name,'original_selected_identity');
check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,'guarded_public_selected_parser');
check(html?.length>0&&row.html_bytes===html.length&&row.html_sha256===hash(html),'raw_html_hash');
let final;try{final=new URL(row.final_url);}catch{};
const expected=new URL(url);
check(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,'exact_selected_https_and_path');
check(headings.length===1&&norm(headings[0])===norm(name),'unique_exact_selected_h1');
check(/Current Coffee:\s*Nicaragua\s+Diamente/i.test(text),'current_selected_literal_lot');
check(/seasonal dark roast/i.test(text)&&/baker.s chocolate and toffee/i.test(text),'current_selected_literal_roast_and_cup_notes');
check(norm(fields.name)===norm(name),'canonical_selected_name');
check(/rhody/i.test(fields.roaster||''),'canonical_chosen_roaster');
check(fields.roast_level==='Dark','canonical_current_dark');
check(/nicaragua/i.test(fields.origin||''),'canonical_selected_country');
check(/baker.s chocolate/i.test(fields.tasting_notes||'')&&/toffee/i.test(fields.tasting_notes||''),'canonical_literal_both_cup_notes');
check(!/your product.s name|ngchjndfgs|add description and links to your promotion/i.test(JSON.stringify(fields)),'no_template_placeholder_leak');
check(!fields.producer&&!fields.elevation_m&&!fields.variety&&!fields.decaffeination_method,'unsupported_fields_withheld');
check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,'explicit_add_coffee_and_source_review');
const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R265_CHECKOUT_SHA,source_report_sha256:sourceBytes?hash(sourceBytes):null,official_url:row.final_url||null,
 selected_h1:headings,html_sha256:html?hash(html):null,html_bytes:html?.length||0,current_fields:fields,conflicts:row.conflicts||[],
 errors,passed:errors.length===0,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r265-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R265 ORIGINAL515 SELECTED AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
