// Read-only GitHub Actions exact-source immutable artifact discovery.
// Never select an artifact by name alone: require a successful source-bound run.
const REPO='Schulzet3/The-Dial-In-Collective';
const SHA=/^[a-f0-9]{40}$/;
export async function discoverCertifiedArtifacts({token,sourceSha,fetcher=fetch}={}){
 if(!token||!SHA.test(sourceSha||''))throw Error('GitHub token or exact source SHA missing');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json'};
 const get=async url=>{
  const r=await fetcher(url,{method:'GET',headers});
  if(!r.ok)throw Error('Cannot verify GitHub CI artifact provenance');
  return r.json();
 };
 const runs=await get('https://api.github.com/repos/'+REPO+
  '/actions/workflows/dic-ready-batch-certification.yml/runs?head_sha='+sourceSha+'&per_page=100');
 const eligible=(runs.workflow_runs||[]).filter(r=>r.head_sha===sourceSha&&
  r.head_branch==='development/backend-foundation'&&r.status==='completed'&&
  r.conclusion==='success'&&r.event==='push').sort((a,b)=>b.id-a.id);
 if(!eligible.length)throw Error('No successful exact-source READY CI run');
 for(const run of eligible){
  const response=await get('https://api.github.com/repos/'+REPO+'/actions/runs/'+run.id+'/artifacts?per_page=100');
  const items=response.artifacts||[];
  const choose=name=>items.filter(a=>a.name===name&&!a.expired&&
   a.workflow_run?.id===run.id&&a.workflow_run?.head_sha===sourceSha&&
   a.size_in_bytes>0);
  const dist=choose('dic-production-dist-'+sourceSha);
  const cert=choose('dic-ci-certificate-'+sourceSha);
  if(dist.length===1&&cert.length===1)return {
   source_sha:sourceSha,run_id:run.id,
   dist_artifact_id:dist[0].id,certificate_artifact_id:cert[0].id,
   status:'EXACT_SOURCE_ARTIFACT_IDS_DISCOVERED_NOT_DOWNLOADED'};
 }
 throw Error('Exact-source CI artifact pair absent, expired, or ambiguous');
}
