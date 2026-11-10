#!/usr/bin/env node
// Issue #33 R101 exact current selected original603 #513/#516/#528, NOT entire603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const cases=Object.freeze([
 {number:513,name:'Tanzania Peaberry: Kilimanjaro (Single-Bean Reserve)',
  host:'www.koffeekult.com',path:'/products/tanzania-peaberry',
  own:['Tanzania Peaberry: Kilimanjaro (Single-Bean Reserve)','Red Apple','Pear','Maple','Brown Sugar',
    '1,600+ meters','fully washed process']},
 {number:516,name:'What Cheer - Medium Roast',
  host:'www.lilrhodycoffee.com',path:'/products/what-cheer-medium-blend',
  own:['What Cheer - Medium Roast','Current Coffee: Guatemala Huehuetenango',
    'fruit over a rich chocolate base']},
 {number:528,name:'Thanksgiving Blend',
  host:'www.mysticmonkcoffee.com',path:'/products/thanksgiving-blend',
  own:['Thanksgiving Blend','Medium-dark roast with notes of dark chocolate and malt',
    'dark cherry and wild honey']}
]);
export function selectedProof(markup,headings,entry){
 const selected=productMarkup(String(markup||''));
 const body=selected.replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/&#(?:39|x27);/giu,"'").replace(/\s+/gu,' ');
 const own=fold(body);
 return {uniqueH1:Array.isArray(headings)&&headings.length===1&&
   fold(headings[0])===fold(entry.name),direct:entry.own.map(s=>own.includes(fold(s)))};
}
if(process.env.DIC_ISSUE33_R101_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 let report=null, bytes=null;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));
  report=JSON.parse(bytes.toString('utf8'));}catch{}
 const failures=[],check=(ok,key)=>{if(!ok)failures.push(key)};
 check(JSON.stringify(report?.case_numbers)==='[513,516,528]'&&report?.records?.length===3,
  'exact_three_original_selected');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_SHA');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
  'unchanged_original603_CSV');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,
  'no_corpus_mutation_no_full_certification_no_provider_writes');
 const observations=[];
 for(const entry of cases){
  const r=report?.records?.find(x=>x.number===entry.number)||{},f=r.current_fields||{};
  let raw=null;try{raw=readFileSync(join(dir,'case-'+entry.number+'.html'));}catch{}
  let url=null;try{url=new URL(r.final_url);}catch{}
  check(r.official_url==='https://'+entry.host+entry.path&&r.archived_coffee===entry.name,
   'exact_original_url_and_identity_'+entry.number);
  check(url?.protocol==='https:'&&url?.hostname===entry.host&&
   url?.pathname.replace(/\/$/u,'')===entry.path&&!url?.search&&!url?.hash,'exact_final_URL_'+entry.number);
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,
   'guarded_current_selected_parser_identity_'+entry.number);
  check(Boolean(raw)&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_selected_html_sha_'+entry.number);
  const selected=productMarkup(raw?.toString('utf8')||'');
  const h1=selectedProductHeadings(selected),proof=selectedProof(selected,h1,entry);
  check(proof.uniqueH1&&proof.direct.every(Boolean),'selected_only_H1_and_direct_source_'+entry.number);
  check(fold(f.name)===fold(entry.name)&&!(r.conflicts||[]).includes('name'),
   'parsed_current_selected_name_'+entry.number);
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
   'real_Add_Coffee_Source_Review_'+entry.number);
  if(entry.number===513){
   check(/tanzania/i.test(f.origin||''),'own_tanzania_513');
   check(/washed/i.test(f.process||''),'own_washed_513');
   check(/medium/i.test(f.roast_level||''),'own_medium_roast_513');
   check(/1,?600/i.test(f.elevation_m||''),'own_1600_plus_513');
   check(['red apple','pear','maple','brown sugar'].every(s=>fold(f.tasting_notes).includes(s)),
     'own_four_tasting_513');
   check(!f.producer&&!f.variety,'no_unpublished_producer_variety_513');
  }else if(entry.number===516){
   check(/guatemala/i.test(f.origin||'')&&/huehuetenango/i.test(f.origin||''),
     'current_guatemala_huehuetenango_516');
   check(/medium/i.test(f.roast_level||''),'own_medium_roast_516');
   check(['fruit','chocolate'].every(s=>fold(f.tasting_notes).includes(s)),'own_notes_516');
   check(!f.process&&!f.variety&&!f.producer&&!f.elevation_m,
     'no_unprinted_process_variety_producer_elevation_516');
  }else{
   check(/medium.dark/i.test(f.roast_level||''),'own_explicit_medium_dark_528');
   check(['dark chocolate','malt','dark cherry','wild honey'].every(s=>
     fold(f.tasting_notes).includes(s)),'own_complete_notes_including_malt_528');
   check(!f.origin&&!f.producer&&!f.variety&&!f.process&&!f.elevation_m,
     'no_unprinted_origin_grower_variety_process_elevation_528');
  }
  check(!/other coffee is honduras|related ethiopia|unselected farm xyz/i.test(JSON.stringify(f)),
    'no_other_product_fields_'+entry.number);
  observations.push({number:entry.number,selected_url:r.final_url,html_sha256:r.html_sha256,
    current_h1:h1,proof,fields:f,conflicts:r.conflicts||[],
    source_facts:(r.source_facts||[]).slice(0,18)});
 }
 const result={source_sha:report?.source_sha,evidence_sha256:bytes?sha(bytes):null,
  case_numbers:cases.map(x=>x.number),observations,manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r101-513-516-528-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R101 SELECTED OFFICIAL AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
