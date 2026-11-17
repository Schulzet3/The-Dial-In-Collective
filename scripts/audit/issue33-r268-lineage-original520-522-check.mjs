#!/usr/bin/env node
// R268 original603 #520/#521/#522 selected Lineage official live proof. This is not universal certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r268';
const cases=[
 {n:520,name:'Ethiopia, Dry Processed - Sulladjah',title:'Ethiopia, Dry Processed - Sulladjah Coffee Beans',url:'https://www.lineageroasting.com/products/copy-of-kenya-gaikundo-2',notes:['caramel','fig'],process:/natural/i},
 {n:521,name:'Colombia Select Decaf',title:'Colombia Select Decaf Coffee Beans',url:'https://www.lineageroasting.com/products/decaf',notes:['chocolate','ripe berries'],process:/washed/i},
 {n:522,name:'Ethiopia, Bishaan',title:'Ethiopia, Bishaan Coffee Beans',url:'https://www.lineageroasting.com/products/ethiopia-bishaan',notes:['red fruit','starfruit'],process:/washed/i}
];
const errors=[];const check=(ok,key)=>{if(!ok)errors.push(key)};
let report,reportBytes;
try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes)}catch(e){errors.push('missing_report_'+e.code)}
check(JSON.stringify(report?.case_numbers)==='[520,521,522]'&&report?.records?.length===3,'exact_three_selected_cases');
check(report?.source_sha===process.env.DIC_R268_EVENT_SHA,'exact_event_source_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R268_CHECKOUT_SHA,'exact_checkout_sha');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_provider_changes_or_bulk_certification');
const outputs=[];
for(const c of cases){
 const row=report?.records?.find(x=>x.number===c.n)||{},fields=row.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+c.n+'.html'))}catch(e){errors.push(c.n+'_missing_source_'+e.code)}
 const scoped=productMarkup(raw?.toString('utf8')||'');
 const heads=selectedProductHeadings(scoped);
 const first=scoped.split(/\b(?:More Coffee|Individual Bags|You may also like|Related Products)\b/i)[0];
 const selected=first.replace(/<(script|style|noscript|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#160);/gi,' ').replace(/\s+/g,' ');
 const flavorAt=selected.search(/Tasting Notes\s*/i);
 const chosenTasting=flavorAt<0?'':selected.slice(flavorAt,flavorAt+155).toLowerCase();
 const notes=String(fields.tasting_notes||'').toLowerCase();
 check(row.number===c.n&&row.official_url===c.url&&row.archived_coffee===c.name,'selected_original_'+c.n);
 check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,'current_parser_identity_'+c.n);
 let end;try{end=new URL(row.final_url)}catch{}
 const expected=new URL(c.url);
 check(end?.protocol==='https:'&&end?.hostname===expected.hostname&&end?.pathname.replace(/\/$/,'')===expected.pathname&&!end.search&&!end.hash,'no_product_redirect_'+c.n);
 check(raw?.length>0&&row.html_bytes===raw?.length&&row.html_sha256===digest(raw),'source_bytes_sha256_'+c.n);
 check(heads.length===1&&heads[0]===c.title&&fields.name===c.title,'current_selected_exact_h1_'+c.n);
 check(requiredFocusedSourceFailures([c.n],[row]).length===0,'selected_positive_guard_'+c.n);
 check(flavorAt>=0&&c.notes.every(x=>chosenTasting.includes(x)),'seller_direct_own_tasting_'+c.n);
 check(c.notes.every(x=>notes.includes(x)),'parsed_own_selected_tasting_'+c.n);
 check(c.process.test(String(fields.process||'')),'selected_green_processing_'+c.n);
 check(/2100/.test(String(fields.elevation_m||''))||c.n===521&&/1400/.test(String(fields.elevation_m||'')),'selected_elevation_'+c.n);
 if(c.n===520){
  check(!/floral|starfruit|red fruit|ripe berries/i.test(notes),'no_archived_flower_or_sibling_notes_520');
  check(!fields.decaffeination_method,'no_unpublished_decaf_520');
 }
 if(c.n===521){
  // This seller says "Processing Method: Sugarcane Washed", which supports
  // separate review of the treatment but does not unequivocally label the
  // caffeine-removal method. Do not require an inferred canonical method.
  check(/processing method\s+sugarcane washed/i.test(selected),'direct_selected_sugarcane_washed_context_521');
  check(!fields.decaffeination_method||/sugar/i.test(String(fields.decaffeination_method)),'blank_or_directly_qualified_decaf_521');
  check(!/caramel|fig|starfruit|red fruit/i.test(notes),'no_sibling_notes_521');
 }
 if(c.n===522){
  check(!/caramel|fig|chocolate|berries/i.test(notes),'no_sibling_notes_522');
  check(!fields.decaffeination_method,'no_unpublished_decaf_522');
 }
 check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,'preview_and_review_'+c.n);
 outputs.push({case:c.n,url:c.url,h1:heads,source_sha256:raw?digest(raw):null,raw_bytes:raw?.length||0,fields,conflicts:row.conflicts||[],direct_tasting:chosenTasting.slice(0,120),decaf_method_needs_manual_review:c.n===521&&!fields.decaffeination_method,harvest_period_not_current_release_proof:c.n===521});
}
const result={event_sha:report?.source_sha,checkout_sha:process.env.DIC_R268_CHECKOUT_SHA,report_sha256:reportBytes?digest(reportBytes):null,original603_manual_certified:0,production_operations:0,selected_cases:outputs,passed:errors.length===0,errors};
writeFileSync(join(dir,'r268-afterproof.json'),JSON.stringify(result,null,2)+'\n');
console.log('[DIC33 R268 ORIGINAL520-522 EXACT SELECTED LIVE PROOF] '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
