// Bounded Agtron roast-color interpretation, never a claim of verified
// manufacturer class or a substitute for original roaster measurements.
//
// Manufacturer source: Agtron M-BASIC/II ground-coffee Gourmet / Commercial
// score correlation, named anchor points 95,85,75,65,55,45,35 Gourmet.
// https://www.agtroninc.com/wp-content/uploads/m-basic-operating-system.pdf
// Our seven owner-Locked names use midpoints between these seven anchors.
// Whole-bean readings cannot be mapped using the ground-coffee table.
// Unspecified scale/sample can supply a REVIEWABLE provisional suggestion,
// not a calibrated fact or permission to modify a verified coffee.
export const AGTRON_GOURMET_ANCHORS=Object.freeze([
 Object.freeze({score:95,roast:'Ultra Light'}),
 Object.freeze({score:85,roast:'Very Light'}),
 Object.freeze({score:75,roast:'Light'}),
 Object.freeze({score:65,roast:'Medium-Light'}),
 Object.freeze({score:55,roast:'Medium'}),
 Object.freeze({score:45,roast:'Medium-Dark'}),
 Object.freeze({score:35,roast:'Dark'})
]);
const AGTRON_COMMERCIAL_ANCHORS=Object.freeze([71.7,64.3,56.9,49.4,42.0,34.6,27.1]);
// Matching with explicit roaster-labeled Agtron values only. Do not run on
// arbitrary product prose or pick numbers near an explanatory AGTRON FAQ.
export function interpretAgtron(raw,{scale='',sample=''}={}){
 if((typeof raw!=='string'&&typeof raw!=='number')||String(raw).length>100)return null;
 const str=String(raw).trim();
 const m=str.match(/^(?:Agtron\s*(?:#|score\s*[:#]?|roast\s*color\s*[:#]?)?\s*)?(\d{1,3}(?:\.\d{1,2})?)(?:\s*(?:Agtron|Gourmet|Commercial|Ground|Whole\s*Bean|Beans?|Score|Scale|Color|Roast|[:#()\s-]))*$/i);
 if(!m)return null;
 const score=Number(m[1]);
 if(!Number.isFinite(score)||score<0||score>133)return null;
 const context=(String(scale)+' '+str).toLowerCase();
 const hasGourmet=/\bgourmet\b/.test(context),hasCommercial=/\bcommercial\b/.test(context);
 const resolvedScale=hasGourmet!==hasCommercial?(hasGourmet?'gourmet':'commercial'):'unspecified';
 const material=(String(sample)+' '+str).toLowerCase();
 const isWhole=/\bwhole[\s-]?beans?\b/.test(material),isGround=/\bground\b/.test(material);
 const resolvedSample=isWhole!==isGround?(isWhole?'whole_bean':'ground'):'unspecified';
 const anchorScores=resolvedScale==='commercial'?AGTRON_COMMERCIAL_ANCHORS:AGTRON_GOURMET_ANCHORS.map(x=>x.score);
 let roast='';
 // The chart is for ground coffee; below 25 is outside the seven-tier scale.
 // A Gourmet 100 / Commercial 75.4 reading is already called Under-Developed
 // by Agtron, not Ultra Light. Do not classify values past these anchors.
 if(resolvedSample!=='whole_bean'&&score>=25&&
    score<(resolvedScale==='commercial'?75.4:100)){
  const midpoints=anchorScores.slice(0,-1).map((x,i)=>(x+anchorScores[i+1])/2);
  const index=midpoints.findIndex(midpoint=>score>=midpoint);
  roast=AGTRON_GOURMET_ANCHORS[index<0?6:index].roast;
 }
 return {
  score,display:Number(score.toFixed(2)).toString(),scale:resolvedScale,
  sample:resolvedSample,roast,
  provisional:!!roast&&(resolvedScale==='unspecified'||resolvedSample!=='ground'),
  source:'agtron_manufacturer_ground_coffee_anchor_interpolation'
 };
}
export function agtronExplanation(result,declared=''){
 if(!result)return '';
 const {display,scale,sample,roast,provisional}=result;
 if(!roast)return `Agtron ${display} was preserved as source data, but cannot be safely mapped to a roast level using the manufacturer's ground-coffee table.`;
 const unit=scale==='commercial'?'Commercial':'Gourmet';
 const assumption=scale==='unspecified'?'assuming the Gourmet scale':'using the stated '+unit+' scale';
 const preparation=sample==='unspecified'?'and a ground-coffee reading':sample==='ground'?'on ground coffee':'on whole beans';
 const caveat=provisional?'Provisional, review the roaster scale and sample type.':'Manufacturer anchor interpolation, not a roaster-certified seven-tier label.';
 if(declared&&declared!==roast)
  return `Agtron ${display} suggests ${roast} ${assumption} ${preparation}, but the roaster explicitly labels ${declared}; the explicit label was kept. ${caveat}`;
 return `Agtron ${display} suggests ${roast} ${assumption} ${preparation}. ${caveat}`;
}
