#!/usr/bin/env node
// Issue33 R304: fail-closed current seller product #59 raw + actual parser/UI afterproof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle,sameHandleCollectionAlternate} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r304';
const original='https://coffeeroasterlnk.com/products/nicaragua-pumpkin-spice-pacamara';
const alternate='https://coffeeroasterlnk.com/collections/coffee/products/nicaragua-pumpkin-spice-pacamara';
const title='Nicaragua - Pumpkin Spice- Pacamara';
const errors=[],must=(condition,why)=>{if(!condition)errors.push(why)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
 catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[59]'&&report?.records?.length===1,'only_frozen59');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_register_unchanged');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_writes');
must(report?.source_sha===process.env.DIC_R304_EVENT_SHA,'event_sha_bound');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R304_CHECKOUT_SHA,'checkout_sha_bound');
must(requiredFocusedSourceFailures([59],report?.records||[]).length===0,'actual_selected_source_parser_ui');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===original,'immutable_original_url');
must(r.final_url===original||r.final_url===alternate,'exact_or_bound_same_handle_collection');
must(sameHandleCollectionAlternate(original,alternate)===alternate,'only_verified_same_product_alternate');
let raw;try{raw=readFileSync(join(dir,'case-59.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'';
const scoped=productMarkup(html);
const heads=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'source_retrieved_and_parser_ok');
must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'raw_html_byte_and_sha256');
must(heads.length===1&&heads[0]===title&&f.name===title&&r.archived_coffee===title&&
 identicalCurrentSelectedTitle(title,heads[0],f.name),'exact_chosen_product_h1');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'preview_and_review_actual');
must(['gold mountain','pacamara','without oxygen','fermented them twice','pumpkin pie','warm cinnamon'].every(s=>direct.includes(s)),
 'direct_current_selected_publication');
must(f.origin==='Nicaragua','no_marketing_phrase_geography');
must(!/pumpkin|spice|pacamara|lincoln|nebraska/i.test(String(f.origin||'')),'no_title_or_shop_location');
must(/pacamara/i.test(String(f.variety||'')),'current_exact_variety');
must(/gold mountain/i.test(String(f.producer||'')),'source_named_producer');
must(['pumpkin pie','warm cinnamon'].every(s=>String(f.tasting_notes||'').toLowerCase().includes(s)),'source_exact_sensory');
must(!/papaya|blackberry|peach|strawberry/i.test(String(f.tasting_notes||'')),'no_sibling_sensory');
must(!/washed|natural/i.test(String(f.process||'')),'no_borrowed_sibling_processing');
must(!f.decaffeination_method&&!f.elevation_m,'no_invented_decaf_or_elevation');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_sensory_fallback');
const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||original});
must(p?.ok===true&&p.fields?.name===f.name,'second_parser_on_bound_raw_html');
const result={passed:errors.length===0,errors,source_sha:process.env.DIC_R304_EVENT_SHA,
 checkout_sha:process.env.DIC_R304_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 record:{number:59,original_url:original,current_url:r.final_url,html_bytes:r.html_bytes,
 html_sha256:r.html_sha256,selected_h1:heads,current_fields:f,conflicts:r.conflicts||[],
 seo_fallback:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r304-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R304 AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
