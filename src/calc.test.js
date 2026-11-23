'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  PRESETS,
  calcDaysLeft,
  calcPaceUnits,
  formatCredits,
  formatDate,
  validateRequired,
  validateEarned,
  validateEndDate,
  validateFromDate,
  calculate,
  rankTeam,
} = require('./calc.js');

// ---------------------------------------------------------------------------
// S-1 · Weekly pace (core calculations)
// ---------------------------------------------------------------------------
describe('S-1 · Weekly pace', () => {
  it('AC1: 60 req, 20 earned, 70 days → 4 credits/week, 40 remaining, 70 days left', () => {
    const r = calculate('60', '20', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '4');
    assert.equal(r.remainingDisplay, '40');
    assert.equal(r.daysLeft, 70);
  });

  it('AC2: 60 req, 20 earned, 73 days → 3.84 credits/week, 40 remaining, 73 days left', () => {
    const r = calculate('60', '20', '2027-03-14', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '3.84');
    assert.equal(r.remainingDisplay, '40');
    assert.equal(r.daysLeft, 73);
  });

  it('AC3: 60 req, 59.99 earned, 70 days → 0.01 credits/week, 0.01 remaining, 70 days left', () => {
    const r = calculate('60', '59.99', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '0.01');
    assert.equal(r.remainingDisplay, '0.01');
    assert.equal(r.daysLeft, 70);
  });

  it('AC4: 500 req, 0 earned, 364 days → 9.62 credits/week, 500 remaining, 364 days left', () => {
    const r = calculate('500', '0', '2027-12-30', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '9.62');
    assert.equal(r.remainingDisplay, '500');
    assert.equal(r.daysLeft, 364);
  });

  it('AC5: 500 req, 0 earned, 70 days → at-risk + 50 credits/week, 500 remaining, 70 days left', () => {
    const r = calculate('500', '0', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.isAtRisk, true);
    assert.equal(r.paceDisplay, '50');
    assert.equal(r.remainingDisplay, '500');
    assert.equal(r.daysLeft, 70);
  });

  it('AC6: empty earned treated as 0 → 6 credits/week, 60 remaining, 70 days left', () => {
    const r = calculate('60', '', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '6');
    assert.equal(r.remainingDisplay, '60');
    assert.equal(r.daysLeft, 70);
  });

  it('AC7: live update — earned 20→30 → 3 credits/week, 30 remaining, 70 days left', () => {
    const r = calculate('60', '30', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '3');
    assert.equal(r.remainingDisplay, '30');
    assert.equal(r.daysLeft, 70);
  });

  it('AC8: empty state shown when credits required is empty', () => {
    const r = calculate('', '0', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'empty');
    assert.equal(r.errors.required, null);
  });
});

// ---------------------------------------------------------------------------
// S-2 · Urgency (< 7 days)
// ---------------------------------------------------------------------------
describe('S-2 · Urgency', () => {
  it('AC1: 6 days left, 10 remaining → "You need 10 credits in the next 6 days.", no at-risk', () => {
    const r = calculate('60', '50', '2027-12-31', '2027-12-26');
    assert.equal(r.state, 'urgency');
    assert.equal(r.remainingDisplay, '10');
    assert.equal(r.daysLeft, 6);
    assert.equal(r.isAtRisk, false);
  });

  it('AC2: 2 days left, 10 remaining → "You need 10 credits in the next 2 days.", no at-risk', () => {
    const r = calculate('60', '50', '2027-12-31', '2027-12-30');
    assert.equal(r.state, 'urgency');
    assert.equal(r.remainingDisplay, '10');
    assert.equal(r.daysLeft, 2);
    assert.equal(r.isAtRisk, false);
  });

  it('AC3: 1 day left, 10 remaining → "You need 10 credits today.", at-risk (pace=70)', () => {
    const r = calculate('60', '50', '2027-12-31', '2027-12-31');
    assert.equal(r.state, 'urgency');
    assert.equal(r.remainingDisplay, '10');
    assert.equal(r.daysLeft, 1);
    assert.equal(r.isAtRisk, true);
  });

  it('AC4: exactly 7 days left → weekly pace state, not urgency', () => {
    const r = calculate('60', '50', '2027-12-31', '2027-12-25');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '10');
    assert.equal(r.remainingDisplay, '10');
    assert.equal(r.daysLeft, 7);
  });
});

// ---------------------------------------------------------------------------
// S-3 · Requirement met
// ---------------------------------------------------------------------------
describe('S-3 · Requirement met', () => {
  it('AC1: earned = required → "Requirement met. You have 60 of 60 credits."', () => {
    const r = calculate('60', '60', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'met');
    assert.equal(r.earnedDisplay, '60');
    assert.equal(r.requiredDisplay, '60');
    assert.equal(r.extraDisplay, null);
  });

  it('AC2: earned > required → shows extra credits', () => {
    const r = calculate('60', '65', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'met');
    assert.equal(r.earnedDisplay, '65');
    assert.equal(r.requiredDisplay, '60');
    assert.equal(r.extraDisplay, '5');
  });

  it('AC3: earned = required AND deadline passed → requirement-met, not deadline-passed', () => {
    const r = calculate('60', '60', '2027-12-31', '2028-01-01');
    assert.equal(r.state, 'met');
  });

  it('AC4: earned = 59.99 < 60 → NOT met, shows weekly pace', () => {
    const r = calculate('60', '59.99', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '0.01');
  });
});

// ---------------------------------------------------------------------------
// S-4 · Deadline passed
// ---------------------------------------------------------------------------
describe('S-4 · Deadline passed', () => {
  it('AC1: 1 day past → "Cycle ended on Dec 31, 2027 (1 day ago)."', () => {
    const r = calculate('60', '50', '2027-12-31', '2028-01-01');
    assert.equal(r.state, 'passed');
    assert.equal(r.endDateDisplay, 'Dec 31, 2027');
    assert.equal(r.daysAgo, 1);
  });

  it('AC2: 31 days past → 31 days ago', () => {
    const r = calculate('60', '50', '2027-12-31', '2028-01-31');
    assert.equal(r.state, 'passed');
    assert.equal(r.endDateDisplay, 'Dec 31, 2027');
    assert.equal(r.daysAgo, 31);
  });

  it('AC3: earned = required AND deadline passed → requirement-met wins', () => {
    const r = calculate('60', '60', '2027-12-31', '2028-01-01');
    assert.equal(r.state, 'met');
  });
});

// ---------------------------------------------------------------------------
// S-5 · At-risk warning
// ---------------------------------------------------------------------------
describe('S-5 · At-risk warning', () => {
  it('AC1: pace exactly 40 → NOT at risk', () => {
    const r = calculate('500', '100', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '40');
    assert.equal(r.isAtRisk, false);
  });

  it('AC2: pace 40.1 → at-risk warning appears', () => {
    const r = calculate('500', '99', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '40.1');
    assert.equal(r.remainingDisplay, '401');
    assert.equal(r.daysLeft, 70);
    assert.equal(r.isAtRisk, true);
  });

  it('AC3: urgency + at-risk → warning appears above urgency message', () => {
    const r = calculate('60', '50', '2027-12-31', '2027-12-31');
    assert.equal(r.state, 'urgency');
    assert.equal(r.isAtRisk, true);
  });

  it('AC4: requirement met → no at-risk warning', () => {
    const r = calculate('60', '60', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'met');
    // no isAtRisk property in met state — that's correct
  });

  it('AC5: deadline passed → no at-risk warning', () => {
    const r = calculate('60', '50', '2027-12-31', '2028-01-31');
    assert.equal(r.state, 'passed');
    // no isAtRisk property in passed state — that's correct
  });
});

// ---------------------------------------------------------------------------
// S-6 · Future calculate-from date / leap year
// ---------------------------------------------------------------------------
describe('S-6 · Future calc-from date', () => {
  it('AC1: calc-from Dec 1 2027, end Jan 9 2028 (40 days) → 7 credits/week', () => {
    const r = calculate('60', '20', '2028-01-09', '2027-12-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '7');
    assert.equal(r.remainingDisplay, '40');
    assert.equal(r.daysLeft, 40);
  });

  it('AC2a: calc-from Apr 1 2027, 90 days → 2.8 credits/week', () => {
    const r = calculate('60', '24', '2027-06-29', '2027-04-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '2.8');
    assert.equal(r.remainingDisplay, '36');
    assert.equal(r.daysLeft, 90);
  });

  it('AC2b: calc-from Jan 1 2027, 180 days → 1.4 credits/week (double pace for earlier start)', () => {
    const r = calculate('60', '24', '2027-06-29', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '1.4');
    assert.equal(r.remainingDisplay, '36');
    assert.equal(r.daysLeft, 180);
  });

  it('AC3: calc-from after end → deadline-passed state', () => {
    const r = calculate('60', '50', '2027-12-31', '2028-01-01');
    assert.equal(r.state, 'passed');
  });

  it('AC4a: leap year 2028 — Feb 28 to Mar 1 = 3 days → urgency "3 credits in next 3 days"', () => {
    const r = calculate('60', '57', '2028-03-01', '2028-02-28');
    assert.equal(r.state, 'urgency');
    assert.equal(r.daysLeft, 3);
    assert.equal(r.remainingDisplay, '3');
  });

  it('AC4b: non-leap year 2027 — Feb 28 to Mar 1 = 2 days → urgency "3 credits in next 2 days"', () => {
    const r = calculate('60', '57', '2027-03-01', '2027-02-28');
    assert.equal(r.state, 'urgency');
    assert.equal(r.daysLeft, 2);
    assert.equal(r.remainingDisplay, '3');
  });
});

// ---------------------------------------------------------------------------
// S-7 · Input validation
// ---------------------------------------------------------------------------
describe('S-7 · Input validation', () => {
  it('AC1: credits required = 0 → "Credits required must be greater than 0."', () => {
    const r = calculate('0', '0', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.required, 'Credits required must be greater than 0.');
  });

  it('AC2: credits required = 501 → "Credits required cannot exceed 500."', () => {
    const r = calculate('501', '0', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.required, 'Credits required cannot exceed 500.');
  });

  it('AC3: credits required = "abc" → "Credits required must be a number."', () => {
    const r = calculate('abc', '0', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.required, 'Credits required must be a number.');
  });

  it('AC4: credits required = 60.555 → "Credits required cannot have more than 2 decimal places."', () => {
    const r = calculate('60.555', '0', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.required, 'Credits required cannot have more than 2 decimal places.');
  });

  it('AC5: credits earned = -1 → "Credits earned cannot be negative."', () => {
    const r = calculate('60', '-1', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.earned, 'Credits earned cannot be negative.');
  });

  it('AC6: credits earned = 1001 → "Credits earned cannot exceed 1,000."', () => {
    const r = calculate('60', '1001', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.earned, 'Credits earned cannot exceed 1,000.');
  });

  it('AC7: credits earned = "abc" → "Credits earned must be a number."', () => {
    const r = calculate('60', 'abc', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.earned, 'Credits earned must be a number.');
  });

  it('AC8: credits earned = 60.555 → "Credits earned cannot have more than 2 decimal places."', () => {
    const r = calculate('60', '60.555', '2027-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.earned, 'Credits earned cannot have more than 2 decimal places.');
  });

  it('AC9: end date year = 1999 → "Cycle end date must be between 2000 and 2100."', () => {
    const r = calculate('60', '0', '1999-12-31', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.endDate, 'Cycle end date must be between 2000 and 2100.');
  });

  it('AC10: end date year = 2101 → "Cycle end date must be between 2000 and 2100."', () => {
    const r = calculate('60', '0', '2101-01-01', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.endDate, 'Cycle end date must be between 2000 and 2100.');
  });

  it('AC11: calc-from cleared → "Calculate-from date is required."', () => {
    const r = calculate('60', '0', '2027-12-31', '');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.fromDate, 'Calculate-from date is required.');
  });

  it('AC12: end date empty with valid required + calc-from → no error, no result (empty state)', () => {
    const r = calculate('60', '0', '', '2027-01-01');
    assert.equal(r.state, 'empty');
    assert.equal(r.errors.endDate, null);
  });

  it('AC13: error corrected → result appears (501 → 60, end Mar 11 2027, from Jan 1 2027, earned 20 → "4 credits/week")', () => {
    const r = calculate('60', '20', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.paceDisplay, '4');
  });

  it('AC14: end date cleared → empty state (no error shown for end date)', () => {
    const r = calculate('60', '20', '', '2027-01-01');
    assert.equal(r.state, 'empty');
    assert.equal(r.errors.endDate, null);
  });

  it('AC15: impossible end date Feb 30 → "Cycle end date is not a valid calendar date."', () => {
    const r = calculate('60', '0', '2027-02-30', '2027-01-01');
    assert.equal(r.state, 'error');
    assert.equal(r.errors.endDate, 'Cycle end date is not a valid calendar date.');
  });

  it('AC16: leading decimal ".5" accepted as 0.5 credits earned', () => {
    const r = calculate('60', '.5', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.remainingDisplay, '59.5');
  });

  it('AC17: leading decimal ".5" accepted as 0.5 credits required', () => {
    const r = calculate('.5', '0', '2027-03-11', '2027-01-01');
    assert.equal(r.state, 'pace');
    assert.equal(r.remainingDisplay, '0.5');
  });
});

// ---------------------------------------------------------------------------
// S-8 · Preset selector (pure logic only — no DOM)
// ---------------------------------------------------------------------------
describe('S-8 · Preset values', () => {
  it('AC1: PRESETS map — shrm=60, hrci=60, pmp=60, capm=15', () => {
    assert.equal(PRESETS.shrm, 60);
    assert.equal(PRESETS.hrci, 60);
    assert.equal(PRESETS.pmp,  60);
    assert.equal(PRESETS.capm, 15);
  });

  it('AC2: all keys are present, no extra keys', () => {
    assert.deepEqual(Object.keys(PRESETS).sort(), ['capm', 'hrci', 'pmp', 'shrm']);
  });

  it('AC3+AC4: calculation with preset credit values works (60 → pace, 15 → pace)', () => {
    const r60 = calculate(String(PRESETS.pmp),  '0', '2027-03-11', '2027-01-01');
    assert.equal(r60.state, 'pace');
    const r15 = calculate(String(PRESETS.capm), '0', '2027-03-11', '2027-01-01');
    assert.equal(r15.state, 'pace');
    assert.equal(r15.remainingDisplay, '15');
  });
});

// ---------------------------------------------------------------------------
// S-9 · Reset (pure logic — reset produces default calculate output)
// ---------------------------------------------------------------------------
describe('S-9 · Reset', () => {
  it('AC1: after reset, empty required + empty end date → empty state', () => {
    const r = calculate('', '0', '', '2026-11-23'); // today as default
    assert.equal(r.state, 'empty');
  });

  it('AC2: after reset, errors clear — no errors in empty state', () => {
    const r = calculate('', '0', '', '2026-11-23');
    assert.equal(r.errors.required, null);
    assert.equal(r.errors.endDate, null);
    assert.equal(r.errors.fromDate, null);
  });
});

// ---------------------------------------------------------------------------
// S-10 · Team view — rankTeam()
// ---------------------------------------------------------------------------
// calc-from anchor used throughout
const FROM = '2027-01-01';

// helpers
function badges(rows) { return rows.map(r => r.badge); }
function names(rows)  { return rows.map(r => r.displayName); }

describe('S-10 · rankTeam — five-person ordering', () => {
  const members = [
    { name: 'Alice', required: '60',  earned: '60', endDate: '2027-03-11' }, // Done
    { name: 'Bob',   required: '60',  earned: '10', endDate: '2026-12-20' }, // Lapsed
    { name: 'Carol', required: '60',  earned: '50', endDate: '2027-01-05' }, // Urgent  (5 days, pace 14)
    { name: 'Dave',  required: '60',  earned: '20', endDate: '2027-03-11' }, // On track (70 days, pace 4)
    { name: 'Eve',   required: '500', earned: '0',  endDate: '2027-03-11' }, // At risk  (70 days, pace 50)
  ];
  const ranked = rankTeam(members, FROM);

  it('AC1: order is Lapsed → At risk → Urgent → On track → Done', () => {
    assert.deepEqual(badges(ranked), ['Lapsed', 'At risk', 'Urgent', 'On track', 'Done']);
  });

  it('AC1: names follow rank (Bob Eve Carol Dave Alice)', () => {
    assert.deepEqual(names(ranked), ['Bob', 'Eve', 'Carol', 'Dave', 'Alice']);
  });
});

describe('S-10 · rankTeam — At-risk tie-break (highest pace first)', () => {
  // Frank pace 50 (500÷70×7), Grace pace 43 (430÷70×7 = 43.0)
  const members = [
    { name: 'Grace', required: '430', earned: '0', endDate: '2027-03-11' },
    { name: 'Frank', required: '500', earned: '0', endDate: '2027-03-11' },
  ];
  const ranked = rankTeam(members, FROM);

  it('AC2: Frank (pace 50) before Grace (pace 43)', () => {
    assert.equal(ranked[0].displayName, 'Frank');
    assert.equal(ranked[1].displayName, 'Grace');
  });
});

describe('S-10 · rankTeam — Urgent tie-break (highest pace first)', () => {
  // Jan 1→Jan 5 = 5 days. Hina: 12.5 rem ÷ 5 × 7 = 17.5. Ivan: 5 rem ÷ 5 × 7 = 7.
  const members = [
    { name: 'Ivan', required: '60', earned: '55',   endDate: '2027-01-05' },
    { name: 'Hina', required: '60', earned: '47.5', endDate: '2027-01-05' },
  ];
  const ranked = rankTeam(members, FROM);

  it('AC3: Hina (pace 17.5) before Ivan (pace 7)', () => {
    assert.equal(ranked[0].displayName, 'Hina');
    assert.equal(ranked[1].displayName, 'Ivan');
  });
});

describe('S-10 · rankTeam — On-track tie-break (highest pace first)', () => {
  // Jana: Jan 1→Feb 8 = 39 days, 40 rem → pace 7.18. Karl: 70 days, 12 rem → pace 1.2.
  const members = [
    { name: 'Karl', required: '60', earned: '48', endDate: '2027-03-11' },
    { name: 'Jana', required: '60', earned: '20', endDate: '2027-02-08' },
  ];
  const ranked = rankTeam(members, FROM);

  it('AC4: Jana (pace 7.18) before Karl (pace 1.2)', () => {
    assert.equal(ranked[0].displayName, 'Jana');
    assert.equal(ranked[1].displayName, 'Karl');
  });
});

describe('S-10 · rankTeam — Lapsed tie-break (most days ago first)', () => {
  // Leo end Dec 22 2026: daysLeft = Dec 22 − Jan 1 + 1 = −9 → daysAgo = 10.
  // Mia end Dec 27 2026: daysLeft = −4 → daysAgo = 5.
  const members = [
    { name: 'Mia', required: '60', earned: '10', endDate: '2026-12-27' },
    { name: 'Leo', required: '60', earned: '10', endDate: '2026-12-22' },
  ];
  const ranked = rankTeam(members, FROM);

  it('AC5: Leo (10 days ago) before Mia (5 days ago)', () => {
    assert.equal(ranked[0].displayName, 'Leo');
    assert.equal(ranked[1].displayName, 'Mia');
  });
});

describe('S-10 · rankTeam — Done tie-break (entry order)', () => {
  const members = [
    { name: 'Nora',  required: '60', earned: '60', endDate: '2027-03-11' },
    { name: 'Oscar', required: '60', earned: '60', endDate: '2027-03-11' },
  ];
  const ranked = rankTeam(members, FROM);

  it('AC6: Nora before Oscar (entry order)', () => {
    assert.equal(ranked[0].displayName, 'Nora');
    assert.equal(ranked[1].displayName, 'Oscar');
  });
});

describe('S-10 · rankTeam — Incomplete and Invalid', () => {
  it('AC7: blank row → Incomplete badge, no error', () => {
    const ranked = rankTeam([{ name: '', required: '', earned: '', endDate: '' }], FROM);
    assert.equal(ranked[0].badge, 'Incomplete');
    assert.equal(ranked[0].result.errors.required, null);
  });

  it('AC8: required="abc" → Invalid badge, field error shown', () => {
    const ranked = rankTeam([{ name: '', required: 'abc', earned: '0', endDate: '2027-03-11' }], FROM);
    assert.equal(ranked[0].badge, 'Invalid');
    assert.ok(ranked[0].result.errors.required);
  });

  it('AC9: 3 valid + 1 Invalid + 1 Incomplete → valid first, then Invalid, then Incomplete', () => {
    const members = [
      { name: 'A', required: '',    earned: '',  endDate: ''           }, // Incomplete
      { name: 'B', required: 'abc', earned: '0', endDate: '2027-03-11' }, // Invalid
      { name: 'C', required: '60',  earned: '60',endDate: '2027-03-11' }, // Done
      { name: 'D', required: '60',  earned: '20',endDate: '2027-03-11' }, // On track
      { name: 'E', required: '500', earned: '0', endDate: '2027-03-11' }, // At risk
    ];
    const ranked = rankTeam(members, FROM);
    assert.deepEqual(badges(ranked), ['At risk', 'On track', 'Done', 'Invalid', 'Incomplete']);
  });
});

describe('S-10 · rankTeam — summary counts', () => {
  it('AC10: 5 valid rows — 2 at risk or lapsed out of 5', () => {
    const members = [
      { name: 'Bob',   required: '60',  earned: '10', endDate: '2026-12-20' }, // Lapsed
      { name: 'Eve',   required: '500', earned: '0',  endDate: '2027-03-11' }, // At risk
      { name: 'Carol', required: '60',  earned: '50', endDate: '2027-01-05' }, // Urgent
      { name: 'Dave',  required: '60',  earned: '20', endDate: '2027-03-11' }, // On track
      { name: 'Alice', required: '60',  earned: '60', endDate: '2027-03-11' }, // Done
    ];
    const ranked = rankTeam(members, FROM);
    const valid = ranked.filter(r => r.badge !== 'Incomplete' && r.badge !== 'Invalid');
    const danger = ranked.filter(r => r.badge === 'At risk' || r.badge === 'Lapsed');
    assert.equal(valid.length, 5);
    assert.equal(danger.length, 2);
  });

  it('AC11: all Incomplete → 0 valid rows', () => {
    const ranked = rankTeam([
      { name: '', required: '', earned: '', endDate: '' },
      { name: '', required: '', earned: '', endDate: '' },
    ], FROM);
    const valid = ranked.filter(r => r.badge !== 'Incomplete' && r.badge !== 'Invalid');
    assert.equal(valid.length, 0);
  });

  it('AC12: 2 valid + 2 Incomplete → valid.length = 2', () => {
    const members = [
      { name: 'X', required: '60', earned: '20', endDate: '2027-03-11' },
      { name: 'Y', required: '60', earned: '60', endDate: '2027-03-11' },
      { name: '',  required: '',   earned: '',   endDate: '' },
      { name: '',  required: '',   earned: '',   endDate: '' },
    ];
    const ranked = rankTeam(members, FROM);
    const valid = ranked.filter(r => r.badge !== 'Incomplete' && r.badge !== 'Invalid');
    assert.equal(valid.length, 2);
  });
});

describe('S-10 · rankTeam — empty name uses entry position', () => {
  it('AC13: row at entry index 2 (position 3) with no name → "Person 3"', () => {
    const members = [
      { name: 'Alice', required: '60', earned: '20', endDate: '2027-03-11' },
      { name: 'Bob',   required: '60', earned: '20', endDate: '2027-03-11' },
      { name: '',      required: '60', earned: '20', endDate: '2027-03-11' }, // index 2
    ];
    const ranked = rankTeam(members, FROM);
    const noName = ranked.find(r => r.entryOrder === 2);
    assert.equal(noName.displayName, 'Person 3');
  });
});

// ---------------------------------------------------------------------------
// HTML script-syntax check
// Extracts every <script> block from index.html (excluding src= tags) and
// runs each through new Function() so a JS syntax error fails the suite.
// ---------------------------------------------------------------------------
describe('index.html — script syntax', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const scriptRe = /<script(?:\s[^>]*)?>([^]*?)<\/script>/gi;
  let match;
  let blockIndex = 0;
  while ((match = scriptRe.exec(html)) !== null) {
    const attrs = match[0].slice(0, match[0].indexOf('>'));
    if (attrs.includes('src=')) continue; // external file, skip
    const src = match[1];
    const idx = ++blockIndex;
    it('inline script block ' + idx + ' parses without syntax errors', () => {
      assert.doesNotThrow(() => new Function(src), 'syntax error in block ' + idx);
    });
  }
});
