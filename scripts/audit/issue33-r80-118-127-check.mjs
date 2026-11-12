#!/usr/bin/env node
// #33 R80: current exact selected official sources, never original603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fold=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const clean=html=>String(html||'')
 .replace(/<!--[^]*?-->/gu,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[^]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ')
 .replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&')
 .replace(/&(?:ndash|mdash|#8211|#8212);/giu,'-')
 .replace(/\s+/gu,' ').trim();
export function selected118(markup,headings){
 const t=clean(markup);
 return {
  identity:Array.isArray(headings)&&headings.length===1&&fold(headings[0])==='electrify espresso',
  threeNamedComponents:/Guatemala\s*-\s*Ceiba Core[\s\S]{0,180}Colombia\s*-\s*Kumanday[\s\S]{0,180}Ethiopia\s*-\s*Yirgacheffe\s*-\s*Koke Washing Station/iu.test(t),
  separateGreenProcesses:/Guatemala\s*-\s*Ceiba Core\s*-\s*\(Washed Process\)[\s\S]{0,180}Colombia\s*-\s*Kumanday\s*\(Natural Process\)[\s\S]{0,180}Ethiopia\s*-\s*Yirgacheffe\s*-\s*Koke Washing Station\s*\(Honey Process\)/iu.test(t),
  selectedMedium:/\bMedium Roast:\s*This energizing espresso blend\b/iu.test(t),
  selectedNotes:/flavors of milk chocolate,\s*roasted almonds and dried fruits\b/iu.test(t)
 };
}
export function selected127(markup,headings){
 const t=clean(markup);
 return {
  identity:Array.isArray(headings)&&headings.length===1&&fold(headings[0])==='colombia lisandro cardenas finca las brisas',
  selectedTaste:/The Taste:\s*Plush and fruit-saturated with notes of cooked cherry,\s*soft florals,\s*a winey sweetness/iu.test(t),
  selectedGesha:/The Bean:\s*100% Gesha\b/iu.test(t),
  selectedGrower:/Origin\s*&\s*Producer:\s*Grown at 1,400\s*[-–]\s*2,000 masl in Huila,\s*Colombia by second-generation master farmer Lisandro C[aá]rdenas\b/iu.test(t),
  selectedNatural:/The Process:\s*Meticulous Natural\b/iu.test(t),
  selectedRoast:/The Roast:\s*Light-Medium\b/iu.test(t)
 };
}
if(process.env.DIC_ISSUE33_R80_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 const failures=[],check=(v,key)=>{if(!v)failures.push(key)};
 let report=null,bytes=null;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(bytes.toString('utf8'));}catch{}
 check(JSON.stringify(report?.case_numbers)==='[118,127]'&&report?.records?.length===2,'exact_case_subset');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_hash');
 check(report?.manual_certified===0&&report?.production_operations===0&&report?.original_corpus_modified===false,'preservation');
 const cases={
  118:{name:'electrify espresso',url:'https://epiphanycoffee.co/products/electrify-espresso',host:'epiphanycoffee.co',path:'/products/electrify-espresso'},
  127:{name:'Colombia – Lisandro Cárdenas — Finca Las Brisas',url:'https://friedrichscoffee.com/product/colombia-lisandro-cardenas-finca-las-brisas',host:'friedrichscoffee.com',path:'/product/colombia-lisandro-cardenas-finca-las-brisas'}
 };
 const evidence=[];
 for(const n of [118,127]){
  const e=cases[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
  let raw=null;try{raw=readFileSync(join(dir,'case-'+n+'.html'));}catch{}
  const u=(()=>{try{return new URL(r.final_url)}catch{return null}})();
  check(r.official_url===e.url&&r.archived_coffee===e.name,'exact_original_selected_'+n);
  check(u?.protocol==='https:'&&u?.hostname===e.host&&u?.pathname.replace(/\/$/,'')===e.path&&!u.search&&!u.hash,'same_selected_redirect_'+n);
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'current_selected_fetched_parser_'+n);
  check(!!raw&&raw.length===r.html_bytes&&sha(raw)===r.html_sha256,'raw_selected_hash_'+n);
  const selected=productMarkup(raw?.toString('utf8')||''),headings=selectedProductHeadings(selected);
  const facts=n===118?selected118(selected,headings):selected127(selected,headings);
  for(const [k,v] of Object.entries(facts))check(v,'selected_literal_'+n+'_'+k);
  check(fold(f.name)===fold(e.name),'correct_parsed_name_'+n);
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'explicit_add_coffee_review_'+n);
  check(!(r.conflicts||[]).some(x=>/name|origin|process|roast|taste|producer|variety/iu.test(JSON.stringify(x))),'no_current_conflict_'+n);
  if(n===118){
   check(String(f.roast_level||'').toLowerCase()==='medium','medium_roast_118');
   check(['milk chocolate','roasted almond','dried fruit'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'selected_notes_118');
   check(!f.process||f.process==='Other/Unknown','no_single_green_process_from_component_blend_118');
  }else{
   check(/huila/i.test(f.origin||'')&&/colombia/i.test(f.origin||''),'selected_huila_origin_127');
   check(/lisandro/i.test(f.producer||''),'selected_grower_127');
   check(/gesha/i.test(f.variety||''),'selected_gesha_127');
   check(/natural/i.test(f.process||''),'selected_natural_127');
   check(/^(?:light-medium|medium-light)$/i.test(f.roast_level||''),'selected_light_medium_roast_127');
   check(['cherry','floral','wine'].every(x=>String(f.tasting_notes||'').toLowerCase().includes(x)),'selected_notes_127');
  }
  evidence.push({number:n,status:r.status,html_sha256:r.html_sha256,headings,sourceFacts:facts,parsed:f,conflicts:r.conflicts||[]});
 }
 const verdict={source_sha:report?.source_sha,report_sha256:bytes?sha(bytes):null,manual_certified:0,production_operations:0,evidence,passed:failures.length===0,failures};
 writeFileSync(join(dir,'r80-118-127-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R80 EXACT SELECTED AFTERPROOF] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
