// Administrator-only record explorer. Data must come from the server's
// live-admin-gated dic_admin_records RPC, never direct member table SELECT.
import {e} from '../lib/ui.js';
export const ADMIN_KINDS=['pending','conflicts','approved','shots'];
export function adminDisclosure(title,kind,count,content,{expanded=false}={}){
 const num=count!=null&&Number.isSafeInteger(Number(count))&&Number(count)>=0?String(Number(count)):'';
 return '<details class="admin-disclosure" data-admin-section="'+e(kind)+'"'+(expanded?' open':'')+'>'+
 '<summary class="admin-disclosure-summary"><h2>'+e(title)+'</h2>'+
 (num?'<span class="admin-count">'+e(num)+'</span>':'')+
 '<span class="admin-chevron" aria-hidden="true">⌄</span></summary>'+
 '<div class="admin-disclosure-body">'+content+'</div></details>';
}
const fields={
 coffee:[['name','Coffee Name'],['roaster','Roaster'],['release_label','Release / Harvest'],
 ['origin','Origin'],['process','Process'],['roast_level','Roast Level'],
 ['variety','Variety'],['producer','Producer'],['elevation_m','Elevation'],
 ['tasting_notes','Tasting Notes'],['summary','Summary'],['espressoNotes','Espresso Notes']],
 shots:[['dose_g','Dose (g)'],['yield_g','Yield (g)'],['time_s','Time (s)'],
 ['grind_setting','Grind'],['temperature_c','Temperature (C)'],
 ['extraction','Extraction'],['body','Body'],['clarity','Clarity'],
 ['sweetness','Sweetness'],['astringency','Astringency'],['notes','Private Notes']]
};
const string=v=>v==null?'':String(v);
const attr=(name,value)=>' '+name+'="'+e(string(value))+'"';
const date=v=>string(v).slice(0,10);
const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(string(value));
export function groupAdminShots(items=[]){
 const groups=[],found=new Map();
 for(const shot of items){
  const key=uuid(shot.library_entry_id)?'library:'+shot.library_entry_id:'orphan:'+string(shot.id);
  let g=found.get(key);
  if(!g){
   g={key,name:string(shot.coffee_name||'Coffee unavailable'),roaster:string(shot.coffee_roaster||''),
    owner:string(shot.creator_email||'Creator unavailable'),shots:[]};
   found.set(key,g);groups.push(g);
  }
  g.shots.push(shot);
 }
 return groups;
}
export function renderAdminShotGroups(items,{openCoffeeGroups=new Set()}={}){
 return groupAdminShots(items).map(g=>'<details class="admin-coffee-group" data-admin-coffee="'+e(g.key)+'"'+
  (openCoffeeGroups.has(g.key)?' open':'')+'><summary class="admin-coffee-summary"><strong>'+
  e(g.name)+'</strong><small>'+e(g.roaster?g.roaster+' · ':'')+e(g.owner)+' · '+e(String(g.shots.length))+
  ' shot'+(g.shots.length===1?'':'s')+' on this page</small><span class="admin-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="admin-coffee-shots">'+g.shots.map(row=>renderAdminRecord(row,'shots')).join('')+'</div></details>').join('');
}
const rowFields=(item,shot,approved)=>fields[shot?'shots':'coffee'].map(([key,label])=>{
 const value=string(item[key]);
 const multiline=['notes','tasting_notes','summary','espressoNotes'].includes(key);
 const maxLength=key==='notes'?16000:8000;
 const readonly=''; // Admin may edit canonical identity with server-side collision and revision checks.
 const input=multiline?'<textarea name="'+e(key)+'" rows="2" maxlength="'+maxLength+'">'+e(value)+'</textarea>':
  '<input name="'+e(key)+'" value="'+e(value)+'" maxlength="8000" '+readonly+' ' +(['dose_g','yield_g','time_s','grind_setting','temperature_c','extraction','body','clarity','sweetness','astringency'].includes(key)?'inputmode="decimal"':'')+'>';
 return '<label>'+e(label)+input+'</label>';
}).join('');
export function renderAdminCoffeeFacts(item){
 return '<dl class="admin-coffee-facts">'+[...fields.coffee,['source_url','Source URL']].map(([key,label])=>
  '<div><dt>'+e(label)+'</dt><dd>'+e(string(item[key])||'—')+'</dd></div>').join('')+'</dl>';
}
export function renderAdminRecord(item,kind,{reviewActions=null}={}){
 const shot=kind==='shots',approved=kind==='approved';
 const id=string(item.id),title=shot?(item.coffee_name||'Shot record'):(item.name||'Unnamed coffee');
 const creator=item.creator_email||'Creator not available';
 const description=shot?'Shot '+string(item.style||'')+' · '+string(item.dose_g)+' g in · '+string(item.yield_g)+' g out · '+string(item.time_s)+' s':
  string(item.roaster||'Roaster not supplied')+' · '+string(item.release_label||'');
 const rev=Number(item.revision);
 const enabled=/^[a-f0-9-]{36}$/i.test(id)&&Number.isSafeInteger(rev)&&rev>=1;
 const type=shot?'shot':approved?'approved':'submission';
 return '<article class="admin-queue-item admin-record">'+
  '<div class="admin-queue-title"><div><h3>'+e(title)+'</h3><p class="helper">'+e(description)+'</p>'+
  '<p class="helper">Added by: <strong>'+e(creator)+'</strong> · '+e(date(item.created_at||item.pulled_at))+'</p>'+
  '</div><span class="admin-state">'+e(shot?'Logged Shot':approved?'Approved Coffee':kind==='conflicts'?'Conflict':'Pending')+'</span></div>'+
  (shot?'<p class="admin-record-note"><b>Notes:</b> '+e(item.notes||'None')+'</p>':(!approved?renderAdminCoffeeFacts(item):''))+
  (item.source_url?'<p class="admin-source">Source: '+e(item.source_url)+'</p>':'')+
  (enabled?'<button type="button" class="ghost compact" data-action="edit-toggle"'+attr('data-id',id)+'>Edit Details</button>':'')+
  (enabled?'<form hidden class="admin-record-editor" data-record-form '+attr('data-id',id)+attr('data-type',type)+
     attr('data-revision',rev)+'><div class="admin-record-grid">'+rowFields(item,shot,approved)+'</div>'+
     (!shot?'<label>Source URL (optional)<input name="source_url" type="url"'+attr('value',item.source_url||'')+'></label>'+
      '<button type="button" class="ghost compact" data-action="extract-coffee-url"'+attr('data-id',id)+'>Autofill Blanks From URL</button>'+
      '<p class="helper">Preview fills only empty inputs; inspect and save changes explicitly. Extraction alone never verifies official evidence.</p>':'')+
     '<label>Reason for correction<input name="reason" required minlength="8" maxlength="1000" placeholder="Explain what needs correction"></label>'+
     '<div class="admin-review-actions"><button type="submit">Save Audited Correction</button><button type="button" class="ghost compact" data-action="edit-toggle"'+attr('data-id',id)+'>Cancel</button></div></form>':'')+
  (typeof reviewActions==='function'?reviewActions(item):'')+
  '</article>';
}
export function renderAdminRecordCollection(kind,page={},{embedded=false,reviewActions=null,expanded=false,openCoffeeGroups=new Set()}={}){
 const title=({pending:'Pending Coffees',conflicts:'Conflicts',approved:'Approved Coffees',shots:'Logged Shots'})[kind]||kind;
 const loaded=Array.isArray(page.items)?page.items:[];
 const offset=Number.isSafeInteger(page.offset)&&page.offset>=0?page.offset:0;
 const total=Number.isSafeInteger(Number(page.total))&&Number(page.total)>=0?Number(page.total):0;
 const error=page.error?'<p class="helper" role="status">'+e(page.error)+'</p>':'';
 const range=loaded.length?'Showing '+String(offset+1)+'–'+String(offset+loaded.length)+' of '+String(total):
  'No records on this page · '+String(total)+' total';
 const pagination=total>loaded.length||offset>0?
  '<div class="admin-pagination"><span class="helper">'+e(range)+'</span>'+
  '<button type="button" class="ghost compact" data-action="record-page" data-kind="'+e(kind)+'" data-offset="'+e(Math.max(0,offset-50))+'" '+(offset===0?'disabled':'')+'>Previous</button>'+
  '<button type="button" class="ghost compact" data-action="record-page" data-kind="'+e(kind)+'" data-offset="'+e(offset+50)+'" '+(offset+loaded.length>=total?'disabled':'')+'>Next</button></div>':'';
 const empty=({pending:'No pending coffee submissions.',conflicts:'No coffee conflicts.'})[kind]||'No records to show.';
 const content=error+(loaded.length?(kind==='shots'?renderAdminShotGroups(loaded,{openCoffeeGroups}):loaded.map(item=>renderAdminRecord(item,kind,{reviewActions})).join('')):
  page.error?'':'<p class="admin-empty helper">'+e(empty)+'</p>')+pagination;
 const description='<p class="helper">All records, page by page · creator and revision shown where available.</p>';
 // Pending and Conflicts already have titled outer sections containing the
 // independent approval actions. Embed their records without another panel.
 if(embedded)return (page.error?'':description)+content;
 return '<section class="admin-panel admin-record-section" '+((kind==='approved'||kind==='shots')?'id="admin-'+e(kind)+'" tabindex="-1"':'')+'>'+
 adminDisclosure(title,kind,total,description+content,{expanded})+'</section>';
}
