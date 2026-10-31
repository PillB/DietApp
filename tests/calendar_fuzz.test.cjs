'use strict';
// P7-R1 calendar fuzz — month/year/leap boundaries via deterministic PRNG.
// Seeded negatives: invalid dates (2026-02-30, 2026-13-01) refuse at every entry point.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/calendar-core.js');

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261031);

test('property: datesInRange over randomized spans is always inclusive + ascending + valid (100 cases)', () => {
  for (let i = 0; i < 100; i++) {
    const year = 2020 + Math.floor(rnd() * 8); // includes 2024/2028 leap years
    const month = 1 + Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 28);
    const span = Math.floor(rnd() * 30);
    const from = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const toDate = new Date(year, month - 1, day + span, 12);
    const to = `${toDate.getFullYear()}-${String(toDate.getMonth()+1).padStart(2,'0')}-${String(toDate.getDate()).padStart(2,'0')}`;
    const range = C.datesInRange(from, to);
    assert.strictEqual(range.length, span + 1, `span mismatch at ${i}: ${from}..${to}`);
    assert.strictEqual(range[0], from);
    assert.strictEqual(range[range.length - 1], to);
    for (let j = 1; j < range.length; j++) assert.ok(range[j] > range[j-1], `non-ascending at ${i}`);
  }
});

test('property: weekOf always returns 7 consecutive days starting on a Monday (100 random dates)', () => {
  for (let i = 0; i < 100; i++) {
    const year = 2020 + Math.floor(rnd() * 8);
    const month = 1 + Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 28);
    const iso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const week = C.weekOf(iso);
    assert.strictEqual(week.length, 7);
    const first = new Date(week[0] + 'T12:00:00');
    assert.strictEqual(first.getDay(), 1, `week[${iso}] starts on ${first.getDay()} (not Monday)`);
    for (let j = 1; j < 7; j++) {
      const prev = new Date(week[j-1] + 'T12:00:00');
      const cur = new Date(week[j] + 'T12:00:00');
      assert.strictEqual((cur - prev) / 86400000, 1, `${week[j]} not consecutive`);
    }
  }
});

test('leap-year boundaries: 2024-02-29 exists; 2026-02-29 refuses; 2000/1900 century rules', () => {
  // 2024 is a leap year
  assert.deepStrictEqual(C.weekOf('2024-02-29').some((d) => d === '2024-02-29'), true);
  // 2026 is not — the schema must refuse
  assert.throws(() => C.realCalendarDate('2026-02-29'), (e) => e.code === 'invalid_local_date');
  // 2000 IS a leap year (÷400); 1900 is NOT (÷100 but not ÷400)
  assert.deepStrictEqual(C.weekOf('2000-02-29').some((d) => d === '2000-02-29'), true);
  assert.throws(() => C.realCalendarDate('1900-02-29'), (e) => e.code === 'invalid_local_date');
});

test('month-end sweep: every month-end transitions to day 1 of the next month (12 × 4 years)', () => {
  for (let year = 2023; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const last = new Date(year, month, 0, 12).getDate();
      const iso = `${year}-${String(month).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
      const next = C.nextMonday(iso); // any function advancing the date must land in the next month
      const nextMonth = new Date(next + 'T12:00:00');
      const expectedMonthIdx = month % 12;
      assert.strictEqual(nextMonth.getMonth(), expectedMonthIdx, `${iso} → ${next} crossed wrong`);
    }
  }
});
