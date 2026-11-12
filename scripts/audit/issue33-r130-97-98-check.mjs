#!/usr/bin/env node
// Issue #33 R130: independently inspect selected original603 #97/#98, not broad roaster SEO.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected130=Object.freeze([
 {number:97,name:'Brazil Arabela',url:'https://dekaf.com/products/brazil-arabela',region:'mogiana',country:'brazil',notes:['cinnamon','dried fig','graham cracker']},
 {number:98,name:'Colombia Papayo',url:'https://dekaf.com/products/colombia-papayo',region:'huila',country:'colombia',notes:['baking spice','cherry cobbler','red grape']}
]);
export function currentSelected130(html,entry){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','form','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' ')
  .replace(/&(?:nbsp|amp|quot);/giu,' '));
 const has=s=>visible.includes(norm(s));
 return {headings,exactSelectedHeading:headings.some(h=>norm(h)===norm(entry.name)),
  direct:{medium:has('ROAST: Medium'),region:has(entry.region)&&has(entry.country),
   notes:entry.notes.every(has),water:has("Dekáf'd by way of Swiss Water")},
  selectedSourceHash:sha(Buffer.from(html||'')),contentLength:visible.length};
}
if(process.env.DIC_ISSUE33_R130_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw, evidence;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));evidence=JSON.parse(raw.toString('utf8'));}catch{}
 const failures=[],details=[];
 const check=(condition,key)=>{if(!condition)failures.push(key);};
 check(JSON.stringify(evidence?.case_numbers)==='[97,98]'&&evidence?.records?.length===2,'only_original_97_98');
 check(evidence?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(evidence?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(evidence?.original_corpus_modified===false&&evidence?.production_operations===0&&evidence?.manual_certified===0,
  'no_original_mutation_production_or_false_global_certification');
 for(const entry of selected130){
  const r=evidence?.records?.find(x=>x.number===entry.number)||{};
  const f=r.current_fields||{};
  let html;
  try{html=readFileSync(join(dir,'case-'+entry.number+'.html'));}catch{}
  const d=currentSelected130(html?.toString('utf8')||'',entry);
  check(r.status==='FETCHED'&&r.parser_ok===true,entry.number+'_official_https_and_actual_parser');
  check(r.official_url===entry.url&&r.final_url===entry.url&&r.archived_coffee===entry.name,
   entry.number+'_selected_original_url_and_current_identity');
  check(html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,
   entry.number+'_raw_html_byte_sha256');
  check(d.exactSelectedHeading&&r.selected_heading_identity_verified===true,
   entry.number+'_current_exact_selected_h1');
  check(Object.values(d.direct).every(Boolean),entry.number+'_direct_selected_roast_origin_flavors_and_dekafd_method');
  check(norm(f.name)===norm(entry.name)&&norm(f.roast_level)==='medium',
   entry.number+'_selected_name_and_medium');
  check([entry.region,entry.country].every(s=>norm(f.origin).includes(s)),
   entry.number+'_current_direct_geography');
  check(entry.notes.every(s=>norm(f.tasting_notes).includes(s)),
   entry.number+'_current_direct_flavor_triplet');
  check(f.decaffeination_method==='Water Process',entry.number+'_direct_current_swiss_water_method');
  check(!f.process&&!f.variety,entry.number+'_no_invented_green_process_or_variety');
  check((r.conflicts||[]).length===0&&
   Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,
   entry.number+'_no_cross_coffee_conflicts_or_seo_only_fields');
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
   entry.number+'_real_add_coffee_and_source_review');
  details.push({number:entry.number,html_sha256:r.html_sha256||null,html_bytes:r.html_bytes||null,
   identity:d,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
 }
 const proof={source_sha:evidence?.source_sha||null,passed:failures.length===0,failures,
  evidence_sha256:raw?sha(raw):null,original603_manual_certified:false,
  selected_cases_verified:failures.length===0?[97,98]:[],records:details,production_operations:0};
 writeFileSync(join(dir,'r130-97-98-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R130] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
