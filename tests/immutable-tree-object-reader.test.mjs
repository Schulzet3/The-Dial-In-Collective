import test from 'node:test';
import assert from 'node:assert/strict';
import {createImmutableGitObjectReader} from '../scripts/release/stage-ready-only-candidate.mjs';
const commit='a'.repeat(40),other='b'.repeat(40),blob='c'.repeat(40);
test('exact whole-tree inventory preserves regular modes, path identity and proven null with one read per SHA',()=>{
 let reads=0;
 const read=createImmutableGitObjectReader(ref=>{reads++;return '040000 tree '+blob+'\tsrc\0'+
  '100644 blob '+blob+'\tsrc/a.mjs\0'+'100755 blob '+blob+'\trun.sh\0';});
 assert.equal(read(commit,'src/a.mjs'),'100644:'+blob);
 assert.equal(read(commit,'run.sh'),'100755:'+blob);
 assert.equal(read(commit,'missing'),null);assert.equal(read(commit,'missing'),null);
 assert.equal(reads,1);assert.equal(read(other,'missing'),null);assert.equal(reads,2);
 assert.throws(()=>read(commit,'src'),/unsafe mode/);
});
test('mutable refs and unsafe paths never enter cached source proof',()=>{
 let reads=0;const read=createImmutableGitObjectReader(()=>{reads++;return '';});
 for(const ref of ['HEAD','main',commit+'^','refs/heads/main',commit.slice(0,12)])assert.throws(()=>read(ref,'safe'),/immutable commit SHA/);
 for(const path of ['../source','/root','src//a','src/./a','src\\a','a\nb'])assert.throws(()=>read(commit,path),/Unsafe/);
 assert.equal(reads,0);
});
test('unsafe modes remain failures, including alongside independently readable regular files',()=>{
 const read=createImmutableGitObjectReader(()=>
  '120000 blob '+blob+'\tsymlink\0'+'160000 commit '+blob+'\tmodule\0'+'100644 blob '+blob+'\tok\0');
 assert.equal(read(commit,'ok'),'100644:'+blob);
 for(const path of ['symlink','module'])assert.throws(()=>read(commit,path),/unsafe mode/);
});
test('truncated, duplicate and failed inventories are never cached as absence',()=>{
 for(const raw of ['100644 blob '+blob+'\ta','garbage\0',
  '100644 blob '+blob+'\ta\0'+'100644 blob '+blob+'\ta\0']){
  let calls=0;const read=createImmutableGitObjectReader(()=>{calls++;return calls===1?raw:'';});
  assert.throws(()=>read(commit,'a'));assert.equal(read(commit,'a'),null);assert.equal(calls,2);
 }
 let calls=0;const read=createImmutableGitObjectReader(()=>{calls++;if(calls===1)throw Error('transport');return '';});
 assert.throws(()=>read(commit,'a'),/transport/);assert.equal(read(commit,'a'),null);assert.equal(calls,2);
});
