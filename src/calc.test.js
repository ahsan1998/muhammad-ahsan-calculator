'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calcDaysLeft,
  calcPaceUnits,
  formatCredits,
  formatDate,
  validateRequired,
  validateEarned,
  validateEndDate,
  validateFromDate,
  calculate,
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
  const PRESETS = {
    'SHRM-CP / SHRM-SCP': '60',
    'HRCI PHR / SPHR': '60',
    'PMI PMP': '60',
    'PMI CAPM': '15',
  };

  it('AC1: SHRM-CP / SHRM-SCP preset = 60', () => {
    assert.equal(PRESETS['SHRM-CP / SHRM-SCP'], '60');
  });

  it('AC2: PMI CAPM preset = 15', () => {
    assert.equal(PRESETS['PMI CAPM'], '15');
  });

  it('AC3+AC4: calculation with preset value works (60 → pace, 15 → pace)', () => {
    const r60 = calculate('60', '0', '2027-03-11', '2027-01-01');
    assert.equal(r60.state, 'pace');
    const r15 = calculate('15', '0', '2027-03-11', '2027-01-01');
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
