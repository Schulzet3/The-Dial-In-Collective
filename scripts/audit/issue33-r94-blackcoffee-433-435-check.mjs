#!/usr/bin/env node
// Development-only original603 433-435; direct selected WooCommerce product facts, never reviews.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const cases=Object.freeze([
 {number:433,name:'AM',path:'/product/am-blend',witnesses:[
  'Graham cracker, cashew, hibiscus, with a hint of lemon and sunrise','Roast Level: Lighter']},
 {number:434,name:'Red Room (Blend)',path:'/product/red-room-blend',witnesses:[
  'Clove, tamarind, starfruit, and a touch of noir cinema','Roast Level: Dark']},
 {number:435,name:'The Dark',path:'/product/the-dark',witnesses:[
  'This is our darkest blend','Roast Level: Our Darkest']}
]);
function cleanSelected(page){
 return String(page||'').replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/g,' ').trim();
}
export function directCurrent(markup,headings,entry){
 const text=fold(cleanSelected(markup));
 return {exactUniqueSelected:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(entry.name),
  directWitnesses:entry.witnesses.map(w=>text.includes(fold(w)))};
}
if(process.env.DIC_ISSUE33_R94_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],check=(ok,why)=>{if(!ok)failures.push(why)};
 let raw,report;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'));}catch{}
 check(JSON.stringify(report?.case_numbers)==='[433,434,435]'&&report?.records?.length===3,'exact_frozen_subset');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_immutable');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'scope_preserved');
 const items=[];
 for(const c of cases){
  const row=report?.records?.find(r=>r.number===c.number)||{},fields=row.current_fields||{};
  let html;try{html=readFileSync(join(dir,'case-'+c.number+'.html'));}catch{}
  const selected=productMarkup(html?.toString('utf8')||''),headings=selectedProductHeadings(selected);
  const proof=directCurrent(selected,headings,c);
  const url='https://www.blackcoffeeroastingco.com'+c.path;
  let finalUrl;try{finalUrl=new URL(row.final_url)}catch{}
  check(row.official_url===url&&row.archived_coffee===c.name,'original_identity_'+c.number);
  check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,'fetched_parser_identity_'+c.number);
  check(Boolean(html)&&sha(html)===row.html_sha256&&html.length===row.html_bytes,'raw_html_sha_bytes_'+c.number);
  check(finalUrl?.protocol==='https:'&&finalUrl?.hostname==='www.blackcoffeeroastingco.com'&&
    finalUrl?.pathname.replace(/\/$/,'')===c.path&&!finalUrl.search&&!finalUrl.hash,'same_official_selected_handle_'+c.number);
  check(proof.exactUniqueSelected&&proof.directWitnesses.every(Boolean),'exact_h1_own_direct_witnesses_'+c.number);
  check(fold(fields.name)===fold(c.name)&&/black coffee roasting/i.test(fields.roaster||''),'selected_name_roaster_'+c.number);
  check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,'member_add_and_review_'+c.number);
  check(!fields.origin&&!fields.producer&&!fields.process&&!fields.variety&&!fields.decaffeination_method,'no_unpublished_origin_producer_process_'+c.number);
  if(c.number===433){
   // "Lighter" is a comparative, not one of the owner's seven literal roast tiers.
   check(!fields.roast_level,'unsupported_comparative_lighter_not_medium_or_light');
   check(['graham cracker','cashew','hibiscus','lemon'].every(n=>
     fold(fields.tasting_notes).includes(fold(n))),'full_direct_selected_am_flavors');
   check(!(row.conflicts||[]).includes('tasting_notes'),'selected_am_notes_no_conflict');
  }
  if(c.number===434){
   check(fields.roast_level==='Dark','red_room_exact_dark');
   check(['clove','tamarind','starfruit'].every(n=>fold(fields.tasting_notes).includes(n)),
     'red_room_direct_three_flavors');
  }
  if(c.number===435){
   check(fields.roast_level==='Dark','the_dark_direct_dark_evidence');
   check(!fields.tasting_notes,'no_guest_review_chocolate_as_selected_flavor');
  }
  items.push({number:c.number,status:row.status,final_url:row.final_url,html_sha256:row.html_sha256,
   headings,proof,fields,conflicts:row.conflicts||[],source_facts:(row.source_facts||[]).slice(0,12)});
 }
 const result={source_sha:report?.source_sha,case_numbers:cases.map(c=>c.number),
  evidence_sha256:raw?sha(raw):null,items,manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r94-blackcoffee-433-435-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R94 BLACK COFFEE AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
