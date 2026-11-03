import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseRelease} from '../scripts/release/rehearse-no-publish.mjs';
const batch={ready:true,errors:[],ready_items:[{id:'DIC-Q-100'}]};
test('no-publish rehearsal denies empty, unsafe and mismatched owner grants',()=>{
 assert.equal(rehearseRelease({assessment:{ready:false,errors:['unready merged code']}}).status,'DENIED_NO_PUBLICATION');
 assert.equal(rehearseRelease({assessment:batch,grant:{approved_ready_item_ids:['DIC-Q-101']}}).ready,false);
 assert.equal(rehearseRelease({assessment:batch,grant:{approved_ready_item_ids:['DIC-Q-100','DIC-Q-101']}}).ready,false);
 assert.equal(rehearseRelease({assessment:batch,grant:{approved_ready_item_ids:['DIC-Q-100']}}).status,
 'SOURCE_AND_OWNER_SCOPE_PREFLIGHT_PASS_NO_PUBLICATION');
});
