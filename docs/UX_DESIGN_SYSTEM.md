# Art Nouveau × interim solarized design system and localization

## Authenticity and missing skill
The user asked for the *PILLB Solarize* skill, but no such accessible skill definition was present in installed skill catalog, work files or discoverable trustworthy public sources on 2026-10-30. `.opencode/skills/solarize-fallback/SKILL.md` is a clearly labeled **original interim design adapter**, not the official skill and not a substitute for reading one supplied later. If original becomes available through `context/`, use it and audit conformance.

## Art direction
Premium illustrated cook's folio + modern, functional dashboard: sunlight-on-parchment and teal/ink/warm copper, flowing stem/vine border motifs, fine botanical ornaments, restrained iridescent gold accents, typography contrast with decorative display serif only for headings; content/interface in highly readable text. Avoid excessive gradients or visual density. Focus and information clarity outrank ornament.

### Token samples (subject to actual visual contrast testing)
- `--paper: #F6F2E5`, `--surface: #FFFCF3`, `--ink: #223D3A`, `--muted: #5B6C64`, `--teal: #185A56`, `--teal-bright: #3F8276`, `--copper: #B86A43`, `--gold: #9A6C26`, `--border: #CBBF9F`, `--danger: #A12B35`.
- Dark: `--bg: #111E22`, `--surface: #1B2E31`, `--ink: #F4F0E3`, `--muted: #D0C9B2`, `--accent: #DCA875`.
- Radii 12/20/28px, shadows subtle; use CSS mask gradients or SVG linework for ornaments without hiding text.
- Font stack: Georgia/Cormorant if licensed and locally served for display; system sans for UI; CJK/Devanagari/Japanese script-compatible fallbacks. Never ship font license-sensitive binaries absent permission.
- Motion respects `prefers-reduced-motion`, line-height >=1.5, minimum interactive target roughly 44×44 CSS px, effective text contrast at least WCAG AA 4.5:1 normal text.

## Visual layout
Desktop sidebar 248–280px, top context bar and breadcrumb, main content max 1440px; mobile bottom navigation or expandable drawer, no permanent 20% sidebar; recipe cards adaptive grid; meal planner horizontally contained with day/week mode if too narrow. Print hides all nav/ornaments and shows semantic content. Sticky headers/overlays must never cover cook steps. Always reserve safe-area inset and landscape mobile.

## Flavor atlas
A narrative panel with evidence-backed archetypes (savory/umami + creamy/croquant, Peruvian-Nikkei, Italian, Mexican, Chinese/Japanese/Korean, chocolate). Accessible semantic constellation with controlled clusters: ingredient, technique, cuisine, texture, taste. Links show *why* (e.g. repeated artichoke empanada, eggs Benedict, takoyaki). The uncertain heat dimension must be a gradient with confidence, NOT claims that the user loves very hot chili. Provide editable correction and separate observed restaurant orders from grocery stock.

## Bilingual + four strategic languages
- `en` neutral English, `es-PE` professional natural Peruvian Spanish.
- `zh-Hans` simplified Mandarin and `hi` Hindi selected for large language communities.
- `de` German and `ja` Japanese selected for high online-spending markets; validate usage and translation quality with actual target users.
- Translation must cover UI, units, ingredients, allergens, warnings, print shopping export, cook mode, helper, tour, error, labels, alt text and screen reader accessible names. Store product titles stay *unaltered exact es-PE listing title* with translated explanatory field; ingredient names localized, never mistranslate 'aji amarillo', 'huancaína', 'cacio e pepe'.
- Use `Intl.DateTimeFormat` and `Intl.NumberFormat`; separate quantity underlying rational from rendered locale strings. Perform QA on right-to-left? Not in these six locales, but support future expansion.

## Three-part visual QA geometry
For every viewport/locale, collect bounding DOM rectangles `{x,y,width,height,centerX,centerY}` for click targets, text labels, controls, modal, sticky nav and heading. Automated invalid conditions: `right>viewportWidth+1`, clipped text with `scrollWidth>clientWidth+1` (unless intentional truncation with tooltip), targets overlapped by nondecorative surfaces, modal not visible in viewport or focus escapes, no hover/focus contrast. Record screenshots before changes, after fixes and final deployment; inspect at least two independently reviewed rounds.

## First-time help (must be implemented, not just written)
1. Welcome / privacy disclosure + language preference.
2. 15-second flavor map tour 'where insights come from'.
3. Search or filter recipe and show what validation status means.
4. Assign with servings and repeat N weeks.
5. Select upcoming week and see combined shopping with pack rounding and store uncertainty.
6. Open cook mode (mis en place → step → timer → safety check → storage), print/help/keyboard.
Each stage keyboard focus, Skip tour, Back/Next, progress and replay from help. Test e2e across all six languages.
