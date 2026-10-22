import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planFastLane,changedPaths} from '../scripts/audit/change-impact.mjs';
import {createReleaseDossier,stageDurations} from '../scripts/audit/release-dossier.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('fastlane classifies narrowly, fails closed on unknown changes',()=>{
 assert.equal(planFastLane(['docs/README.md']).mode,'docs');
 assert.equal(planFastLane(['site/admin/records.js','docs/CURRENT_STATUS.md']).mode,'targeted');
 assert.equal(planFastLane(['supabase/migrations/any.sql']).mode,'full');
 assert.equal(planFastLane(['scripts/release/controlled-release-runner.mjs']).mode,'full');
 assert.equal(planFastLane([]).mode,'full');
 assert.throws(()=>planFastLane(['../secrets']),/Invalid/);
 assert.equal(changedPaths('invalid','bad'),null);
});
test('full Node/lint/build remain mandatory on exact SHA and browser suites are divided without omission',()=>{
 const build=read('.github/workflows/cloud-beta-ci.yml'),mobile=read('.github/workflows/cloud-regression.yml'),visual=read('.github/workflows/visual-review.yml');
 assert.match(build,/name: DIC cloud app build and tests/);
 assert.match(build,/run: npm test/);
 assert.match(build,/run: npm run lint/);
 assert.match(build,/run: npm run build:cloud/);
 assert.match(build,/node-version: '18.20.8'/);
 assert.match(build,/test ! -e dist\/docs/);
 assert.match(mobile,/name: DIC cloud UX regression checks/);
 assert.match(mobile,/run: python tests\/browser\/cloud_owner_qa.py/);
 assert.match(mobile,/run: python tests\/browser\/admin_invitation_qa.py/);
 assert.match(visual,/name: DIC private visual review/);
 assert.match(visual,/run: python tests\/browser\/pwa_offline_qa.py/);
 assert.match(visual,/run: python tests\/browser\/visual_review.py/);
 assert.match(visual,/scripts\/audit\/site-integrity.mjs --dist/);
 assert.doesNotMatch(mobile,/run: npm test/);
 assert.doesNotMatch(visual,/run: npm test/);
});
test('release dossier always declares read-only provenance and rejects missing inputs',()=>{
 const sha='a'.repeat(40),other='b'.repeat(40);
 assert.throws(()=>createReleaseDossier({}),/Exact/);
 const packet=createReleaseDossier({source_sha:sha,checks:[{name:'DIC cloud app build and tests',head_sha:other,status:'completed',conclusion:'success'}],sql_changed:true});
 assert.equal(packet.mode,'READ_ONLY_PREVIEW');
 assert.equal(packet.review_state,'BLOCKED');
 assert.ok(packet.gate_errors.some(e=>e.includes('SQL')));
 assert.ok(packet.gate_errors.some(e=>e.includes('backup')));
});
test('dossier positive simulated evidence is only prepared for independent release controller check',()=>{
 const sha='a'.repeat(40),checks=['DIC cloud app build and tests','DIC cloud UX regression checks','DIC private visual review','DIC approval, implementation and continuity contract'].map((name,i)=>({name,head_sha:sha,status:'completed',conclusion:'success',run_id:i+1}));
 const packet=createReleaseDossier({source_sha:sha,current_release_sha:'b'.repeat(40),checks,backup:{artifact_id:123,verified_offsite:true,snapshot_started_at_utc:'2026-10-21T12:00:00Z',latest_observed_data_write_at_utc:'2026-10-21T11:00:00Z'},credit:{observed_remaining:25,observed_at_utc:'2026-10-21T12:00:00Z'},owner_approval:{status:'UNCONSUMED',tested_source_sha:sha,unique_release_id:'DIC-20261021-TESTED'}});
 assert.equal(packet.review_state,'PREPARED_FOR_INDEPENDENT_RELEASE_CONTROLLER_CHECK');
 assert.match(packet.disclaimer,/rechecked/);
});
test('stage time measurement separates human approval wait and rejects inversions',()=>{
 const m=stageDurations({requested_at:'2026-10-21T00:00:00Z',tested_at:'2026-10-21T00:20:00Z',approved_at:'2026-10-21T01:00:00Z',published_at:'2026-10-21T01:05:00Z',verified_at:'2026-10-21T01:10:00Z'});
 assert.equal(m.full_elapsed_minutes,70);
 assert.equal(m.processing_excluding_approval_wait_minutes,30);
 assert.throws(()=>stageDurations({requested_at:'2026-10-21T01:00:00Z'}),/Complete/);
});
