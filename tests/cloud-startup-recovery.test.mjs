import test from 'node:test';
import assert from 'node:assert/strict';
import {armStartupRecovery} from '../site/cloud/startup-recovery.js';
const shell='<main role="status">Opening your workspace</main>';
function setup(){const root={innerHTML:shell};let fire,cleared=false;const stop=armStartupRecovery(root,{schedule:fn=>(fire=fn,7),cancel:id=>{assert.equal(id,7);cleared=true;}});return {root,fire,stop,wasCleared:()=>cleared};}
test('stalled initialization shows only a neutral retry, never private workspace',()=>{const s=setup();s.fire();assert.match(s.root.innerHTML,/taking longer/);assert.match(s.root.innerHTML,/href="\/"/);assert.doesNotMatch(s.root.innerHTML,/coffee|email|token|member/i);s.stop();assert.equal(s.wasCleared(),true);});
test('successful startup is not overwritten by delayed recovery',()=>{const s=setup();s.root.innerHTML='<main>Workspace ready</main>';s.fire();assert.equal(s.root.innerHTML,'<main>Workspace ready</main>');s.stop();});
test('failed startup error is not overwritten by recovery',()=>{const s=setup();s.root.innerHTML='<main>Cloud setup in progress</main>';s.fire();assert.equal(s.root.innerHTML,'<main>Cloud setup in progress</main>');});
