// #3889: exact historical receipt correction, not a READY certificate.
// Frozen READY51 and its original queue remain immutable. This module never
// writes a ref, queue, provider, or substitutes a failed run for a PASS.
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const ORIGINAL_QUEUE='af0266a5cb9e56394bf976383adeda9b47653b38';
export const ORIGINAL_CANDIDATE='7ad87165296f638d87638c1120527e30fdac82ba';
export const FAMILY_ID='DIC-Q-509-stale-family-statistics-reconcile';
const FIRST_FAMILY_RUNS=[44519926449,44519926537,44519926388,44519926461];
const SECOND_FAMILY_RUNS=[44526403238,44526403147,44526403127,44526403259];
// Native Actions GET /actions/runs/<id> reread 2026-11-25. Historical
// non-success outcomes are archived here permanently, never counted as PASS.
const ARCHIVED={
  "DIC-Q-509-admin-normalized-identity": [
    {
      "id": 44405688303,
      "head_sha": "355163e3b312497fcf5d44f4cb150b075f3e2f4b",
      "event": "pull_request",
      "status": "completed",
      "conclusion": "skipped"
    },
    {
      "id": 44406406046,
      "head_sha": "e958c3acace0d908a4464b5cf95c0405510a1c8b",
      "event": "push",
      "status": "completed",
      "conclusion": "skipped"
    },
    {
      "id": 44406406174,
      "head_sha": "e958c3acace0d908a4464b5cf95c0405510a1c8b",
      "event": "push",
      "status": "completed",
      "conclusion": "failure"
    }
  ],
  "DIC-Q-509-source-path-case-guard-20261115": [
    {
      "id": 43715405733,
      "head_sha": "9a7ffa65955d8c2b81e41153653e19fc512f3a31",
      "event": "push",
      "status": "completed",
      "conclusion": "failure"
    }
  ],
  "DIC-Q-509-confirm-coffee-null-name": [
    {
      "id": 44289071815,
      "head_sha": "e6634db4217ae446555d321719ada1fa0ae23ea1",
      "event": "pull_request",
      "status": "completed",
      "conclusion": "failure"
    },
    {
      "id": 44289071927,
      "head_sha": "e6634db4217ae446555d321719ada1fa0ae23ea1",
      "event": "pull_request",
      "status": "completed",
      "conclusion": "failure"
    },
    {
      "id": 44289525218,
      "head_sha": "78969b25dc5c0f258b05cc3bfb4cc0fd83fb5dd5",
      "event": "pull_request",
      "status": "completed",
      "conclusion": "failure"
    },
    {
      "id": 44290199558,
      "head_sha": "d516ae8a1e51b436331391b9cbb4683250704020",
      "event": "push",
      "status": "completed",
      "conclusion": "failure"
    }
  ],
  "DIC-Q-33-r347-original299-directions-source": [
    {
      "id": 44685623135,
      "head_sha": "95a32bf5256446c72321e6776aaff4831109cdae",
      "event": "pull_request",
      "status": "completed",
      "conclusion": "failure"
    },
    {
      "id": 44686742250,
      "head_sha": "3d1884b7b724d9ebdaa111d5db3e0d9d872ee839",
      "event": "push",
      "status": "completed",
      "conclusion": "failure"
    }
  ],
  "DIC-Q-509-admin-push-lazy-vault-poll": [
    {
      "id": 44740390567,
      "head_sha": "eff7c5497d690f6435fdaa55b6356494f16a5c7f",
      "event": "pull_request",
      "status": "completed",
      "conclusion": "skipped"
    },
    {
      "id": 44741312173,
      "head_sha": "cbbe8bc71fdc0a8ad492cbc77cf97c7367f31d72",
      "event": "push",
      "status": "completed",
      "conclusion": "failure"
    }
  ],
  "DIC-Q-455-r444-pending-shot-form-lock": [
    {
      "id": 45029642249,
      "head_sha": "578b1a5bc1a5d86899ab4c2336db9136e6999c5e",
      "event": "pull_request",
      "status": "completed",
      "conclusion": "skipped"
    }
  ]
};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function exactQueueBlob(queue){
 const raw=Buffer.from(JSON.stringify(queue,null,2)+'\n','utf8');
 return createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
}
// This function is deliberately narrow and also serves the independent
// replay/parity gate. No caller supplies removals, replacements, or outcomes.
export function applyReviewedReceiptDelta(queue){
 const out=structuredClone(queue);
 for(const [id,records] of Object.entries(ARCHIVED)){
  const rows=out.items.filter(i=>i.id===id);
  assert.equal(rows.length,1,'historical receipt row identity '+id);
  const row=rows[0];
  assert.equal(row.state,'READY');
  assert.ok(Array.isArray(row.ci_runs)&&new Set(row.ci_runs).size===row.ci_runs.length);
  const failed=records.map(r=>r.id);
  assert.ok(failed.every(run=>row.ci_runs.includes(run)),'missing archived run '+id);
  row.ci_runs=row.ci_runs.filter(run=>!failed.includes(run));
  assert.ok(row.ci_runs.length,'successful historical refs required '+id);
 }
 const family=out.items.filter(i=>i.id===FAMILY_ID);
 assert.equal(family.length,1);
 assert.equal(family[0].state,'TESTING');
 assert.equal(family[0].merged_source_sha,'1def2c9d6573297c406192b413ffc3e7620ffe7a');
 assert.ok(same(family[0].ci_runs,SECOND_FAMILY_RUNS),'stale-family second source receipts mismatch');
 family[0].ci_runs=[...FIRST_FAMILY_RUNS,...SECOND_FAMILY_RUNS];
 return out;
}
export function reviewedHistoricalReceiptCorrection(queue,{selectedIds,developmentSourceSha,sourceObjectAt}={}){
 if(!selectedIds?.includes(FAMILY_ID)||exactQueueBlob(queue)!==ORIGINAL_QUEUE)return null;
 assert.match(developmentSourceSha||'',/^[a-f0-9]{40}$/);
 assert.equal(typeof sourceObjectAt,'function');
 for(const ref of [developmentSourceSha,ORIGINAL_CANDIDATE])
  assert.equal(sourceObjectAt(ref,'docs/RELEASE_QUEUE.json'),'100644:'+ORIGINAL_QUEUE,
   'historical queue must equal exact frozen READY51 Git object');
 return {queue:applyReviewedReceiptDelta(queue),receipt:{
  kind:'DIC-3889-HISTORICAL-CI-RECONCILIATION-1',original_queue_blob:ORIGINAL_QUEUE,
  original_candidate_sha:ORIGINAL_CANDIDATE,archived:structuredClone(ARCHIVED),
  added_family_runs:FIRST_FAMILY_RUNS.map(id=>({id,head_sha:'a45bb63ffd8a3eee164828c3c81e63baa6a8f155',event:'push',status:'completed',conclusion:'success'}))
 }};
}
