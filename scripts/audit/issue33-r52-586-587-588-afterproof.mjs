#!/usr/bin/env node
// Issue33 R52: preserve raw official evidence and fail closed on current selected identity.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {R52_EXACT_SOURCE_CASES,selectedR52CaseFailures} from './issue33-r52-selected-product-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_artifact_directory_required');
const root=resolve(dir),source=readFileSync(join(root,'focused-current-evidence.json'));
const evidence=JSON.parse(source.toString('utf8')),failures=[],cases=[];
const check=(b,k)=>{if(!b)failures.push(k);};
check(JSON.stringify(evidence.case_numbers)==='[586,587,588]','unexpected_original603_case_subset');
check(evidence.source_sha===process.env.GITHUB_SHA,'exact_source_sha_mismatch');
check(evidence.manual_certified===0&&evidence.production_operations===0&&evidence.real_auth===false&&evidence.original_corpus_modified===false,'unsupported_certification_or_unsafe_ops');
check(evidence.records?.length===3,'missing_individual_evidence');
for(const spec of R52_EXACT_SOURCE_CASES) {
 const rec=evidence.records?.find(x=>x.number===spec.number)||{};
 failures.push(...selectedR52CaseFailures(rec,spec));
 let selected='',rawDigestMatch=false,rawBytes=0;
 try{
  const bytes=readFileSync(join(root,'case-'+spec.number+'.html'));
  rawDigestMatch=hash(bytes)===rec.html_sha256&&bytes.length===rec.html_bytes;
  rawBytes=bytes.length;
  selected=productMarkup(bytes.toString('utf8')).replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').slice(0,18000);
 }catch{}
 check(rawDigestMatch,'raw_selected_official_html_integrity_'+spec.number);
 const text=selected.toLowerCase();
 const observations={
  selected_mentions_alma_negra_natural:text.includes('alma negra')&&text.includes('natural'),
  selected_mentions_honey_processed:/honey\\s+process(?:ed)?/.test(text),
  selected_mentions_washed:/\\bwashed\\b/.test(text),
  selected_mentions_grapos:text.includes('grapos'),
  selected_mentions_chiroso:text.includes('chiroso')
 };
 cases.push({number:spec.number,identity_verified:rec.selected_heading_identity_verified===true,
  source_status:rec.status||'MISSING',source_url:rec.final_url||rec.official_url||null,
  selected_h1:rec.selected_h1||[],parser_ok:rec.parser_ok===true,
  fields:rec.current_fields||{},conflicts:rec.conflicts||[],
  seo_fallback_fields:rec.seo_fallback_fields||[],
  html_sha256:rec.html_sha256||null,html_bytes:rawBytes,
  raw_digest_match:rawDigestMatch,observations,
  add_coffee:rec.add_coffee_ui_rendered===true,source_review:rec.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R52_SELECTED_UNLOCKED_COFFEE_INTAKE_NOT_603_CERTIFICATION',
 source_sha:evidence.source_sha,focused_report_sha256:hash(source),
 original603_register_sha256:evidence.original603_register_sha256,
 manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,cases};
writeFileSync(join(root,'r52-586-587-588-verdict.json'),JSON.stringify(verdict,null,2)+'\\n');
console.log('[DIC33 R52 ACTUAL OFFICIAL SOURCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
