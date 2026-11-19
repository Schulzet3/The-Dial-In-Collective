#!/usr/bin/env node
// Source-bound R277 evidence gate: only two original selected products, never blanket 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r277',errors=[];
const must=(condition,label)=>{if(!condition)errors.push(label)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(error){errors.push('missing_source_report_'+(error.code||error.message))}
must(JSON.stringify(report?.case_numbers)==='[539,543]'&&report?.records?.length===2,'two_original_case_numbers');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_csv_sha256');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_global_certification_or_provider_changes');
must(report?.source_sha===process.env.DIC_R277_EVENT_SHA,'source_event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R277_CHECKOUT_SHA,'checkout_sha');
const targets={
 539:{name:'Cosa Nueva — Flagship Blend',url:'https://www.radialcoffee.com/products/cosa-nueva-flagship-blend',host:'www.radialcoffee.com',tokens:['cosa nueva','milk chocolate base','stone fruit','honey','washed process','medium light roast']},
 543:{name:'Mexico Chiapas Seasonal Espresso',url:'https://www.rallycoffee.co/products/mexico-chiapas-seasonal-espresso',host:'www.rallycoffee.co',tokens:['chiapas','el triunfo biosphere reserve','comon yaj noptic','typica','bourbon','caturra']}
};
const evidence=[];
for(const n of [539,543]){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;
 try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(error){errors.push(n+'_source_missing_'+(error.code||error.message))}
 const scoped=productMarkup(raw?.toString('utf8')||''),heads=selectedProductHeadings(scoped);
 const selected=scoped.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let final;try{final=new URL(r.final_url)}catch{}
 must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_fetched_parser');
 must(final?.protocol==='https:'&&final.hostname===t.host&&final.pathname===new URL(t.url).pathname,n+'_unchanged_selected_url');
 must(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,n+'_raw_sha256');
 must(heads.length===1&&heads[0]===t.name&&f.name===t.name&&r.archived_coffee===t.name,n+'_selected_h1');
 must(requiredFocusedSourceFailures([n],[r]).length===0,n+'_review_and_add_coffee');
 must(t.tokens.every(token=>selected.includes(token)),n+'_source_direct_description');
 if(n===539){
  must(/medium.?light/i.test(String(f.roast_level||'')),n+'_chosen_medium_light');
  must(f.process==='Washed',n+'_selected_washed');
  must(['milk chocolate','stone fruit','honey'].every(s=>String(f.tasting_notes||'').toLowerCase().includes(s)),n+'_full_direct_tasting');
  must(!f.decaffeination_method,n+'_no_invented_decaf');
 }else{
  must(/chiapas/i.test(String(f.origin||''))&&/mexico/i.test(String(f.origin||'')),n+'_chosen_origin');
  must(/comon.*yaj.*noptic/i.test(String(f.producer||'')),n+'_selected_cooperative');
  must(!/el triunfo|biosphere/i.test(String(f.origin||'')),n+'_nearby_reserve_not_farm');
  must(!/typica|bourbon|caturra/i.test(String(f.variety||'')),n+'_regional_typical_varieties_not_lot_cultivar');
  must(!f.decaffeination_method&&!f.elevation_m,n+'_missing_methods_elevation_blank');
  // Seller story prints no direct flavor list; selected-product SEO metadata may remain REVIEW-ONLY.
  if(f.tasting_notes)must((r.seo_fallback_fields||[]).includes('tasting_notes')||Boolean((r.conflicts||[]).includes('tasting_notes')),n+'_no_metadata_as_direct');
 }
 evidence.push({number:n,status:r.status,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:heads,current_fields:f,seo_fallback_fields:r.seo_fallback_fields||[],conflicts:r.conflicts||[],manual_certified:false});
}
const output={passed:errors.length===0,errors,event_sha:process.env.DIC_R277_EVENT_SHA,checkout_sha:process.env.DIC_R277_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r277-afterproof.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 R277 AFTERPROOF] '+JSON.stringify(output));
if(errors.length)process.exitCode=1;