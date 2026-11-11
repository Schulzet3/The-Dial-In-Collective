#!/usr/bin/env node
// Issue33 R127, original603 #100: exact selected Disciples Guatemala evidence only.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected127=Object.freeze({
 number:100,name:'Guatemala Honey Process - Organic Coffee Beans',
 url:'https://disciplescoffee.com/products/guatemala'
});
export function selected127CurrentSource(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,
  ['script','style','noscript','template','nav','aside','footer','header','form','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' ')
  .replace(/&(?:nbsp|amp|quot);/giu,' '));
 const has=s=>visible.includes(norm(s));
 return {headings,exactSelectedHeading:headings.some(h=>norm(h)===norm(selected127.name)),
  direct:{
   chosenOrigin:has('Guatemala coffee from Joyabaj, Quiché'),
   honeyProcessing:has('honey-processed')&&has('depulped and dried with fruit mucilage'),
   elevation:has('1,300 and 2,000 meters'),
   tastes:has('tasting notes of cherry, malt, anise, and cinnamon'),
   explicitlyLight:has('Light roast and Honey Process')
  },selectedSourceHash:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R127_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-100.html'))}catch{}
 const failures=[],check=(ok,key)=>{if(!ok)failures.push(key)};
 const r=e?.records?.find(x=>x.number===100)||{};
 const d=selected127CurrentSource(html?.toString('utf8')||'');
 const f=r.current_fields||{};
 check(e?.case_numbers?.length===1&&e.case_numbers[0]===100&&e.records?.length===1,'only_original_case_100');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_commit');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
  'immutable_603_register_hash');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,
  'immutable_source_and_no_false_global_certification');
 check(r.status==='FETCHED'&&r.parser_ok===true,'real_guarded_official_source_and_parser');
 check(r.official_url===selected127.url&&r.final_url===selected127.url&&r.archived_coffee===selected127.name,
  'exact_original_chosen_url_and_identity');
 check(html&&sha(html)===r.html_sha256&&Buffer.byteLength(html)===r.html_bytes,'raw_official_html_bound_sha');
 check(d.exactSelectedHeading&&r.selected_heading_identity_verified===true,'visible_selected_product_h1');
 check(Object.values(d.direct).every(Boolean),'selected_direct_origin_process_elevation_flavors_roast');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
  'actual_add_coffee_and_source_review');
 check(f.name===selected127.name&&norm(f.roast_level)==='light','direct_selected_name_and_roast');
 check(norm(f.origin).includes('joyabaj')&&norm(f.origin).includes('quiche')&&
   norm(f.origin).includes('guatemala'),'direct_chosen_locality_not_country_only');
 check(norm(f.process)==='honey','honey_selected_over_educational_washed_natural');
 check(/1300/.test(norm(f.elevation_m).replace(/\s/g,''))&&
   /2000/.test(norm(f.elevation_m).replace(/\s/g,'')),'direct_elevation_limits');
 check(['cherry','malt','anise','cinnamon'].every(t=>norm(f.tasting_notes).includes(t)),
  'all_four_direct_selected_flavors');
 check(!f.variety&&!f.decaffeination_method,'unpublished_fields_stay_blank');
 check((r.conflicts||[]).length===0,'no_unresolved_chosen_source_conflicts');
 check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,
  'no_seo_inferred_canonical_field');
 const proof={source_sha:e?.source_sha,passed:failures.length===0,failures,
  official_html_sha256:r.html_sha256||null,official_html_bytes:r.html_bytes||null,
  evidence_sha256:raw?sha(raw):null,current_fields:f,selected_source:d,
  conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
  original603_manual_certified:false,selected_case_certified:failures.length===0,production_operations:0};
 writeFileSync(join(dir,'r127-100-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R127] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
