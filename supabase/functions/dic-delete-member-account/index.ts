// Issue #1676: only this server-side endpoint invokes the GoTrue admin delete.
// Never return success until both Auth user removal and DB finalization are verified.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {readBoundedJson,RequestBodyError} from '../_shared/request-budget.mjs';

const allowed=new Set(['https://app.dialincollective.com','https://the-dial-in-collective.netlify.app',
 'http://localhost:5173','http://localhost:8888']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(body,status,origin)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
  ...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}
});
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(origin&&!allowed.has(origin))return reply({ok:false,code:'origin_denied'},403,'');
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
  'Access-Control-Allow-Origin':allowed.has(origin)?origin:'null',
  'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Access-Control-Max-Age':'3600'
 }});
 if(request.method!=='POST')return reply({ok:false,code:'method_denied'},405,origin);
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return reply({ok:false,code:'sign_in_required'},401,origin);
 const base=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),
  secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!anon||!secret)return reply({ok:false,code:'not_configured'},503,origin);
 try {
  const payload=await readBoundedJson(request);
  const operation=payload?.operation_id;
  if(typeof operation!=='string'||!uuid.test(operation))return reply({ok:false,code:'bad_operation'},400,origin);
  const member=createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false},
   global:{headers:{Authorization:'Bearer '+token}}});
  const {data:identity,error:identityError}=await member.auth.getUser(token);
  if(identityError||!identity?.user?.id)return reply({ok:false,code:'sign_in_required'},401,origin);
  const {data:status,error:statusError}=await member.rpc('dic_session_status');
  if(statusError||status?.authenticated!==true||status?.admitted!==true||status?.admin!==true)
   return reply({ok:false,code:'admin_required'},403,origin);
  const service=createClient(base,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:prepared,error:prepareError}=await service.rpc('dic_admin_account_delete_prepare',{
   p_operation_id:operation,p_actor_id:identity.user.id
  });
  if(prepareError||!prepared?.ok)return reply({ok:false,code:'prepare_failed',retryable:true},409,origin);
  if(prepared.completed)return reply({ok:true,completed:true,community_removed:prepared.community_removed||0},200,origin);
  const target=prepared.target_id;
  if(typeof target!=='string'||!uuid.test(target)||target===identity.user.id)
   return reply({ok:false,code:'invalid_target',retryable:true},409,origin);
  // A transient failure may mean the GoTrue user was already deleted. Reconcile first.
  const {data:before,error:readError}=await service.auth.admin.getUserById(target);
  if(!readError&&before?.user){
   const {error:deleteError}=await service.auth.admin.deleteUser(target,false);
   if(deleteError){
    const {data:after,error:checkError}=await service.auth.admin.getUserById(target);
    if(!checkError&&after?.user)
     return reply({ok:false,code:'auth_delete_failed',retryable:true},409,origin);
    if(checkError?.status!==404)
     return reply({ok:false,code:'auth_uncertain',retryable:true},503,origin);
   }
  }else if(readError?.status!==404){
   return reply({ok:false,code:'auth_lookup_failed',retryable:true},503,origin);
  }
  const {data:final,error:finalError}=await service.rpc('dic_admin_account_delete_finish',{
   p_operation_id:operation,p_actor_id:identity.user.id
  });
  if(finalError||final?.completed!==true)return reply({ok:false,code:'finalize_failed',retryable:true},503,origin);
  return reply({ok:true,completed:true,community_removed:final.community_removed||0},200,origin);
 }catch (error) {
  if(error instanceof RequestBodyError)return reply({ok:false,code:error.code},error.status,origin);
  return reply({ok:false,code:'operation_failed',retryable:true},503,origin);
 }
});
