import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('ordinary source, cron, PR and unrelated ops commits cannot trigger chat release',()=>{
 const file=load('.github/workflows/dic-chat-approved-release.yml');
 assert.match(file,/on:\n  push:\n    branches: \[main\]\n    paths:\n      - 'docs\/RELEASE_REQUEST\.json'/);
 assert.doesNotMatch(file,/\n\s{2}(?:workflow_dispatch|pull_request|schedule):/);
 assert.doesNotMatch(file,/netlify deploy|NETLIFY_AUTH_TOKEN|curl.*build_hooks/);
 assert.match(file,/dic-exclusive-one-use-production-publish/);
 assert.match(file,/cancel-in-progress: false/);
});
test('chat release enforces same single-use controller and truthful Free private flags',()=>{
 const file=load('.github/workflows/dic-chat-approved-release.yml');
 const manual=load('.github/workflows/dic-single-use-release.yml');
 const controller=load('scripts/release/controlled-release-runner.mjs');
 assert.match(file,/node scripts\/release\/controlled-release-runner\.mjs/);
 assert.match(file,/DIC_PRIVATE_FREE_COMPENSATING_MODE: 'YES'/);
 assert.match(file,/DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED/);
 assert.match(file,/DIC_RELEASE_CONTROLLER_VERIFIED/);
 assert.match(manual,/workflow_dispatch:/);
 assert.doesNotMatch(manual,/\n\s{2}(?:push|pull_request|schedule):/);
 assert.match(controller,/validateChatReleaseRequest/);
 assert.match(controller,/chatPush\?chatRequest\.release_id/);
 assert.match(controller,/chatPush\?chatRequest\.tested_source_sha/);
});
