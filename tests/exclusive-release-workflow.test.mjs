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
 const evidenceInput=content.match(/^ {6}release_evidence_json:[ \t]*\r?\n((?:^ {8}[^\r\n]*\r?\n)*)/m)?.[1]||'';
 assert.match(evidenceInput,/^ {8}required: true[ \t]*$/m);
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
test('evidence JSON required flag cannot borrow a later input requirement',()=>{
 const weakened=yml.replace(/(^ {6}release_evidence_json:[ \t]*\r?\n {8}description:[^\r\n]*\r?\n) {8}required: true/m,'$1        required: false')
  .replace(/^permissions:/m,'      unrelated_decoy:\n        required: true\npermissions:');
 assert.match(weakened,/release_evidence_json:[\s\S]*?required: false/);
 assert.match(weakened,/unrelated_decoy:[\s\S]*?required: true/);
 assert.throws(()=>assertBoundRelease(activeYaml(weakened)),/required: true/);
});
