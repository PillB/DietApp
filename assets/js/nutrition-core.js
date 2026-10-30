/*
 * NutritionCore is a pure, dependency-free calculation module.
 * All calculations are INDICATIVE and user-configured, never diagnoses or claims
 * of nutrient analysis. The curated recipes have weighed inputs; legacy recipe
 * free-text quantities are specifically excluded from automatic aggregation.
 * Browser: window.NutritionCore; Node tests: module.exports.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NutritionCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const round = (v, n = 1) => Number(Number(v).toFixed(n));
  function pad(v) { return String(v).padStart(2, '0'); }
  function iso(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
  function fromIso(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw Error('Date must be YYYY-MM-DD');
    const [y,m,d] = value.split('-').map(Number);
    const date=new Date(y,m-1,d,12,0,0,0);
    if (date.getFullYear()!==y || date.getMonth()!==m-1 || date.getDate()!==d) throw Error('Invalid date');
    return date;
  }
  function plusDays(day,n) { const d=fromIso(day);d.setDate(d.getDate()+n);return iso(d); }
  function upcomingMonday(today = new Date()) {
    const date=new Date(today.getFullYear(),today.getMonth(),today.getDate(),12);
    const diff=(8-date.getDay())%7 || 7;
    date.setDate(date.getDate()+diff);return iso(date);
  }
  /** Calculate Mifflin–St Jeor RMR, activity-adjusted TDEE and illustrative target.
   * Require user-entered data: no profile is assumed. This is NOT NIDDK's
   * dynamic, validated Body Weight Planner; it is a static starting estimate. */
  function estimateEnergy({age,weightKg,heightCm,physiology,activity=1.375,deficit=400}) {
    const a=Number(age),w=Number(weightKg),h=Number(heightCm),pal=Number(activity),cut=Number(deficit);
    if (![a,w,h,pal,cut].every(Number.isFinite) || a<18 || a>100 || w<30 || w>350 || h<120 || h>230 || pal<1.1 || pal>2.1 || cut<0 || cut>750) return {ok:false,error:'Enter valid adult age, current mass, height, activity and deficit; calculator is for adults only.'};
    if (!['female','male'].includes(physiology)) return {ok:false,error:'Choose the physiology constant used by Mifflin–St Jeor, or use an externally established maintenance estimate.'};
    const rmr=10*w+6.25*h-5*a+(physiology==='male'?5:-161);
    const maintenance=rmr*pal;
    const target=maintenance-cut;
    const floor=physiology==='male'?1500:1200;
    const flags=[];
    if (target<floor) flags.push(`Target below the conservative ${floor} kcal/day review threshold; do not use without clinician review.`);
    if (cut/maintenance>.25) flags.push('Deficit exceeds 25% of estimated expenditure; seek individualized review.');
    flags.push('Activity multipliers and prediction equations have considerable individual error; recalibrate from weight trend over several weeks.');
    return {ok:true,rmr:round(rmr),maintenance:round(maintenance),target:round(target),deficit:cut,reviewRequired:target<floor,flags};
  }
  /** Protein range reflects a DISCUSSED population guidance, not a prescription.
   * The reference mass must be chosen explicitly; no automatic obesity adjustment. */
  function proteinRange(referenceKg) {
    const kg=Number(referenceKg);
    if (!Number.isFinite(kg)||kg<30||kg>300) return null;
    return {min:round(kg*1.2,0),max:round(kg*1.6,0),note:'Illustrative 1.2–1.6 g/kg/day range; ask a qualified clinician if kidney disease or special conditions.'};
  }
  /** Approximate macros from generic 100-g composition references.
   * Raw/dry food basis follows the entered record, NOT cooked serving mass. */
  function recipeNutrition(recipe,references) {
    const total={kcal:0,protein:0,carb:0,fat:0,fiber:0};const missing=[];
    for(const item of recipe.ingredients||[]) {
      const row=references[item.nutrientKey];
      if (!row || !Number.isFinite(item.weightG)) { missing.push(item.label);continue; }
      const factor=item.weightG/100;
      ['kcal','protein','carb','fat','fiber'].forEach((field,j)=>total[field]+=row[j]*factor);
    }
    const portion={};
    Object.entries(total).forEach(([k,v])=>portion[k]=round(v/recipe.servings,0));
    return {perServing:portion, missing, reliability:'indicative',source:'illustrative generic food composition; recipe is not analyzed by USDA or laboratory'};
  }
  /** Aggregate all structured ingredient quantities from scheduled recipe occurrences.
   * Serving multipliers allow one, two, or more eaters; same ingredient & unit
   * sum arithmetically across days, e.g. 0.5 + 2 = 2.5 onions. */
  function aggregate(scheduled,recipes,startDate,endDate) {
    fromIso(startDate);fromIso(endDate);
    if(endDate<startDate) throw Error('End date must be after start date');
    const index=new Map(recipes.map(r=>[r.id,r]));const grouped=new Map(),warnings=[];
    for (const event of scheduled||[]) {
      if(event.date<startDate||event.date>endDate) continue;
      const recipe=index.get(event.recipeId);
      if(!recipe){warnings.push(`Unknown recipe: ${event.recipeId}`);continue;}
      const people=Number(event.portions);
      if(!Number.isFinite(people)||people<=0||people>40){warnings.push(`Invalid portions for ${recipe.title}`);continue;}
      const factor=people/recipe.servings;
      for(const item of recipe.ingredients) {
        const key=`${item.id}::${item.unit}`;
        if(!grouped.has(key)) grouped.set(key,{id:item.id,label:item.label,unit:item.unit,category:item.category,quantity:0,recipes:new Set()});
        const row=grouped.get(key);
        row.quantity+=item.quantity*factor;
        row.recipes.add(recipe.title);
      }
    }
    const items=[...grouped.values()].map(v=>({...v,quantity:round(v.quantity,1),recipes:[...v.recipes]}));
    items.sort((a,b)=>a.category.localeCompare(b.category)||a.label.localeCompare(b.label));
    return {items,warnings};
  }
  /** Repeat one meal on the same weekday for N future weeks, without replacing. */
  function repeatWeekly(event,weeks) {
    const count=Math.min(12,Math.max(1,Number(weeks)||1));
    return Array.from({length:count},(_,i)=>({...event,date:plusDays(event.date,i*7),eventId:`${event.eventId||event.recipeId}-${i}`}));
  }
  return {iso,fromIso,plusDays,upcomingMonday,estimateEnergy,proteinRange,recipeNutrition,aggregate,repeatWeekly};
});
