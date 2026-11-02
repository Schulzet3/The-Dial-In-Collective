import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/release/controlled-release-runner.mjs',import.meta.url),'utf8');
test('production release refuses unready or untracked deployable code before any claim or push',()=>{
 const queue=source.indexOf('const queuedSource=json');
 const isolated=source.indexOf('queueGate=validateReadyOnlyCandidate');
 const direct=source.indexOf('queueGate=assessReleaseQueue');
 const deny=source.indexOf('if(!queueGate.ready)throw Error');
 const claim=source.indexOf('const planned=planSingleUseClaim');
 assert.ok(queue>0&&isolated>queue&&direct>isolated&&deny>direct&&claim>deny,
  'both exact source gates must precede the single-use release claim');
 assert.match(source,/git\(\['show',sha\+':docs\/RELEASE_QUEUE\.json'\]\)/);
 assert.match(source,/git\(\['diff','--name-only','--no-renames',lastPublishedTestedSha,sha\]\)/);
 assert.match(source,/approved_ready_queue_items:queueGate\.ready_items/);
 assert.match(source,/formatQueueReport\(queueGate\)/);
});
