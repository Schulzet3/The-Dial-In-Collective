#!/usr/bin/env node
/** Strict comparison of an independently frozen source oracle and handler replay.
 * Non-exact matches remain review candidates, never silently upgraded to PASS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {normalizeCoffeeAuditValue as normalize} from './coffee-corpus-normalize.mjs';
const [root,replayPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw new Error('Usage: compare CORPUS REPLAY OUTPUT');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const freezeBytes=await fs.readFile(path.join(root,'oracle-freeze.json')),freeze=JSON.parse(freezeBytes);
const oracle=[];for(const item of freeze.files.filter(x=>x.kind==='source_oracle')){
 const bytes=await fs.readFile(path.resolve(import.meta.dirname,'../../docs/audits',path.basename(item.path)));
 if(sha(bytes)!==item.sha256)throw new Error('Frozen oracle changed: '+item.path);
 oracle.push(...JSON.parse(bytes));
}
const replayBytes=await fs.readFile(replayPath),replay=JSON.parse(replayBytes);
if(replay.oracle_freeze_sha256!==sha(freezeBytes))throw new Error('Replay belongs to a different oracle freeze');
const actual=new Map(replay.records.map(r=>[r.case_id,r]));
if(actual.size!==replay.records.length||actual.size!==oracle.length||new Set(oracle.map(r=>r.case_id)).size!==oracle.length)
 throw new Error('Full comparison requires every unique frozen case exactly once');
const words=x=>new Set(normalize(x).split(' ').filter(Boolean));
const fields=['name','roaster','release_label','origin','process','roast_level','elevation_m','variety','producer','tasting_notes'];
const counts={cases:oracle.length,ok_response:0,canonical_assertions:0,exact_equivalent:0,missing:0,review_required:0,conflict_assertions:0,conflict_withheld:0,conflict_unresolved:0,additional_facts:0,additional_literal_present:0,additional_unconfirmed:0,unexpected_fields:0};
const byField=Object.fromEntries(fields.map(f=>[f,{expected:0,exact:0,missing:0,review_required:0}]));
const records=[];
for(const expected of oracle){
 const result=actual.get(expected.case_id);if(!result)throw new Error('No replay '+expected.case_id);
 if(result.roaster_id!==expected.roaster_id||result.source_url!==expected.source_url)
  throw new Error('Replay case identity differs from frozen oracle: '+expected.case_id);
 const preview=result.output||{};const checks=[],supplement=[],ambiguities=[],unexpected=[];if(preview.ok)counts.ok_response++;
 for(const [field,fact] of Object.entries(expected.canonical||{})){
  counts.canonical_assertions++;byField[field]??={expected:0,exact:0,missing:0,review_required:0};byField[field].expected++;
  const value=preview.fields?.[field];const accepted=[fact.value,...(fact.accepted_values||[])].map(v=>typeof v==='object'?v.value:v);
  let status=!value?'missing':accepted.some(v=>normalize(v)===normalize(value))?'exact_equivalent':'review_required';
  const target=words(fact.value),got=words(value);const missingTokens=[...target].filter(w=>!got.has(w)),extraTokens=[...got].filter(w=>!target.has(w));
  checks.push({field,expected:fact.value,actual:value??null,status,...(status==='review_required'?{missing_tokens:missingTokens,extra_tokens:extraTokens}:{}),evidence:fact.evidence});
  counts[status]++;byField[field][status==='exact_equivalent'?'exact':status]++;
 }
 for(const conflict of expected.ambiguities||[]){
  if(!fields.includes(conflict.field_or_label))continue;
  counts.conflict_assertions++;const value=preview.fields?.[conflict.field_or_label];
  const status=!value?'withheld':'review_required';counts[!value?'conflict_withheld':'conflict_unresolved']++;
  ambiguities.push({...conflict,actual:value??null,status,extractor_conflict_flag:preview.conflicts?.includes(conflict.field_or_label)||false});
 }
 const factStrings=(preview.source_facts||[]).map(f=>({label:f.label,section:f.section,value:normalize(f.value)}));
 const details=Object.entries(preview.roaster_details||{}).map(([k,v])=>({label:k,value:normalize(v)}));
 const rawSources=[...factStrings,...details];
 for(const fact of expected.additional_facts||[]){
  counts.additional_facts++;
  const value=normalize(fact.value);const candidates=rawSources.filter(s=>value.length>=8&&s.value.includes(value));
  // Literal presence proves retention only; it does not prove structured
  // interpretation, correct variant/method context, or display quality.
  const status=candidates.length?'literal_present':'unconfirmed';counts[candidates.length?'additional_literal_present':'additional_unconfirmed']++;
  supplement.push({label:fact.label,expected:fact.value,context:fact.context,status,candidates:candidates.slice(0,3).map(s=>({label:s.label,section:s.section}))});
 }
 for(const field of expected.not_observed_fields||[]){
  if(preview.fields?.[field]){unexpected.push({field,actual:preview.fields[field],status:'requires_source_review'});counts.unexpected_fields++;}
 }
 records.push({case_id:expected.case_id,roaster_id:expected.roaster_id,source_url:expected.source_url,ok:preview.ok===true,reason:preview.reason,canonical:checks,ambiguities,additional:supplement,unexpected,source_facts_truncated:preview.source_facts_truncated||false,unreviewed_sources:expected.blocked||[]});
}
await fs.writeFile(outputPath,JSON.stringify({type:'strict_source_oracle_comparison',not_a_perfect_extraction_claim:true,
 source_tree_sha256:replay.source_tree_sha256,oracle_freeze_sha256:sha(freezeBytes),replay_sha256:sha(replayBytes),
 comparison_script_sha256:sha(await fs.readFile(import.meta.filename)),
 comparison_normalizer_sha256:sha(await fs.readFile(new URL('./coffee-corpus-normalize.mjs',import.meta.url))),
 normalization:'Unicode/accent/case and layout punctuation normalization; numeric qualifiers, decimals, ranges and ratios preserved',counts,by_field:byField,records},null,2));
console.log(JSON.stringify({counts,by_field:byField},null,2));
