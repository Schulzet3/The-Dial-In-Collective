#!/usr/bin/env node
// Issue33 R315: actual original603 #63 current official guarded public HTTPS and parser.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r315';
const url='https://coffeetraders.com/products/organic-sumatra';
const name='Organic Sumatra',errors=[];
const must=(v,id)=>{if(!v)errors.push(id)};
const hash=b=>createHash('sha256').update(b).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[63]'&&report?.records?.length===1,'only_original603_63');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_original_data_or_provider_mutation');
must(report?.source_sha===process.env.DIC_R315_EVENT_SHA,'event_source_bound');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R315_CHECKOUT_SHA,'checkout_source_bound');
must(requiredFocusedSourceFailures([63],report?.records||[]).length===0,'real_source_parser_ui_identity_acceptance');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===url&&!r.alternate_url_attempted,'original_official_url_only');
let raw;try{raw=readFileSync(join(dir,'case-63.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',scoped=productMarkup(html);
const heads=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'current_guarded_HTTPS_and_parser');
must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'raw_HTML_byte_hash');
must(r.archived_coffee===name&&f.name===name&&heads.length>0&&heads.every(h=>identicalCurrentSelectedTitle(name,h,f.name)),'exact_selected_H1_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'real_member_preview_and_review');
must(['nutty','spicy','earthy','takengon','aceh','wet-hulled','dark roast'].every(x=>direct.includes(x)),
 'source_selected_facts_and_sibling_disclaimer');
must(['nutty','spicy','earthy'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),
 'labeled_selected_tasting_notes');
must(!/blueberr|chocolate|banana/i.test(String(f.tasting_notes||'')),'no_sibling_sensory');
must(f.roast_level==='Medium'&&!(r.conflicts||[]).some(x=>String(x).includes('roast_level')),
 'selected_medium_not_sibling_dark');
must(/sumatra|indonesia/i.test(String(f.origin||''))&&!/montana|whitefish|guatemala/i.test(String(f.origin||'')),
 'selected_origin_not_roastery_or_sibling');
must(!/^(?:Washed|Natural)$/i.test(String(f.process||'')),'wet_hulled_not_misclassified');
must(!f.decaffeination_method&&!f.release_label,'no_unsupported_decaf_or_lot');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_tasting_autofill');
const again=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
must(again?.ok===true&&again?.fields?.name===f.name,'actual_raw_replay');
const out={passed:errors.length===0,errors,checkout_sha:process.env.DIC_R315_CHECKOUT_SHA,
 event_sha:process.env.DIC_R315_EVENT_SHA,manual_certified:0,production_operations:0,
 record:{number:63,url,final_url:r.final_url,html_sha256:r.html_sha256,
 html_bytes:r.html_bytes,headings:heads,fields:f,conflicts:r.conflicts||[],
 seo_fallback:r.seo_fallback_fields||[],strict_geo_locality_direct_present:direct.includes('takengon')&&direct.includes('aceh'),
 parser_locality_present:/takengon|aceh/i.test(String(f.origin||''))}};
writeFileSync(join(dir,'r315-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R315 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
