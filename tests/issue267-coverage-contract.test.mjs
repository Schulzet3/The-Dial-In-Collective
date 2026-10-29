import test from 'node:test';
import assert from 'node:assert/strict';
import {readIssue267Coverage,validateIssue267Coverage} from '../scripts/audit/issue267-coverage-contract.mjs';

test('historical 757-file source and direct semantic intervals reconcile without certifying unread lines',()=>{
 const data=readIssue267Coverage();
 assert.deepEqual(validateIssue267Coverage(data),[]);
 const covered=data.ledger.coverage_summary.direct_assistant_semantic_lines;
 assert.equal(covered,8212);
 assert.equal(data.ledger.coverage_summary.still_not_documented_as_semantically_reviewed_lines,579961-covered);
 assert.ok(covered<579961,'machine counts must not be upgraded to complete semantic review');
});
test('a duplicate historical interval cannot be counted twice',()=>{
 const data=readIssue267Coverage(),record=data.ledger.files.find(x=>x.reviewed_ranges.length);
 record.reviewed_ranges.push({...record.reviewed_ranges[0]});
 assert.ok(validateIssue267Coverage(data).some(s=>/overlap|Duplicate reviewed/.test(s)));
});
test('a dropped middle or tail line is explicitly detected',()=>{
 const data=readIssue267Coverage(),record=data.ledger.files.find(x=>x.remaining_ranges.length&&x.original_line_count>50);
 record.remaining_ranges[0].first_line+=1;
 assert.ok(validateIssue267Coverage(data).some(s=>/Gap or overlap/.test(s)));
});
test('a counterfeit source blob is rejected even if path/line numbers match',()=>{
 const data=readIssue267Coverage(),record=data.ledger.files[0];
 record.source_blob_sha='0'.repeat(40);
 assert.ok(validateIssue267Coverage(data).some(s=>/hash\/count mismatch/.test(s)));
});
test('batch evidence must exactly account for every semantic reviewed range',()=>{
 const data=readIssue267Coverage(),batch=data.batches.batches[0];
 batch.files.pop();
 assert.ok(validateIssue267Coverage(data).some(s=>/Batch count mismatch|without exact batch/.test(s)));
});
