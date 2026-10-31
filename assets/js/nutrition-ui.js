/* Nutrition interface: intentionally self-contained to avoid perturbing legacy SPA. */
(function(){
'use strict';
const $=(id)=>document.getElementById(id);
const core=window.NutritionCore;
const ND=window.GOURMET_NUTRITION_DATA;
const STORAGE='gourmet-nutrition-schedule-v1';
let schedule=[];
let lang=(window.I18N&&window.I18N.getLanguage()||'es-PE').indexOf('es')===0?'es':'en';
const text={
 en:{planning:'Upcoming-week sample schedule',recipe:'Recipe',date:'Date',meal:'Meal',portions:'Individual portions',repeat:'Repeat weekly for 4 weeks',add:'Add to plan',nutrition:'Nutrition, portioning and safe planning',shopping:'Aggregated shopping',empty:'No recipes in the selected period.',removed:'Remove',review:'Evidence & review',warning:'Estimates only — not verified nutritional labels. Original 29 recipes are not nutritionally certified.',
  feature:'Seven measured gourmet variants for a practical starter week. The original 29 recipes remain accessible under Recipes, but their unstructured ingredient text cannot safely produce exact shopping totals.'},
 es:{planning:'Semana próxima: calendario de ejemplo',recipe:'Receta',date:'Fecha',meal:'Comida',portions:'Porciones individuales',repeat:'Repetir semanalmente durante 4 semanas',add:'Añadir al plan',nutrition:'Nutrición, porciones y planificación segura',shopping:'Compras consolidadas',empty:'No hay recetas en el período seleccionado.',removed:'Eliminar',review:'Evidencia y revisión',warning:'Solo estimaciones; no son análisis nutricionales certificados. Las 29 recetas originales no cuentan con certificación nutricional.',
  feature:'Siete variantes gourmet con ingredientes pesados. Las 29 recetas originales siguen disponibles en Recetas, pero sus ingredientes sin estructurar no permiten sumar cantidades exactas de forma segura.'}
};
const tx=(key)=>text[lang]?.[key]||text.en[key]||key;
const fallback=(e)=>e instanceof Error?e.message:String(e);
function fmt(n,unit){return `${Number(n).toLocaleString(lang==='es'?'es-PE':'en-US',{maximumFractionDigits:1})} ${unit==='each'?(lang==='es'?'unid.':'each'):unit}`;}
function getStored(){try{const x=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(x)?x:null;}catch{return null}}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(schedule));}catch{}}
function opts(){return ND.curatedRecipes.map(r=>`<option value="${r.id}">${lang==='es'?r.es:r.title}</option>`).join('')}
const safe=(s)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function init(){
  if(!core||!ND||!$('nutrition-root'))return;
  const start=core.upcomingMonday();$('n-range-start').value=start;$('n-range-end').value=core.plusDays(start,6);$('n-date').value=start;
  schedule=getStored()||ND.curatedRecipes.map((r,i)=>({eventId:`sample-${i}`,date:core.plusDays(start,i),slot:'Dinner',recipeId:r.id,portions:1}));
  $('n-language').value=lang;
  $('n-language').addEventListener('change',e=>{lang=e.target.value;draw();});
  $('n-energy-form').addEventListener('submit',onEnergy);
  $('n-assign-form').addEventListener('submit',onAdd);
  ['n-range-start','n-range-end'].forEach(id=>$(id).addEventListener('change',draw));
  $('n-reset').addEventListener('click',()=>{schedule=[];save();draw();});
  $('n-copy').addEventListener('click',copyList);$('n-print').addEventListener('click',()=>window.print());
  $('n-recipe').addEventListener('change',drawRecipe);
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-n-remove]');if(btn){schedule=schedule.filter(x=>x.eventId!==btn.dataset.nRemove);save();draw();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeRecipe();});
  draw();
}
function onEnergy(e){
 e.preventDefault();const v=(id)=>$(id).value;
 const result=core.estimateEnergy({age:v('n-age'),weightKg:v('n-weight'),heightCm:v('n-height'),physiology:v('n-physiology'),activity:v('n-activity'),deficit:v('n-deficit')});
 const el=$('n-energy-result');if(!result.ok){el.textContent=result.error;return;}
 const prot=core.proteinRange(Number(v('n-reference-weight'))||Number(v('n-weight')));
 el.innerHTML=`<div class="n-metrics"><span><strong>${result.rmr}</strong> ${lang==='es'?'kcal/d RMR':'RMR kcal/d'}</span><span><strong>${result.maintenance}</strong> ${lang==='es'?'kcal/d mantenimiento':'Maintenance kcal/d'}</span><span><strong>${result.target}</strong> ${lang==='es'?'kcal/d objetivo':'Target kcal/d'}</span><span><strong>${prot?prot.min+'–'+prot.max:'—'} g</strong> ${lang==='es'?'proteína/d':'Protein/d'}</span></div><p>${safe(result.flags.join(' '))}</p><p class="n-caution">${safe(lang==='es'?'Indicativo únicamente; usa el NIDDK Body Weight Planner o un nutricionista registrado para metas individualizadas. Evita el embarazo, uso por menores de 18, o dietas supervisadas médicamente en esta calculadora.':'Indicative only; use NIDDK Body Weight Planner or a registered dietitian for individualized goals. Avoid pregnancy, under-18 use, or medically supervised diets in this calculator.')}</p>`;
}
function onAdd(e){e.preventDefault();const id=$('n-recipe').value,date=$('n-date').value,slot=$('n-meal').value,portions=Number($('n-portions').value);
 try{core.fromIso(date);}catch(err){$('n-notice').textContent=fallback(err);return;}
 if(!id||!Number.isFinite(portions)||portions<1||portions>24){$('n-notice').textContent=lang==='es'?'Selecciona una receta y entre 1-24 porciones.':'Select recipe and 1–24 portions.';return;}
 const entry={eventId:`user-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,date,slot,portions,recipeId:id};
 schedule.push(...($('n-repeat').checked?core.repeatWeekly(entry,4):[entry]));save();$('n-notice').textContent=lang==='es'?'Agregado. Cantidades de compras actualizadas.':'Added. Shopping quantities updated.';draw();
}
function draw(){if(!$('n-recipe').value||!ND.curatedRecipes.some(r=>r.id===$('n-recipe').value))$('n-recipe').innerHTML=opts();else {const chosen=$('n-recipe').value;$('n-recipe').innerHTML=opts();$('n-recipe').value=chosen;}
 for(const el of document.querySelectorAll('[data-nt]'))el.textContent=tx(el.dataset.nt);
 const start=$('n-range-start').value,end=$('n-range-end').value;
 let active=[];try{core.fromIso(start);core.fromIso(end);if(start>end)throw Error(lang==='es'?'Selecciona una fecha final posterior al inicio.':'Select an end date after the start.');active=schedule.filter(s=>s.date>=start&&s.date<=end).sort((a,b)=>a.date.localeCompare(b.date));}
 catch(err){$('n-notice').textContent=fallback(err);}
 const byId=Object.fromEntries(ND.curatedRecipes.map(r=>[r.id,r]));
 $('n-schedule-list').innerHTML=active.length?active.map(s=>`<li class="n-event"><span><strong>${safe(s.date)}</strong> · ${safe(s.slot)} · ${safe(lang==='es'?byId[s.recipeId]?.es||'?':byId[s.recipeId]?.title||'?')} · ${s.portions} ${lang==='es'?'porción(es)':'portion(s)'}</span><button class="n-secondary" data-n-remove="${safe(s.eventId)}" aria-label="${lang==='es'?'Eliminar comida programada':'Remove scheduled meal'}">×</button></li>`).join(''):`<p>${tx('empty')}</p>`;
 let report={items:[],warnings:[]};try{report=core.aggregate(schedule,ND.curatedRecipes,start,end);}catch(err){$('n-notice').textContent=fallback(err);}
 const groups={};for(const item of report.items)(groups[item.category]||=[]).push(item);
 $('n-shopping-list').innerHTML=Object.entries(groups).map(([cat,items])=>`<section><h4>${safe(cat)}</h4><ul>${items.map(x=>`<li><label><input type="checkbox" data-n-check><span>${safe(x.label)}</span><strong>${fmt(x.quantity,x.unit)}</strong></label></li>`).join('')}</ul></section>`).join('')||`<p>${tx('empty')}</p>`;
 $('n-coverage').textContent=`${active.length} ${lang==='es'?'comidas planificadas':'meals scheduled'} · ${report.items.length} ${lang==='es'?'ingredientes únicos':'unique ingredients'} · ${lang==='es'?'Solo suma recetas con pesos estructurados':'Only measured recipes are aggregated'}`;
 drawRecipe();drawLegacy();
}
function drawRecipe(){const recipe=ND.curatedRecipes.find(r=>r.id===$('n-recipe').value);if(!recipe)return;
 const n=core.recipeNutrition(recipe,ND.per100g),macro=n.perServing;
 $('n-recipe-preview').innerHTML=`<h4>${safe(lang==='es'?recipe.es:recipe.title)}</h4><p>${safe(recipe.note)}</p><div class="n-metrics"><span><strong>≈${macro.kcal}</strong> kcal / ${lang==='es'?'porción':'serving'}</span><span><strong>≈${macro.protein}</strong> ${lang==='es'?'g proteína':'g protein'}</span><span><strong>≈${macro.fiber}</strong> ${lang==='es'?'g fibra':'g fiber'}</span></div><p class="n-caution">${safe(lang==='es'?'Estimaciones de composición genéricas; incertidumbre alta; las bases sin sal / salsas bajas en sodio aún requieren verificación de etiqueta de sodio. El día completo no se evalúa a menos que todas las comidas estén programadas.':'Generic composition estimates; high uncertainty; unsalted stock / low-sodium sauces still require label sodium checks. Whole day is not assessed unless all meals are scheduled.')}</p><details><summary>${lang==='es'?'Ingredientes y preparación detallada':'Ingredients and cooking steps'}</summary><p>${recipe.servings} ${lang==='es'?'porciones':'servings'} · ${recipe.totalMinutes} min</p><ul>${recipe.ingredients.map(x=>`<li>${safe(x.label)} — ${fmt(x.quantity,x.unit)} ${x.weightBasis!=='raw / uncooked unless noted'?`(${safe(x.weightBasis)})`:''}</li>`).join('')}</ul><ol>${recipe.steps.map(s=>`<li>${safe(s)}</li>`).join('')}</ol><p><em>${safe(recipe.science)}</em></p></details>`;
}
function drawLegacy(){
 const list=ND.legacyRecipeAudits;
 const flags=list.filter(x=>x.issues.some(i=>i.startsWith('Added sugar'))).length;
 $('n-legacy-summary').textContent=`${list.length} existing recipe records: 0 complete nutrient verifications. ${flags} desserts/sweet preparations require especially careful added-sugar calculation. Diet-guideline ingredient revisions are not a nutrient analysis.`;
 $('n-legacy-audit').innerHTML=list.map(r=>`<details><summary>${safe(r.name)} — ${safe(r.servings||'servings unspecified')}</summary><ul>${r.issues.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></details>`).join('');
}
function copyList(){const start=$('n-range-start').value,end=$('n-range-end').value;
 let report;try{report=core.aggregate(schedule,ND.curatedRecipes,start,end);}catch(e){$('n-notice').textContent=fallback(e);return;}
 const result=[`Shopping ${start} — ${end}`, ...report.items.map(x=>`${x.category} | ${x.label} | ${fmt(x.quantity,x.unit)}`)].join('\n');
 if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(result).then(()=>$('n-notice').textContent='Copied shopping list').catch(()=>$('n-notice').textContent='Clipboard unavailable; select and copy manually.');}
 else {const ta=document.createElement('textarea');ta.value=result;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');$('n-notice').textContent='Copied shopping list';}catch{$('n-notice').textContent='Clipboard blocked. Use Print instead.';}ta.remove();}
}
function closeRecipe(){const m=$('n-recipe-dialog');if(m)m.hidden=true;}
document.addEventListener('DOMContentLoaded',init);
})();
