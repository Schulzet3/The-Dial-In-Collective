// Select exactly one recent scheduled encrypted backup. Never contacts Supabase or Drive.
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const SHA=/^sha256:([a-f0-9]{64})$/;
const MAX_AGE_MS=8*24*60*60*1000;

export async function chooseScheduledArchive(runs,getArtifacts,now=Date.now()){
  if(!Array.isArray(runs))throw Error('Missing scheduled run inventory');
  const eligible=runs.filter(x=>
    x && Number.isSafeInteger(x.id) &&
    x.event==='schedule' && x.status==='completed' &&
    x.conclusion==='success' && x.head_branch==='main' &&
    x.path==='.github/workflows/nightly-backup.yml' &&
    Number.isFinite(Date.parse(x.created_at)) &&
    Date.parse(x.created_at)<=now && Date.parse(x.created_at)>=now-MAX_AGE_MS
  ).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
  for(const run of eligible.slice(0,20)){
    const listing=await getArtifacts(run.id);
    if(!listing || !Array.isArray(listing.artifacts) || listing.total_count>100)continue;
    const matches=listing.artifacts.filter(a=>
      a.name==='dic-encrypted-nightly-'+run.id && !a.expired &&
      Number.isSafeInteger(a.id) && a.size_in_bytes>128 &&
      SHA.test(a.digest??''));
    if(matches.length!==1)continue;
    return {
      sourceRunId:String(run.id),
      artifactId:matches[0].id,
      artifactSha256:matches[0].digest.slice(7)
    };
  }
  throw Error('BLOCKED: no recent successful scheduled encrypted backup with a unique SHA-256 artifact');
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  const repo=process.env.GITHUB_REPOSITORY,token=process.env.GH_TOKEN,out=process.env.GITHUB_ENV;
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo??'') || !token || !out)
    throw Error('Missing GitHub Actions source identity or read token');
  const api=async(path)=>{
    const res=await fetch('https://api.github.com/repos/'+repo+'/'+path,{
      headers:{
        Authorization:'Bearer '+token,
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28',
        'User-Agent':'dic-offline-archive-restore'
      }
    });
    if(!res.ok)throw Error('GitHub source read failed: HTTP '+res.status);
    return res.json();
  };
  const listing=await api('actions/runs?event=schedule&per_page=100');
  if(!Array.isArray(listing.workflow_runs) || listing.total_count>1000000)
    throw Error('Invalid scheduled source run list');
  // First successful scheduled restoration must target the original, independently
  // Drive-verified 2026-11-01 ciphertext. Later runs select recent GH artifacts.
  // This does not imply later Drive copies are independently verified here.
  const historicalRunId=41316998335;
  const historicalArtifactId=13087632285;
  const historicalZipSha='1cd12b8b9b7ef4dded07cebc96578f2903e9fb3a85195e6afd42e677aa92b746';
  const history=await api('actions/workflows/verified-drive-archive-restore.yml/runs?event=schedule&per_page=100');
  if(!Array.isArray(history.workflow_runs))throw Error('Cannot determine prior isolated restore results');
  const hasSuccess=history.workflow_runs.some(x=>x.event==='schedule' &&
    x.conclusion==='success' && x.status==='completed' &&
    x.path==='.github/workflows/verified-drive-archive-restore.yml');
  let found,proof;
  if(!hasSuccess){
    const first=await api('actions/runs/'+historicalRunId);
    if(first.id!==historicalRunId || first.path!=='.github/workflows/nightly-backup.yml' ||
      first.event!=='schedule' || first.head_branch!=='main' || first.conclusion!=='success')
      throw Error('BLOCKED: pinned original Drive-verified scheduled source is invalid');
    const a=await api('actions/runs/'+historicalRunId+'/artifacts?per_page=100');
    const match=a.artifacts?.filter(x=>x.name==='dic-encrypted-nightly-'+historicalRunId &&
      x.id===historicalArtifactId && !x.expired &&
      x.digest==='sha256:'+historicalZipSha);
    if(match?.length!==1)
      throw Error('BLOCKED: original Drive-verified archive is missing or expired');
    found={sourceRunId:String(historicalRunId),artifactId:historicalArtifactId,artifactSha256:historicalZipSha};
    proof='independent-drive-nov1-2026';
  } else {
    found=await chooseScheduledArchive(listing.workflow_runs,
      id=>api('actions/runs/'+id+'/artifacts?per_page=100'));
    proof='github-artifact-only';
  }
  appendFileSync(out,
    'DIC_SOURCE_RUN_ID='+found.sourceRunId+'\n'+
    'DIC_EXPECTED_ZIP_SHA256='+found.artifactSha256+'\n'+
    'DIC_ARCHIVE_SOURCE_PROOF='+proof+'\n');
  console.log('Selected recent scheduled encrypted archive '+found.sourceRunId+' for offline recovery.');
  console.log(proof==='github-artifact-only' ? 'LIMIT: current scheduled artifact does NOT independently verify Drive copy bytes.' : 'PASS: first restored archive pinned to independently SHA-256 verified Nov 1 Drive ZIP.');
}
