import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const script=join(root,'scripts/backups/restore-saved-age-archive.sh');
const workflow=join(root,'.github/workflows/verified-drive-archive-restore.yml');
const source=readFileSync(script,'utf8');
const yml=readFileSync(workflow,'utf8');

test('restoring saved ciphertext requires original scheduled source, weekly schedule or manual Drive-digest dispatch',()=>{
  assert.match(yml,/^on:\n(?:.|\n)*?  schedule:\n    - cron: '17 13 \* \* 2'/m);
  assert.match(yml,/^  workflow_dispatch:/m);
  assert.match(yml,/select-archived-restore-source\.mjs/);
  assert.match(yml,/independent-drive-nov1-2026/);
  assert.match(yml,/github-artifact-only/);
  assert.doesNotMatch(yml,/^  (push|pull_request):/m);
  assert.match(yml,/verified_drive_zip_sha256:/);
  assert.match(yml,/get\('digest'\)!='sha256:'\+expected/);
  assert.match(yml,/run\.get\('event'\)!='schedule'/);
  assert.match(yml,/run\.get\('head_branch'\)!='main'/);
  assert.match(yml,/\.github\/workflows\/nightly-backup\.yml/);
  assert.match(yml,/gh run download/);
});

test('recovery identity stays in a managed secret; no live DB, networked target or plaintext artifact upload',()=>{
  assert.match(yml,/secrets\.DIC_ARCHIVE_AGE_IDENTITY/);
  assert.doesNotMatch(yml,/SUPABASE_DB_URL|BACKUP_AGE_RECIPIENT|actions\/upload-artifact/);
  assert.match(source,/--network none/);
  assert.doesNotMatch(source,/SUPABASE_DB_URL|postgresql:\/\/|supabase\.co/);
  assert.match(source,/trap cleanup EXIT/);
  assert.match(source,/rm -rf -- "\$root"/);
  assert.match(source,/age --decrypt -i/);
  assert.match(source,/derive-recovery-recipient\.sh/);
  assert.match(source,/--exit-on-error/);
  assert.match(source,/not restored/);
});

test('unprovisioned secret fails BLOCKED before any decrypt or Docker operation',()=>{
  const t=mkdtempSync(join(tmpdir(),'dic-archive-negative-'));
  try{
    const archive=join(t,'backup.age');
    writeFileSync(archive,'age-encryption.org/v1\n'+'x'.repeat(200));
    const r=spawnSync('bash',[script,archive],{encoding:'utf8',
      env:{...process.env,DIC_ARCHIVE_AGE_IDENTITY:''}});
    assert.equal(r.status,2);
    assert.match(r.stdout+r.stderr,/BLOCKED: dedicated automation-only age identity/);
    assert.doesNotMatch(r.stdout+r.stderr,/BEGIN .*PRIVATE KEY|AGE-SECRET-KEY-/);
  }finally{rmSync(t,{recursive:true,force:true});}
});

test('archived-restore script passes bash static syntax',()=>{
  const r=spawnSync('bash',['-n',script],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
});
