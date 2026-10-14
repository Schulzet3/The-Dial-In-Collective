import {mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const {SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key}=process.env;
if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key?.startsWith('sb_publishable_'))throw new Error('Provide SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to the build environment. Never use service-role, database or backup credentials.');
await rm(path.join(root,'dist'),{recursive:true,force:true});
const files=['admin/styles.css','admin/view.js','admin/main.js','styles.css','icon.svg','cloud/client.js','cloud/cache.js','cloud/outbox.js','cloud/mapping.js','cloud/shot_card.js','cloud/main.js','cloud/confirmation.js','cloud/import-entry.js','cloud/import-integration.js','cloud/import-ui.js','cloud/import-preview.js','cloud/import.css','lib/constants.js','lib/model.js','lib/engine.js','lib/ui.js'];
for(const file of files){const dst=path.join(root,'dist',file);await mkdir(path.dirname(dst),{recursive:true});await copyFile(path.join(root,'site',file),dst);}
await mkdir(path.join(root,'dist/vendor'),{recursive:true});
await copyFile(path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js'),path.join(root,'dist/vendor/supabase.js'));
await copyFile(path.join(root,'site/cloud.html'),path.join(root,'dist/index.html'));
await copyFile(path.join(root,'site/admin.html'),path.join(root,'dist/admin.html'));
await writeFile(path.join(root,'dist/cloud/config.js'),`// Public project coordinates only.\nexport const CLOUD_CONFIG=${JSON.stringify({enabled:true,supabaseUrl:url,publishableKey:key})};\n`);
await writeFile(path.join(root,'dist/_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ${url}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n  Cache-Control: no-cache\n`);
console.log('Owner-development assets built. No database secrets, exports, demo fixtures or source docs are included in dist. This is not the full beta.');
