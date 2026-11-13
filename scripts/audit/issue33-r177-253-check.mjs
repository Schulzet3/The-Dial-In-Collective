#!/usr/bin/env node
// Original603 #253: exact Brazil, Medium, Natural; never borrow Peru/Colombia SEO/reviews.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen253=Object.freeze({number:253,name:'GET RIGHT | MEDIUM ROAST | BRAZIL',url:'https://others.coffee/products/get-right-brazil-parceiros-do-cafe'});
export function source253(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const body=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen253.name),
  process:body.includes('process natural'),
  geography:body.includes('region minas gerais'),
  altitude:body.includes('altitude 1100 masl'),
  cultivar:body.includes('cultivars catuai'),
  own_notes:body.includes('notes almond brown sugar vanilla'),
  three_named_farms:['fazenda furnas','apostolo simao','boa vista'].every(x=>body.includes(x))};
}
if(process.env.DIC_ISSUE33_R177_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,summary,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-253.html'))}catch{}
 const record=summary?.records?.find(x=>x.number===253)||{},f=record.current_fields||{};
 const selected=source253(html?.toString('utf8')||'');
 const failures=[],check=(pass,why)=>{if(!pass)failures.push(why)};
 check(JSON.stringify(summary?.case_numbers)==='[253]'&&summary?.records?.length===1,'one_exact_original253');
 check(summary?.source_sha===process.env.GITHUB_SHA,'exact_source_commit');
 check(summary?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_source_register');
 check(summary?.original_corpus_modified===false&&summary?.manual_certified===0&&summary?.production_operations===0,'frozen_oracle_and_member_data_untouched');
 check(record.official_url===chosen253.url,'exact_archived_official_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_official_fetch_and_actual_parser');
 check(!!html&&sha(html)===record.html_sha256&&html.length===record.html_bytes,'raw_html_digest_and_size');
 check(selected.identity&&record.selected_heading_identity_verified===true,'selected_product_h1_not_slug');
 check(selected.process&&selected.geography&&selected.altitude&&selected.cultivar&&selected.own_notes&&selected.three_named_farms,'current_direct_product_details');
 check(norm(f.name)===norm(chosen253.name)&&norm(f.roaster).includes('others'),'exact_name_and_roaster');
 check(f.roast_level==='Medium','published_exact_medium_roast');
 check(f.process==='Natural','published_exact_natural_processing');
 check(norm(f.origin).includes('minas gerais')&&norm(f.origin).includes('brazil'),'published_exact_brazil_origin');
 check(norm(f.variety).includes('catuai'),'published_exact_variety');
 check(norm(f.elevation_m).includes('1100'),'published_exact_elevation');
 check(['almond','brown sugar','vanilla'].every(x=>norm(f.tasting_notes).includes(x)),'all_three_literally_published_notes');
 check(['fazenda furnas','apostolo simao','boa vista'].every(x=>norm(f.producer).includes(x)),'own_three_named_farms');
 check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_decaf_and_recipe_blank');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'explicit_Add_Coffee_and_Source_Review');
 check(!(record.seo_fallback_fields||[]).some(x=>['name','origin','process','roast_level','tasting_notes','producer'].includes(x)),'no_cross_product_metadata_fallback');
 const report={case:253,source_sha:summary?.source_sha||null,passed:failures.length===0,failures,
  selected_source:selected,fields:f,conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
  raw_html_sha256:html?sha(html):null,raw_html_bytes:html?.length||0,
  evidence_sha256:raw?sha(raw):null,original_603_individual_certification:false,production_operations:0};
 writeFileSync(join(dir,'r177-253-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[ISSUE33 R177 #253 STRICT CURRENT SOURCE] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
