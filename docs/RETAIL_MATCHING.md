# Lima retail matching and shopper's delivery UX

## Core rule
The app must aggregate **ingredient demand first**, then match demand to real currently observed store products and practical purchase quantities. It must never claim that a store has an item in stock if it was not checked against a legitimate store/location-specific listing.

## Sources and store adapters
- Wong: https://www.wong.pe/ — localized search, product page with title/brand, unit, price, delivery; checkout may change stock, substituted products. Wong describes optional delivery and substitutions; distinguish search results from checkout-confirmed availability.
- Plaza Vea: https://www.plazavea.com.pe/ — catalog varies by selected address/store; confirm product listing, brand, units and timestamp.
- Metro: https://www.metro.pe/ — localized catalog and delivery zones; select the actual district. When terms of use prevent automated scraping or CAPTCHA is presented, use manual import or permitted APIs, not evasion.
- Also possible for fresh specialty ingredients: Lima markets/specialist stores, but default ranking is these three per user instruction. No unsupported store claims.

## Standardized result states
`confirmedAtCheckout` (rare and user-interactive), `listedForLocation`, `listedWithoutLocation`, `outOfStockAtTime`, `notChecked`, `unavailable`, `unknown`. A search snippet is `listedWithoutLocation`, never "in stock now". Store price needs currency PEN, exact observation date/time (America/Lima), store branch/delivery context and URL.

## Matching pipeline
1. Parse structured `IngredientUse` into canonical ingredient ID and dimension; `1/2 cebolla + 2 cebollas = 2.5 count`.
2. Resolve synonyms to **matching candidates** with penalized substitutions (e.g. yellow onion is NOT a strict match for red onion; fresh ají is NOT ají paste).
3. Retrieve actual listings with constrained trusted catalog access; preserve exact retail title, image if allowed, pack size, price, source URL and observed timestamp. Avoid indexing or storing a scraped copyrighted catalog wholesale.
4. Rank candidates by exact type, required cut/processing, organic/health restrictions, normalized price per unit, edible fraction, delivery/location evidence, package waste and user preference. Do not infer stock from a catalog card.
5. Compute packages `ceil(requiredNet / packageContent)` for indivisible SKU, with category-specific handling for weighed produce and uncertain yield. Optionally choose combo of packages minimizing waste/cost; allow override and pantry offsets.
6. Render grouped shopping list in **es-PE** for shopper, even when end-user UI is English. Each line: needed | planned purchases | exact listing title | store | source | observation timestamp | fallback. Separate food requirements from purchasable SKUs.
7. When match absent: show canonical ingredient with quantity and a shopper search link, NOT invented brand/presentation.

## Important edge cases
- Count versus mass cannot be auto-converted without real estimated unit weight and variability. Display '3 cebollas (para cubrir 2½)' when sold by piece, not '400g' fabricated.
- `1 cebolla roja` and `1 cebolla china` are distinct. `coriander seed` and fresh cilantro are distinct. `queso fresco`, `mozzarella`, `parmesano` not interchangeable automatically.
- Raw rice dried measure versus cooked serving, bone-in chicken versus edible meat, canned fish drained mass, wet vs dry legumes, pre-cooked artichoke hearts must specify package/drained weights.
- Household shopper may need address/delivery slot for fees; do NOT embed personal address in static website or source code.
- Prices fluctuate, retailer promotions may be linked to loyalty cards; never assert guaranteed total or delivery eligibility without verified checkout.
- Keep commercial data server-side or local/private if licensing/TOS require it. A GitHub Pages-only static app does not have trusted credentials and cannot promise permanent live stock integrations.

## End-user sample (clearly hypothetical, NOT an actual listing)
- **Verduras:** Cebolla roja: se necesitan **2½ unidades**; comprar **3 unidades**, o el peso solicitado al shopper. *Wong/Plaza Vea/Metro: selección de producto pendiente de verificación*.
- **Granos:** Quinua cruda: necesidad total **750 g**; si hubiera un paquete confirmado de 500 g, comprar **2 × 500 g**. *Ejemplo de matemática, no existencia verificada de SKU*.

## Proof-of-research standard
Use links from actual product pages and an auditable date/locale; each matched SKU needs title copied exactly, not generated. A URL to the supermarket homepage does NOT verify specific inventory. If automated access unavailable, ask user to upload current retailer catalog/receipts or facilitate manual shortlist.
