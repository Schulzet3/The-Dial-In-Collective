#!/usr/bin/env node
// Issue #33 R51. Audits EXACT current selected public official source, not original603 universal certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {R51_EXACT_SOURCE_CASES,selectedR51CaseFailures} from './issue33-r51-selected-product-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('source_artifact_directory_required');
const root=resolve(dir),source=readFileSync(join(root,'focused-current-evidence.json'));
const evidence=JSON.parse(source.toString('utf8')),failures=[],cases=[];
const must=(v,name)=>{if(!v)failures.push(name);};
must(JSON.stringify(evidence.case_numbers)==='[583,584,585]','unexpected_case_subset');
must(evidence.source_sha===process.env.GITHUB_SHA,'exact_source_sha_mismatch');
must(evidence.manual_certified===0&&evidence.production_operations===0&&evidence.real_auth===false&&evidence.original_corpus_modified===false,'unsupported_certification_or_unsafe_op');
must(evidence.records?.length===3,'missing_individual_records');
for(const spec of R51_EXACT_SOURCE_CASES) {
 const r=evidence.records?.find(x=>x.number===spec.number)||{};
 failures.push(...selectedR51CaseFailures(r,spec));
 let bytes=null;
 try{
  bytes=readFileSync(join(root,'case-'+spec.number+'.html'));
  must(sha(bytes)===r.html_sha256&&bytes.length===r.html_bytes,'current_raw_html_hash_or_length_mismatch_'+spec.number);
 }catch{must(false,'raw_official_html_missing_'+spec.number);}
 const f=r.current_fields||{};
 if(spec.number===585){
  must(f.roast_level==='Light','selected_American_roast_defined_as_light_missing');
  must(/<label\b[^<>]{0,400}class=["'][^"']*\bvariant__label\b[^"']*["'][^<>]{0,500}>\s*American Roast\s*[-–—]\s*1\s*lb\s*<\/label>/i.test(bytes?.toString('utf8')||''),
   'selected_American_purchase_variant_missing');
 }
 cases.push({number:spec.number,coffee:spec.name,url:r.final_url||r.official_url||null,
  identity_verified:r.selected_heading_identity_verified===true,
  headings:{h1:r.selected_h1||[],form_h2:r.selected_form_h2||[],purchase_h2:r.selected_page_h2||[]},
  status:r.status||'MISSING',parser_ok:r.parser_ok===true,html_sha256:r.html_sha256||null,
  html_bytes:r.html_bytes||null,fields:r.current_fields||{},conflicts:r.conflicts||[],
  seo_fallback_fields:r.seo_fallback_fields||[],source_facts:(r.source_facts||[]).slice(0,45),
  add_coffee:r.add_coffee_ui_rendered===true,source_review:r.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R51_EXACT_SELECTED_COFFEE_EXCHANGE_NOT_603_CERTIFIED',
 source_sha:evidence.source_sha,focused_report_sha256:sha(source),
 original603_csv_sha256:evidence.original603_register_sha256,
 fetched:evidence.fetched,parsed:evidence.parsed,manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,cases};
writeFileSync(join(root,'r51-583-584-585-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R51 REAL SOURCE] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
