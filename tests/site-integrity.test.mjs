import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,writeFileSync,readFileSync,rmSync,readdirSync,statSync} from 'node:fs';
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
test('packaged browser routes never point at retired entrypoints',()=>{
 const cloud=readFileSync(path.join(root,'site/cloud.html'),'utf8');
 assert.doesNotMatch(cloud,/(?:import-entry\.js|import\.css)/);
 for(const f of ['cloud/main.js','admin/main.js'])assert.ok(fileAllowlist(root).has(f),f);
});
test('all checked-in JS/MJS files parse under Node 22',()=>{
 const inspect=dir=>{
  for(const name of readdirSync(dir)){
   if(['node_modules','.git','dist','qa_artifacts'].includes(name))continue;
   const file=path.join(dir,name),info=statSync(file);
   if(info.isDirectory()){inspect(file);continue;}
   if(!/\.(?:m?js)$/.test(name))continue;
   const child=spawnSync(process.execPath,['--check',file],{encoding:'utf8',timeout:15000});
   assert.equal(child.status,0,file+': '+child.stderr);
  }
 };
 inspect(root);
});
