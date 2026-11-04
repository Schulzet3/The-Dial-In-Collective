import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/dic-post-release-readonly-smoke.yml',import.meta.url),'utf8');

test('post-release smoke cannot run on a nonproduction workflow_dispatch ref',()=>{
 assert.match(workflow,/^  public-smoke:\n\s+.*\n\s+if: github\.ref == 'refs\/heads\/release\/production'$/m);
 assert.match(workflow,/^  push:\n\s+branches: \[release\/production\]$/m);
});
test('read-only postflight checks out the immutable triggering release source',()=>{
 assert.match(workflow,/^\s+ref: \$\{\{ github\.sha \}\}$/m);
 assert.match(workflow,/^\s+persist-credentials: false$/m);
 assert.doesNotMatch(workflow,/ref:\s*development\/backend-foundation/);
 assert.match(workflow,/DIC_EXPECTED_RELEASE_SHA: \$\{\{ github\.sha \}\}/);
 assert.match(workflow,/node scripts\/release\/netlify-live-readback\.mjs/);
 assert.match(workflow,/node scripts\/release\/production-readonly-smoke\.mjs/);
 assert.doesNotMatch(workflow,/node scripts\/release\/(?:netlify-immutable-publish|netlify-digest-deploy|controlled-release-runner)\.mjs/);
});
