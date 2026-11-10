// Netlify production-only scheduled delivery. Source-only until owner publishes and
// configures service-role + VAPID secrets; this has no publicly invokable route.
import {cleanPushTokens,addedPushTokens,sendEmptyAdminPush,endpointFingerprint,safePushEndpoint} from '../../src/server/admin-push.mjs';
const envDefault=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name];
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json','Cache-Control':'no-store'}});
export function createAdminPushPoller({fetcher=fetch,env=envDefault,now=()=>Date.now()}={}){
 return async()=>{
  const base=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY');
  const credentials={publicKey:env('DIC_ADMIN_PUSH_VAPID_PUBLIC_KEY'),privateKey:env('DIC_ADMIN_PUSH_VAPID_PRIVATE_KEY')};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(base||''))||!service||!credentials.publicKey||!credentials.privateKey)
   return response({ok:false,reason:'push_not_configured'},503);
  const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
  const rest=async(path,options={})=>{
   const r=await fetcher(base+'/rest/v1/'+path,{method:options.method||'GET',
    headers:{...headers,...(options.prefer?{Prefer:options.prefer}:{})},redirect:'error',cache:'no-store',
    ...(options.body===undefined?{}:{body:JSON.stringify(options.body)}),signal:AbortSignal.timeout(6000)});
   if(!r.ok)throw Error('Protected push aggregate unavailable');
   return r;
  };
  try{
   const [snapshotResponse,subscriptionsResponse]=await Promise.all([
    rest('rpc/dic_admin_push_snapshot',{method:'POST',body:{}}),
    rest('dic_admin_push_subscriptions?select=owner_id,endpoint,endpoint_hash,seen_tokens,expires_at&order=updated_at.asc&limit=50')
   ]);
   const snapshot=await snapshotResponse.json(),rows=await subscriptionsResponse.json();
   if(!Array.isArray(rows)||!Array.isArray(snapshot?.admin_ids))throw Error('No authenticated push snapshot');
   const tokens=cleanPushTokens(snapshot.tokens),admins=new Set(snapshot.admin_ids);
   let delivered=0,retired=0,failed=0;
   const process=async row=>{
    const hash=String(row?.endpoint_hash||'');
    if(!/^[0-9a-f]{64}$/.test(hash))return;
    const sameEndpoint=safePushEndpoint(row?.endpoint);
    const query='dic_admin_push_subscriptions?endpoint_hash=eq.'+hash;
    // Never deliver to someone without an active admitted administrator role.
    if(!admins.has(row.owner_id)||!sameEndpoint||endpointFingerprint(sameEndpoint)!==hash||
       Date.parse(row.expires_at)<now()){
     await rest(query,{method:'DELETE'});retired++;return;
    }
    const seen=cleanPushTokens(row.seen_tokens);
    const added=addedPushTokens(tokens,seen);
    if(added.length){
     const push=await sendEmptyAdminPush(sameEndpoint,credentials,{fetcher});
     if(push.gone){await rest(query,{method:'DELETE'});retired++;return;}
     if(!push.ok){failed++;return;}
     delivered++;
    }
    // Update only after successful delivery; resolved actions leave the baseline.
    if(added.length||JSON.stringify(seen)!==JSON.stringify(tokens))
     await rest(query,{method:'PATCH',prefer:'return=minimal',
      body:{seen_tokens:tokens,updated_at:new Date(now()).toISOString(),
       ...(added.length?{last_sent_at:new Date(now()).toISOString()}:{})}});
   };
   const results=await Promise.allSettled(rows.map(process));
   failed+=results.filter(x=>x.status==='rejected').length;
   return response({ok:failed===0,checked:rows.length,delivered,retired,failed},failed?503:200);
  }catch{return response({ok:false,reason:'push_poll_failed'},503);}
 };
}
export default createAdminPushPoller();
export const config={schedule:'*/5 * * * *'};
