// Fast, dependency-free source and QA import guard for costly CI.
import {readFileSync} from 'node:fs';
import {resolve,join,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSiteSource} from './site-integrity.mjs';
const ROOT=fileURLToPath(new URL('../..',import.meta.url));
export function assertBrowserFixtureClosure(mainSource,fixtureSource){
 const match=/\bfor\s+name\s+in\s+\[([^\]]+)\]\s*:/.exec(fixtureSource);
 if(!match)throw Error('Browser QA module inventory not recognizable');
 const listed=[...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 if(!listed.length||new Set(listed).size!==listed.length)throw Error('Browser QA module inventory missing or duplicated');
 const imports=[...mainSource.matchAll(/^\s*import\s+.*?\bfrom\s+(['"])([^'"]+)\1\s*;?\s*$/gm)];
 if(imports.length!==(mainSource.match(/^\s*import\b/gm)||[]).length||!imports.length)
  throw Error('Unrecognized top-level CloudApp imports in browser fixture source');
 const required=new Set(),missing=[];
 for(const imp of imports){
  const spec=imp[2];
  if(!spec.startsWith('.'))throw Error('Unexpected external CloudApp fixture import: '+spec);
  const rel=posix.normalize(posix.join('cloud',spec));
  if(rel==='cloud/config.js')continue; // fixture uses a deliberately disabled synthetic config
  if(!/^(?:lib|cloud)\/[a-z0-9-]+\.js$/.test(rel))
   throw Error('Unexpected CloudApp fixture dependency: '+rel);
  const name=posix.basename(rel,'.js');required.add(name);
  if(!listed.includes(name))missing.push(rel);
 }
 if(missing.length)throw Error('Browser QA missing imported CloudApp module(s): '+missing.join(', '));
 return {imported:required.size,fixture_modules:listed.length};
}
export function fastSourceGuard(root=ROOT){
 const graph=validateSiteSource(root); // no build, network or dependencies
 const main=readFileSync(join(root,'site/cloud/main.js'),'utf8');
 const fixture=readFileSync(join(root,'tests/browser/cloud_owner_qa.py'),'utf8');
 return {shipped_js:graph.jsVisit.size,...assertBrowserFixtureClosure(main,fixture)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==2)throw Error('Usage: fast-pr-check.mjs');
  console.log('[DIC cheap source gate] PASS '+JSON.stringify(fastSourceGuard()));
 }catch(e){console.error('[DIC cheap source gate] HOLD '+String(e.message||e));process.exitCode=2;}
}
