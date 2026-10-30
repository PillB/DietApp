# Versioned data contract v0.1 — typed domain model before UI

**Use JSON Schema and validation** before hydrating app state. All numeric quantities are finite nonnegative decimals, parsed from exact fractions with rational arithmetic; NEVER parse via `parseFloat('1/2')`. Decimal quantity values in JS can have precision errors; use integer grams/ml/milligrams where practical or decimal/rational library, round only for UI.

## Ingredient
```
{id:'red_onion', name:{'es-PE':'cebolla roja','en':'red onion'},
 family:'allium', dimension:'count', purchaseUnit:'count',
 aliases:['cebolla morada'], foodCompositionRef:null, allergenCodes:[]}
```

## Ingredient use / recipe version
```
{id:'r1', version:2, recipeKind:'meal', validationStatus:'unverified',
 originalSource:'reference', baseServings:4, yieldCookedG:null,
 equipment:['skillet'], times:{activeMin:20,passiveMin:10,pressureMin:null,releaseMin:null},
 ingredients:[
  {ingredientId:'red_onion', quantity:'1/2', unit:'count', basis:'raw', optional:false},
  {ingredientId:'rice_brown', quantity:'300', unit:'g', basis:'dry', optional:false}
 ], steps:[{id:'s1',order:1,text:{en:'...'}, ingredients:['red_onion'], timeMin:5,
  targetTempC:null, checkpoint:'translucent', hazardNotes:[]}],
 nutrition:{perServing:null, sourceIds:[], status:'not-assessed'},
 flavorTags:[{id:'umami',evidenceIds:['order-c32'],confidence:'inferred'}]}
```
`baseServings` denotes yield of the **whole recipe**, not people actually eating. `PlanEntry` specifies scheduled portions.

## Plan entry
```
{id:'p1', localDate:'2026-11-02', slot:'dinner', recipeId:'r1', version:2,
 portions:2, repeatRuleId:null, pantryOverride:null}
```
Store `localDate` string, do NOT generate by `toISOString()` on local midnight.

## Shopping line: derived, never source of truth
```
{ingredientId:'red_onion', unit:'count', needed:'2.5',
 pantry:'0', netRequired:'2.5', purchaseUnits:'3',
 storeMatches:[], sourcePlanEntryIds:['p1','p7'], flags:[]}
```

## Store SKU match
```
{id:'match-1', retailer:'Wong', listingTitle:'[exact source title or unset]',
 productUrl:null, sku:null, packageQty:1, packageUnit:'count',
 pricePEN:null, observationTime:null, locale:'Lima / San Isidro',
 availability:'unverified', matchConfidence:'unverified', notes:[]}
```
If URL, exact title, stock, availability timestamp or price isn't confirmed, **leave null/unverified**. A guessed SKU is worse than a missing one.

## Required transformations
- `0.5 count onion + 2 count onion` → `2.5 count onion` → `ceil(2.5)=3 count` if sold in one-unit increments.
- `500 g + 0.75 kg` → `1250 g`.
- `1/2 recipe of four portions` → `0.5 × each ingredient` (unless ingredient is indivisible, then display kitchen quantities and purchase rounding separately).
- `raw rice + cooked rice` → do not sum unless a source-specific yield/conversion is recorded; recipe dry rice inputs should be used for shopping, not plated cooked weight.
- `one onion + 200g diced onion` → **cannot convert automatically** without mass assumption, show two lines with ambiguous conversion flag or prompt user.
- `chicken stock 500 ml` and `broth vegetable 300 ml` are NOT a duplicate SKU; same family not same item.
- `coriander seed` vs `cilantro leaf` is distinct.
- `aji amarillo fresh` vs `aji amarillo paste` is distinct, even if a possible substitution exists.
- optional ingredient excluded unless chosen; substitutions require recalc; unverified prose ingredients raise a blocker to total shopping precision.

## Migration and traceability
Keep source row ID, original text, parser version, normalization confidence, operator edits, quantity basis and review timestamp. Store original recipe immutable, separately version normalized recipe. Exports JSON and CSV should preserve quantities/units/schemaVersion and unique IDs. Never publish personal order lines without explicit opt-in and sensitive-field audit.
