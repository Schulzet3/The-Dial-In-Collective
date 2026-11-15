import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createOwnerDriveConnect,CALLBACK,FOLDER_ID,SCOPE} from '../netlify/functions/dic-owner-drive-connect.mjs';

const origin='https://app.dialincollective.com';
const vars={DIC_DRIVE_SETUP_ENABLED:'true',
 DIC_DRIVE_SETUP_PASSPHRASE:'test-owner-passphrase-32-characters-long',
 DIC_DRIVE_WEB_CLIENT_ID:'synthetic.apps.googleusercontent.com',
 DIC_DRIVE_WEB_CLIENT_SECRET:'test-web-client-secret-private-123',
 DIC_DRIVE_PICKER_API_KEY:'AIza'+'x'.repeat(36),
 DIC_DRIVE_PICKER_APP_ID:'123456789012'};
const env=k=>vars[k];
function post(pass=vars.DIC_DRIVE_SETUP_PASSPHRASE,originHeader=origin){
 return new Request(CALLBACK,{method:'POST',
  headers:{Origin:originHeader,'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({setup_key:pass})});
}
async function begin(handle){
 const r=await handle(post());assert.equal(r.status,303);
 return {auth:new URL(r.headers.get('location')),cookie:r.headers.get('set-cookie').split(';')[0]};
}
function callback(auth,cookie,overrides={}){
 const u=new URL(CALLBACK);
 u.searchParams.set('state',overrides.state??auth.searchParams.get('state'));
 u.searchParams.set('code',overrides.code??'synthetic-onetime-code');
 return new Request(u,{headers:{Cookie:cookie}});
}
function googleMock({badFolder=false,badCleanup=false,badScope=false,badChecksum=false}={}){
 let name,bytes,md5,trashed=0;const calls=[];
 const fetcher=async(url,opts={})=>{
  url=String(url);const method=opts.method||'GET';calls.push({url,method});
  if(url==='https://oauth2.googleapis.com/token'){
   assert.equal(method,'POST');
   assert.equal(opts.body.get('grant_type'),'authorization_code');
   assert.equal(opts.body.get('redirect_uri'),CALLBACK);
   assert.equal(opts.body.get('client_secret'),vars.DIC_DRIVE_WEB_CLIENT_SECRET);
   assert.ok(opts.body.get('code_verifier'));
   return Response.json({access_token:'synthetic-access-token-for-picker',refresh_token:'synthetic-refresh-token-for-owner',
     scope:badScope?'https://www.googleapis.com/auth/drive':SCOPE});
  }
  if(url.startsWith('https://www.googleapis.com/drive/v3/files/'+FOLDER_ID)){
   return Response.json({id:FOLDER_ID,name:badFolder?'Wrong folder':'DIC Automated Encrypted Backups',
    mimeType:'application/vnd.google-apps.folder',trashed:false,capabilities:{canAddChildren:true}});
  }
  if(url.includes('uploadType=resumable')){
   assert.equal(method,'POST');const o=JSON.parse(opts.body);name=o.name;
   assert.deepEqual(o.parents,[FOLDER_ID]);assert.match(name,/^DIC-OAUTH-TEST-/);
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
    size:String(bytes.length),md5Checksum:badChecksum?'incorrect':md5,parents:[FOLDER_ID],trashed:false});
  }
  throw Error('Unexpected Google request '+url);
 };
 return {fetcher,calls,get trashed(){return trashed;}};
}
async function authorized(handle){
 const {auth,cookie}=await begin(handle);
 const r=await handle(callback(auth,cookie));
 return {response:r,body:await r.text(),cookie:r.headers.get('set-cookie'),auth};
}
function parsePicker(body){
 const match=/const cfg=(\{[^\n]*\});/.exec(body);
 assert.ok(match,'Picker must contain well-formed one-time browser config');
 return JSON.parse(match[1]);
}
function confirm(cfg,cookie,{folder_id=FOLDER_ID,csrf=cfg.csrf,originHeader=origin,header='verify'}={}){
 return new Request(CALLBACK,{method:'POST',headers:{
  Origin:originHeader,Cookie:cookie,'Content-Type':'application/json',
  'X-DIC-Owner-Picker':header},body:JSON.stringify({folder_id,csrf})});
}
test('disabled by default and missing restricted Picker config remains fail-closed',async()=>{
 let handle=createOwnerDriveConnect({env:()=>undefined});
 assert.equal((await handle(new Request(CALLBACK))).status,404);
 handle=createOwnerDriveConnect({env:k=>k==='DIC_DRIVE_PICKER_API_KEY'?undefined:vars[k]});
 assert.equal((await handle(new Request(CALLBACK))).status,404);
 handle=createOwnerDriveConnect({env:k=>k==='DIC_DRIVE_PICKER_APP_ID'?'not-a-project-number':vars[k]});
 assert.equal((await handle(new Request(CALLBACK))).status,404);
});
test('owner password, origin and content-type guard; Google URL requests only offline drive.file PKCE',async()=>{
 const h=createOwnerDriveConnect({env});
 assert.equal((await h(post('wrong'))).status,403);
 assert.equal((await h(post(vars.DIC_DRIVE_SETUP_PASSPHRASE,'https://untrusted.example'))).status,403);
 const entry=await h(new Request(CALLBACK));assert.equal(entry.status,200);
 assert.match(await entry.text(),/Owner setup passphrase/);
 const {auth,cookie}=await begin(h);
 assert.equal(auth.origin,'https://accounts.google.com');
 assert.equal(auth.searchParams.get('redirect_uri'),CALLBACK);
 assert.equal(auth.searchParams.get('scope'),SCOPE);
 assert.equal(auth.searchParams.get('access_type'),'offline');
 assert.equal(auth.searchParams.get('code_challenge_method'),'S256');
 assert.equal(auth.searchParams.has('trigger_onepick'),false,'Web Picker must not use desktop One Pick');
 assert.equal(auth.searchParams.has('picked_file_ids'),false);
 assert.match(cookie,/^dic_drive_setup=/);
 assert.doesNotMatch(cookie,/client-secret|test-owner-passphrase/);
});
test('expired state, forged callback, missing cookie reject before token exchange',async()=>{
 let now=1000000,calls=0;
 const h=createOwnerDriveConnect({env,now:()=>now,fetcher:async()=>{calls++;throw Error('not called');}});
 const {auth,cookie}=await begin(h);
 assert.equal((await h(callback(auth,cookie,{state:'forged'}))).status,403);
 assert.equal((await h(callback(auth,'dic_drive_setup=invalid'))).status,403);
 now+=11*60*1000;
 assert.equal((await h(callback(auth,cookie))).status,403);
 assert.equal(calls,0);
});
test('Web Picker page, not OAuth redirect One Pick; temporary refresh token sealed and hidden from HTML',async()=>{
 const mock=googleMock(),h=createOwnerDriveConnect({env,fetcher:mock.fetcher});
 const {response,body,cookie,auth}=await authorized(h);
 assert.equal(response.status,200);
 assert.match(body,/google\.picker\.PickerBuilder/);
 assert.match(body,/setSelectFolderEnabled\(true\)/);
 assert.match(body,/new google\.picker\.DocsView\(google\.picker\.ViewId\.FOLDERS\)/);
 assert.match(body,/https:\/\/apis\.google\.com\/js\/api\.js/);
 assert.doesNotMatch(body,/synthetic-refresh-token-for-owner|test-web-client-secret-private/);
 assert.doesNotMatch(body,/trigger_onepick|picked_file_ids/);
 assert.equal(response.headers.get('cache-control'),'no-store, max-age=0');
 assert.match(response.headers.get('content-security-policy'),/script-src 'nonce-/);
 assert.match(cookie,/^dic_drive_pending=.*HttpOnly/);
 const cfg=parsePicker(body);
 assert.equal(cfg.key,vars.DIC_DRIVE_PICKER_API_KEY);
 assert.equal(cfg.appId,vars.DIC_DRIVE_PICKER_APP_ID);
 assert.equal(cfg.access,'synthetic-access-token-for-picker');
 assert.equal(cfg.folder,FOLDER_ID);
 assert.equal(mock.calls.length,1,'No Drive files are accessed until actual Picker selection');
 assert.equal(auth.searchParams.has('trigger_onepick'),false);
});
test('wrong selected folder, stale/forged CSRF and wrong origin never touch Drive',async()=>{
 const mock=googleMock(),h=createOwnerDriveConnect({env,fetcher:mock.fetcher});
 const {body,cookie}=await authorized(h),cfg=parsePicker(body);
 const baseline=mock.calls.length;
 for(const req of [confirm(cfg,cookie,{folder_id:'wrong'}),
  confirm(cfg,cookie,{csrf:'bad'}),
  confirm(cfg,cookie,{originHeader:'https://evil.example'}),
  confirm(cfg,cookie,{header:'not-picker'}),
  confirm(cfg,'dic_drive_pending=tampered')]){
   const r=await h(req);assert.ok([403].includes(r.status));assert.equal(mock.calls.length,baseline);
 }
});
test('Web Picker-selected exact private folder gets one disposable integrity test and cleanup before token returned',async()=>{
 const mock=googleMock(),h=createOwnerDriveConnect({env,fetcher:mock.fetcher});
 const {body,cookie}=await authorized(h),cfg=parsePicker(body);
 const verified=await h(confirm(cfg,cookie));
 assert.equal(verified.status,200);
 assert.deepEqual(await verified.json(),{ok:true,refresh_token:'synthetic-refresh-token-for-owner'});
 assert.match(verified.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal(verified.headers.get('cache-control'),'no-store, max-age=0');
 assert.equal(mock.trashed,1);
 assert.ok(mock.calls.some(x=>x.url.includes('uploadType=resumable')));
 assert.ok(mock.calls.some(x=>x.method==='PATCH'));
});
test('Google broad-scope, wrong folder metadata, corrupt checksum and failed cleanup never disclose refresh token',async()=>{
 for(const failure of [{badScope:true},{badFolder:true},{badChecksum:true},{badCleanup:true}]){
  const mock=googleMock(failure),h=createOwnerDriveConnect({env,fetcher:mock.fetcher});
  const {response,body,cookie}=await authorized(h);
  if(failure.badScope){assert.equal(response.status,503);assert.doesNotMatch(body,/synthetic-refresh-token-for-owner/);continue;}
  assert.equal(response.status,200);
  const verified=await h(confirm(parsePicker(body),cookie));
  assert.equal(verified.status,503);
  assert.deepEqual(await verified.json(),{ok:false});
 }
});
