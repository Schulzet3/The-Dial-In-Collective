#!/usr/bin/env node
// Issue #33 R44 selected current official #540/#543, no automatic 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const sha=data=>createHash('sha256').update(data).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('r44_artifact_directory_required');
const path=resolve(dir),reportBytes=readFileSync(join(path,'focused-current-evidence.json'));
const report=JSON.parse(reportBytes.toString('utf8')),failures=[];
const check=(v,reason)=>{if(!v)failures.push(reason);};
check(JSON.stringify(report.case_numbers)==='[540,543]','exact_cases_required');
check(report.source_sha===process.env.GITHUB_SHA,'exact_source_SHA_mismatch');
check(report.original_corpus_modified===false&&report.production_operations===0&&report.real_auth===false,
 'no_corpus_or_production_or_auth_operations');
check(report.manual_certified===0,'never_automatically_certify_603');
check(report.fetched===2&&report.parsed===2&&report.records?.length===2,'both_current_sources_required');
const selected=[];
for(const [number,name,host] of [
 [540,'Colombia — Inza Decaf','www.radialcoffee.com'],
 [543,'Mexico Chiapas Seasonal Espresso','www.rallycoffee.co']
]){
 const item=report.records?.find(r=>r.number===number)||{},fields=item.current_fields||{};
 let raw='',bytes;
 try{bytes=readFileSync(join(path,'case-'+number+'.html'));raw=bytes.toString('utf8');
  check(sha(bytes)===item.html_sha256,'case_'+number+'_raw_SHA_mismatch');
  check(bytes.length===item.html_bytes,'case_'+number+'_raw_length_mismatch');
 }catch(e){check(false,'case_'+number+'_raw_missing_'+String(e?.code||'error'));}
 let actualHost='';
 try{actualHost=new URL(item.final_url).hostname}catch{}
 check(item.status==='FETCHED'&&item.parser_ok===true,'case_'+number+'_parser_failed');
 check(item.selected_heading_identity_verified===true,'case_'+number+'_current_H1_not_original_identity');
 check(fields.name===name,'case_'+number+'_selected_name_changed');
 check(actualHost===host,'case_'+number+'_unexpected_host_or_redirect');
 check(item.add_coffee_ui_rendered===true&&item.source_review_rendered===true,
   'case_'+number+'_Add_Coffee_or_Source_Review_missing');
 check(!item.conflicts?.includes('tasting_notes'),'case_'+number+'_tasting_notes_conflict');
 if(number===540){
  // Reused /guatemala URL handle is not the current product or growing origin.
  check(/Inza/i.test(fields.origin||'')&&/Colombia/i.test(fields.origin||''),'540_Inza_Colombia_origin');
  check(fields.process==='Washed'&&fields.roast_level==='Medium','540_current_labeled_process_and_roast');
  check(/dark chocolate/i.test(fields.tasting_notes||'')&&/cherr/i.test(fields.tasting_notes||'')&&
    /raisin/i.test(fields.tasting_notes||''),'540_current_selected_tasting_notes');
  check(!fields.decaffeination_method,'540_unpublished_decaf_method_invented');
  check(/Washed Process/i.test(raw)&&/collective of smallholder farms/i.test(raw)&&/Inza/i.test(raw),
    '540_current_selected_official_description_changed');
 }
 if(number===543){
  check(/Chiapas/i.test(fields.origin||'')&&/Mexico/i.test(fields.origin||''),'543_selected_origin');
  check(/Comon Yaj Noptic/i.test(fields.producer||''),'543_selected_cooperative');
  check(/El Triunfo Biosphere Reserve/i.test(raw)&&/Comon Yaj Noptic/i.test(raw),
    '543_current_selected_official_description_changed');
  // Regional "traditional varieties like" does not establish chosen lot variety.
  // Current selected description prints no tasting, process, roast or altitude number.
  check(!fields.variety,'543_regional_varieties_falsely_assigned_to_lot');
  // The CURRENT canonical/OG description names this exact coffee (not a
  // generic menu or former lot) and includes a note list absent from visible
  // product description. Locked hierarchy permits this ONLY as last-resort
  // unverified identity-matched metadata, explicitly flagged for review.
  const selectedMetaTags=[...raw.matchAll(/<meta\b[^>]{0,3000}>/gi)].map(m=>m[0]);
  const ownNoteMeta=selectedMetaTags.some(tag=>
    /\b(?:name|property)=["'](?:description|og:description)["']/i.test(tag)&&
    /Mexico Chiapas[^"']{0,20}Seasonal Espresso/i.test(tag)&&
    /tasting notes of red apple, panels, brown sugar/i.test(tag));
  check(ownNoteMeta,'543_exact_current_selected_identity_meta_not_verified');
  check(fields.tasting_notes==='red apple, panels, brown sugar',
    '543_current_selected_meta_note_changed_or_missing');
  check(item.seo_fallback_fields?.includes('tasting_notes'),
    '543_metadata_note_misclassified_as_direct_certain_evidence');
  check(item.metadata_review_notice_rendered===true,
    '543_metadata_fallback_not_flagged_in_Add_Coffee_for_manual_review');
  check(!fields.process&&!fields.roast_level&&!fields.elevation_m,
    '543_unpublished_green_process_roast_or_elevation_invented');
 }
 selected.push({number,name:fields.name||null,html_sha256:item.html_sha256||null,
  current_fields:fields,selected_identity:item.selected_heading_identity_verified===true,
  add_coffee:item.add_coffee_ui_rendered===true,source_review:item.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R44_SELECTED_540_543_CURRENT_OFFICIAL',
 source_sha:report.source_sha,report_sha256:sha(reportBytes),
 original603_csv_sha256:report.original603_register_sha256,selected,
 passed:failures.length===0,failures,manual_certified:0,
 original603_fully_certified:false,production_operations:0};
writeFileSync(join(path,'r44-540-543-checked-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R44 EXACT CURRENT AFTERPROOF] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
