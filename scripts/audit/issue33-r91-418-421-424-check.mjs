#!/usr/bin/env node
// Issue #33 R91 current independently selected original603 cases, NOT a whole-corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/&(?:nbsp|amp);/giu,' ')
 .replace(/[^a-z0-9]+/g,' ').trim();
const clean=s=>String(s||'').replace(/<!--[ \s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
export const cases=Object.freeze({
 418:{name:'AFRICAN BLEND',roaster:"Ahrre's Coffee Roastery",url:'https://www.ahrre.com/products/african-blend',
  phrases:['Floral, Fruity, Berry','Full City','East Africa'],host:'ahrre.com'},
 421:{name:'AK Mountain',roaster:'Alaska Artisan Coffee',url:'https://www.alaskaartisancoffee.com/products/ak-mountain',
  phrases:['classic medium roast','cacao nibs and apricot','mountain roast'],host:'alaskaartisancoffee.com'},
 424:{name:'Flow State Decaf',roaster:'Aldea Coffee',url:'https://www.aldeacoffee.com/products/flow_state_decaf',
  phrases:['RED BERRY, SMOOTH, NUTTY','E.A. Process Decaf','Huila, Colombia','Caturra, Colombia, and Castillo','chocolatey finish'],host:'aldeacoffee.com'}
});
export function selectedCaseEvidence(number,selectedHtml){
 const def=cases[number];if(!def)throw Error('invalid_source_case');
 const text=norm(clean(selectedHtml));
 return {found:def.phrases.map(v=>text.includes(norm(v))),selectedPhrasesPresent:def.phrases.every(v=>text.includes(norm(v)))};
}
if(process.env.DIC_ISSUE33_R91_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const errors=[],check=(ok,k)=>{if(!ok)errors.push(k)};
 let report,raw;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'))}catch{}
 check(JSON.stringify(report?.case_numbers)==='[418,421,424]'&&report?.records?.length===3,'selected_original603_subset');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_hash');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'scope_boundaries');
 const detail=[];
 for(const n of [418,421,424]){
  const def=cases[n],row=report?.records?.find(r=>r.number===n)||{},f=row.current_fields||{};
  let html;try{html=readFileSync(join(dir,'case-'+n+'.html'))}catch{}
  const selected=productMarkup(html?.toString('utf8')||''),evidence=selectedCaseEvidence(n,selected);
  let finalUrl;try{finalUrl=new URL(row.final_url)}catch{}
  const expected=new URL(def.url);
  check(row.official_url===def.url&&row.archived_coffee===def.name,n+'_original_exact_identity');
  check(finalUrl?.protocol==='https:'&&finalUrl?.hostname?.replace(/^www\./,'')===def.host&&
    finalUrl?.pathname.replace(/\/$/,'')===expected.pathname&&!finalUrl?.search&&!finalUrl?.hash,n+'_exact_selected_url');
  check(row.status==='FETCHED'&&row.parser_ok===true&&row.selected_heading_identity_verified===true,n+'_current_selected_parser_identity');
  check(html&&row.html_sha256===sha(html)&&row.html_bytes===html.length,n+'_source_raw_sha_bytes');
  check(evidence.selectedPhrasesPresent,n+'_direct_selected_product_evidence');
  check(norm(f.name)===norm(def.name)&&norm(f.roaster).includes(norm(def.roaster)),n+'_parsed_identity_roaster');
  check(row.add_coffee_ui_rendered===true&&row.source_review_rendered===true,n+'_add_coffee_review');
  check(Array.isArray(row.conflicts)&&row.conflicts.length===0,n+'_no_unresolved_parser_conflict');
  check(!f.producer&&!f.farm&&!f.elevation_m,n+'_no_unpublished_farm_elevation');
  if(n===418){
   check(f.roast_level==='Medium-Dark',n+'_Full_City_owner_taxonomy');
   check(/Africa/i.test(f.origin||'')&&!/Honduras|Colombia|Ethiopia|Kenya/i.test(f.origin||''),n+'_East_Africa_no_invented_country');
   check(['floral','fruity','berry'].every(v=>norm(f.tasting_notes).includes(v)),n+'_exact_labeled_flavor');
   check(!f.decaffeination_method&&!f.process&&!f.variety,n+'_generic_decaf_and_blend_no_inference');
  }else if(n===421){
   check(f.roast_level==='Medium',n+'_own_medium_roast');
   check(['cacao nibs','apricot'].every(v=>norm(f.tasting_notes).includes(v)),n+'_own_notes');
   check(!f.origin&&!f.process&&!f.variety&&!f.decaffeination_method,n+'_sidebar_and_neighbor_not_sources');
  }else{
   check(['red berry','smooth','nutty'].every(v=>norm(f.tasting_notes).includes(v)),n+'_direct_tasting_notes');
   check(/Huila/i.test(f.origin||'')&&/Colombia/i.test(f.origin||''),n+'_specific_current_origin');
   check(/Caturra/i.test(f.variety||'')&&/Castillo/i.test(f.variety||''),n+'_own_varietals');
   check(f.decaffeination_method==='Sugar Process',n+'_EA_sugarcane_decaf');
   check(!f.process||f.process==='Other/Unknown',n+'_decaf_not_green_processing');
   check(!/Honduras|Guatemala/i.test(JSON.stringify(f)),n+'_boilerplate_not_origin');
  }
  detail.push({number:n,html_sha256:html?sha(html):null,final_url:row.final_url,
   selected_h1:row.selected_h1,selected_h2:row.selected_form_h2,selected_identity:row.selected_heading_identity_verified,
   evidence,fields:f,conflicts:row.conflicts||[]});
 }
 const proof={source_sha:report?.source_sha,case_numbers:[418,421,424],evidence_sha256:raw?sha(raw):null,
  detail,passed:errors.length===0,failures:errors,manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r91-418-421-424-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R91 official selected afterproof] '+JSON.stringify(proof));
 if(errors.length)process.exitCode=1;
}
