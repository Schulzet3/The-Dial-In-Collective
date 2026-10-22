import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('backup encrypts before uploading and blocks unbacked Storage objects', () => {
  const sh=readFileSync(new URL('../scripts/backups/create-nightly-encrypted-dump.sh', import.meta.url),'utf8');
  const yml=readFileSync(new URL('../.github/workflows/nightly-backup.yml', import.meta.url),'utf8');
  assert.match(sh,/pg_dump --dbname=/);
  assert.match(sh,/TABLE DATA auth users/);
  assert.match(sh,/storage.objects/);
  assert.match(sh,/if \[\[ "\$OBJECT_COUNT" != 0 \]\]/);
  assert.match(sh,/age --encrypt --recipient/);
  assert.match(sh,/ssh-ed25519/);
  assert.match(sh,/Expected an age X25519 or SSH Ed25519 public recipient/);
  assert.match(yml,/secrets.SUPABASE_DB_URL/);
  assert.match(yml,/vars.BACKUP_AGE_RECIPIENT/);
  assert.match(yml,/upload-artifact@v7/);
  assert.match(yml,/checkout@v7/);
  assert.match(sh,/PGSSLMODE=require/);
  assert.match(sh,/app-source\.tar\.gz/);
  assert.match(sh,/app_source_sha256/);
  assert.match(yml,/ref: [a-f0-9]{40}\s/);
  assert.doesNotMatch(yml,/ref: (?:development\/backend-foundation|release\/production|main)\s/);
  assert.match(yml,/branches:\s*- main\s/);
  assert.match(yml,/retention-days: 30\s/);
  assert.match(yml,/path: backup-app-source/);
  assert.match(yml,/encrypted\/backup\.age/);
  assert.doesNotMatch(yml,/plain\/database.dump/);
});

test('backup records snapshot start before export and preserves encrypted aggregate inventory', () => {
  const sh=readFileSync(new URL('../scripts/backups/create-nightly-encrypted-dump.sh', import.meta.url),'utf8');
  const start=sh.indexOf('SNAPSHOT_STARTED_AT_UTC="$(date -u');
  const dump=sh.indexOf('pg_dump --dbname=');
  assert.ok(start>=0&&start<dump,'snapshot lower bound must be captured before export');
  assert.match(sh,/DIC_BACKUP_SNAPSHOT_STARTED_AT_UTC=\$SNAPSHOT_STARTED_AT_UTC/);
  assert.match(sh,/"snapshot_started_at_utc":"\$SNAPSHOT_STARTED_AT_UTC"/);
  assert.match(sh,/"observed_after_export":/);
  assert.match(sh,/observed-counts\.txt app-source\.tar\.gz/);
  assert.match(sh,/tar -tzf "\$OUT\/bundle\.tar\.gz"/);
});

test('recovery definition mirrors main-only scheduled operations and disconnected restore', () => {
  const sh=readFileSync(new URL('../scripts/backups/isolated-recovery-drill.sh', import.meta.url),'utf8');
  const yml=readFileSync(new URL('../.github/workflows/database-recovery-drill.yml', import.meta.url),'utf8');
  assert.match(yml,/branches:\s*- main\s/);
  assert.match(yml,/cron: '43 10 \* \* 0'/);
  assert.match(yml,/group: dic-weekly-isolated-restore/);
  assert.match(yml,/cancel-in-progress: false/);
  assert.match(sh,/--network none/);
  assert.match(sh,/RESTORED_VERIFIED_COFFEES/);
  assert.doesNotMatch(yml,/contents: write/);
});
