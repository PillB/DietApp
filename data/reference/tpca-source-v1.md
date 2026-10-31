# TPCA composition-source manifest (P-Diet, LEDGER-3 status PARTIAL)

Official sources (verified live today via search; LEDGER-1 1c updated to PARTIAL with quoted URLs):
- **Web DB** (searchable per-food values): https://tablasperuanas.ins.gob.pe/lista-alimentos (1125 foods; groups CEREALES Y DERIVADOS, HUEVOS Y DERIVADOS, PESCADOS Y MARISCOS, LEGUMINOSAS, VERDURAS, FRUTAS, CARNES, LECHES, GRASAS/ACEITES, TUBÉRCULOS, BEBIDAS, PRODUCTOS AZUCARADOS, ALIMENTOS INFANTILES, MISCELÁNEOS). Values include ENERC kcal / PROCNT / FAT / CHOCDF / FIBTG / CA / FE / ZN / NA (Sodio) / VITA etc. prepared-meals DB also exists (e.g. 'Pollo al sillao con arroz' per-100 g ENERC kcal 143, protein 11.50 g, fiber 0.40 g, sodium 56 mg).
- **PDF 2023 digital ed.**: https://repositorio.ins.gob.pe/bitstreams/6cc030c5-daf4-4f19-9357-6910343796d9/download (tpca-2025-2.pdf, 5.3 MB), 11va ed. 2023, handle 20.500.14196/1773.
- **Legacy 2009 / 2017 10ª ed. PDFs** also live at INS repo as public official documents.

Quoted sample rows seen in the search result (2023 version):
- A50 'Quinua, afrecho de': ENERC 351 kcal; PROCNT 10.70 g; FAT 4.50 g; CHOCDF 65.90 g; Cenizas 4.80 g; Ca 573 mg; Fe 4.00 mg (note '-1' rows = NS, 'not specified', must stay null in our data).
- 'Pollo, corazón de' F27: ENERC 153 kcal; PROCNT 15.60 g; FAT 9.30 g; NA 0.9 mg (public doc tables).
- Preparation 'Pollo al sillao con arroz' SS233B2023: per-100 g ENERC 143 kcal; PROCNT 11.50 g; FIBTG 0.40 g; NA 56 mg.

## Extraction plan (next rounds)
1. Crawl/list pages (list, 11 pages × 100) and read values for the ~60 canonical ingredients we actually use (matching by Spanish TPCA name via our es-PE dictionary synonyms; NS '-1' rows → null with the data-quality caveat).
2. Record row code + name + version, per-100g and mark the `foodCompositionRef` link on each Ingredient.
3. Then wire nutrition perServing in the recipes through canonical per-portion measure (LEDGER-3 closes with a per-serving test in recipes and in the panel).

Trade-offs stated: NS frictions; cooked-vs-raw basis honesty; brand items in the docx (SKYR, Queso Fresco Light) are LIBRARY-ONLY estimates until the owner provides brand labels (e.g., label-based composition from packaging).
