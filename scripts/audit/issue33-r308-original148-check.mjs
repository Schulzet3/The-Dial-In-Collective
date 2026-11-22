#!/usr/bin/env node
// R308: strict exact selected original603 #148 raw-source/identity/parser and false semantic inference.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';

const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r308';
const official='https://highpointroasters.com/product/breakfast-blend';
const title='Breakfast Blend',errors=[];
const must=(ok,reason)=>{if(!ok)errors.push(reason)};
const sha=value=>createHash('sha256').update(value).digest('hex');
const clean=html=>String(html||'').replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').trim().toLowerCase();
let report=null;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[148]'&&report?.records?.length===1,'only_original603_148');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_unchanged');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'public_read_only_not_certification');
must(report?.source_sha===process.env.DIC_R308_EVENT_SHA,'event_sha_bound');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R308_CHECKOUT_SHA,'checkout_sha_bound');
must(requiredFocusedSourceFailures([148],report?.records||[]).length===0,'current_raw_parser_add_coffee_review');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===official,'exact_archived_original_url');
try{
 const selectedUrl=new URL(r.final_url||'');
 must(selectedUrl.protocol==='https:'&&selectedUrl.hostname==='highpointroasters.com'&&
  selectedUrl.pathname.replace(/\/$/,'')==='/product/breakfast-blend'&&!selectedUrl.search,
  'same_original_product_after_safe_canonical_slash_redirect');
}catch{errors.push('final_url_invalid')}
let raw=null;try{raw=readFileSync(join(dir,'case-148.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const selected=productMarkup(raw?.toString('utf8')||'');
const heads=selectedProductHeadings(selected),direct=clean(selected);
must(r.status==='FETCHED'&&r.parser_ok===true,'actual_current_selected_public_fetch_and_parser');
must(raw?.length>0&&r.html_bytes===raw?.length&&r.html_sha256===sha(raw),'source_capture_byte_hash_matches');
must(r.archived_coffee===title&&f.name===title&&heads.length>0&&
 heads.every(h=>identicalCurrentSelectedTitle(title,h,f.name)),'selected_h1_exact_original_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
 'actual_add_coffee_and_source_review');
must(direct.includes('a blend of central and south americas')&&direct.includes('medium body with mild acidity'),
 'exact_selected_description_not_catalog_or_seo');
must(!f.roast_level,'medium_body_is_not_medium_roast');
must(!f.tasting_notes,'mild_acidity_not_named_flavor_notes');
must(!f.process&&!f.variety&&!f.producer&&!f.elevation_m&&!f.decaffeination_method,
 'no_unpublished_processing_cultivar_farmer_elevation_decaf');
must(!/zambia|lupili|chocolate marshmallow|mississippi|colombia|brazil|peru/i.test(String(f.origin||'')),
 'no_other_coffee_or_roastery_farm_country');
must(!(r.seo_fallback_fields||[]).includes('roast_level')&&!(r.seo_fallback_fields||[]).includes('tasting_notes'),
 'no_seo_inferred_roast_or_sensory');
const rerun=extractPublicCoffeeFacts(raw?.toString('utf8')||'',{source_url:r.final_url||official});
must(rerun.ok===true&&rerun.fields?.name===title,'rerun_exact_raw_current_parser');
const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R308_EVENT_SHA,
 checkout_sha:process.env.DIC_R308_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 record:{number:148,original_url:official,current_url:r.final_url||null,selected_h1:heads,
 raw_sha256:r.html_sha256||null,raw_bytes:r.html_bytes||null,current_fields:f,
 conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r308-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R308 AFTERPROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
