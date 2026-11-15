// Standalone, disabled-by-default owner-only browser OAuth setup.
// Not a member feature; it never writes or decrypts an existing backup.
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export const FOLDER_ID='1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf';
export const SCOPE='https://www.googleapis.com/auth/drive.file';
export const CALLBACK='https://app.dialincollective.com/api/owner-drive-connect';
const COOKIE='dic_drive_setup',TTL=600000;
const DRIVE='https://www.googleapis.com/drive/v3/files/';
const UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
const defaultEnv=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const escapeHtml=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const securityHeaders={'Cache-Control':'no-store, max-age=0','Pragma':'no-cache','Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
function html(body,status=200,headers={}){
  const nonce=randomBytes(16).toString('base64');
  const script="<script nonce='"+nonce+"'>if(location.search)history.replaceState(null,'',location.pathname);var b=document.getElementById('copy-token');if(b)b.addEventListener('click',function(){navigator.clipboard.writeText(document.getElementById('refresh-token').value).then(function(){b.textContent='Copied'});});</script>";
  const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DIC owner Drive setup</title><style>body{background:#f3ece0;color:#2b1b14;font:16px/1.6 system-ui,sans-serif;margin:0}main{max-width:640px;margin:auto;padding:30px}input,button,textarea{font:inherit;width:100%;max-width:100%;padding:12px;margin:10px 0;box-sizing:border-box}textarea{height:125px}code{overflow-wrap:anywhere}</style></head><body><main>'+body+'</main>'+script+'</body></html>';
  return new Response(page,{status,headers:{...securityHeaders,'Content-Type':'text/html; charset=utf-8',
    'Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'",...headers}});
}
function hashMatch(a,b){
  const x=createHash('sha256').update(a).digest(),y=createHash('sha256').update(b).digest();
  return timingSafeEqual(x,y);
}
function readSetupConfig(env){
  const c={id:env('DIC_DRIVE_WEB_CLIENT_ID'),secret:env('DIC_DRIVE_WEB_CLIENT_SECRET'),
    password:env('DIC_DRIVE_SETUP_PASSPHRASE'),enabled:env('DIC_DRIVE_SETUP_ENABLED')};
  if(c.enabled!=='true'||!String(c.id||'').endsWith('.apps.googleusercontent.com')||
     String(c.secret||'').length<16||String(c.password||'').length<24)return null;
  return c;
}
function sign(data,password){
  const packed=Buffer.from(JSON.stringify(data)).toString('base64url');
  const mac=createHmac('sha256',password).update('dic-drive-owner-v1:'+packed).digest('base64url');
  return packed+'.'+mac;
}
function extractCookie(value){
  const c=String(value||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  return c?.slice(COOKIE.length+1)||'';
}
function verifySession(raw,password,now){
  if(!raw||raw.length>1000)return null;
  const [packed,mac,...extra]=raw.split('.');
  if(extra.length||!packed||!mac)return null;
  const good=createHmac('sha256',password).update('dic-drive-owner-v1:'+packed).digest('base64url');
  if(!hashMatch(mac,good))return null;
  let data;try{data=JSON.parse(Buffer.from(packed,'base64url').toString('utf8'));}catch{return null;}
  if(!/^[0-9a-f]{48}$/.test(String(data.state||''))||!/^[\w-]{40,128}$/.test(String(data.verifier||''))||
     !Number.isSafeInteger(data.iat)||data.iat>now+30000||now-data.iat>TTL)return null;
  return data;
}
async function driveJson(fetcher,url,token,options={}){
  const r=await fetcher(url,{...options,redirect:'error',cache:'no-store',
    headers:{Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Google Drive verification failed');
  return r.json();
}
async function verifyDisposableUpload(fetcher,accessToken){
  const folder=await driveJson(fetcher,DRIVE+FOLDER_ID+'?fields='+encodeURIComponent('id,name,mimeType,trashed,capabilities(canAddChildren)'),accessToken);
  if(folder.id!==FOLDER_ID||folder.name!=='DIC Automated Encrypted Backups'||
     folder.mimeType!=='application/vnd.google-apps.folder'||folder.trashed||
     folder.capabilities?.canAddChildren!==true)throw Error('Folder access not granted');
  const bytes=randomBytes(53),name='DIC-OAUTH-TEST-'+Date.now()+'.bin';
  const md5=createHash('md5').update(bytes).digest('hex');
  const meta={name,mimeType:'application/octet-stream',parents:[FOLDER_ID],
    appProperties:{dicPurpose:'disposable-oauth-proof'}};
  const init=await fetcher(UPLOAD+'?uploadType=resumable&fields=id,name,size,md5Checksum,parents',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json; charset=UTF-8',
      'X-Upload-Content-Type':'application/octet-stream','X-Upload-Content-Length':String(bytes.length)},
    body:JSON.stringify(meta)});
  if(!init.ok)throw Error('Upload initialization failed');
  let session;
  try{session=new URL(init.headers.get('location'));}catch{throw Error('Invalid upload session');}
  if(session.origin!=='https://www.googleapis.com'||session.pathname!=='/upload/drive/v3/files')
    throw Error('Unsafe upload session');
  const put=await fetcher(session.href,{method:'PUT',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(12000),headers:{'Content-Length':String(bytes.length),
      'Content-Range':'bytes 0-'+(bytes.length-1)+'/'+bytes.length},body:bytes});
  if(!put.ok)throw Error('Disposable upload failed');
  const created=await put.json();
  if(!/^[A-Za-z0-9_-]{3,200}$/.test(String(created?.id||'')))throw Error('Missing test ID');
  try{
    const record=await driveJson(fetcher,DRIVE+encodeURIComponent(created.id)+'?fields='+encodeURIComponent('id,name,size,mimeType,md5Checksum,parents,trashed'),accessToken);
    if(record.id!==created.id||record.name!==name||record.mimeType!=='application/octet-stream'||
       Number(record.size)!==bytes.length||record.md5Checksum!==md5||record.trashed||
       !Array.isArray(record.parents)||record.parents.length!==1||record.parents[0]!==FOLDER_ID)
      throw Error('Disposable upload did not match checksum, size or parent');
  }finally{
    const removed=await driveJson(fetcher,DRIVE+encodeURIComponent(created.id)+'?fields=id,trashed',accessToken,{
      method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
    if(removed.id!==created.id||removed.trashed!==true)throw Error('Disposable cleanup unverified');
  }
}
export function createOwnerDriveConnect({env=defaultEnv,fetcher=fetch,now=()=>Date.now()}={}){
 return async request=>{
  const c=readSetupConfig(env),url=new URL(request.url);
  if(!c||!['GET','POST'].includes(request.method)||url.origin!=='https://app.dialincollective.com'||
     url.pathname!=='/api/owner-drive-connect')return html('<h1>Not found</h1>',404);
  if(request.method==='GET'&&!url.searchParams.has('state')&&!url.searchParams.has('code')&&!url.searchParams.has('error'))
   return html('<h1>Connect encrypted backup storage</h1><p>One-time, owner-only Google Drive permission. No member accounts are connected.</p><form method="post" action="/api/owner-drive-connect"><label>Owner setup passphrase<input name="setup_key" type="password" required autocomplete="off"></label><button type="submit">Authorize Google Drive</button></form><p>Only the <code>drive.file</code> scope is requested. Select the existing DIC Automated Encrypted Backups folder.</p>');
  if(request.method==='POST'){
   if(request.headers.get('origin')!=='https://app.dialincollective.com'||
      !String(request.headers.get('content-type')||'').startsWith('application/x-www-form-urlencoded'))
      return html('<h1>Not authorized</h1>',403);
   const body=await request.text();
   if(body.length>1024||!hashMatch(new URLSearchParams(body).get('setup_key')||'',c.password))
     return html('<h1>Not authorized</h1>',403);
   const state=randomBytes(24).toString('hex'),verifier=randomBytes(48).toString('base64url');
   const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
   const challenge=createHash('sha256').update(verifier).digest('base64url');
   Object.entries({client_id:c.id,redirect_uri:CALLBACK,response_type:'code',scope:SCOPE,
      access_type:'offline',prompt:'consent',trigger_onepick:'true',allow_folder_selection:'true',
      mimetypes:'application/vnd.google-apps.folder',state,code_challenge:challenge,
      code_challenge_method:'S256'}).forEach(([k,v])=>auth.searchParams.set(k,v));
   const token=sign({state,verifier,iat:now()},c.password);
   return new Response(null,{status:303,headers:{...securityHeaders,Location:auth.href,
      'Set-Cookie':COOKIE+'='+token+'; Max-Age=600; Path=/api/owner-drive-connect; HttpOnly; Secure; SameSite=Lax'}});
  }
  const clear={'Set-Cookie':COOKIE+'=; Max-Age=0; Path=/api/owner-drive-connect; HttpOnly; Secure; SameSite=Lax'};
  try{
   if(url.searchParams.has('error'))return html('<h1>Authorization cancelled</h1>',400,clear);
   const session=verifySession(extractCookie(request.headers.get('cookie')),c.password,now());
   const code=url.searchParams.get('code'),state=url.searchParams.get('state');
   if(!session||state!==session.state||!code||code.length>2048||
      url.searchParams.get('picked_file_ids')!==FOLDER_ID)
     return html('<h1>Authorization not accepted</h1><p>Restart setup and select only the existing private backup folder.</p>',403,clear);
   const form=new URLSearchParams({client_id:c.id,client_secret:c.secret,redirect_uri:CALLBACK,
      grant_type:'authorization_code',code,code_verifier:session.verifier});
   const exchange=await fetcher('https://oauth2.googleapis.com/token',{
      method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
   if(!exchange.ok)throw Error('Google token exchange failed');
   const tokens=await exchange.json();
   if(!tokens.access_token||!tokens.refresh_token||String(tokens.scope||'').trim()!==SCOPE)
     throw Error('Offline drive.file grant missing');
   await verifyDisposableUpload(fetcher,tokens.access_token);
   return html('<h1>Google Drive verified</h1><p>Private folder access, disposable upload, checksum, size, parent and cleanup passed. No real backup was touched.</p><p>Copy this token ONLY into GitHub Actions secret <code>DIC_DRIVE_REFRESH_TOKEN</code>. Never paste it into ChatGPT, email or GitHub files.</p><textarea id="refresh-token" readonly>'+escapeHtml(tokens.refresh_token)+'</textarea><button type="button" id="copy-token">Copy token</button><p>Add the same Web client ID and secret directly to GitHub Actions as <code>DIC_DRIVE_CLIENT_ID</code> and <code>DIC_DRIVE_CLIENT_SECRET</code>. Disable the setup endpoint after use.</p>',200,clear);
  }catch{return html('<h1>Setup incomplete</h1><p>No credentials were saved. Existing backups remain unchanged. Verify the Google configuration and folder before retrying.</p>',503,clear);}
 };
}
export default createOwnerDriveConnect();
export const config={path:'/api/owner-drive-connect',method:['GET','POST']};
