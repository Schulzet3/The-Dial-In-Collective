// Fail open on GitHub API uncertainty: a second encrypted snapshot is safer than a missed backup.
// This guard ONLY deduplicates scheduled UTC-day backups. Push/manual recovery stays unchanged.
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const WORKFLOW = 'nightly-backup.yml';

export function sameDayScheduledRun(run, date, currentRunId) {
  return run && run.event === 'schedule' && run.head_branch === 'main' &&
    run.conclusion === 'success' && String(run.id) !== String(currentRunId) &&
    typeof run.created_at === 'string' && run.created_at >= `${date}T08:00:00Z` &&
    run.created_at <= `${date}T23:59:59Z`;
}

export async function findCompletedBackup({ repository, token, currentRunId, now = new Date(), fetcher = fetch }) {
  if (!/^[-\w]+\/[-\w.]+$/.test(repository) || !token || !/^\d+$/.test(String(currentRunId))) {
    throw new Error('Missing or invalid GitHub schedule-guard inputs');
  }
  const date = now.toISOString().slice(0, 10);
  const search = new URLSearchParams({
    event: 'schedule', branch: 'main', status: 'success',
    created: `${date}T08:00:00Z..${date}T23:59:59Z`, per_page: '100',
  });
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  async function githubJson(path) {
    const response = await fetcher(`https://api.github.com/repos/${repository}/${path}`, { headers });
    if (!response.ok) throw new Error(`GitHub schedule-guard API returned HTTP ${response.status}`);
    return response.json();
  }
  const listing = await githubJson(`actions/workflows/${WORKFLOW}/runs?${search}`);
  if (!Array.isArray(listing.workflow_runs) || listing.total_count > 100) {
    throw new Error('GitHub backup run listing was incomplete');
  }
  for (const run of listing.workflow_runs) {
    if (!sameDayScheduledRun(run, date, currentRunId)) continue;
    // A skipped fallback has conclusion=success but NO ciphertext artifact.
    // Never let such an empty success suppress the next backup attempt.
    const artifactListing = await githubJson(`actions/runs/${run.id}/artifacts?per_page=100`);
    if (!Array.isArray(artifactListing.artifacts) || artifactListing.total_count > 100) {
      throw new Error('GitHub backup artifact listing was incomplete');
    }
    const artifact = artifactListing.artifacts.find(a => a.name === `dic-encrypted-nightly-${run.id}` && a.expired === false && a.size_in_bytes > 0);
    if (artifact) return { runId: run.id, artifactId: artifact.id, date };
  }
  return null;
}

export async function decideScheduledBackup(env, { fetcher = fetch, now = new Date() } = {}) {
  if (env.GITHUB_EVENT_NAME !== 'schedule') return { runBackup: true, reason: 'Non-scheduled trigger preserved' };
  try {
    const existing = await findCompletedBackup({
      repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN,
      currentRunId: env.GITHUB_RUN_ID, now, fetcher,
    });
    if (existing) return { runBackup: false, reason: `Already encrypted successfully today: run ${existing.runId}, artifact ${existing.artifactId}` };
    return { runBackup: true, reason: 'No completed scheduled ciphertext artifact in this UTC backup window' };
  } catch (error) {
    return { runBackup: true, reason: `Cannot prove a prior completed backup; fail open (${error.message})` };
  }
}

export async function main() {
  const decision = await decideScheduledBackup(process.env);
  console.log(`DIC backup guard: ${decision.reason}`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `run_backup=${decision.runBackup}\n`, 'utf8');
  }
  if (!decision.runBackup) console.log('Backup safely skipped; the earlier verified ciphertext artifact remains available.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
