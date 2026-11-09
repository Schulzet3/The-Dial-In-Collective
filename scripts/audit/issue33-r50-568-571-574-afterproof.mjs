#!/usr/bin/env node
// #33 R50: bounded exact selected merchant review, NOT a frozen603 pass or individual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('explicit_source_evidence_directory_required');
const root=resolve(dir),source=readFileSync(join(root,'focused-current-evidence.json'));
const evidence=JSON.parse(source.toString('utf8'));
const failures=[];
const require=(ok,label)=>{if(!ok)failures.push(label);};
const specs=[
 {number:568,host:'www.slowburncoffee.com',path:'/products/el-salvador-finca-la-esperanza',identity:'El Salvador - Finca La Esperanza'},
 {number:571,host:'www.stageline.coffee',path:'/product-page/brazil-capricornio-dulce-signature',identity:'Brazil Capricornio Dulce Signature'},
 {number:574,host:'www.stumptowncoffee.com',path:'/products/ethiopia-nano-challa',identity:'Ethiopia Nano Challa'}
];
require(JSON.stringify(evidence.case_numbers)==='[568,571,574]','wrong_selected_original_cases');
require(evidence.source_sha===process.env.GITHUB_SHA,'wrong_exact_source_sha');
require(evidence.original_corpus_modified===false&&evidence.production_operations===0&&
 evidence.real_auth===false&&evidence.manual_certified===0,'immutable_or_prod_or_certification_boundary');
require(evidence.records?.length===3,'three_individual_source_records_required');
const cases=[];
for(const x of specs){
 const r=evidence.records?.find(y=>y.number===x.number)||{},f=r.current_fields||{};
 require(r.status==='FETCHED'&&r.parser_ok===true,'official_fetch_or_actual_parser_failed_'+x.number);
 require(r.selected_heading_identity_verified===true,'exact_current_selected_identity_not_proved_'+x.number);
 require(String(f.name||'').toLowerCase().includes(x.identity.toLowerCase()),
  'selected_current_coffee_changed_'+x.number);
 require(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
  'add_coffee_or_source_review_missing_'+x.number);
 let u;try{u=new URL(r.final_url)}catch{}
 require(u?.protocol==='https:'&&u?.hostname===x.host&&u?.pathname===x.path,
  'different_official_page_or_redirect_'+x.number);
 let html='',bytes=null;
 try{
  bytes=readFileSync(join(root,'case-'+x.number+'.html'));html=bytes.toString('utf8');
  require(sha(bytes)===r.html_sha256&&bytes.length===r.html_bytes,
    'official_raw_HTML_digest_or_bytes_changed_'+x.number);
 }catch{require(false,'official_raw_HTML_missing_'+x.number)}
 const txt=html.replace(/<script\\b[\\s\\S]*?<\\/script>/gi,' ').replace(/<style\\b[\\s\\S]*?<\\/style>/gi,' ')
  .replace(/<[^>]{0,3000}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\\s+/g,' ');
 const notes=String(f.tasting_notes||'').toLowerCase();
 if(x.number===568){
  require(['jasmine mochi','blueberry pie','brown butter'].every(n=>notes.includes(n)),
   'selected_farm_literal_tasting_notes_omitted');
  require(/farm is managed by the alvarez family/i.test(txt),'direct_selected_farm_manager_evidence_not_found');
  require(/farm:\\s*finca la esperanza/i.test(txt)&&/processing:\\s*natural/i.test(txt),
   'direct_selected_farm_process_evidence_not_found');
  require(!notes.includes('pop rocks'),'other_coffee_flavor_leakage');
 }
 if(x.number===571){
  require(/50% naturally processed/i.test(txt)&&/50% honey processed/i.test(txt),
    'direct_selected_half_natural_half_honey_not_proved');
  require(!f.process||f.process==='Other/Unknown',
   'mixed_selected_components_unsupported_single_process');
  require(!notes.includes('jasmine mochi'),'unrelated_other_roaster_notes');
 }
 if(x.number===574){
  require(['peach','citrus','orange blossom'].every(n=>notes.includes(n)),
   'Nano_Challa_direct_tasting_incomplete');
  require(/nano challa cooperative/i.test(txt),'Nano_Challa_current_coop_story_missing');
  require(!notes.includes('pop rocks'),'unrelated_blend_flavor_leakage');
 }
 cases.push({number:x.number,selected_identity:r.selected_heading_identity_verified===true,
  selected_h1:r.selected_h1||[],status:r.status||'NOT_FETCHED',parser_ok:r.parser_ok===true,
  html_sha256:r.html_sha256||null,html_bytes:r.html_bytes||null,official_url:r.official_url||null,
  final_url:r.final_url||null,fields:f,conflicts:r.conflicts||[],
  seo_fallback_fields:r.seo_fallback_fields||[],source_facts:(r.source_facts||[])
   .filter(s=>['producer','process','origin','tasting_notes','roast_level'].includes(s.field)).slice(0,22),
  add_coffee:r.add_coffee_ui_rendered===true,source_review:r.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R50_BOUNDED_CURRENT_SELECTED_NOT_603_CERTIFIED',
 source_sha:evidence.source_sha,focused_report_sha256:sha(source),
 original603_csv_sha256:evidence.original603_register_sha256,
 fetched:evidence.fetched,parsed:evidence.parsed,manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,cases};
writeFileSync(join(root,'r50-568-571-574-verdict.json'),JSON.stringify(verdict,null,2)+'\\n');
console.log('[DIC33 R50 FOCUSED CURRENT] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
