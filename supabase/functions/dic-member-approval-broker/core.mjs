// #2258: service-only transactional approval notices, separate from Admin push ACLs.
// The public poll trigger never returns member identifiers, email or endpoints.
const PROJECT='https://azviqqejypsefzilgonr.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const SUBS='dic_member_approval_push_subscriptions';
const reply=(data,status=200)=>Response.json(data,{status,headers:{
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const denied=(status=403)=>reply({ok:false,reason:'unavailable'},status);
const decode64=s=>{
 const str=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
 return Uint8Array.from(str,c=>c.charCodeAt(0));
};
const encode64=bytes=>{
 let str='';for(const b of bytes)str+=String.fromCharCode(b);
 return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const fingerprint=async endpoint=>[...new Uint8Array(await crypto.subtle.digest(
 'SHA-256',new TextEncoder().encode(endpoint)))].map(x=>x.toString(16).padStart(2,'0')).join('');
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
const emailSender=value=>typeof value==='string'&&
 /^[a-z0-9._+-]+@(?:[a-z0-9-]+\.)*dialincollective\.com$/i.test(value)?value:null;
async function vapidAuthorization(endpoint,key,now){
 const pub=decode64(key.publicKey),secret=decode64(key.privateKey);
 if(pub.length!==65||pub[0]!==4||secret.length!==32)throw Error('Missing VAPID');
 const jwk={kty:'EC',crv:'P-256',x:encode64(pub.slice(1,33)),
  y:encode64(pub.slice(33,65)),d:encode64(secret),ext:true};
 const priv=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const header=encode64(new TextEncoder().encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
 const payload=encode64(new TextEncoder().encode(JSON.stringify({
  aud:new URL(endpoint).origin,exp:Math.floor(now()/1000)+3600,sub:'https://app.dialincollective.com'})));
 const unsigned=header+'.'+payload;
 const signature=encode64(new Uint8Array(await crypto.subtle.sign(
  {name:'ECDSA',hash:'SHA-256'},priv,new TextEncoder().encode(unsigned))));
 return 'vapid t='+unsigned+'.'+signature+', k='+key.publicKey;
}
export function createMemberApprovalBroker({
 env=name=>Deno.env.get(name),fetcher=fetch,now=()=>Date.now()
}={}){
 return async request=>{
  if(request.method!=='POST')return denied(405);
  const raw=await request.text().catch(()=>'');
  if(!raw||raw.length>4500)return denied(413);
  let input;
  try{input=JSON.parse(raw);}catch{return denied(400);}
  if(!input||typeof input!=='object'||Array.isArray(input)||
    !['key','status','subscribe','unsubscribe','poll'].includes(input.op))return denied(400);
  let service,publishable;
  try{
   service=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default||env('SUPABASE_SERVICE_ROLE_KEY');
   publishable=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||env('SUPABASE_ANON_KEY');
  }catch{return denied(503);}
  if(env('SUPABASE_URL')!==PROJECT||!service||!publishable)return denied(503);
  const serviceHeaders={apikey:service,'Content-Type':'application/json',
   ...(service.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+service})};
  const rest=async(path,{method='GET',body,prefer}={})=>{
   const result=await fetcher(PROJECT+'/rest/v1/'+path,{
    method,redirect:'error',cache:'no-store',
    headers:{...serviceHeaders,...(prefer?{Prefer:prefer}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000)});
   if(!result.ok)throw Error('Protected notice storage unavailable');
   return result;
  };
  const rpc=async(name,body={})=>(await rest('rpc/'+name,{method:'POST',body})).json();
  const keys=async()=>await rpc('dic_admin_push_runtime_keys');
  const ensureKeys=async()=>{
   let key=await keys();if(key)return key;
   // Reuses Vault's existing one-use P-256 recipient; never rotates or exports it.
   const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
   const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
   const publicKey=encode64(Uint8Array.from([4,...decode64(jwk.x),...decode64(jwk.y)]));
   await rpc('dic_admin_push_bootstrap_key',{p_public_key:publicKey,p_private_key:jwk.d});
   key=await keys();
   if(!key?.publicKey||!key.privateKey)throw Error('Vault bootstrap unavailable');
   return key;
  };
  const account=async()=>{
   const match=/^Bearer ([A-Za-z0-9._~-]{24,6000})$/.exec(request.headers.get('authorization')||'');
   if(!match)return null;
   const headers={apikey:publishable,Authorization:'Bearer '+match[1]};
   const user=await fetcher(PROJECT+'/auth/v1/user',{
    headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
   if(!user.ok)return null;
   const identity=await user.json();
   if(!UUID.test(String(identity?.id||'')))return null;
   const statusResponse=await fetcher(PROJECT+'/rest/v1/rpc/dic_session_status',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{...headers,'Content-Type':'application/json'},body:'{}',
    signal:AbortSignal.timeout(6500)});
   if(!statusResponse.ok)return null;
   const status=await statusResponse.json();
   if(status?.authenticated!==true||status?.emailVerified!==true||status?.admin===true)return null;
   return {id:identity.id,status};
  };
  try{
   if(input.op!=='poll'){
    if(Object.keys(input).some(k=>!['op','endpoint'].includes(k)))return denied(400);
    const member=await account();
    if(!member)return denied(403);
    if(input.op==='key'){
     if(Object.keys(input).length!==1||member.status.admitted||
      member.status.approvalState!=='pending')return denied(403);
     const key=await ensureKeys();return reply({ok:true,publicKey:key.publicKey});
    }
    const endpoint=safeEndpoint(input.endpoint);
    if(!endpoint)return denied(400);
    const hash=await fingerprint(endpoint);
    const route=SUBS+'?endpoint_hash=eq.'+hash;
    if(input.op==='status'){
     const found=await (await rest(route+'&select=owner_id&limit=1')).json();
     return reply({ok:true,subscribed:found.length===1&&found[0].owner_id===member.id});
    }
    if(input.op==='unsubscribe'){
     await rest(route+'&owner_id=eq.'+member.id,{method:'DELETE'});
     return reply({ok:true,subscribed:false});
    }
    if(input.op!=='subscribe'||member.status.admitted||
     member.status.approvalState!=='pending')return denied(403);
    const existing=await (await rest(route+'&select=owner_id&limit=1')).json();
    if(existing.length&&existing[0].owner_id!==member.id)return denied(409);
    const owned=await (await rest(SUBS+'?owner_id=eq.'+member.id+
      '&select=endpoint_hash&limit=4')).json();
    if(!existing.length&&owned.length>=3)return denied(429);
    const key=await ensureKeys();
    if(!key.publicKey)return denied(503);
    await rest(SUBS+'?on_conflict=endpoint_hash',{
     method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
     body:{endpoint_hash:hash,owner_id:member.id,endpoint,
      expires_at:new Date(now()+60*86400000).toISOString(),updated_at:new Date(now()).toISOString()}});
    return reply({ok:true,subscribed:true});
   }
   // No requester data, no ad-hoc recipient arguments, no caller-selected event.
   if(Object.keys(input).length!==1)return denied(400);
   if(await rpc('dic_member_approval_claim_poll')!==true)return reply({ok:true,handled:0});
   let handled=0,failed=0,unconfigured=false;
   const key=await keys();
   const sendPush=async(endpoint,keyData)=>{
    const safe=safeEndpoint(endpoint);if(!safe)throw Error('Untrusted endpoint');
    const auth=await vapidAuthorization(safe,keyData,now);
    const sent=await fetcher(safe,{method:'POST',redirect:'error',cache:'no-store',
     headers:{Authorization:auth,TTL:'300',Urgency:'normal'},
     signal:AbortSignal.timeout(6000)});
    return {ok:sent.ok,gone:sent.status===404||sent.status===410};
   };
   const apiKey=env('RESEND_API_KEY'),from=emailSender(env('DIC_APPROVAL_FROM_EMAIL'));
   for(const channel of ['push','email']){
    if(channel==='email'&&(!apiKey||!from)){unconfigured=true;continue;}
    const batches=await rpc('dic_member_approval_claim',{p_channel:channel,p_limit:12});
    if(!Array.isArray(batches)||batches.length>12)throw Error('Invalid protected claim');
    const results=await Promise.allSettled(batches.map(async item=>{
     const eventId=item?.eventId,token=item?.claimToken;
     if(!Number.isSafeInteger(eventId)||eventId<1||!UUID.test(String(token||'')))
      throw Error('Invalid protected delivery');
     let outcome='retry';
     try{
      if(channel==='email'){
       const email=String(item.email||'');
       if(email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        throw Error('Invalid verified email');
       const sent=await fetcher('https://api.resend.com/emails',{
        method:'POST',redirect:'error',cache:'no-store',
        headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json',
         'Idempotency-Key':'dic-member-account-approved-'+eventId},
        body:JSON.stringify({
         from,to:[email],subject:'Your Dial In Collective account is approved',
         text:'Your account is approved. You can now sign in to The Dial In Collective at https://app.dialincollective.com/ .\n\nIf you did not request this account, please ignore this email.'
        }),signal:AbortSignal.timeout(7000)});
       const receipt=await sent.json().catch(()=>null);
       if(!sent.ok||typeof receipt?.id!=='string'||receipt.id.length<8)
        throw Error('Email provider did not accept the message');
       outcome='sent';
      }else{
       const endpoints=item.endpoints;
       if(!Array.isArray(endpoints)||endpoints.length>3)throw Error('Invalid device list');
       if(!endpoints.length)outcome='skipped';
       else {
        if(!key)throw Error('Vault key unavailable');
        const checks=await Promise.allSettled(endpoints.map(async ep=>{
         if(!HASH.test(String(ep?.hash||''))||!safeEndpoint(ep?.endpoint)||
           await fingerprint(ep.endpoint)!==ep.hash)throw Error('Malformed endpoint');
         const result=await sendPush(ep.endpoint,key);
         const route=SUBS+'?endpoint_hash=eq.'+ep.hash;
         if(result.gone)await rest(route,{method:'DELETE'});
         else if(result.ok)await rest(route,{method:'PATCH',prefer:'return=minimal',
          body:{last_sent_event_id:eventId,updated_at:new Date(now()).toISOString()}});
         else throw Error('Push provider did not accept the message');
        }));
        if(checks.some(c=>c.status==='rejected'))throw Error('Some devices not acknowledged');
        outcome='sent';
       }
      }
     }catch{/* Do not log member email, push endpoint, tokens, or secrets. */}
     const finished=await rpc('dic_member_approval_finish',{
      p_event_id:eventId,p_channel:channel,p_claim_token:token,p_outcome:outcome});
     if(finished!==true||outcome==='retry')throw Error('Delivery not acknowledged');
     return outcome;
    }));
    handled+=results.filter(x=>x.status==='fulfilled').length;
    failed+=results.filter(x=>x.status==='rejected').length;
   }
   return reply({ok:failed===0&&!unconfigured,handled,
    ...(unconfigured?{reason:'email_not_configured'}:{})},failed||unconfigured?503:200);
  }catch{return denied(503);}
 };
}
