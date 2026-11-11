// Push transports carry no member, coffee, or private activity data.
import {createHash,createPrivateKey,sign} from 'node:crypto';

const ALLOWED_HOSTS=new Set(['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com']);
export function safePushEndpoint(value){
 if(typeof value!=='string'||value.length<20||value.length>2048)return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!ALLOWED_HOSTS.has(url.hostname))return null;
  if(!url.pathname||url.pathname==='/')return null;
  return url.href;
 }catch{return null;}
}
export const endpointFingerprint=endpoint=>createHash('sha256').update(endpoint).digest('hex');
export function cleanPushTokens(input){
 if(!Array.isArray(input)||input.length>4000)throw Error('Invalid action-token list');
 const seen=new Set();
 for(const token of input){
  if(typeof token!=='string'||!/^(signup|coffee|delete):[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(token))throw Error('Invalid action-token value');
  seen.add(token);
 }
 return [...seen].sort();
}
export function addedPushTokens(current,seen){
 const previous=new Set(cleanPushTokens(seen));
 return cleanPushTokens(current).filter(token=>!previous.has(token));
}
function encoded(value){return Buffer.from(JSON.stringify(value)).toString('base64url');}
export function vapidAuthorization(endpoint,{publicKey,privateKey,subject='https://app.dialincollective.com'},now=Math.floor(Date.now()/1000)){
 const verified=safePushEndpoint(endpoint);
 if(!verified)throw Error('Untrusted push endpoint');
 const pub=Buffer.from(String(publicKey||''),'base64url');
 const priv=Buffer.from(String(privateKey||''),'base64url');
 if(pub.length!==65||pub[0]!==4||priv.length!==32||!/^https:\/\//.test(subject))throw Error('Push credentials unavailable');
 const jwk={kty:'EC',crv:'P-256',x:pub.subarray(1,33).toString('base64url'),y:pub.subarray(33,65).toString('base64url'),d:priv.toString('base64url')};
 const signingKey=createPrivateKey({key:jwk,format:'jwk'});
 const header=encoded({typ:'JWT',alg:'ES256'});
 const payload=encoded({aud:new URL(verified).origin,exp:now+3600,sub:subject});
 const unsigned=header+'.'+payload;
 const signature=sign('sha256',Buffer.from(unsigned),{key:signingKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
 return 'vapid t='+unsigned+'.'+signature+', k='+publicKey;
}
export async function sendEmptyAdminPush(endpoint,credentials,{fetcher=fetch,signal}={}){
 const verified=safePushEndpoint(endpoint);
 if(!verified)throw Error('Untrusted push endpoint');
 const response=await fetcher(verified,{method:'POST',redirect:'error',cache:'no-store',
  headers:{Authorization:vapidAuthorization(verified,credentials),TTL:'300',Urgency:'normal'},
  signal:signal||AbortSignal.timeout(6000)});
 return {ok:response.ok,gone:response.status===404||response.status===410,status:response.status};
}
