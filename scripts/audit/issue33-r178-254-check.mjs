#!/usr/bin/env node
// Issue #33 original603 #254, exact current selected Colombia. Never infer Peru from reused URL.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen254=Object.freeze({number:254,name:"LIGHT WORK | LIGHT ROAST | COLOMBIA",url:"https://others.coffee/products/light-work-light-peru-copy"});
export function source254(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const body=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen254.name),
  process:body.includes('process washed'),geography:body.includes('region huila colombia'),
  altitude:body.includes('altitude 1400 1800 masl'),
  cultivars:['caturra','castillo','colombia','bourbon'].every(x=>body.includes(x)),
  four_notes:body.includes('notes orange honey apple grape'),
  women_cooperative:body.includes('85 women members of el bombo')&&body.includes('farm cooperative based in huila colombia')};
}
if(process.env.DIC_ISSUE33_R178_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,summary,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-254.html'))}catch{}
 const record=summary?.records?.find(x=>x.number===254)||{},f=record.current_fields||{};
 const selected=source254(html?.toString('utf8')||'');
 const failures=[],check=(pass,why)=>{if(!pass)failures.push(why)};
 check(JSON.stringify(summary?.case_numbers)==='[254]'&&summary?.records?.length===1,'one_exact_original254');
 check(summary?.source_sha===process.env.GITHUB_SHA,'exact_source_commit');
 check(summary?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_source_register');
 check(summary?.original_corpus_modified===false&&summary?.manual_certified===0&&summary?.production_operations===0,'frozen_oracle_and_member_data_untouched');
 check(record.official_url===chosen254.url,'exact_archived_official_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_official_fetch_and_actual_parser');
 check(!!html&&sha(html)===record.html_sha256&&html.length===record.html_bytes,'raw_html_digest_and_size');
 check(selected.identity&&record.selected_heading_identity_verified===true,'current_colombia_H1_not_recycled_peru_slug');
 check(selected.process&&selected.geography&&selected.altitude&&selected.cultivars&&selected.four_notes&&selected.women_cooperative,'current_direct_selected_product_evidence');
 check(norm(f.name)===norm(chosen254.name)&&norm(f.roaster).includes('others'),'exact_name_and_roaster');
 check(f.roast_level==='Light','own_product_light_roast');
 check(f.process==='Washed','own_product_washed_process');
 check(norm(f.origin).includes('huila')&&norm(f.origin).includes('colombia')&&!norm(f.origin).includes('peru'),'current_huila_colombia_not_url_slug');
 check(['caturra','castillo','colombia','bourbon'].every(x=>norm(f.variety).includes(x)),'all_four_direct_cultivars');
 check(['1400','1800'].every(x=>norm(f.elevation_m).includes(x)),'direct_altitude_range');
 check(['orange','honey','apple','grape'].every(x=>norm(f.tasting_notes).includes(x)),'all_four_direct_notes');
 check(norm(f.producer).includes('el bombo'),'current_explicit_women_cooperative_producer');
 check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_decaf_and_recipe_blank');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'explicit_Add_Coffee_and_Source_Review');
 check(!(record.seo_fallback_fields||[]).some(x=>['name','origin','process','roast_level','tasting_notes','producer'].includes(x)),'no_cross_product_metadata_fallback');
 const report={case:254,source_sha:summary?.source_sha||null,passed:failures.length===0,failures,
  selected_source:selected,fields:f,conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
  raw_html_sha256:html?sha(html):null,raw_html_bytes:html?.length||0,
  evidence_sha256:raw?sha(raw):null,original_603_individual_certification:false,production_operations:0};
 writeFileSync(join(dir,'r178-254-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[ISSUE33 R178 #254 STRICT CURRENT SOURCE] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
