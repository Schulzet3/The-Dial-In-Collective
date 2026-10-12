// Official Supabase SDK adapter. No auth tokens are copied into application state.
export class CloudError extends Error {
 constructor(message,code='cloud_error',details=null){super(message);this.name='CloudError';this.code=code;this.details=details;}
}
const unwrap=r=>{if(r.error)throw new CloudError(r.error.message,r.error.code||'request_failed');return r.data;};
export function secureOrigin(location=globalThis.location,secure=globalThis.isSecureContext){
 if(!secure||!(location.protocol==='https:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname)))throw new CloudError('Use HTTPS or localhost for account access. The plain Wi-Fi address is not safe for passwords.','insecure_origin');
}
export function createCloudClient(sdk,{redirectUrl,assertSecure=secureOrigin}={}){
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
  async signIn(email,password){assertSecure();return unwrap(await sdk.auth.signInWithPassword({email:email.trim(),password}));},
  async signUp(email,password){assertSecure();return unwrap(await sdk.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirectUrl}}));},
  async requestReset(email){assertSecure();unwrap(await sdk.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirectUrl}));return 'If that address has an account, a recovery email has been requested.';},
  async setPassword(password){assertSecure();return unwrap(await sdk.auth.updateUser({password}));},
  async signOut(){assertSecure();unwrap(await sdk.auth.signOut({scope:'local'}));cached=null;},
  async status(){assertSecure();return unwrap(await sdk.rpc('dic_session_status'));},
  async redeemInvite(token){assertSecure();const r=unwrap(await sdk.rpc('dic_redeem_invite',{token:token.trim()}));if(!r?.ok)throw new CloudError({verify_email:'Verify your email first.',invalid_invite:'This invitation is invalid, expired or exhausted.',rate_limited:'Too many attempts. Try again later.',access_revoked:'Your access was revoked. Contact the administrator.'}[r?.code]||'Invitation could not be accepted.',r?.code);return r;},
  async read(){assertSecure();return unwrap(await sdk.rpc('dic_read_personal_state'));},
  async mutate(e){assertSecure();return unwrap(await sdk.rpc('dic_apply_client_change',{expected_owner:e.owner,mutation_id:e.id,action:e.action,payload:e.payload}));},
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
