import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yml=readFileSync(new URL('../.github/workflows/dic-single-use-release.yml',import.meta.url),'utf8');

// A commented-out YAML control must never satisfy an executable release-policy assertion.
const activeYaml=(source)=>source.split(/\r?\n/).map(line=>/^\s*#/.test(line)?'':line.replace(/\s+#.*$/,'')).join('\n');
function assertExclusiveTrigger(content){
 assert.match(content,/^\s{2}workflow_dispatch:\s*$/m);
 assert.doesNotMatch(content,/^\s{2}(?:push|pull_request|schedule):/m);
 assert.match(content,/^\s{2}cancel-in-progress: false\s*$/m);
 assert.match(content,/^\s{2}group: dic-exclusive-one-use-production-publish\s*$/m);
}
function assertBoundRelease(content){
 assert.match(content,/INPUT_RELEASE_ID:.*inputs\.release_id/);
 assert.match(content,/INPUT_TESTED_SOURCE_SHA:.*inputs\.tested_source_sha/);
 assert.match(content,/INPUT_RELEASE_EVIDENCE_JSON:.*inputs\.release_evidence_json/);
 assert.match(content,/release_evidence_json:[\s\S]*?required: true/);
 assert.match(content,/DIC_PRIVATE_BRANCH_PROTECTION_VERIFIED/);
 assert.match(content,/DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED/);
 assert.match(content,/DIC_RELEASE_CONTROLLER_VERIFIED/);
 assert.match(content,/controlled-release-runner\.mjs/);
 assert.doesNotMatch(content,/netlify deploy|NETLIFY_AUTH_TOKEN|curl.*build_hooks/);
}
test('atomic production controller cannot execute from push or schedule',()=>assertExclusiveTrigger(activeYaml(yml)));
test('production workflow uses exact owner ID and source SHA, not raw Netlify build hook',()=>assertBoundRelease(activeYaml(yml)));
test('comment-only policy strings cannot spoof release acceptance',()=>{
 const comments=yml.split(/\r?\n/).map(line=>'# '+line).join('\n');
 assert.throws(()=>assertExclusiveTrigger(activeYaml(comments)),/workflow_dispatch/);
 assert.throws(()=>assertBoundRelease(activeYaml(comments)),/INPUT_RELEASE_ID/);
});
