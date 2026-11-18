#!/usr/bin/env node
// Issue #33 R292: real selected official public HTTPS, current parser and Add Coffee/Source Review only.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r292';
const name='Embu Kenya';
const url='https://www.limacoffeeroasters.com/products/kenya-kichwa-tembo';
const failures=[],must=(ok,code)=>{if(!ok)failures.push(code)};
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){failures.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[518]'&&report?.records?.length===1,'one_original518_only');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_certification_or_provider_write');
must(report?.source_sha===process.env.DIC_R292_EVENT_SHA,'event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R292_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([518],report?.records||[]).length===0,'official_https_selected_identity_parser_editable_ui');
const r=report?.records?.find(x=>x.number===518)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-518.html'))}catch(e){failures.push('raw_missing_'+(e.code||e.message))}
let final;try{final=new URL(r.final_url)}catch{}
const chosen=productMarkup(raw?.toString('utf8')||'');
const headings=selectedProductHeadings(chosen);
const txt=chosen.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===url,'chosen_original_official_url_fetched');
// Live original URL redirects within the SAME verified seller to the new canonical
// /products/embu-kenya route. This is an EXACT case-specific exception, not a
// generic slug-based acceptance or license to transfer another coffee's facts.
const knownCurrentSameProductRedirect=final?.pathname==='/products/embu-kenya'&&
 headings.length===1&&headings[0]===name&&f.name===name&&
 /kibugu fcs, gikirima factory/i.test(String(f.producer||''))&&
 /gicherori, embu county, kenya/i.test(String(f.origin||''))&&
 ['peach','black tea','green apple','honey'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x));
must(final?.protocol==='https:'&&final.hostname===new URL(url).hostname&&
 (final.pathname===new URL(url).pathname||knownCurrentSameProductRedirect),
 'exact_original_or_positively_selected_same_host_canonical_redirect');
must(raw?.length>0&&raw?.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_sha256_bytes');
must(headings.length===1&&headings[0]===name&&f.name===name&&r.archived_coffee===name,'one_exact_selected_embu_h1');
must(['gicherori','embu county','kibugu','gikirima','kenya','peach','black tea','green apple','honey','washed','sl 34','sl 28'].every(x=>txt.includes(x)),'direct_selected_literals');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'editable_add_coffee_source_review');
must(/gicherori|embu county/i.test(String(f.origin||''))&&/kenya/i.test(String(f.origin||'')),'chosen_region_country');
must(['peach','black tea','green apple','honey'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'four_direct_tasting_notes');
must(/washed/i.test(String(f.process||'')),'own_washed_process');
must(/kibugu|gikirima/i.test(String(f.producer||'')),'source_labeled_cooperative_factory_attribution');
must(!f.decaffeination_method,'no_unpublished_decaf');
must(!/wilder garcia|hambela|guji|gold medal/i.test(String(f.producer||'')+' '+String(f.tasting_notes||'')),'no_sibling_marketing_or_producer_transfer');
must(!/2026|gold medal/i.test(String(f.release_label||'')),'no_unrelated_promo_year_as_harvest');
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R292_EVENT_SHA,checkout_sha:process.env.DIC_R292_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:[{number:518,url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:headings,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r292-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R292 AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
