import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewedMemberBrokerQa as verify} from './helpers/release-published-restoration.mjs';
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
