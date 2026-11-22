// One Node module parser process replaces hundreds of node --check subprocesses.
import {SourceTextModule} from 'node:vm';
import {readdirSync,readFileSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const EXCLUDE=new Set(['node_modules','.git','dist','qa_artifacts']);
export function parseAllCheckedInModules(root=ROOT){
 if(typeof SourceTextModule!=='function')
  throw Error('Node module parser unavailable; run with --experimental-vm-modules');
 const errors=[];let count=0;
 const visit=dir=>{
  for(const ent of readdirSync(dir,{withFileTypes:true})){
   if(EXCLUDE.has(ent.name))continue;
   const file=join(dir,ent.name),info=lstatSync(file);
   if(info.isSymbolicLink()){errors.push('Symlink forbidden in syntax source tree: '+file);continue;}
   if(info.isDirectory()){visit(file);continue;}
   if(!info.isFile()||!/\.(?:m?js)$/.test(ent.name))continue;
   count++;
   try{new SourceTextModule(readFileSync(file,'utf8'),{identifier:file});}
   catch(e){errors.push(file+': '+String(e?.message||e));}
  }
 };
 visit(root);
 if(!count)errors.push('No JS/MJS source found');
 return {count,errors};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length>3)throw Error('Usage: syntax-batch.mjs [sourceRoot]');
  const result=parseAllCheckedInModules(process.argv[2]?resolve(process.argv[2]):ROOT);
  if(result.errors.length)throw Error(result.errors.slice(0,20).join('\n'));
  console.log('[DIC batch syntax] PASS '+result.count+' JS/MJS files parsed using Node module grammar');
 }catch(e){console.error('[DIC batch syntax] FAIL '+String(e.message||e));process.exitCode=1;}
}
