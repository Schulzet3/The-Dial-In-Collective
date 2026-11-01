import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameDayScheduledRun, findCompletedBackup, decideScheduledBackup } from '../scripts/backups/scheduled-backup-guard.mjs';

const now = new Date('2026-11-02T14:20:00Z');
const env = { GITHUB_EVENT_NAME: 'schedule', GITHUB_REPOSITORY: 'Schulzet3/The-Dial-In-Collective', GH_TOKEN: 'test-only', GITHUB_RUN_ID: '1003' };
const run = (overrides = {}) => ({ id: 1002, event: 'schedule', head_branch: 'main', conclusion: 'success', created_at: '2026-11-02T14:10:00Z', ...overrides });
const ciphertext = (id = 1002) => ({ name: `dic-encrypted-nightly-${id}`, id: 9002, size_in_bytes: 500, expired: false });
function api({ runs = [run()], artifacts = [ciphertext()], runCode = 200, artifactCode = 200, total = runs.length } = {}) {
  const calls = [];
  async function fetcher(url, { headers }) {
    calls.push(url);
    assert.match(headers.Authorization, /^Bearer /);
    const isRuns = url.includes('/workflows/');
    return {
      ok: (isRuns ? runCode : artifactCode) === 200,
      status: isRuns ? runCode : artifactCode,
      json: async () => isRuns ? { total_count: total, workflow_runs: runs } : { total_count: artifacts.length, artifacts },
    };
  }
  return { fetcher, calls };
}

test('only a successful schedule on main in the current UTC 08:00+ window qualifies', () => {
  assert.equal(sameDayScheduledRun(run(), '2026-11-02', 1003), true);
  for (const change of [{ event: 'push' }, { head_branch: 'release/production' }, { conclusion: 'failure' }, { id: 1003 }, { created_at: '2026-11-01T23:40:00Z' }, { created_at: '2026-11-02T07:59:59Z' }]) {
    assert.equal(sameDayScheduledRun(run(change), '2026-11-02', 1003), false);
  }
});
test('an existing successful scheduled ciphertext artifact skips a duplicate', async () => {
  const mock = api();
  const decision = await decideScheduledBackup(env, { now, fetcher: mock.fetcher });
  assert.equal(decision.runBackup, false);
  assert.equal(mock.calls.length, 2);
  assert.ok(mock.calls[0].includes('created=2026-11-02T08%3A00%3A00Z'));
});
test('empty successful fallback has no artifact and cannot suppress a real backup', async () => {
  const mock = api({ artifacts: [] });
  assert.equal((await decideScheduledBackup(env, { now, fetcher: mock.fetcher })).runBackup, true);
});
test('expired, empty, or wrongly named archive never suppresses a backup', async () => {
  for (const artifacts of [[{ ...ciphertext(), expired: true }], [{ ...ciphertext(), size_in_bytes: 0 }], [ciphertext(988)]]) {
    assert.equal((await decideScheduledBackup(env, { now, fetcher: api({ artifacts }).fetcher })).runBackup, true);
  }
});
test('a previous scheduled failed run does not suppress a fresh try', async () => {
  const mock = api({ runs: [run({ conclusion: 'failure' })] });
  assert.equal((await findCompletedBackup({ repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN, currentRunId: env.GITHUB_RUN_ID, now, fetcher: mock.fetcher })), null);
  assert.equal(mock.calls.length, 1);
});
test('push/manual always preserve the original backup regardless of API state', async () => {
  for (const trigger of ['push', 'workflow_dispatch']) {
    const decision = await decideScheduledBackup({ ...env, GITHUB_EVENT_NAME: trigger }, { now, fetcher: () => { throw new Error('Should not query GitHub'); } });
    assert.equal(decision.runBackup, true);
  }
});
test('API outage, absent token, and incomplete listing fail open to preserve backup availability', async () => {
  for (const config of [{ runCode: 403 }, { artifactCode: 500 }, { total: 101 }]) {
    const mock = api(config);
    assert.equal((await decideScheduledBackup(env, { now, fetcher: mock.fetcher })).runBackup, true);
  }
  assert.equal((await decideScheduledBackup({ ...env, GH_TOKEN: '' }, { now })).runBackup, true);
});
test('a later backup succeeds if an earlier successful fallback had no ciphertext but another run did', async () => {
  const mock = api({ runs: [run({ id: 1001 }), run({ id: 1002 })], artifacts: [ciphertext(1002)] });
  const result = await findCompletedBackup({ repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN, currentRunId: env.GITHUB_RUN_ID, now, fetcher: mock.fetcher });
  assert.equal(result?.runId, 1002);
});
