import {e} from '../lib/ui.js';
import {parseImport,previewMarkup,MAX_IMPORT_BYTES} from './import-preview.js';

// Explicit CloudApp extension; every remote request is bound to its original owner.
export class ImportPanel {
 constructor(app){this.app=app;this.generation=0;this.clear();app.client.onAuthChange((event,user)=>{if(this.owner && user?.id!==this.owner)this.clear();});}
 clear(){this.generation++;this.owner=null;this.file=null;this.review=null;this.source=null;this.summary=null;this.recoverySaved=false;this.downloaded=false;}
 active(generation=this.generation){return generation===this.generation && this.owner===this.app.identity?.id && !!document.querySelector('#native-import-panel') && !!document.querySelector('#sheet')?.open;}
 async open(){
  this.clear();if(!this.app.identity||!this.app.status?.admitted)throw new Error('Sign in with your admitted account first.');
  if((await this.app.queue.pending()).length)throw new Error('Finish syncing pending changes before importing a backup.');
  this.owner=this.app.identity.id;this.render();
 }
 render(){
  const app=this.app;
  app.show('Import Backup',`<section id=native-import-panel>
   <p class=helper>Import into <strong>${e(app.identity?.email||'your account')}</strong>. Choose the reviewed backup or a personal local-prototype backup. File selection alone does not upload or save anything.</p>
   <label class="field import-zone"><span>Backup File</span><input id=import-file type=file accept=".json,.txt,application/json,text/plain"><small>Up to 2 MB. One setup / one equipment version in this first importer.</small></label>
   <div id=import-review></div><p id=import-status class=helper role=status aria-live=polite></p>
   <div class="import-actions"><button type=button id=import-validate class="primary full" disabled>Validate Import</button>
   <button type=button id=import-recovery class="ghost full" hidden>Save Recovery Copy</button>
   <label id=import-ack-label class=checkline hidden><input type=checkbox id=import-ack><span>I saved the recovery copy and kept my original iPhone data.</span></label>
   <button type=button id=import-confirm class="primary full" hidden disabled>Confirm Import</button>
   <button type=button id=import-back class="text-button">Back to Settings</button></div>
  </section>`);
  document.querySelector('#import-file').addEventListener('change',ev=>this.choose(ev.target.files?.[0]));
  document.querySelector('#import-validate').addEventListener('click',()=>this.validate());
  document.querySelector('#import-recovery').addEventListener('click',()=>this.download());
  document.querySelector('#import-ack').addEventListener('change',ev=>{this.recoverySaved=ev.target.checked;this.controls();});
  document.querySelector('#import-confirm').addEventListener('click',()=>this.confirm());
  document.querySelector('#import-back').addEventListener('click',()=>{this.clear();app.settings();});
 }
 status(message,error=false){const node=document.querySelector('#import-status');if(node){node.textContent=message;node.className=error?'error-box':'helper';}}
 controls(){
  if(!this.active())return;
  const valid=!!this.review?.ok&&!this.review.alreadyImported;
  document.querySelector('#import-validate').disabled=!this.source||this.busy;
  document.querySelector('#import-recovery').hidden=!valid;
  document.querySelector('#import-ack-label').hidden=!valid||!this.review?.canImport;
  const button=document.querySelector('#import-confirm');button.hidden=!valid;button.disabled=this.busy||!this.review?.canImport||!this.recoverySaved||!this.downloaded;
  button.textContent=this.review&&!this.review?.canImport?'Import locked until recovery is verified':'Confirm Import';
 }
 async choose(file){
  if(!file)return;const g=++this.generation;this.source=null;this.review=null;this.summary=null;this.downloaded=false;this.recoverySaved=false;this.busy=false;
  this.controls();this.status('Reading backup...');
  try{
   if(file.size>MAX_IMPORT_BYTES)throw new Error('Choose a backup no larger than 2 MB.');
   const text=await file.text();if(!this.active(g))return;
   const parsed=parseImport(text);this.source=parsed.document;this.summary=parsed.summary;this.file=file.name;
   document.querySelector('#import-review').innerHTML=previewMarkup(this.summary);this.status('File checked locally. Validate it against your cloud account next.');
  }catch(error){if(this.active(g)){document.querySelector('#import-review').replaceChildren();this.status(error.message,true);}}
  finally{if(this.active(g))this.controls();}
 }
 async validate(){
  if(this.busy||!this.source||!this.active())return;const g=this.generation,owner=this.owner,source=this.source;
  this.busy=true;this.controls();this.status('Checking ownership, references and duplicates. Nothing will be saved.');
  try{
   if(!navigator.onLine)throw new Error('Connect to the internet to validate this import. Your file is unchanged.');
   if((await this.app.queue.pending()).length)throw new Error('Finish syncing before validating an import.');
   const result=await this.app.client.previewImport(owner,source);if(!this.active(g))return;
   if(!result?.ok)throw new Error(result?.message||'Server validation could not finish.');
   this.review=result;document.querySelector('#import-review').innerHTML=previewMarkup(this.summary,result);
   this.status(result.alreadyImported?'Already imported. No changes were made.':'Preview complete. Your cloud and iPhone data are unchanged.');
  }catch(error){if(this.active(g)){this.review=null;this.status(error.message,true);}}
  finally{if(this.active(g)){this.busy=false;this.controls();}}
 }
 async download(){
  if(!this.active()||!this.source||!this.review?.ok)return;
  const g=this.generation;this.busy=true;this.controls();
  try{
   const current=await this.app.client.read();if(!this.active(g))return;if(current?.preferences?.owner_id!==this.owner)throw new Error('Account changed before the recovery snapshot was read.');
   const data={format:'the-dial-in-collective-import-recovery',exportedAt:new Date().toISOString(),owner:this.owner,reviewHash:this.review.reviewHash,originalBackup:this.source,beforeImport:current};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=`The_Dial_In_Collective_Import_Recovery_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   this.downloaded=true;this.status('Recovery download requested. Check that it is saved in Files/Downloads; this is not an automated cloud backup.');
  }catch(error){if(this.active(g))this.status(error.message,true);}
  finally{if(this.active(g)){this.busy=false;this.controls();}}
 }
 async confirm(){
  if(this.busy||!this.active()||!this.review?.canImport||!this.recoverySaved||!this.downloaded)return;
  const g=this.generation,owner=this.owner;this.busy=true;this.app.busy=true;this.controls();this.status('Importing the reviewed records in one transaction...');
  try{
   if((await this.app.queue.pending()).length)throw new Error('Finish syncing before importing.');
   const result=await this.app.client.commitImport(owner,this.source,this.review.reviewHash,true);
   if(!this.active(g))return;
   if(!result?.ok)throw new Error(result?.message||'Import was not saved. Your original file is unchanged.');
   this.review={...result,alreadyImported:true,canImport:false};await this.app.sync();
   if(this.active(g)){this.status('Import complete. No records were overwritten.');document.querySelector('#import-review').innerHTML=previewMarkup(this.summary,this.review);}
  }catch(error){if(this.active(g))this.status(`${error.message} Retain this exact file; retrying it cannot add the same import twice.`,true);}
  finally{this.app.busy=false;if(this.active(g)){this.busy=false;this.controls();}}
 }
}
