const {test}=require('node:test');const assert=require('node:assert/strict');
const C=require('../assets/js/nutrition-core.js');
const data=require('../nutrition-reviewed.json');
const by=(id)=>data.curatedRecipes.find(r=>r.id===id);
test('no zero/default private calorie prescription',()=>{
  assert.equal(C.estimateEnergy({age:'',weightKg:'',heightCm:'',physiology:''}).ok,false);
  assert.equal(C.estimateEnergy({age:16,weightKg:70,heightCm:175,physiology:'female'}).ok,false);
  assert.equal(C.estimateEnergy({age:36,weightKg:80,heightCm:170,physiology:'female'}).ok,true);
});
test('Mifflin male and female constants and deficit',()=>{
 const a=C.estimateEnergy({age:30,weightKg:80,heightCm:170,physiology:'male',activity:1.2,deficit:400});
 const b=C.estimateEnergy({age:30,weightKg:80,heightCm:170,physiology:'female',activity:1.2,deficit:400});
 assert.equal(a.rmr,1717.5);assert.equal(b.rmr,1551.5);assert.equal(a.target,a.maintenance-400);
});
test('review flags for dangerously restrictive estimates',()=>{
 const result=C.estimateEnergy({age:70,weightKg:50,heightCm:155,physiology:'female',activity:1.2,deficit:500});
 assert.equal(result.ok,true);assert.equal(result.reviewRequired,true);assert.ok(result.flags[0].includes('review'));
});
test('protein ratio depends on explicit reference weight',()=>{
 assert.deepEqual([C.proteinRange(75).min,C.proteinRange(75).max],[90,120]);
 assert.equal(C.proteinRange(0),null);
});
test('local calendar dates respect month boundaries, including leap years',()=>{
 assert.equal(C.plusDays('2028-02-28',1),'2028-02-29');
 assert.equal(C.plusDays('2028-02-28',2),'2028-03-01');
 assert.equal(C.upcomingMonday(new Date(2026,9,26)),'2026-11-02');
 assert.throws(()=>C.fromIso('2026-02-30'));
});
test('fractional onions add correctly: 0.5 + 2 = 2.5',()=>{
 const schedule=[{date:'2026-11-02',recipeId:'aji-chicken-tacos',portions:4},{date:'2026-11-03',recipeId:'chifa-lomo-quinoa',portions:4}];
 const result=C.aggregate(schedule,data.curatedRecipes,'2026-11-02','2026-11-08');
 const onion=result.items.find(x=>x.id==='onion');assert.equal(onion.quantity,2.5);assert.equal(onion.unit,'each');
});
test('one serving scales 4-serving batch to 1/4 and ignores outside dates',()=>{
 const schedule=[{date:'2026-11-02',recipeId:'nikkei-salmon-bowl',portions:1},{date:'2026-11-12',recipeId:'nikkei-salmon-bowl',portions:4}];
 const a=C.aggregate(schedule,data.curatedRecipes,'2026-11-02','2026-11-08');
 assert.equal(a.items.find(x=>x.id==='salmon').quantity,140);
});
test('weekly repeat preserves 7-day gaps and servings',()=>{
 const x=C.repeatWeekly({date:'2026-11-02',recipeId:'nikkei-salmon-bowl',slot:'Dinner',portions:2},4);
 assert.equal(x.length,4); assert.equal(x[3].date,'2026-11-23');assert.ok(x.every(e=>e.portions===2));
});
test('7 measured recipes have numerically valid ingredient units and nutrition estimates',()=>{
 assert.equal(data.curatedRecipes.length,7); assert.equal(data.legacyRecipeAudits.length,29);
 for(const r of data.curatedRecipes){
  assert.ok(r.servings>=2);
  assert.ok(r.ingredients.length>=7);
  for(const x of r.ingredients){
    assert.ok(x.quantity>0);assert.ok(['g','ml','each'].includes(x.unit));
    assert.ok(data.per100g[x.nutrientKey],`missing reference ${x.nutrientKey}`);
  }
  const n=C.recipeNutrition(r,data.per100g);assert.equal(n.missing.length,0);
  assert.ok(n.perServing.kcal>200&&n.perServing.kcal<1600,`${r.title} calorie estimate plausible`);
  assert.ok(n.perServing.protein>10);
 }
});
