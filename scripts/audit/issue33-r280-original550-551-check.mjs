#!/usr/bin/env node
// R280 bounded original603 current official source afterproof, NOT global semantic certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r280',errors=[];
const requireFact=(ok,k)=>{if(!ok)errors.push(k)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('missing_public_report_'+(e.code||e.message))}
requireFact(JSON.stringify(report?.case_numbers)==='[550,551]'&&report?.records?.length===2,'two_original_cases');
requireFact(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_csv_sha256');
requireFact(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_cert_or_provider_mutation');
requireFact(report?.source_sha===process.env.DIC_R280_EVENT_SHA,'event_sha_exact');
requireFact(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R280_CHECKOUT_SHA,'checkout_sha_exact');
requireFact(requiredFocusedSourceFailures([550,551],report?.records||[]).length===0,'selected_identity_and_review');
const targets={
 550:{name:'Ethiopia Natural Kembata Grade 1 (GP)',url:'https://www.roasted-beans.com/products/ethiopia-natural-kembata-grade-1-gp',tokens:['durame','kembata','elevation','2100','natural','blueberry','strawberry','harvest start month']},
 551:{name:'Uganda Organic',url:'https://www.roasted-beans.com/products/uganda-organic',tokens:['flavor notes','dark chocolate','raisins','vanilla','fully washed','bugisu','kawacom']}
};
const evidence=[];
for(const n of [550,551]){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){errors.push(n+'_html_missing_'+(e.code||e.message))}
 const chosen=productMarkup(raw?.toString('utf8')||''),h1=selectedProductHeadings(chosen);
 const visible=chosen.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let final;try{final=new URL(r.final_url)}catch{}
 requireFact(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_fetched_parser');
 requireFact(final?.protocol==='https:'&&final.hostname==='www.roasted-beans.com'&&final.pathname===new URL(t.url).pathname,n+'_unchanged_selected_url');
 requireFact(raw?.length>0&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,n+'_raw_source_hash');
 requireFact(h1.length===1&&h1[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,n+'_chosen_h1_identity');
 requireFact(t.tokens.every(x=>visible.includes(x)),n+'_direct_source_literals');
 requireFact(r.add_coffee_ui_rendered&&r.source_review_rendered,n+'_preview_review_rendered');
 requireFact(!f.decaffeination_method,n+'_no_invented_decaf_method');
 requireFact(!/mango|pineapple|raspberry/i.test(String(f.tasting_notes||'')),n+'_no_sibling_flavor_leak');
 if(n===550){
  requireFact(f.process==='Natural',n+'_direct_natural_not_misread_wet_mill');
  requireFact(/2100/.test(String(f.elevation_m||'')),n+'_2100m');
  requireFact(/kembata/i.test(String(f.origin||''))&&/ethiopia/i.test(String(f.origin||'')),n+'_chosen_region_country');
  for(const x of ['blueberry','strawberry'])requireFact(String(f.tasting_notes||'').toLowerCase().includes(x),n+'_direct_'+x);
  requireFact(!/^november|january/i.test(String(f.release_label||'')),n+'_recurring_harvest_window_not_release');
 }else{
  requireFact(/washed/i.test(String(f.process||'')),n+'_fully_washed');
  for(const x of ['dark chocolate','raisins','vanilla'])requireFact(String(f.tasting_notes||'').toLowerCase().includes(x),n+'_direct_'+x.replace(' ','_'));
  requireFact(!/kawacom|bugisu cooperative union/i.test(String(f.producer||'')),n+'_regional_exporter_not_grower');
  requireFact(/uganda/i.test(String(f.origin||'')),n+'_uganda');
 }
 evidence.push({number:n,status:r.status,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,selected_h1:h1,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const out={passed:errors.length===0,errors,event_sha:process.env.DIC_R280_EVENT_SHA,checkout_sha:process.env.DIC_R280_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r280-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R280 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;