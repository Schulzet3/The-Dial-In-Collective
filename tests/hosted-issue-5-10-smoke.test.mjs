import test from 'node:test';
import assert from 'node:assert/strict';

const run=process.env.DIC_PUBLIC_HOSTED_PROBE==='1'?test:test.skip;
const fetchSafety=async(url,options={})=>fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),...options});
const app='https://app.dialincollective.com';
const edge='https://azviqqejypsefzilgonr.supabase.co/functions/v1';

run('published application serves its sign-in shell',async()=>{
 const res=await fetchSafety(app+'/');
 assert.equal(res.status,200,'Production application should serve');
 assert.match(res.headers.get('content-type')||'',/text\/html/i);
});

run('published admin route serves its shell without granting private data',async()=>{
 const res=await fetchSafety(app+'/admin.html');
 assert.equal(res.status,200);
 assert.match(res.headers.get('content-type')||'',/text\/html/i);
});

for(const slug of ['dic-verify-coffee','dic-preview-coffee']){
 run(slug+' rejects requests without an authenticated JWT',async()=>{
  const res=await fetchSafety(edge+'/'+slug,{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({submission_id:'00000000-0000-4000-8000-000000000001'})
  });
  assert.equal(res.status,401,'Anonymous request must be denied');
 });
 run(slug+' rejects forged JWT without touching member data',async()=>{
  const res=await fetchSafety(edge+'/'+slug,{
   method:'POST',headers:{authorization:'Bearer deliberately.invalid.jwt','content-type':'application/json'},
   body:JSON.stringify({submission_id:'00000000-0000-4000-8000-000000000001'})
  });
  assert.equal(res.status,401,'Invalid bearer token must be denied');
 });
}
