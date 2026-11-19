#!/usr/bin/env node
// Exact original #526 selected official source; not blanket 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex'),dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r270';
const url='https://www.mysticmonkcoffee.com/products/cloister-reserve-blend';
const errors=[],check=(v,k)=>{if(!v)errors.push(k);};
let bytes,report,raw;
try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes);}catch(e){errors.push('report_'+e.code);}
try{raw=readFileSync(join(dir,'case-526.html'));}catch(e){errors.push('raw_'+e.code);}
const row=report?.records?.find(x=>x.number===526)||{},f=row.current_fields||{};
const scoped=productMarkup(raw?.toString('utf8')||'');
const headings=selectedProductHeadings(scoped);
const visible=scoped.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ');
const notes=String(f.tasting_notes||'').toLowerCase();
let final;try{final=new URL(row.final_url);}catch{}
check(report?.case_numbers?.length===1&&report?.case_numbers[0]===526&&report?.records?.length===1,'single_original526');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_bulk_certification_or_mutation');
check(report?.source_sha===process.env.DIC_R270_EVENT_SHA,'workflow_event_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R270_CHECKOUT_SHA,'checkout_sha');
check(row.official_url===url&&row.archived_coffee==='Cloister Reserve Blend'&&row.status==='FETCHED'&&row.parser_ok===true,'official_fetched_parsed');
check(final?.protocol==='https:'&&final?.hostname==='www.mysticmonkcoffee.com'&&final?.pathname==='/products/cloister-reserve-blend','no_foreign_redirect');
check(raw?.length>0&&raw?.length===row.html_bytes&&digest(raw)===row.html_sha256,'raw_sha256_bytes');
check(headings.length===1&&headings[0]==='Cloister Reserve Blend'&&f.name==='Cloister Reserve Blend','selected_unique_h1');
check(requiredFocusedSourceFailures([526],[row]).length===0,'selected_identity_add_coffee_source_review');
check(['candied citrus','berry','chocolate hazelnut'].every(x=>notes.includes(x)),'direct_three_tasting_chips');
check(['candied citrus','berry','chocolate hazelnut'].every(x=>visible.toLowerCase().includes(x)),'selected_tasting_direct_html');
check(!/tangerine zest|magnolia|strawberry|papaya/i.test(notes),'no_third_party_notes');
check(/Cerrado Mineiro/i.test(visible)&&/Yirgacheffe/i.test(visible),'direct_selected_blend_components');
check(!f.roast_level,'no_roast_from_scale_endpoints_or_frozen_medium_light');
check(!f.decaffeination_method,'no_invented_decaf');
const verdict={event_sha:report?.source_sha,checkout_sha:process.env.DIC_R270_CHECKOUT_SHA,report_sha256:bytes?digest(bytes):null,
 source_sha256:raw?digest(raw):null,source_bytes:raw?.length||0,selected_h1:headings,fields:f,conflicts:row.conflicts||[],
 manual_certified:0,production_operations:0,passed:errors.length===0,errors};
writeFileSync(join(dir,'r270-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R270 ORIGINAL526 CLOISTER] '+JSON.stringify(verdict));
if(errors.length)process.exitCode=1;
