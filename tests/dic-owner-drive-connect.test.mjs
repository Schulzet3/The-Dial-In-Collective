import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createOwnerDriveConnect,CALLBACK,FOLDER_ID,SCOPE} from '../netlify/functions/dic-owner-drive-connect.mjs';

const origin='https://app.dialincollective.com';
const config={DIC_DRIVE_SETUP_ENABLED:'true',
 DIC_DRIVE_SETUP_PASSPHRASE:'test-owner-passphrase-32-characters-long',
 DIC_DRIVE_WEB_CLIENT_ID:'synthetic.apps.googleusercontent.com',
 DIC_DRIVE_WEB_CLIENT_SECRET:'test-web-client-secret-private-123'};
const env=k=>config[k];
const landing=()=>new Request(CALLBACK);
function post(pass=config.DIC_DRIVE_SETUP_PASSPHRASE,originHeader=origin){
 return new Request(CALLBACK,{method:'POST',
  headers:{Origin:originHeader,'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({setup_key:pass})});
}
async function begin(handle){
 const r=await handle(post());
 assert.equal(r.status,303);
 return {auth:new URL(r.headers.get('location')),cookie:r.headers.get('set-cookie').split(';')[0]};
}
function callback(auth,cookie,folder=FOLDER_ID){
 const u=new URL(CALLBACK);
 u.searchParams.set('code','synthetic-onetime-code');
 u.searchParams.set('state',auth.searchParams.get('state'));
 u.searchParams.set('picked_file_ids',folder);
 return new Request(u,{headers:{Cookie:cookie}});
}
test('disabled by default: no exposed owner setup endpoint',async()=>{
 const handle=createOwnerDriveConnect({env:()=>undefined});
 const r=await handle(landing());assert.equal(r.status,404);
 assert.doesNotMatch(await r.text(),/test-web-client-secret/);
});
test('wrong passphrase or cross-origin request never redirects to Google',async()=>{
 const handle=createOwnerDriveConnect({env});
 assert.equal((await handle(post('bad'))).status,403);
 assert.equal((await handle(post(config.DIC_DRIVE_SETUP_PASSPHRASE,'https://evil.example'))).status,403);
 assert.equal((await handle(new Request(CALLBACK,{method:'POST',body:'setup_key=bad'}))).status,403);
});
test('owner starts Google offline PKCE with exact limited drive.file and folder picker',async()=>{
 const handle=createOwnerDriveConnect({env});
 const first=await handle(landing());assert.equal(first.status,200);
 assert.match(await first.text(),/Owner setup passphrase/);
 const {auth,cookie}=await begin(handle);
 assert.equal(auth.origin,'https://accounts.google.com');
 assert.equal(auth.searchParams.get('redirect_uri'),CALLBACK);
 assert.equal(auth.searchParams.get('scope'),SCOPE);
 assert.equal(auth.searchParams.get('access_type'),'offline');
 assert.equal(auth.searchParams.get('trigger_onepick'),'true');
 assert.equal(auth.searchParams.get('allow_folder_selection'),'true');
 assert.equal(auth.searchParams.get('code_challenge_method'),'S256');
 assert.match(cookie,/^dic_drive_setup=/);
 assert.doesNotMatch(cookie,/test-owner-passphrase|client-secret/);
});
test('wrong folder, missing state and tampered cookie reject before token exchange',async()=>{
 let calls=0;
 const handle=createOwnerDriveConnect({env,fetcher:async()=>{calls++;throw Error('outbound not permitted');}});
 const {auth,cookie}=await begin(handle);
 assert.equal((await handle(callback(auth,cookie,'wrong-folder'))).status,403);
 const forged=callback(auth,cookie);
 forged.headers.set('Cookie',cookie+'corrupted');
 assert.equal((await handle(forged)).status,403);
 const query=new URL(CALLBACK);
 query.searchParams.set('code','any');query.searchParams.set('state','forged');
 query.searchParams.set('picked_file_ids',FOLDER_ID);
 assert.equal((await handle(new Request(query,{headers:{Cookie:cookie}}))).status,403);
 assert.equal(calls,0);
});
test('expired or future-dated signed cookie rejects token exchange',async()=>{
 let clock=1000000,calls=0;
 const handle=createOwnerDriveConnect({env,now:()=>clock,fetcher:async()=>{calls++;throw Error('invalid');}});
 const {auth,cookie}=await begin(handle);clock+=11*60*1000;
 assert.equal((await handle(callback(auth,cookie))).status,403);assert.equal(calls,0);
});
function mockGoogle({badFolder=false,badCleanup=false,badScope=false}={}){
 let name,bytes,md5,trashed=0;
 const calls=[];
 const fetcher=async(url,opts={})=>{
  url=String(url);const method=opts.method||'GET';calls.push({url,method});
  if(url==='https://oauth2.googleapis.com/token'){
   assert.equal(method,'POST');
   assert.equal(opts.body.get('grant_type'),'authorization_code');
   assert.equal(opts.body.get('client_secret'),config.DIC_DRIVE_WEB_CLIENT_SECRET);
   assert.equal(opts.body.get('redirect_uri'),CALLBACK);
   assert.ok(opts.body.get('code_verifier'));
   return Response.json({access_token:'ephemeral-access-token',
     refresh_token:'synthetic-refresh-token-for-owner',
     scope:badScope?'https://www.googleapis.com/auth/drive':SCOPE});
  }
  if(url.startsWith('https://www.googleapis.com/drive/v3/files/'+FOLDER_ID)){
   return Response.json({id:FOLDER_ID,name:badFolder?'wrong folder':'DIC Automated Encrypted Backups',
    mimeType:'application/vnd.google-apps.folder',trashed:false,capabilities:{canAddChildren:true}});
  }
  if(url.includes('uploadType=resumable')){
   assert.equal(method,'POST');const o=JSON.parse(opts.body);
   name=o.name;assert.deepEqual(o.parents,[FOLDER_ID]);
   assert.match(name,/^DIC-OAUTH-TEST-/);
   return new Response(null,{status:200,headers:{location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=synthetic'}});
  }
  if(url.includes('upload_id=synthetic')){
   assert.equal(method,'PUT');bytes=Buffer.from(opts.body);
   md5=createHash('md5').update(bytes).digest('hex');
   return Response.json({id:'disposable-file'});
  }
  if(url.includes('/files/disposable-file')){
   if(method==='PATCH'){trashed++;return Response.json({id:'disposable-file',trashed:!badCleanup});}
   return Response.json({id:'disposable-file',name,mimeType:'application/octet-stream',
    size:String(bytes.length),md5Checksum:md5,parents:[FOLDER_ID],trashed:false});
  }
  throw Error('unexpected host or endpoint '+url);
 };
 return {fetcher,calls,get trashed(){return trashed;}};
}
test('narrow-scope offline grant verifies folder and disposable upload/MD5/size/parent/trash',async()=>{
 const mock=mockGoogle(),handle=createOwnerDriveConnect({env,fetcher:mock.fetcher});
 const {auth,cookie}=await begin(handle);
 const r=await handle(callback(auth,cookie));
 assert.equal(r.status,200);
 const body=await r.text();
 assert.match(body,/Google Drive verified/);
 assert.match(body,/synthetic-refresh-token-for-owner/);
 assert.doesNotMatch(body,/test-web-client-secret-private/);
 assert.equal(r.headers.get('cache-control'),'no-store, max-age=0');
 assert.match(r.headers.get('content-security-policy'),/default-src 'none'/);
 assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal(mock.trashed,1);
 assert.ok(mock.calls.some(x=>x.url.includes('uploadType=resumable')));
 assert.ok(mock.calls.some(x=>x.method==='PATCH'));
});
test('no refresh token is shown on wrong scope, inaccessible folder or failed cleanup',async()=>{
 for(const opts of [{badScope:true},{badFolder:true},{badCleanup:true}]){
  const mock=mockGoogle(opts),handle=createOwnerDriveConnect({env,fetcher:mock.fetcher});
  const {auth,cookie}=await begin(handle);
  const r=await handle(callback(auth,cookie));
  assert.equal(r.status,503);
  assert.doesNotMatch(await r.text(),/synthetic-refresh-token-for-owner/);
 }
});
