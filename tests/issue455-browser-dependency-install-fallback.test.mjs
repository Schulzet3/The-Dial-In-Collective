import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// #455 R190: code-level invariant checks. Only actual GitHub browser CI
// can demonstrate that an external Ubuntu DNS failure was recovered.
const workflowPath='.github/workflows/cloud-regression.yml';
const workflow=readFileSync(new URL('../'+workflowPath,import.meta.url),'utf8');
const candidateReceipt=new URL('../docs/RELEASE_CANDIDATE.json',import.meta.url);
const root=fileURLToPath(new URL('../',import.meta.url));
const gitWorkflow=sha=>{
 assert.match(sha,/^[a-f0-9]{40}$/);
 return execFileSync('git',['show',sha+':'+workflowPath],{
  encoding:'utf8',cwd:root,timeout:15000,maxBuffer:120000
 });
};
// An approved READY-only release must keep GitHub Actions workflow files at
// exact published bytes to avoid requesting workflow-write privileges.
// R190's fallback source remains mandatory in current development; verify it
// against the sealed development source instead of the intentionally restored
// published workflow. Malformed/missing ref or byte mismatch still FAILS.
let requiredSourceWorkflow=workflow;
if(existsSync(candidateReceipt)){
 const receipt=JSON.parse(readFileSync(candidateReceipt,'utf8'));
 assert.equal(receipt.kind,'DIC-READY-ONLY-SOURCE-1');
 assert.ok(receipt.restored_unpublished_workflow_paths?.includes(workflowPath),
  'Release candidate must document the exact restored workflow');
 assert.equal(workflow,gitWorkflow(receipt.published_source_sha),
  'Release candidate workflow must match published bytes exactly');
 requiredSourceWorkflow=gitWorkflow(receipt.development_source_sha);
}


test('R190 retains strict original Chromium plus OS dependency install',()=>{
 assert.match(requiredSourceWorkflow,/if ! python -m playwright install --with-deps chromium; then/);
 assert.match(requiredSourceWorkflow,/sudo apt-get update -o Acquire::Retries=2/);
 assert.equal((requiredSourceWorkflow.match(/python -m playwright install --with-deps chromium/g)||[]).length,2);
 assert.doesNotMatch(requiredSourceWorkflow,/continue-on-error:\s*true/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
test('R190 constrained mirror fallback fails closed if Azure mirror is absent',()=>{
 assert.match(requiredSourceWorkflow,/mirror_file=\/etc\/apt\/sources\.list\.d\/ubuntu\.sources/);
 assert.match(requiredSourceWorkflow,/if ! grep -q 'azure\.archive\.ubuntu\.com' "\$mirror_file"; then/);
 assert.match(requiredSourceWorkflow,/sudo sed -i 's#azure\.archive\.ubuntu\.com#archive\.ubuntu\.com#g' "\$mirror_file"/);
 assert.match(requiredSourceWorkflow,/exit 1/);
});
test('R190 leaves the full actual UI, visual, offline and accessibility suite required',()=>{
 for(const name of ['built_app_qa.py','visual_review.py','cloud_owner_qa.py','pwa_offline_qa.py','issue26_accessibility_qa.py','admin_records_qa.py']){
  assert.ok(requiredSourceWorkflow.includes(name),name+' must remain required in development');
  assert.ok(workflow.includes(name),name+' must remain required in published release');
 }
 assert.match(requiredSourceWorkflow,/if: steps\.scope\.outputs\.browser_mode != 'none'/);
 assert.match(workflow,/if: steps\.scope\.outputs\.browser_mode != 'none'/);
});
