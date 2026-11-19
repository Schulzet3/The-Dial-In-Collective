import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot,TIME} from './cloud-fixtures/raw.js';

// Provider SQL orders shots by pulled_at alone. Equal instants are allowed by
// schema/imports; the transport can deliver tied rows in either order.
test('#509 hydrate equal-instant shots and their advice deterministically',()=>{
 const a=rawShot({id:'shot-a',pulled_at:TIME,yield_g:35,extraction:2,body:2,clarity:3,sweetness:3});
 const b=rawShot({id:'shot-b',pulled_at:'2026-10-01T13:00:00+01:00',yield_g:52,extraction:5,body:5,clarity:5,sweetness:5});
 const raw=rawFixture();
 raw.shots=[b,a];
 const left=hydrate(raw);
 raw.shots=[a,b];
 const right=hydrate(raw);
 assert.deepEqual(left.shots.map(x=>x.id),['shot-a','shot-b']);
 assert.deepEqual(right.shots.map(x=>x.id),['shot-a','shot-b']);
 assert.deepEqual(left.shots.map(x=>x.suggestion),right.shots.map(x=>x.suggestion));
 assert.equal(left.shots.length,2,'must not drop either historical shot');
});

test('#509 hydrate preserves old malformed and hidden shots while ordering valid instants',()=>{
 const raw=rawFixture();
 raw.shots=[
  rawShot({id:'shot-z',pulled_at:'unparseable',hidden_at:TIME}),
  rawShot({id:'shot-b',pulled_at:'2026-10-02T00:00:00Z'}),
  rawShot({id:'shot-a',pulled_at:TIME})
 ];
 const state=hydrate(raw);
 assert.deepEqual(state.shots.map(x=>x.id),['shot-z','shot-b','shot-a'], 'distinct shot instants retain provider/History presentation order');
 assert.equal(state.shots[0].hidden,true);
 assert.equal(state.shots.length,3);
});
