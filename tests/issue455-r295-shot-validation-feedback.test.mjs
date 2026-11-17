import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acknowledgeShotInput} from '../site/lib/ui.js';

const field=(attrs={},form=null)=>({
 attrs:{...attrs},
 getAttribute(name){return this.attrs[name]??null;},
 removeAttribute(name){delete this.attrs[name];},
 closest(selector){assert.equal(selector,'form');return form;}
});

test('R295 correcting a client-invalid Log Shot measurement clears stale feedback and its own invalid semantics',()=>{
 const form={querySelector(selector){assert.equal(selector,'[aria-invalid="true"]');return null;}};
 const dose=field({'aria-invalid':'true','aria-describedby':'shot-validation-feedback'},form);
 const feedback={textContent:'Dose must be between valid measured limits.'};
 assert.equal(acknowledgeShotInput(dose,feedback),true);
 assert.equal(feedback.textContent,'');
 assert.equal(dose.getAttribute('aria-invalid'),null);
 assert.equal(dose.getAttribute('aria-describedby'),null);
});

test('R295 ordinary input must not erase an unrelated cloud/server error',()=>{
 const yieldField=field();
 const feedback={textContent:'Cloud connection failed. Try again.'};
 assert.equal(acknowledgeShotInput(yieldField,feedback),false);
 assert.equal(feedback.textContent,'Cloud connection failed. Try again.');
});

test('R295 field correction preserves unrelated describedby and other invalid inputs',()=>{
 const form={querySelector(selector){assert.equal(selector,'[aria-invalid="true"]');return other.getAttribute('aria-invalid')==='true'?other:null;}};
 const timeField=field({'aria-invalid':'true','aria-describedby':'help-time'},form);
 const other=field({'aria-invalid':'true','aria-describedby':'shot-validation-feedback'});
 const feedback={textContent:'Time invalid; yield invalid.'};
 assert.equal(acknowledgeShotInput(timeField,feedback),true);
 assert.equal(timeField.getAttribute('aria-describedby'),'help-time');
 assert.equal(other.getAttribute('aria-invalid'),'true');
 assert.equal(feedback.textContent,'Time invalid; yield invalid.');
});

test('R295 harmless null/missing input and noninvalid legacy validation label',()=>{
 assert.equal(acknowledgeShotInput(null,{textContent:'Keep'}),false);
 const input=field({'aria-describedby':'shot-validation-feedback'});
 const feedback={textContent:'Cloud error'};
 assert.equal(acknowledgeShotInput(input,feedback),false);
 assert.equal(input.getAttribute('aria-describedby'),null);
 assert.equal(feedback.textContent,'Cloud error');
});

test('R295 the real CloudApp input handler calls the tested helper only inside Log Shot',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.ok(source.includes("if(ev.target.closest?.('#shot')){U.acknowledgeShotInput(ev.target,sheet.querySelector('#shot-validation-feedback'));}"));
 assert.ok(source.includes("M.validateShot(d,{allowLegacyCustom:!!this.editing&&this.editing.style==='Custom'})"));
 assert.ok(source.includes("this.draft.tasteScales[target.dataset.key]=Number(target.dataset.value)"));
});
