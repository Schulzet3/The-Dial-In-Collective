#!/usr/bin/env node
// R227: exact source-bound original603 #358-360 selected-product independent afterproof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_evidence_directory_required');
const errors=[],cases=[];
let summary={};
try{summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch{errors.push('focused_evidence_missing')}
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(sha!==process.env.DIC_R227_HEAD)errors.push('incorrect_exact_checked_out_sha');
if(JSON.stringify(summary.case_numbers)!=='[358,359,360]'||summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errors.push('original603_identity_or_immutable_register_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errors.push('unsupported_full_corpus_certification_or_provider_operations');
const selected=[
 [358,'https://subliminalcoffee.com/products/finca-la-unica-washed-honduras','Finca La Unica - Washed Honduras'],
 [359,'https://subliminalcoffee.com/products/finca-terrerito-natural-honduras','Finca Terrerito - Natural Honduras'],
 [360,'https://subliminalcoffee.com/products/la-piragua-anaerobic-natural-colombia','La Piragua - Anaerobic Natural Colombia']
];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
for(const [n,url,name] of selected){
 const bad=[],r=summary.records?.find(x=>x.number===n)||{};
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch{bad.push('missing_raw_official_html')}
 const hash=createHash('sha256').update(raw).digest('hex');
 const product=productMarkup(raw.toString('utf8'));
 const headings=selectedProductHeadings(product);
 const t=product.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:amp|nbsp);/giu,' ').replace(/\s+/gu,' ');
 const p=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:r.final_url||url}):{};
 const f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==url||r.final_url!==url||!r.parser_ok)
   bad.push('selected_exact_original_https_unavailable_or_parser_failed');
 if(raw.length<1000||r.html_bytes!==raw.length||r.html_sha256!==hash)
   bad.push('raw_html_bytes_sha256_not_bound');
 if(!r.selected_heading_identity_verified||!headings.includes(name)||f.name!==name)
   bad.push('selected_current_h1_identity_changed');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)
   bad.push('Add_Coffee_or_Source_Review_missing');
 if((p.conflicts||[]).includes('name'))bad.push('selected_identity_conflicted');
 const expectedNotes=n===358?['Milk Chocolate','Sweet Tobacco','Cinnamon Sugar']:
   n===359?['Asian Plum','Black Tea','Dried Cherry']:
   ['Pink Lemonade','Hibiscus','Apricot'];
 if(expectedNotes.some(s=>!has(f.tasting_notes,s)))bad.push('own_direct_notes_not_extracted');
 if(expectedNotes.some(s=>!has(t,s)))bad.push('direct_current_selected_notes_not_visible');
 if(n===358){
  if(f.process!=='Washed'||!has(f.variety,'Lempira')||!has(f.origin,'Copan'))
   bad.push('La_Unica_current_washed_Lempira_Copan_incorrect');
  if(!/Producer:\s*Letica Lopez/i.test(t))bad.push('direct_Letica_spec_missing_review_spelling');
  if(has(f.producer,'Al Lopez')&&!has(f.producer,'Leticia')&&!has(f.producer,'Letica'))
   bad.push('father_wrongly_claimed_as_selected_producer');
 }else if(n===359){
  if(f.process!=='Natural'||!has(f.variety,'Parainema')||
    !has(f.variety,'Obata')||!has(f.origin,'Copan'))
   bad.push('Terrerito_current_lot_process_or_variety_mismatch');
  if(has(f.producer,'Leticia')||has(f.producer,'Letica'))
   bad.push('sister_farm_producer_contamination');
 }else{
  if(f.process!=='Anaerobic'||!has(f.variety,'Caturra')||!has(f.origin,'Huila'))
   bad.push('Piragua_anaerobic_current_selected_spec_missing');
  if(has(f.producer,'Balzac Brothers'))bad.push('importer_claimed_as_grower');
  if(/Natural/i.test(String(f.process||''))&&f.process!=='Anaerobic')
   bad.push('anaerobic_process_discarded');
 }
 if(f.decaffeination_method||f.espresso_recipe)
   bad.push('unsupported_decaf_or_numeric_recipe');
 errors.push(...bad.map(s=>n+':'+s));
 cases.push({number:n,url,source_h1:headings,raw_bytes:raw.length,raw_sha256:hash,
   current_fields:f,conflicts:p.conflicts||[],source_spelling_review:n===358?'Letica spec / Leticia narrative':null,errors:bad});
}
const report={source_sha:sha,passed:errors.length===0,
 verified_selected_cases:errors.length?[]:[358,359,360],
 original603_total:603,all603_semantically_certified:false,production_operations:0,cases,errors};
writeFileSync(join(dir,'r227-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R227 OFFICIAL SELECTED CURRENT AFTERPROOF] '+JSON.stringify(report).slice(0,29000));
if(errors.length)throw Error(errors.join(','));
