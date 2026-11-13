// Legacy curated Supabase preview endpoint RETIRED. Modern Add Coffee always
// uses the SSRF-guarded universal Netlify /api/coffee-preview endpoint.
// No roaster registration or domain allowlist may ever gate user URL extraction.
// Retain a narrow 410 tombstone until a separately authorized release removes
// the deployed old Edge function. NEVER forward a member JWT to an external URL.
const allowOrigins=new Set([
 'https://app.dialincollective.com','https://the-dial-in-collective.netlify.app',
 'http://localhost:5173','http://localhost:8888'
]);
Deno.serve(req=>{
 const origin=req.headers.get('origin')||'';
 const headers=new Headers({'Content-Type':'application/json;charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 if(allowOrigins.has(origin)){
  headers.set('Access-Control-Allow-Origin',origin);
  headers.set('Vary','Origin');
 }
 if(req.method==='OPTIONS'){
  if(!allowOrigins.has(origin))return new Response(null,{status:403,headers});
  headers.set('Access-Control-Allow-Methods','POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers','authorization,apikey,x-client-info,content-type');
  return new Response(null,{status:204,headers});
 }
 if(req.method!=='POST')return new Response(JSON.stringify({ok:false,reason:'method_not_allowed'}),{status:405,headers});
 return new Response(JSON.stringify({ok:false,reason:'retired_endpoint',
  message:'Open Add Coffee in the current app to autofill from any public HTTPS roaster product URL.'}),
  {status:410,headers});
});
