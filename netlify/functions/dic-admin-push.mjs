// Private, role-verified API for one administrator's device subscriptions.
// The browser never receives service-role credentials or any VAPID private key.
import {safePushEndpoint,endpointFingerprint,cleanPushTokens} from '../../src/server/admin-push.mjs';

const envDefault=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const urlAllowed=url=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(url||''));
function config(env){
 return {url:env('SUPABASE_URL'),publishable:env('SUPABASE_PUBLISHABLE_KEY'),
  service:env('SUPABASE_SECRET_KEY')||env('SUPABASE_SERVICE_ROLE_KEY'),publicKey:env('DIC_ADMIN_PUSH_VAPID_PUBLIC_KEY')};
}
export function createAdminPushHandler({fetcher=fetch,env=envDefault}={}){
 return async request=>{
  try{
   const cfg=config(env);
   if(!urlAllowed(cfg.url)||!cfg.publishable||!cfg.service||!cfg.publicKey)
    return response({ok:false,reason:'push_not_configured'},503);
   if(!['GET','POST','DELETE'].includes(request.method))return response({ok:false},405);
   const bearer=/^Bearer ([A-Za-z0-9._~-]{24,6000})$/.exec(request.headers.get('authorization')||'');
   if(!bearer)return response({ok:false,reason:'sign_in_required'},401);
   const authHeaders={apikey:cfg.publishable,Authorization:'Bearer '+bearer[1]};
   // Revalidate the signed-in account at Supabase. Never trust a client role flag.
   const userReq=await fetcher(cfg.url+'/auth/v1/user',{headers:authHeaders,redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(6500)});
   if(!userReq.ok)return response({ok:false,reason:'sign_in_required'},401);
   const user=await userReq.json();
   if(!uuid.test(String(user?.id||'')))return response({ok:false},401);
   const roleReq=await fetcher(cfg.url+'/rest/v1/rpc/dic_session_status',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{...authHeaders,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(6500)});
   if(!roleReq.ok)return response({ok:false,reason:'not_administrator'},403);
   const status=await roleReq.json();
   if(!status?.authenticated||!status?.admitted||!status?.admin)return response({ok:false,reason:'not_administrator'},403);
   if(request.method==='GET')return response({ok:true,publicKey:cfg.publicKey});
   const raw=await request.text();
   if(raw.length>4096)return response({ok:false,reason:'invalid_subscription'},413);
   let data;
   try{data=JSON.parse(raw);}catch{return response({ok:false,reason:'invalid_subscription'},400);}
   const endpoint=safePushEndpoint(data?.endpoint);
   if(!endpoint)return response({ok:false,reason:'invalid_subscription'},400);
   const serviceHeaders={apikey:cfg.service,'Content-Type':'application/json',
    ...(cfg.service.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+cfg.service})};
   const rest=async(path,options={})=>{
    const result=await fetcher(cfg.url+'/rest/v1/'+path,{redirect:'error',cache:'no-store',
     headers:{...serviceHeaders,...(options.prefer?{Prefer:options.prefer}:{})},
     method:options.method||'GET',...(options.body===undefined?{}:{body:JSON.stringify(options.body)}),
     signal:AbortSignal.timeout(6500)});
    if(!result.ok)throw Error('Private push storage failed');
    return result;
   };
   const hash=endpointFingerprint(endpoint);
   if(request.method==='DELETE'){
    await rest('dic_admin_push_subscriptions?endpoint_hash=eq.'+hash+'&owner_id=eq.'+user.id,{method:'DELETE'});
    return response({ok:true,subscribed:false});
   }
   const snapshotResponse=await rest('rpc/dic_admin_push_snapshot',{method:'POST',body:{}});
   const snapshot=await snapshotResponse.json();
   if(!Array.isArray(snapshot?.admin_ids)||!snapshot.admin_ids.includes(user.id))
    return response({ok:false,reason:'not_administrator'},403);
   const tokens=cleanPushTokens(snapshot.tokens);
   const expiresAt=new Date(Date.now()+60*86400*1000).toISOString();
   await rest('dic_admin_push_subscriptions?on_conflict=endpoint_hash',{method:'POST',
    prefer:'resolution=merge-duplicates,return=minimal',
    body:{endpoint_hash:hash,owner_id:user.id,endpoint,seen_tokens:tokens,expires_at:expiresAt,updated_at:new Date().toISOString()}});
   return response({ok:true,subscribed:true});
  }catch{return response({ok:false,reason:'push_temporarily_unavailable'},503);}
 };
}
export default createAdminPushHandler();
export const config={path:'/api/admin-push',method:['GET','POST','DELETE']};
