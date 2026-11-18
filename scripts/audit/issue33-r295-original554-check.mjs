#!/usr/bin/env node
// R295 original603 #554: exact current ROC2 Organic Mexican selected-source proof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedCurrentInlineShopifyRoastTag} from '../../src/server/coffee-current-inline-shopify-product.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r295';
const official='https://www.roc2.com/products/organic-mexican',selected='Organic Mexican';
const failures=[],must=(condition,code)=>{if(!condition)failures.push(code)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){failures.push('missing_report_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[554]'&&report?.records?.length===1,'one_original554_only');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original603_untouched');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_frozen_mutation_or_false_certification_or_provider_write');
must(report?.source_sha===process.env.DIC_R295_EVENT_SHA,'event_source_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R295_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([554],report?.records||[]).length===0,'actual_selected_parser_preview_review_identity');
const r=report?.records?.find(x=>x.number===554)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-554.html'))}catch(e){failures.push('missing_raw_'+(e.code||e.message))}
let final;try{final=new URL(r.final_url)}catch{}
const own=productMarkup(raw?.toString('utf8')||'');
const headings=selectedProductHeadings(own);
const text=own.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===official,'fresh_exact_official_public_https');
must(final?.protocol==='https:'&&final.hostname===new URL(official).hostname&&final.pathname===new URL(official).pathname,'same_selected_merchant_and_path');
must(raw?.length>0&&raw.length===r.html_bytes&&digest(raw)===r.html_sha256,'raw_source_bytes_sha256');
must(headings.length===1&&headings[0]===selected&&f.name===selected&&r.archived_coffee===selected&&
 identicalCurrentSelectedTitle(selected,headings[0],f.name),'current_exact_selected_h1');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'member_preview_and_source_review');
must(/well-balanced lighter roast with molasses, caramel, and lemongrass tasting notes/.test(text),'exact_own_comparative_roast_and_literal_notes');
must(/sourced from organic mexican farms/.test(text),'own_country_context');
must(['molasses','caramel','lemongrass'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'three_current_literal_notes');
must(!/blueberry|rose|strawberry|vanilla|black and tan/.test(String(f.tasting_notes||'').toLowerCase()),'no_sibling_or_seo_notes');
must(/mexico/i.test(String(f.origin||'')),'selected_mexican_country');
// Body's "lighter roast" remains noncategorical. Current merchant-owned
// _RSConfig.product JSON explicitly tags this exact handle/title/vendor as
// "Light Roast", a selected spec, not generic SEO/related-product promotion.
const owned=selectedCurrentInlineShopifyRoastTag(raw?.toString('utf8')||'',{
 name:f.name,roaster:f.roaster,source_url:official
});
must(owned?.value==='Light'&&owned?.source==='exact_selected_shopify_inline_product_roast_taxonomy',
 'selected_exact_shopify_product_Light_Roast_tag');
must(f.roast_level==='Light','current_parser_must_recover_selected_owned_categorical_light');
must(!f.process&&!f.producer&&!f.decaffeination_method&&!f.release_label&&!f.variety,'do_not_invent_unpublished_specs');
must((r.conflicts||[]).length===0&&!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_selected_note_conflict_or_seo');
const out={passed:failures.length===0,failures,source_sha:process.env.DIC_R295_EVENT_SHA,
 checkout_sha:process.env.DIC_R295_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 records:[{number:554,final_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,
  selected_h1:headings,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r295-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R295 AFTERPROOF] '+JSON.stringify(out));
if(failures.length)process.exitCode=1;
