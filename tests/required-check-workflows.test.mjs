import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
// Candidate PRs run at refs/pull/N/merge, not their release-candidates push
// ref. Only these reviewed source-isolated branch families can use the
// published-byte audit; every normal development PR still requires live
// operational READY review. No release permission is granted.
export function isReviewedCandidatePrRef(ref,head,event){
 return event==='pull_request'&&/^refs\/pull\/[1-9][0-9]*\/merge$/.test(ref||'')&&
  /^release-candidates\/(?:ready3347|prospect3889|prospectbatch3889|testing3889)-[a-f0-9]{20}$/.test(head||'');
}
test('candidate PR ref routing rejects ordinary PRs, forged branches and push refs',()=>{
 const branch='release-candidates/prospectbatch3889-'+'a'.repeat(20);
 assert.equal(isReviewedCandidatePrRef('refs/pull/3921/merge',branch,'pull_request'),true);
 for(const [ref,head,event] of [
  ['refs/pull/3921/merge','work/issue3889-normal','pull_request'],
  ['refs/pull/3921/merge',branch,'push'],
  ['refs/heads/development/backend-foundation',branch,'pull_request'],
  ['refs/pull/0/merge',branch,'pull_request'],
  ['refs/pull/3921/merge','release-candidates/unknown-'+'a'.repeat(20),'pull_request'],
  ['refs/pull/3921/merge',branch+'-drift','pull_request']
 ])assert.equal(isReviewedCandidatePrRef(ref,head,event),false);
});
test('all five required CI job checks run on EVERY private branch pull request',()=>{
 const jobs={approval:'approval-continuity',validate:'cloud-beta-ci',
  'cloud-tests':'cloud-regression','mobile-browser-qa':'cloud-regression',sql:'isolated-sql-regression'};
 for(const [job,workflow] of Object.entries(jobs)){
  const p='.github/workflows/'+workflow+'.yml';
  const src=file(p);
  assert.match(src,new RegExp('\\n  '+job+':\\s*\\n'),p+' lacks actual required job '+job);
  assert.match(src,/pull_request:\s*\n\s*branches:/,p+' lacks all PR trigger');
  const pr=src.split('pull_request:')[1].split(/\n\s*(workflow_dispatch|permissions|concurrency|jobs):/)[0];
  assert.doesNotMatch(pr,/\n\s*paths:/,p+' blocks docs-only PR required CI');
 }
});
test('SQL-only push revisions run required validate rather than silently omitting fifth check',()=>{
 const src=file('.github/workflows/cloud-beta-ci.yml');
 const push=src.split('\n  push:')[1]?.split('\n  pull_request:')[0]||'';
 assert.match(push,/branches:\s*\n\s*- development\/backend-foundation/);
 for(const path of ['supabase/migrations/**','supabase/tests/**']){
  assert.ok(push.includes("      - '"+path+"'"),'Missing validate push trigger for '+path);
 }
 assert.equal((push.match(/supabase\/migrations\/\*\*/g)||[]).length,1);
 assert.equal((push.match(/supabase\/tests\/\*\*/g)||[]).length,1);
});

test('per-commit continuity checks head SHA, not synthetic PR merge SHA',()=>{
 const src=file('.github/workflows/approval-continuity.yml');
 assert.match(src,/DIC_HEAD_SHA: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}/);
 assert.match(src,/fetch-depth: 0/);
});

test('required validation exercises Netlify ignore on Node 18 before the Node 22 app build',()=>{
 const src=file('.github/workflows/cloud-beta-ci.yml');
 const ignoreRuntime=src.indexOf("node-version: '18.20.8'");
 const ignoreTests=src.indexOf('node --test tests/netlify-credit-guard.test.mjs tests/one-use-claim.test.mjs');
 const appRuntime=src.indexOf("node-version: '22'");
 const install=src.indexOf('npm ci --ignore-scripts');
 assert.ok(ignoreRuntime>=0&&ignoreRuntime<ignoreTests&&ignoreTests<appRuntime&&appRuntime<install,
  'ignore tests must run without app dependencies on the provider runtime before switching back');
});

test('operational READY audit stays mandatory on development; candidates retain exact published workflow bytes',()=>{
 const path='.github/workflows/approval-continuity.yml';
 const src=file(path);
 const ref=process.env.GITHUB_REF||'';
 const candidatePr=isReviewedCandidatePrRef(ref,process.env.GITHUB_HEAD_REF,process.env.GITHUB_EVENT_NAME);
 let testingManifest=null;
 try{testingManifest=JSON.parse(file('docs/TESTING_3889_CANDIDATE.json'));}
 catch(e){if(e?.code!=='ENOENT')throw e;}
 if(testingManifest || candidatePr || (ref.startsWith('refs/heads/release-candidates/')&&
    /^[a-z0-9][a-z0-9-]{2,80}$/.test(ref.slice('refs/heads/release-candidates/'.length)))){
  const manifest=testingManifest||JSON.parse(file('docs/RELEASE_CANDIDATE.json'));
  assert.ok(['DIC-READY-ONLY-SOURCE-1','DIC-TESTING-FROZEN-NONPUBLISHING-3889-V1'].includes(manifest.kind));
  assert.equal(manifest.publication_authorized,false);
  if(ref.startsWith('refs/heads/release-candidates/'))
   assert.equal('refs/heads/'+manifest.candidate_branch,ref);
  else if(candidatePr){
   assert.equal(process.env.GITHUB_HEAD_REF,manifest.candidate_branch);
   assert.equal(process.env.GITHUB_REPOSITORY,'Schulzet3/The-Dial-In-Collective');
   const git=(...args)=>execFileSync('git',args,{encoding:'utf8',timeout:15000}).trim();
   const parents=git('rev-list','--parents','-n','1','HEAD').split(/\s+/);
   assert.equal(parents.length,3,'candidate review must run on a true two-parent GitHub merge');
   assert.equal(parents[1],manifest.development_source_sha,'candidate parent differs from frozen development SHA');
   assert.equal(git('rev-parse','HEAD^{tree}'),git('rev-parse',parents[2]+'^{tree}'),
    'PR synthetic merge tree must be exactly the frozen candidate source tree');
  }
  else if(ref){
   assert.match(ref,/^refs\/pull\/[0-9]+\/merge$/,'candidate PR must bind immutable head branch');
   assert.equal(process.env.GITHUB_EVENT_NAME,'pull_request');
   assert.equal(process.env.GITHUB_HEAD_REF,manifest.candidate_branch);
  }
  assert.match(manifest.published_source_sha,/^[a-f0-9]{40}$/);
  assert.ok((manifest.restored_unpublished_workflow_paths||manifest.restored_to_published_paths)?.includes(path),
   'isolation must declare restoration of the mandatory development workflow');
  const actualPublished=execFileSync('git',['show',manifest.published_source_sha+':'+path],
   {encoding:'utf8',timeout:15000,maxBuffer:30000});
  assert.equal(src,actualPublished,'candidate workflow must match exact published Git blob');
  return;
 }
 assert.ok(src.includes('run: node scripts/release/ready-evidence-gate.mjs'),
  'development READY audit must be operational');
 assert.match(src,/actions: read/);
 assert.match(src,/checks: read/);
});
