// Exact immutable ZIP publication adapter. NEVER run during preflight.
// POST is production publication: only an explicitly authorized, consumed
// one-use release controller may invoke this function.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const SITE='153277f2-e19e-4862-b9a6-f2e18ccde271';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
export function verifyImmutableArchive({archive,expectedSha256,sourceSha,certifiedSourceSha}={}){
 if(!Buffer.isBuffer(archive)||archive.length<100)throw Error('Missing immutable build ZIP');
 if(!HASH.test(expectedSha256||'')||!SHA.test(sourceSha||'')||
   sourceSha!==certifiedSourceSha)throw Error('Missing exact source-bound certification');
 const actual=createHash('sha256').update(archive).digest('hex');
 if(actual!==expectedSha256)throw Error('Immutable build ZIP hash mismatch');
 if(archive.subarray(0,2).toString()!=='PK')throw Error('Not a ZIP archive');
 return {source_sha:sourceSha,archive_sha256:actual};
}
export async function publishExactArtifact({token,archive,expectedSha256,sourceSha,
 certifiedSourceSha,ownerGrantVerified=false,oneUseClaimConsumed=false,
 allowProductionPublication=false,functionsPreservedVerified=false,fetcher=fetch}={}){
 const receipt=verifyImmutableArchive({archive,expectedSha256,sourceSha,certifiedSourceSha});
 if(!ownerGrantVerified||!oneUseClaimConsumed||!allowProductionPublication||!functionsPreservedVerified)
  throw Error('Production publication denied: owner grant, consumed claim, complete Netlify Functions coverage and explicit publication gate required');
 if(!token)throw Error('Missing Netlify publication token');
 const response=await fetcher('https://api.netlify.com/api/v1/sites/'+SITE+'/deploys',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/zip'},
  body:archive});
 if(!response.ok)throw Error('Netlify ZIP publication returned HTTP '+response.status+
  '; inspect provider state before retry, never automatically publish twice');
 const deploy=await response.json();
 if(!deploy.id||deploy.site_id!==SITE)
  throw Error('Netlify publication response unverified: inspect provider before further action');
 return {...receipt,status:'PROVIDER_PUBLICATION_REQUESTED_VERIFY_CURRENT_BEFORE_DEPLOYED',
  deploy_id:deploy.id,site_id:SITE};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 console.error('Direct CLI publishing disabled. Invoke only from a source-bound one-use release controller.');
 process.exitCode=2;
}
