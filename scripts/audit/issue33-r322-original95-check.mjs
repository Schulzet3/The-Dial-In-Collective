#!/usr/bin/env node
// #33 R322 exact original603 #95 current selected real HTML/current parser/UI afterproof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';

const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r322';
const url='https://daylily.coffee/products/colombia-finca-la-esperanza';
const name='Colombia Finca la Esperanza',errors=[];
const must=(value,code)=>{if(!value)errors.push(code)};
const sha=b=>createHash('sha256').update(b).digest('hex');
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch{errors.push('missing_focused_source_report')}
must(JSON.stringify(report?.case_numbers)==='[95]'&&report?.records?.length===1,'one_original95');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_checksum');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_unchanged_and_no_ops');
must(report?.source_sha===process.env.DIC_R322_EVENT_SHA,'exact_event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R322_CHECKOUT_SHA,'exact_checkout_sha');
must(requiredFocusedSourceFailures([95],report?.records||[]).length===0,'required_official_identity_parser_ui');
const r=report?.records?.[0]||{},f=r.current_fields||{};
let bytes;
try{bytes=readFileSync(join(dir,'case-95.html'))}
catch{errors.push('missing_raw_official_html')}
const html=bytes?.toString('utf8')||'',heads=selectedProductHeadings(productMarkup(html));
const own=productMarkup(html).replace(/<(?:script|style|nav|footer|aside)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer|aside)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.official_url===url&&!r.alternate_url_attempted,'exact_original_url');
must(r.status==='FETCHED'&&r.parser_ok===true,'original_selected_fetched_parsed');
must(bytes?.length>0&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes),'raw_html_sha256');
must(r.archived_coffee===name&&f.name===name&&heads.some(h=>identicalCurrentSelectedTitle(name,h,f.name)),'selected_current_h1_identity');
must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'actual_add_coffee_and_review');
for(const token of ['finca la esperanza','faiber bolanos','anaerobic washed','caturra','raspberry'])
 must(own.includes(token),'selected_official_literally_'+token.replace(/ /g,'_'));
must(f.producer==='Faiber Bolanos','named_grower_over_separate_farm');
must(/Huila|Colombia/i.test(String(f.origin||'')),'selected_origin');
must(/Caturra/i.test(String(f.variety||'')),'selected_variety');
must(/Anaerobic/i.test(String(f.process||'')),'selected_anaerobic_process');
must(/Raspberry/i.test(String(f.tasting_notes||'')),'selected_labeled_flavors');
must(!/Kenya|South Dakota|Sioux Falls/i.test(String(f.origin||'')),'no_other_coffee_or_merchant_origin');
must(!f.decaffeination_method&&!f.release_label,'no_unsupported_decaf_or_lot');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_selected_flavor');
const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
must(replay?.ok===true&&replay.fields?.name===f.name,'actual_current_parser_replay');
const verdict={passed:errors.length===0,errors,event_sha:process.env.DIC_R322_EVENT_SHA,
 checkout_sha:process.env.DIC_R322_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 source:{number:95,original_url:url,final_url:r.final_url,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
 selected_h1:heads,parser_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r322-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R322 SELECTED AFTERPROOF] '+JSON.stringify(verdict));
if(errors.length)process.exitCode=1;
