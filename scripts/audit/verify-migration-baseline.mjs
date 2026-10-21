/**
 * Lock historical SQL migrations to the independently verified production
 * history. Read-only local checker, no API/DB/network/secrets required.
 * Never rewrite an applied migration; new work uses a later version.
 */
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(root,'docs/SUPABASE_PRODUCTION_MIGRATION_BASELINE_2026-10-18.json'),'utf8'));
const folder=resolve(root,'supabase/migrations');
function fail(s){throw new Error('Supabase migration history guard: '+s)}
if(manifest.hosted_applied_count!==manifest.records.length||!manifest.records.length)fail('baseline incomplete');
const files=readdirSync(folder).filter(name=>name.endsWith('.sql'));
if(files.some(name=>!/^\d{14}_[a-z0-9_]+\.sql$/.test(name)))fail('filename does not follow official CLI pattern');
const seenVersions=new Set(),seenNames=new Set();
for(const name of files){
 const version=name.slice(0,14),label=name.slice(15,-4);
 if(seenVersions.has(version))fail('duplicate local version '+version);
 seenVersions.add(version);
 if(seenNames.has(label))fail('duplicate local migration name '+label);
 seenNames.add(label);
}
for(const rec of manifest.records){
 const file=rec.version+'_'+rec.name+'.sql';
 if(!files.includes(file))fail('missing/renamed applied migration '+file);
 const contents=readFileSync(resolve(folder,file));
 const actual=createHash('sha1').update('blob '+contents.length+'\0').update(contents).digest('hex');
 if(actual!==rec.git_blob_sha||contents.length!==rec.bytes)fail('applied SQL modified: '+file);
}
if(manifest.records.at(-1).version!==manifest.last_applied_version)fail('invalid baseline ordering');
for(const name of files){
 const version=name.slice(0,14);
 if(!manifest.records.some(r=>r.version===version)&&version<=manifest.last_applied_version)
  fail('unexpected untracked/pending migration with old version '+name);
}
console.log('PASS: '+manifest.records.length+' migrations match the dated production baseline by exact version/name/byte-for-byte Git blob parity; '+(files.length-manifest.records.length)+' later file(s) outside this baseline. Their deployment state is not inferred. No hosted database accessed.');
