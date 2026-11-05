// READY-only candidate regression helper: require exact last-published narrative bytes.
// Unisolated development retains the stricter Issue #33 selected-grower assertions.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const currentPublishedSource=()=>JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8')).published_base?.tested_source_sha;
const PUBLISHED_BLOB='221f2140645c5d1353e5eeebd4581f31e9962d6b';
const PATH='src/server/coffee-narrative-evidence.mjs';
export function isPublishedNarrativeRestored(){
 let manifest;
 try{manifest=JSON.parse(readFileSync(new URL('../../docs/RELEASE_CANDIDATE.json',import.meta.url),'utf8'));}
 catch(e){if(e?.code==='ENOENT')return false;throw e;}
 if(manifest?.kind!=='DIC-READY-ONLY-SOURCE-1'||
    manifest.published_source_sha!==currentPublishedSource()||
    manifest.publication_authorized!==false||
    !manifest.restored_to_published_paths?.includes(PATH))return false;
 const bytes=readFileSync(new URL('../../'+PATH,import.meta.url));
 const observed=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(observed,PUBLISHED_BLOB,'isolated source must equal exact published narrative Git blob');
 return true;
}

