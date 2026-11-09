#!/usr/bin/env node
// Issue33 R48: exact current selected original603 #552/#555/#558, not universal certification.
// Source only: independently review actual HTTPS/HTML/parser/Add Coffee provenance.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('r48_bounded_source_directory_required');
const root=resolve(dir);
const rawReport=readFileSync(join(root,'focused-current-evidence.json'));
const report=JSON.parse(rawReport.toString('utf8'));
const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
const specs=[
 {number:552,title:'Zambia Natural Gold- Single Origin',hostname:'www.roasted-beans.com',handle:'zambia-natural-gold-single-origin'},
 {number:555,title:'Organic Timor',hostname:'www.roc2.com',handle:'organic-timor'},
 {number:558,title:'Divine Inspiration - Nicaraguan Light-Medium Roast Relationship Coffee',
  hostname:'www.rossstreetroasting.com',handle:'nicaragua-divine-inspiration-relationship-coffee'}
];
check(JSON.stringify(report.case_numbers)==='[552,555,558]','wrong_original603_case_subset');
check(report.source_sha===process.env.GITHUB_SHA,'exact_merged_source_sha_mismatch');
check(report.original_corpus_modified===false&&report.production_operations===0&&report.real_auth===false,
 'immutable_corpus_or_production_auth_boundary');
check(report.manual_certified===0,'not_automatic_semantic_certification');
check(report.fetched===3&&report.parsed===3&&report.records?.length===3,
 'three_current_official_sources_not_fetched_and_parsed');
const details=[];
for(const spec of specs){
 const item=report.records?.find(r=>r.number===spec.number)||{},fields=item.current_fields||{};
 check(item.number===spec.number&&item.status==='FETCHED'&&item.parser_ok===true,
  'actual_selected_parser_not_ok_'+spec.number);
 check(item.selected_heading_identity_verified===true&&
  item.selected_h1?.some(h=>String(h).trim()===spec.title),
  'exact_selected_H1_identity_not_verified_'+spec.number);
 check(fields.name===spec.title,'wrong_current_selected_name_'+spec.number);
 let url;
 try{url=new URL(item.final_url)}catch{}
 check(url?.protocol==='https:'&&url?.hostname===spec.hostname&&
  url?.pathname.endsWith('/products/'+spec.handle),
  'unexpected_current_official_redirect_or_recycled_identity_'+spec.number);
 check(item.add_coffee_ui_rendered===true&&item.source_review_rendered===true,
  'Add_Coffee_or_Source_Review_not_rendered_'+spec.number);
 let raw='',bytes;
 try {
  bytes=readFileSync(join(root,'case-'+spec.number+'.html'));raw=bytes.toString('utf8');
  check(digest(bytes)===item.html_sha256,'raw_HTML_sha256_mismatch_'+spec.number);
  check(bytes.length===item.html_bytes,'raw_HTML_length_mismatch_'+spec.number);
 }catch(e){check(false,'missing_current_official_raw_HTML_'+spec.number);}
 check(raw.toLowerCase().includes(spec.title.toLowerCase()),
  'exact_selected_name_missing_in_saved_HTML_'+spec.number);
 const note=String(fields.tasting_notes||'').toLowerCase();
 if(spec.number===552){
  check(/isanya estate/i.test(raw)&&/dried blueberry/i.test(raw),
   'Zambia_selected_direct_farm_or_notes_not_in_current_HTML');
  check(!note.includes('pineapple'),'Zambia_tasting_contaminated_by_Timor');
 }
 if(spec.number===555){
  check(/pineapple/i.test(raw)&&/raw sugar/i.test(raw),
   'Timor_selected_direct_notes_missing_in_current_HTML');
  // Hypothesis to verify on the real parser: the third directly described
  // tasting component may be lost after "smooth finish of".
  check(['pineapple','orange','raw sugar'].every(x=>note.includes(x)),
   'Timor_selected_direct_raw_sugar_tasting_omitted');
  check(!note.includes('lavender'),'Timor_tasting_contaminated_by_Zambia');
 }
 if(spec.number===558){
  check(/spiced\s*apple/i.test(raw)&&/Gold Mountain Coffee Growers/i.test(raw),
   'Nicaragua_selected_direct_notes_or_sourcing_absent');
  check(!note.includes('lavender'),'Nicaragua_tasting_contaminated_by_Zambia');
 }
 details.push({number:spec.number,official_url:item.official_url||null,
  final_url:item.final_url||null,selected_h1:item.selected_h1||[],
  selected_identity:item.selected_heading_identity_verified===true,
  html_sha256:item.html_sha256||null,html_bytes:item.html_bytes||null,
  parser_ok:item.parser_ok===true,current_fields:fields,
  source_review:item.source_review_rendered===true,add_coffee:item.add_coffee_ui_rendered===true,
  conflicts:item.conflicts||[]});
}
const verdict={kind:'ISSUE33_R48_CURRENT_SELECTED_552_555_558_AFTERPROOF',
 source_sha:report.source_sha,report_sha256:digest(rawReport),
 original603_csv_sha256:report.original603_register_sha256,
 cases:details,passed:failures.length===0,failures,
 original603_fully_certified:false,production_operations:0};
writeFileSync(join(root,'r48-552-555-558-checked-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R48 CURRENT OFFICIAL] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
