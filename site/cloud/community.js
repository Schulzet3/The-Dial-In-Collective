// Anonymous, admitted-member Community views. Only sanitized backend DTOs
// are rendered. Never display contributor handles, raw notes or workspace IDs.
import {e,button,icon,fmt,styleBadge} from '../lib/ui.js';
const num=value=>Number.isFinite(Number(value))?Number(value):0;

export function communityReviewBanner(reviews=[]){
 const pending=reviews.filter(r=>r?.shot_id);
 if(!pending.length)return '';
 const r=pending[0], name=[r.roaster,r.coffee_name].filter(Boolean).join(' · ');
 return `<section class="community-review-prompt" aria-labelledby="community-review-title">
  <div class="community-review-icon">${icon('shield',20)}</div>
  <div class="community-review-text">
   <p class="eyebrow">Required Measurement Check</p>
   <h3 id="community-review-title">Are these shot measurements correct?</h3>
   <p class="helper">${e(name)} · ${e(r.style)} · ${fmt(r.dose_g)}g → ${fmt(r.yield_g)}g in <strong>${fmt(r.time_s)}s</strong></p>
   <p class="helper">Your Dialed-In shot has unusual measurements. Please confirm they're correct or edit the original shot before continuing. An unconventional extraction can still qualify for Community.</p>
   <div class="community-review-actions">
    ${button('Yes, It’s Correct','community-confirm-outlier',`data-id="${e(r.shot_id)}" data-revision="${e(r.revision)}"`,'primary compact')}
    ${button('Correct Shot','community-correct-outlier',`data-id="${e(r.shot_id)}"`,'ghost compact')}
   </div>
   ${pending.length>1?`<p class="helper">${pending.length-1} other measurement${pending.length===2?'':'s'} awaiting review.</p>`:''}
  </div>
 </section>`;
}

const confidence=(people,shots)=>{
 if(people>=10&&shots>=30)return 'Strong Confidence';
 if(people>=4&&shots>=10)return 'Moderate Confidence';
 return 'Early Data';
};


/** Parent: exact public roaster/name. Child: stable anonymous key derived
 * server-side from the VERIFIED canonical coffee release ID. Never aggregate
 * distinct releases or expose source shots, member identities or raw UUIDs.
 * Old DTOs lack release keys and remain explicitly indeterminate. */
export const communityCoffeeKey=sh=>JSON.stringify([
 String(sh.roaster||''),String(sh.coffee_name||'')
]);
const communityCoffeeLabel=sh=>[sh.roaster,sh.coffee_name].filter(Boolean).join(' · ')||'Verified Coffee';
export const communityReleaseKey=sh=>
 typeof sh.release_key==='string'&&/^[a-f0-9]{64}$/.test(sh.release_key)
  ? sh.release_key : null;
const fact=value=>typeof value==='string'?value.trim():'';
/** Canonical verified facts only. There is no release-date column; an
 * observed_on date is a SHOT date and must never become a release date. */
export function communityReleaseDetails(sh){
 const label=fact(sh.release_label);
 const candidates=[label,fact(sh.release_origin),fact(sh.release_process),
  fact(sh.release_producer),fact(sh.release_variety)];
 const unique=[];
 for(const value of candidates){
  if(value&&!unique.some(existing=>existing.toLowerCase()===value.toLowerCase()))
   unique.push(value);
 }
 return unique.slice(0,4).join(' · ')||'Release details unavailable';
}
/** Keep unknown-identity DTOs distinct from known verified release keys.
 * The legacy RPC cannot prove two observations belong to the same release. */
function releaseGroups(items){
 const releases=new Map();
 for(const entry of items){
  const id=communityReleaseKey(entry.sh);
  const key=id?'known:'+id:'identity-unavailable';
  if(!releases.has(key))releases.set(key,{key,verified:!!id,example:entry.sh,items:[]});
  releases.get(key).items.push(entry);
 }
 return [...releases.values()];
}
function communityReleaseSection(release,ordinal,revision,incomplete){
 const count=release.items.length;
 const label=release.verified?communityReleaseDetails(release.example):'Release identity unavailable';
 const description=`Release ${ordinal+1} · ${label}`;
 return `<section class="community-release" aria-label="${e(description)}">
  <div class="community-release-heading">
   <div class="community-release-caption">
    <span class="community-release-number">Release ${ordinal+1}</span>
    <span class="community-release-facts">${e(label)}</span>
   </div>
   <span class="community-release-count">${count} ${count===1?'shot':'shots'}${incomplete?' loaded':''}</span>
  </div>
  ${release.items.map(entry=>communityShotRow(entry,revision)).join('')}
 </section>`;
}
function communityShotRow({sh,index},revision){
 const ratings=[['Extraction',sh.extraction],['Body',sh.body],['Clarity',sh.clarity],
  ['Sweetness',sh.sweetness],['Dryness',sh.astringency]];
 const shotKey=`community-shot:${revision}:${index}:${communityCoffeeKey(sh)}`;
 return `<details class="shot community-shot" data-retain="${e(shotKey)}">
  <summary class="shot-toggle community-shot-toggle">
   <div class="community-shot-overview">
    <div class="shot-topline">
     <span class="shot-numbers">${fmt(sh.dose_g)}g → ${fmt(sh.yield_g)}g · ${fmt(sh.time_s)}s · 1:${fmt(sh.ratio,2)}</span>
     <span class="shot-date">${e(sh.observed_on||'')}</span>
    </div>
    <div class="shot-meta">${styleBadge(String(sh.style||'Traditional'))}<span class="community-shot-label">Community Shot</span></div>
   </div>${icon('chevron',15)}
  </summary>
  <div class="shot-body community-shot-body">
   <div class="community-rating-grid">
    ${ratings.map(([label,value])=>`<div><strong>${e(value)}</strong><span>${label}</span></div>`).join('')}
   </div>
   <p class="helper">${num(sh.shot_count)} qualifying shots · ${num(sh.contributor_count)} contributors for this exact coffee and style.</p>
   <p class="helper">${e(confidence(num(sh.contributor_count),num(sh.shot_count)))} · Based on sample size, not a guarantee of extraction quality.</p>
  </div>
 </details>`;
}
export function communityPage({shots=[],total=0,loading=false,error='',style='all',coffee='all',revision=0}={}){
 const styles=[...new Set(shots.map(sh=>sh.style).filter(Boolean))].sort();
 const coffeeOptions=new Map(),groups=new Map();
 for(const [index,sh] of shots.entries()){
  const key=communityCoffeeKey(sh);
  if(!coffeeOptions.has(key))coffeeOptions.set(key,{key,label:communityCoffeeLabel(sh)});
  if((style!=='all'&&sh.style!==style)||(coffee!=='all'&&key!==coffee))continue;
  if(!groups.has(key))groups.set(key,{
   key,name:sh.coffee_name||'Verified Coffee',
   roaster:sh.roaster||'Verified Roaster',items:[]
  });
  groups.get(key).items.push({sh,index});
 }
 const coffees=[...coffeeOptions.values()].sort((a,b)=>a.label.localeCompare(b.label));
 const incomplete=shots.length<total;
 return `<section class="community-page" aria-labelledby="community-heading">
  <div class="community-intro">
   <div><p class="eyebrow">The Collective</p><h2 id="community-heading">Community Shots</h2></div>
   ${button(`${icon('arrow',15)} Refresh`,'community-refresh','','ghost compact')}
  </div>
  <p class="helper">Tap a coffee to see its qualifying shots, organized by verified release when needed. Tap a shot to view its ratings and evidence. Only verified Dialed-In observations appear here. No account names, private notes or custom setup details are shared. Qualifying anonymous contributions may persist if personal shot history or the account is deleted. Styles are guidelines, not pass/fail rules.</p>
  ${error?`<p class="preview-note" role="alert">${e(error)}</p>`:''}
  ${shots.length?`<div class="community-filters">
   <label class="field"><span>Style</span><select id="community-style" aria-label="Filter Community shots by style">
    <option value="all">All Styles</option>${styles.map(x=>`<option value="${e(x)}" ${style===x?'selected':''}>${e(x)}</option>`).join('')}
   </select></label>
   <label class="field"><span>Coffee</span><select id="community-coffee" aria-label="Filter Community shots by coffee">
    <option value="all">All Coffees</option>${coffees.map(x=>`<option value="${e(x.key)}" ${coffee===x.key?'selected':''}>${e(x.label)}</option>`).join('')}
   </select></label>
  </div>`:''}
  ${!shots.length&&!loading?`<div class="community-empty">${icon('users',25)}
   <h3>Community data is growing</h3>
   <p class="helper">Verified, Dialed-In shots will appear here once their data passes automatic integrity checks. Your private and Pending coffees stay private.</p>
   ${button('Back To Coffees','home','','primary compact')}
  </div>`:''}
  <div class="community-cards">
   ${[...groups.values()].map(group=>{
    const count=group.items.length;
    const shown=`${count} ${count===1?'shot':'shots'}${incomplete?' loaded':''}`;
    const groupKey=`community-coffee:${revision}:${group.key}`;
    const releases=releaseGroups(group.items);
    const rows=releases.length>1
      ? releases.map((release,i)=>communityReleaseSection(release,i,revision,incomplete)).join('')
      : group.items.map(entry=>communityShotRow(entry,revision)).join('');
    return `<details class="coffee-card community-coffee-card" data-retain="${e(groupKey)}">
     <summary class="coffee-toggle community-coffee-toggle">
      <div class="coffee-title-area">
       <div class="coffee-title">${e(group.name)}<span class="community-coffee-count">${e(shown)}</span></div>
       <div class="coffee-subtitle">${e(group.roaster)}</div>
      </div>${icon('chevron')}
     </summary>
     <div class="coffee-body community-coffee-body">${rows}</div>
    </details>`;
   }).join('')}
  </div>
  ${groups.size===0&&shots.length?'<p class="helper space-top">No loaded shots match these filters. Try All Styles or All Coffees.</p>':''}
  <div class="community-footer"><p class="helper">${loading?'Loading Community shots…':`Showing ${Math.min(shots.length,total)} of ${total} qualifying shots.`}</p>
   ${!loading&&!error&&shots.length<total?button('Load More Shots','community-more','','secondary compact'):''}
  </div>
 </section>`;
}
