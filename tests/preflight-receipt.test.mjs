import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {auditPreflightReceipt} from '../scripts/audit/preflight-receipt.mjs';
const journal='docs/workstreams/issue-2169.md';
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'dic-preflight-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const write=(path,content)=>{const full=join(dir,path);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,content);};
 const commit=()=>{
  git('add','.');git('commit','-qm','fixture [skip netlify]');return git('rev-parse','HEAD');
 };
 git('init','-q','-b','development/backend-foundation');
 git('config','user.name','DIC isolated evidence test');
 git('config','user.email','isolated@example.invalid');
 write('docs/ai/PREFLIGHT.md','# Mandatory starting point for EVERY DIC task\nOwner source\n');
 const before=commit();
 write('scripts/audit/preflight-receipt.mjs','// guard installed\n');
 const base=commit();
 const blob=git('rev-parse',base+':docs/ai/PREFLIGHT.md');
 const row='DIC_PREFLIGHT_VERIFIED development_sha='+base+' preflight_blob_sha='+blob;
 const audit=(sha,parent,paths)=>auditPreflightReceipt({sha,parent,paths,run:args=>git(...args)});
 return {git,write,commit,before,base,blob,row,audit};
}
test('one fresh Git SHA/blob attestation validates a source-changing commit',t=>{
 const f=fixture(t);
 f.write('site/main.js','export const x=1;\n');f.write(journal,f.row+'\n');
 const head=f.commit();
 assert.deepEqual(f.audit(head,f.base,['site/main.js',journal]),{status:'VERIFIED',validated:1,errors:[]});
});
test('earlier receipt reused in a later commit fails even if journal changed',t=>{
 const f=fixture(t);f.write('site/main.js','export const x=1;\n');f.write(journal,f.row+'\n');
 const one=f.commit();
 f.write('site/main.js','export const x=2;\n');f.write(journal,f.row+'\nAdditional note\n');
 const two=f.commit();
 assert.match(f.audit(two,one,['site/main.js',journal]).errors.join(' '),/missing NEW/);
});
test('incorrect SHA/blob and malformed line fail without weakening checks',t=>{
 const f=fixture(t);f.write('site/main.js','export const x=1;\n');
 f.write(journal,'DIC_PREFLIGHT_VERIFIED development_sha='+f.base+' preflight_blob_sha='+'f'.repeat(40)+'\n');
 const first=f.commit();
 assert.match(f.audit(first,f.base,['site/main.js',journal]).errors.join(' '),/blob differs/);
 f.write('site/main.js','export const x=2;\n');f.write(journal,'DIC_PREFLIGHT_VERIFIED unknown\n');
 const second=f.commit();
 assert.match(f.audit(second,first,['site/main.js',journal]).errors.join(' '),/malformed/);
});
test('missing journal and missing Git evidence fail closed',t=>{
 const f=fixture(t);f.write('site/main.js','export const x=1;\n');const noJournal=f.commit();
 assert.match(f.audit(noJournal,f.base,['site/main.js']).errors.join(' '),/recognized same-commit/);
 f.write('site/main.js','export const x=2;\n');
 f.write(journal,'DIC_PREFLIGHT_VERIFIED development_sha='+'a'.repeat(40)+' preflight_blob_sha='+f.blob+'\n');
 const unknown=f.commit();
 assert.match(f.audit(unknown,noJournal,['site/main.js',journal]).errors.join(' '),/unavailable/);
});
test('docs-only and historical pre-rollout commits are not retroactive',t=>{
 const f=fixture(t);f.write('docs/notes.md','doc\n');const docs=f.commit();
 assert.equal(f.audit(docs,f.base,['docs/notes.md']).status,'NOT_APPLICABLE_DOCS');
 assert.equal(f.audit(f.base,f.before,['scripts/audit/preflight-receipt.mjs']).status,'NOT_APPLICABLE_BEFORE_ROLLOUT');
});
