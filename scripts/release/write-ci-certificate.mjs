// Exact-source CI receipt; not a release authorization.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
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
const receipt={schema_version:2,batch_status:batchStatus,
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
