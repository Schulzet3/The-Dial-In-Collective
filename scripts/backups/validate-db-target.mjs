import { pathToFileURL } from 'node:url';

// Fail closed before connecting to, dumping, or restoring a live database.
// Never include the connection URL, password, or username in diagnostics.
export function isApprovedSupabaseDatabaseUrl(value, projectRef) {
  if (typeof value !== 'string' || typeof projectRef !== 'string' ||
      !/^[a-z0-9]{20}$/.test(projectRef)) return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.password || !url.username || url.hash || url.pathname !== '/postgres') return false;
  let username;
  try { username = decodeURIComponent(url.username); } catch { return false; }
  const host = url.hostname.toLowerCase();
  const direct = host === 'db.' + projectRef + '.supabase.co' &&
    username === 'postgres' && (!url.port || url.port === '5432');
  // Supabase session pooler: 5432; transaction pooler: 6543.
  const pooler = /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host) &&
    username === 'postgres.' + projectRef &&
    (!url.port || url.port === '5432' || url.port === '6543');
  if (!direct && !pooler) return false;
  // libpq URI query parameters can override authority host/user/TLS settings.
  const overrides = new Set(['host', 'hostaddr', 'service', 'servicefile',
    'user', 'password', 'dbname', 'port', 'passfile']);
  for (const [key, setting] of url.searchParams) {
    const normalized = key.toLowerCase();
    if (overrides.has(normalized)) return false;
    if (normalized === 'sslmode' &&
        !['require', 'verify-ca', 'verify-full'].includes(setting)) return false;
  }
  return true;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (!isApprovedSupabaseDatabaseUrl(process.env.SUPABASE_DB_URL,
    process.env.SUPABASE_PROJECT_REF)) process.exitCode = 1;
}
