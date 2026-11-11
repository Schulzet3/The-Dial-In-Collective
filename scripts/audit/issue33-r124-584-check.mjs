#!/usr/bin/env node
// Issue #33 R124, immutable original603 case 584 current selected only.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const selected124=Object.freeze({
 number:584,name:'Honduras Comsa – Washed, Espresso',
 url:'https://www.thecoffeeexchange.com/products/honduras-comsa-espresso-roast',
 primary:'Fair Trade / Organic • La Paz • 1200-1750 meters'
});
export function direct124(html){
 const product=productMarkup(String(html||'')),headings=selectedProductHeadings(product);
 const safe=removeElements(product,['script','style','noscript','template','nav','aside','footer','header','form','select']);
 const visible=safe.replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ')
  .replace(/&(?:bull|middot|nbsp);|&#(?:8226|183);/giu,' • ').replace(/&amp;/giu,'&')
  .replace(/\s+/gu,' ').trim();
 const match=visible.match(/Fair\s+Trade\s*\/\s*Organic\s*[•·]\s*La\s+Paz\s*[•·]\s*1,?200\s*[-–—]\s*1,?750\s*(?:meters?|metres?|masl)\b/iu);
 return {headings,uniqueH1:headings.length===1&&norm(headings[0])===norm(selected124.name),
  directCaption:!!match,quote:match?.[0]||''};
}
export function fields124Ok(f){
 if(!f||typeof f!=='object')return false;
 const notes=norm(f.tasting_notes);
 return norm(f.name)===norm(selected124.name)&&norm(f.origin)===norm('La Paz, Honduras')&&
  norm(f.process)===norm('Washed')&&norm(f.roast_level)===norm('Dark')&&
  notes.includes('rich dark chocolate')&&notes.includes('black pepper')&&
  !f.decaffeination_method;
}
if(process.env.DIC_ISSUE33_R124_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw=null,e=null,html=null;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-584.html'))}catch{}
 const failures=[],check=(ok,label)=>{if(!ok)failures.push(label)};
 const r=e?.records?.find(x=>x.number===584)||{},d=direct124(html?.toString('utf8')||'');
 check(JSON.stringify(e?.case_numbers)==='[584]'&&e.records?.length===1,'one_original_case_584_only');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_immutable_sha');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_production_no_global_certification');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'live_fetch_parser_selected_identity');
 check(r.official_url===selected124.url&&r.final_url===selected124.url&&r.archived_coffee===selected124.name,'exact_original_selected_url');
 check(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_selected_html_sha256_and_bytes');
 check(d.uniqueH1&&d.directCaption,'selected_direct_trade_region_elevation_caption');
 check(fields124Ok(r.current_fields),'real_parser_missing_La_Paz_or_other_selected_fields');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'Add_Coffee_and_Source_Review');
 check(Array.isArray(r.conflicts)&&r.conflicts.length===0,'current_selected_conflicts');
 check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,'SEO_only_field_fallback');
 const report={source_sha:e?.source_sha,passed:!failures.length,failures,
  evidence_sha256:raw?sha(raw):null,html_sha256:r.html_sha256||null,html_bytes:r.html_bytes||null,
  direct:d,fields:r.current_fields||null,manual_certified:0,production_operations:0,
  scope:'One current exact selected #584 only, not universal 603 certification or production acceptance.'};
 writeFileSync(join(dir,'r124-584-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[DIC33 R124] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
