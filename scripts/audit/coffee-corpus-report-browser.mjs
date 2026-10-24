#!/usr/bin/env node
/** Offline browser checks of the actual generated 603-case report. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const [executablePath,reportPath,receiptPath]=process.argv.slice(2);
if(!receiptPath)throw new Error('Usage: coffee-corpus-report-browser.mjs CHROMIUM REPORT RECEIPT');
const report=path.resolve(reportPath),bytes=await fs.readFile(report);
const browser=await chromium.launch({executablePath,headless:true,args:['--disable-dev-shm-usage','--disable-background-networking']});
const browserVersion=await browser.version();
const errors=[],requests=[],checks=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(report).href,{waitUntil:'load'});
  await page.getByText('603 of 603 cases shown.',{exact:true}).waitFor();
  assert.equal(await page.locator('details.case').count(),603);
  assert.equal(await page.locator('#field-results tbody tr').count(),10);
  assert.equal(await page.evaluate(()=>JSON.parse(document.getElementById('audit-data').textContent).cases.length),603);
  await page.locator('#search').fill('Arbey Cordoba');
  assert.equal(await page.locator('details.case').count(),1);
  await page.locator('details.case > summary').click();
  await page.locator('.case .field-table').waitFor();
  assert.match(await page.locator('.case .field-table').innerText(),/bourbon ají/i);
  await page.getByText('Complete extracted preview, source information and recipes',{exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  assert.match(await page.locator('.case .body').innerText(),/Arbey Cordoba/);
  const screenshot=path.join(path.dirname(path.resolve(receiptPath)),'coffee-audit-report-'+width+'.png');
  await page.screenshot({path:screenshot,fullPage:false});
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();
  await page.locator('#status').selectOption('missing');
  const expected=await page.evaluate(()=>JSON.parse(document.getElementById('audit-data').textContent).cases.filter(c=>c.canonical.some(f=>f.status==='missing')).length);
  assert.equal(await page.locator('details.case').count(),expected);
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();
  assert.equal(await page.locator('details.case').count(),603);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  checks.push({width,case_count:603,field_count:10,arbey_review:true,complete_output_visible:true,filters:true,no_document_overflow:true,screenshot});
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
}finally{await browser.close();}
await fs.writeFile(receiptPath,JSON.stringify({created_at:new Date().toISOString(),report,report_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
 browser:executablePath,browser_version:browserVersion,script_sha256:crypto.createHash('sha256').update(await fs.readFile(import.meta.filename)).digest('hex'),
 checks,errors,blocked_network_requests:requests},null,2)+'\n');
console.log(JSON.stringify({receipt:receiptPath,checks:checks.length,errors:errors.length,network_requests:requests.length}));
