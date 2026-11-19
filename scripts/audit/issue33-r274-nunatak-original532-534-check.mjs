#!/usr/bin/env node
// #33 R274 original603 #532 Wild and #534 Raven: official exact selected source ONLY.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r274';
const selected={532:{name:'Wild',path:'/products/blends'},534:{name:'Raven Espresso',path:'/products/raven-espresso'}};
const errors=[],check=(ok,label)=>{if(!ok)errors.push(label);};
let data,report;
try{data=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(data);}catch(e){errors.push('report_'+(e.code||e.message));}
check(JSON.stringify(report?.case_numbers)==='[532,534]'&&report?.records?.length===2,'exact_two_original603');
check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_original603_register');
check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_frozen_mutation_or_unearned_certification');
check(report?.source_sha===process.env.DIC_R274_EVENT_SHA,'event_source_sha');
check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R274_CHECKOUT_SHA,'actual_checkout_sha');
const results=[];
for(const number of [532,534]){
 const s=selected[number],r=report?.records?.find(v=>v.number===number)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+number+'.html'));}catch(e){errors.push(number+'_raw_'+(e.code||e.message));}
 const own=productMarkup(raw?.toString('utf8')||'');
 const h1=selectedProductHeadings(own),notes=String(f.tasting_notes||'').toLowerCase();
 const visible=own.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let u;try{u=new URL(r.final_url);}catch{}
 check(r.official_url==='https://www.nunatakcoffee.com'+s.path&&r.archived_coffee===s.name&&r.status==='FETCHED'&&r.parser_ok===true,number+'_exact_original_fetched_parser');
 check(u?.protocol==='https:'&&u?.hostname==='www.nunatakcoffee.com'&&u?.pathname===s.path,number+'_no_alternate_or_foreign_redirect');
 check(raw?.length>0&&raw?.length===r.html_bytes&&digest(raw)===r.html_sha256,number+'_raw_digest_and_size');
 check(h1.length===1&&h1[0]===s.name&&f.name===s.name,number+'_single_selected_h1');
 check(requiredFocusedSourceFailures([number],[r]).length===0,number+'_identity_add_coffee_review');
 check(!f.decaffeination_method&&!f.producer&&!f.elevation_m&&!f.variety,number+'_unsupported_fields_blank');
 if(number===532){
  check(['ethiopia','sumatra','blueberry','pepper','ginger'].every(w=>visible.includes(w)),number+'_selected_component_source_words');
  check(f.process!=='Natural'&&f.process!=='Washed',number+'_no_whole_blend_process_from_component');
  check(!/pear|lemon|hazelnut liqueur/i.test(notes),number+'_no_unrelated_coffee_tasting');
 }else{
  check(['straight shots','dark chocolate','nuttiness','layered with milk','blueberry preserves','hazelnut liqueur'].every(w=>visible.includes(w)),number+'_separate_straight_vs_milk_source_text');
  check(!/blueberry|hazelnut liqueur/i.test(notes),number+'_milk_tasting_not_unconditional');
  check((r.selected_milk_context_facts||[]).some(x=>/layered with milk/i.test(x.value)&&/blueberry preserves/i.test(x.value)&&/hazelnut liqueur/i.test(x.value)),number+'_milk_fact_review_only');
 }
 results.push({number,url:r.final_url,html_bytes:raw?.length||0,html_sha256:raw?digest(raw):null,h1,
  fields:f,conflicts:r.conflicts||[],selected_milk_context_facts:r.selected_milk_context_facts||[],
  add_coffee:r.add_coffee_ui_rendered,source_review:r.source_review_rendered});
}
const out={event_sha:report?.source_sha,checkout_sha:process.env.DIC_R274_CHECKOUT_SHA,
 report_sha256:data?digest(data):null,cases:results,passed:errors.length===0,errors,manual_certified:0,production_operations:0};
writeFileSync(join(dir,'r274-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R274 NUNATAK ORIGINAL532 534] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
