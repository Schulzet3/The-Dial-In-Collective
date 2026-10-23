import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/weekly-full-regression.yml',import.meta.url),'utf8');
function check(source){
 const jobs=Object.fromEntries([...source.matchAll(/^  ([a-z][a-z-]+):\n([\s\S]*?)(?=^  [a-z][a-z-]+:|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]));
 assert.ok(jobs['resolve-source'],'source resolution job missing');
 assert.match(jobs['resolve-source'],/sha: \$\{\{ steps\.source\.outputs\.sha \}\}/);
 assert.match(jobs['resolve-source'],/id: source/);
 assert.match(jobs['resolve-source'],/git rev-parse HEAD/);
 assert.match(jobs['resolve-source'],/GITHUB_OUTPUT/);
 assert.equal((source.match(/ref: development\/backend-foundation/g)||[]).length,1,'moving branch must be resolved only once');
 for(const name of ['node-build','database','mobile-offline']){
  assert.ok(jobs[name],name+' job missing');
  assert.match(jobs[name],/^    needs: resolve-source$/m,name+' dependency missing');
  assert.match(jobs[name],/ref: \$\{\{ needs\.resolve-source\.outputs\.sha \}\}/,name+' not pinned');
 }
 assert.equal((source.match(/persist-credentials: false/g)||[]).length,4);
 assert.match(source,/cron: '0 8 \* \* 0'/);
 assert.match(source,/permissions:\n  contents: read\n/);
 assert.doesNotMatch(source,/\bwrite\b|secrets\.|^  push:|^  pull_request:/m);
 for(const command of ['npm test','npm run lint','npm run build:cloud','isolated-sql-regression.sh','isolated-signed-http-regression.sh','isolated-backup-snapshot-regression.sh','cloud_owner_qa.py','admin_invitation_qa.py','pwa_offline_qa.py'])assert.ok(source.includes(command),'lost regression '+command);
}
test('weekly suites share one immutable source and retain schedule/read-only boundaries',()=>check(workflow));
test('one independently resolved moving branch fails',()=>assert.throws(()=>check(workflow.replace('ref: ${{ needs.resolve-source.outputs.sha }}','ref: development/backend-foundation')),/moving branch/));
test('missing source dependency fails',()=>assert.throws(()=>check(workflow.replace('    needs: resolve-source\n','')),/dependency missing/));
test('broken source output binding fails',()=>assert.throws(()=>check(workflow.replace('steps.source.outputs.sha','steps.wrong.outputs.sha'))));
test('permission escalation fails',()=>assert.throws(()=>check(workflow.replace('contents: read','contents: write'))));
test('lost offline coverage fails',()=>assert.throws(()=>check(workflow.replace('pwa_offline_qa.py','removed.py')),/lost regression/));
