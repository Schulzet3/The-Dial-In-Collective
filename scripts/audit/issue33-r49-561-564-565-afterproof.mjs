#!/usr/bin/env node
// #33 R49: source-only bounded official identity and direct-field check; NOT individual or whole-603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const hash=value=>createHash('sha256').update(value).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('r49_explicit_artifact_dir_required');
const root=resolve(dir);
const rawReport=readFileSync(join(root,'focused-current-evidence.json'));
const report=JSON.parse(rawReport.toString('utf8'));
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};
const specs=[
 {number:561,hostname:'www.rustydogcoffee.com',handle:'peru',name:'Peru Churupampa'},
 {number:564,hostname:'www.seycoffee.com',handle:'2026-yaye-arbegona-ethiopia',name:'Yaye Arbegona'},
 {number:565,hostname:'www.sidecarcoffee.com',handle:'espresso',name:'Espresso'}
];
check(JSON.stringify(report.case_numbers)==='[561,564,565]','selected_original_subset_mismatch');
check(report.source_sha===process.env.GITHUB_SHA,'exact_source_sha_mismatch');
check(report.original_corpus_modified===false&&report.production_operations===0&&
 report.real_auth===false&&report.manual_certified===0,'frozen_corpus_or_prod_or_certification_boundary');
check(report.records?.length===3,'missing_three_source_records');
const cases=[];
for(const spec of specs){
 const item=report.records?.find(r=>r.number===spec.number)||{};
 const fields=item.current_fields||{};
 check(item.number===spec.number,'missing_original_case_'+spec.number);
 check(item.status==='FETCHED'&&item.parser_ok===true,'current_official_or_parser_unavailable_'+spec.number);
 check(item.selected_heading_identity_verified===true,'selected_current_identity_unconfirmed_'+spec.number);
 check(String(fields.name||'').toLowerCase().includes(spec.name.toLowerCase()),
  'selected_coffee_name_changed_'+spec.number);
 check(item.add_coffee_ui_rendered===true&&item.source_review_rendered===true,
  'Add_Coffee_or_Source_Review_missing_'+spec.number);
 let final;
 try{final=new URL(item.final_url);}catch{}
 check(final?.protocol==='https:'&&final?.hostname===spec.hostname&&
  final?.pathname.endsWith('/products/'+spec.handle),
  'current_official_url_or_redirect_drift_'+spec.number);
 let raw='',bytes;
 try{
  bytes=readFileSync(join(root,'case-'+spec.number+'.html'));
  raw=bytes.toString('utf8');
  check(hash(bytes)===item.html_sha256&&bytes.length===item.html_bytes,
   'raw_official_HTML_byte_hash_mismatch_'+spec.number);
 }catch{check(false,'missing_selected_raw_HTML_'+spec.number);}
 const notes=String(fields.tasting_notes||'').toLowerCase();
 if(spec.number===561&&/cupping notes:\s*lime\s*\/\s*grape\s*\/\s*brown sugar/i.test(raw)){
  check(['lime','grape','brown sugar'].every(x=>notes.includes(x)),
   'Peru_selected_direct_cupping_notes_incomplete');
  check(!notes.includes('pop rocks'),'Peru_cross_product_notes_contamination');
 }
 if(spec.number===564){
  // 2026 Yaye is a distinct lot from the roaster's 2025 archived page. Do not borrow 2025 sensory.
  check(!/lychee|complex botanicals/i.test(notes),
   'Yaye_possible_2025_previous_lot_flavor_contamination');
  if(/watermelon[^<]{0,180}florality[^<]{0,180}berries/i.test(raw)){
   check(['watermelon','floral','berr'].every(x=>notes.includes(x)),
    'Yaye_selected_direct_2026_tasting_incomplete');
  }
 }
 if(spec.number===565&&/roasted medium-light/i.test(raw)){
  check(fields.roast_level==='Medium-Light','Espresso_selected_direct_medium_light_roast_missing');
  check(['dark chocolate','blueberries','pop rocks'].every(x=>notes.includes(x)),
   'Espresso_selected_direct_three_tasting_notes_incomplete');
  check(!notes.includes('brown sugar'),'Espresso_cross_product_notes_contamination');
 }
 cases.push({number:spec.number,official_url:item.official_url||null,
  final_url:item.final_url||null,status:item.status||'NOT_FETCHED',
  selected_h1:item.selected_h1||[],identity_verified:item.selected_heading_identity_verified===true,
  parser_ok:item.parser_ok===true,current_fields:fields,conflicts:item.conflicts||[],
  html_sha256:item.html_sha256||null,html_bytes:item.html_bytes||null,
  add_coffee:item.add_coffee_ui_rendered===true,source_review:item.source_review_rendered===true,
  source_facts:(item.source_facts||[]).filter(f=>['tasting_notes','roast_level','producer','process','origin','release_label'].includes(f.field)).slice(0,20)});
}
const verdict={kind:'ISSUE33_R49_SELECTED_SOURCE_ONLY_NOT_603_CERTIFICATION',
 source_sha:report.source_sha,report_sha256:hash(rawReport),
 original603_csv_sha256:report.original603_register_sha256,
 fetched:report.fetched,parsed:report.parsed,manual_certified:0,
 production_operations:0,passed:failures.length===0,failures,cases};
writeFileSync(join(root,'r49-561-564-565-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R49 OFFICIAL SELECTED] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
