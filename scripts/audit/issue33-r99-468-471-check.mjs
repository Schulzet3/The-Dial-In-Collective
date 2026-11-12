#!/usr/bin/env node
// #33 R99 selected official original603 #468/#471; bounded, not all-603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const cases=Object.freeze([
 {number:468,name:'La Maravilla La Cumbre',host:'www.corvuscoffee.com',path:'/products/maravilla-la-cumbre',
  own:['Washed Pache','Huehuetenango, Guatemala',"Mauricio Rosales' farm",'This Pache lot grows','Flavor Notes: Dark chocolate, toasted almond, nougat']},
 {number:471,name:'Signature Roast',host:'www.creativecoffees.com',path:'/product/signature-roast',
  own:['This Central and South America blend','equal parts of Full City and French Roast','100% Arabica']}
]);
export function ownSelectedProof(html,headings,entry){
 const selected=productMarkup(String(html||''));
 const body=selected.replace(/<!--[\s\S]*?-->/gu,' ')
   .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
   .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
   .replace(/&#(?:39|x27);/giu,"'").replace(/\s+/gu,' ');
 const own=fold(body);
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(entry.name),
  direct:entry.own.map(s=>own.includes(fold(s)))};
}
if(process.env.DIC_ISSUE33_R99_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});const failures=[],assert=(b,k)=>{if(!b)failures.push(k)};
 let report=null,reportBytes=null;
 try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'))}catch{}
 assert(JSON.stringify(report?.case_numbers)==='[468,471]'&&report?.records?.length===2,'selected_original_subset');
 assert(report?.source_sha===process.env.GITHUB_SHA,'exact_checkout_source_sha');
 assert(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original_csv_unchanged');
 assert(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_claim_or_writes');
 const observations=[];
 for(const entry of cases){
  const r=report?.records?.find(x=>x.number===entry.number)||{},f=r.current_fields||{};
  let raw=null;try{raw=readFileSync(join(dir,'case-'+entry.number+'.html'))}catch{}
  let url=null;try{url=new URL(r.final_url)}catch{}
  assert(r.official_url==='https://'+entry.host+entry.path&&r.archived_coffee===entry.name,'original_selected_'+entry.number);
  assert(url?.protocol==='https:'&&url?.hostname===entry.host&&url?.pathname.replace(/\/$/,'')===entry.path&&!url?.search&&!url?.hash,'exact_selected_final_url_'+entry.number);
  assert(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'guarded_current_identity_and_parser_'+entry.number);
  assert(Boolean(raw)&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'bound_raw_html_sha256_'+entry.number);
  const selected=productMarkup(raw?.toString('utf8')||''),headings=selectedProductHeadings(selected);
  const proof=ownSelectedProof(selected,headings,entry);
  assert(proof.uniqueH1&&proof.direct.every(Boolean),'actual_selected_h1_and_direct_printed_evidence_'+entry.number);
  assert(fold(f.name)===fold(entry.name)&&!(r.conflicts||[]).includes('name'),'actual_parser_selected_identity_'+entry.number);
  assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review_'+entry.number);
  if(entry.number===468){
   assert(/Huehuetenango/i.test(f.origin||'')&&/Guatemala/i.test(f.origin||''),'selected_guatemala_region_468');
   assert(/Washed/i.test(f.process||''),'selected_washed_468');
   assert(fold(f.variety)==='pache','selected_lot_pache_only_not_other_farm_varieties_468');
   assert(/Mauricio Rosales/i.test(f.producer||''),'selected_current_grower_468');
   assert(['Dark chocolate','toasted almond','nougat'].every(n=>fold(f.tasting_notes).includes(fold(n))),'own_printed_sensory_468');
   assert(!f.elevation_m&&!f.roast_level,'no_invented_elevation_roast_468');
  }else{
   assert(/Central America/i.test(f.origin||'')&&/South America/i.test(f.origin||''),'literal_two_broad_regions_471');
   assert(!f.roast_level,'component_full_city_french_not_finished_blend_roast_471');
   assert(!f.process&&!f.variety&&!f.producer&&!f.elevation_m&&!f.tasting_notes&&!f.decaffeination_method,'no_unpublished_or_unselected_variant_fields_471');
  }
  assert(!/natural pache|jardines del encanto|breakfast blend|other product/i.test(JSON.stringify(f)),'no_nearby_product_bleed_'+entry.number);
  observations.push({number:entry.number,status:r.status,url:r.final_url,html_sha256:r.html_sha256,
    headings,proof,fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,16)});
 }
 const result={source_sha:report?.source_sha,evidence_sha256:reportBytes?sha(reportBytes):null,
  case_numbers:cases.map(x=>x.number),observations,manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r99-468-471-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R99 EXACT CURRENT SELECTED AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
