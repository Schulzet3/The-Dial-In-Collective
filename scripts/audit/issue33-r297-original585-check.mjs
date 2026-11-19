#!/usr/bin/env node
// #33 R297 exact current selected original603 #585 raw official evidence, NOT a full corpus certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r297';
const official='https://www.thecoffeeexchange.com/products/peru-cafe-canchaque-natural-process-american-roast-limited-offering';
const name='Peru Cafe Canchaque – Natural, American';
const failures=[];const must=(ok,label)=>{if(!ok)failures.push(label)};
let data;try{data=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch(e){failures.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(data?.case_numbers)==='[585]'&&data?.records?.length===1,'exact_single_case');
must(data?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_hash');
must(data?.original_corpus_modified===false&&data?.manual_certified===0&&data?.production_operations===0,'no_corpus_or_provider_writes');
must(data?.source_sha===process.env.DIC_R297_EVENT_SHA,'event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R297_CHECKOUT_SHA,'checkout_sha');
must(requiredFocusedSourceFailures([585],data?.records||[]).length===0,'identity_parser_add_coffee_review');
const r=data?.records?.find(x=>x.number===585)||{},f=r.current_fields||{};
let raw;try{raw=readFileSync(join(dir,'case-585.html'))}catch(e){failures.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'';
const scope=productMarkup(html),h1=selectedProductHeadings(scope);
const direct=scope.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').toLowerCase();
let final;try{final=new URL(r.final_url)}catch{}
must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===official,'exact_official_public_fetch');
must(final?.protocol==='https:'&&final.hostname===new URL(official).hostname&&final.pathname===new URL(official).pathname,'same_selected_url');
must(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,'raw_source_sha256_and_bytes');
must(h1.length===1&&h1[0]===name&&f.name===name&&r.archived_coffee===name&&
 identicalCurrentSelectedTitle(name,h1[0],f.name),'exact_selected_h1_and_parser_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'real_add_coffee_and_source_review');
must(['canchaque','1500-2350','milk chocolate','caramel','vanilla','american roast'].every(x=>direct.includes(x)),'current_selected_literal_evidence');
must(/natural/i.test(String(f.process||'')),'selected_natural_processing');
must(['chocolate','caramel','vanilla'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'selected_direct_sensory');
must(!/pineapple|blackberry/i.test(String(f.tasting_notes||'')),'no_sibling_sensory');
must(!f.decaffeination_method&&!f.release_label,'no_unsupported_decaf_or_release');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_tasting_fallback');
must(f.roast_level==='Light','selected_merchant_american_roast_light_taxonomy');
must(!f.producer,'historical_cooperative_background_not_verified_current_grower');
must(/Flavor Notes: Honey, Malt, Candied Lemon\./i.test(html),'stale_page_seo_sensory_negative_present');
must(!/honey|malt|candied lemon/i.test(String(f.tasting_notes||'')),'stale_seo_does_not_override_selected_tastes');
const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||official});
must(parsed?.ok===true&&parsed.fields?.name===f.name,'independent_raw_parser');
const result={passed:failures.length===0,failures,source_sha:process.env.DIC_R297_EVENT_SHA,
 checkout_sha:process.env.DIC_R297_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 merchant_american_guide_present:/american roast:\s*our lightest roast/i.test(direct),
 selected_variant_american:/american roast\s*-\s*1\s*lb/i.test(direct),
 observed_roast:f.roast_level||null,observed_producer:f.producer||null,
 records:[{number:585,url:r.final_url,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,
 selected_h1:h1,fields:f,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}]};
writeFileSync(join(dir,'r297-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R297 SOURCE AFTERPROOF] '+JSON.stringify(result));
if(failures.length)process.exitCode=1;
