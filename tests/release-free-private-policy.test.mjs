import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {decide} from '../scripts/netlify/should-ignore-build.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Netlify skips all development or preview branch production publish attempts',()=>{
 for(const branch of ['development/backend-foundation','main','work/visual-refresh-20261015']){
   assert.equal(decide({context:'production',branch,subject:'Release DIC: DIC-20261021-EXAMPLE6 [dic-publish]',
     }).ignore,true);
 }
 assert.equal(decide({context:'deploy-preview',branch:'release/production',
    subject:'Release DIC: DIC-20261021-EXAMPLE6 [dic-publish]'}).ignore,true);
});
test('Free/private owner policy is not replaced by paid-branch-protection instructions',async()=>{
 const [workflow,plan,coverage,fixture]=await Promise.all([
   read('.github/workflows/dic-single-use-release.yml'),
   read('docs/GITHUB_FREE_PRIVATE_CONTINUITY_AND_RELEASE_PLAN_2026-10-20.md'),
   read('docs/APPROVAL_COVERAGE_MATRIX.json'),
   read('supabase/tests/coffee_duplicate_first_auto_approval.sql')
 ]);
 assert.match(plan,/PRIVATE on GitHub Free/);
 assert.match(workflow,/Free\/private compensating controls/);
 assert.doesNotMatch(workflow,/after owner GitHub Pro\/branch/);
 assert.match(coverage,/release\/production/);
 assert.match(fixture,/identical reused product URL across a DIFFERENT harvest/);
});
