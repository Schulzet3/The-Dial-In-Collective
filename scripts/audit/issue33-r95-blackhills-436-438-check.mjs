#!/usr/bin/env node
// Issue #33 R95: exact current Black Hills selected-product evidence, original #436/#438.
// Current official assertions are verified only against fresh guarded source artifacts.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const cases=Object.freeze([
 {number:436,name:'House Blend',path:'/products/house-blend',own:[
  'A blend of Central & South American Coffees, balanced with City Roast & Full City Roast beans',
  'Medium body and high acidity makes this a perfect all day, every day coffee']},
 {number:438,name:"Washington's Breakfast Blend",path:'/products/washingtons-breakfast-blend',own:[
  'Our mildest blend of South and Central American coffee beans, roasted light (city roast) to bring out the natural sweetness of the beans']}
]);
function selectedText(html){
 return String(html||'').replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<(?:section|div)\b[^>]*class=["'][^"']*(?:related-products|product-recommendations|recommendations)[^"']*["'][^>]*>[\s\S]*?<\/(?:section|div)>/giu,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/g,' ').trim();
}
export function ownSelectedProof(selected,headings,entry){
 const t=fold(selectedText(selected));
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(entry.name),
  direct:entry.own.map(v=>t.includes(fold(v)))};
}
if(process.env.DIC_ISSUE33_R95_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const failures=[],require=(ok,code)=>{if(!ok)failures.push(code)};
 let raw,report;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(raw.toString('utf8'));}catch{}
 require(JSON.stringify(report?.case_numbers)==='[436,438]'&&report.records?.length===2,'exact_original_subset');
 require(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 require(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_csv_immutable');
 require(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_full_or_production_claim');
 const items=[];
 for(const entry of cases){
  const r=report?.records?.find(x=>x.number===entry.number)||{},f=r.current_fields||{};
  let bytes;try{bytes=readFileSync(join(dir,'case-'+entry.number+'.html'));}catch{}
  const scope=productMarkup(bytes?.toString('utf8')||'');
  const headings=selectedProductHeadings(scope),p=ownSelectedProof(scope,headings,entry);
  let final;try{final=new URL(r.final_url)}catch{}
  require(r.official_url==='https://www.blackhillscoffee.com'+entry.path&&r.archived_coffee===entry.name,'original_identity_'+entry.number);
  require(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'fetched_parser_identity_'+entry.number);
  require(Boolean(bytes)&&digest(bytes)===r.html_sha256&&bytes.length===r.html_bytes,'raw_exact_html_sha_bytes_'+entry.number);
  require(final?.protocol==='https:'&&final?.hostname==='www.blackhillscoffee.com'&&final?.pathname.replace(/\/$/,'')===entry.path&&!final?.search&&!final?.hash,'same_official_selected_handle_'+entry.number);
  require(p.uniqueH1&&p.direct.every(Boolean),'unique_selected_h1_own_description_'+entry.number);
  require(fold(f.name)===fold(entry.name)&&/black hills coffee/i.test(f.roaster||''),'current_identity_roaster_'+entry.number);
  require(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_source_review_'+entry.number);
  require(fold(f.origin).includes('central america')&&fold(f.origin).includes('south america'),'own_both_published_regions_'+entry.number);
  require(!f.producer&&!f.process&&!f.variety&&!f.elevation_m&&!f.decaffeination_method,'no_unpublished_person_process_variety_elevation_decaf_'+entry.number);
  // Individual component roast labels are not a whole-blend roast assignment.
  // 'Medium' in the size/grind menu or 'Medium body' is not roast grade.
  if(entry.number===436){
   require(!f.roast_level,'mixed_city_full_city_components_not_one_roast_tier');
   require(!/colombia|brazil|ethiopia|guatemala|kenya/i.test(f.origin||''),'no_invented_country_436');
  } else {
   require(f.roast_level==='Light','direct_selected_roasted_light_not_medium_grind_438');
   require(!/colombia|brazil|ethiopia|guatemala|kenya/i.test(f.origin||''),'no_invented_country_438');
  }
  items.push({number:entry.number,status:r.status,final_url:r.final_url,html_sha256:r.html_sha256,
   selected_headings:headings,own_proof:p,current_fields:f,conflicts:r.conflicts||[],
   source_facts:(r.source_facts||[]).slice(0,12)});
 }
 const result={source_sha:report?.source_sha,case_numbers:cases.map(x=>x.number),
  source_evidence_sha256:raw?digest(raw):null,items,manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r95-blackhills-436-438-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R95 BLACK HILLS AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}