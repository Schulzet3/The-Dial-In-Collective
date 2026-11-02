import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseScheduledArchive} from '../scripts/backups/select-archived-restore-source.mjs';

const NOW=Date.parse('2026-11-03T13:17:00Z');
const run=(id,when='2026-11-02T15:00:00Z',override={})=>({
  id,event:'schedule',status:'completed',conclusion:'success',
  head_branch:'main',path:'.github/workflows/nightly-backup.yml',
  created_at:when,...override
});
const art=(id,override={})=>({
  total_count:1,artifacts:[{
    id:1111,name:'dic-encrypted-nightly-'+id,expired:false,
    size_in_bytes:5940899,digest:'sha256:'+'a'.repeat(64),...override
  }]
});
test('chooses newest valid scheduled ciphertext with exact artifact digest',async()=>{
  const got=await chooseScheduledArchive([run(12345678),run(87654321,'2026-11-01T14:36:56Z')],
    async id=>art(id),NOW);
  assert.deepEqual(got,{sourceRunId:'12345678',artifactId:1111,artifactSha256:'a'.repeat(64)});
});
test('rejects manual/PR runs, unready jobs, wrong branches and stale runs',async()=>{
  const disallowed=[
    run(12345671,undefined,{event:'workflow_dispatch'}),
    run(12345672,undefined,{head_branch:'development/backend-foundation'}),
    run(12345673,undefined,{conclusion:'failure'}),
    run(12345674,undefined,{path:'.github/workflows/other.yml'}),
    run(12345675,'2026-10-01T00:00:00Z')
  ];
  await assert.rejects(chooseScheduledArchive(disallowed,async id=>art(id),NOW),/BLOCKED/);
});
test('rejects invalid digest, duplicate, expired and mismatched artifact names',async()=>{
  const choices=[run(12345671),run(12345672),run(12345673),run(12345674)];
  const map={
    12345671:art(12345671,{digest:'not-a-digest'}),
    12345672:art(12345672,{expired:true}),
    12345673:art(12345673,{name:'dic-encrypted-nightly-evil'}),
    12345674:{...art(12345674),total_count:2,
      artifacts:[...art(12345674).artifacts,...art(12345674).artifacts]}
  };
  await assert.rejects(chooseScheduledArchive(choices,async id=>map[id],NOW),/BLOCKED/);
});
test('skips newest unusable artifact for next verified scheduled backup',async()=>{
  const got=await chooseScheduledArchive([run(12345678),run(12345679,'2026-11-01T14:36:56Z')],
    async id=>id===12345678?art(id,{expired:true}):art(id),NOW);
  assert.equal(got.sourceRunId,'12345679');
});
test('never looks up artifacts from out-of-horizon source runs',async()=>{
  let queried=0;
  await assert.rejects(chooseScheduledArchive([run(12345679,'2026-10-01T10:00:00Z')],
    async()=>{queried++;return art(12345679);},NOW),/BLOCKED/);
  assert.equal(queried,0);
});
