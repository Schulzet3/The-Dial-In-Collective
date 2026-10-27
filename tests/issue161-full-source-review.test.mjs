import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,scanLine,runAudit,sha256} from '../scripts/audit/issue161-full-source-review.mjs';
test('every UTF8 line is counted, source content redacted and original input unmodified',()=>{
 const records=new Map([
  ['site/example.js','const x=1;\n// TODO: inspect\nconst val=eval(expr);\n'],
  ['docs/ledger.json','{"approved":true}\r\n'],
  ['assets/shot.png',Buffer.from([0,255,42])]
 ]);
 const bytesBefore=[...records.values()].map(x=>typeof x==='string'?x:Buffer.from(x));
 const result=runAudit({paths:[...records.keys()],sourceSha:'a'.repeat(40),treeSha:'b'.repeat(40),
  read:p=>Buffer.from(records.get(p)),stat:()=>({isFile:()=>true})});
 assert.equal(result.totals.tracked_files,3);
 assert.equal(result.totals.text_files,2);
 assert.equal(result.totals.text_lines,4);
 assert.equal(result.totals.binary_files,1);
 assert.equal(result.totals.invalid_json_files,0);
 assert.equal(result.patterns.incomplete_work,1);
 assert.equal(result.patterns.dynamic_execution,1);
 assert.equal(JSON.stringify(result).includes('eval(expr)'),false);
 assert.deepEqual([...records.values()],bytesBefore);
});
test('secret matches expose file+line+rule only and never captured secret text',()=>{
 const secret='ghp_'+ 'A'.repeat(36);
 const p='src/private.mjs';
 const result=runAudit({paths:[p],read:()=>Buffer.from('const key="'+secret+'"\n'),stat:()=>({isFile:()=>true}),sourceSha:'a'.repeat(40)});
 assert.equal(result.totals.critical_candidates,1);
 assert.deepEqual(result.findings,[{path:p,line:1,rule:'github_token',risk:'critical'}]);
 assert.doesNotMatch(JSON.stringify(result),new RegExp(secret));
 assert.equal(scanLine('safe code').length,0);
});
test('unexpected binary source and malformed JSON are flagged without printing bytes',()=>{
 const inputs={'src/a.js':Buffer.from([0,10,20]),'data/broken.json':Buffer.from('{invalid!')};
 const result=runAudit({paths:Object.keys(inputs),read:p=>inputs[p],stat:()=>({isFile:()=>true}),sourceSha:'a'});
 assert.equal(result.totals.critical_candidates,1);
 assert.equal(result.totals.invalid_json_files,1);
 assert.deepEqual(result.findings.map(x=>x.rule),['unexpected_binary_source','invalid_json']);
 assert.equal(classify('a.js',Buffer.from('hello')).text,true);
 assert.equal(sha256(Buffer.from('hello')).length,64);
});
