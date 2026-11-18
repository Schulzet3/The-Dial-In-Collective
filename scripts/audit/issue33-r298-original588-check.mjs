#!/usr/bin/env node
// R298 exact current chosen original603 #588 source afterproof; NOT a manual corpus certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle,sameHandleCollectionAlternate} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r298';
const official='https://www.unlockedcoffee.com/products/the-pleasant';
const alternate='https://www.unlockedcoffee.com/collections/colombia-premium/products/the-pleasant';
const title='The Pleasant';
const failures=[],must=(ok,label)=>{if(!ok)failures.push(label)};
let data;
try{data=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(data?.case_numbers)==='[588]'&&data?.records?.length===1,'exact_single_original_case');
must(data?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha256');
must(data?.original_corpus_modified===false&&data?.manual_certified===0&&data?.production_operations===0,'no_original_or_provider_mutation');
must(data?.source_sha===process.env.DIC_R298_EVENT_SHA,'exact_event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R298_CHECKOUT_SHA,'exact_checkout_sha');
must(requiredFocusedSourceFailures([588],data?.records||[]).length===0,'selected_identity_parser_add_coffee_review');
const r=data?.records?.[0]||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-588.html'))}
catch(e){failures.push('missing_raw_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',scope=productMarkup(html),heads=selectedProductHeadings(scope);
const own=scope.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').toLowerCase();
let actual;try{actual=new URL(r.final_url)}catch{}
const original=new URL(official),alt=new URL(alternate);
const originalOrExactSameHandle=actual?.href===original.href||
 (actual?.href===alt.href&&sameHandleCollectionAlternate(official,alternate)===alt.href&&
  r.alternate_url_attempted===alt.href&&!!r.original_url_unavailable_reason);
must(r.official_url===official&&r.status==='FETCHED'&&r.parser_ok===true,'exact_original_public_selected_source_fetched');
must(actual?.protocol==='https:'&&actual?.hostname===original.hostname&&originalOrExactSameHandle,'original_or_bounded_identity_matched_collection');
must(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,'actual_raw_sha256_and_length');
must(heads.length===1&&heads[0]===title&&f.name===title&&r.archived_coffee===title&&
 identicalCurrentSelectedTitle(title,heads[0],f.name),'current_h1_and_parser_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_selected_add_coffee_source_review');
must(['floral','green tea','stone fruit','honey','chiroso','antioquia','washed'].every(x=>own.includes(x)),'direct_selected_source_literals');
must(/\bregion\s*:?\s*colombia[\s,]+antioquia\b/i.test(own),'direct_region_label_selected');
must(/antioquia.*colombia/i.test(String(f.origin||'')),'direct_region_precision_autofill');
must(f.process==='Washed','selected_washed_not_educational_anaerobic');
must(/chiroso/i.test(String(f.variety||''))&&!/chistoso/i.test(String(f.variety||'')),'actual_selected_chiroso_not_educational_chistoso');
must(['floral','green tea','stone fruit','honey'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'all_four_selected_notes');
must(!/gesha|tropical citrus/i.test(String(f.tasting_notes||'')),'no_related_coffee_notes');
must(!f.producer&&!f.decaffeination_method&&!f.release_label&&!f.roast_level,'no_unsupported_fields');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_sensory_fallback');
const again=raw?extractPublicCoffeeFacts(html,{source_url:r.final_url||official}):null;
must(again?.ok===true&&again.fields?.name===title,'independent_parser_on_saved_raw_source');
const result={passed:failures.length===0,failures,
 source_sha:process.env.DIC_R298_EVENT_SHA,checkout_sha:process.env.DIC_R298_CHECKOUT_SHA,
 manual_certified:0,production_operations:0,original603_modified:false,
 records:[{number:588,source_url:r.final_url,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,
 selected_h1:heads,fields:f,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r298-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R298 SELECTED AFTERPROOF] '+JSON.stringify(result));
if(failures.length)process.exitCode=1;
