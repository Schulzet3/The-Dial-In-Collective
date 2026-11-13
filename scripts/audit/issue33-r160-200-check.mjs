#!/usr/bin/env node
// Issue #33 R160: independently check original603 #200 current selected source; never certify all603.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen200=Object.freeze({
 number:200,name:'Costa Rica Hacienda La Amistad 12 Oz',
 url:'https://localroasters.com/products/costa-rica-la-amistad12-oz',
 flavors:['Green Apple','Dark Caramel','Cacao Nibs']
});
export function selected200Source(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const visible=norm(removeElements(own,['script','style','noscript','template','nav','aside','footer','header','select'])
   .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactSelectedTitle:headings.length===1&&norm(headings[0])===norm(chosen200.name),
  direct:{
   roast:has('Roast Level Light'),
   washed:has('Process Washed'),
   elevation:has('Elevation 1200 1600 MASL'),
   estate:has('Producer Info Hacienda La Amistad'),
   region:has('Coto Brus Puntarenas'),
   variety:has('Variety Caturra Catuai'),
   green_apple:has('Green Apple'),
   dark_caramel:has('Dark Caramel'),
   cacao_nibs:has('Cacao Nibs')
  },
  html_sha256:hash(Buffer.from(html||''))
 };
}
if(process.env.DIC_ISSUE33_R160_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 let raw,bytes,e;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-200.html'));}catch{}
 const record=e?.records?.find(x=>x.number===200)||{};
 const fields=record.current_fields||{};
 const source=selected200Source(raw?.toString('utf8')||'');
 const errors=[],check=(yes,label)=>{if(!yes)errors.push(label);};
 check(JSON.stringify(e?.case_numbers)==='[200]'&&e?.records?.length===1,'one_frozen_selected_200');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_workflow_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_immutable_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_603_or_production_mutation');
 check(record.official_url===chosen200.url&&record.final_url===chosen200.url,'exact_official_url_unchanged');
 check(record.status==='FETCHED'&&record.parser_ok===true,'bounded_https_and_actual_parser');
 check(!!raw&&hash(raw)===record.html_sha256&&raw.length===record.html_bytes,'raw_selected_html_sha256');
 check(source.exactSelectedTitle&&record.selected_heading_identity_verified===true,'current_selected_h1_matches_original');
 for(const [k,v] of Object.entries(source.direct))check(v,'own_product_fact_'+k);
 check(norm(fields.name)===norm(chosen200.name),'parsed_selected_name');
 check(norm(fields.roaster).includes('local roasters'),'parsed_roaster');
 check(norm(fields.roast_level)==='light','own_light_roast');
 check(norm(fields.process)==='washed','own_washed_processing');
 check(norm(fields.origin).includes('costa rica'),'own_costa_rica');
 check(norm(fields.producer).includes('hacienda la amistad'),'named_selected_estate');
 check(norm(fields.elevation_m).includes('1200')&&norm(fields.elevation_m).includes('1600'),'selected_elevation');
 check(['caturra','catuai'].every(x=>norm(fields.variety).includes(x)),'own_varieties');
 check(chosen200.flavors.every(x=>norm(fields.tasting_notes).includes(norm(x))),'own_tasting_notes');
 check(!fields.decaffeination_method&&!fields.espresso_recipe,'no_invented_decaf_or_recipe');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'add_coffee_and_source_review');
 check(!(record.seo_fallback_fields||[]).some(x=>['roast_level','process','tasting_notes','producer'].includes(x)),'no_generic_seo_field_substitution');
 const result={number:200,source_sha:e?.source_sha||null,passed:errors.length===0,failures:errors,
  selected_source:source,parser_fields:fields,conflicts:record.conflicts||[],
  seo_fallback_fields:record.seo_fallback_fields||[],html_sha256:raw?hash(raw):null,
  evidence_sha256:bytes?hash(bytes):null,original603_individual_certification_complete:false,production_operations:0};
 writeFileSync(join(dir,'r160-200-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R160 SELECTED #200 STRICT AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}