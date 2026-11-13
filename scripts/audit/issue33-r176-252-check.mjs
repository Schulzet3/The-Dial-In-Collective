#!/usr/bin/env node
// Original603 #252: a dark-roast blend component is not the selected blend's roast.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen252=Object.freeze({number:252,name:'Windsor Court Blend',url:'https://orleanscoffee.com/product/windsor-court-blend'});
export function source252(html){
 const chosen=productMarkup(String(html||''));
 const headings=selectedProductHeadings(chosen);
 const selected=removeElements(chosen,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ');
 const body=norm(selected);
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen252.name),
  floral:body.includes('floral aroma'),
  three_blend_regions:body.includes('latin america east africa and colombia'),
  component_dark:body.includes('touch of dark roast'),
  body_and_balance_descriptors:body.includes('full bodied')&&body.includes('balanced cup')};
}
if(process.env.DIC_ISSUE33_R176_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,summary,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-252.html'))}catch{}
 const record=summary?.records?.find(x=>x.number===252)||{},f=record.current_fields||{};
 const selected=source252(html?.toString('utf8')||'');
 const failures=[],check=(pass,why)=>{if(!pass)failures.push(why)};
 check(JSON.stringify(summary?.case_numbers)==='[252]'&&summary?.records?.length===1,'one_exact_original252');
 check(summary?.source_sha===process.env.GITHUB_SHA,'exact_source_commit');
 check(summary?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_register_bytes');
 check(summary?.original_corpus_modified===false&&summary?.manual_certified===0&&summary?.production_operations===0,'original_corpus_untouched');
 check(record.official_url===chosen252.url,'original_selected_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_official_parser');
 check(!!html&&sha(html)===record.html_sha256&&html.length===record.html_bytes,'raw_html_digest_and_size');
 check(selected.identity&&record.selected_heading_identity_verified===true,'chosen_product_h1');
 check(selected.floral&&selected.three_blend_regions&&selected.component_dark&&selected.body_and_balance_descriptors,'direct_selected_source_facts');
 check(norm(f.name)===norm(chosen252.name),'selected_name');
 check(norm(f.roaster).includes('orleans'),'roaster');
 check(['latin america','east africa','colombia'].every(x=>norm(f.origin).includes(x)),'published_blend_origins');
 check(norm(f.tasting_notes).includes('floral'),'selected_floral_tasting_note');
 check(!f.roast_level,'component_dark_not_selected_roast');
 check(!f.producer&&!f.variety&&!f.process&&!f.decaffeination_method&&!f.espresso_recipe&&!f.elevation_m,'unpublished_specifics_blank');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'Add_Coffee_and_Source_Review');
 check(!(record.seo_fallback_fields||[]).some(x=>['name','origin','tasting_notes','roast_level'].includes(x)),'no_stale_SEO_facts');
 const report={case:252,source_sha:summary?.source_sha||null,passed:failures.length===0,failures,
  direct_source:selected,fields:f,conflicts:record.conflicts||[],
  raw_html_sha256:html?sha(html):null,raw_html_bytes:html?.length||0,
  evidence_sha256:raw?sha(raw):null,original_603_individual_certification:false,production_operations:0};
 writeFileSync(join(dir,'r176-252-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[ISSUE33 R176 #252 STRICT CURRENT SOURCE] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
