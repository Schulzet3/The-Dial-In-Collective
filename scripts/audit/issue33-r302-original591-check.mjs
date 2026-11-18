#!/usr/bin/env node
// Issue #33 R302 exact seller product source; NEVER substitutes for full 603 review.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r302';
const url='https://www.vailcoffee.com/products/reserve-coffee-4';
const title='Decaf Ethiopian Yirgacheffe SW';
const errors=[],must=(ok,why)=>{if(!ok)errors.push(why)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[591]'&&report?.records?.length===1,'exact_one_case');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_original603_hash');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_write');
must(report?.source_sha===process.env.DIC_R302_EVENT_SHA,'event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R302_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([591],report?.records||[]).length===0,'exact_source_parser_add_coffee_review');
const r=report?.records?.[0]||{},fields=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-591.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'';
const scoped=productMarkup(html),heads=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').toLowerCase();
let final;try{final=new URL(r.final_url)}catch{}
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===url,'official_current_fetched');
must(final?.protocol==='https:'&&final.hostname===new URL(url).hostname&&final.pathname===new URL(url).pathname,'exact_original_product_url');
must(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'bound_raw_html_length_hash');
must(heads.length===1&&heads[0]===title&&fields.name===title&&r.archived_coffee===title&&
 identicalCurrentSelectedTitle(title,heads[0],fields.name),'chosen_identity_and_H1');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'real_ui_and_source_review');
must(['oromia coffee farmers cooperative','indigenous heirloom','oromia region','sweet dark berries','jasmine','hint of cocoa','full natural','swiss water'].every(x=>direct.includes(x)),'actual_selected_product_direct_publication');
must(fields.roast_level==='Light','current_light_roast_explicit');
must(/natural/i.test(String(fields.process||'')),'farm_processing_natural');
must(fields.decaffeination_method==='Water Process','swiss_water_decaf_is_not_farm_process');
must(['dark berries','jasmine','cocoa'].every(x=>String(fields.tasting_notes||'').toLowerCase().includes(x)),'current_chosen_profile_notes');
must(!/blackcurrant|pineapple|chocolate mint/i.test(String(fields.tasting_notes||'')),'no_neighbor_or_seo_sensory');
must(!/8000/i.test(String(fields.elevation_m||'')),'roastery_altitude_not_farm_altitude');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_sensory_fallback');
const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
must(p?.ok===true&&p.fields?.name===fields.name,'independent_current_raw_parser');
const output={passed:errors.length===0,errors,source_sha:process.env.DIC_R302_EVENT_SHA,
 checkout_sha:process.env.DIC_R302_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 records:[{number:591,url:r.final_url,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,
  chosen_h1:heads,fields,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r302-afterproof.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 R302 AFTERPROOF] '+JSON.stringify(output));
if(errors.length)process.exitCode=1;
