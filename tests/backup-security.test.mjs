import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('staged backup encrypts before uploading and blocks unbacked Storage objects', () => {
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
  assert.match(yml,/ref: development\/backend-foundation/);
  assert.match(yml,/path: backup-app-source/);
  assert.match(yml,/encrypted\/backup\.age/);
  assert.doesNotMatch(yml,/plain\/database.dump/);
});
