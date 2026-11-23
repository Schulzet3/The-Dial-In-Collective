import test from 'node:test';
import assert from 'node:assert/strict';
import {SQL_PATHS,verifyFirstParentSqlIntro,verifyRemainingThree}
 from '../scripts/release/verify-testing-three-sql-source.mjs';
const S='a'.repeat(40),I='b'.repeat(40),P='c'.repeat(40),B='d'.repeat(40);
const path=SQL_PATHS[0][1];
function reader({intro=I,blob=B,current=B,branch=S,add=path,multiple=false}={}){
 return args=>{
  if(args[0]==='rev-parse'&&args[2]==='refs/remotes/origin/development/backend-foundation')return branch+'\n';
  if(args[0]==='log')return multiple?I+'\n'+P+'\n':intro+'\n';
  if(args[0]==='rev-parse'&&args[2]===S+':'+path)return current+'\n';
  if(args[0]==='rev-parse'&&args[2]===I+':'+path)return blob+'\n';
  if(args[0]==='rev-parse'&&args[2]===I+'^')return P+'\n';
  if(args[0]==='diff')return add+'\n';
  throw Error('unexpected synthetic Git read: '+args.join(' '));
 };
}
const verify=g=>verifyFirstParentSqlIntro({sourceSha:S,path,git:reader(g)});
test('exact first-parent SQL addition binds current and introduction Git objects',()=>{
 const x=verify();assert.equal(x.introduced_sha,I);assert.equal(x.blob_sha,B);
 assert.equal(x.status,'EXACT_FIRST_PARENT_INTRODUCTION_SOURCE_VERIFIED_NO_READY');
});
test('missing introduction is not a merge receipt',()=>{
 assert.throws(()=>verify({intro:''}),/missing\/ambiguous/);
});
test('two possible introductions are ambiguous and never guessed',()=>{
 assert.throws(()=>verify({multiple:true}),/missing\/ambiguous/);
});
test('source drift after introduction must be investigated, not credited',()=>{
 assert.throws(()=>verify({current:'e'.repeat(40)}),/drift/);
});
test('unverified first-parent source diff is rejected',()=>{
 assert.throws(()=>verify({add:'supabase/migrations/other.sql'}),/does not introduce/);
});
test('invalid/missing exact IDs or Git transport fail closed',()=>{
 assert.throws(()=>verifyFirstParentSqlIntro({sourceSha:'bad',path,git:reader()}),/invalid exact/);
 assert.throws(()=>verifyFirstParentSqlIntro({sourceSha:S,path:'README.md',git:reader()}),/invalid exact/);
 assert.throws(()=>verifyFirstParentSqlIntro({sourceSha:S,path}),/invalid exact/);
});
test('3-item intake is fixed without pretending any READY status',()=>{
 assert.equal(SQL_PATHS.length,3);
 assert.equal(new Set(SQL_PATHS.map(x=>x[0])).size,3);
 assert.equal(new Set(SQL_PATHS.map(x=>x[1])).size,3);
 assert.deepEqual(SQL_PATHS.map(x=>x[0]).sort(),[
  'DIC-Q-509-community-withdrawn-recheck-guard',
  'DIC-Q-509-member-approval-null-receipt-guard',
  'DIC-Q-509-pending-coffee-null-flags'
 ].sort());
});
test('drifting live development ref cannot be accepted as source proof',()=>{
 assert.throws(()=>verifyRemainingThree({sourceSha:S,git:reader({branch:P})}),/moved/);
});
