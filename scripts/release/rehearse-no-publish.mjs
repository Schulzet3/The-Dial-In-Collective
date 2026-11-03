// No Git/Netlify/Supabase writes. Rehearse the exact release-isolation decision.
import {evaluateLocalQueue,assertApprovedReadyBatch} from './release-queue.mjs';
import {readFileSync} from 'node:fs';
export function rehearseRelease({assessment,grant}={}){
 if(!assessment?.ready)return {status:'DENIED_NO_PUBLICATION',ready:false,
  reasons:assessment?.errors||['No source-isolated READY batch']};
 try{assertApprovedReadyBatch(grant,assessment);}
 catch(error){return {status:'DENIED_NO_PUBLICATION',ready:false,reasons:[error.message]};}
 return {status:'SOURCE_AND_OWNER_SCOPE_PREFLIGHT_PASS_NO_PUBLICATION',ready:true,
  approved_ready_item_ids:assessment.ready_items.map(x=>x.id).sort(),
  note:'Provider, backup, exact-source CI and one-use release controller still require independent readback'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 try{
  const assessment=evaluateLocalQueue();
  const grantPath=process.argv[2];
  const grant=grantPath?JSON.parse(readFileSync(grantPath,'utf8')):null;
  const result=rehearseRelease({assessment,grant});
  console.log(JSON.stringify(result,null,2));
  if(!result.ready)process.exitCode=2;
 }catch(error){console.error('REHEARSAL DENIED: '+error.message);process.exitCode=2;}
}
