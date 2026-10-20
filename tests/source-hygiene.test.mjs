
// Active-source integrity guard. Historical reports, archives and compiled
// build artifacts are intentionally excluded from deduplication.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const roots=['site','src/server','netlify/functions','supabase/functions','scripts/audit'];
function collect(dir){
 if(!existsSync(dir))return [];
 const out=[];
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,item.name);
  if(item.isDirectory())out.push(...collect(path));
  else if(item.isFile()&&/\.(?:mjs|js|ts)$/.test(path))out.push(path);
 }
 return out;
}
const active=roots.flatMap(p=>collect(join(root,p)));

test('active JavaScript and TypeScript source imports have no broken relative targets',()=>{
 const missing=[];
 for(const path of active){
  const contents=readFileSync(path,'utf8');
  const imports=new Set();
  for(const regex of [
   /(?:^|\n)\s*(?:import|export)\s+(?:[^;'"]{0,550}?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g,
   /\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g
  ])for(const match of contents.matchAll(regex))imports.add(match[1]);
  for(const imported of imports){
   const candidate=resolve(dirname(path),imported.split('?')[0]);
   if(![candidate,candidate+'.js',candidate+'.mjs',candidate+'.ts',
    join(candidate,'index.js'),join(candidate,'index.ts')].some(existsSync))
    missing.push(relative(root,path)+' -> '+imported);
  }
 }
 assert.deepEqual(missing,[]);
});
test('exact duplicate active source files are only the required Node/Edge Agtron mirror',()=>{
 const contents=new Map();
 for(const file of active){
  const digest=createHash('sha256').update(readFileSync(file)).digest('hex');
  contents.set(digest,[...(contents.get(digest)||[]),relative(root,file)]);
 }
 const dup=[...contents.values()].filter(paths=>paths.length>1)
  .map(paths=>paths.sort().join('|')).sort();
 assert.deepEqual(dup,[
  'src/server/agtron-roast.mjs|supabase/functions/dic-preview-coffee/agtron-roast.mjs'
 ]);
});
test('current owner decisions, index and visible help copy are synchronized',()=>{
 const spec=readFileSync(join(root,'docs/MASTER_SPECIFICATION.md'),'utf8');
 const status=readFileSync(join(root,'docs/CURRENT_STATUS.md'),'utf8');
 const ledger=JSON.parse(readFileSync(join(root,'docs/DECISION_LEDGER.json'),'utf8'));
 const index=readFileSync(join(root,'docs/README.md'),'utf8');
 const app=readFileSync(join(root,'site/cloud/main.js'),'utf8');
 assert.match(spec,/RECOMMENDATION-OPTION-A-ARROW-INFO-20261019/);
 assert.doesNotMatch(spec,/19\.3 Next-shot recommendation:[^\n]*presentation pending/);
 assert.doesNotMatch(status,/next related owner question is how to display/);
 assert.equal(ledger.current_owner_recommendation_display_choice_20261019.status,'Locked');
 assert.equal(ledger.current_owner_recommendation_single_intentional_change_20261019.still_open,undefined);
 assert.match(app,/data-action="next-shot-info"/);
 assert.match(app,/Grinder Espresso Range/);
 assert.doesNotMatch(app,/One adjustment at a time/);
 const list=index.slice(index.indexOf('## Read first'),index.indexOf('## Current operating records'));
 const nums=[...list.matchAll(/^(\d+)\. /gm)].map(x=>Number(x[1]));
 assert.deepEqual(nums,nums.map((_,i)=>i+1));
});
