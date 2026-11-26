import test from 'node:test';
import assert from 'node:assert/strict';
import {assertExportPath} from '../scripts/release/prepare-owner-ready63-blobs.mjs';
test('public source export includes certified package and server scopes, not arbitrary roots',()=>{
 for(const p of ['package.json','src/server/coffee-source-facts.mjs','supabase/migrations/example.sql','netlify/functions/example.mjs','site/app.js','scripts/release/example.mjs','tests/example.mjs','.github/workflows/example.yml'])assertExportPath(p);
 for(const p of ['','/etc/passwd','../package.json','src/server/../../../.env','site/./x','src/server//x','src/server/.env.local','.env','package.json/extra','src/private/user.json','site/..\\.env'])assert.throws(()=>assertExportPath(p));
});
