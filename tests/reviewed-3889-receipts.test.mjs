import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReviewedReceiptDelta,reviewedHistoricalReceiptCorrection,exactQueueBlob,FAMILY_ID} from '../scripts/release/reviewed-3889-receipts.mjs';
const ids=[["DIC-Q-509-admin-normalized-identity",[44405688303,44406406046,44406406174]],["DIC-Q-509-source-path-case-guard-20261115",[43715405733]],["DIC-Q-509-confirm-coffee-null-name",[44289071815,44289071927,44289525218,44290199558]],["DIC-Q-33-r347-original299-directions-source",[44685623135,44686742250]],["DIC-Q-509-admin-push-lazy-vault-poll",[44740390567,44741312173]],["DIC-Q-455-r444-pending-shot-form-lock",[45029642249]]];
const q=()=>({items:[...ids.map(([id,runs],i)=>({id,state:'READY',ci_runs:[...runs,100+i],scope_paths:['scope/'+i],tests:['test'],merged_source_sha:'a'.repeat(40),blockers:[]})),{id:FAMILY_ID,state:'TESTING',ci_runs:[44526403238,44526403147,44526403127,44526403259],merged_source_sha:'1def2c9d6573297c406192b413ffc3e7620ffe7a',blockers:['unchanged']},{id:'other',state:'DEPLOYED',ci_runs:[123]}]});
test('reviewed receipt delta archives precisely 13 non-success runs and restores four exact historical family runs without changing states or scope',()=>{
 const before=q(),frozen=structuredClone(before),out=applyReviewedReceiptDelta(before);
 assert.deepEqual(before,frozen);
 const expected=structuredClone(before);
 for(let i=0;i<ids.length;i++)expected.items[i].ci_runs=[100+i];
 expected.items[6].ci_runs.unshift(44519926449,44519926537,44519926388,44519926461);
 assert.deepEqual(out,expected);
});
test('unknown queue cannot authorize a historical receipt correction',()=>{
 const before=q();
 assert.equal(reviewedHistoricalReceiptCorrection(before,{selectedIds:[FAMILY_ID],developmentSourceSha:'a'.repeat(40),sourceObjectAt:()=>{throw Error('not called')}}),null);
 assert.match(exactQueueBlob(before),/^[0-9a-f]{40}$/);
});
for(const [name,change] of [
 ['missing archived receipt',x=>x.items[0].ci_runs.shift()],
 ['duplicate archived receipt',x=>x.items[0].ci_runs.push(x.items[0].ci_runs[0])],
 ['wrong item state',x=>x.items[0].state='TESTING'],
 ['wrong family SHA',x=>x.items[6].merged_source_sha='b'.repeat(40)],
 ['foreign family run',x=>x.items[6].ci_runs.push(123)],
 ['duplicated row',x=>x.items.push(x.items[0])],
 ['no successful reference',x=>x.items[0].ci_runs.pop()]
])test('reject '+name,()=>{const x=q();change(x);assert.throws(()=>applyReviewedReceiptDelta(x))});
