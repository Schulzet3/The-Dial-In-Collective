#!/usr/bin/env node
// #33 R60 fresh raw selected-source field/negative check, not a frozen603 replay.
// The chosen Guatemala farm paragraph outranks a misspelled same-product Region.
// Never infer farm locality from unrelated coffee, stale SEO or history.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {R60_CASES,r60IdentityFailures,r60DirectSelectedClaims}
 from './issue33-r60-selected-wreckingball-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!root)throw Error('private_focused_public_artifact_dir_required');
const dir=resolve(root),bytes=readFileSync(join(dir,'focused-current-evidence.json'));
const report=JSON.parse(bytes.toString('utf8')),failures=[],observations=[];
const check=(ok,key)=>{if(!ok)failures.push(key);};
check(JSON.stringify(report.case_numbers)==='[595,596]','wrong_bounded_original603_subset');
check(report.source_sha===process.env.GITHUB_SHA,'exact_workflow_source_sha_mismatch');
check(report.manual_certified===0&&report.original_corpus_modified===false&&
 report.production_operations===0&&report.real_auth===false,'false_certification_or_write_claim');
check(report.records?.length===2,'missing_or_extra_current_product_record');
for(const spec of R60_CASES){
 const rec=report.records?.find(r=>r.number===spec.number)||{};
 failures.push(...r60IdentityFailures(rec,spec));
 let html='',rawVerified=false,len=0;
 try{const b=readFileSync(join(dir,'case-'+spec.number+'.html'));
  html=b.toString('utf8');len=b.length;
  rawVerified=len===rec.html_bytes&&sha(b)===rec.html_sha256;}catch{}
 check(rawVerified,'current_raw_html_sha256_or_size_mismatch_'+spec.number);
 const scoped=productMarkup(html);
 const claims=r60DirectSelectedClaims(spec.name,scoped);
 const simplify=s=>String(s||'').replace(/<[^<>]{0,2000}>/gu,' ')
  .replace(/&(?:nbsp|amp);/giu,' ').replace(/\s+/gu,' ').trim();
 const diagnostic=(value)=>{
  const clean=simplify(value),markers=[
   'What’s in it','Region:','Gera, Limmu','Natural Process',
   'The Full Story','Finca Los Dos Socios is located',
   'La Libertad','Roast: Medium','Sulladjah'];
  return {length:clean.length,markers:markers.map(label=>{
   const at=clean.toLowerCase().indexOf(label.toLowerCase());
   return {label,at,fragment:at<0?null:clean.slice(Math.max(0,at-75),at+210)};
  })};
 };
 const visibleScopeDiagnostic={raw:diagnostic(html),scoped:diagnostic(scoped)};
 console.log('[DIC33 R60 CURRENT RAW VS SELECTED PRODUCT SCOPE] '+JSON.stringify({
  number:spec.number,...visibleScopeDiagnostic
 }));
 const fields=rec.current_fields||{},origin=String(fields.origin||''),notes=String(fields.tasting_notes||'');
 if(spec.number===595){
  check(claims.labeled_region&&claims.explicitly_not_sulladjah_only&&
    claims.literal_process&&claims.selected_sensory,
    'selected_gera_direct_source_changed_or_missing_595');
  check(/\bGera\b/iu.test(origin)&&/\bLimmu\b/iu.test(origin)&&/\bEthiopia\b/iu.test(origin),
    'selected_gera_limmu_origin_missing_595');
  check(!/\bSulladjah\b/iu.test(origin),'not_only_sulladjah_farm_but_origin_falsely_selected_595');
  check(fields.process==='Natural','selected_natural_processing_missing_595');
  check(['caramel','milk chocolate','berry'].every(x=>notes.toLowerCase().includes(x)),
   'selected_direct_tasting_notes_missing_595');
  check(!/\bblueberries\b/iu.test(notes),'generic_natural_process_blueberry_contamination_595');
 }else{
  check(claims.labeled_country&&claims.labeled_region_typo&&claims.current_2026_lot&&
   claims.named_farm_growing_location&&claims.named_grower&&
   claims.literal_washed&&claims.ambiguous_roast,
   'selected_2026_guatemala_direct_source_changed_or_missing_596');
  // An exact CURRENT same-farm description locates the farm in
  // La Libertad, Huehuetenango; old history or URL slug never supplies it.
  check(/\bLa Libertad\b/iu.test(origin)&&/\bHuehuetenango\b/iu.test(origin)&&
   /\bGuatemala\b/iu.test(origin),'selected_2026_same_farm_la_libertad_missing_596');
  check(fields.process==='Washed','selected_washed_missing_596');
  check(/Concepción Villatoro/iu.test(String(fields.producer||'')),
   'direct_selected_grower_missing_596');
  check(!fields.roast_level,'ambiguous_medium_or_medium_light_falsely_selected_596');
 }
 observations.push({number:spec.number,official_url:rec.official_url||null,
  selected_h1:rec.selected_h1||[],status:rec.status||'NOT_FETCHED',
  exact_current_html_bytes:len,raw_html_sha256:rec.html_sha256||null,
  raw_html_sha256_verified:rawVerified,
  direct_current_claims:claims,selected_product_scope_diagnostic:visibleScopeDiagnostic,actual_fields:fields,
  conflicts:rec.conflicts||[],add_coffee:rec.add_coffee_ui_rendered===true,
  source_review:rec.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R60_SELECTED_595_596_OFFICIAL_NOT_603_CERTIFICATION',
 source_sha:report.source_sha,original603_csv_sha256:report.original603_register_sha256,
 evidence_sha256:sha(bytes),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,observations};
writeFileSync(join(dir,'r60-595-596-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R60 EXACT SELECTED SOURCE AFTERPROOF] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
