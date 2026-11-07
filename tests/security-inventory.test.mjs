import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectTrackedSource,secretRulesOnLine,sensitiveTrackedPath} from '../scripts/audit/security-inventory.mjs';

test('detects high-confidence credentials without returning their values',()=>{
 const samples={
  private_key:'-----BEGIN '+'OPENSSH PRIVATE KEY-----',
  pgp_private_key:'-----BEGIN '+'PGP PRIVATE KEY BLOCK-----',
  age_private_identity:'AGE-SECRET-KEY-1'+'A'.repeat(55),
  github_token:'ghp_'+'A'.repeat(40),
  github_fine_grained_token:'github_pat_'+'A'.repeat(80),
  supabase_secret:'sb_secret_'+'A'.repeat(30),
  aws_access_key:'AKIA'+'A'.repeat(16),
  resend_api_key:'re_'+'A'.repeat(40)
 };
 for(const [expected,secret] of Object.entries(samples)){
  assert.ok(secretRulesOnLine('ignore '+'prefix '+secret+' suffix').includes(expected),expected);
  assert.ok(!secretRulesOnLine(secret).includes(secret),expected+' may not echo secret bytes');
 }
});
test('does not misclassify publishable keys or named secret references',()=>{
 for(const example of [
  'SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_placeholder_nonfunctional',
  'SUPABASE_DB_URL: $'+'{{ secrets.SUPABASE_DB_URL }}',
  'BACKUP_AGE_RECIPIENT: ssh-ed25519 AAAApublicrecipient',
  'ghp_example_secret_value',
  'github_pat_example_only_not_a_real_credential'
 ])assert.deepEqual(secretRulesOnLine(example),[],example);
});
test('rejects accidentally tracked private credential files and preserves public templates',()=>{
 for(const p of ['.env','config/.env.production','id_ed25519','.npmrc','secrets/token.json',
  'keys/owner.p8','recovery/archive.age','export.sql.gz','auth/identity.p12'])
  assert.equal(sensitiveTrackedPath(p),true,p);
 for(const p of ['.env.example','docs/.env.example','site/lib/engine.js','supabase/migrations/2026.sql',
  'tests/fixture.json','keys/id_ed25519.pub'])assert.equal(sensitiveTrackedPath(p),false,p);
});
test('records redacted paths and line numbers, not embedded secret values',()=>{
 const secret='sb_secret_'+'B'.repeat(27);
 const path='docs/private-note.txt';
 const result=inspectTrackedSource({paths:[path],read:()=>Buffer.from('head\n'+secret+'\n'),stat:()=>({isSymbolicLink:()=>false})});
 assert.equal(result.candidates.length,1);
 assert.deepEqual(result.candidates[0],{path,line:2,rule:'supabase_secret'});
 assert.ok(!JSON.stringify(result.candidates).includes(secret));
 assert.equal(result.totals.files,1);
});
test('CLI screens tracked files and reports rule/line but never raw credential bytes',()=>{
 const temp=mkdtempSync(join(tmpdir(),'dic-secret-guard-'));
 try{
  execFileSync('git',['init','-q'],{cwd:temp});
  writeFileSync(join(temp,'README.md'),'ok\n');
  execFileSync('git',['add','README.md'],{cwd:temp});
  execFileSync('git',['-c','user.name=CI Fixture','-c','user.email=ci-fixture@example.invalid','commit','-qm','fixture'],{cwd:temp});
  const script=new URL('../scripts/audit/security-inventory.mjs',import.meta.url).pathname;
  const clean=spawnSync(process.execPath,[script],{cwd:temp,encoding:'utf8'});
  assert.equal(clean.status,0,clean.stderr);
  const token='ghp_'+'Z'.repeat(40);
  writeFileSync(join(temp,'test-secret.txt'),'safe line\n'+token+'\n');
  execFileSync('git',['add','test-secret.txt'],{cwd:temp});
  const unsafe=spawnSync(process.execPath,[script],{cwd:temp,encoding:'utf8'});
  assert.equal(unsafe.status,1,unsafe.stderr);
  assert.match(unsafe.stdout,/"rule":"github_token"/);
  assert.ok(!unsafe.stdout.includes(token));
  assert.ok(!readFileSync(join(temp,'qa_artifacts/security/repository-inventory.json'),'utf8').includes(token));
 } finally{rmSync(temp,{recursive:true,force:true});}
});
test('security scanner source itself produces zero high-confidence matches',()=>{
 const source=readFileSync(new URL('../scripts/audit/security-inventory.mjs',import.meta.url),'utf8');
 assert.deepEqual(source.split(/\r?\n/).flatMap(secretRulesOnLine),[]);
});

test('tracked symlinks hash Git link bytes without dereferencing untracked outside files',()=>{
 const temp=mkdtempSync(join(tmpdir(),'dic-symlink-guard-'));
 const root=join(temp,'repo');
 const secret='ghp_'+'X'.repeat(40);
 try{
  mkdirSync(root);
  writeFileSync(join(temp,'not-tracked-secret.txt'),secret+'\n');
  symlinkSync('../not-tracked-secret.txt',join(root,'tracked-link'));
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['add','tracked-link'],{cwd:root});
  const staged=execFileSync('git',['show',':tracked-link'],{cwd:root});
  assert.equal(staged.toString('utf8'),'../not-tracked-secret.txt');
  const result=inspectTrackedSource({paths:[join(root,'tracked-link')]});
  assert.equal(result.files[0].symlink,true);
  assert.equal(result.files[0].category,'tracked_symlink_target');
  assert.equal(result.files[0].sha256,createHash('sha256').update(staged).digest('hex'));
  assert.equal(result.files[0].bytes,staged.length);
  assert.deepEqual(result.candidates,[]);
  assert.ok(!JSON.stringify(result).includes(secret));
 }finally{rmSync(temp,{recursive:true,force:true});}
});
