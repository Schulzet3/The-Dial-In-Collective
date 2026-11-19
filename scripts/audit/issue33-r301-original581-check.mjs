#!/usr/bin/env node
// #33 R301 bounded original603 #581 official selected current evidence, not complete-corpus certification.
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
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r301';
const official='https://www.tandemcoffee.com/products/heri-agena-ethiopia';
const title='Heri Agena - Ethiopia';
const failures=[],must=(ok,label)=>{if(!ok)failures.push(label)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[581]'&&report?.records?.length===1,'one_exact_original603_case');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_mutation');
must(report?.source_sha===process.env.DIC_R301_EVENT_SHA,'event_source_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R301_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([581],report?.records||[]).length===0,'actual_selected_source_add_coffee_review');
const r=report?.records?.[0]||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-581.html'))}
catch(e){failures.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',selected=productMarkup(html),heads=selectedProductHeadings(selected);
const literal=selected.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').toLowerCase();
let final;try{final=new URL(r.final_url)}catch{}
must(r.official_url===official&&r.status==='FETCHED'&&r.parser_ok===true,'current_official_product_fetch');
must(final?.protocol==='https:'&&final.hostname===new URL(official).hostname&&final.pathname===new URL(official).pathname,'same_exact_selected_url_after_redirect');
must(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_selected_html_bytes_and_sha');
must(heads.length===1&&heads[0]===title&&f.name===title&&r.archived_coffee===title&&identicalCurrentSelectedTitle(title,heads[0],f.name),'one_exact_selected_h1_and_parser_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review');
must(['we hear','plum','lemonade','wildflower honey'].every(s=>literal.includes(s)),'direct_product_taste_label_and_all_three_literals');
must(['plum','lemonade','wildflower honey'].every(s=>String(f.tasting_notes||'').toLowerCase().includes(s)),'selected_literal_taste_precedes_narrative');
must(!/\bcleo\b|stone fruit|blueberry|tropical flavors/i.test(String(f.tasting_notes||'')),'do_not_promote_music_link_other_coffee_or_secondary_prose');
must(!f.roast_level&&!f.release_label&&!f.decaffeination_method,'no_unpublished_roast_lot_decaf');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_tasting_from_generic_seo');
const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||official});
must(parsed?.ok===true&&parsed.fields?.name===title,'real_raw_parser_recheck');
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R301_EVENT_SHA,
 checkout_sha:process.env.DIC_R301_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 records:[{number:581,url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,
 selected_h1:heads,fields:f,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r301-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R301 SOURCE AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
