#!/usr/bin/env node
// Issue33 R96: source-bound exact selected-product provenance, never a 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fold=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const cases=Object.freeze([
  {number:445,name:'Guatemala',path:'/products/guatemala-antigua',own:[
    'Our current Guatemala offering is our favorite one we\'ve created to date',
    'flavor notes of stone fruit with a lemony brightness',
    'fully washed selection from the Lake Atitlan region grown at 1800-2000 meters above sea level',
    'washed HueHuetenengo grown at 1500-1700 MASL'
  ]},
  {number:446,name:'Guatemala - El Scorpion',path:'/products/guatemala-el-scorpion',own:[
    'sweet and medium-light roast offering from Guatemala',
    'washed Caturra and Bourbon varietal grown at 1500-1700 meters above sea level from the lake Atitlan region',
    'flavor notes of cherry cola, lime and molasses'
  ]}
]);
function visibleSelectedText(markup){
  return String(markup||'').replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' ').trim();
}
export function selectedProof(selected,headings,entry){
  const t=fold(visibleSelectedText(selected));
  return {uniqueH1:Array.isArray(headings)&&headings.length===1&&fold(headings[0])===fold(entry.name),
   direct:entry.own.map(v=>t.includes(fold(v)))};
}
if(process.env.DIC_ISSUE33_R96_VERIFY==='1'){
  const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
  mkdirSync(dir,{recursive:true});
  const failures=[],require=(ok,k)=>{if(!ok)failures.push(k)};
  let bytes,report;
  try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes)}catch{}
  require(JSON.stringify(report?.case_numbers)==='[445,446]'&&report?.records?.length===2,'immutable_original_subset');
  require(report?.source_sha===process.env.GITHUB_SHA,'exact_checkout_source_sha');
  require(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_csv_bytes');
  require(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_full_certification_or_production');
  const details=[];
  for(const e of cases){
    const r=report?.records?.find(x=>x.number===e.number)||{},f=r.current_fields||{};
    let raw;try{raw=readFileSync(join(dir,'case-'+e.number+'.html'))}catch{}
    const selected=productMarkup(raw?.toString('utf8')||'');
    const headings=selectedProductHeadings(selected),proof=selectedProof(selected,headings,e);
    let url;try{url=new URL(r.final_url)}catch{}
    require(r.official_url==='https://www.bluejazzcoffee.com'+e.path&&r.archived_coffee===e.name,'original_selected_url_name_'+e.number);
    require(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'fetched_parser_identity_'+e.number);
    require(raw&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_source_sha256_'+e.number);
    require(url?.protocol==='https:'&&url?.hostname==='www.bluejazzcoffee.com'&&url?.pathname.replace(/\/$/,'')===e.path&&!url?.search&&!url?.hash,'exact_final_official_product_'+e.number);
    require(proof.uniqueH1&&proof.direct.every(Boolean),'selected_h1_and_own_product_prose_'+e.number);
    require(fold(f.name)===fold(e.name)&&/blue jazz coffee/i.test(f.roaster||''),'actual_parser_selected_identity_'+e.number);
    require(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'member_preview_and_review_'+e.number);
    require(/guatemala/i.test(f.origin||''),'source_qualified_country_'+e.number);
    if(e.number===445){
      require(/Lake Atitlan/i.test(f.origin||'')&&/HueHuetenengo/i.test(f.origin||''),
        'two_published_selected_regional_lots_445');
      require(!f.elevation_m,'two_elevations_not_one_blend_elevation_445');
      require(/stone fruit/i.test(f.tasting_notes||'')&&/lemon/i.test(f.tasting_notes||''),
        'both_direct_sensory_components_445');
    }else{
      require(/Lake Atitlan/i.test(f.origin||'')&&f.roast_level==='Medium-Light',
        'exact_current_region_and_roast_446');
      require(/Caturra/i.test(f.variety||'')&&/Bourbon/i.test(f.variety||'')&&
        /cherry cola/i.test(f.tasting_notes||'')&&/molasses/i.test(f.tasting_notes||''),
        'direct_current_variety_and_flavors_446');
    }
    require(!f.producer&&!f.farm&&!f.decaffeination_method,'no_invented_farm_person_decaf_'+e.number);
    require(!r.conflicts?.length,'no_unexplained_selected_conflicts_'+e.number);
    details.push({number:e.number,final_url:r.final_url,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
      headings,own_proof:proof,fields:f,conflicts:r.conflicts||[],source_facts:(r.source_facts||[]).slice(0,25)});
  }
  const after={source_sha:report?.source_sha,source_evidence_sha256:bytes?sha(bytes):null,
    numbers:cases.map(c=>c.number),details,manual_certified:0,production_operations:0,
    passed:failures.length===0,failures};
  writeFileSync(join(dir,'r96-bluejazz-afterproof.json'),JSON.stringify(after,null,2)+'\n');
  console.log('[DIC33 R96 SOURCE-BOUND AFTERPROOF] '+JSON.stringify(after));
  if(failures.length)process.exitCode=1;
}
