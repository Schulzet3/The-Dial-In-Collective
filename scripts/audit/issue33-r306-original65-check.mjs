#!/usr/bin/env node
// R306: independently require fresh exact original #65 selected seller raw HTML and real parser/UI.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r306';
const url='https://combatcoffeetea.com/products/night-vision-medium-roast-kenya';
const title='NIGHT VISION - MEDIUM ROAST - KENYA',errors=[];
const must=(p,why)=>{if(!p)errors.push(why)};
const hash=b=>createHash('sha256').update(b).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[65]'&&report?.records?.length===1,'only_original603_65');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_untouched');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_and_provider_read_only');
must(report?.source_sha===process.env.DIC_R306_EVENT_SHA,'event_commit_bound');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R306_CHECKOUT_SHA,'checkout_commit_bound');
must(requiredFocusedSourceFailures([65],report?.records||[]).length===0,'selected_raw_parser_add_coffee_source_review');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===url&&r.final_url===url,'only_exact_original_selected_official_url');
let raw;try{raw=readFileSync(join(dir,'case-65.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',scoped=productMarkup(html);
const heads=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'fresh_source_and_actual_parser');
must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'raw_bytes_hash_binding');
must(r.archived_coffee===title&&f.name===title&&heads.length>0&&
 heads.every(h=>identicalCurrentSelectedTitle(title,h,f.name)),'exact_original_selected_h1_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_member_preview_and_source_review');
must(['smallholder farmers','cooperative','cocoa','fruity','sweet','washed','sl 28','sl 34','kiambu'].every(x=>direct.includes(x)),
 'selected_literal_current_product_facts');
must(/Kenya|Kiambu/i.test(String(f.origin||''))&&!/Brazil|Colombia|Sumatra|Nebraska/i.test(String(f.origin||'')),
 'selected_origin_not_sibling_or_store');
must(/medium/i.test(String(f.roast_level||'')),'direct_selected_medium_roast');
must(/washed/i.test(String(f.process||'')),'own_selected_washed');
must(['cocoa','fruity','sweet'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),
 'own_direct_flavors');
must(/SL\s*28/i.test(String(f.variety||''))&&/SL\s*34/i.test(String(f.variety||'')),'selected_varieties');
must(/(?:smallholder|farmers|coop)/i.test(String(f.producer||'')),'current_selected_smallholder_producer_gap');
must(!/blueberry|tobacco|licorice|sumatra/i.test(String(f.tasting_notes||'')),'no_sibling_seo_sensory');
must(!/natural|anaerobic/i.test(String(f.process||'')),'no_sibling_process');
must(!f.decaffeination_method,'no_invented_decaf');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'direct_flavors_not_seo');
const again=extractPublicCoffeeFacts(html,{source_url:url});
must(again?.ok===true&&again.fields?.name===f.name,'actual_parser_same_exact_raw');
const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R306_EVENT_SHA,
 checkout_sha:process.env.DIC_R306_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 record:{number:65,original_url:url,current_url:r.final_url,html_bytes:r.html_bytes,
 html_sha256:r.html_sha256,selected_h1:heads,current_fields:f,conflicts:r.conflicts||[],
 seo_fallback:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r306-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R306 AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
