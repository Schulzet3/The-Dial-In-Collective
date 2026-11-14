import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('unobtrusive yet readable footer on signed-in and signed-out app screen',()=>{
 const app=read('site/cloud/main.js'),css=read('site/styles.css');
 assert.match(app,/<footer class=footer>[^\n]*<a class="privacy-link" href="\/privacy\/">Privacy<\/a>/);
 assert.match(css,/\.footer \.privacy-link\{font-size:11px;color:var\(--muted\)/);
 assert.match(css,/\.footer \.privacy-link:focus-visible/);
 assert.doesNotMatch(css,/\.footer \.privacy-link\{[^}]*opacity:0/);
});
test('self-contained public legal policy is copied to built /privacy/ path',()=>{
 const page=read('site/privacy.html'),build=read('build_cloud.mjs');
 assert.match(page,/<h1>Privacy Policy<\/h1>/);
 assert.match(page,/Google Drive backup authorization/);
 assert.match(page,/drive\.file/);assert.match(page,/Supabase/);
 assert.match(page,/mailto:/);
 assert.match(build,/site\/privacy\.html/);assert.match(build,/dist\/privacy\/index\.html/);
 assert.doesNotMatch(page,/DIC_GITHUB_ACTIONS_READ_TOKEN|refresh_token|service_role/);
});
