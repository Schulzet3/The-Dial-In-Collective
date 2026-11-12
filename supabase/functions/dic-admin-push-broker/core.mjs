// Issue #1938: signed, narrowly scoped bridge to Supabase's built-in service-role runtime.
// Only this Edge Function can access the service-only push subscription table/aggregate.
// The private signing key stays in the production Netlify environment, NEVER in source.
export const PROJECT_URL='https://azviqqejypsefzilgonr.supabase.co';
export const BROKER_URL=PROJECT_URL+'/functions/v1/dic-admin-push-broker';
export const BROKER_PUBLIC_KEY='BK6zdIPqS2XavBSwv86_oDbqdeFVUhHxdJ5Ox0iNaIvJJfNgQl37s5g2J3ypZykXRaFGW84xM5kHy_-yWEj1kCk';
const SUB_PAGE=/^dic_admin_push_subscriptions\?select=owner_id,endpoint,endpoint_hash,seen_tokens,expires_at&order=endpoint_hash\.asc&limit=50(?:&endpoint_hash=gt\.[0-9a-f]{64})?$/;
const SUB_HASH=/^dic_admin_push_subscriptions\?endpoint_hash=eq\.([0-9a-f]{64})$/;
const SUB_OWNER=/^dic_admin_push_subscriptions\?endpoint_hash=eq\.([0-9a-f]{64})&owner_id=eq\.([0-9a-f-]{36})$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const TOKEN=/^(signup|coffee|delete):[a-f0-9]{8}-[a-f0-9-]{27,36}$/;
const deny=(reason,status=403)=>Response.json({ok:false,reason},{status,headers:{'Cache-Control':'no-store'}});
const validTokens=t=>Array.isArray(t)&&t.length<=4000&&t.every(x=>typeof x==='string'&&TOKEN.test(x));
const validTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
function bytes(input){
 if(typeof input!=='string'||!/^[A-Za-z0-9_-]+$/.test(input))throw Error('Invalid base64url');
 const plain=atob(input.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-input.length%4)%4));
 return Uint8Array.from(plain,c=>c.charCodeAt(0));
}
function b64(bytes){
 let s='';for(const x of bytes)s+=String.fromCharCode(x);
 return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function hash(input){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input))));}
async function endpointHash(endpoint){
 const raw=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint)));
 return [...raw].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function safeEndpoint(endpoint){
 if(typeof endpoint!=='string'||endpoint.length<20||endpoint.length>2048)return null;
 try{
  const u=new URL(endpoint);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||
     !['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(u.hostname)||
     !u.pathname||u.pathname==='/')return null;
  return u.href;
 }catch{return null;}
}
export async function validSignedBrokerRequest(jwt,raw,{now=()=>Date.now(),publicKey=BROKER_PUBLIC_KEY}={}){
 try{
  if(typeof jwt!=='string'||jwt.length>4000)return false;
  const parts=jwt.split('.');
  if(parts.length!==3)return false;
  const head=JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  const claims=JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  const moment=Math.floor(now()/1000);
  if(head.alg!=='ES256'||head.typ!=='JWT'||claims.aud!==BROKER_URL||
     claims.iss!=='https://app.dialincollective.com'||
     !Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||
     claims.iat>moment+20||claims.iat<moment-90||claims.exp<=moment||
     claims.exp-claims.iat>90||claims.body_hash!==await hash(raw))return false;
  const pub=bytes(publicKey);
  if(pub.length!==65||pub[0]!==4)return false;
  const jwk={kty:'EC',crv:'P-256',x:b64(pub.slice(1,33)),y:b64(pub.slice(33,65)),ext:true};
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const signature=bytes(parts[2]);
  return signature.length===64&&await crypto.subtle.verify(
   {name:'ECDSA',hash:'SHA-256'},key,signature,new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}
export function createAdminPushBroker({env=name=>Deno.env.get(name),fetcher=fetch,now=()=>Date.now(),publicKey=BROKER_PUBLIC_KEY}={}){
 return async request=>{
  if(request.method!=='POST')return deny('method_not_allowed',405);
  const raw=await request.text().catch(()=>'');
  if(!raw||raw.length>320000)return deny('invalid_request',413);
  if(!await validSignedBrokerRequest(request.headers.get('x-dic-push-auth'),raw,{now,publicKey}))
   return deny('unauthorized',401);
  let spec;
  try{spec=JSON.parse(raw);}catch{return deny('invalid_request',400);}
  const method=spec?.method,path=spec?.path,body=spec?.body,prefer=spec?.prefer;
  if(typeof path!=='string'||path.length>320||
     !['GET','POST','PATCH','DELETE'].includes(method)||!(body===null||typeof body==='object'))
   return deny('forbidden_route');
  let service,publishable;
  try{
   service=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default||env('SUPABASE_SERVICE_ROLE_KEY');
   publishable=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||env('SUPABASE_ANON_KEY');
  }catch{return deny('runtime_not_configured',503);}
  if(env('SUPABASE_URL')!==PROJECT_URL||!service||!publishable)
   return deny('runtime_not_configured',503);
  const head={apikey:service,'Content-Type':'application/json',
   ...(/^sb_secret_/.test(service)?{}:{Authorization:'Bearer '+service})};
  const rest=async(route,{method='GET',body,prefer}={})=>{
   const res=await fetcher(PROJECT_URL+'/rest/v1/'+route,{
    method,redirect:'error',cache:'no-store',headers:{...head,...(prefer?{Prefer:prefer}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(6500)});
   if(!res.ok)throw Error('Service-only PostgREST error');
   return res;
  };
  const checkAdmin=async()=>{
   const token=spec?.userJwt;
   if(typeof token!=='string'||token.length<24||token.length>6000||
      !/^[-A-Za-z0-9._~]+$/.test(token))return null;
   const authHeader={apikey:publishable,Authorization:'Bearer '+token};
   const userResp=await fetcher(PROJECT_URL+'/auth/v1/user',{
    headers:authHeader,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
   if(!userResp.ok)return null;
   const user=await userResp.json();
   if(!UUID.test(String(user?.id||'')))return null;
   const roleResp=await fetcher(PROJECT_URL+'/rest/v1/rpc/dic_session_status',{
    method:'POST',headers:{...authHeader,'Content-Type':'application/json'},
    body:'{}',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
   if(!roleResp.ok)return null;
   const role=await roleResp.json();
   if(role?.authenticated!==true||role?.admitted!==true||role?.admin!==true)return null;
   return user.id;
  };
  try{
   if(method==='POST'&&path==='rpc/dic_admin_push_snapshot'&&
       body&&Object.keys(body).length===0){
    const r=await rest(path,{method,body:{}});
    return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   }
   if(method==='GET'&&SUB_PAGE.test(path)&&body===null){
    const r=await rest(path);
    return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   }
   const directHash=SUB_HASH.exec(path),ownHash=SUB_OWNER.exec(path);
   if(method==='DELETE'&&directHash&&body===null){
    const r=await rest(path,{method});return new Response(r.body,{status:r.status});
   }
   if(method==='PATCH'&&directHash&&body&&prefer==='return=minimal'&&
      Object.keys(body).every(x=>['seen_tokens','updated_at','last_sent_at'].includes(x))&&
      validTokens(body.seen_tokens)&&validTime(body.updated_at)&&
      (body.last_sent_at===undefined||validTime(body.last_sent_at))){
    const r=await rest(path,{method,body,prefer});return new Response(r.body,{status:r.status});
   }
   if(method==='DELETE'&&ownHash&&body===null){
    const user=await checkAdmin();
    if(!user||user!==ownHash[2])return deny('not_administrator');
    const r=await rest(path,{method});return new Response(r.body,{status:r.status});
   }
   if(method==='POST'&&path==='dic_admin_push_subscriptions?on_conflict=endpoint_hash'&&
      prefer==='resolution=merge-duplicates,return=minimal'&&
      body&&typeof body==='object'){
    const user=await checkAdmin();
    if(!user||body.owner_id!==user)return deny('not_administrator');
    const endpoint=safeEndpoint(body.endpoint);
    if(!endpoint||body.endpoint_hash!==await endpointHash(endpoint)||
       !validTokens(body.seen_tokens)||!validTime(body.expires_at)||
       Date.parse(body.expires_at)>now()+61*86400*1000||Date.parse(body.expires_at)<=now()||
       !validTime(body.updated_at))return deny('invalid_subscription',400);
    const snap=await (await rest('rpc/dic_admin_push_snapshot',{method:'POST',body:{}})).json();
    if(!Array.isArray(snap.admin_ids)||!snap.admin_ids.includes(user)||!validTokens(snap.tokens)||
       JSON.stringify([...new Set(body.seen_tokens)].sort())!==JSON.stringify([...new Set(snap.tokens)].sort()))
      return deny('not_administrator');
    const record={endpoint_hash:body.endpoint_hash,owner_id:user,endpoint,
     seen_tokens:body.seen_tokens,expires_at:body.expires_at,updated_at:body.updated_at};
    const r=await rest(path,{method,body:record,prefer});return new Response(r.body,{status:r.status});
   }
   return deny('forbidden_route');
  }catch{return deny('broker_temporarily_unavailable',503);}
 };
}
