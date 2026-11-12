// Independent 5-minute approval notices. No production/client secrets in Netlify.
const PROJECT='https://azviqqejypsefzilgonr.supabase.co';
export function createMemberApprovalPoll({fetcher=fetch,env=name=>globalThis.Netlify?.env?.get?.(name)??process.env[name]}={}){
 return async()=>{
  if(env('SUPABASE_URL')!==PROJECT)return Response.json({ok:false,reason:'source_mismatch'},{status:503});
  try{
   const response=await fetcher(PROJECT+'/functions/v1/dic-member-approval-broker',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'poll'}),
    signal:AbortSignal.timeout(25000)
   });
   if(!response.ok)return Response.json({ok:false,reason:'notices_unavailable'},{status:503});
   const report=await response.json();
   return Response.json({ok:report?.ok===true,handled:Number(report?.handled||0)},
    {status:report?.ok===true?200:503});
  }catch{return Response.json({ok:false,reason:'notices_unavailable'},{status:503});}
 };
}
export default createMemberApprovalPoll();
export const config={schedule:'*/5 * * * *'};
