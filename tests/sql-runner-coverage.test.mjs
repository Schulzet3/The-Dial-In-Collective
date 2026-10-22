import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmodSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const files=dir=>readdirSync(join(root,dir)).filter(name=>name.endsWith('.sql')).sort().map(name=>dir+'/'+name);
const digest=path=>createHash('sha256').update(readFileSync(join(root,path))).digest('hex');

test('actual SQL runner dispatches every checked-in suite once at its required schema boundary',()=>{
 const temp=mkdtempSync(join(tmpdir(),'dic-sql-dispatch-'));
 try{
  const bin=join(temp,'bin'),trace=join(temp,'trace');
  mkdirSync(bin);
  // This command records SQL bytes without a database, network or credentials.
  // Actual SQL behavior is tested separately in the disconnected CI container.
  writeFileSync(join(bin,'docker'),`#!/bin/sh
set -eu
case "$1" in
 run) printf 'fake-isolated-container\\n'; exit 0 ;;
 rm) exit 0 ;;
 exec)
  for arg in "$@"; do
   case "$arg" in
    pg_isready) exit 0 ;;
    psql) sha256sum >> "$DIC_SQL_DISPATCH_TRACE"; exit 0 ;;
   esac
  done ;;
esac
exit 99
`);
  chmodSync(join(bin,'docker'),0o700);
  execFileSync('bash',['scripts/audit/isolated-sql-regression.sh'],{
   cwd:root,encoding:'utf8',timeout:20_000,
   env:{PATH:bin+delimiter+(process.env.PATH||''),
    GITHUB_RUN_ID:'dispatch-test',GITHUB_RUN_ATTEMPT:'1',DIC_SQL_DISPATCH_TRACE:trace}
  });
  const migrations=files('supabase/migrations'),suites=files('supabase/tests');
  const expected=['tests/sql/bootstrap.sql',...migrations,'tests/sql/owner-fixture.sql',...suites];
  const byHash=new Map(expected.map(path=>[digest(path),path]));
  assert.equal(byHash.size,expected.length,'SQL fixtures must have distinct traceable content');
  const observed=readFileSync(trace,'utf8').trim().split('\n').map(line=>{
   const hash=line.split(/\s+/)[0];
   assert.ok(byHash.has(hash),'runner dispatched an unexpected SQL file');
   return byHash.get(hash);
  });
  assert.deepEqual(observed.slice().sort(),expected.slice().sort(),
   'every migration and regression must be dispatched exactly once');
  assert.equal(observed[0],'tests/sql/bootstrap.sql');
  for(let index=1;index<migrations.length;index++)
   assert.ok(observed.indexOf(migrations[index-1])<observed.indexOf(migrations[index]),
    'migrations must preserve ordered history');
  const historical={
   security_foundation:'20261012015655_dic_internal_function_access',
   native_import:'20261012183845_dic_import_qualified_validation',
   owner_only_import_exception:'20261014152014_dic_owner_only_import_exception',
   setup_rename_feed_memory:'20261014200634_dic_setup_rename_feed_memory'
  };
  for(const [suite,migration] of Object.entries(historical))
   assert.equal(observed.indexOf('supabase/tests/'+suite+'.sql'),
    observed.indexOf('supabase/migrations/'+migration+'.sql')+1,suite+' ran at the wrong schema boundary');
  const fixture=observed.indexOf('tests/sql/owner-fixture.sql');
  assert.ok(fixture>observed.indexOf(migrations.at(-1)));
  for(const suite of suites.filter(path=>!Object.hasOwn(historical,path.split('/').at(-1).slice(0,-4))))
   assert.ok(observed.indexOf(suite)>fixture,suite+' must exercise the final schema');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
