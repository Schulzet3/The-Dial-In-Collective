#!/usr/bin/env node
/**
 * Optional LOCAL helper. Runs only after verify-drive-oauth succeeds.
 * Requires GitHub CLI (gh) authenticated as repo owner.
 * Values travel over process stdin to `gh secret set`, not CLI arguments/logs.
 */
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const repo='Schulzet3/The-Dial-In-Collective';
const path=process.argv[2]||join(homedir(),'.dic-drive-oauth','verified-credentials.json');
const data=JSON.parse(await readFile(resolve(path),'utf8'));
if(data.folder_id!=='1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf' ||
 data.scope!=='https://www.googleapis.com/auth/drive.file' ||
 !data.client_id || !data.client_secret || !data.refresh_token){
  throw new Error('No valid, verified, narrow-scope OAuth credentials file.');
}
function gh(args,input) {
  const r=spawnSync('gh',args,{encoding:'utf8',input,stdio:['pipe','pipe','pipe'],timeout:60000});
  if(r.status!==0) throw new Error('GitHub CLI command failed. Confirm `gh auth login`, repository access and available Actions secrets.');
  return String(r.stdout||'');
}
// Verify CLI authentication before modifying repository secrets.
const full=gh(['repo','view',repo,'--json','nameWithOwner','--jq','.nameWithOwner']).trim();
if(full!==repo)throw new Error('GitHub CLI points at unexpected repository.');
for (const [key,value] of Object.entries({
 DIC_DRIVE_CLIENT_ID:data.client_id,
 DIC_DRIVE_CLIENT_SECRET:data.client_secret,
 DIC_DRIVE_REFRESH_TOKEN:data.refresh_token
})){
  gh(['secret','set',key,'--repo',repo],String(value)+'\n');
  console.log('Installed encrypted GitHub Actions secret: '+key);
}
const cutover=new Date().toISOString();
gh(['variable','set','DIC_DRIVE_CUTOVER_UTC','--repo',repo],cutover+'\n');
console.log('Set new-only courier cutover time to '+cutover);
console.log('Credential values were never printed. Do not enable a scheduled courier until its GitHub-runner smoke test passes.');
