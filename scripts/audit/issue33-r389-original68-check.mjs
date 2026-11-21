#!/usr/bin/env node
// Issue #33 R389 original #68: exact chosen product source/parser/UI, not 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r389';
const url='https://contemporoast.com/products/black-honey-berries';
const title='Black Honey Berries',errors=[];
const must=(x,reason)=>{if(!x)errors.push(reason)};
const sha=x=>createHash('sha256').update(x).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errors.push('report_unavailable_'+(e.code||e.name))}
const r=report?.records?.[0]||{}, f=r.current_fields||{};
must(JSON.stringify(report?.case_numbers)==='[68]'&&report?.records?.length===1,'only_frozen_original_68');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_register_sha256');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'nonmutating_no_manual_claim');
must(report?.source_sha===process.env.DIC_R389_EVENT_SHA,'exact_event_source');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R389_CHECKOUT_SHA,'exact_checkout_source');
must(requiredFocusedSourceFailures([68],report?.records||[]).length===0,'required_selected_source_parser_ui');
must(r.official_url===url&&r.final_url===url,'exact_original_official_url_no_alternate');
let raw;try{raw=readFileSync(join(dir,'case-68.html'))}catch(e){errors.push('raw_unavailable_'+(e.code||e.name))}
const html=raw?.toString('utf8')||'';
must(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_html_sha256_bound');
const scoped=productMarkup(html),h1=selectedProductHeadings(scoped);
must(h1.length===1&&h1.every(h=>identicalCurrentSelectedTitle(title,h,f.name)),'one_exact_selected_h1');
must(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'selected_parser_and_identity');
must(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'unsaved_add_coffee_and_source_review');
const own=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ');
must(/Producer\s*:\s*Forest/i.test(own)&&/Farmer\/Farm\s*:\s*Huver Castillo/i.test(own),
 'own_distinct_producer_and_farmer_roles_present');
must(/Process\s*:\s*Anaerobic/i.test(own)&&/Region\s*:\s*Buesaco/i.test(own),'own_exact_process_and_region');
must(/notes of mixed berries, honey and floral/i.test(own),'own_current_tasting_literal');
must(/anaerobic/i.test(String(f.process||''))&&!/\bwashed\b/i.test(String(f.process||'')),
 'selected_explicit_anaerobic_not_prior_washing_step');
must(/buesaco/i.test(String(f.origin||'')),'selected_direct_region_not_menu');
must(['berries','honey','floral'].every(s=>String(f.tasting_notes||'').toLowerCase().includes(s)),
 'selected_current_roaster_tasting');
must(!/passion fruit|pineapple/i.test(String(f.tasting_notes||'')),'no_sibling_tasting');
must(!f.decaffeination_method,'no_invented_decaf');
const again=html?extractPublicCoffeeFacts(html,{source_url:url}):null;
must(again?.ok===true&&again.fields?.name===f.name,'repeated_actual_raw_parser');
const proof={passed:errors.length===0,errors,source_sha:report?.source_sha||null,
 original603_number:68,selected_title:title,official_url:url,html_bytes:r.html_bytes||0,
 html_sha256:r.html_sha256||null,selected_h1:h1,selected_fields:f,
 observed_producer_role:r.current_fields?.producer||null,source_facts:r.source_facts||[],
 conflicts:r.conflicts||[],manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r389-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
console.log('[DIC33 R389 original68 afterproof] '+JSON.stringify({...proof,source_facts:undefined}));
if(errors.length)process.exitCode=1;
