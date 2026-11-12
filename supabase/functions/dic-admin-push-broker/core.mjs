// Issue #1938: Supabase-only VAPID custody with encrypted Vault persistence.
// No private key is exported to Netlify, source, browser or unauthenticated callers.
export const PROJECT_URL='https://azviqqejypsefzilgonr.supabase.co';
export const SERVICE_URL=PROJECT_URL+'/functions/v1/dic-admin-push-broker';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const TOKEN=/^(signup|coffee|delete):[a-f0-9]{8}-[a-f0-9-]{27,36}$/i;
const reply=(data,status=200)=>Response.json(data,{status,headers:{
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const denied=(status=403)=>reply({ok:false,reason:'unavailable'},status);
function decode64(s){
 const str=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
 return Uint8Array.from(str,c=>c.charCodeAt(0));
}
function encode64(bytes){
 let str='';for(const b of bytes)str+=String.fromCharCode(b);
 return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function fingerprint(endpoint){
 const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint)));
 return [...h].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function safeEndpoint(value){
 if(typeof value!=='string'||value.length<20||value.length>2048)return null;
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||
   !['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(u.hostname)||
   !u.pathname||u.pathname==='/')return null;
  return u.href;
 }catch{return null;}
}
function cleanTokens(input){
 if(!Array.isArray(input)||input.length>4000||input.some(t=>typeof t!=='string'||!TOKEN.test(t)))
  throw Error('Invalid action token list');
 return [...new Set(input)].sort();
}
function jwtPair(key){
 const pub=decode64(key.publicKey),priv=decode64(key.privateKey);
 if(pub.length!==65||pub[0]!==4||priv.length!==32)throw Error('Vault key malformed');
 return {pub,jwk:{kty:'EC',crv:'P-256',x:encode64(pub.slice(1,33)),
  y:encode64(pub.slice(33,65)),d:encode64(priv),ext:true}};
}
async function signedPush(endpoint,key,fetcher,now){
 const {jwk}=jwtPair(key);
 const priv=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const u=new URL(endpoint);
 const t=Math.floor(now()/1000);
 const header=encode64(new TextEncoder().encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
 const payload=encode64(new TextEncoder().encode(JSON.stringify({
  aud:u.origin,exp:t+3600,sub:'https://app.dialincollective.com'})));
 const unsigned=header+'.'+payload;
 const signature=encode64(new Uint8Array(await crypto.subtle.sign(
  {name:'ECDSA',hash:'SHA-256'},priv,new TextEncoder().encode(unsigned))));
 const response=await fetcher(endpoint,{method:'POST',redirect:'error',cache:'no-store',
  headers:{Authorization:'vapid t='+unsigned+'.'+signature+', k='+key.publicKey,
   TTL:'300',Urgency:'normal'},signal:AbortSignal.timeout(6000)});
 return {ok:response.ok,gone:response.status===404||response.status===410};
}
export function createAdminPushBroker({env=name=>Deno.env.get(name),fetcher=fetch,now=()=>Date.now()}={}){
 return async request=>{
  if(request.method!=='POST')return denied(405);
  const raw=await request.text().catch(()=>'');
  if(raw.length>9000||raw.length===0)return denied(413);
  let spec;
  try{spec=JSON.parse(raw);}catch{return denied(400);}
  if(!spec||typeof spec!=='object'||!['manage','poll'].includes(spec.op))return denied(403);
  let service,publishable;
  try{
   service=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default||env('SUPABASE_SERVICE_ROLE_KEY');
   publishable=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||env('SUPABASE_ANON_KEY');
  }catch{return denied(503);}
  if(env('SUPABASE_URL')!==PROJECT_URL||!service||!publishable)return denied(503);
  const h={apikey:service,'Content-Type':'application/json',
   ...(/^sb_secret_/.test(service)?{}:{Authorization:'Bearer '+service})};
  const rest=async(path,{method='GET',body,prefer}={})=>{
   const r=await fetcher(PROJECT_URL+'/rest/v1/'+path,{method,redirect:'error',cache:'no-store',
    headers:{...h,...(prefer?{Prefer:prefer}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(7000)});
   if(!r.ok)throw Error('Protected PostgREST failure');
   return r;
  };
  const keys=async()=>await (await rest('rpc/dic_admin_push_runtime_keys',{method:'POST',body:{}})).json();
  const ensureKeys=async()=>{
   let k=await keys();
   if(k)return k;
   const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
   const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
   const publicKey=encode64(Uint8Array.from([4,...decode64(jwk.x),...decode64(jwk.y)]));
   await rest('rpc/dic_admin_push_bootstrap_key',{method:'POST',
    body:{p_public_key:publicKey,p_private_key:jwk.d}});
   k=await keys();if(!k||typeof k.publicKey!=='string'||!k.privateKey)throw Error('Vault bootstrap incomplete');
   return k;
  };
  const admin=async jwt=>{
   if(typeof jwt!=='string'||jwt.length<24||jwt.length>6000||
      !/^[A-Za-z0-9._~-]+$/.test(jwt))return null;
   const headers={apikey:publishable,Authorization:'Bearer '+jwt};
   const u=await fetcher(PROJECT_URL+'/auth/v1/user',{headers,redirect:'error',
    cache:'no-store',signal:AbortSignal.timeout(6500)});
   if(!u.ok)return null;
   const user=await u.json();
   if(!UUID.test(String(user?.id||'')))return null;
   const r=await fetcher(PROJECT_URL+'/rest/v1/rpc/dic_session_status',{
    method:'POST',headers:{...headers,'Content-Type':'application/json'},
    body:'{}',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6500)});
   if(!r.ok)return null;
   const status=await r.json();
   return status?.authenticated===true&&status?.admitted===true&&status?.admin===true?user.id:null;
  };
  try{
   if(spec.op==='manage'){
    if(!['GET','POST','DELETE'].includes(spec.method))return denied(405);
    const owner=await admin(spec.jwt);
    if(!owner)return denied(403);
    if(spec.method==='GET'){
     const k=await ensureKeys();
     return reply({ok:true,publicKey:k.publicKey});
    }
    const endpoint=safeEndpoint(spec.endpoint);
    if(!endpoint)return denied(400);
    const hash=await fingerprint(endpoint);
    if(spec.method==='DELETE'){
     await rest('dic_admin_push_subscriptions?endpoint_hash=eq.'+hash+'&owner_id=eq.'+owner,
      {method:'DELETE'});
     return reply({ok:true,subscribed:false});
    }
    const k=await ensureKeys();
    if(!k.publicKey)return denied(503);
    const snap=await (await rest('rpc/dic_admin_push_snapshot',{method:'POST',body:{}})).json();
    if(!Array.isArray(snap.admin_ids)||!snap.admin_ids.includes(owner))return denied(403);
    const tokens=cleanTokens(snap.tokens);
    const stamp=new Date(now()).toISOString();
    await rest('dic_admin_push_subscriptions?on_conflict=endpoint_hash',{
     method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
     body:{endpoint_hash:hash,owner_id:owner,endpoint,seen_tokens:tokens,
      expires_at:new Date(now()+60*86400000).toISOString(),updated_at:stamp}});
    return reply({ok:true,subscribed:true});
   }
   // Public scheduling trigger returns no private rows/tokens, and is rate-limited
   // by a Postgres advisory-serialized UPDATE before any push can be sent.
   if(spec.op!=='poll'||Object.keys(spec).length!==1)return denied(400);
   const acquired=await (await rest('rpc/dic_admin_push_claim_poll',{method:'POST',body:{}})).json();
   if(acquired!==true)return reply({ok:true});
   const key=await keys();
   if(!key)return reply({ok:true});
   const snap=await (await rest('rpc/dic_admin_push_snapshot',{method:'POST',body:{}})).json();
   if(!Array.isArray(snap?.admin_ids))return denied(503);
   const active=new Set(snap.admin_ids),tokens=cleanTokens(snap.tokens);
   const PAGE=50,route='dic_admin_push_subscriptions?select=owner_id,endpoint,endpoint_hash,seen_tokens,expires_at&order=endpoint_hash.asc&limit='+PAGE;
   let cursor='',failed=0;
   const process=async row=>{
    if(!HASH.test(String(row?.endpoint_hash||'')))return;
    const endpoint=safeEndpoint(row.endpoint),query='dic_admin_push_subscriptions?endpoint_hash=eq.'+row.endpoint_hash;
    if(!active.has(row.owner_id)||!endpoint||await fingerprint(endpoint)!==row.endpoint_hash||
        Date.parse(row.expires_at)<=now()){
     await rest(query,{method:'DELETE'});return;
    }
    const seen=cleanTokens(row.seen_tokens),added=tokens.filter(t=>!seen.includes(t));
    if(added.length){
     const push=await signedPush(endpoint,key,fetcher,now);
     if(push.gone){await rest(query,{method:'DELETE'});return;}
     if(!push.ok){failed++;return;}
    }
    if(added.length||JSON.stringify(seen)!==JSON.stringify(tokens))
     await rest(query,{method:'PATCH',prefer:'return=minimal',body:{
      seen_tokens:tokens,updated_at:new Date(now()).toISOString(),
      ...(added.length?{last_sent_at:new Date(now()).toISOString()}:{})}});
   };
   while(true){
    const rows=await (await rest(route+(cursor?'&endpoint_hash=gt.'+cursor:''))).json();
    if(!Array.isArray(rows)||rows.length>PAGE)return denied(503);
    if(!rows.length)break;
    const next=rows.at(-1)?.endpoint_hash;
    if(!HASH.test(String(next||''))||(cursor&&next<=cursor))return denied(503);
    const results=await Promise.allSettled(rows.map(process));
    failed+=results.filter(x=>x.status==='rejected').length;
    if(rows.length<PAGE)break;
    cursor=next;
   }
   return reply({ok:failed===0},failed?503:200);
  }catch{return denied(503);}
 };
}
