import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const y=readFileSync(new URL('../.github/workflows/dic-encrypted-drive-courier.yml',import.meta.url),'utf8');
test('only trusted successful main encrypted scheduled/manual runs trigger owner-private ciphertext courier',()=>{
  assert.match(y,/name: DIC encrypted GitHub-to-Drive offsite courier/);
  assert.match(y,/workflow_run:\\s*\\n\\s+workflows: \\['DIC encrypted database backup'\\]/);
  for(const x of ["github.event.workflow_run.conclusion == 'success'","github.event.workflow_run.status == 'completed'","github.event.workflow_run.head_branch == 'main'","github.event.workflow_run.head_repository.full_name == github.repository","github.event.workflow_run.event == 'schedule'","github.event.workflow_run.event == 'workflow_dispatch'"])assert.ok(y.includes(x),x);
  assert.match(y,/DIC_SOURCE_RUN_ID: \\$\\{\\{ github.event.workflow_run.id \\}\\}/);
  assert.match(y,/DIC_DRIVE_CUTOVER_UTC: '2026-11-15T20:23:00Z'/);
  assert.match(y,/DIC_DRIVE_FOLDER_ID: '1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf'/);
  assert.match(y,/run: node scripts\\/backups\\/drive-courier\\.mjs/);
});
test('no database export, plaintext write, second backup schedule, manual run trigger or extra permissions',()=>{
  assert.doesNotMatch(y,/^  (push|schedule|workflow_dispatch|pull_request):/m);
  assert.doesNotMatch(y,/SUPABASE_DB_URL|create-nightly-encrypted-dump|pg_dump|backup\.age.*decrypt|DIC_ARCHIVE_AGE_IDENTITY|github\.event\.workflow_run\.event == 'push'/);
  assert.match(y,/permissions:\\n  contents: read\\n  actions: read/);
  assert.doesNotMatch(y,/write:|actions: write|contents: write/);
  for(const key of ['DIC_DRIVE_CLIENT_ID','DIC_DRIVE_CLIENT_SECRET','DIC_DRIVE_REFRESH_TOKEN'])assert.ok(y.includes('secrets.'+key));
  assert.match(y,/node --test tests\\/drive-courier\\\*\\.test\\.mjs tests\\/verify-drive-oauth\\.test\\.mjs/);
});
