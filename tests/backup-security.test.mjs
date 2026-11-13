import {fileURLToPath} from 'node:url';
import * as childProcess from 'node:child_process';
import * as validation from '../scripts/backups/validate-db-target.mjs';
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
  assert.match(sh,/age --encrypt "\$\{AGE_RECIPIENT_ARGS\[@\]\}"/);
    assert.match(sh,/AGE_RECIPIENT_ARGS=\(--recipient "\$BACKUP_AGE_RECIPIENT"\)/);
    assert.match(sh,/AGE_RECIPIENT_ARGS\+=\(--recipient "\$BACKUP_AGE_SECOND_RECIPIENT"\)/);
    assert.match(yml,/secrets.DIC_ARCHIVE_AGE_IDENTITY/);
    assert.match(yml,/bash scripts\/backups\/derive-recovery-recipient\.sh "\$identity_file"/);
    assert.match(yml,/if \[\[ "\$recipient" == "\$BACKUP_AGE_RECIPIENT" \]\]/);
    assert.doesNotMatch(yml,/^\s+BACKUP_AGE_SECOND_RECIPIENT:\s*\$\{\{\s*secrets\./m);
    assert.doesNotMatch(yml,/- scripts\/backups\/create-nightly-encrypted-dump\.sh/);
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


const approvedRef = 'azviqqejypsefzilgonr';
const directUri = 'postgresql://postgres:synthetic-password@db.' + approvedRef + '.supabase.co:5432/postgres?sslmode=require';
const poolerUri = 'postgresql://postgres.' + approvedRef + ':synthetic-password@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=verify-full';

test('database target parser accepts only Supabase direct or session/transaction pooler identities', () => {
  const {isApprovedSupabaseDatabaseUrl: validate} = validation;
  assert.equal(validate(directUri, approvedRef), true);
  assert.equal(validate(poolerUri, approvedRef), true);
  assert.equal(validate(poolerUri.replace(':6543/', ':5432/'), approvedRef), true);
  assert.equal(validate(directUri.replace('postgresql:', 'postgres:'), approvedRef), true);
  assert.equal(validate(directUri.replace('postgresql:', 'http:'), approvedRef), false);
  assert.equal(validate(directUri.replace(':5432/', ':6543/'), approvedRef), false);
  assert.equal(validate(poolerUri.replace(':6543/', ':7777/'), approvedRef), false);
});

test('database target parser rejects wrong hosts, misleading project strings and libpq URI redirects', () => {
  const {isApprovedSupabaseDatabaseUrl: validate} = validation;
  const invalid = [
    'postgresql://' + approvedRef + ':pwd@attacker.example.com/postgres',
    directUri.replace('.supabase.co:5432', '.supabase.co.attacker.example:5432'),
    poolerUri.replace('.pooler.supabase.com', '.pooler.supabase.com.attacker.example'),
    poolerUri.replace('postgres.' + approvedRef, 'postgres.wrongproject1234567'),
    directUri.replace('postgres:synthetic-password', 'postgres.' + approvedRef + ':synthetic-password'),
    directUri + '&host=attacker.example',
    directUri + '&hostaddr=127.0.0.1',
    directUri + '&host%61ddr=127.0.0.1',
    directUri + '&service=malicious',
    directUri + '&user=postgres.someotherproject',
    directUri + '&sslmode=disable',
    directUri.replace('sslmode=require', 'sslmode=prefer'),
    directUri + '#fragment',
    directUri.replace('/postgres?', '/otherdb?'),
    directUri.replace(':synthetic-password@', ':@'),
  ];
  for (const uri of invalid) {
    assert.equal(validate(uri, approvedRef), false, 'must reject one adversarial URI');
  }
  assert.equal(validate(directUri, 'wrongproject1234567'), false);
  assert.equal(validate(directUri, ''), false);
});

test('backup and isolated recovery both fail closed before Docker, without exposing secret URL', () => {
  const backup = readFileSync(new URL('../scripts/backups/create-nightly-encrypted-dump.sh', import.meta.url), 'utf8');
  const restore = readFileSync(new URL('../scripts/backups/isolated-recovery-drill.sh', import.meta.url), 'utf8');
  const invoke = 'node "$SCRIPT_DIR/validate-db-target.mjs"';
  assert.ok(backup.indexOf(invoke) >= 0 && backup.indexOf(invoke) < backup.indexOf('docker run'));
  assert.ok(restore.indexOf(invoke) >= 0 && restore.indexOf(invoke) < restore.indexOf('docker run'));
  assert.doesNotMatch(backup + restore, /SUPABASE_DB_URL.*\*"\$SUPABASE_PROJECT_REF"/);
  const {spawnSync} = childProcess;
  const file = new URL('../scripts/backups/validate-db-target.mjs', import.meta.url);
  const secret = 'must-not-appear-in-logs';
  const result = spawnSync(process.execPath, [fileURLToPath(file)], {
    encoding: 'utf8',
    env: {...process.env, SUPABASE_PROJECT_REF: approvedRef,
      SUPABASE_DB_URL: 'postgresql://' + approvedRef + ':' + secret + '@attacker.example.com/postgres'},
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret + '|' + approvedRef));
});
