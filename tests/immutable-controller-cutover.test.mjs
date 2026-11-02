import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gitConnectedReleaseClaimMessage} from '../scripts/release/controlled-release-runner.mjs';
test('one explicit Git-connected publisher and no activated artifact uploader',()=>{
 const src=readFileSync(new URL('../scripts/release/controlled-release-runner.mjs',import.meta.url),'utf8');
 const queue=src.indexOf('const queueGate=assessReleaseQueue');
 const scope=src.indexOf('assertApprovedReadyBatch(grant,queueGate)');
 const claim=src.indexOf('const planned=planSingleUseClaim');
 const push=src.indexOf("git(['push','--porcelain'");
 assert.ok(queue>0&&scope>queue&&claim>scope&&push>claim);
 assert.doesNotMatch(src,/retrieveVerifiedReleaseBundle|Immutable deployment HOLD|netlify deploy --prod/);
 const {subject,body}=gitConnectedReleaseClaimMessage({id:'DIC-20261102-SIMPLE01',sourceSha:'a'.repeat(40)});
 assert.match(subject,/^Release DIC: DIC-20261102-SIMPLE01 \[dic-publish\]$/);
 assert.doesNotMatch(body,/\[skip netlify\]/);
 assert.match(body,/Single owner-approved Git-connected production build/);
 assert.match(src,/GIT_CONNECTED_BUILD_PENDING_NETLIFY_PROVIDER_READBACK/);
});
