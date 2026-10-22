import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yml=readFileSync(new URL('../.github/workflows/dic-single-use-release.yml',import.meta.url),'utf8');
test('atomic production controller cannot execute from push or schedule',()=>{
 assert.match(yml,/workflow_dispatch:/);
 assert.doesNotMatch(yml,/\n\s{2}(?:push|pull_request|schedule):/);
 assert.match(yml,/cancel-in-progress: false/);
 assert.match(yml,/dic-exclusive-one-use-production-publish/);
});
test('production workflow uses exact owner ID and source SHA, not raw Netlify build hook',()=>{
 assert.match(yml,/INPUT_RELEASE_ID:.*inputs\.release_id/);
 assert.match(yml,/INPUT_TESTED_SOURCE_SHA:.*inputs\.tested_source_sha/);
 assert.match(yml,/INPUT_RELEASE_EVIDENCE_JSON:.*inputs\.release_evidence_json/);
 assert.match(yml,/release_evidence_json:[\s\S]*?required: true/);
 assert.match(yml,/DIC_PRIVATE_BRANCH_PROTECTION_VERIFIED/);
 assert.match(yml,/DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED/);
 assert.match(yml,/DIC_RELEASE_CONTROLLER_VERIFIED/);
 assert.match(yml,/controlled-release-runner\.mjs/);
 assert.doesNotMatch(yml,/netlify deploy|NETLIFY_AUTH_TOKEN|curl.*build_hooks/);
});
