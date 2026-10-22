import {mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSiteSource,validateDist} from './scripts/audit/site-integrity.mjs';
import {checkRepository} from './scripts/audit/approval-coverage.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const {SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key}=process.env;
if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key?.startsWith('sb_publishable_'))throw new Error('Provide SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to the build environment. Never use service-role, database or backup credentials.');
// No Netlify or local cloud build can silently omit an approved UI contract.
// This checks SOURCE, not owner device acceptance, before touching dist.
checkRepository();
validateSiteSource(root);
await rm(path.join(root,'dist'),{recursive:true,force:true});
const files=['visual.css','cloud/appearance.js','cloud/appearance-bootstrap.js','admin/styles.css','admin/view.js','admin/records.js','admin/main.js','styles.css','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest','cloud/client.js','cloud/cache.js','cloud/outbox.js','cloud/mapping.js','cloud/shot_card.js','cloud/community.js','cloud/coffee-match-ui.js','cloud/coffee-url-autofill.js','cloud/dose-advisory.js','cloud/main.js','cloud/confirmation.js','lib/constants.js','lib/model.js','lib/engine.js','lib/ui.js'];
for(const file of files){const dst=path.join(root,'dist',file);await mkdir(path.dirname(dst),{recursive:true});await copyFile(path.join(root,'site',file),dst);}
await mkdir(path.join(root,'dist/vendor'),{recursive:true});
await copyFile(path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js'),path.join(root,'dist/vendor/supabase.js'));
await copyFile(path.join(root,'site/cloud.html'),path.join(root,'dist/index.html'));
await copyFile(path.join(root,'site/admin.html'),path.join(root,'dist/admin.html'));
await writeFile(path.join(root,'dist/cloud/config.js'),`// Public project coordinates only.\nexport const CLOUD_CONFIG=${JSON.stringify({enabled:true,supabaseUrl:url,publishableKey:key})};\n`);
// Cache only a revisioned public app shell; never cache Auth, API or user data.
const publicShellAssets=[...new Set(['/', '/index.html',
 ...files.filter(file=>!file.startsWith('admin/')).map(file=>'/'+file),
 '/vendor/supabase.js','/cloud/config.js'])];
const shellHash=createHash('sha256');
for(const asset of publicShellAssets){
 shellHash.update(asset);
 shellHash.update(await readFile(path.join(root,'dist',asset==='/'?'index.html':asset.slice(1))));
}
const template=await readFile(path.join(root,'scripts/pwa/service-worker.template.txt'),'utf8');
const serviceWorker=template.replaceAll('__DIC_BUILD_ID__',shellHash.digest('hex').slice(0,20))
 .replaceAll('__DIC_ASSETS__',JSON.stringify(publicShellAssets));
await writeFile(path.join(root,'dist/sw.js'),serviceWorker);
await writeFile(path.join(root,'dist/_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ${url}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n  Cache-Control: no-cache\n`);
validateDist(root);
console.log('Owner-development assets built. No database secrets, exports, demo fixtures or source docs are included in dist. This is not the full beta.');
