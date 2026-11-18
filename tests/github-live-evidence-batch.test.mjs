import test from 'node:test';
import assert from 'node:assert/strict';
import {githubBatchEvidenceReaders,workflowNodeIdFromAnchor}
 from '../scripts/release/github-live-evidence-batch.mjs';
import {verifyReadyItems} from '../scripts/release/ready-evidence-gate.mjs';
const REPO='Schulzet3/The-Dial-In-Collective',SHA='b'.repeat(40);
const nodeFor=id=>{
 const bytes=Buffer.from('58547f9302ce50cadf0ecf0000000000000000','hex');
 bytes.writeBigUInt64BE(BigInt(id),bytes.length-8);
 return bytes.toString('base64url');
};
const anchor={id:11,node_id:nodeFor(11),head_sha:SHA,
 status:'completed',conclusion:'success',event:'pull_request'};
const names=['approval','validate','cloud-tests','mobile-browser-qa','sql'];
const response=body=>({ok:true,json:async()=>body});
function mockReaders({alterNode=n=>n,alterChecks=c=>c,alterAnchor=a=>a,runResponse=null}={}){
 const calls=[];
 const request=async(url,options={})=>{
  calls.push({url,method:options.method||'GET'});
  if(url.endsWith('/actions/runs/11'))
   return runResponse||response(alterAnchor(anchor));
  if(!url.endsWith('/graphql'))throw Error('Unexpected extra REST call: '+url);
  const params=JSON.parse(options.body);
  if(params.variables?.ids){
   return response({data:{nodes:params.variables.ids.map((id,i)=>alterNode({
    id,url:'https://github.com/'+REPO+'/actions/runs/'+(i+11),
    event:'pull_request',
    checkSuite:{status:'COMPLETED',conclusion:'SUCCESS',commit:{oid:SHA},
     repository:{nameWithOwner:REPO}}
   },i))}});
  }
  const contexts={totalCount:5,nodes:names.map((name,i)=>({
   __typename:'CheckRun',fullDatabaseId:String(500+i),name,
   status:'COMPLETED',conclusion:'SUCCESS',
   detailsUrl:'https://github.com/'+REPO+'/actions/runs/'+(11+i%2)+'/job/'+(100+i),
   checkSuite:{app:{slug:'github-actions'}}
  }))};
  return response({data:{repository:{s0:{oid:SHA,statusCheckRollup:{contexts:alterChecks(contexts)}}}}});
 };
 return {readers:githubBatchEvidenceReaders('test-token',{request}),calls};
}
test('one REST anchor plus two live GraphQL queries bind exact runs and check jobs',async()=>{
 const {readers,calls}=mockReaders();
 const runs=await readers.loadRuns([11,12]);
 assert.deepEqual([...runs.keys()],[11,12]);
 const checkMap=await readers.loadChecksBatch([SHA]);
 assert.equal(checkMap.get(SHA).length,5);
 assert.equal(calls.length,3,'batch must avoid per-record Actions REST fanout');
 assert.equal(calls.filter(c=>c.method==='GET').length,1);
 const item={id:'DIC-Q-test',state:'READY',merged_source_sha:'a'.repeat(40),
  scope_paths:['site/admin/push.js'],ci_runs:[11,12],tests:['tests/push.test.mjs'],
  issue:267,title:'test',owner_source:'owner',blockers:[]};
 const queue={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
  published_base:{tested_source_sha:SHA,release_sha:'c'.repeat(40),netlify_deploy_id:'d'},
  items:[item],history:[]};
 const report=await verifyReadyItems({queue,items:[item],
  loadRun:async id=>runs.get(id),loadChecks:async sha=>checkMap.get(sha),
  mergeChangedPaths:()=>['site/admin/push.js','tests/push.test.mjs'],
  sourceObjectAt:()=>('100644:'+'d'.repeat(40))});
 assert.equal(report.ready,true,report.errors.join(' | '));
});
test('workflow Node-ID conversion rejects malformed or mismatched anchors',()=>{
 assert.equal(workflowNodeIdFromAnchor(anchor,12),nodeFor(12));
 assert.throws(()=>workflowNodeIdFromAnchor({...anchor,id:13},12),/anchor encoding/);
 assert.throws(()=>workflowNodeIdFromAnchor({...anchor,node_id:'garbage'},12),/anchor invalid/);
});
test('foreign, missing, nonmatching and unsuccessful workflow runs fail closed',async()=>{
 for(const mutate of [
  n=>({...n,url:'https://evil.invalid/actions/runs/11'}),
  n=>({...n,checkSuite:{...n.checkSuite,repository:{nameWithOwner:'other/repo'}}}),
  n=>({...n,checkSuite:{...n.checkSuite,commit:{oid:'bad'}}}),
  n=>({...n,checkSuite:{...n.checkSuite,status:null}}),
  ()=>null
 ]){
  const {readers}=mockReaders({alterNode:mutate});
  await assert.rejects(()=>readers.loadRuns([11]),/Read-only GitHub CI/);
 }
 const {readers}=mockReaders({alterNode:n=>({...n,checkSuite:{...n.checkSuite,conclusion:'FAILURE'}})});
 await assert.rejects(()=>readers.loadRuns([11]),/anchor disagreement/);
});
test('partial, corrupted or oversized check sets never turn into approval',async()=>{
 for(const modify of [
  c=>({...c,totalCount:101}),
  c=>({...c,totalCount:5,nodes:c.nodes.slice(1)}),
  c=>({...c,nodes:c.nodes.map((n,i)=>i? n:{...n,fullDatabaseId:'not-an-id'})})
 ]){
  const {readers}=mockReaders({alterChecks:modify});
  await assert.rejects(()=>readers.loadChecksBatch([SHA]),/Read-only GitHub CI/);
 }
});
test('403 with zero remaining is classified as primary rate limit without false pass',async()=>{
 const {readers,calls}=mockReaders({runResponse:{
  ok:false,status:403,
  headers:{get:key=>key==='x-ratelimit-remaining'?'0':null},
  text:async()=>JSON.stringify({message:'API rate limit exceeded'})}});
 await assert.rejects(()=>readers.loadRuns([11]),/HTTP 403 PRIMARY_RATE_LIMIT remaining=0/);
 assert.equal(calls.length,1);
});
test('GraphQL source failure retains failed-CI evidence',async()=>{
 const {readers}=mockReaders({alterAnchor:a=>({...a,head_sha:'c'.repeat(40)})});
 await assert.rejects(()=>readers.loadRuns([11]),/anchor disagreement/);
 const {readers:r2}=mockReaders({alterChecks:c=>({...c,nodes:c.nodes.map((n,i)=>i===0?{...n,conclusion:'FAILURE'}:n)})});
 const c=await r2.loadChecksBatch([SHA]);
 assert.equal(c.get(SHA)[0].conclusion,'failure');
});
