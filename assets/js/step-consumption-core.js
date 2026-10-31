/* Planned ingredient allocation audit; never represents physical cook-through. */
(function(root, factory) {
  const Q = typeof require === 'function' ? require('./quantity.js') : root.Quantity;
  const api = factory(Q);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StepConsumptionCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function(Q) {
  'use strict';
  function key(row) { return [row.ingredientId, row.unit, row.basis].join('|'); }
  function newBalance(ingredient) {
    return { ingredientId: ingredient.ingredientId, unit: ingredient.unit,
      basis: ingredient.basis, declared: Q.parseExact(ingredient.quantity),
      remaining: Q.parseExact(ingredient.quantity) };
  }
  function validateUse(use, balances, errors, stepId) {
    const row = balances.get(key(use));
    if (!row) {
      errors.push({ step: stepId, ingredientId: use.ingredientId, code: 'unknown_or_mismatched_unit_basis' });
      return null;
    }
    let value;
    try { value = Q.parseExact(use.quantity); }
    catch (e) { errors.push({ step: stepId, ingredientId: use.ingredientId, code: 'invalid_quantity' }); return null; }
    if (!Q.gt(value, Q.parseExact('0'))) {
      errors.push({ step: stepId, ingredientId: use.ingredientId, code: 'nonpositive_consumption' });
      return null;
    }
    return { row, value };
  }
  function applyStep(step, balances, errors) {
    const consumed = [];
    if (!Array.isArray(step.ingredientUses)) {
      errors.push({ step: step.id, code: 'missing_quantified_uses' });
      return consumed;
    }
    for (const use of step.ingredientUses) {
      const found = validateUse(use, balances, errors, step.id);
      if (!found) continue;
      const { row, value } = found;
      if (Q.gt(value, row.remaining)) {
        errors.push({ step: step.id, ingredientId: use.ingredientId, code: 'overconsumption' });
        continue;
      }
      row.remaining = Q.sub(row.remaining, value);
      consumed.push({ ingredientId: use.ingredientId, unit: use.unit, basis: use.basis, amount: value });
    }
    return consumed;
  }
  function auditRecipe(recipe) {
    const errors = [], balances = new Map(), trace = [];
    if (!recipe || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.steps)) {
      return { ok: false, errors: [{ code: 'invalid_recipe' }], trace, status: 'unverified' };
    }
    for (const ingredient of recipe.ingredients) {
      try {
        const row = newBalance(ingredient);
        if (!Q.gt(row.declared, Q.parseExact('0')) || balances.has(key(row))) {
          errors.push({ ingredientId: ingredient.ingredientId, code: 'duplicate_or_nonpositive_declaration' });
        } else balances.set(key(row), row);
      } catch (e) { errors.push({ ingredientId: ingredient.ingredientId, code: 'invalid_declaration' }); }
    }
    for (const step of recipe.steps) {
      const consumed = applyStep(step, balances, errors);
      trace.push({ step: step.id, consumed, remaining: [...balances.values()].map(
        row => ({ ingredientId: row.ingredientId, quantity: row.remaining, unit: row.unit, basis: row.basis })
      ) });
    }
    for (const row of balances.values()) {
      if (!Q.eq(row.remaining, Q.parseExact('0'))) {
        errors.push({ ingredientId: row.ingredientId, code: 'unallocated_ingredient' });
      }
    }
    return { ok: errors.length === 0, errors, trace, status: 'planned-allocation-only-not-kitchen-verified' };
  }
  return { auditRecipe };
});
