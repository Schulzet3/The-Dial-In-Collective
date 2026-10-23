import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hydrate,shotPayload,applyPending} from '../site/cloud/mapping.js';
import * as E from '../site/lib/engine.js';
import {rawFixture} from './cloud-fixtures/raw.js';
function fixture(notes){
 const state=hydrate(rawFixture());
 const draft={...E.prefill(state,'coffee'),id:'long-notes',yieldG:36,timeS:27,grindSetting:1,notes,tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}};
 return {state,draft};
}
for(const n of [10001,16000])test('notes retain all '+n+' characters in payload, pending display and local save',()=>{
 const notes='x'.repeat(n),{state,draft}=fixture(notes),payload=shotPayload(state,'coffee',draft);
 assert.equal(payload.notes,notes);
 const pending=applyPending(state,[{status:'pending',action:'save_shot',payload}]);
 assert.equal(pending.shots[0].notes,notes);assert.equal(state.shots.length,0);
 assert.equal(E.saveShot(state,'coffee',draft).notes,notes);
});
test('Unicode notes match the database code-point limit without cutting surrogate pairs',()=>{
 const notes='\u{1f600}'.repeat(16000),{state,draft}=fixture(notes);
 assert.equal(shotPayload(state,'coffee',draft).notes,notes);assert.equal(E.saveShot(state,'coffee',draft).notes,notes);
});
test('over-limit note is rejected before payload/save, with original text and state preserved',()=>{
 const {state,draft}=fixture('x'.repeat(16001)),before=JSON.stringify(state);
 assert.throws(()=>shotPayload(state,'coffee',draft),/16,000/);
 assert.throws(()=>E.saveShot(state,'coffee',draft),/16,000/);
 assert.equal(draft.notes.length,16001);assert.equal(JSON.stringify(state),before);
});
test('editing existing notes preserves text and rejects oversize without changing revision',()=>{
 const {state,draft}=fixture('original');const shot=E.saveShot(state,'coffee',draft);
 E.editShot(state,shot.id,{notes:'y'.repeat(16000)});assert.equal(shot.notes.length,16000);
 const revision=shot.revision;assert.throws(()=>E.editShot(state,shot.id,{notes:'z'.repeat(16001)}),/16,000/);
 assert.equal(shot.revision,revision);assert.equal(shot.notes,'y'.repeat(16000));
});
test('current privacy copy discloses the administrator exception without resurrecting Hide or deletion',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(source,/Authorized administrators can review account-linked records and notes/);
 assert.match(source,/Community does not show private notes/);
 assert.doesNotMatch(source,/even if you hide a personal shot or delete your account|personal setup details are never shared/);
});
