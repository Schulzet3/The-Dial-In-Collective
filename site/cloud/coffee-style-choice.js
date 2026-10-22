import {STYLES} from '../lib/constants.js';
import {suggestedStyle} from '../lib/engine.js';
// Starting style is not a verified product fact or a Community observation.
export const AVAILABLE_NEW_COFFEE_STYLES=Object.freeze(STYLES.filter(style=>style!=='Custom'));
export function recommendNewCoffeeStyle(roastLevel,preferences=''){
 const s=suggestedStyle({roastLevel:String(roastLevel||'')},preferences);
 return AVAILABLE_NEW_COFFEE_STYLES.includes(s.style)?s:{style:'Traditional',reason:'A balanced starting point; choose any supported style.'};
}
export function refreshNewCoffeeStyle(form,preferences=''){
 const s=recommendNewCoffeeStyle(form?.elements?.roast_level?.value,preferences);
 if(form?.elements?.style&&form?.dataset?.styleChanged!=='yes')form.elements.style.value=s.style;
 const info=form?.querySelector?.('#new-coffee-style-suggestion');
 if(info)info.textContent='Recommended for you: '+s.style+'. '+s.reason;
 return s;
}
