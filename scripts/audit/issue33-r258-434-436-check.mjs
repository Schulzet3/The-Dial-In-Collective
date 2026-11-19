#!/usr/bin/env node
// R258 independent guarded exact current selected source afterproof. Development only.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {cases as blackCoffee,directCurrent} from './issue33-r94-blackcoffee-433-435-check.mjs';
import {cases as blackHills,ownSelectedProof} from './issue33-r95-blackhills-436-438-check.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const selected=[{...blackCoffee.find(x=>x.number===434),host:'www.blackcoffeeroastingco.com'},
 {...blackHills.find(x=>x.number===436),host:'www.blackhillscoffee.com'}];
export function semanticFields(n,f){
 const notes=norm(f.tasting_notes);
 if(n===434)return {
  selected_name:norm(f.name)===norm('Red Room (Blend)'),
  selected_roaster:/black coffee roasting/i.test(f.roaster||''),
  labelled_dark:f.roast_level==='Dark',
  three_literal_notes:['clove','tamarind','starfruit'].every(x=>notes.includes(x)),
  no_figured_scene:!/noir|cinema|sunrise|sunset/i.test(notes),
  no_unsupported_origin:!f.origin,no_unpublished_process:!f.process,
  no_unpublished_producer:!f.producer,no_unpublished_elevation:!f.elevation_m,
  no_unpublished_decaf:!f.decaffeination_method
 };
 return {
  selected_name:norm(f.name)===norm('House Blend'),
  selected_roaster:/black hills coffee/i.test(f.roaster||''),
  mixed_roast_stays_blank:!f.roast_level,
  two_published_regions:/central america/i.test(f.origin||'')&&/south america/i.test(f.origin||''),
  no_invented_country:!/ethiopia|guatemala|kenya|brazil|colombia/i.test(f.origin||''),
  no_unpublished_notes:!f.tasting_notes,no_unpublished_process:!f.process,
  no_unpublished_producer:!f.producer,no_unpublished_elevation:!f.elevation_m,
  no_unpublished_decaf:!f.decaffeination_method
 };
}
if(process.env.DIC_R258_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[],assert=(ok,code)=>{if(!ok)errors.push(code)};
 let report,recordBytes;
 try{recordBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(recordBytes);}catch{}
 assert(JSON.stringify(report?.case_numbers)==='[434,436]'&&report?.records?.length===2,'two_exact_original603_rows');
 assert(report?.source_sha===process.env.DIC_R258_EVENT_SHA,'same_workflow_event_sha');
 assert(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R258_CHECKOUT_SHA,'actual_checkout_head_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_unchanged_bytes');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_mutations_or_false_certification');
 const items=[];
 for(const e of selected){
  const r=report?.records?.find(x=>x.number===e.number)||{},f=r.current_fields||{};
  let bytes;try{bytes=readFileSync(join(dir,'case-'+e.number+'.html'));}catch{}
  const scope=productMarkup(bytes?.toString('utf8')||''),headings=selectedProductHeadings(scope);
  const proof=e.number===434?directCurrent(scope,headings,e):ownSelectedProof(scope,headings,e);
  const literal='https://'+e.host+e.path;
  let finalUrl;try{finalUrl=new URL(r.final_url);}catch{}
  assert(r.official_url===literal&&norm(r.archived_coffee)===norm(e.name),'exact_original_url_name_'+e.number);
  assert(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'fresh_parser_identity_'+e.number);
  assert(bytes?.length>0&&r.html_bytes===bytes.length&&r.html_sha256===sha(bytes),'independent_raw_html_sha_'+e.number);
  assert(finalUrl?.protocol==='https:'&&finalUrl?.host===e.host&&finalUrl?.pathname.replace(/\/$/,'')===e.path&&!finalUrl.search&&!finalUrl.hash,'same_selected_redirect_'+e.number);
  assert((e.number===434?proof.exactUniqueSelected:proof.uniqueH1)&&
    (e.number===434?proof.directWitnesses:proof.direct).every(Boolean),'literal_own_heading_story_'+e.number);
  assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_member_preview_and_review_'+e.number);
  const checks=semanticFields(e.number,f);
  for(const [k,v] of Object.entries(checks))assert(v,e.number+'_'+k);
  items.push({number:e.number,status:r.status,final_url:r.final_url,raw_sha256:bytes?sha(bytes):null,
   html_bytes:bytes?.length||0,headings,proof,checks,fields:f,conflicts:r.conflicts||[]});
 }
 const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R258_CHECKOUT_SHA,
  evidence_sha256:recordBytes?sha(recordBytes):null,items,errors,
  passed:errors.length===0,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r258-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[ISSUE33 R258 ORIGINAL434/436 AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
