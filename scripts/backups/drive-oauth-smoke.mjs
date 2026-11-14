#!/usr/bin/env node
/**
 * MANUAL-ONLY GitHub runner OAuth+Drive scoped-write test. No GitHub backup
 * data or production database access; creates and trashes only one test file.
 * Must execute from a reviewed, protected main branch, never on untrusted PRs.
 */
import {accessToken} from './drive-courier.mjs';
import {verifyFolder, proofUpload} from './verify-drive-oauth.mjs';

const required=['DIC_DRIVE_CLIENT_ID','DIC_DRIVE_CLIENT_SECRET','DIC_DRIVE_REFRESH_TOKEN'];
for (const key of required) if (!process.env[key]) throw new Error('Missing GitHub Actions OAuth secret '+key);
const token=await accessToken(process.env);
const folder=await verifyFolder(token);
await proofUpload(token);
console.log('PASS: GitHub-runner OAuth refresh, exact-folder access, disposable resumable upload, MD5/size/parent verification, and confirmed trash cleanup. Folder ID '+folder.id);
