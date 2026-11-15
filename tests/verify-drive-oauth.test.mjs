import test from 'node:test';
import assert from 'node:assert/strict';
import {credentialsFromJson, oauthUrl, validatePickerSelection, TARGET_ID, SCOPE} from '../scripts/backups/verify-drive-oauth.mjs';

test('accepts only Google desktop OAuth client JSON, not a service account',()=>{
  const valid=JSON.stringify({installed:{client_id:'abc.apps.googleusercontent.com',
    client_secret:'synthetic',token_uri:'https://oauth2.googleapis.com/token'}});
  assert.equal(credentialsFromJson(valid).client_secret,'synthetic');
  assert.throws(()=>credentialsFromJson(JSON.stringify({web:{}})));
  assert.throws(()=>credentialsFromJson(JSON.stringify({installed:{client_id:'wrong',client_secret:'x',token_uri:'https://oauth2.googleapis.com/token'}})));
});
test('Picker OAuth requests only drive.file, folder selection, offline access and PKCE',()=>{
  const url=new URL(oauthUrl({client_id:'synthetic',redirect_uri:'http://127.0.0.1:1234/oauth2callback',state:'random',code_challenge:'fakechallenge'}));
  const q=url.searchParams;
  assert.equal(url.host,'accounts.google.com');
  assert.equal(q.get('scope'),SCOPE);
  assert.equal(q.get('access_type'),'offline');
  assert.equal(q.get('prompt'),'consent');
  assert.equal(q.get('trigger_onepick'),'true');
  assert.equal(q.get('allow_folder_selection'),'true');
  assert.equal(q.get('code_challenge_method'),'S256');
  assert.equal(q.get('mimetypes'),'application/vnd.google-apps.folder');
  assert.equal(q.get('state'),'random');
  assert.equal(q.has('client_secret'),false);
});
test('rejects wrong, missing, ambiguous and extra Google Picker selections',()=>{
  assert.doesNotThrow(()=>validatePickerSelection(TARGET_ID));
  for(const s of ['', 'some-other-folder', TARGET_ID+',some-other-folder', TARGET_ID+',', ' '+TARGET_ID]) {
    assert.throws(()=>validatePickerSelection(s));
  }
});
