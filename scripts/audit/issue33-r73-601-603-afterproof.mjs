#!/usr/bin/env node
// Strict audit-only current selected #601/#602/#603 source and actual parser proof.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedZekesR73DirectEvidence} from './issue33-r73-zekes-selected-contract.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('focused_artifact_directory_required');
const root=resolve(dir),failed=[],check=(ok,why)=>{if(!ok)failed.push(why);};
mkdirSync(root,{recursive:true});
let bytes=null,report={};try{bytes=readFileSync(join(root,'focused-current-evidence.json'));report=JSON.parse(bytes.toString());}catch{}
check(Boolean(bytes),'current_source_report_missing');
check(JSON.stringify(report.case_numbers)==='[601,602,603]'&&report.records?.length===3,'wrong_original_row_subset');
check(Boolean(report.source_sha)&&report.source_sha===process.env.GITHUB_SHA,'source_sha_mismatch');
check(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original603_csv_changed');
check(report.manual_certified===0&&report.production_operations===0&&report.real_auth===false&&report.original_corpus_modified===false,'disallowed_write_or_false_certification');
const expected={
  601:{url:'https://zekescoffee.com/products/colombian-sierra-nevada',name:'Colombia Huila, 1 lb (16 oz)'},
  602:{url:'https://zekescoffee.com/products/honduras-marcala-lenca-farm',name:'Honduras Marcala Lenca, 1 lb (16 oz)'},
  603:{url:'https://zekescoffee.com/products/nicaragua-segovia-1-lb-16-oz',name:'Nicaragua Segovia, 1 lb (16 oz)'}
};
const observed=[];
for(const n of [601,602,603]){
 const record=report.records?.find(x=>x.number===n)||{},e=expected[n];
 check(record.official_url===e.url,n+'_exact_original_official_url_changed');
 let u=null;try{u=new URL(record.final_url)}catch{}
 check(u?.protocol==='https:'&&u?.hostname==='zekescoffee.com'&&u?.pathname===new URL(e.url).pathname&&!u?.search&&!u?.hash,n+'_redirect_or_selected_product_changed');
 check(record.status==='FETCHED'&&record.parser_ok===true,n+'_guarded_official_source_or_parser_not_ready');
 let raw=null;try{raw=readFileSync(join(root,'case-'+n+'.html'))}catch{}
 check(Boolean(raw)&&raw.length===record.html_bytes&&sha(raw)===record.html_sha256,n+'_raw_html_sha_mismatch');
 const html=raw?.toString('utf8')||'',scoped=productMarkup(html);
 const head=selectedProductHeadings(scoped),direct=selectedZekesR73DirectEvidence(n,scoped,head);
 check(direct.identity&&record.selected_heading_identity_verified===true,n+'_selected_h1_not_verified');
 for(const [k,v] of Object.entries(direct))check(v,n+'_selected_direct_'+k+'_absent');
 const f=record.current_fields||{},notes=String(f.tasting_notes||'').toLowerCase();
 check(String(f.name||'').trim()===e.name,n+'_actual_parser_name_wrong');
 if(n===601){
  check(/Huila/i.test(f.origin||'')&&/Colombia/i.test(f.origin||''),n+'_current_growing_huila_missing');
  check(/Cascada de Bordones/i.test(f.producer||''),n+'_selected_association_missing');
  check(f.process==='Washed',n+'_current_washed_processing_missing');
  check(['molasses','milk chocolate','lime'].every(x=>notes.includes(x)),n+'_selected_tasting_notes_missing');
 }
 if(n===602){
  check(/Marcala/i.test(f.origin||'')&&/Honduras/i.test(f.origin||''),n+'_garcias_growing_origin_missing');
  check(/Garcias?/i.test(f.producer||''),n+'_selected_farm_family_missing');
  check(f.roast_level==='Medium-Light',n+'_direct_medium_light_roast_missing');
  check(!f.process,n+'_unpublished_green_processing_inferred');
  check(!f.tasting_notes,n+'_unpublished_sensory_notes_inferred');
 }
 if(n===603){
  check(/Nicaragua/i.test(f.origin||''),n+'_country_missing');
  check(!/Palacaguina/i.test(f.origin||''),n+'_dry_mill_town_misclassified_as_farm_origin');
  check(/PRODECOOP/i.test(f.producer||''),n+'_cooperative_credit_missing');
  check(['almond','cocoa','caramel'].every(x=>notes.includes(x)),n+'_selected_notes_missing');
  check(!f.process,n+'_unpublished_green_process_inferred');
 }
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,n+'_ui_preview_or_review_missing');
 check(!(record.conflicts||[]).some(c=>/origin|producer|process|roast_level|tasting_notes|name/i.test(String(c))),n+'_current_canonical_conflict');
 observed.push({number:n,official_url:e.url,final_url:record.final_url||null,html_bytes:raw?.length||0,html_sha256:raw?sha(raw):null,head,direct,parser_fields:f,conflicts:record.conflicts||[],ui_preview:record.add_coffee_ui_rendered===true,source_review:record.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R73_601_602_603_ZEKES_SELECTED',source_sha:report.source_sha||null,
 original603_csv_sha256:report.original603_register_sha256||null,
 source_json_sha256:bytes?sha(bytes):null,manual_certified:0,production_operations:0,
 passed:failed.length===0,failures:failed,observed};
writeFileSync(join(root,'r73-601-603-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R73 SELECTED OFFICIAL] '+JSON.stringify(verdict));
if(failed.length)process.exitCode=1;
