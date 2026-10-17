// Deterministic release gate for the minimal, allowlisted browser app.
// No network calls, no third-party parser, no arbitrary source copied to dist.
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const normalized=p=>path.posix.normalize(p.replaceAll('\\','/').replace(/^\.\//,''));
const location=(base,p)=>normalized(path.posix.join(path.posix.dirname(base),p));
const generated=new Set(['cloud/config.js','vendor/supabase.js','index.html','admin.html','_headers']);
const htmlRoots={ 'cloud.html':'index.html','admin.html':'admin.html' };

function filesUnder(rootDir,relative=''){
 const full=path.join(rootDir,relative);
 if(!existsSync(full))return [];
 return readdirSync(full,{withFileTypes:true}).flatMap(v=>{
  const rel=normalized(path.posix.join(relative,v.name));
  if(v.isSymbolicLink())throw new Error('Symbolic links are forbidden in shipped dist: '+rel);
  return v.isDirectory()?filesUnder(rootDir,rel):[rel];
 });
}
export function fileAllowlist(base=root){
 const js=readFileSync(path.join(base,'build_cloud.mjs'),'utf8');
 const match=js.match(/\bconst files=\[([\s\S]*?)\];/);
 if(!match)throw new Error('Missing explicit production asset allowlist');
 const list=[...match[1].matchAll(/'([^']+)'/g)].map(x=>normalized(x[1]));
 if(list.length!==new Set(list).size)throw new Error('Duplicate production asset in allowlist');
 return new Set(list);
}
export function graph(base=root){
 const copies=fileAllowlist(base),all=new Set([...copies,...generated]);
 const jsVisit=new Set(),resourceVisit=new Set(),issues=[];
 const source=(file)=>readFileSync(path.join(base,'site',file),'utf8');
 const requireAsset=(file,referer)=>{
  if(file.startsWith('../')||file.startsWith('/')){issues.push('Path escapes site root: '+referer+' -> '+file);return;}
  if(!all.has(file))issues.push('Missing production asset: '+referer+' -> '+file);
  if(!generated.has(file)&&!existsSync(path.join(base,'site',file)))issues.push('Missing source file: '+referer+' -> '+file);
 };
 const visitJs=(file,from)=>{
  if(jsVisit.has(file))return;
  requireAsset(file,from);jsVisit.add(file);
  if(generated.has(file)||!existsSync(path.join(base,'site',file)))return;
  const body=source(file);
  if(/\bimport\s*\(/.test(body))issues.push('Dynamic import cannot be validated statically: '+file);
  const importPattern=/\b(?:import|export)\s+(?:[^'";\n]*?\s+from\s*)?['"]([^'"]+)['"]/g;
  for(const match of body.matchAll(importPattern)){
   const spec=match[1];
   if(!spec.startsWith('.')){issues.push('External/unbundled runtime import in '+file+': '+spec);continue;}
   visitJs(location(file,spec),file);
  }
 };
 const visitHtml=(file)=>{
  const body=source(file);
  for(const t of body.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)){
   const spec=t[1];if(!spec.startsWith('.')){issues.push('External script in '+file+': '+spec);continue;}
   visitJs(location(file,spec),file);
  }
  for(const t of body.matchAll(/<link\b([^>]+)>/gi)){
   const attrs=t[1],link=attrs.match(/\bhref=["']([^"']+)["']/i);
   if(!link)continue;
   const uri=link[1];if(!uri.startsWith('.'))continue;
   const rel=location(file,uri);resourceVisit.add(rel);requireAsset(rel,file);
  }
 };
 for(const file of Object.keys(htmlRoots))visitHtml(file);
 for(const file of copies){
  if(file.endsWith('.js')&&!jsVisit.has(file))
   issues.push('Unreferenced JavaScript shipped to browsers: '+file);
  if(file.endsWith('.css')&&!resourceVisit.has(file))
   issues.push('Unreferenced CSS shipped to browsers: '+file);
 }
 for(const required of ['cloud/coffee-url-autofill.js','cloud/main.js','admin/main.js']){
  if(!jsVisit.has(required))issues.push('Required active module not reached: '+required);
 }
 for(const retired of ['cloud/import-entry.js','cloud/import-integration.js','cloud/import-ui.js','cloud/import-preview.js','cloud/import.css']){
  if(copies.has(retired))issues.push('Retired/recovery-only UI accidentally shipped: '+retired);
 }
 return {allowlist:copies,files:new Set(all),jsVisit,resourceVisit,issues};
}
export function validateSiteSource(base=root){
 const result=graph(base);
 if(result.issues.length)throw new Error('Site graph validation failed:\n - '+result.issues.join('\n - '));
 return result;
}
export function validateDist(base=root){
 const {files}=validateSiteSource(base),dist=path.join(base,'dist');
 const existing=new Set(filesUnder(dist));
 const missing=[...files].filter(file=>!existing.has(file));
 const extra=[...existing].filter(file=>!files.has(file));
 if(missing.length||extra.length)throw new Error('Unexpected production files. Missing: '+missing.join(', ')+'; Extra: '+extra.join(', '));
 const h=readFileSync(path.join(dist,'_headers'),'utf8');
 if(!/frame-ancestors 'none'/.test(h)||!/object-src 'none'/.test(h)||!/connect-src 'self'/.test(h))
  throw new Error('Required protective response headers missing from production build');
 return {count:existing.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=validateSiteSource(root);
 if(process.argv.includes('--dist')){const d=validateDist(root);console.log('Verified '+d.count+' shipped assets, all imports reachable.');}
 else console.log('Verified '+result.jsVisit.size+' reachable JS modules, '+result.resourceVisit.size+' linked assets.');
}
