import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=['site/styles.css','site/visual.css','site/cloud/import.css','site/admin/styles.css'];
test('app-wide text shadows explicitly disabled for all elements in Light and Dark',()=>{
 assert.match(read('site/visual.css'),/\*,\*::before,\*::after\{text-shadow:none!important\}/);
 for(const path of css){const source=read(path);const decls=[...source.matchAll(/text-shadow\s*:\s*([^;}]+)/gi)].map(m=>m[1].trim().toLowerCase());assert.ok(decls.every(v=>v==='none'||v==='none!important'),path+' unexpected text shadow '+decls);}
});
test('no decorative surface, toast or modal shadows remain',()=>{
 const base=read('site/styles.css'),v=read('site/visual.css');
 assert.equal((base.match(/--shadow:none/g)||[]).length,2);
 assert.equal((v.match(/--card-shadow:none/g)||[]).length,2);
 assert.match(v,/\.coffee-card\.is-current\{border:2px solid var\(--accent\);box-shadow:none\}/);
});
test('interface JavaScript does not introduce text-shadow styles or text strokes',()=>{
 const dirs=['site/cloud','site/admin','site/lib'];
 for(const dir of dirs){for(const file of readdirSync(new URL('../'+dir+'/',import.meta.url)).filter(n=>/\.(js|css)$/.test(n))){
  const src=read(dir+'/'+file);
  assert.doesNotMatch(src,/text-shadow\s*:\s*(?!none)[^;}]+/i,dir+'/'+file);
  assert.doesNotMatch(src,/textShadow\s*:/,dir+'/'+file);
  assert.doesNotMatch(src,/(?:-webkit-)?text-stroke\s*:/i,dir+'/'+file);
 }}
});
