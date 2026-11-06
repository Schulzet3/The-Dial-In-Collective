// READY-only candidate regression helper: verify the exact CURRENT published
// narrative Git object, not a stale hard-coded list of older release SHAs.
// Unisolated development retains stricter Issue #33 grower assertions.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const SHA=/^[a-f0-9]{40}$/;
const PATH='src/server/coffee-narrative-evidence.mjs';
export function isPublishedNarrativeRestored(){
 let manifest;
 try{manifest=JSON.parse(readFileSync(new URL('../../docs/RELEASE_CANDIDATE.json',import.meta.url),'utf8'));}
 catch(e){if(e?.code==='ENOENT')return false;throw e;}
 if(manifest?.kind!=='DIC-READY-ONLY-SOURCE-1'||
    !SHA.test(manifest.published_source_sha||'')||
    manifest.publication_authorized!==false||
    !manifest.restored_to_published_paths?.includes(PATH))return false;
 const queue=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
 assert.equal(queue?.published_base?.tested_source_sha,manifest.published_source_sha,
  'candidate narrative restoration must match the exact queued published baseline');
 const bytes=readFileSync(new URL('../../'+PATH,import.meta.url));
 const observed=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const expected=execFileSync('git',['rev-parse',manifest.published_source_sha+':'+PATH],
  {encoding:'utf8',timeout:15000}).trim();
 assert.match(expected,SHA,'independent published Git object must exist');
 assert.equal(observed,expected,'isolated narrative must exactly match current published Git blob');
 return true;
}
