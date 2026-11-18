// Live, read-only GitHub CI batching. No cached or inferred READY evidence.
// Each request inspects GitHub's current Actions/check data and fails closed.
const REPO='Schulzet3/The-Dial-In-Collective';
const REST='https://api.github.com/repos/'+REPO;
const RUN_URL='https://github.com/'+REPO+'/actions/runs/';
const SHA=/^[a-f0-9]{40}$/;
const RUN_QUERY='query($ids:[ID!]!){nodes(ids:$ids){... on WorkflowRun{id url event checkSuite{status conclusion commit{oid} repository{nameWithOwner}}}}}';
const fail=reason=>{throw Error('Read-only GitHub CI '+reason);};
const uniqueIds=ids=>{
 if(!Array.isArray(ids)||ids.some(id=>!Number.isSafeInteger(id)||id<=0))
  fail('/graphql invalid recorded run identifiers');
 return [...new Set(ids)];
};
const uniqueShas=shas=>{
 if(!Array.isArray(shas)||shas.some(sha=>typeof sha!=='string'||!SHA.test(sha)))
  fail('/graphql invalid recorded source identifiers');
 return [...new Set(shas)];
};
// Bind GraphQL node encoding to a fresh, authentic REST run on this execution.
// GitHub's current node ID embeds its 64-bit Actions run ID in the final bytes.
// If the representation changes, DENY: never infer a successful run.
export function workflowNodeIdFromAnchor(anchor,id){
 if(!Number.isSafeInteger(id)||id<=0||
    !Number.isSafeInteger(anchor?.id)||anchor.id<=0||
    typeof anchor?.node_id!=='string'||!anchor.node_id.startsWith('WFR_'))
  fail('/graphql workflow anchor invalid');
 const bytes=Buffer.from(anchor.node_id,'base64url');
 if(bytes.length<12||bytes.length>64||
    bytes.readBigUInt64BE(bytes.length-8)!==BigInt(anchor.id)||
    bytes.toString('base64url')!==anchor.node_id)
  fail('/graphql workflow anchor encoding unavailable');
 const next=Buffer.from(bytes);
 next.writeBigUInt64BE(BigInt(id),next.length-8);
 return next.toString('base64url');
}
export function githubBatchEvidenceReaders(token,{request=globalThis.fetch}={}){
 if(typeof token!=='string'||!token||typeof request!=='function')
  fail('/graphql authenticated reader unavailable');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28'};
 const read=async(url,options,label)=>{
  const response=await request(url,{...options,headers:{...headers,...options?.headers}});
  if(!response?.ok){
   const remaining=response?.headers?.get?.('x-ratelimit-remaining');
   const retryAfter=response?.headers?.get?.('retry-after');
   let message='';
   try{message=String(await response.text()).slice(0,1024);}catch{}
   const category=remaining==='0'?'PRIMARY_RATE_LIMIT':
    /secondary rate limit/i.test(message)?'SECONDARY_RATE_LIMIT':
    /resource not accessible|insufficient permission|not authorized/i.test(message)?'TOKEN_PERMISSION':
    retryAfter?'RETRY_AFTER':'UNCLASSIFIED';
   // Only diagnostics, never a token, private response body or resource name.
   fail(label+' HTTP '+String(response?.status)+' '+category+
    (remaining==='0'?' remaining=0':''));
  }
  const payload=await response.json();
  if(!payload||typeof payload!=='object')fail(label+' unreadable JSON');
  return payload;
 };
 const graphql=async(query,variables={})=>{
  const payload=await read('https://api.github.com/graphql',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({query,variables})
  },'/graphql');
  if(payload.errors?.length||!payload.data||typeof payload.data!=='object')
   fail('/graphql partial, denied or schema-invalid response');
  return payload.data;
 };
 const loadRuns=async ids=>{
  const selected=uniqueIds(ids),runs=new Map();
  if(!selected.length)return runs;
  const anchor=await read(REST+'/actions/runs/'+selected[0],{},'/actions/runs/'+selected[0]);
  workflowNodeIdFromAnchor(anchor,selected[0]);
  if(anchor.id!==selected[0]||!SHA.test(anchor.head_sha||''))
   fail('/graphql workflow anchor REST mismatch');
  for(let start=0;start<selected.length;start+=35){
   const chunk=selected.slice(start,start+35);
   const nodeIds=chunk.map(id=>workflowNodeIdFromAnchor(anchor,id));
   const nodes=(await graphql(RUN_QUERY,{ids:nodeIds})).nodes;
   if(!Array.isArray(nodes)||nodes.length!==chunk.length)
    fail('/graphql incomplete workflow-run page');
   for(let i=0;i<chunk.length;i++){
    const id=chunk[i],n=nodes[i],suite=n?.checkSuite;
    if(n?.id!==nodeIds[i]||n?.url!==RUN_URL+id||
       suite?.repository?.nameWithOwner!==REPO||
       !SHA.test(suite?.commit?.oid||'')||
       typeof suite?.status!=='string'||
       !['push','pull_request'].includes(n?.event))
     fail('/graphql missing, mismatched or foreign workflow-run '+id);
    const run={id,head_sha:suite.commit.oid,
     status:suite.status.toLowerCase(),
     conclusion:typeof suite.conclusion==='string'?suite.conclusion.toLowerCase():null,
     event:n.event};
    if(id===anchor.id&&
       (run.head_sha!==anchor.head_sha||run.status!==anchor.status||
        run.conclusion!==anchor.conclusion||run.event!==anchor.event))
     fail('/graphql workflow-run REST/GraphQL anchor disagreement');
    runs.set(id,run);
   }
  }
  return runs;
 };
 const loadChecksBatch=async shas=>{
  const selected=uniqueShas(shas),result=new Map();
  for(let start=0;start<selected.length;start+=10){
   const chunk=selected.slice(start,start+10);
   const fields=chunk.map((sha,i)=>
    's'+i+':object(oid:"'+sha+'"){... on Commit{oid statusCheckRollup{contexts(first:100){totalCount nodes{__typename ... on CheckRun{fullDatabaseId name status conclusion detailsUrl checkSuite{app{slug}}}}}}}}').join(' ');
   const data=await graphql('query {repository(owner:"Schulzet3",name:"The-Dial-In-Collective"){'+fields+'}}');
   if(!data.repository)fail('/graphql source repository unavailable');
   for(let i=0;i<chunk.length;i++){
    const sha=chunk[i],obj=data.repository['s'+i],c=obj?.statusCheckRollup?.contexts;
    if(obj?.oid!==sha||!c||!Number.isSafeInteger(c.totalCount)||
       c.totalCount<0||c.totalCount>100||!Array.isArray(c.nodes)||
       c.nodes.length!==c.totalCount)
     fail('/graphql incomplete exact-source check results '+sha);
    const checks=[];
    for(const n of c.nodes){
     if(n?.__typename!=='CheckRun'){
      if(!n||n.__typename!=='StatusContext')fail('/graphql unknown check context');
      continue;
     }
     // Only GitHub Actions jobs may satisfy the five existing required checks.
     if(n.checkSuite?.app?.slug!=='github-actions')continue;
     const id=Number(n.fullDatabaseId);
     if(!Number.isSafeInteger(id)||id<=0||
        typeof n.name!=='string'||!n.name||
        typeof n.detailsUrl!=='string'||
        typeof n.status!=='string')
      fail('/graphql invalid exact-source check object '+sha);
     checks.push({id,name:n.name,head_sha:sha,
      app:{slug:'github-actions'},details_url:n.detailsUrl,
      status:n.status.toLowerCase(),
      conclusion:typeof n.conclusion==='string'?n.conclusion.toLowerCase():null});
    }
    result.set(sha,checks);
   }
  }
  return result;
 };
 return {loadRuns,loadChecksBatch};
}
