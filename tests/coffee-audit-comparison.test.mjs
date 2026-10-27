import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCoffeeAuditValue as normalize} from '../scripts/audit/coffee-corpus-normalize.mjs';

test('audit normalization never upgrades lost numeric qualifiers to exact equivalence',()=>{
 for(const [expected,actual] of [['>1600m','1600m'],['~1100 MASL','1100 MASL'],['1600m+','1600m'],
  ['≥1600m','>1600m'],['±100m','100m'],['-100m','100m'],['1.5','1-5'],['1:2','1.2'],['50%','50']])
  assert.notEqual(normalize(expected),normalize(actual),expected+' versus '+actual);
});
test('strict audit normalization still accepts harmless layout, accents and equivalent operator glyphs',()=>{
 for(const [expected,actual] of [['Bourbon Ají','bourbon aji'],['Colombia, Huila','Colombia / Huila'],
  ['1,600 – 1,800 MASL','1,600-1,800 masl'],['≥ 1600m','>=1600m'],['≈1100m','~1100m'],['Peach & tea','peach and tea']])
  assert.equal(normalize(expected),normalize(actual),expected+' versus '+actual);
});
