#!/usr/bin/env node
// Issue #33 R126: selected original603 #253 current exact official source; no universal certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected126=Object.freeze({number:253,
 name:'GET RIGHT | MEDIUM ROAST | BRAZIL',
 url:'https://others.coffee/products/get-right-brazil-parceiros-do-cafe'});
export function selected126CurrentSource(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','form','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' ').replace(/&(?:nbsp|amp|quot);/giu,' '));
 const has=s=>visible.includes(norm(s));
 return {
  headings,exactSelectedHeading:headings.some(h=>norm(h)===norm(selected126.name)),
  direct:{
   process:has('PROCESS -- NATURAL'),region:has('REGION -- MINAS GERAIS'),
   elevation:has('ALTITUDE -- 1100 MASL'),variety:has('CULTIVARS -- CATUAI'),
   notes:has('NOTES -- ALMOND, BROWN SUGAR, VANILLA'),
   threeFarms:['Fazenda Furnas','Apostolo Simao','Boa Vista'].every(has)
  },
  chosenSourceHash:sha(Buffer.from(html||''))
 };
}
if(process.env.DIC_ISSUE33_R126_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-253.html'))}catch{}
 const failures=[],check=(ok,key)=>{if(!ok)failures.push(key)};
 const r=e?.records?.find(x=>x.number===253)||{};
 const detail=selected126CurrentSource(html?.toString('utf8')||'');
 const fields=r.current_fields||{};
 check(e?.case_numbers?.length===1&&e.case_numbers[0]===253&&e.records?.length===1,'one_original_253_only');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_sha');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_original_mutation_or_false_global_certification');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_official_fetch_and_real_parser');
 check(r.official_url===selected126.url&&r.final_url===selected126.url&&r.archived_coffee===selected126.name,'exact_original_selected_url_and_coffee');
 check(html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'exact_raw_official_html_sha');
 check(detail.exactSelectedHeading&&r.selected_heading_identity_verified===true,'exact_chosen_visible_h1');
 check(Object.values(detail.direct).every(Boolean),'all_direct_chosen_product_specifications_present');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_and_source_review');
 check(fields.name===selected126.name&&norm(fields.roast_level)==='medium','selected_identity_and_explicit_roast');
 check(norm(fields.process)==='natural'&&norm(fields.origin).includes('minas gerais')&&
   norm(fields.origin).includes('brazil'),'selected_process_and_region');
 check(/\b1100\b/.test(String(fields.elevation_m||''))&&norm(fields.variety).includes('catuai'),
   'selected_elevation_and_cultivar');
 check(['almond','brown sugar','vanilla'].every(t=>norm(fields.tasting_notes).includes(t)),
   'selected_literal_flavors');
 // Three farms belong to this coffee; never substitute another crop or imply one exclusive farm.
 check(!fields.producer||['fazenda furnas','apostolo simao','boa vista'].every(t=>
   norm(fields.producer).includes(t)),'selected_composite_farm_credit_not_invented');
 check((r.conflicts||[]).length===0,'no_selected_product_conflicts');
 check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,'no_seo_only_inference');
 const report={source_sha:e?.source_sha,passed:failures.length===0,failures,
   official_html_sha256:r.html_sha256||null,official_html_bytes:r.html_bytes||null,
   evidence_sha256:raw?sha(raw):null,selected_source:detail,
   current_fields:fields,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
   original603_manual_certified:false,individual_selected_certified:failures.length===0,
   production_operations:0};
 writeFileSync(join(dir,'r126-253-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[DIC33 R126] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
