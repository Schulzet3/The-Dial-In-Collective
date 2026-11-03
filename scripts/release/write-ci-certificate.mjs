// Exact-source CI receipt; not a release authorization.
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {evaluateLocalQueue} from './release-queue.mjs';
import {classifyBatch} from './ci-batch-classification.mjs';
const sha=process.env.DIC_SOURCE_SHA,runId=Number(process.env.DIC_RUN_ID);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(sha||'')||sha!==head||
 !Number.isSafeInteger(runId)||runId<=0)throw Error('Exact-source CI evidence missing');
const queue=JSON.parse(readFileSync('docs/RELEASE_QUEUE.json','utf8'));
const assessment=evaluateLocalQueue();
const batchStatus=classifyBatch(assessment);
const artifactPath='dist-immutable.zip';
const artifactHash=existsSync(artifactPath)?createHash('sha256').update(readFileSync(artifactPath)).digest('hex'):null;
if(batchStatus==='CERTIFIED_READY_SOURCE'&&!artifactHash)
 throw Error('READY certification cannot omit immutable production build ZIP');
const functionPath='coffee-url-preview-function.zip';
const functionHash=existsSync(functionPath)?createHash('sha256').update(readFileSync(functionPath)).digest('hex'):null;
if(batchStatus==='CERTIFIED_READY_SOURCE'&&!functionHash)
 throw Error('READY certification cannot omit immutable Netlify server function');
const receipt={schema_version:4,batch_status:batchStatus,
 immutable_function_sha256:functionHash,
 immutable_function_name:functionHash?'coffee-url-preview-function.zip':null,
 immutable_artifact_sha256:artifactHash,
 immutable_artifact_name:artifactHash?'dic-production-dist-'+sha:null,
 strict_source_isolation_passed:assessment.ready,
 isolation_errors:assessment.errors,
 assessed_ready_item_ids:assessment.ready_items.map(x=>x.id).sort(),kind:'DIC_CI_SOURCE_CERTIFICATE_NOT_RELEASE_APPROVAL',
 source_sha:sha,github_run_id:runId,
 queue_ready_item_ids:queue.items.filter(x=>x.state==='READY').map(x=>x.id).sort(),
 verified_checks:['queue_schema','intake_coverage','node_tests','cloud_tests','lint','build'],
 scope:'CI only; offsite backup, single-use grant and Netlify SHA readback required separately'};
mkdirSync('docs/generated',{recursive:true});
writeFileSync('docs/generated/CI_CERTIFICATE.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
