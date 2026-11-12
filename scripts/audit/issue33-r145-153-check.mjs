#!/usr/bin/env node
// Issue #33 original603 #153. Direct selected-product facts only; never global certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,' and ')
 .replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen153=Object.freeze({
 number:153,name:'MEXICO NAYARIT NATURAL ANAEROBIC DRAGON',
 url:'https://hilltreeroastery.com/products/mexico-nayarit-natural-anaerobic-dragon',
 notes:['Raspberry','Winey','Cinnamon','Orange']
});
export function selected153Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactH1:headings.length>0&&norm(headings[0])===norm(chosen153.name),
  direct:{
   notes:has('FLAVOR: Raspberry • Winey • Cinnamon • Orange'),
   method:has('PROCESS: Natural Anaerobic Dragon'),
   roast:has('Roast: Light'),
   origin:has('Origin: Tepic, Nayarit, Mexico'),
   elevation:has('Elevation: 1,400 meters'),
   producer:has('Producers: Various Smallholders'),
   variety:has('Varieties: Caturra • Bourbon')
  },visibleLength:visible.length,html_sha256:hash(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R145_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,raw,e;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-153.html'));}catch{}
 const failures=[];const assert=(ok,id)=>{if(!ok)failures.push(id)};
 const rec=e?.records?.find(x=>x.number===153)||{},f=rec.current_fields||{};
 const source=selected153Source(raw?.toString('utf8')||'');
 assert(JSON.stringify(e?.case_numbers)==='[153]'&&e?.records?.length===1,'only_original153');
 assert(e?.source_sha===process.env.GITHUB_SHA,'exact_source_checkout');
 assert(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_603_csv');
 assert(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification');
 assert(rec.official_url===chosen153.url&&rec.final_url===chosen153.url,'original_exact_selected_url');
 assert(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_https_real_parser');
 assert(!!raw&&hash(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_html_byte_integrity');
 assert(source.exactH1&&rec.selected_heading_identity_verified===true,'current_selected_unique_h1');
 assert(Object.values(source.direct).every(Boolean),'selected_direct_current_facts');
 assert(norm(f.name)===norm(chosen153.name),'real_parser_selected_name');
 assert(norm(f.origin).includes('tepic')&&norm(f.origin).includes('nayarit')&&norm(f.origin).includes('mexico'),'real_parser_selected_origin');
 assert(norm(f.roast_level)==='light','real_parser_selected_light');
 assert(norm(f.process)==='anaerobic','real_parser_anaerobic');
 assert(chosen153.notes.every(x=>norm(f.tasting_notes).includes(norm(x))),'real_parser_all_four_notes');
 assert(/\b1[,\s]?400\b/.test(String(f.elevation_m||'')),'real_parser_1400_m');
 assert(norm(f.producer).includes('smallholders'),'real_parser_producer_role');
 assert(norm(f.variety).includes('caturra')&&norm(f.variety).includes('bourbon'),'real_parser_two_varieties');
 assert(!f.decaffeination_method,'no_unpublished_decaf');
 assert(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_review');
 assert(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_field_conflicts');
 assert(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_inference');
 const proof={case_number:153,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  direct:source.direct,selected_heading:source.headings,raw_html_sha256:rec.html_sha256||null,
  html_bytes:rec.html_bytes||null,evidence_sha256:bytes?hash(bytes):null,
  actual_parser_fields:f,full_603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r145-153-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[Issue33 R145 #153] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
