import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,verify} from 'node:crypto';
import {safePushEndpoint,cleanPushTokens,addedPushTokens,vapidAuthorization,sendEmptyAdminPush} from '../src/server/admin-push.mjs';

const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=publicKey.export({format:'jwk'}),privateJwk=privateKey.export({format:'jwk'});
const credentials={publicKey:Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url'),privateKey:privateJwk.d};
const endpoint='https://web.push.apple.com/9/opaque-device-endpoint';
const id='30000000-0000-4000-8000-000000000001';

test('Web Push endpoints only permit exact known HTTPS provider hostnames',()=>{
 assert.equal(safePushEndpoint(endpoint),endpoint);
 for(const url of ['https://web.push.apple.com.evil.com/1','https://fcm.googleapis.com@127.0.0.1/1',
  'http://web.push.apple.com/1','https://web.push.apple.com:444/1',
  'https://127.0.0.1/1','https://web.push.apple.com/#fragment','file:///tmp/test']){
  assert.equal(safePushEndpoint(url),null,url);
 }
});
test('Admin action-token diff is stable and excludes arbitrary private strings',()=>{
 const old=['coffee:'+id];
 const now=['coffee:'+id,'signup:'+id,'delete:'+id];
 assert.deepEqual(addedPushTokens(now,old),['delete:'+id,'signup:'+id]);
 assert.deepEqual(addedPushTokens(now,now),[]);
 assert.throws(()=>cleanPushTokens(['member@example.com']),/Invalid/);
 assert.throws(()=>cleanPushTokens([{}]),/Invalid/);
});
test('VAPID JWT is valid ES256 and binds Apple push origin to one-hour expiration',()=>{
 const header=vapidAuthorization(endpoint,credentials,1800000000);
 const match=/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
 assert.ok(match);
 assert.deepEqual(JSON.parse(Buffer.from(match[1],'base64url').toString()),{typ:'JWT',alg:'ES256'});
 assert.deepEqual(JSON.parse(Buffer.from(match[2],'base64url').toString()),{
  aud:'https://web.push.apple.com',exp:1800003600,sub:'https://app.dialincollective.com'});
 assert.equal(verify('sha256',Buffer.from(match[1]+'.'+match[2]),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(match[3],'base64url')),true);
});
test('Content-free push has no private payload and does not follow redirects',async()=>{
 let options;
 const result=await sendEmptyAdminPush(endpoint,credentials,{fetcher:async(url,opts)=>{
  assert.equal(url,endpoint);options=opts;return {ok:true,status:201};
 }});
 assert.deepEqual(result,{ok:true,gone:false,status:201});
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
 assert.equal(options.body,undefined);assert.equal(options.headers.TTL,'300');
 assert.ok(options.headers.Authorization.startsWith('vapid t='));
});
test('Admin push migration grants no anonymous, member, or general public access',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261110235000_dic_admin_web_push.sql',import.meta.url),'utf8');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.dic_admin_push_subscriptions from public,anon,authenticated/);
 assert.match(sql,/grant select,insert,update,delete on public\.dic_admin_push_subscriptions to service_role/);
 assert.match(sql,/revoke all on function public\.dic_admin_push_snapshot\(\) from public,anon,authenticated/);
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/phase<>'completed'/);
});
