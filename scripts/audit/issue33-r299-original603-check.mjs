#!/usr/bin/env node
// #33 R299 fresh exact official selected original603 #603 raw afterproof; no full-corpus certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r299';
const official='https://zekescoffee.com/products/nicaragua-segovia-1-lb-16-oz';
const title='Nicaragua Segovia, 1 lb (16 oz)';
const failures=[],must=(ok,label)=>{if(!ok)failures.push(label)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[603]'&&report?.records?.length===1,'single_original603_case');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_mutation');
must(report?.source_sha===process.env.DIC_R299_EVENT_SHA,'event_source_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R299_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([603],report?.records||[]).length===0,'source_identity_add_coffee_review');
const r=report?.records?.[0]||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-603.html'))}
catch(e){failures.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',selected=productMarkup(html),heads=selectedProductHeadings(selected);
const direct=selected.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').toLowerCase();
let final;try{final=new URL(r.final_url)}catch{}
must(r.official_url===official&&r.status==='FETCHED'&&r.parser_ok===true,'official_current_source');
must(final?.protocol==='https:'&&final.hostname===new URL(official).hostname&&final.pathname===new URL(official).pathname,'exact_original_selected_product_url');
must(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,'raw_html_length_and_sha256');
must(heads.length===1&&heads[0]===title&&f.name===title&&r.archived_coffee===title&&
 identicalCurrentSelectedTitle(title,heads[0],f.name),'one_exact_selected_h1_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_review');
must(['prodecoop','palacaguina','dry mill','almond','cocoa','caramel'].every(s=>direct.includes(s)),'chosen_source_literally_documents_mill_and_taste');
must(/(?:las segovias[^.]{0,140}dry mill|dry mill[^.]{0,140}las segovias)[^.]{0,140}palacaguina/iu.test(direct),'palacaguina_specifically_mill_city');
must(!/palacaguina/i.test(String(f.origin||'')),'do_not_autofill_dry_mill_location_as_farm_origin');
must(['almond','cocoa','caramel'].every(s=>String(f.tasting_notes||'').toLowerCase().includes(s)),'all_current_direct_notes');
must(!/blueberry|gesha|tropical citrus/i.test(String(f.tasting_notes||'')),'no_neighbor_coffee_sensory');
must(!f.decaffeination_method&&!f.release_label&&!f.roast_level&&!f.variety,'no_unpublished_decaf_release_roast_variety');
must(!/natural/i.test(String(f.process||'')),'dry_mill_sun_drying_not_natural_process_claim');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_taste_substitution');
const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||official});
must(parsed?.ok===true&&parsed.fields?.name===title,'independent_actual_source_parser');
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R299_EVENT_SHA,
 checkout_sha:process.env.DIC_R299_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 records:[{number:603,url:r.final_url,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,
  selected_h1:heads,fields:f,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r299-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R299 SOURCE AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
