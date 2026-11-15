import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/dic-drive-oauth-smoke.yml',import.meta.url),'utf8');
test('owner does not have to manually dispatch GitHub runner Drive OAuth proof',()=>{
  assert.match(workflow,/name: DIC Drive OAuth courier \(owner-requested disposable proof\)/);
  assert.match(workflow,/on:\s*\n\s+push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(workflow,/paths:\s*\n\s+- docs\/DIC_DRIVE_OAUTH_SMOKE_REQUEST\.json/);
  assert.doesNotMatch(workflow,/workflow_dispatch:|schedule:/);
  assert.match(workflow,/github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/node scripts\/backups\/drive-oauth-smoke\.mjs/);
  assert.doesNotMatch(workflow,/create-nightly-encrypted-dump|nightly-backup\.yml|SUPABASE_DB_URL|DIC_ARCHIVE_AGE_IDENTITY/);
  for(const secret of ['DIC_DRIVE_CLIENT_ID','DIC_DRIVE_CLIENT_SECRET','DIC_DRIVE_REFRESH_TOKEN'])
    assert.match(workflow,new RegExp('secrets\\.'+secret));
});
