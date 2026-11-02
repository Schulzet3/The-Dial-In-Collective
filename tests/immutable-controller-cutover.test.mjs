import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gitConnectedReleaseClaimMessage} from '../scripts/release/controlled-release-runner.mjs';
import {decide} from '../scripts/netlify/should-ignore-build.mjs';
test('one gated Git publisher, no unapproved or duplicate builds',()=>{
 const src=readFileSync(new URL('../scripts/release/controlled-release-runner.mjs',import.meta.url),'utf8');
 const queue=src.indexOf('const queueGate=assessReleaseQueue');
 const scope=src.indexOf('assertApprovedReadyBatch(grant,queueGate)');
 const claim=src.indexOf('const planned=planSingleUseClaim');
 const push=src.indexOf("git(['push','--porcelain'");
 assert.ok(queue>0&&scope>queue&&claim>scope&&push>claim);
 assert.doesNotMatch(src,/retrieveVerifiedReleaseBundle|Immutable deployment HOLD|netlify deploy --prod/);
 const {subject,body}=gitConnectedReleaseClaimMessage({id:'DIC-20261102-SIMPLE01',sourceSha:'a'.repeat(40)});
 assert.doesNotMatch(body,/\[skip netlify\]/);
 assert.equal(decide({context:'production',branch:'release/production',subject,commitMessage:subject+'\n'+body}).ignore,false);
 for(const args of [
  {context:'production',branch:'development/backend-foundation',subject},
  {context:'branch-deploy',branch:'release/production',subject},
  {context:'production',branch:'release/production',subject:'unapproved push'},
  {context:'production',branch:'release/production',subject,commitMessage:subject+'\n[skip netlify]'}
 ])assert.equal(decide(args).ignore,true);
 assert.match(src,/GIT_CONNECTED_BUILD_PENDING_NETLIFY_PROVIDER_READBACK/);
});
