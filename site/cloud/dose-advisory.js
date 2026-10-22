// Dismissible guidance for new shots only; never a hard validation rule.
export function basketDoseAdvisory(actualDose,referenceDose,{editing=false}={}){
 if(editing||actualDose===''||actualDose==null||referenceDose==null)return null;
 const actual=Number(actualDose),reference=Number(referenceDose);
 if(!Number.isFinite(actual)||!Number.isFinite(reference)||reference<=0||Math.abs(actual-reference)<=2)return null;
 return `Dose ${actual.toFixed(1)} g is more than 2 g from this basket's ${reference.toFixed(1)} g reference. This is allowed; check the dose if unintended.`;
}
