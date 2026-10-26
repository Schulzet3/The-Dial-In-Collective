#!/usr/bin/env node
/**
 * Independent, non-scoring audit of demonstrably equivalent printed coffee facts.
 * This NEVER changes canonical extraction, the immutable oracle, or strict scores.
 * It intentionally rejects subset matches, uncertain units, altered qualifiers,
 * conflicting claims, and even plausible inferred geography/producer identities.
 */
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const fold = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
 .toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const compound = value => fold(value).replace(/\bsl\s+(\d{2})\b/g, 'sl$1');
const list = value => compound(value).replace(/[.!]+$/, '').split(/\s*(?:,|;|\+|&|\||\band\b)\s*/)
 .map(v => v.trim()).filter(Boolean);
const ordinals = values => values.length ? values.join('|') : '';

function altitudeParts(value) {
 let input = fold(value).replace(/(?<=\d)[,.](?=\d{3}(?:\D|$))/g, '')
  .replace(/(?<=\d)\s*(?:metres?|meters?|masl|m\.?a\.?s\.?l\.?|m)\b/g, ' ')
  .replace(/\b(?:metres?|meters?|masl|m\.?a\.?s\.?l\.?|m)\b/g, ' ')
  .replace(/\babove\s+sea\s+level\b/g, ' ')
  .replace(/\b(?:at\s+an?\s+altitude\s+of|elevation|altitude|at)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();
 if (!input || /\b(?:feet|ft|kilometers?|km)\b/.test(input)) return null;
 const approximate = /^(?:~|about\b|approx(?:imately)?\.?\b)/.test(input);
 if (approximate) input=input.replace(/^(?:~|about\b|approx(?:imately)?\.?\b)\s*/, '');
 const plus = /\+\s*$/.test(input);
 if(plus)input=input.replace(/\+\s*$/, '').trim();
 if(!/^\d+(?:\s*(?:-|–|—|to)\s*\d+)?$/.test(input))return null;
 const nums = [...input.matchAll(/\d+/g)].map(x => Number(x[0]));
 if (!nums.length || nums.length > 2 || nums.some(n => n < 100 || n > 5000)) return null;
 return {nums, range:nums.length===2, approximate,plus};
}

export function presentationEquivalent(field, expected, actual) {
 if (typeof expected !== 'string' || typeof actual !== 'string' || !expected.trim() || !actual.trim()) return null;
 if (field === 'elevation_m') {
  const a=altitudeParts(expected),b=altitudeParts(actual);
  return a && b && a.range === b.range && a.approximate === b.approximate && a.plus === b.plus && ordinals(a.nums) === ordinals(b.nums)
   ? 'same_literal_elevation_meters' : null;
 }
 if (field === 'roast_level') {
  const alias = s => /^light[-\s]medium$/.test(fold(s)) ? 'medium-light' : fold(s);
  return alias(expected) === 'medium-light' && alias(actual) === 'medium-light' && fold(expected) !== fold(actual)
   ? 'approved_light_medium_alias' : null;
 }
 if (field === 'tasting_notes' || field === 'producer' || field === 'variety') {
  const a=list(expected),b=list(actual);
  // Order and all descriptor words must match; merely having some matching
  // words (or an extra condition such as "in milk") never counts.
  return a.length >= 2 && a.length === b.length && ordinals(a) === ordinals(b) && fold(expected) !== fold(actual)
   ? 'same_ordered_literal_list' : null;
 }
 return null;
}

export function reviewCorpusPresentation(comparison) {
 if (!comparison || comparison.type !== 'strict_source_oracle_comparison' || !Array.isArray(comparison.records))
  throw new Error('Requires the original complete strict source-oracle comparison');
 if (comparison.counts?.cases !== 603 || comparison.counts?.canonical_assertions !== 4002 ||
     comparison.records.length !== 603 || new Set(comparison.records.map(r=>r.case_id)).size !== 603)
  throw new Error('Wrong or partial frozen603 comparison');
 const findings=[]; const by_field={}; const counts={exact:0,missing:0,review_required:0,presentational_equivalents:0,still_missing:0,still_requires_source_review:0};
 for (const record of comparison.records) {
  for (const assertion of record.canonical||[]) {
   const status=assertion.status;
   if(status==='exact_equivalent'){counts.exact++;continue;}
   if(status!=='missing'&&status!=='review_required')throw new Error('Unexpected status '+status);
   counts[status]++;
   const equivalence = status === 'review_required' ? presentationEquivalent(assertion.field, assertion.expected, assertion.actual) : null;
   if (equivalence) counts.presentational_equivalents++;
   else if(status==='missing')counts.still_missing++;
   else counts.still_requires_source_review++;
   by_field[assertion.field]??={missing:0,review_required:0,presentational_equivalents:0};
   by_field[assertion.field][status]++;
   if(equivalence)by_field[assertion.field].presentational_equivalents++;
   findings.push({case_id:record.case_id,field:assertion.field,strict_status:status,
    decision:equivalence ? 'print_equivalence_only' : 'unresolved_original_source_review',
    ...(equivalence ? {equivalence} : {}), expected:assertion.expected,actual:assertion.actual??null});
  }
 }
 if (counts.exact !== comparison.counts.exact_equivalent || counts.missing !== comparison.counts.missing ||
     counts.review_required !== comparison.counts.review_required ||
     counts.exact + counts.missing + counts.review_required !== 4002)
  throw new Error('Strict corpus totals do not reconcile; refusing to create misleading review');
 if (findings.length !== counts.missing+counts.review_required)throw new Error('Incomplete findings');
 return {schema_version:1,type:'non_scoring_presentation_equivalence_triage',
  strict_counts_preserved:true,source_tree_sha256:comparison.source_tree_sha256,
  oracle_freeze_sha256:comparison.oracle_freeze_sha256,replay_sha256:comparison.replay_sha256,
  counts,by_field,findings,
  limits:[
   'Equivalent print notation does NOT rewrite the frozen oracle, compare score, extraction output or saved product.',
   'A strict review-required result is not declared source-verified merely because a subset matches.',
   'All missing fields, semantic discrepancies, product identity, source conflicts and unsupported taxonomy remain unresolved.',
   'This classification cannot by itself close issue 33 or authorize publication.'
  ]};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const [comparisonPath,outPath] = process.argv.slice(2);
 if(!comparisonPath || !outPath)throw new Error('Usage: node coffee-corpus-presentation-review.mjs original-comparison.json triage.json');
 const comparison=JSON.parse(await fs.readFile(comparisonPath,'utf8'));
 const review=reviewCorpusPresentation(comparison);
 await fs.writeFile(outPath,JSON.stringify(review,null,2)+'\n');
 console.log(JSON.stringify({counts:review.counts,by_field:review.by_field},null,2));
}
