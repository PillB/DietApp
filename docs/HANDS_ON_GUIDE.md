# HANDS-ON GUIDE — owner procedures (LEDGER-2, brand labels, LEDGER-5, LEDGER-7)

Owner-facing, red-teamed manual. Every step is required, consecutive, and closes with an
evidence file whose location is stated. A machine contract (`tests/hands_on_guide_contract.test.cjs`)
verifies this document keeps covering all four procedures with prerequisites → steps → verification.

Time (Lima): use the America/Lima clock for every timestamp you record.

---

## 1. Kitchen weigh-in (LEDGER-2 → promotes the docx-4 recipes to `weighed-pending-review`)

**Goal:** turn the household-measure estimates (huevo ~55 g, cucharada hojuelas ~8 g…) into real
kitchen masses so the P4.4 nutrition curves can ship.

**What you need**
- A digital kitchen scale with **1 g resolution** (0.1 g is better but not mandatory).
- One recipe's ingredient set laid out (“mise en place”), plus the cook pot.
- This app open at `#cookmode` (Cocinar in the nav), so you can see the per-ingredient list.

**Before you start (pre-checks)**
P1. Select the recipe in Cocinar → check the ingredient list shows ALL non-optional rows
    (e.g., `galletas_avena_diet`: clara_huevo, avena_hojuelas, platano_bizcochito, yogurt_griego_0 —
    canela_polvo is optional and will NOT block).
P2. Have a note surface (phone memo or paper) with one line per ingredient.

**Steps (do them in this order)**
1. **Tare** the scale per container. Weigh the container, note it, then zero (tare) before adding.
2. For each non-optional ingredient: place the amount the recipe says, read the scale to **0.1 g**,
    and note `ingredientId = grams` (e.g., `avena_hojuelas = 30.2`).
3. **Yield**: after cooking the full recipe, weigh the finished mass in the cooking vessel
    (`weight pot` first, then `pot + food`, subtract) — record `yieldG`.
4. Open the app → nav **Hoja de pesa en cocina** (`#weighin`).
5. Select the same recipe; type each ingredient grams into the worksheet; enter `yieldG`.
6. Press **Registrar pesa** (“Record weigh-in”).
7. The status line should read the promotion, or honestly stay `incomplete-weighin`
    (then finish any missing ingredient and repeat steps 5–6).

**Verification (what makes this DONE)**
- `tests/weighin.test.cjs` stays green and the worksheet refuses promotion while anything
    is missing (that refusal IS the safety behavior).
- Once ≥1 recipe promotes, LEDGER-2 flips to DONE (partially) and the per-serving macros
    gain the weighed basis.

**Common mistakes (red-team notes)**
- Weighing DRY vs COOKED weights interchangeably — the worksheet's `basis` is pre-labeled
    (dry/raw); weigh in the state the recipe states (`weightBasisNote`).
- Forgetting the yield step: with all ingredients weighed but no `yieldG` the promotion
    refuses. Weighing the yield is not optional.
- Eyeballing "1 cup" instead of grams defeats the whole exercise.

---

## 2. Brand-label capture (LEDGER-1c/3 → SKYR, queso fresco light, composite fruit)

**Goal:** replace generic per-100 g rows with the actual brand composition for the products
the owner buys.

**What you need**
- The physical product packages (SKYR-style skyr, queso fresco light, the fruit mix actually used).

**Steps**
1. Photograph the **nutrition facts table** of each package (both sides if labels differ).
2. Photograph the **ingredient list** (this is what drives the additive/added-sugar checks).
3. Save the photos in `data/private/brand-labels/` with the purchase date in the filename.
4. Note per package: product name, brand, net weight (g or ml), serving size as printed.
5. Hand the photos over (they stay private); the owner-agent logs the per-100 g numbers into
   `data/reference/food-composition-tpca.v1.json` as `retailerLabel` rows.

**Verification**
- The new rows land in the composition audit (`tests/composition_audit.test.cjs`),
    and the honest-no-label fallbacks (SKYR rows) disappear from the composition report.

**Red-team notes**
- A photo of the nutrition index without the ingredient list is NOT enough — the added-sugar
    and additive checks read the ingredient list.
- Do not transcribe per-serving numbers only; capture per-100 g too (unit conversion must not be
    eyeballed — see D1/D3 math discipline).

---

## 3. Store walk (LEDGER-5 → flips `notChecked` to a claimed state)

**Goal:** replace structure-only rows with real listing facts for the 5 retailers
(Wong, Plaza Vea, Metro, Tottus, Vivanda).

**What you need**
- Phone with camera; this list of the exact fields to capture per product:
  `listingTitle`, `productUrl`, `packageQty`, `packageUnit`, `pricePEN`, `observationTime`
  (America/Lima exact), `locale` (store + district), `availability`.
- The current row list: `data/fixtures/lima-stores-v1.json` (20 structure rows; the walk
  covers at minimum the four foods already listed + the SKYR/Queso categories).

**Steps**
1. **Online pre-verify** (recommended): open each retailer's catalog (Wong `.pe`, Plaza Vea, Metro,
    Tottus, Vivanda — the URLs are recorded in `retailerCatalogReferences` of the fixture) and
    search each ingredient; screenshot the product page (this is legitimate public evidence).
2. **In-store**: confirm the shelf-listed product still exists; photograph shelf tag + product.
3. Record the package as SOLD (`packageQty` + `packageUnit`, e.g., “500 g”), never the serving size.
4. Record the price exactly as printed (S/ with two decimals) — do not round.
5. Record `observationTime` at the moment of sighting; add store + district.
6. Paste per-row values back into `data/fixtures/lima-stores-v1.json` (leave any row that you
    could NOT verify as `notChecked` — never invent).
7. Run `npm test` — `tests/store_matches.test.cjs` asserts every row is STILL schema-valid; rows
    claiming data without provenance fail the schema.

**Verification**
- LEDGER-5 flips to DONE when every row has provenance, not when some are just claiming.

**Red-team notes**
- Online price ≠ shelf price; the guide requires the in-store check before a row flips.
- Discount tags (Cyber WOW etc.) are observations, not the standing price — record the
    standing price; the observation timestamp preserves the context.

---

## 4. Dedup decision (LEDGER-7 → shrink the triple-stored context trees)

**Goal:** decide what to delete from `context/` + `Context information/` safely (they are both
PUBLIC, so this is a pure storage/lay decision, not a privacy one).

**What you need**
- The computed report: `scripts/dedup-report.json` (already produced; regenerate with
  `node scripts/dedup_math.cjs`).

**The decision the math supports**
- 83 files analyzed → 39 SHA-256 classes → **44 files are hash-identical duplicates**
  (every one proved byte-equal to its class representative by `tests/dedup_math.test.cjs`).
- The two exports that differ across roots (the 2026-…-flavor-profile-analysis JSON and its
  artifact-manifest) are NOT duplicates — they are two different exports from different AI
  sessions and must BOTH stay.
- Keeping `context/` as the canonical root and dropping the 44 hash-duplicates from
  `Context information/` is **lossless with respect to hash-equivalence** (idempotent,
  partition-preserving — the Lean-style invariants in tests).

**Steps**
1. Read `scripts/dedup-report.json` (each class lists `representative` [keep] and `duplicates` [candidates to drop]).
2. Confirm the 2 divergent exports are marked `keep-unique` (they are two distinct conversation exports).
3. Approve (or edit) the drop list; approve → run the deletion (a single command once the owner
    approves; the tests then re-partition and confirm idempotence).
4. `npm test` — `tests/dedup_math.test.cjs` re-proves partition + idempotence post-dedup.

**Verification**
- Repo weight drops by roughly the duplicate share (~22 MB sourced to ~11 MB effective); nothing
  public is lost (hash-equivalence, test-proven); LEDGER-7 closes.

**Red-team notes**
- `context/.DS_Store` and machine-generated PNGs hash-identical across roots are the exact
  class of files this dedup removes — nothing user-authored is touched.
- We do NOT touch `data/private/` at all in this procedure.

---

### Cross-cutting red-team summary (the guide's own QA)
- Every procedure above ends in a machine-verified gate (a test), not a promise.
- Every step is required and ordered (no forward references; prereqs listed before actions).
- Nothing here requires network access except the store-walk online pre-verify, which is optional.
- Nothing deletes data except LEDGER-7 items with explicit hash-equivalence proof, and never
  `data/private/`.
