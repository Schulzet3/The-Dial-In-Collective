#!/usr/bin/env node
// #33 R128: immutable original603 #102 exact selected Disciples Nicaragua only.
// Strict direct-source evidence; do not infer absent process, variety or producer.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected128=Object.freeze({
 number:102,name:'Nicaragua - Organic Coffee Beans',
 url:'https://disciplescoffee.com/products/single-origin-organic-nicaragua'
});
export function selected128CurrentSource(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,
  ['script','style','noscript','template','nav','aside','footer','header','form','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' ')
  .replace(/&(?:nbsp|amp|quot);/giu,' '));
 const has=s=>visible.includes(norm(s));
 return {headings,exactSelectedHeading:headings.some(h=>norm(h)===norm(selected128.name)),
  direct:{
   chosenOrigin:has('Nicaragua coffee from Jinotega, Nicaragua'),
   elevation:has('1,100 to 1,700 meters'),
   tastes:has('tasting notes of milk chocolate, citrus, almond, and brown sugar'),
   explicitlyDark:has('Dark roast')
  },selectedSourceHash:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R128_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-102.html'))}catch{}
 const failures=[],check=(ok,key)=>{if(!ok)failures.push(key)};
 const r=e?.records?.find(x=>x.number===102)||{};
 const d=selected128CurrentSource(html?.toString('utf8')||'');
 const f=r.current_fields||{};
 check(e?.case_numbers?.length===1&&e.case_numbers[0]===102&&e.records?.length===1,'only_original_case_102');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_commit');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
  'unchanged_original_603_register_sha256');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,
  'immutable_original_and_no_false_global_certification');
 check(r.status==='FETCHED'&&r.parser_ok===true,'real_guarded_official_source_and_parser');
 check(r.official_url===selected128.url&&r.final_url===selected128.url&&r.archived_coffee===selected128.name,
  'exact_original_selected_product_url_and_identity');
 check(html&&sha(html)===r.html_sha256&&Buffer.byteLength(html)===r.html_bytes,'raw_official_html_sha256');
 check(d.exactSelectedHeading&&r.selected_heading_identity_verified===true,'current_chosen_product_heading');
 check(Object.values(d.direct).every(Boolean),'direct_origin_elevation_flavors_roast_present_in_chosen_product');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review');
 check(f.name===selected128.name&&norm(f.roast_level)==='dark','direct_selected_name_roast');
 check(norm(f.origin).includes('jinotega')&&norm(f.origin).includes('nicaragua'),
  'selected_jinotega_nicaragua_not_country_only');
 check(/1100/.test(norm(f.elevation_m).replace(/\s/g,''))&&
  /1700/.test(norm(f.elevation_m).replace(/\s/g,'')),'direct_selected_altitude');
 check(['milk chocolate','citrus','almond','brown sugar'].every(t=>norm(f.tasting_notes).includes(t)),
  'four_current_direct_selected_flavors');
 check(!f.process&&!f.producer&&!f.variety&&!f.decaffeination_method,
  'unpublished_process_producer_variety_decaf_remain_blank');
 check((r.conflicts||[]).length===0,'no_same_source_conflicts');
 check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,
  'no_seo_only_canonical_fill');
 const proof={source_sha:e?.source_sha,passed:failures.length===0,failures,
  official_html_sha256:r.html_sha256||null,official_html_bytes:r.html_bytes||null,
  evidence_sha256:raw?sha(raw):null,current_fields:f,selected_source:d,
  conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
  selected_case_certified:failures.length===0,original603_manual_certified:false,production_operations:0};
 writeFileSync(join(dir,'r128-102-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R128] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
