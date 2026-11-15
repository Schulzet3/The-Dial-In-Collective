// Standalone, disabled-by-default owner-only browser OAuth setup.
// Not a member feature; it never writes or decrypts an existing backup.
import {createHash,createHmac,createCipheriv,createDecipheriv,randomBytes,timingSafeEqual} from 'node:crypto';
export const FOLDER_ID='1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf';
export const SCOPE='https://www.googleapis.com/auth/drive.file';
export const CALLBACK='https://app.dialincollective.com/api/owner-drive-connect';
const COOKIE='dic_drive_setup',PENDING='dic_drive_pending',TTL=600000;
const DRIVE='https://www.googleapis.com/drive/v3/files/';
const UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
const defaultEnv=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
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
    password:env('DIC_DRIVE_SETUP_PASSPHRASE'),enabled:env('DIC_DRIVE_SETUP_ENABLED'),
    pickerKey:env('DIC_DRIVE_PICKER_API_KEY'),projectNumber:env('DIC_DRIVE_PICKER_APP_ID')};
  if(c.enabled!=='true'||!String(c.id||'').endsWith('.apps.googleusercontent.com')||
     String(c.secret||'').length<16||String(c.password||'').length<24||
     !/^AIza[A-Za-z0-9_-]{25,}$/.test(String(c.pickerKey||''))||
     !/^[0-9]{6,24}$/.test(String(c.projectNumber||'')))return null;
  return c;
}
function sign(data,password){
  const packed=Buffer.from(JSON.stringify(data)).toString('base64url');
  const mac=createHmac('sha256',password).update('dic-drive-owner-v1:'+packed).digest('base64url');
  return packed+'.'+mac;
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

function pendingKey(c){
  return createHash('sha256').update('dic-drive-web-picker-v1|'+c.secret+'|'+c.password).digest();
}
function sealPending(data,c){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',pendingKey(c),iv);
  cipher.setAAD(Buffer.from('DIC owner Picker pending v1'));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return [iv,encrypted,cipher.getAuthTag()].map(x=>x.toString('base64url')).join('.');
}
function openPending(cookie,c,now){
  if(!cookie||cookie.length>4096)return null;
  const parts=cookie.split('.');
  if(parts.length!==3)return null;
  try{
    const [iv,data,tag]=parts.map(x=>Buffer.from(x,'base64url'));
    if(iv.length!==12||tag.length!==16||data.length>2000)return null;
    const dec=createDecipheriv('aes-256-gcm',pendingKey(c),iv);
    dec.setAAD(Buffer.from('DIC owner Picker pending v1'));
    dec.setAuthTag(tag);
    const pending=JSON.parse(Buffer.concat([dec.update(data),dec.final()]).toString('utf8'));
    if(!Number.isSafeInteger(pending.iat)||pending.iat>now+30000||now-pending.iat>TTL||
       !/^[A-Za-z0-9_-]{32,64}$/.test(String(pending.csrf||''))||
       !/^[A-Za-z0-9._~-]{8,4096}$/.test(String(pending.access||''))||
       typeof pending.refresh!=='string'||pending.refresh.length<8||pending.refresh.length>2048)
      return null;
    return pending;
  }catch{return null;}
}
function pickerHtml(c,access,csrf,headers={}){
  const nonce=randomBytes(16).toString('base64');
  const safe=JSON.stringify({access,key:c.pickerKey,appId:c.projectNumber,csrf,folder:FOLDER_ID}).replace(/</g,'\\u003c').replace(/\u2028|\u2029/g,'');
  const js=String.raw`(function(){
    "use strict";
    const cfg=__CONFIG__;
    const notice=document.getElementById("status");
    const button=document.getElementById("select-folder");
    const token=document.getElementById("refresh-token");
    const copy=document.getElementById("copy-token");
    let busy=false;
    function say(msg){notice.textContent=msg;}
    async function chosen(data){
      if(!data||data.action!==google.picker.Action.PICKED)return;
      const docs=data[google.picker.Response.DOCUMENTS]||[];
      const selected=docs[0];
      if(docs.length!==1||!selected||selected[google.picker.Document.ID]!==cfg.folder||
         selected[google.picker.Document.MIME_TYPE]!=="application/vnd.google-apps.folder"){
        say("Please select the existing DIC Automated Encrypted Backups folder, not another file or folder.");return;
      }
      if(busy)return;
      busy=true;
      button.disabled=true;
      say("Checking folder permission and disposable upload integrity...");
      try{
        const r=await fetch("/api/owner-drive-connect",{
          method:"POST",credentials:"same-origin",cache:"no-store",
          headers:{"Content-Type":"application/json","X-DIC-Owner-Picker":"verify"},
          body:JSON.stringify({folder_id:cfg.folder,csrf:cfg.csrf})
        });
        const result=await r.json();
        if(!r.ok||result.ok!==true||typeof result.refresh_token!=="string")
          throw Error("Verification failed");
        token.value=result.refresh_token;
        token.hidden=false;
        copy.hidden=false;
        copy.addEventListener("click",()=>navigator.clipboard.writeText(token.value)
          .then(()=>say("Token copied. Store it only in GitHub Actions secrets."))
          .catch(()=>say("Select and copy the token into GitHub Actions secrets.")));
        say("Drive permission and test file cleanup verified. Save this token only in GitHub Actions secrets.");
      }catch{
        say("Drive verification failed. No real backups were changed. Restart the owner setup when corrected.");
        button.disabled=false;
        busy=false;
      }
    }
    button.addEventListener("click",()=>{
      if(!window.gapi||!window.google&&typeof window.gapi.load!=="function"){
        say("Google Picker is loading. Try again.");return;
      }
      say("Opening your Google Drive folders...");
      try{
        gapi.load("picker",{callback:()=>{
          const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS);
          view.setIncludeFolders(true);
          view.setSelectFolderEnabled(true);
          view.setMode(google.picker.DocsViewMode.LIST);
          const picker=new google.picker.PickerBuilder()
            .addView(view).setOAuthToken(cfg.access).setDeveloperKey(cfg.key)
            .setAppId(cfg.appId).setMaxItems(1).setCallback(chosen).build();
          picker.setVisible(true);
        }});
      }catch{say("Google Picker could not open. Check API configuration.");}
    });
    if(location.search)history.replaceState(null,"",location.pathname);
  })();`;
  const content=js.replace('__CONFIG__',safe);
  const csp="default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; "+
    "script-src 'nonce-"+nonce+"' https://apis.google.com https://ssl.gstatic.com https://www.gstatic.com; "+
    "frame-src https://docs.google.com https://*.google.com; "+
    "connect-src 'self' https://www.googleapis.com https://docs.google.com; "+
    "img-src 'self' data: https://*.googleusercontent.com; style-src 'unsafe-inline'";
  const page='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Choose owner backup folder</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:30px auto;padding:24px;background:#f3ece0;color:#2b1b14}button,textarea{font:inherit;padding:12px;width:100%;box-sizing:border-box;margin:10px 0}textarea{height:130px}</style></head><body>'+
    '<h1>Choose existing encrypted backup folder</h1><p>Sign in to your Google account if prompted. Select only <strong>DIC Automated Encrypted Backups</strong>. This will test a disposable file and will not touch real backups.</p>'+
    '<button type="button" id="select-folder">Select Google Drive folder</button>'+
    '<p id="status" role="status" aria-live="polite"></p>'+
    '<textarea id="refresh-token" aria-label="Private refresh token" readonly hidden></textarea>'+
    '<button type="button" id="copy-token" hidden>Copy token for GitHub Actions</button>'+
    '<script nonce="'+nonce+'">'+content+'</script>'+
    '<script nonce="'+nonce+'" src="https://apis.google.com/js/api.js" async defer></script></body></html>';
  return new Response(page,{status:200,headers:{...securityHeaders,
    'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':csp,...headers}});
}
export function createOwnerDriveConnect({env=defaultEnv,fetcher=fetch,now=()=>Date.now()}={}){
  return async request=>{
    const c=readSetupConfig(env),url=new URL(request.url);
    if(!c||!['GET','POST'].includes(request.method)||url.origin!=='https://app.dialincollective.com'||
       url.pathname!=='/api/owner-drive-connect')return html('<h1>Not found</h1>',404);
    if(request.method==='GET'&&!url.searchParams.has('state')&&!url.searchParams.has('code')&&!url.searchParams.has('error'))
      return html('<h1>Connect encrypted backup storage</h1><p>One-time, owner-only Google Drive permission. No member accounts are connected.</p><form method="post" action="/api/owner-drive-connect"><label>Owner setup passphrase<input name="setup_key" type="password" required autocomplete="off"></label><button type="submit">Authorize Google Drive</button></form><p>Only the <code>drive.file</code> scope is requested. You will select the existing DIC Automated Encrypted Backups folder using Google Picker.</p>');
    if(request.method==='POST'){
      if(request.headers.get('origin')!=='https://app.dialincollective.com')
        return html('<h1>Not authorized</h1>',403);
      const type=request.headers.get('content-type')||'';
      if(type.startsWith('application/json')){
        const pending=openPending(extractCookieFor(request,PENDING),c,now());
        if(!pending||request.headers.get('X-DIC-Owner-Picker')!=='verify')
          return Response.json({ok:false},{status:403,headers:securityHeaders});
        const raw=await request.text();
        if(raw.length>512)return Response.json({ok:false},{status:413,headers:securityHeaders});
        let input;try{input=JSON.parse(raw);}catch{return Response.json({ok:false},{status:400,headers:securityHeaders});}
        if(input?.folder_id!==FOLDER_ID||input?.csrf!==pending.csrf)
          return Response.json({ok:false},{status:403,headers:securityHeaders});
        const clear=PENDING+'=; Max-Age=0; Path=/api/owner-drive-connect; HttpOnly; Secure; SameSite=Lax';
        try{
          await verifyDisposableUpload(fetcher,pending.access);
          return Response.json({ok:true,refresh_token:pending.refresh},{headers:{...securityHeaders,'Set-Cookie':clear}});
        }catch{return Response.json({ok:false},{status:503,headers:{...securityHeaders,'Set-Cookie':clear}});}
      }
      if(!type.startsWith('application/x-www-form-urlencoded'))return html('<h1>Not authorized</h1>',403);
      const body=await request.text();
      if(body.length>1024||!hashMatch(new URLSearchParams(body).get('setup_key')||'',c.password))
        return html('<h1>Not authorized</h1>',403);
      const state=randomBytes(24).toString('hex'),verifier=randomBytes(48).toString('base64url');
      const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
      const challenge=createHash('sha256').update(verifier).digest('base64url');
      Object.entries({client_id:c.id,redirect_uri:CALLBACK,response_type:'code',scope:SCOPE,
        access_type:'offline',prompt:'consent',state,code_challenge:challenge,
        code_challenge_method:'S256'}).forEach(([k,v])=>auth.searchParams.set(k,v));
      const token=sign({state,verifier,iat:now()},c.password);
      return new Response(null,{status:303,headers:{...securityHeaders,Location:auth.href,
        'Set-Cookie':COOKIE+'='+token+'; Max-Age=600; Path=/api/owner-drive-connect; HttpOnly; Secure; SameSite=Lax'}});
    }
    if(url.searchParams.has('error'))return html('<h1>Authorization cancelled</h1>',400);
    const session=verifySession(extractCookieFor(request,COOKIE),c.password,now());
    const code=url.searchParams.get('code'),state=url.searchParams.get('state');
    if(!session||state!==session.state||!code||code.length>2048)
      return html('<h1>Authorization not accepted</h1><p>Restart the owner setup.</p>',403);
    try{
      const form=new URLSearchParams({client_id:c.id,client_secret:c.secret,redirect_uri:CALLBACK,
        grant_type:'authorization_code',code,code_verifier:session.verifier});
      const exchange=await fetcher('https://oauth2.googleapis.com/token',{
        method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
        headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
      if(!exchange.ok)throw Error('Google token exchange failed');
      const tokens=await exchange.json();
      if(!/^[A-Za-z0-9._~-]{8,4096}$/.test(String(tokens.access_token||''))||
         typeof tokens.refresh_token!=='string'||tokens.refresh_token.length<8||
         tokens.refresh_token.length>2048||String(tokens.scope||'').trim()!==SCOPE)
        throw Error('Offline drive.file grant missing');
      const csrf=randomBytes(24).toString('base64url');
      const pending=sealPending({access:tokens.access_token,refresh:tokens.refresh_token,csrf,iat:now()},c);
      return pickerHtml(c,tokens.access_token,csrf,{'Set-Cookie':PENDING+'='+pending+
        '; Max-Age=600; Path=/api/owner-drive-connect; HttpOnly; Secure; SameSite=Lax'});
    }catch{return html('<h1>Setup incomplete</h1><p>No credentials were saved. Existing backups remain unchanged. Verify Google configuration, then retry.</p>',503);}
  };
}
function extractCookieFor(request,name){
  const match=String(request.headers.get('cookie')||'').split(';')
    .map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  return match?match.slice(name.length+1):'';
}
export default createOwnerDriveConnect();
export const config={path:'/api/owner-drive-connect',method:['GET','POST']};
