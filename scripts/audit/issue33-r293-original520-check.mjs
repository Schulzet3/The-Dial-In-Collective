#!/usr/bin/env node
// Issue33 R293: real selected original #520 official HTML vs original frozen expectation.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r293';
const url='https://www.lineageroasting.com/products/copy-of-kenya-gaikundo-2';
const archived='Ethiopia, Dry Processed - Sulladjah';
const chosen=archived+' Coffee Beans';
const failures=[],must=(ok,code)=>{if(!ok)failures.push(code)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){failures.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[520]'&&report?.records?.length===1,'one_original520_only');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_oracle_mutation_or_manual_certification');
must(report?.source_sha===process.env.DIC_R293_EVENT_SHA,'event_source_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R293_CHECKOUT_SHA,'actual_checkout_source_sha');
must(requiredFocusedSourceFailures([520],report?.records||[]).length===0,'selected_identity_parser_add_coffee_source_review');
const r=report?.records?.find(x=>x.number===520)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-520.html'))}catch(e){failures.push('raw_missing_'+(e.code||e.message))}
let final;try{final=new URL(r.final_url)}catch{}
const chosenMarkup=productMarkup(raw?.toString('utf8')||'');
const headings=selectedProductHeadings(chosenMarkup);
const selectedText=chosenMarkup.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===url,'exact_original_official_https_fetched');
must(final?.protocol==='https:'&&final.hostname===new URL(url).hostname&&final.pathname===new URL(url).pathname,'exact_selected_seller_and_original_product_path');
must(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_html_byte_hash');
must(headings.length===1&&headings[0]===chosen&&f.name===chosen&&r.archived_coffee===archived&&
 identicalCurrentSelectedTitle(archived,headings[0],f.name),'selected_current_title_exact_qualified_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_selected_add_coffee_and_source_review');
must(['ethiopia','limu','abana estate','2100','dried in cherry','heirloom','caramel','fig'].every(x=>selectedText.includes(x)),'literal_current_direct_selected_own_facts');
must(['caramel','fig'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'two_current_literal_tasting_notes');
must(!/\bfloral\b/i.test(String(f.tasting_notes||'')),'old_oracle_unpublished_floral_must_not_transfer');
must(/ethiopia/i.test(String(f.origin||'')),'selected_country');
must(/natural/i.test(String(f.process||'')),'selected_dried_in_cherry_process_normalization');
must(!/washed/i.test(String(f.process||'')),'no_related_washed_process');
must(/heirloom/i.test(String(f.variety||'')),'selected_heirloom_variety');
must(!f.decaffeination_method,'no_other_coffee_decaf');
must(!/20(?:2[0-9]|3[0-9])/i.test(String(f.release_label||'')),'seasonal_window_not_unique_harvest_year');
must(!/colombia select decaf|gathaithi|gicherori aa/i.test(String(f.name||'')+' '+String(f.tasting_notes||'')),'no_related_coffee_identity_or_flavor');
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R293_EVENT_SHA,checkout_sha:process.env.DIC_R293_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:[{number:520,final_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:headings,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r293-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R293 AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
