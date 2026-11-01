/*
 * W5b PR-1 — step-text adapter (docs/W5B_STEP_TEXT_SCHEMA.md).
 * Single read-path for step text across the three corpora until the full
 * schema migration (PR-3) lands. Zero data moves — the corpus files stay
 * authoritative; this module only normalizes their shapes.
 *
 * Safety invariant (handover §9 + LEDGER-D51): `text.en` is ALWAYS present and
 * remains the authority the safety gates read. `text.esPE` rides along as a
 * display line and carries `esStatus`:
 *   'authored-es' — owner-authored es-PE (docx corpus, no marker needed)
 *   'draft'       — machine-assisted translation, tagged '[es-PE borrador]' on render
 *   'none'        — legacy corpus, no translation exists (caller renders the notice)
 *
 * Browser (window.StepText) + Node (module.exports). CC ≤ 12 per function.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StepText = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function isDocxStep(step) {
    return step && typeof step === 'object' && step.text && typeof step.text === 'object' && typeof step.text.en === 'string';
  }

  /** Family detection:
   *  - rich struct steps → 'docx' when owner-provenance or authored-es present;
   *    imported-curated rich steps → 'curated' keyed by the served id (es present
   *    online, degrades to `none` offline);
   *  - flat-string steps with a served reference → 'curated';
   *  - otherwise legacy prose. */
  function detectFamily(recipe, deps) {
    const steps = recipe.steps || [];
    const isRich = Boolean(steps.length) && isDocxStep(steps[0]);
    const src = recipe.originalSource || recipe.sourceFamily || '';
    if (isRich && (/owner-docx/.test(src) || recipe.sourceFamily === 'owner-docx')) return 'docx';
    if (isRich && steps.some((s) => s.text.esPE)) return 'docx';
    if (isRich) return 'curated';
    const translations = (deps && deps.translations) || {};
    if (steps.length && typeof steps[0] === 'string' && Array.isArray(translations[recipe.id])) return 'curated';
    if (recipe.sourceFamily === 'weighed-curated' || recipe.es) return 'curated';
    if (Array.isArray(recipe.method) || (steps.length && steps.every((s) => typeof s === 'string'))) return 'legacy';
    return 'legacy';
  }

  /** rich steps (docx authored, or imported-curated), es from tx when served. */
  function fromRich(recipe, txList) {
    return (recipe.steps || []).map((s, i) => {
      // authored es-PE lives at s.esPE (docx canon); some variants may nest it in text
      const authoredEs = Boolean(s.esPE || s.text.esPE);
      const esPE = authoredEs ? (s.esPE || s.text.esPE) : ((txList && txList[i]) || '');
      return {
        id: s.id || `s${i + 1}`,
        order: s.order || i + 1,
        station: s.station || '',
        text: { en: s.text.en, esPE, esStatus: authoredEs ? 'authored-es' : (esPE ? 'draft' : 'none') },
        ingredients: s.ingredients || [],
        timeMin: s.timeMin ?? null,
        targetTempC: s.targetTempC ?? null,
        checkpoint: s.checkpoint ?? null,
      };
    });
  }

  /** curated-7: EN flat steps + parallel translations (may be absent at runtime). */
  function fromCurated(recipe, deps) {
    const tx = ((deps && deps.translations) || {})[recipe.id] || [];
    return (recipe.steps || []).map((en, i) => ({
      id: `s${i + 1}`,
      order: i + 1,
      text: {
        en,
        esPE: tx[i] || '',
        esStatus: tx[i] ? 'draft' : 'none',
      },
    }));
  }

  /** docx-4: richest corpus — pass-through into the canonical shape. */
  function fromDocx(recipe) {
    return (recipe.steps || []).map((s, i) => ({
      id: s.id || `s${i + 1}`,
      order: s.order || i + 1,
      station: s.station || '',
      text: {
        en: s.text.en,
        esPE: s.text.esPE || '',
        esStatus: s.text.esPE ? 'authored-es' : 'none',
      },
      ingredients: s.ingredients || [],
      timeMin: s.timeMin ?? null,
      targetTempC: s.targetTempC ?? null,
      checkpoint: s.checkpoint ?? null,
    }));
  }

  /** legacy-29: method[] prose; mise stations stay in prose (caller renders the notice). */
  function fromLegacy(recipe) {
    const method = recipe.method || recipe.steps || [];
    return method.map((en, i) => ({
      id: `s${i + 1}`,
      order: i + 1,
      station: (recipe.miseEnPlace && recipe.miseEnPlace[i] && recipe.miseEnPlace[i].station) || '',
      text: { en, esPE: '', esStatus: 'none' },
    }));
  }

  function stepTextsOf(recipe, deps) {
    const family = detectFamily(recipe, deps);
    const txList = ((deps && deps.translations) || {})[recipe.id] || [];
    if (family === 'docx') return fromRich(recipe, null); // authored es from the struct
    if (family === 'curated') {
      const steps = recipe.steps;
      if (steps.length && isDocxStep(steps[0])) return fromRich(recipe, txList);
      return fromCurated(recipe, { translations: { [recipe.id]: txList } });
    }
    return fromLegacy(recipe);
  }

  return { stepTextsOf, detectFamily };
});
