import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('owner supersession leaves no Claude/AI implementation in the running app',()=>{
 for(const path of ['site/cloud/claude-coffee.js','src/server/coffee-semantic-source.mjs',
  'tests/coffee-claude-local-byok.test.mjs'])
  assert.equal(existsSync(new URL(path,root)),false,path+' should be removed');
 for(const path of ['site/cloud/main.js','site/cloud/coffee-url-autofill.js',
  'netlify/functions/coffee-url-preview.mjs','src/server/coffee-page-metadata.mjs','build_cloud.mjs']){
  assert.doesNotMatch(read(path),/claude-coffee|claude_enhancement|claude_evidence|semantic_text|semanticCoffeeSourceText|include_semantic_text|api\.anthropic\.com|saveClaudeKey|enhanceWithClaude|x-api-key/i,path);
 }
 assert.doesNotMatch(read('build_cloud.mjs'),/anthropic/);
 assert.doesNotMatch(read('netlify/functions/coffee-url-preview.mjs'),/BYOK|Anthropic/);
});
test('unverified deterministic preview does not provide scraped semantic data or model credentials',()=>{
 const url='https://roaster.example.com/products/lot';
 const html='<html><head><meta property="og:type" content="product">'+
  '<meta property="og:title" content="Example Lot"></head><body>'+
  '<main><h1>Example Lot</h1><p>Origin: Colombia</p></main></body></html>';
 const r=extractPublicCoffeeFacts(html,{source_url:url,include_semantic_text:true});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Colombia');
 assert.equal(Object.hasOwn(r,'semantic_text'),false);
 assert.equal(Object.hasOwn(r,'claude_enhancement'),false);
 assert.equal(Object.hasOwn(r,'claude_evidence'),false);
});
