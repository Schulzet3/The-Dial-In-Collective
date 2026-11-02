// Exact-source CI receipt; not a release authorization.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const sha=process.env.DIC_SOURCE_SHA,runId=Number(process.env.DIC_RUN_ID);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(sha||'')||sha!==head||
 !Number.isSafeInteger(runId)||runId<=0)throw Error('Exact-source CI evidence missing');
const queue=JSON.parse(readFileSync('docs/RELEASE_QUEUE.json','utf8'));
const receipt={schema_version:1,kind:'DIC_CI_SOURCE_CERTIFICATE_NOT_RELEASE_APPROVAL',
 source_sha:sha,github_run_id:runId,
 queue_ready_item_ids:queue.items.filter(x=>x.state==='READY').map(x=>x.id).sort(),
 verified_checks:['queue_schema','intake_coverage','node_tests','cloud_tests','lint','build'],
 scope:'CI only; strict source isolation, offsite backup, single-use grant and Netlify SHA readback required separately'};
mkdirSync('docs/generated',{recursive:true});
writeFileSync('docs/generated/CI_CERTIFICATE.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
