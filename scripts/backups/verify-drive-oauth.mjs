#!/usr/bin/env node
/**
 * One-time, LOCAL Google Drive OAuth permission proof for The Dial In Collective.
 * Creates then trashes one synthetic test file; does not touch real backups.
 * No credentials are transmitted to ChatGPT or logged. Node.js >= 22.
 */
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash, randomBytes} from 'node:crypto';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const TARGET_ID = '1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf';
export const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export function credentialsFromJson(raw) {
  const c = JSON.parse(raw).installed;
  if (!c || !String(c.client_id || '').endsWith('.apps.googleusercontent.com') ||
      !c.client_secret || !/^https:\/\/oauth2\.googleapis\.com\/token$/.test(c.token_uri)) {
    throw new Error('Expected Google Cloud OAuth Desktop app JSON (installed client).');
  }
  return {client_id:c.client_id, client_secret:c.client_secret};
}
export function oauthUrl({client_id, redirect_uri, state, code_challenge}) {
  const q = new URLSearchParams({
    client_id, redirect_uri, response_type:'code', scope:SCOPE,
    access_type:'offline', prompt:'consent', trigger_onepick:'true',
    allow_folder_selection:'true', mimetypes:'application/vnd.google-apps.folder',
    state, code_challenge, code_challenge_method:'S256'
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
}
export function validatePickerSelection(picked) {
  const ids=String(picked || '').split(',');
  if (ids.length!==1 || ids[0]!==TARGET_ID) {
    throw new Error('Wrong folder selected. Select the existing DIC Automated Encrypted Backups folder ONLY.');
  }
}

async function googleJson(url, token, options = {}) {
  const res=await fetch(url,{...options, headers:{Authorization:`Bearer ${token}`,...options.headers}});
  const txt=await res.text();
  const json=txt?JSON.parse(txt):{};
  if (!res.ok) throw new Error(`Google Drive API HTTP ${res.status}; ${json.error?.status || 'request failed'}`);
  return json;
}
async function exchange(code, redirect_uri, verifier, creds) {
  const params=new URLSearchParams({code, redirect_uri, code_verifier:verifier,
    client_id:creds.client_id, client_secret:creds.client_secret, grant_type:'authorization_code'});
  const res=await fetch('https://oauth2.googleapis.com/token', {method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:params});
  const body=await res.json();
  if(!res.ok)throw new Error(`Google OAuth exchange failed (${body.error||res.status})`);
  if(!body.refresh_token || !body.access_token ||
    String(body.scope||'').trim()!==SCOPE) throw new Error('Missing refresh token or wrong OAuth scope.');
  return body;
}
export async function verifyFolder(token) {
  const fields='id,name,mimeType,parents,trashed,owners(emailAddress),capabilities(canAddChildren)';
  const info=await googleJson(`${DRIVE}/files/${TARGET_ID}?fields=${encodeURIComponent(fields)}`,token);
  if(info.id!==TARGET_ID || info.mimeType!=='application/vnd.google-apps.folder' || info.trashed ||
    info.name!=='DIC Automated Encrypted Backups' || info.capabilities?.canAddChildren===false) {
    throw new Error('Authenticated identity lacks verified write access to the exact private backup folder.');
  }
  return info;
}
export async function proofUpload(token) {
  const bytes=randomBytes(53);
  const md5=createHash('md5').update(bytes).digest('hex');
  const name=`DIC-OAUTH-TEST-${Date.now()}.bin`;
  const metadata={name,mimeType:'application/octet-stream',parents:[TARGET_ID],
    appProperties:{dicPurpose:'disposable-oauth-permission-proof'}};
  const init=await fetch(`${UPLOAD}?uploadType=resumable&fields=id,name,size,md5Checksum,parents`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json; charset=UTF-8',
      'X-Upload-Content-Type':'application/octet-stream','X-Upload-Content-Length':String(bytes.length)},
    body:JSON.stringify(metadata)});
  if(!init.ok)throw new Error(`Google Drive resumable upload initialization HTTP ${init.status}`);
  const session=init.headers.get('location');
  if(!session?.startsWith('https://www.googleapis.com/upload/drive/v3/files?'))
    throw new Error('Google returned unexpected upload session URL.');
  const put=await fetch(session,{method:'PUT',headers:{'Content-Length':String(bytes.length),
    'Content-Range':`bytes 0-${bytes.length-1}/${bytes.length}`},body:bytes});
  if(!put.ok)throw new Error(`Google Drive test upload HTTP ${put.status}`);
  const created=await put.json();
  if(!created.id)throw new Error('Google Drive did not return new test file ID.');
  let ok=false;
  let cleanupFailure=null;
  try {
    const fields='id,name,mimeType,size,md5Checksum,parents,trashed';
    const stored=await googleJson(`${DRIVE}/files/${encodeURIComponent(created.id)}?fields=${encodeURIComponent(fields)}`,token);
    ok=stored.name===name && stored.mimeType==='application/octet-stream' &&
      Number(stored.size)===bytes.length && stored.md5Checksum===md5 &&
      Array.isArray(stored.parents)&&stored.parents.length===1&&stored.parents[0]===TARGET_ID && !stored.trashed;
    if(!ok)throw new Error('Disposable file failed Drive size/MD5/parent readback checks.');
  } finally {
    // Trash only the test file created by this invocation; never touch archives.
    try {
      const cleanup=await googleJson(`${DRIVE}/files/${encodeURIComponent(created.id)}?fields=id,trashed`,token,
        {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
      if (cleanup.trashed!==true) throw new Error('Trashing was not confirmed');
    } catch(e){
      cleanupFailure=e;
      console.error(`Test-file cleanup FAILED; test file ID ${created.id} must be reviewed manually.`);
    }
  }
  if (cleanupFailure) throw new Error('Disposable test-file cleanup is unverified; do not proceed to GitHub credential setup.');
  return ok;
}

export async function main() {
  if(process.argv.length!==3){console.error('Usage: node verify-drive-oauth.mjs /path/to/google-desktop-client.json');process.exitCode=2;return;}
  const creds=credentialsFromJson(await readFile(resolve(process.argv[2]),'utf8'));
  const state=randomBytes(24).toString('hex');
  const verifier=randomBytes(48).toString('base64url');
  const challenge=createHash('sha256').update(verifier).digest('base64url');
  const server=createServer();
  const callback=new Promise((done,fail)=>{
    server.on('request',(req,res)=>{
      if(!req.url?.startsWith('/oauth2callback?')){res.writeHead(404).end();return;}
      const u=new URL(req.url,'http://127.0.0.1');
      if(u.searchParams.get('state')!==state){res.writeHead(400).end('Invalid OAuth state');return;}
      const error=u.searchParams.get('error');
      res.writeHead(error?400:200,{'Content-Type':'text/plain'}).end(error?'Authorization cancelled':'Authorization received. Return to the terminal.');
      if(error)fail(new Error(`OAuth cancelled: ${error}`));
      else done({code:u.searchParams.get('code'),picked:u.searchParams.get('picked_file_ids')});
      server.close();
    });
    server.on('error',fail);
  });
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
  const redirect_uri=`http://127.0.0.1:${server.address().port}/oauth2callback`;
  console.log('Open this Google authorization URL in your local browser, then select the existing DIC backup folder:');
  console.log(oauthUrl({client_id:creds.client_id,redirect_uri,state,code_challenge:challenge}));
  console.log('Do not share the resulting tokens or downloaded OAuth JSON with anyone.');
  let result;
  try{result=await callback;}finally{server.close();}
  validatePickerSelection(result.picked);
  if(!result.code)throw new Error('Google did not return an authorization code.');
  const tokens=await exchange(result.code,redirect_uri,verifier,creds);
  const folder=await verifyFolder(tokens.access_token);
  await proofUpload(tokens.access_token);
  const dirname=join(homedir(),'.dic-drive-oauth');
  await mkdir(dirname,{recursive:true,mode:0o700});
  const pathname=join(dirname,'verified-credentials.json');
  const payload={client_id:creds.client_id,client_secret:creds.client_secret,
    refresh_token:tokens.refresh_token,folder_id:TARGET_ID,scope:SCOPE,
    verified_at:new Date().toISOString()};
  await writeFile(pathname,JSON.stringify(payload,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log('PASS: Google Picker selected the approved folder; read/write access confirmed; disposable file uploaded, MD5/size/parent verified.');
  console.log('Verified folder: '+folder.name+' ('+TARGET_ID+').');
  console.log('Sensitive OAuth credentials saved locally ONLY at: '+pathname);
  console.log('Do NOT upload, paste, email or commit that credentials file.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(e=>{console.error('VERIFY FAILED:',e.message);process.exitCode=1;});
}
