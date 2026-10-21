// Official Supabase SDK adapter. No auth tokens are copied into application state.
export class CloudError extends Error {
 constructor(message,code='cloud_error',details=null){super(message);this.name='CloudError';this.code=code;this.details=details;}
}
const unwrap=r=>{if(r.error)throw new CloudError(r.error.message,r.error.code||'request_failed');return r.data;};
export function secureOrigin(location=globalThis.location,secure=globalThis.isSecureContext){
 if(!secure||!(location.protocol==='https:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname)))throw new CloudError('Use HTTPS or localhost for account access. The plain Wi-Fi address is not safe for passwords.','insecure_origin');
}
export function createCloudClient(sdk,{redirectUrl,assertSecure=secureOrigin,previewFetch=globalThis.fetch,previewPath='/api/coffee-preview'}={}){
 let cached=null;const listeners=new Set();
 const subscription=sdk.auth.onAuthStateChange((event,session)=>{
  cached=session?.user?{id:session.user.id,email:session.user.email}:null;
  const identity=cached?{...cached}:null;
  // SDK auth callbacks must finish before awaiting another SDK call.
  queueMicrotask(()=>{for(const fn of listeners)fn(event,identity);});
 }).data.subscription;
 return {
  cachedIdentity:()=>cached?{...cached}:null,
  async identity(){assertSecure();const r=unwrap(await sdk.auth.getUser());cached=r?.user?{id:r.user.id,email:r.user.email}:null;return cached?{...cached}:null;},
  // A local SDK session may select its own cached workspace, never authorize a remote RPC.
  async offlineIdentity(){
   assertSecure();
   if(globalThis.navigator?.onLine!==false)return null;
   try{
    const {data,error}=await sdk.auth.getSession();
    const session=data?.session,user=session?.user;
    if(error||!session?.access_token||!session?.refresh_token||!user?.id
      ||!Number.isFinite(session.expires_at)
      ||session.expires_at*1000<=Date.now()+30000)return null;
    return {id:user.id,email:user.email||''};
   }catch{return null;}
  },
  async signIn(email,password){assertSecure();return unwrap(await sdk.auth.signInWithPassword({email:email.trim(),password}));},
  async signUp(email,password){assertSecure();return unwrap(await sdk.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirectUrl}}));},
  async requestReset(email){assertSecure();unwrap(await sdk.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirectUrl}));return 'If that address has an account, a recovery email has been requested.';},
  async setPassword(password){assertSecure();return unwrap(await sdk.auth.updateUser({password}));},
  async signOut(){assertSecure();unwrap(await sdk.auth.signOut({scope:'local'}));cached=null;},
  async status(){assertSecure();return unwrap(await sdk.rpc('dic_session_status'));},
  async redeemInvite(token){assertSecure();const r=unwrap(await sdk.rpc('dic_redeem_invite',{token:token.trim()}));if(!r?.ok)throw new CloudError({verify_email:'Verify your email first.',invalid_invite:'This invitation is invalid, expired or exhausted.',rate_limited:'Too many attempts. Try again later.',access_revoked:'Your access was revoked. Contact the administrator.'}[r?.code]||'Invitation could not be accepted.',r?.code);return r;},
  async read(){assertSecure();return unwrap(await sdk.rpc('dic_read_personal_state'));},
   async findCoffeeMatches(payload){assertSecure();return unwrap(await sdk.rpc('dic_find_coffee_matches',{payload}));},
   async previewCoffeeUrl(source_url){
    assertSecure();
    // One URL lookup and one shared per-account rate claim. Do NOT invoke the
    // legacy curated preview first: two fetches would defeat the >=30-second
    // cooldown and unnecessarily consume member/provider requests.
    const {data,error}=await sdk.auth.getSession();
    const token=data?.session?.access_token;
    if(error||!token)throw new CloudError('Sign in before checking a coffee URL.','sign_in_required');
    let page;
    try{
     const response=await previewFetch(previewPath,{
      method:'POST',credentials:'same-origin',referrerPolicy:'no-referrer',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({source_url})
     });
     page=await response.json();
     if(!response.ok&&!page?.reason)page={ok:false,reason:'preview_unavailable'};
    }catch{return {ok:false,reason:'preview_unavailable'};}
    if(!page?.ok)return page||{ok:false,reason:'preview_unavailable'};
    try{
     const match=unwrap(await sdk.rpc('dic_find_coffee_matches',{
      payload:{...page.fields,source_url:page.source_url||source_url}
     }));
     return {...page,match};
    }catch{return {...page,match:null};}
   },
   async verifyCoffeeSource(submissionId){assertSecure();return unwrap(await sdk.functions.invoke('dic-verify-coffee',{body:{submission_id:submissionId}}));},
   async memberRetryPendingApproval(submissionId,expectedRevision){assertSecure();return unwrap(await sdk.rpc('dic_member_retry_pending_approval',{p_submission_id:submissionId,p_expected_revision:expectedRevision}));},
  // Authenticated, least-field Community endpoints. Never send owner IDs or
  // session tokens to the UI; Supabase membership is checked server-side.
  async listCommunityReviews(){assertSecure();const items=unwrap(await sdk.rpc('dic_my_community_outliers'));return Array.isArray(items)?items:[];},
  async confirmCommunityOutlier(shotId,expectedRevision){assertSecure();return unwrap(await sdk.rpc('dic_confirm_community_outlier',{p_shot_id:shotId,p_expected_revision:expectedRevision}));},
  async browseCommunityShots({limit=20,offset=0}={}){assertSecure();return unwrap(await sdk.rpc('dic_browse_community_shots',{p_limit:limit,p_offset:offset}));},
  async editCoffeeDetails(libraryEntryId,expectedRevision,details,sourceUrl){assertSecure();return unwrap(await sdk.rpc('dic_edit_my_coffee',{p_library_entry:libraryEntryId,p_expected_revision:expectedRevision,p_details:details,p_source_url:sourceUrl}));},
  async mutate(e){assertSecure();return unwrap(await sdk.rpc('dic_apply_client_change',{expected_owner:e.owner,mutation_id:e.id,action:e.action,payload:e.payload}));},
  async previewImport(owner,backup){assertSecure();if(!owner)throw new CloudError('Sign in before importing.','signed_out');return unwrap(await sdk.rpc('dic_preview_import',{expected_owner:owner,backup}));},
  async commitImport(owner,backup,reviewHash,recoverySaved){assertSecure();if(!owner)throw new CloudError('Sign in before importing.','signed_out');return unwrap(await sdk.rpc('dic_commit_import',{expected_owner:owner,backup,review_hash:reviewHash,recovery_saved:recoverySaved===true}));},
  onAuthChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  dispose(){subscription.unsubscribe();listeners.clear();}
 };
}

// New-password policy explicitly approved for the owner test.
export const PASSWORD_HINT='At least 8 characters, one uppercase letter (A-Z), and one special character.';
const PASSWORD_SYMBOLS="!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";
export function validateNewPassword(value){
 if(typeof value!=='string'||value.length<8)return 'Use at least 8 characters.';
 if(!/[A-Z]/.test(value))return 'Include at least one uppercase letter (A-Z).';
 if(![...value].some(character=>PASSWORD_SYMBOLS.includes(character)))return 'Include at least one special character (such as !, @, or #).';
 return null;
}
