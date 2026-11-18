#!/usr/bin/env node
// R291: require fresh official selected HTML, parser, editable preview and review; fail closed.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r291';
const name='Guji Ethiopia- Organic';
const url='https://www.limacoffeeroasters.com/products/ethiopia-guji';
const failures=[];
const must=(ok,code)=>{if(!ok)failures.push(code)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[517]'&&report?.records?.length===1,'one_original517_only');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_csv_sha256');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_certification_or_provider_write');
must(report?.source_sha===process.env.DIC_R291_EVENT_SHA,'event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R291_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([517],report?.records||[]).length===0,'current_https_parser_identity_preview_review');
const r=report?.records?.find(x=>x.number===517)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-517.html'))}catch(e){failures.push('raw_missing_'+(e.code||e.message))}
let final;try{final=new URL(r.final_url)}catch{}
const headings=selectedProductHeadings(productMarkup(raw?.toString('utf8')||''));
const chosen=productMarkup(raw?.toString('utf8')||'');
const text=chosen.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===url,'chosen_public_url_fetched');
must(final?.protocol==='https:'&&final.hostname===new URL(url).hostname&&final.pathname===new URL(url).pathname,'same_selected_host_path');
must(raw?.length>0&&raw?.length===r.html_bytes&&sha(raw)===r.html_sha256,'fresh_raw_sha256_and_bytes');
must(headings.length===1&&headings[0]===name&&f.name===name&&r.archived_coffee===name,'one_exact_current_selected_h1');
must(['uraga','guji','oromia','ethiopia','blackberry preserves','candied orange','earl grey','natural','heirloom','2100-2200','kuri mountain'].every(x=>text.includes(x)),'selected_current_direct_literals');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'editable_add_coffee_source_review');
must(/ethiopia/i.test(String(f.origin||''))&&/guji|uraga|oromia/i.test(String(f.origin||'')),'current_selected_country_region');
must(['blackberry','candied orange','earl grey'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'direct_selected_three_tasting_notes');
must(/natural/i.test(String(f.process||'')),'selected_natural_process');
must(!f.decaffeination_method,'no_unpublished_decaf');
must(!/wilder garcia|related coffee|gold medal/i.test(String(f.producer||'')+' '+String(f.tasting_notes||'')),'no_other_product_producer_or_flavor');
must(!/2026/i.test(String(f.release_label||'')),'no_unrelated_award_year_as_release');
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R291_EVENT_SHA,checkout_sha:process.env.DIC_R291_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 records:[{number:517,url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:headings,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r291-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R291 AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
