import {ImportPanel} from './import-ui.js';
const installed=Symbol.for('dic.native-import-installed');

// Small explicit extension of the existing CloudApp settings surface. Keeping
// this installer separate avoids replacing the established logging/sync code.
export function installNativeImport(App,dom=globalThis.document,Panel=ImportPanel){
 if(App.prototype[installed])return;
 Object.defineProperty(App.prototype,installed,{value:true});
 const settings=App.prototype.settings,click=App.prototype.click;
 App.prototype.settings=function(...args){
  const result=settings.apply(this,args);
  const links=dom.querySelector('#sheet .settings-recovery');
  if(links&&!links.querySelector('[data-action="import-backup"]')){
   const button=dom.createElement('button');button.type='button';button.className='ghost';button.dataset.action='import-backup';button.textContent='Import backup';
   links.insertBefore(button,links.firstChild);
  }
  return result;
 };
 App.prototype.click=function(event){
  if(event.target.closest('[data-action]')?.dataset.action!=='import-backup')return click.call(this,event);
  this.importPanel ||= new Panel(this);
  return this.importPanel.open().catch(error=>this.error(error));
 };
}
