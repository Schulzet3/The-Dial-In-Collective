#!/usr/bin/env node
/**
 * Planned unattended DIC GitHub Actions -> owner-personal Drive offsite courier.
 * NOT connected to a schedule: run only after the separate local OAuth proof.
 * Node >=22; no third-party packages; no archive decryption or database access.
 */
import {mkdtemp, open, rm, stat} from 'node:fs/promises';
import {createWriteStream, createReadStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {execFile as cbExec} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';

const execFile=promisify(cbExec);
export const REPO='Schulzet3/The-Dial-In-Collective';
export const FOLDER_ID='1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf';
export const SCOPE='https://www.googleapis.com/auth/drive.file';
export const NAME_PREFIX='dic-encrypted-nightly-';
const GH_API=`https://api.github.com/repos/${REPO}`;
const DRIVE='https://www.googleapis.com/drive/v3';
const CHUNK=4*1024*1024;

export function verifyTrustedRun(run, repo=REPO) {
  if(!run || !/^[1-9]\d*$/.test(String(run.id)) ||
     run.status!=='completed'||run.conclusion!=='success'||
     run.head_branch!=='main'||run.repository?.full_name!==repo||
     !['schedule','workflow_dispatch'].includes(run.event)||
     !['.github/workflows/nightly-backup.yml',
       '.github/workflows/nightly-backup.yml@main',
       '.github/workflows/nightly-backup.yml@refs/heads/main'].includes(run.path))
    throw new Error('Source run is not a completed, trusted main scheduled/manual backup.');
  return true;
}
export function selectArtifact(response, runId) {
  if(!Array.isArray(response?.artifacts) || Number(response.total_count)>100)
    throw new Error('GitHub artifact list missing or incomplete.');
  const list=response.artifacts.filter(a=>a.name===NAME_PREFIX+runId &&
    a.workflow_run?.id==runId && a.expired===false &&
    Number.isSafeInteger(Number(a.id)) && Number(a.id)>0 &&
    Number.isSafeInteger(Number(a.size_in_bytes)) && Number(a.size_in_bytes)>0 &&
    /^sha256:[a-f0-9]{64}$/.test(String(a.digest)));
  if(list.length>1)throw new Error('Duplicate or inconsistent encrypted artifact identity.');
  return list[0] || null;
}
export function assertArchiveIdentity(file, artifact) {
  if(file?.md5Checksum===undefined || !file?.parents?.includes(FOLDER_ID) ||
     file.parents.length!==1 || Number(file.size)!==Number(artifact.size_in_bytes) ||
     file.appProperties?.dicArtifactId!==String(artifact.id) ||
     file.appProperties?.dicSha256!==artifact.digest) {
    throw new Error('Drive artifact identity or folder mismatch; manual inspection required.');
  }
}

function requireConfig(env) {
  const required=['GH_TOKEN','DIC_SOURCE_RUN_ID','DIC_DRIVE_CLIENT_ID',
    'DIC_DRIVE_CLIENT_SECRET','DIC_DRIVE_REFRESH_TOKEN','DIC_DRIVE_CUTOVER_UTC'];
  for(const name of required)if(!env[name])throw new Error(`Missing required environment input ${name}.`);
  if(env.GITHUB_REPOSITORY!==REPO || !/^\d+$/.test(env.DIC_SOURCE_RUN_ID) ||
     Number.isNaN(Date.parse(env.DIC_DRIVE_CUTOVER_UTC)) ||
     (env.DIC_DRIVE_FOLDER_ID && env.DIC_DRIVE_FOLDER_ID!==FOLDER_ID))
    throw new Error('Unexpected repository, run, folder or cutover date.');
}
async function github(path, token) {
  const r=await fetch(`${GH_API}${path}`,{headers:{Authorization:`Bearer ${token}`,
    Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw new Error(`GitHub Actions API HTTP ${r.status}.`);
  return r.json();
}
export async function accessToken(env) {
  const form=new URLSearchParams({client_id:env.DIC_DRIVE_CLIENT_ID,
    client_secret:env.DIC_DRIVE_CLIENT_SECRET,refresh_token:env.DIC_DRIVE_REFRESH_TOKEN,
    grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,
    signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw new Error(`Google OAuth token refresh HTTP ${r.status}.`);
  const b=await r.json();
  if(!b.access_token || (b.scope && b.scope!==SCOPE))
    throw new Error('Refresh token is invalid or carries unexpected scopes.');
  return b.access_token;
}
async function driveGet(path, token) {
  const r=await fetch(`${DRIVE}${path}`,{headers:{Authorization:`Bearer ${token}`},
    signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw new Error(`Drive API GET HTTP ${r.status}.`);
  return r.json();
}
async function verifyFolder(token) {
  const fields='id,name,mimeType,trashed,capabilities(canAddChildren)';
  const f=await driveGet(`/files/${FOLDER_ID}?fields=${encodeURIComponent(fields)}`,token);
  if(f.id!==FOLDER_ID || f.name!=='DIC Automated Encrypted Backups' ||
     f.mimeType!=='application/vnd.google-apps.folder' ||f.trashed ||
     f.capabilities?.canAddChildren===false)throw new Error('Selected Drive folder cannot be written.');
}
async function findSaved(token, artifact) {
  const q=`'${FOLDER_ID}' in parents and trashed = false and `+
    `appProperties has { key='dicArtifactId' and value='${artifact.id}' }`;
  const params=new URLSearchParams({q,pageSize:'10',fields:'nextPageToken,files(id,size,md5Checksum,parents,appProperties)'});
  const found=await driveGet(`/files?${params}`,token);
  if(found.nextPageToken)throw new Error('Duplicate lookup exceeded 10 results; inspect folder.');
  if(found.files?.length>1)throw new Error('Multiple files claim this artifact identity.');
  if(found.files?.length===1){assertArchiveIdentity(found.files[0],artifact);return found.files[0];}
  return null;
}
async function downloadGitHubZip(token, artifact, filepath) {
  const url=`${GH_API}/actions/artifacts/${artifact.id}/zip`;
  const r=await fetch(url,{redirect:'manual',headers:{Authorization:`Bearer ${token}`,
    Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(60000)});
  if(![301,302,303,307].includes(r.status))throw new Error(`GitHub download redirect HTTP ${r.status}.`);
  const u=new URL(r.headers.get('location')||'');
  if(u.protocol!=='https:')throw new Error('GitHub artifact destination is not HTTPS.');
  // IMPORTANT: never forward GH_TOKEN to the signed archive destination.
  const zip=await fetch(u,{redirect:'follow',signal:AbortSignal.timeout(180000)});
  if(!zip.ok || !zip.body)throw new Error(`Signed GitHub artifact download HTTP ${zip.status}.`);
  await pipeline(Readable.fromWeb(zip.body),createWriteStream(filepath,{flags:'wx',mode:0o600}));
  const s=await stat(filepath);
  if(s.size!==Number(artifact.size_in_bytes))throw new Error('Downloaded ZIP size differs from GitHub artifact.');
  const h=createHash('sha256');const m=createHash('md5');
  for await(const part of createReadStream(filepath)){h.update(part);m.update(part);}
  if('sha256:'+h.digest('hex')!==artifact.digest)throw new Error('GitHub SHA-256 checksum mismatch.');
  const listing=await execFile('unzip',['-Z','-1',filepath],{timeout:60000});
  if(listing.stdout.trim()!=='backup.age')throw new Error('ZIP must contain only backup.age.');
  await execFile('unzip',['-tqq',filepath],{timeout:60000});
  return {size:s.size,md5:m.digest('hex')};
}
function confirmedOffset(range) {
  if(!range)return 0;
  const m=/^bytes=0-(\d+)$/.exec(range);
  if(!m)throw new Error('Unexpected Google resumable upload Range header.');
  return Number(m[1])+1;
}
async function putChunk(url,bytes,start,total) {
  const r=await fetch(url,{method:'PUT',headers:{'Content-Length':String(bytes.length),
    'Content-Range':`bytes ${start}-${start+bytes.length-1}/${total}`},body:bytes,
    signal:AbortSignal.timeout(120000)});
  if(r.status===308)return {offset:confirmedOffset(r.headers.get('range'))};
  if(r.status===200||r.status===201)return {file:await r.json()};
  if([408,429,500,502,503,504].includes(r.status))return {retry:true};
  throw new Error(`Drive resumable upload HTTP ${r.status}; preserve files for inspection.`);
}
async function probe(url,total) {
  const r=await fetch(url,{method:'PUT',headers:{'Content-Length':'0',
    'Content-Range':`bytes */${total}`},signal:AbortSignal.timeout(60000)});
  if(r.status===308)return {offset:confirmedOffset(r.headers.get('range'))};
  if(r.status===200||r.status===201)return {file:await r.json()};
  throw new Error(`Unable to resume interrupted Drive upload; HTTP ${r.status}.`);
}
async function uploadDrive(token, filepath, artifact, local) {
  const metadata={name:`dic-nightly-${artifact.id}.zip`,mimeType:'application/zip',
    parents:[FOLDER_ID],appProperties:{dicArtifactId:String(artifact.id),
      dicSource:'github-actions-age',dicSha256:artifact.digest}};
  const init=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,md5Checksum,parents,appProperties',{
    method:'POST',headers:{Authorization:`Bearer ${token}`,
      'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/zip',
      'X-Upload-Content-Length':String(local.size)},body:JSON.stringify(metadata),
      signal:AbortSignal.timeout(60000)});
  if(!init.ok)throw new Error(`Drive resumable session initiation HTTP ${init.status}.`);
  const session=init.headers.get('location');
  if(!session?.startsWith('https://www.googleapis.com/upload/drive/v3/files?'))
    throw new Error('Google returned unexpected Drive upload session host.');
  const fd=await open(filepath,'r');
  let offset=0;let failureCount=0;let created;
  try{
    while(offset<local.size){
      const length=Math.min(CHUNK,local.size-offset);
      const buf=Buffer.alloc(length);
      const {bytesRead}=await fd.read(buf,0,length,offset);
      if(bytesRead!==length)throw new Error('Local archive changed during upload.');
      let result;
      try{result=await putChunk(session,buf,offset,local.size);}
      catch(e){ if(e.name==='TimeoutError'||e.name==='AbortError')result={retry:true};else throw e;}
      if(result.retry){
        if(++failureCount>5)throw new Error('Drive transient upload failed repeatedly.');
        await new Promise(r=>setTimeout(r,Math.min(failureCount*2000,10000)));
        result=await probe(session,local.size);
      }else failureCount=0;
      if(result.file){created=result.file;break;}
      if(result.offset<=offset || result.offset>local.size)
        throw new Error('Unexpected incomplete Drive offset; stop rather than duplicate bytes.');
      offset=result.offset;
    }
  }finally{await fd.close();}
  if(!created?.id)throw new Error('Drive upload ended without a confirmed file.');
  const fields='id,name,size,md5Checksum,parents,appProperties,trashed,shared';
  const saved=await driveGet(`/files/${created.id}?fields=${encodeURIComponent(fields)}`,token);
  assertArchiveIdentity(saved,artifact);
  if(saved.name!==metadata.name || saved.trashed || saved.shared===true ||
     saved.md5Checksum!==local.md5)throw new Error('Offsite Drive name/visibility/MD5 mismatch.');
  return saved.id;
}
export async function main(env=process.env) {
  requireConfig(env);
  const run=await github(`/actions/runs/${env.DIC_SOURCE_RUN_ID}`,env.GH_TOKEN);
  verifyTrustedRun(run);
  if(Date.parse(run.created_at)<Date.parse(env.DIC_DRIVE_CUTOVER_UTC))
    throw new Error('This run predates the OAuth courier cutover; skip to avoid legacy duplicates.');
  const listing=await github(`/actions/runs/${run.id}/artifacts?per_page=100`,env.GH_TOKEN);
  const artifact=selectArtifact(listing,run.id);
  if(!artifact){
    const jobs=await github(`/actions/runs/${run.id}/jobs?per_page=100`,env.GH_TOKEN);
    const guarded=jobs.jobs?.some(j=>j.steps?.some(s=>s.name==='Upload ciphertext only' && s.conclusion==='skipped'));
    if(guarded){console.log(`NORMAL SKIP: scheduled fallback run ${run.id} did not produce a duplicate archive.`);return;}
    throw new Error('Successful GitHub backup run lacks a ciphertext artifact without guard skip proof.');
  }
  const token=await accessToken(env);
  await verifyFolder(token);
  const existing=await findSaved(token,artifact);
  if(existing){console.log(`ALREADY VERIFIED: GitHub artifact ${artifact.id} is in the correct Drive folder.`);return;}
  const dir=await mkdtemp(join(tmpdir(),'dic-ciphertext-'));
  try{
    const filepath=join(dir,'encrypted-artifact.zip');
    const local=await downloadGitHubZip(env.GH_TOKEN,artifact,filepath);
    const saved=await uploadDrive(token,filepath,artifact,local);
    console.log(`PASS: exact encrypted GitHub artifact ${artifact.id} uploaded with verified SHA-256, Drive MD5, size and parent; Drive file ID ${saved}.`);
  }finally{await rm(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{console.error('DIC OFFSITE COURIER FAILED:',e.message);process.exitCode=1;});
}
