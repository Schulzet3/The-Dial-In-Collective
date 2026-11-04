import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/audit/live-postrelease-smoke.py',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/dic-live-postrelease-smoke.yml',import.meta.url),'utf8');
test('postrelease smoke cannot silently certify a historical pinned Netlify deploy',()=>{
 assert.doesNotMatch(source,/6adabcecd4a2a68e94cdc09a/);
 assert.match(source,/def audit_origins\(\):/);
 assert.match(source,/os\.environ\.get\("DIC_POSTRELEASE_DEPLOY_ID"/);
 assert.match(source,/re\.fullmatch\(r"\[a-f0-9\]\{24\}"/);
 assert.match(source,/for origin in origins:/);
 assert.match(source,/UNVERIFIED: immutable deploy not tested/);
 assert.match(workflow,/workflow_dispatch:\n    inputs:\n      netlify_deploy_id:/);
 assert.match(workflow,/DIC_POSTRELEASE_DEPLOY_ID: \$\{\{ inputs\.netlify_deploy_id \}\}/);
});
