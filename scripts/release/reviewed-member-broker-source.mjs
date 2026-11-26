// #3889: two independently attributable member-broker corrections share one
// runtime path. Preserve the baseline #3452 identity and account for #3472 as
// a separate, owner-approved nonbaseline component; never absorb its bytes
// under the original merge or infer any production/recipient acceptance.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const MEMBER_BROKER_ID='DIC-Q-509-member-approval-gone-push-receipt';
export const MEMBER_VAULT_COMPONENT_ID='DIC-Q-509-member-approval-vault-isolation';
const PUB='2d22d448160d428a977f06482323646b92818fcf';
const CORE='supabase/functions/dic-member-approval-broker/core.mjs';
const TEST='tests/issue2258-member-approval-notices.test.mjs';
const OWNER='docs/audits/issue509-r377-member-approval-vault-isolation-20261120.json';
const OWNER_BLOB='e8835d92fa2c5d1c73a21f69605d7660069e2bab';
const PATHS=[CORE,TEST];
const STEPS=[
 {merge:'d2b99b7972512989a829a6406a201ad8d9ab264e',
  parents:['f9f42b0d13e89ebc78aa50f2c6e2823d5ada7ab2','26b3d74da619e9584ab644322df7365610b58fad'],
  before:['1bc82c0c0f7e90bb86dd7da895c18f9c4e015c5a','179dc171aa7ab11b182b8832c3fd3f733dbc6824'],
  after:['113ffd9ac7bc45839a0566da8837edd22352adf2','9ebf20df39d311d8d743ee6eb8b7b443584ec712'],
  runs:[44612256441,44612256444,44612256428]},
 {merge:'afd799a98475d253a896a45f2dacd432f9964c88',
  parents:['0a08e269a919110a0beaaef253be1e9dfb38775d','044bdfcb693966ba91599245b9d18e323caecfd7'],
  before:['113ffd9ac7bc45839a0566da8837edd22352adf2','9ebf20df39d311d8d743ee6eb8b7b443584ec712'],
  after:['3834e530c379d60f0ff60ae22115cc552a4e5d8a','48ac09eaf2a000200b444cc9104ffba50893e246'],
  runs:[44663957436,44663957447,44663957497]}
];
// These exact test-only changes preserve all three assertions. The final
// guard may exclude only the exact published, UNSELECTED member runtime;
// selecting this composite executes both fixes' original assertions.
const QA=[
 {merge:'e85780b670f9d89328fdf46ba035b9d81205bb18',parent:'c7bb311b92a64271fe22ed29a80deb62d77b8475',
  before:'48ac09eaf2a000200b444cc9104ffba50893e246',after:'c2486b828c08365acd1aca8cd74242093be16c08'},
 {merge:'4c42b2338f68d621325ffd6a34a78a485d48bf90',parent:'d9fc859d81a23e10ee2cd0e1a37013b93a4980e5',
  before:'c2486b828c08365acd1aca8cd74242093be16c08',after:'881f9d25ab46a54df14edb0584249a8118bbb6bf'},
 {merge:'a9ecf011fe0cac741246234202145f0474533969',parent:'7aedd1cd0cc0aa734831b1cb9871ab48d9269a8a',
  before:'881f9d25ab46a54df14edb0584249a8118bbb6bf',after:'c9dfb612b200025a316c6e018e48e10e0d518a82'}
];
const SHA=/^[a-f0-9]{40}$/;
const obj=sha=>'100644:'+sha;
const sorted=xs=>[...new Set(xs)].sort();
// The complete unchanged member row in the independently certified READY52
// queue. Only these four already-verified run receipts may be appended in a
// prospective selection; no historical receipt or other metadata is removed.
const RECEIPT_REFERENCE='58d5902c39e7aad61fc5a8b0acc072c2be1df4ef';
const RECEIPT_QUEUE='dac49db2e3478531fb34c5e022871d8fbc04dbf2';
const RECEIPT_ROW_SHA256='ed15440c72aef6f8adc6f397aa9acfe6334085c61203fcd4a2b30a9d39bb2b60';
const ORIGINAL_RUNS=[44602832336,44602832355,44602832163,44602832499,44602832351,
 44602832140,44602832041,44612256397,44612256441,44612256428];
const ADDED_RUNS=[44612256444,44663957436,44663957447,44663957497];
const memberReceiptProofs=new WeakMap();
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?
 '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
function exactMemberReceiptRow(queue){
 const rows=queue?.items?.filter(row=>row.id===MEMBER_BROKER_ID);
 assert.equal(rows?.length,1,'exact unique member receipt row required');
 const row=rows[0],copy=structuredClone(row);
 assert.equal(row.state,'TESTING','only selected TESTING member receipt reconciliation');
 const original=JSON.stringify(row.ci_runs)===JSON.stringify(ORIGINAL_RUNS);
 assert.ok(original||JSON.stringify(row.ci_runs)===JSON.stringify([...ORIGINAL_RUNS,...ADDED_RUNS]),
  'immutable original member receipts or exact append required');
 copy.ci_runs=[...ORIGINAL_RUNS];
 assert.equal(createHash('sha256').update(canonical(copy)).digest('hex'),RECEIPT_ROW_SHA256,
  'immutable complete member receipt row changed');
 return {row,original};
}
export function reconcileReviewedMemberReceiptQueue(queue,{selectedIds,...readers}={}){
 if(!Array.isArray(selectedIds)||!selectedIds.includes(MEMBER_BROKER_ID))return null;
 try{
  assert.equal(new Set(selectedIds).size,selectedIds.length,'unique member selection required');
  const {row,original}=exactMemberReceiptRow(queue);
  const {developmentSourceSha:dev,publishedSourceSha:pub,sourceObjectAt,sourceTextAt}=readers;
  assert.match(dev||'',SHA);assert.equal(pub,PUB);
  assert.equal(typeof sourceObjectAt,'function');assert.equal(typeof sourceTextAt,'function');
  assert.equal(sourceObjectAt(RECEIPT_REFERENCE,'docs/RELEASE_QUEUE.json'),obj(RECEIPT_QUEUE),
   'immutable member reference queue binding');
  const raw=sourceTextAt(dev,'docs/RELEASE_QUEUE.json');assert.equal(typeof raw,'string');
  const bytes=Buffer.from(raw),object='100644:'+createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(sourceObjectAt(dev,'docs/RELEASE_QUEUE.json'),object,'member parent queue Git bytes');
  const parent=JSON.parse(raw);assert.deepEqual(parent.published_base,queue.published_base);
  assert.deepEqual(exactMemberReceiptRow(parent).row,row,'member parent queue row drift');
  const output=structuredClone(queue),next=output.items.find(x=>x.id===MEMBER_BROKER_ID);
  next.ci_runs=[...ORIGINAL_RUNS,...ADDED_RUNS];
  reviewedMemberBrokerComposite({...readers,row:next});
  if(!original)return null; // Already reconciled TESTING source; no second delta.
  const receipt={id:MEMBER_BROKER_ID,original_queue_source_sha:RECEIPT_REFERENCE,
   original_queue_blob_sha:RECEIPT_QUEUE,original_row_sha256:RECEIPT_ROW_SHA256,
   source_shas:STEPS.map(s=>s.merge),added_successful_run_ids:[...ADDED_RUNS]};
  const proof=Object.freeze({kind:'DIC-3889-MEMBER-RECEIPT-PROOF-1'});
  memberReceiptProofs.set(proof,{dev,pub,selected:canonical(sorted(selectedIds)),receipt:canonical(receipt),
   originalRow:canonical(row)});
  return {queue:output,receipt,proof};
 }catch(e){throw Error('PROSPECTIVE_BATCH_HOLD: member receipt '+e.message);}
}
// Publisher replay requires the in-process, independently reconstructed proof.
// JSON-cloned or caller-fabricated plans cannot authorize this metadata delta.
export function applyReviewedMemberReceiptDelta(queue,{proof,developmentSourceSha,selectedIds,receipt}={}){
 const bound=memberReceiptProofs.get(proof);
 assert.ok(bound,'unverified opaque member receipt proof');
 assert.equal(developmentSourceSha,bound.dev);assert.equal(queue?.published_base?.tested_source_sha,bound.pub);
 assert.ok(Array.isArray(selectedIds)&&selectedIds.includes(MEMBER_BROKER_ID));
 assert.equal(new Set(selectedIds).size,selectedIds.length);
 assert.equal(canonical(sorted(selectedIds)),bound.selected);assert.equal(canonical(receipt),bound.receipt);
 const {row,original}=exactMemberReceiptRow(queue);
 assert.equal(original,true);assert.equal(canonical(row),bound.originalRow);
 const output=structuredClone(queue);output.items.find(x=>x.id===MEMBER_BROKER_ID).ci_runs=[...ORIGINAL_RUNS,...ADDED_RUNS];
 return output;
}
export function reviewedMemberBrokerComposite({row,developmentSourceSha:dev,publishedSourceSha:pub,
 readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}={}){
 if(row?.id!==MEMBER_BROKER_ID)return null;
 try{
  assert.equal(row.issue,509);assert.equal(row.pr,3452);
  assert.equal(row.merged_source_sha,STEPS[0].merge);
  assert.deepEqual(row.scope_paths,[CORE]);assert.equal(row.production_deployed,false);
  assert.equal(pub,PUB);assert.match(dev||'',SHA);
  for(const reader of [readParents,isAncestor,firstParentChangedPaths,sourceObjectAt])assert.equal(typeof reader,'function');
  assert.ok(Array.isArray(row.ci_runs)&&STEPS.flatMap(s=>s.runs).every(id=>row.ci_runs.includes(id)),
   'both exact merged source receipt sets required');
  assert.equal(isAncestor(STEPS[0].merge,STEPS[1].parents[0]),true);
  assert.equal(isAncestor(STEPS[1].merge,QA[0].parent),true);
  assert.equal(isAncestor(STEPS[1].merge,dev),true);
  assert.deepEqual(STEPS[0].after,STEPS[1].before);
  for(const s of STEPS){
   assert.deepEqual(readParents(s.merge),s.parents,'ordered historical source parents');
   assert.deepEqual(firstParentChangedPaths(s.merge).filter(p=>!p.startsWith('docs/')).sort(),PATHS.slice().sort(),
    'source merge contains undeclared runtime/test/workflow');
   for(const [i,path] of PATHS.entries()){
    assert.equal(sourceObjectAt(s.parents[0],path),obj(s.before[i]));
    assert.equal(sourceObjectAt(s.merge,path),obj(s.after[i]));
   }
  }
  for(const [i,s] of QA.entries()){
   assert.deepEqual(readParents(s.merge),[s.parent],'exact test amendment sole parent');
   assert.equal(isAncestor(s.merge,dev),true);
   if(i)assert.equal(isAncestor(QA[i-1].merge,s.parent),true);
   assert.ok(firstParentChangedPaths(s.merge).includes(TEST));
   assert.equal(sourceObjectAt(s.parent,TEST),obj(s.before));
   assert.equal(sourceObjectAt(s.merge,TEST),obj(s.after));
   assert.equal(sourceObjectAt(s.parent,CORE),obj(STEPS[1].after[0]));
   assert.equal(sourceObjectAt(s.merge,CORE),obj(STEPS[1].after[0]));
  }
  assert.equal(sourceObjectAt(pub,CORE),obj(STEPS[0].before[0]));
  assert.equal(sourceObjectAt(pub,TEST),obj(QA[0].after));
  const objects={[CORE]:obj(STEPS[1].after[0]),[TEST]:obj(QA.at(-1).after)};
  for(const path of PATHS)assert.equal(sourceObjectAt(dev,path),objects[path],'live source/test drift '+path);
  for(const ref of [STEPS[1].merge,dev])assert.equal(sourceObjectAt(ref,OWNER),obj(OWNER_BLOB),'component owner receipt drift');
  const component={kind:'DIC-APPROVED-NONBASELINE-SOURCE-COMPONENT-1',
   id:MEMBER_VAULT_COMPONENT_ID,baseline_id:MEMBER_BROKER_ID,baseline_cohort_member:false,
   issue:509,pr:3472,merged_source_sha:STEPS[1].merge,scope_paths:[CORE],
   owner_receipt_path:OWNER,owner_receipt_blob_sha:OWNER_BLOB,
   ci_run_ids:[...STEPS[1].runs],publication_authorized:false,ready_certified:false};
  return {id:row.id,deployable_paths:[CORE],source_objects:objects,
   source_merges:STEPS.map(s=>({merge_sha:s.merge,first_parent_sha:s.parents[0],
    changed_paths:[...PATHS],run_ids:[...s.runs],
    historical_applicability:'DIC-3889-EXACT-MEMBER-EDGE-ONLY-1'})),
   qa_amendments:QA.map(s=>({...s,path:TEST})),additional_source_components:[component]};
 }catch(e){throw Error('PROSPECTIVE_BATCH_HOLD: member broker composite '+e.message);}
}

// Called only after the complete main/independent Git proof. It binds a
// claimed prospective object back to its exact row, plan and Git objects;
// arbitrary plan fields or a different component can never supply a pin.
export function reviewedMemberBrokerPlannedObject({row,path,plan,sourceObjectAt}={}){
 if(row?.id!==MEMBER_BROKER_ID||path!==CORE)return null;
 const proof=plan?.selected_composite_sources?.find(x=>x.id===MEMBER_BROKER_ID);
 const component=proof?.additional_source_components?.[0];
 if(plan?.status!=='PROSPECTIVE_BATCH_PLAN_ONLY'||plan.ready_certified!==false||
    plan.publication_authorized!==false||row.merged_source_sha!==STEPS[0].merge||
    JSON.stringify(row.scope_paths)!==JSON.stringify([CORE])||
    proof?.source_merges?.length!==2||proof.additional_source_components?.length!==1||
    component?.id!==MEMBER_VAULT_COMPONENT_ID||component.baseline_cohort_member!==false||
    component.merged_source_sha!==STEPS[1].merge||component.owner_receipt_blob_sha!==OWNER_BLOB||
    component.ready_certified!==false||component.publication_authorized!==false||
    proof.source_objects?.[CORE]!==obj(STEPS[1].after[0])||typeof sourceObjectAt!=='function')
  throw Error('Member broker component source plan unavailable');
 for(const [i,s] of STEPS.entries()){
  const selected=proof.source_merges[i];
  if(selected.merge_sha!==s.merge||selected.first_parent_sha!==s.parents[0]||
     JSON.stringify(sorted(selected.changed_paths||[]))!==JSON.stringify(sorted(PATHS))||
     JSON.stringify(selected.run_ids)!==JSON.stringify(s.runs)||
     sourceObjectAt(s.merge,CORE)!==obj(s.after[0])||
     sourceObjectAt(s.parents[0],CORE)!==obj(s.before[0]))
   throw Error('Member broker component source plan mismatch');
 }
 if(sourceObjectAt(plan.development_source_sha,CORE)!==obj(STEPS[1].after[0])||
    sourceObjectAt(plan.development_source_sha,TEST)!==obj(QA.at(-1).after)||
    sourceObjectAt(plan.development_source_sha,OWNER)!==obj(OWNER_BLOB))
  throw Error('Member broker component parent source drift');
 return obj(STEPS[1].after[0]);
}

// Only the immutable two Edge/test-only first-parent steps lacked a SQL push
// trigger. A fresh frozen candidate still requires all FIVE statuses. This
// function cannot turn skipped or absent applicable historical jobs into PASS.
export function reviewedMemberHistoricalCheckNames(step){
 if(step?.historical_applicability!=='DIC-3889-EXACT-MEMBER-EDGE-ONLY-1')return null;
 const exact=STEPS.find(s=>s.merge===step.merge_sha);
 assert.ok(exact&&step.first_parent_sha===exact.parents[0]);
 assert.deepEqual(step.changed_paths,PATHS);
 assert.deepEqual(step.run_ids,exact.runs);
 return ['approval','validate','cloud-tests','mobile-browser-qa'];
}
