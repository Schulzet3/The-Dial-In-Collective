#!/usr/bin/env node
// Issue33 R125: selected #586 current official contradictory source intake, not universal certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected125=Object.freeze({number:586,name:'Dedication- Costa Rica',url:'https://www.unlockedcoffee.com/products/dedication-costa-rica'});
export function selected125CurrentSource(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','form','select'])
   .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 const has=s=>visible.includes(norm(s));
 const top={process:has('Alma Negra Natural'),variety:has('Catuaí & San Isidro'),
  notes:has('Cooked Cranberry')&&has('Fresh Watermelon'),
  origin:has('Central Valley'),producer:has('Oscar and Francisca Chacón')};
 const bottom={process:has('Honey Processed'),variety:has('Catuai & Caturra'),
  notes:has('peach, clementine, honey, lemon, strawberry and brown sugar'),
  origin:has('Tarrazu, Costa Rica')};
 return {headings,exactSelectedHeading:headings.some(h=>norm(h)===norm(selected125.name)),
  top,bottom,conflictPrinted:top.process&&bottom.process&&top.variety&&bottom.variety&&top.notes&&bottom.notes,
  chosenSourceHash:hash(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R125_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-586.html'))}catch{}
 const failures=[],check=(ok,k)=>{if(!ok)failures.push(k)};
 const r=e?.records?.find(x=>x.number===586)||{};
 const source=selected125CurrentSource(html?.toString('utf8')||'');
 check(e?.case_numbers?.length===1&&e.case_numbers[0]===586&&e?.records?.length===1,'one_original_586_only');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','untouched_frozen603_sha256');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_production_no_global_certification');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_official_fetch_and_actual_parser');
 check(r.official_url===selected125.url&&r.final_url===selected125.url&&r.archived_coffee===selected125.name,'original_url_and_current_product_name');
 check(html&&hash(html)===r.html_sha256&&Buffer.byteLength(html)===r.html_bytes,'raw_official_html_hash');
 check(source.exactSelectedHeading&&r.selected_heading_identity_verified===true,'same_current_selected_identity');
 check(source.conflictPrinted,'two_distinct_selected_source_process_variety_flavor_statements');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'selected_Add_Coffee_and_Source_Review');
 const withheld=['origin','process','tasting_notes','variety'];
 check(withheld.every(k=>(r.conflicts||[]).includes(k)&&!r.current_fields?.[k]),
  'four_contradictory_canonical_fields_withheld_and_reviewable');
 check(r.current_fields?.producer==='Las Lajas Micromill'&&
  r.current_fields?.elevation_m==='1,400–1,600 MASL',
  'independent_uncontested_micromill_and_elevation');
 check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,
  'no_SEO_only_field_fallback');
 const report={source_sha:e?.source_sha,passed:!failures.length,failures,official_html_sha256:r.html_sha256||null,
  official_html_bytes:r.html_bytes||null,evidence_sha256:raw?hash(raw):null,
  selected_source:source,current_fields:r.current_fields||null,conflicts:r.conflicts||[],
  seo_fallback_fields:r.seo_fallback_fields||[],review_status:failures.length?'CONTRADICTION_REVIEW_UNVERIFIED':'CONTRADICTIONS_WITHHELD_REVIEW_REQUIRED',
  manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r125-586-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[DIC33 R125] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
