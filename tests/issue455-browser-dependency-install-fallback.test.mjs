import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// #455 R190: code-level invariant checks. Only actual GitHub browser CI
// can demonstrate that an external Ubuntu DNS failure was recovered.
const workflow=readFileSync(new URL('../.github/workflows/cloud-regression.yml',import.meta.url),'utf8');

test('R190 retains strict original Chromium plus OS dependency install',()=>{
 assert.match(workflow,/if ! python -m playwright install --with-deps chromium; then/);
 assert.match(workflow,/sudo apt-get update -o Acquire::Retries=2/);
 assert.equal((workflow.match(/python -m playwright install --with-deps chromium/g)||[]).length,2);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
test('R190 constrained mirror fallback fails closed if Azure mirror is absent',()=>{
 assert.match(workflow,/mirror_file=\/etc\/apt\/sources\.list\.d\/ubuntu\.sources/);
 assert.match(workflow,/if ! grep -q 'azure\.archive\.ubuntu\.com' "\$mirror_file"; then/);
 assert.match(workflow,/sudo sed -i 's#azure\.archive\.ubuntu\.com#archive\.ubuntu\.com#g' "\$mirror_file"/);
 assert.match(workflow,/exit 1/);
});
test('R190 leaves the full actual UI, visual, offline and accessibility suite required',()=>{
 for(const name of ['built_app_qa.py','visual_review.py','cloud_owner_qa.py','pwa_offline_qa.py','issue26_accessibility_qa.py','admin_records_qa.py']){
  assert.ok(workflow.includes(name),name+' must not be skipped or deleted');
 }
 assert.match(workflow,/if: steps\.scope\.outputs\.browser_mode != 'none'/);
});
