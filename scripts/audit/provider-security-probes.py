"""Low-rate, nonmutating checks for the owner's two existing services.
No login attempts, signups, member credentials, writes or third-party scanning.
Only public configuration is parsed; response bodies and keys are not logged.
"""
import base64
import hashlib
import json
import pathlib
import re
import time
import urllib.error
import urllib.request

APP = 'https://app.dialincollective.com'
DB = 'https://azviqqejypsefzilgonr.supabase.co'
PRODUCTION_ALIAS = 'https://release-production--the-dial-in-collective.netlify.app'
ALLOWED = {APP, DB, PRODUCTION_ALIAS}
RESULTS = []

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

OPENER = urllib.request.build_opener(NoRedirect)

def check(name, url, expected, headers=None, method='GET', data=None):
    if not any(url == origin or url.startswith(origin + '/') for origin in ALLOWED):
        raise ValueError('Outside authorized origins')
    time.sleep(0.35)
    started = time.monotonic()
    request = urllib.request.Request(url, data=data, method=method, headers={
        'User-Agent': 'DIC-Owner-Authorized-Nonmutating-Security-Audit/1.0',
        **(headers or {})})
    try:
        try:
            response = OPENER.open(request, timeout=12)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = response.read(300000)
            status = response.code
            safe_headers = {k.lower(): v for k, v in response.headers.items()
                if k.lower() in {'content-type', 'content-security-policy', 'strict-transport-security',
                'x-content-type-options', 'referrer-policy', 'cache-control', 'permissions-policy',
                'access-control-allow-origin', 'access-control-allow-credentials', 'x-frame-options'}}
        RESULTS.append({'name': name, 'status': status,
            'result': 'PASS' if status in expected else 'UNEXPECTED_STATUS',
            'headers': safe_headers, 'bytes_read': len(body),
            'body_sha256': hashlib.sha256(body).hexdigest(),
            'seconds': round(time.monotonic() - started, 3)})
        return body
    except (OSError, urllib.error.URLError) as error:
        RESULTS.append({'name': name, 'result': 'UNVERIFIED', 'error_type': type(error).__name__})
        return b''

primary_shell = check('netlify_https_member_shell', APP + '/', {200})
check('netlify_https_admin_shell_public_not_admin_authority', APP + '/admin.html', {200})
config = check('public_client_coordinates', APP + '/cloud/config.js', {200})
match = re.search(rb'export const CLOUD_CONFIG=(\{[^\n]+\});', config)
coordinates = json.loads(match[1]) if match else {}
key = coordinates.get('publishableKey', '')
if coordinates.get('supabaseUrl') != DB or not key.startswith('sb_publishable_'):
    raise RuntimeError('Public config not recognized; no API probing attempted')
for path in ['/.env', '/.git/config', '/package-lock.json', '/supabase/config.toml',
             '/docs/DECISION_LEDGER.json', '/docs/RELEASE_REQUEST.json',
             '/scripts/backups/create-nightly-encrypted-dump.sh', '/src/server/coffee-page-metadata.mjs']:
    check('private_file_not_served:' + path, APP + path, {403, 404})
# Provider readback for deploy 6adabcecd4a2a68e94cdc09a confirms this URL
# belongs to context=production, not a preview. Public HTML is expected;
# backend authorization remains mandatory. Do not mark preview SSO tested.
alias_shell = check('netlify_production_alias_public_shell', PRODUCTION_ALIAS + '/', {200})
RESULTS.append({'name': 'netlify_production_alias_matches_primary_shell',
    'result': 'PASS' if primary_shell and alias_shell == primary_shell else 'CONTENT_MISMATCH'})
preview = APP + '/api/coffee-preview'
check('preview_no_authorization', preview, {401}, {'Content-Type':'application/json'}, 'POST', b'{}')
check('preview_invalid_authorization', preview, {401}, {'Content-Type':'application/json','Authorization':'Bearer invalid'}, 'POST', b'{"source_url":"https://example.com/products/test"}')
check('preview_cross_origin_denied', preview, {403}, {'Content-Type':'application/json','Origin':'https://untrusted.invalid','Authorization':'Bearer invalid'}, 'POST', b'{}')
check('preview_wrong_content_type', preview, {415}, {'Content-Type':'text/plain','Authorization':'Bearer invalid'}, 'POST', b'{}')
common = {'apikey':key}
check('supabase_no_key_denied', DB + '/rest/v1/shots?select=id&limit=0', {401, 403})
for table in ['shots', 'shot_notes', 'account_preferences', 'setups', 'coffee_submissions']:
    check('anonymous_table_denied:' + table, DB + '/rest/v1/' + table + '?select=*&limit=0', {401,403}, common)
check('private_schema_not_exposed', DB + '/rest/v1/beta_members?select=*&limit=0', {401,403,406}, {**common,'Accept-Profile':'private'})
check('anonymous_private_state_denied', DB + '/rest/v1/rpc/dic_read_personal_state', {401,403}, common)
check('anonymous_admin_overview_denied', DB + '/rest/v1/rpc/dic_admin_access_overview', {401,403}, common)
enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
for mode, token in [('invalid','invalid'), ('unsigned_role_forgery', enc({'alg':'none','typ':'JWT'})+'.'+enc({'role':'service_role','sub':'00000000-0000-0000-0000-000000000000','exp':4102444800})+'.')]:
    check('jwt_rejected:' + mode, DB + '/rest/v1/shots?select=id&limit=0', {401,403}, {**common,'Authorization':'Bearer '+token})
for function in ['dic-preview-coffee','dic-verify-coffee']:
    url = DB + '/functions/v1/' + function
    check('edge_missing_jwt:' + function, url, {401,403}, {**common,'Content-Type':'application/json'}, 'POST', b'{}')
    check('edge_invalid_jwt:' + function, url, {401,403}, {**common,'Content-Type':'application/json','Authorization':'Bearer invalid'}, 'POST', b'{}')
report={'scope':'nonmutating public/anonymous HTTP only; no real signed-in account testing',
        'not_tested':['nonproduction preview SSO enforcement: no verified nonproduction target in this run',
                      'real signed-in member or administrator authorization'],
        'observed_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'checks':RESULTS,
        'counts':{state:sum(row['result']==state for row in RESULTS) for state in ['PASS','UNEXPECTED_STATUS','CONTENT_MISMATCH','UNVERIFIED']}}
pathlib.Path('qa_artifacts/security').mkdir(parents=True,exist_ok=True)
pathlib.Path('qa_artifacts/security/provider-probes.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report['counts']))
if any(row['result'] != 'PASS' for row in RESULTS):
    raise SystemExit(1)
