#!/usr/bin/env node
// R305: fail closed unless actual current #60 selected seller raw HTML, parser and UI agree.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle,sameHandleCollectionAlternate} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r305';
const original='https://coffeeroasterlnk.com/products/tanzania-peaberry';
const alternate='https://coffeeroasterlnk.com/collections/coffee/products/tanzania-peaberry';
const title='Tanzania Peaberry', errors=[];
const must=(condition,why)=>{if(!condition)errors.push(why)};
const hash=b=>createHash('sha256').update(b).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[60]'&&report?.records?.length===1,'only_original603_60');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_untouched');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_and_provider_read_only');
must(report?.source_sha===process.env.DIC_R305_EVENT_SHA,'event_commit_bound');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R305_CHECKOUT_SHA,'checkout_commit_bound');
must(requiredFocusedSourceFailures([60],report?.records||[]).length===0,'selected_raw_parser_add_coffee_source_review');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===original,'original_frozen_url');
must(r.final_url===original||r.final_url===alternate,'only_same_handle_current_url');
must(sameHandleCollectionAlternate(original,alternate)===alternate,'alternate_identity_guard');
let raw;try{raw=readFileSync(join(dir,'case-60.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'';
const scoped=productMarkup(html);
const heads=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'fresh_source_and_actual_parser');
must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'raw_bytes_hash_binding');
must(heads.length===1&&heads[0]===title&&f.name===title&&r.archived_coffee===title&&
 identicalCurrentSelectedTitle(title,heads[0],f.name),'original_selected_h1_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_review');
must(['peaberry washed','citrus','syrupy','caramel','mount kilimanjaro','mount meru','medium roast','smallholder farmers'].every(v=>direct.includes(v)),'exact_current_selected_source_literally_published');
must(/tanzania/i.test(String(f.origin||''))&&!/lincoln|nebraska|colombia|huila/i.test(String(f.origin||'')),'selected_origin_not_roastery_or_sibling');
must(/medium/i.test(String(f.roast_level||'')),'direct_selected_medium_roast');
must(/washed/i.test(String(f.process||'')),'direct_current_peaberry_washed_lot');
must(['citrus','syrupy','caramel'].every(v=>String(f.tasting_notes||'').toLowerCase().includes(v)),'own_labeled_flavor_notes');
must(!/brown sugar|roasted almond|tobacco/i.test(String(f.tasting_notes||'')),'no_sibling_or_seo_flavor');
must(!/natural|anaerobic/i.test(String(f.process||'')),'no_sibling_process');
must(!/peaberry/i.test(String(f.variety||'')),'peaberry_seed_morphology_not_cultivar');
must(!f.decaffeination_method,'no_invented_decaffeination');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'direct_notes_not_seo');
const fresh=extractPublicCoffeeFacts(html,{source_url:r.final_url||original});
must(fresh?.ok===true&&fresh.fields?.name===f.name,'second_actual_parser_on_exact_raw');
const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R305_EVENT_SHA,
 checkout_sha:process.env.DIC_R305_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 record:{number:60,original_url:original,current_url:r.final_url,html_bytes:r.html_bytes,
 html_sha256:r.html_sha256,selected_h1:heads,current_fields:f,conflicts:r.conflicts||[],
 seo_fallback:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r305-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R305 AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
