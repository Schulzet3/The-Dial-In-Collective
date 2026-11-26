import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewedMemberBrokerQa as verify,reviewedMemberBrokerQaReceiptQueue as replay} from './helpers/release-published-restoration.mjs';
const snapshot=JSON.parse(readFileSync(new URL('./fixtures/issue3889-member-broker-source.json',import.meta.url),'utf8'));
const CORE='supabase/functions/dic-member-approval-broker/core.mjs',TEST='tests/issue2258-member-approval-notices.test.mjs';
const OWNER='docs/audits/issue509-r377-member-approval-vault-isolation-20261120.json';
const FIRST='d2b99b7972512989a829a6406a201ad8d9ab264e',LAST='afd799a98475d253a896a45f2dacd432f9964c88';
const bad='100644:'+'f'.repeat(40);
function fixture(){
 const s=structuredClone(snapshot);s.objects.HEAD=structuredClone(s.objects[s.development_sha]);
 return {s,row:s.row,dev:s.development_sha,pub:s.published_sha,
  readParents:r=>s.parents[r]||[],firstParentChangedPaths:r=>s.changes[r]||[],
  isAncestor:(a,b)=>s.ancestors.some(([x,y])=>x===a&&y===b),
  sourceObjectAt:(r,p)=>s.objects[r]?.[p]??null};
}
test('independent member QA attributes both exact runtime sources and full non-excluded test history',()=>{
 const f=fixture(),before=structuredClone(f.row),proof=verify(f);
 assert.deepEqual(f.row,before);assert.equal(f.row.merged_source_sha,FIRST);
 assert.deepEqual([...proof.byPath.keys()],[CORE,TEST]);
 assert.deepEqual(proof.byPath.get(CORE),[FIRST,LAST]);
 assert.deepEqual(proof.byPath.get(TEST),[FIRST,LAST]);
 assert.deepEqual(proof.verifiedFixtures,[TEST]);
 assert.equal(proof.additional_source_components.length,1);
 const child=proof.additional_source_components[0];
 assert.equal(child.id,'DIC-Q-509-member-approval-vault-isolation');
 assert.equal(child.baseline_id,f.row.id);assert.equal(child.baseline_cohort_member,false);
 assert.equal(child.merged_source_sha,LAST);assert.equal(child.ready_certified,false);
 assert.equal(child.publication_authorized,false);
 assert.equal(verify({...f,row:{...f.row,id:'DIC-Q-509-unrelated'}}),null);
});
test('independent member QA rejects missing source ownership, malformed queue, parents and workflow drift',()=>{
 for(const change of [
  f=>{f.row.issue=33;},f=>{f.row.pr=3472;},f=>{f.row.merged_source_sha=LAST;},
  f=>{f.row.production_deployed=true;},f=>{f.row.scope_paths.push('site/cloud/main.js');},
  f=>{f.row.ci_runs=f.row.ci_runs.filter(id=>id!==44612256444);},
  f=>{f.row.ci_runs=f.row.ci_runs.filter(id=>id!==44663957447);},
  f=>{f.pub='f'.repeat(40);},f=>{f.isAncestor=()=>false;},
  f=>{f.s.parents[FIRST].reverse();},f=>{f.s.parents[LAST].pop();},
  f=>{f.s.changes[LAST].push('.github/workflows/foreign.yml');},
  f=>{f.s.changes[FIRST]=f.s.changes[FIRST].filter(p=>p!==TEST);},
  ...Object.keys(snapshot.parents).map(ref=>f=>{f.s.objects[ref][TEST]=bad;}),
  ...Object.values(snapshot.parents).map(([ref])=>f=>{f.s.objects[ref][CORE]=bad;}),
  f=>{f.s.objects[f.dev][CORE]=f.s.objects[FIRST][CORE];},
  f=>{f.s.objects[f.dev][TEST]=bad;},f=>{f.s.objects[f.pub][CORE]=bad;},
  f=>{f.s.objects[f.pub][TEST]=bad;},f=>{f.s.objects[LAST][OWNER]=bad;},
  f=>{f.s.objects[f.dev][OWNER]=null;},
  f=>{f.s.objects.HEAD[CORE]=f.s.objects[FIRST][CORE];},
  f=>{f.s.objects.HEAD[TEST]=f.s.objects[f.pub][TEST];}
 ]){const f=fixture();change(f);assert.throws(()=>verify(f));}
});
test('retained member source and all tests must remain at previously certified bytes',()=>{
 const f=fixture();f.retained=true;f.priorCandidate='b'.repeat(40);
 f.s.objects[f.priorCandidate]=structuredClone(f.s.objects.HEAD);
 assert.ok(verify(f));
 for(const path of [CORE,TEST]){
  const original=f.s.objects[f.priorCandidate][path];
  f.s.objects[f.priorCandidate][path]=bad;assert.throws(()=>verify(f),/retained/);
  f.s.objects[f.priorCandidate][path]=original;
 }
});
test('independent member queue replay is a fixed four-receipt append with exact parent, manifest and full-row binding',()=>{
 const id=snapshot.row.id,dev=snapshot.development_sha,reference='58d5902c39e7aad61fc5a8b0acc072c2be1df4ef';
 const additions=[44612256444,44663957436,44663957447,44663957497],row=structuredClone(snapshot.row);
 row.ci_runs=row.ci_runs.slice(0,10);
 row.blockers=['Exact merged-source applicable Node22/browser CI IN_PROGRESS; independently isolated #3347 READY certification UNVERIFIED; #2258/#96 genuine delivery acceptance UNVERIFIED; no Publish permission'];
 const queue={published_base:{tested_source_sha:snapshot.published_sha},items:[row,{id:'DIC-Q-33-other',state:'TESTING',notes:'untouched'}]};
 const manifestReceipt={id,original_queue_source_sha:reference,original_queue_blob_sha:'dac49db2e3478531fb34c5e022871d8fbc04dbf2',
  original_row_sha256:'ed15440c72aef6f8adc6f397aa9acfe6334085c61203fcd4a2b30a9d39bb2b60',
  source_shas:[FIRST,LAST],added_successful_run_ids:additions};
 function args(q){
  const raw=JSON.stringify(q,null,2)+'\n',blob='100644:'+createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
  return {added:[id],dev,parent:{raw,value:structuredClone(q)},manifestReceipt:structuredClone(manifestReceipt),
   sourceObjectAt:(ref,path)=>path==='docs/RELEASE_QUEUE.json'?ref===reference?
    '100644:dac49db2e3478531fb34c5e022871d8fbc04dbf2':ref===dev?blob:null:null};
 }
 const before=structuredClone(queue),expected=structuredClone(queue);expected.items[0].ci_runs.push(...additions);
 assert.deepEqual(replay(queue,args(queue)),expected);assert.deepEqual(queue,before);
 assert.equal(replay(queue,{added:[]}),queue,'unselected member has no receipt delta');
 assert.equal(replay(expected,{...args(expected),manifestReceipt:undefined}),expected,'already reconciled TESTING row remains exact');
 const retained=structuredClone(expected);retained.items[0].state='READY';retained.items[0].blockers=[];
 assert.equal(replay(retained,{added:['DIC-Q-33-other']}),retained,'retained certified member has no repeat delta');
 for(const change of [
  q=>{q.items[0].ci_runs.pop();},q=>{q.items[0].ci_runs.push(1);},q=>{q.items[0].ci_runs.reverse();},
  q=>{q.items[0].notes+='changed';},q=>{q.items[0].tests.pop();},q=>{q.items[0].blockers=[];},
  q=>{q.items[0].merged_source_sha=LAST;},q=>{q.items[0].pr=3472;},q=>{q.items[0].scope_paths.push('site/cloud/main.js');},
  q=>{q.items[0].state='READY';},q=>{q.items.push(structuredClone(q.items[0]));}
 ]){const q=structuredClone(queue);change(q);assert.throws(()=>replay(q,args(q)));}
 for(const change of [
  a=>{a.sourceObjectAt=()=>bad;},a=>{a.dev='f'.repeat(40);},a=>{a.parent.raw+=' ';},
  a=>{a.parent.value.items[0].notes+='forged';},a=>{a.manifestReceipt.added_successful_run_ids.push(1);},
  a=>{a.manifestReceipt.source_shas.reverse();},a=>{a.manifestReceipt.original_queue_blob_sha='f'.repeat(40);},
  a=>{a.manifestReceipt=undefined;},a=>{a.added=[];},a=>{a.added.push(id);}
 ]){const a=args(queue);change(a);assert.throws(()=>replay(queue,a));}
 assert.throws(()=>replay(expected,args(expected)),'already reconciled row cannot repeat receipt marker');
});
