#!/usr/bin/env node
// Fresh read-only current selected merchant pages; NOT a 603-coffee semantic certificate.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {R64_SELECTED,r64IdentityFailures,r64SelectedSourceMarkers} from './issue33-r64-566-567-569-source-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!root)throw Error('focused_source_artifact_dir_required');
const dir=resolve(root),bytes=readFileSync(join(dir,'focused-current-evidence.json'));
const report=JSON.parse(bytes.toString('utf8')),failures=[],observed=[];
const check=(ok,id)=>{if(!ok)failures.push(id)};
check(JSON.stringify(report.case_numbers)==='[566,567,569]','wrong_original603_case_subset');
check(report.source_sha===process.env.GITHUB_SHA,'source_sha_not_exact');
check(report.manual_certified===0&&report.production_operations===0&&report.real_auth===false&&
 report.original_corpus_modified===false,'safety_or_certification_invariant');
check(report.records?.length===3,'expected_three_records');
for(const s of R64_SELECTED){
 const rec=report.records?.find(r=>r.number===s.number)||{},prefix=String(s.number)+':';
 for(const failure of r64IdentityFailures(rec))failures.push(prefix+failure);
 let html='',rawBytes=null;
 try{rawBytes=readFileSync(join(dir,'case-'+s.number+'.html'));html=rawBytes.toString('utf8')}catch{}
 const rawVerified=Boolean(rawBytes)&&rawBytes.length===rec.html_bytes&&sha(rawBytes)===rec.html_sha256;
 check(rawVerified,prefix+'raw_selected_html_length_or_sha_unverified');
 const text=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim();
 const markers=r64SelectedSourceMarkers(text,s.number);
 check(markers.ownProduct===true,prefix+'selected_current_product_body_not_verified');
 const fields=rec.current_fields||{},conflicts=rec.conflicts||[];
 check(new RegExp('\\b'+s.country+'\\b','iu').test(fields.origin||''),prefix+'selected_country_missing');
 if(s.number===566){
  if(markers.washedMention)check(fields.process==='Washed',prefix+'direct_selected_washed_omission');
  check(fields.roast_level==='Light',prefix+'literal_selected_light_roast_omission');
  if(markers.parainemaMention)check(/Parainema/iu.test(fields.variety||''),prefix+'direct_selected_variety_omission');
  if(markers.namedPerson)check(/Alexia\s+Mejia/iu.test(fields.producer||''),prefix+'direct_selected_named_producer_omission');
 }
 if(s.number===567){
  if(markers.naturalMention)check(fields.process==='Natural',prefix+'direct_selected_natural_process_omission');
  if(markers.berryTaste)check(/berry/iu.test(fields.tasting_notes||''),prefix+'direct_selected_berry_tasting_omission');
  check(/Rwenzori/iu.test(fields.origin||''),prefix+'selected_rwenzori_region_omission');
 }
 if(s.number===569){
  if(markers.typedWashed)check(fields.process==='Washed',prefix+'direct_selected_washed_process_omission');
  if(markers.ownTasting)check(/Marionberry/iu.test(fields.tasting_notes||'')&&/Honeysuckle/iu.test(fields.tasting_notes||''),prefix+'selected_tasting_notes_omission');
 }
 observed.push({number:s.number,url:rec.official_url||null,final_url:rec.final_url||null,
  h1:rec.selected_h1||[],status:rec.status||'UNAVAILABLE',html_bytes:rawBytes?.length||0,
  html_sha256:rec.html_sha256||null,raw_verified:rawVerified,
  direct_selected_markers:markers,current_fields:fields,conflicts,
  add_coffee:rec.add_coffee_ui_rendered===true,source_review:rec.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R64_CURRENT_566_567_569_NOT_603_CERTIFICATION',
 source_sha:report.source_sha,original603_csv_sha256:report.original603_register_sha256,
 focused_json_sha256:sha(bytes),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,observed};
writeFileSync(join(dir,'r64-566-567-569-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R64 SELECTED] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
