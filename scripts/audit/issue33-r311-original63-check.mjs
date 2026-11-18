#!/usr/bin/env node
// R311: fail-closed current exact #63 selected public HTML, actual parser and member preview.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r311';
const url='https://coffeetraders.com/products/organic-sumatra';
const title='Organic Sumatra',errors=[];
const must=(ok,code)=>{if(!ok)errors.push(code)};
const hash=b=>createHash('sha256').update(b).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errors.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[63]'&&report?.records?.length===1,'exactly_original603_63');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_register_unchanged');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'read_only_and_not_corpus_certification');
must(report?.source_sha===process.env.DIC_R311_EVENT_SHA,'event_source_bound');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R311_CHECKOUT_SHA,'checkout_bound');
must(requiredFocusedSourceFailures([63],report?.records||[]).length===0,'raw_parser_add_coffee_review');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===url&&r.final_url===url,'exact_original_selected_official_only');
let raw;try{raw=readFileSync(join(dir,'case-63.html'))}catch(e){errors.push('missing_raw_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',scoped=productMarkup(html);
const headings=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'actual_current_public_and_parser');
must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'exact_raw_hash');
must(r.archived_coffee===title&&f.name===title&&headings.length>0&&
 headings.every(h=>identicalCurrentSelectedTitle(title,h,f.name)),'chosen_current_h1_not_sibling');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_explicit_member_preview');
must(['nutty','spicy','earthy','takengon','aceh','small'].every(x=>direct.includes(x)),'selected_source_direct_literals');
must(/medium/i.test(String(f.roast_level||''))&&!/dark/i.test(String(f.roast_level||'')),'selected_medium_not_sibling_dark');
must(['nutty','spicy','earthy'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'selected_direct_labeled_notes');
must(/Sumatra|Aceh|Takengon|Indonesia/i.test(String(f.origin||''))&&!/Whitefish|Montana|Colombia|Brazil|Ethiopia/i.test(String(f.origin||'')),'farm_origin_not_seller_or_related');
must(/small.?holder|small holder|farmers?/i.test(String(f.producer||'')),'selected_smallholder_role');
must(!/natural|washed|honey/i.test(String(f.process||'')),'regional_wet_hulling_not_sibling_or_unpublished_process');
must(!f.decaffeination_method,'no_invented_decaf');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'selected_labeled_notes_not_seo');
const again=extractPublicCoffeeFacts(html,{source_url:url});
must(again?.ok===true&&again.fields?.name===f.name,'current_parser_same_raw');
const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R311_EVENT_SHA,
checkout_sha:process.env.DIC_R311_CHECKOUT_SHA,manual_certified:0,production_operations:0,
record:{number:63,original_url:url,current_url:r.final_url,html_bytes:r.html_bytes,
html_sha256:r.html_sha256,selected_h1:headings,current_fields:f,conflicts:r.conflicts||[],
seo_fallback:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r311-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R311 AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
