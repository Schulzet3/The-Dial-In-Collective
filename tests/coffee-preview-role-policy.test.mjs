import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPreviewHandler} from '../netlify/functions/coffee-url-preview.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261113043000_dic_admin_preview_unlimited_member_15s.sql');
const sqlScope=name=>{
 const start=sql.indexOf('create or replace function '+name);
 assert.notEqual(start,-1,'Missing SQL function '+name);
 const end=sql.indexOf('end $$;',start);
 assert.ok(end>start,'Unterminated SQL function '+name);
 return sql.slice(start,end+7);
};
const shared=sqlScope('private.dic_shared_preview_claim');
const preflight=sqlScope('public.dic_preview_preflight');
const complete=sqlScope('public.dic_preview_complete');

test('owner quota supersession is server authoritative with no legacy roaster gate',()=>{
 assert.match(shared,/join private\.app_admins|from private\.app_admins/);
 assert.match(shared,/join private\.beta_members m on m\.owner_id=a\.owner_id/);
 assert.match(shared,/m\.enabled and m\.admitted_at is not null/);
 assert.match(shared,/u\.email_confirmed_at is not null/);
 assert.ok(shared.indexOf('if exists(')<shared.indexOf('insert into private.dic_url_preview_attempts'));
 assert.match(shared,/rec\.attempts>=12/);
 assert.match(shared,/interval '15 seconds'/);
 assert.doesNotMatch(shared,/interval '30 seconds'/);
 assert.match(sql,/revoke all on function private\.dic_shared_preview_claim\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function private\.dic_shared_preview_claim\(uuid\) to service_role/);
 // Old curated Supabase preview is permanently retired. Per-account quotas
 // remain enforced by the server-side current universal preview RPC.
 const legacy=read('supabase/functions/dic-preview-coffee/index.ts');
 assert.match(legacy,/retired_endpoint/);
 assert.doesNotMatch(legacy,/dic_url_preview_claim|dic_roaster_preview_target|officialPreviewUrl\(/);
 assert.match(read('site/cloud/client.js'),/previewPath='\/api\/coffee-preview'/);
});
test('cached and fresh universal RPC skip all account quotas only AFTER admission and verified email',()=>{
 assert.match(preflight,/auth\.uid\(\)/);
 assert.match(preflight,/auth\.role\(\) is distinct from 'authenticated'/);
 assert.match(preflight,/not private\.is_member\(\)/);
 assert.match(preflight,/u\.email_confirmed_at is not null/);
 assert.match(preflight,/p_cached is null/);
 assert.ok(preflight.indexOf('if private.is_admin()')>preflight.indexOf('p_cached is null'));
 assert.ok(preflight.indexOf('if private.is_admin()')<preflight.indexOf('insert into private.dic_url_preview_attempts'));
 assert.match(preflight,/if p_cached then\s*return jsonb_build_object\('allowed',true,'cached',true,'unlimited',true\)/);
 assert.match(preflight,/gen_random_uuid\(\)/);
 assert.match(preflight,/not p_cached and rec\.attempts>=12/);
 assert.match(preflight,/interval '15 seconds'/);
 assert.doesNotMatch(preflight,/interval '30 seconds'/);
});
test('admin completion never writes quota while member ticket remains guarded and capped',()=>{
 assert.match(complete,/p_ticket is null.*invalid_ticket/);
 assert.match(complete,/if private\.is_admin\(\)/);
 assert.ok(complete.indexOf('if private.is_admin()')<complete.indexOf('select * into rec from private.dic_url_preview_attempts'));
 assert.match(complete,/rec\.preview_ticket is distinct from p_ticket/);
 assert.match(complete,/rec\.preview_ticket_at<now\(\)-interval '25 seconds'/);
 assert.match(complete,/rec\.attempts>=12/);
 assert.match(complete,/set attempts=rec\.attempts\+1/);
 const ui=read('site/cloud/coffee-url-autofill.js');
 assert.match(ui,/preview_cooldown:'Please wait 15 seconds between coffee URL lookups\.'/);
 const client=read('site/cloud/client.js');
 assert.doesNotMatch(client,/>=30-second cooldown/);
});
const env=key=>key==='SUPABASE_URL'?'https://test.supabase.co':'sb_publishable_test';
const validUrl='https://roaster.com/products/espresso';
const request=()=>new Request('https://app.example/api/coffee-preview',{
 method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},
 body:JSON.stringify({source_url:validUrl})
});
function fixture({allowed=true,admitted=true,emailVerified=true}={}){
 const calls=[];let reads=0;
 const apiFetch=async url=>{
  const path=new URL(url).pathname;calls.push(path);
  let value=null;
  if(path==='/auth/v1/user')value={id:'verified-admin-or-member'};
  else if(path.endsWith('/rpc/dic_session_status'))value={admitted,emailVerified};
  else if(path.endsWith('/rpc/dic_preview_preflight'))value=allowed?{allowed:true,ticket:'00000000-0000-4000-8000-000000000123'}:{allowed:false,reason:'preview_cooldown'};
  else if(path.endsWith('/rpc/dic_preview_complete'))value={charged:true};
  return new Response(JSON.stringify(value),{status:200});
 };
 const handler=createPreviewHandler({env,apiFetch,
  readHtml:async()=>{reads++;return {ok:true,html:'<html>Product</html>'};},
  extract:()=>({ok:true,fields:{name:'Coffee',roaster:'Roaster'}})});
 return {handler,calls,reads:()=>reads};
}
test('Netlify preview accepts server-authorized unlimited claim, reuses cached read and retains identity gate',async()=>{
 const f=fixture();
 const first=await f.handler(request());assert.equal(first.status,200);
 assert.equal((await first.json()).fields.name,'Coffee');
 const again=await f.handler(request());assert.equal(again.status,200);
 assert.equal((await again.json()).cached,true);
 assert.equal(f.reads(),1);
 assert.equal(f.calls.filter(x=>x.endsWith('/rpc/dic_preview_preflight')).length,2);
 assert.equal(f.calls.filter(x=>x.endsWith('/rpc/dic_preview_complete')).length,1);
 const rejected=fixture({admitted:false});const bad=await rejected.handler(request());
 assert.equal(bad.status,403);
 assert.equal(rejected.reads(),0);
});
test('member 15-second cooldown reply is denied before any external fetch',async()=>{
 const f=fixture({allowed:false});const res=await f.handler(request());
 assert.equal(res.status,429);assert.equal((await res.json()).reason,'preview_cooldown');
 assert.equal(f.reads(),0);
});
test('infrastructure per-IP safety throttle remains unchanged for every visitor',()=>{
 const source=read('netlify/functions/coffee-url-preview.mjs');
 assert.match(source,/windowSize:60,windowLimit:12,aggregateBy:\['ip'\]/);
 assert.match(source,/safeCoffeeUrl\(source_url\)/);
});
