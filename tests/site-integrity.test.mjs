import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateSiteSource,fileAllowlist,graph} from '../scripts/audit/site-integrity.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('all production module imports and HTML local assets are in the build allowlist',()=>{
 const result=validateSiteSource(root);
 assert.ok(result.jsVisit.has('cloud/coffee-url-autofill.js'));
 assert.ok(result.jsVisit.has('cloud/main.js'));
 assert.ok(result.jsVisit.has('admin/main.js'));
 assert.equal(result.issues.length,0);
});
test('inactive native import UI is preserved as source/tests but NEVER packaged',()=>{
 const allowlist=fileAllowlist(root);
 for(const file of ['cloud/import-entry.js','cloud/import-integration.js','cloud/import-ui.js',
   'cloud/import-preview.js','cloud/import.css'])assert.equal(allowlist.has(file),false,file);
 assert.match(readFileSync(path.join(root,'site','cloud.html'),'utf8'),/src="\.\/cloud\/main\.js"/);
});
test('graph rejects missing production imports instead of silently emitting a broken PWA',()=>{
 const temp=mkdtempSync(path.join(tmpdir(),'dic-audit-'));
 try{
  cpSync(path.join(root,'site'),path.join(temp,'site'),{recursive:true});
  let builder=readFileSync(path.join(root,'build_cloud.mjs'),'utf8');
  builder=builder.replace("'cloud/coffee-url-autofill.js',",'');
  writeFileSync(path.join(temp,'build_cloud.mjs'),builder);
  const result=graph(temp);
  assert.ok(result.issues.some(x=>x.includes('Missing production asset')&&x.includes('coffee-url-autofill')));
  assert.throws(()=>validateSiteSource(temp),/Missing production asset/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('installable manifest is explicitly allowlisted and worker is generated, not copied',()=>{
 const allowlist=fileAllowlist(root);
 assert.ok(allowlist.has('manifest.webmanifest'));
 assert.equal(allowlist.has('sw.js'),false);
 const manifest=JSON.parse(readFileSync(path.join(root,'site/manifest.webmanifest'),'utf8'));
 assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');
 assert.equal(manifest.display,'standalone');
 for(const size of [192,512]){
  const p=path.join(root,'site','icon-'+size+'.png'),bytes=readFileSync(p);
  assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),size);
  assert.equal(bytes.readUInt32BE(20),size);
  assert.ok(manifest.icons.some(icon=>icon.src==='/icon-'+size+'.png'&&icon.sizes===size+'x'+size&&icon.type==='image/png'));
 }
 assert.match(readFileSync(path.join(root,'site','cloud.html'),'utf8'),/rel="apple-touch-icon"/);
 assert.match(readFileSync(path.join(root,'site/cloud.html'),'utf8'),/rel="manifest"/);
});
test('packaged browser routes never point at retired entrypoints',()=>{
 const cloud=readFileSync(path.join(root,'site/cloud.html'),'utf8');
 assert.doesNotMatch(cloud,/(?:import-entry\.js|import\.css)/);
 for(const f of ['cloud/main.js','admin/main.js'])assert.ok(fileAllowlist(root).has(f),f);
});
test('all checked-in JS/MJS files parse under Node 22 in ONE bounded process',()=>{
 const result=spawnSync(process.execPath,['--no-warnings','--experimental-vm-modules',
  'scripts/audit/syntax-batch.mjs'],{cwd:root,encoding:'utf8',timeout:45000});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
 assert.match(result.stdout,/batch syntax\] PASS [1-9]\d* JS\/MJS files/);
});
test('batch parser rejects malformed modules without executing source',()=>{
 const temp=mkdtempSync(path.join(tmpdir(),'dic-batch-syntax-'));
 try{
  writeFileSync(path.join(temp,'broken.mjs'),'export const = ;');
  const result=spawnSync(process.execPath,['--no-warnings','--experimental-vm-modules',
   'scripts/audit/syntax-batch.mjs',temp],{cwd:root,encoding:'utf8',timeout:5000});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/broken.mjs/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
