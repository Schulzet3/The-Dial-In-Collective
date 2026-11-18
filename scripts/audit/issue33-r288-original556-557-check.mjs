#!/usr/bin/env node
// R288 SHA-bound selected public source; absence/mismatch FAILS, not a silent pass.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r288';
const errors=[],must=(ok,key)=>{if(!ok)errors.push(key)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('focused_report_missing_'+(e.code||e.message))}
const nums=[556,557];
must(JSON.stringify(report?.case_numbers)===JSON.stringify(nums)&&report?.records?.length===2,'exact_original_case_subset');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_sha256_unchanged');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_universal_or_provider_claim');
must(report?.source_sha===process.env.DIC_R288_EVENT_SHA,'event_exact_source');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R288_CHECKOUT_SHA,'checkout_exact_source');
must(requiredFocusedSourceFailures(nums,report?.records||[]).length===0,'every_exact_selected_parser_and_preview');
const targets={
 556:{name:'Family Tradition - Brazilian Coffee, Seibt Family Farm, Cerrado Mineiro Region',url:'https://www.rossstreetroasting.com/products/family-tradition-brazilian-coffee-seibt-family-farm-cerrado-mineiro-region',
 tokens:['seibt family farm','cerrado mineiro','medium-dark','900 masl','sourcing partner']},
 557:{name:'Kula Peaberry - Papua New Guinea Light-Medium Roast Relationship Coffee',url:'https://www.rossstreetroasting.com/products/kula-peaberry-papua-new-guinea',
 tokens:['waghi valley','sigri estate','predominantly typica','chocolate','raisin','benchmark coffee traders','1,500']}
};
const evidence=[];
for(const number of nums){
 const t=targets[number],r=report?.records?.find(x=>x.number===number)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+number+'.html'))}catch(e){errors.push(number+'_raw_missing_'+(e.code||e.message))}
 let u;try{u=new URL(r.final_url)}catch{}
 const scoped=productMarkup(raw?.toString('utf8')||'');
 const headings=selectedProductHeadings(scoped);
 const visible=scoped.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,number+'_fetch_and_current_parser');
 must(u?.protocol==='https:'&&u.hostname==='www.rossstreetroasting.com'&&u.pathname===new URL(t.url).pathname,number+'_unchanged_exact_product_url');
 must(raw?.length>0&&raw?.length===r.html_bytes&&hash(raw)===r.html_sha256,number+'_actual_raw_html_sha256');
 must(headings.length===1&&headings[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,number+'_one_exact_selected_h1');
 must(t.tokens.every(w=>visible.includes(w)),number+'_selected_merchant_direct_literals');
 must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,number+'_editable_add_and_source_review');
 must(!f.decaffeination_method,number+'_unpublished_method_blank');
 const notes=String(f.tasting_notes||'').toLowerCase();
 must(!/customer says|great coffee|holiday gift|review says|swiss water/i.test(notes),number+'_no_review_or_sibling_tasting');
 if(number===556){
  must(/brazil/i.test(String(f.origin||''))&&/cerrado mineiro/i.test(String(f.origin||'')),number+'_current_direct_origin');
  must(/medium.dark/i.test(String(f.roast_level||'')),number+'_medium_dark');
  must(/900/.test(String(f.elevation_m||'')),number+'_direct_elevation');
  must(!/ga.cha|benchmark|matthew kruse/i.test(String(f.producer||'')),number+'_supplier_not_farmer');
  must(!/blueberry|papaya|cinnamon/i.test(notes),number+'_no_unsupported_flavors');
 }else{
  must(/papua new guinea/i.test(String(f.origin||''))&&/waghi valley/i.test(String(f.origin||'')),number+'_exact_country_region');
  must(/medium.light/i.test(String(f.roast_level||'')),number+'_light_medium_normalized');
  must(/1500|1,500/.test(String(f.elevation_m||'')),number+'_direct_elevation');
  must(/chocolate/i.test(notes)&&/raisin|dried fruit/i.test(notes),number+'_direct_selected_flavors');
  must(!/ga.cha|benchmark coffee traders/i.test(String(f.producer||'')),number+'_sourcing_partner_not_grower');
  must(!/^(washed|natural|honey)$/i.test(String(f.process||'').trim()),number+'_no_named_processing_assumption');
 }
 evidence.push({number,source_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:headings,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R288_EVENT_SHA,checkout_sha:process.env.DIC_R288_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r288-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R288 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
