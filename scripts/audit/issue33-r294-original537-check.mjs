#!/usr/bin/env node
// R294: exact current selected Paper Plane original #537; no historical oracle edits.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r294';
const official='https://www.paperplanecoffee.com/products/tres-cruces-honey-processed-guatemala';
const selected='TRES CRUCES, HONEY PROCESSED, GUATEMALA';
const failures=[];
const must=(ok,code)=>{if(!ok)failures.push(code)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[537]'&&report?.records?.length===1,'one_original537_only');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_immutable');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_oracle_mutation_manual_certification_or_provider_write');
must(report?.source_sha===process.env.DIC_R294_EVENT_SHA,'event_source_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R294_CHECKOUT_SHA,'checkout_source_sha');
must(requiredFocusedSourceFailures([537],report?.records||[]).length===0,'exact_identity_parser_and_add_coffee_source_review');
const r=report?.records?.find(x=>x.number===537)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-537.html'))}catch(e){failures.push('raw_missing_'+(e.code||e.message))}
let final;try{final=new URL(r.final_url)}catch{}
const selectedMarkup=productMarkup(raw?.toString('utf8')||'');
const headings=selectedProductHeadings(selectedMarkup);
const selectedText=selectedMarkup.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===official,'exact_original_official_public_https');
must(final?.protocol==='https:'&&final.hostname===new URL(official).hostname&&final.pathname===new URL(official).pathname,'same_selected_official_product_path');
must(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_html_bytes_and_sha256');
must(headings.length===1&&headings[0]===selected&&f.name===selected&&r.archived_coffee===selected&&
 identicalCurrentSelectedTitle(selected,headings[0],f.name),'one_exact_selected_h1_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_review');
must(['guava','pear','nougat','joyabaj','guatemala','caturra','bourbon','catuai','honey'].every(x=>selectedText.includes(x)),'own_selected_literal_specs_and_notes');
must(['guava','pear','nougat'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'three_literal_selected_tasting_notes');
must(!/blueberry|strawberry|banana|wush wush|white grape|juniper/i.test(String(f.tasting_notes||'')),'exclude_unrelated_coffee_notes');
must(/guatemala/i.test(String(f.origin||'')),'exact_selected_country');
must(/honey/i.test(String(f.process||'')),'selected_process_honey');
must(['caturra','bourbon','catuai'].every(x=>String(f.variety||'').toLowerCase().includes(x)),'all_three_selected_varieties');
must(/1,?500/.test(String(f.elevation_m||''))&&/1,?900/.test(String(f.elevation_m||'')),'selected_altitude_range');
must(!f.decaffeination_method&&!f.roast_level,'do_not_invent_decaf_or_unpublished_roast');
must(!f.release_label||!/\b2021\b/.test(f.release_label),'mill_establishment_year_not_selected_harvest');
must(!/other coffee|different farm|joyabaj wet mill|fecc?eg/i.test(String(f.producer||'')),'do_not_name_wet_mill_or_federation_as_grower');
must((r.conflicts||[]).length===0&&!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_unresolved_selected_note_conflicts_or_seo_notes');
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R294_EVENT_SHA,
 checkout_sha:process.env.DIC_R294_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 records:[{number:537,final_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,
  selected_h1:headings,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r294-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R294 AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
