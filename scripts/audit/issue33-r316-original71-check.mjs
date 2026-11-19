#!/usr/bin/env node
// Issue #33 R316: real original selected public HTTPS, actual parser, preview and source review.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r316',errors=[];
const url='https://coppercanyoncoffee.com/products/nicaragua',name='Nicaragua';
const must=(v,id)=>{if(!v)errors.push(id)};
const hash=b=>createHash('sha256').update(b).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[71]'&&report?.records?.length===1,'only_original603_71');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_corpus_untouched');
must(report?.source_sha===process.env.DIC_R316_EVENT_SHA,'source_event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R316_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([71],report?.records||[]).length===0,'real_source_parser_ui_identity');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===url&&!r.alternate_url_attempted,'original_chosen_url_only');
let raw;try{raw=readFileSync(join(dir,'case-71.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',scoped=productMarkup(html);
const heads=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'guarded_current_HTTPS_parser');
must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'actual_raw_hash');
must(r.archived_coffee===name&&f.name===name&&heads.length>0&&heads.every(h=>identicalCurrentSelectedTitle(name,h,f.name)),'exact_selected_h1_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_Add_Coffee_and_Source_Review');
must(['jinotega','nicaragua','medium','nutty','chocolate','raspberry','lemon'].every(x=>direct.includes(x)),'published_selected_literal_sources');
must(/jinotega/i.test(String(f.origin||''))&&/nicaragua/i.test(String(f.origin||'')),'chosen_country_region');
must(f.roast_level==='Medium','chosen_medium_roast');
must(['nutty','chocolate','sweet','raspberry','lemon'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'direct_own_in_the_cup');
must(!/guatemala|battlefield|missouri/i.test(String(f.origin||'')),'no_roastery_or_other_origin');
must(!/blueberr|pineapple/i.test(String(f.tasting_notes||'')),'no_unrelated_sensory');
must(!f.decaffeination_method&&!f.release_label&&!f.variety&&!f.producer&&!f.elevation_m,'unpublished_fields_not_invented');
must(!f.process||f.process==='Other/Unknown','process_not_published');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_sensory');
const again=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
must(again?.ok===true&&again?.fields?.name===f.name,'real_raw_replay');
const result={passed:errors.length===0,errors,checkout_sha:process.env.DIC_R316_CHECKOUT_SHA,event_sha:process.env.DIC_R316_EVENT_SHA,
 manual_certified:0,production_operations:0,record:{number:71,url,final_url:r.final_url,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
 headings:heads,fields:f,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r316-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R316 AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
