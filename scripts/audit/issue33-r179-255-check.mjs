#!/usr/bin/env node
// #33 original603 #255: current selected Mexico, not historical Peru or Brazil URL slug.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen255=Object.freeze({number:255,name:'OUT SIDE | DARKER ROAST | MEXICO',url:'https://others.coffee/products/out-side-dark-brazil'});
export function source255(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const body=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen255.name),
  process:body.includes('process washed'),geography:body.includes('region chiapas mexico'),
  altitude:body.includes('altitude 900 1250 masl'),
  cultivars:body.includes('cultivars typica and bourbon'),
  own_notes:body.includes('notes cocoa caramel brown spice'),
  selected_smallholders:body.includes('smallholder growers across the chiapas communities')&&
   ['chilon','simojovel','yalajon','sitala','sabanila','ocosingo'].every(x=>body.includes(x))};
}
if(process.env.DIC_ISSUE33_R179_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,summary,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-255.html'))}catch{}
 const record=summary?.records?.find(x=>x.number===255)||{},f=record.current_fields||{};
 const selected=source255(html?.toString('utf8')||'');
 const failures=[],check=(pass,why)=>{if(!pass)failures.push(why)};
 check(JSON.stringify(summary?.case_numbers)==='[255]'&&summary?.records?.length===1,'one_exact_original255');
 check(summary?.source_sha===process.env.GITHUB_SHA,'exact_source_commit');
 check(summary?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
 check(summary?.original_corpus_modified===false&&summary?.manual_certified===0&&summary?.production_operations===0,'frozen_oracle_no_member_writes');
 check(record.official_url===chosen255.url,'exact_archived_selected_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_fetch_and_actual_parser');
 check(!!html&&sha(html)===record.html_sha256&&html.length===record.html_bytes,'raw_official_html_digest_size');
 check(selected.identity&&record.selected_heading_identity_verified===true,'current_selected_mexico_H1_not_recycled_peru_or_brazil_slug');
 check(selected.process&&selected.geography&&selected.altitude&&selected.cultivars&&selected.own_notes&&selected.selected_smallholders,'own_current_selected_product_literals');
 check(norm(f.name)===norm(chosen255.name)&&norm(f.roaster).includes('others'),'own_selected_name_roaster');
 check(f.process==='Washed','current_washed');
 check(norm(f.origin).includes('chiapas')&&norm(f.origin).includes('mexico')&&!norm(f.origin).includes('peru')&&!norm(f.origin).includes('brazil'),'current_chiapas_mexico_not_historical_slug');
 check(['typica','bourbon'].every(x=>norm(f.variety).includes(x)),'both_varieties');
 check(['900','1250'].every(x=>norm(f.elevation_m).includes(x)),'direct_elevation_range');
 check(['cocoa','caramel','brown spice'].every(x=>norm(f.tasting_notes).includes(x)),'three_direct_tasting_notes');
 check(!f.roast_level,'darker_roast_unstandardized_not_assumed_dark');
 check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_fields_blank');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'explicit_Add_Coffee_Source_Review');
 check(!(record.seo_fallback_fields||[]).some(x=>['name','origin','process','roast_level','tasting_notes','producer'].includes(x)),'no_recycled_cross_product_SEO');
 const report={case:255,source_sha:summary?.source_sha||null,passed:failures.length===0,failures,
  selected_source:selected,fields:f,conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
  raw_html_sha256:html?sha(html):null,raw_html_bytes:html?.length||0,
  evidence_sha256:raw?sha(raw):null,original_603_individual_certification:false,production_operations:0};
 writeFileSync(join(dir,'r179-255-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[ISSUE33 R179 #255 STRICT SELECTED SOURCE] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
