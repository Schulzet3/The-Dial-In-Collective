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

export function communityPage({shots=[],total=0,loading=false,error='',style='all',coffee='all'}={}){
 const styles=[...new Set(shots.map(sh=>sh.style).filter(Boolean))].sort();
 const coffees=[...new Set(shots.map(sh=>[sh.roaster,sh.coffee_name].filter(Boolean).join(' · ')).filter(Boolean))].sort();
 const filtered=shots.filter(sh=>(style==='all'||sh.style===style)
 &&(coffee==='all'||[sh.roaster,sh.coffee_name].filter(Boolean).join(' · ')===coffee));
 return `<section class="community-page" aria-labelledby="community-heading">
  <div class="community-intro">
   <div><p class="eyebrow">The Collective</p><h2 id="community-heading">Community Shots</h2></div>
   ${button(`${icon('arrow',15)} Refresh`,'community-refresh','','ghost compact')}
  </div>
  <p class="helper">Dialed-In observations from verified coffees. No account names, private notes or custom setup details are shared. Qualifying anonymous contributions may persist if personal shot history or the account is deleted. Styles are guidelines, not pass/fail rules.</p>
  ${error?`<p class="preview-note" role="alert">${e(error)}</p>`:''}
  ${shots.length?`<div class="community-filters">
    <label class="field"><span>Style</span><select id="community-style" aria-label="Filter Community shots by style">
      <option value="all">All Styles</option>${styles.map(x=>`<option value="${e(x)}" ${style===x?'selected':''}>${e(x)}</option>`).join('')}
    </select></label>
    <label class="field"><span>Coffee</span><select id="community-coffee" aria-label="Filter Community shots by coffee">
      <option value="all">All Coffees</option>${coffees.map(x=>`<option value="${e(x)}" ${coffee===x?'selected':''}>${e(x)}</option>`).join('')}
    </select></label>
   </div>`:''}
  ${!shots.length&&!loading?`<div class="community-empty">${icon('users',25)}
   <h3>Community data is growing</h3>
   <p class="helper">Verified, Dialed-In shots will appear here once their data passes automatic integrity checks. Your private and Pending coffees stay private.</p>
   ${button('Back To Coffees','home','','primary compact')}
  </div>`:''}
  <div class="community-cards">
  ${filtered.map((sh,i)=>`<article class="community-card" aria-label="Anonymous Community Shot ${i+1}">
   <div class="community-shot-heading"><div><p class="eyebrow">Community Shot</p>
    <h3>${e(sh.coffee_name||'Verified Coffee')}</h3>
    <p class="helper">${e(sh.roaster||'Verified Roaster')} · ${e(sh.observed_on||'')}</p>
   </div>${styleBadge(String(sh.style||'Traditional'))}</div>
   <div class="community-metrics"><div><strong>${fmt(sh.dose_g)}g</strong><span>Dose</span></div>
    <div><strong>${fmt(sh.yield_g)}g</strong><span>Yield</span></div>
    <div><strong>${fmt(sh.time_s)}s</strong><span>Time</span></div>
    <div><strong>1:${fmt(sh.ratio,2)}</strong><span>Ratio</span></div>
   </div>
   <details class="inline-disclosure"><summary>Ratings & Community Evidence</summary>
    <div class="community-rating-grid">
      ${[['Extraction',sh.extraction],['Body',sh.body],['Clarity',sh.clarity],
        ['Sweetness',sh.sweetness],['Dryness',sh.astringency]].map(([label,v])=>
        `<div><strong>${e(v)}</strong><span>${label}</span></div>`).join('')}
    </div>
    <p class="helper">${num(sh.shot_count)} qualifying shots · ${num(sh.contributor_count)} contributors for this exact coffee and style.</p>
    <p class="helper">${e(confidence(num(sh.contributor_count),num(sh.shot_count)))} · Based on sample size, not a guarantee of extraction quality.</p>
   </details>
  </article>`).join('')}
  </div>
  ${filtered.length===0&&shots.length?'<p class="helper space-top">No loaded shots match these filters. Try All Styles or All Coffees.</p>':''}
  <div class="community-footer"><p class="helper">${loading?'Loading Community shots…':`Showing ${Math.min(shots.length,total)} of ${total} qualifying shots.`}</p>
   ${!loading&&!error&&shots.length<total?button('Load More Shots','community-more','','secondary compact'):''}
  </div>
 </section>`;
}
