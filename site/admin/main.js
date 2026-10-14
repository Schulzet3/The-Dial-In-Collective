import {CLOUD_CONFIG} from '../cloud/config.js';
import {secureOrigin} from '../cloud/client.js';
import {e} from '../lib/ui.js';
import {renderAdminDashboard,renderAdminDenied} from './view.js';

const root=document.querySelector('#admin-root');
const notice=message=>`<header class="admin-top"><span class="admin-brand">The Dial In Collective</span><a href="/">Back to app</a></header><section class="admin-panel admin-empty"><h1>Admin dashboard unavailable</h1><p>${e(message)}</p></section>`;
async function start(){
 try {
  secureOrigin();
  if(!CLOUD_CONFIG.enabled||!globalThis.supabase?.createClient)throw new Error('Cloud access is not configured.');
  const sdk=globalThis.supabase.createClient(CLOUD_CONFIG.supabaseUrl,CLOUD_CONFIG.publishableKey,
   {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'dic_cloud_auth_v1'}});
  const {data:identity,error:userError}=await sdk.auth.getUser();
  if(userError||!identity?.user){root.innerHTML=renderAdminDenied('Sign in to your account from the main app first.');return;}
  const {data:status,error:statusError}=await sdk.rpc('dic_session_status');
  if(statusError)throw statusError;
  if(!status?.authenticated||!status?.admitted||!status?.admin){
   root.innerHTML=renderAdminDenied();return;
  }
  async function refresh(){
   const trigger=document.querySelector('#admin-refresh');if(trigger)trigger.disabled=true;
   const {data,error}=await sdk.rpc('dic_admin_dashboard');
   if(error)throw error;
   root.innerHTML=renderAdminDashboard(data);
   root.querySelector('#admin-refresh')?.addEventListener('click',()=>refresh().catch(ex=>{root.innerHTML=notice(ex.message||'Unable to load administrator data.');}));
  }
  await refresh();
 } catch(error) {root.innerHTML=notice(error.message||'Unable to verify administrator access.');}
}
start();
