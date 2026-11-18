#!/usr/bin/env node
// R289 strict exact-source acceptance; real missing/mismatched official current HTML FAILS.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r289';
const errors=[],requireThat=(v,key)=>{if(!v)errors.push(key)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('focused_report_missing_'+(e.code||e.message))}
const nums=[558,560];
requireThat(JSON.stringify(report?.case_numbers)===JSON.stringify(nums)&&report?.records?.length===2,'exact_selected_subset');
requireThat(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_sha256_unchanged');
requireThat(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_or_production_certification');
requireThat(report?.source_sha===process.env.DIC_R289_EVENT_SHA,'exact_event_sha');
requireThat(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R289_CHECKOUT_SHA,'exact_checkout_sha');
requireThat(requiredFocusedSourceFailures(nums,report?.records||[]).length===0,'all_fetched_identity_parser_and_editable_ui');
const targets={
 558:{name:'Divine Inspiration - Nicaraguan Light-Medium Roast Relationship Coffee',
 url:'https://www.rossstreetroasting.com/products/nicaragua-divine-inspiration-relationship-coffee',
 tokens:['divine inspiration at a glance','flavor notes','spiced','jinotega','smallholder farms','washed','2023','gold mountain coffee growers']},
 560:{name:'Guatemala La Huerta, City (mild) Roast, Direct Trade',
 url:'https://www.rustydogcoffee.com/products/guatemala',
 tokens:['cupping notes','orange blossom','pecan','honey','vides 58','huehuetenango','washed']}
};
const evidence=[];
for(const n of nums){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){errors.push(n+'_raw_missing_'+(e.code||e.message))}
 let u;try{u=new URL(r.final_url)}catch{}
 const selected=productMarkup(raw?.toString('utf8')||'');
 const heads=selectedProductHeadings(selected);
 const plain=selected.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ').toLowerCase();
 requireThat(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_public_fetch_parser');
 requireThat(u?.protocol==='https:'&&u.hostname===new URL(t.url).hostname&&u.pathname===new URL(t.url).pathname,n+'_same_official_selected_url');
 requireThat(raw?.length>0&&raw?.length===r.html_bytes&&sha(raw)===r.html_sha256,n+'_raw_html_hash_match');
 requireThat(heads.length===1&&heads[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,n+'_one_current_selected_h1');
 requireThat(t.tokens.every(token=>plain.includes(token)),n+'_current_direct_selected_literals');
 requireThat(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_manual_add_and_source_review');
 requireThat(!f.decaffeination_method,n+'_unsupported_decaf_blank');
 const notes=String(f.tasting_notes||'').toLowerCase();
 requireThat(!/swiss water|blueberry|customer says|review says/i.test(notes),n+'_no_related_or_customer_flavors');
 if(n===558){
  requireThat(/nicaragua/i.test(String(f.origin||''))&&/jinotega/i.test(String(f.origin||'')),n+'_direct_selected_origin');
  requireThat(/chocolate/i.test(notes)&&/spiced apple/i.test(notes)&&/nutty/i.test(notes),n+'_all_selected_flavors');
  requireThat(/washed/i.test(String(f.process||'')),n+'_own_washed_process');
  requireThat(!/gold mountain/i.test(String(f.producer||'')),n+'_sourcing_partner_not_grower');
  requireThat(!/2025|2026/i.test(String(f.release_label||'')),n+'_no_invented_new_harvest');
 }else{
  requireThat(/guatemala/i.test(String(f.origin||''))&&/huehuetenango/i.test(String(f.origin||'')),n+'_direct_selected_region');
  requireThat(/orange blossom/i.test(notes)&&/pecan/i.test(notes)&&/honey/i.test(notes),n+'_all_direct_cupping_notes');
  requireThat(/washed/i.test(String(f.process||'')),n+'_selected_process');
  requireThat(!/dr\.\s*jorge|gold mountain/i.test(String(f.producer||'')),n+'_historic_or_supplier_not_individual_current_producer');
 }
 evidence.push({number:n,source_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:heads,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R289_EVENT_SHA,checkout_sha:process.env.DIC_R289_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r289-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R289 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
