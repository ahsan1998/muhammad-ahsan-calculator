/* Renewal Runway — pure calculation functions. Classic script; no import/export. */

// Parse a credit string to integer hundredths. Returns NaN on failure.
function parseCredits(str) {
  if (str === null || str === undefined || String(str).trim() === '') return NaN;
  var s = String(str).trim();
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}

// Count decimal places in a credit string ('' → 0).
function decimalPlaces(str) {
  var s = String(str).trim();
  var dot = s.indexOf('.');
  if (dot === -1) return 0;
  return s.length - dot - 1;
}

// Validate credits-required string. Returns { ok, error }.
function validateRequired(str) {
  if (str === null || str === undefined || String(str).trim() === '') {
    return { ok: false, error: null }; // empty → no error, no result
  }
  var s = String(str).trim();
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) {
    return { ok: false, error: 'Credits required must be a number.' };
  }
  if (decimalPlaces(s) > 2) {
    return { ok: false, error: 'Credits required cannot have more than 2 decimal places.' };
  }
  var units = Math.round(parseFloat(s) * 100);
  if (units <= 0) {
    return { ok: false, error: 'Credits required must be greater than 0.' };
  }
  if (units > 50000) { // > 500
    return { ok: false, error: 'Credits required cannot exceed 500.' };
  }
  return { ok: true, error: null, units: units };
}

// Validate credits-earned string. Returns { ok, error }.
function validateEarned(str) {
  if (str === null || str === undefined || String(str).trim() === '') {
    return { ok: true, error: null, units: 0 }; // empty → treat as 0
  }
  var s = String(str).trim();
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) {
    return { ok: false, error: 'Credits earned must be a number.' };
  }
  if (decimalPlaces(s) > 2) {
    return { ok: false, error: 'Credits earned cannot have more than 2 decimal places.' };
  }
  var units = Math.round(parseFloat(s) * 100);
  if (units < 0) {
    return { ok: false, error: 'Credits earned cannot be negative.' };
  }
  if (units > 100000) { // > 1000
    return { ok: false, error: 'Credits earned cannot exceed 1,000.' };
  }
  return { ok: true, error: null, units: units };
}

// Parse "YYYY-MM-DD" → { y, mo, d } or null. Returns null for impossible dates (e.g. Feb 30).
function parseDate(str) {
  if (!str) return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;
  var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
  // Round-trip check: Date.UTC silently rolls Feb 30 → Mar 2, etc.
  var ts = Date.UTC(y, mo - 1, d);
  var check = new Date(ts);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== mo || check.getUTCDate() !== d) {
    return null;
  }
  return { y: y, mo: mo, d: d };
}

// Days between two date objects (from, to), both inclusive.
// Returns (to - from) + 1 in days.
function calcDaysLeft(fromStr, toStr) {
  var from = parseDate(fromStr);
  var to = parseDate(toStr);
  if (!from || !to) return null;
  var a = Date.UTC(from.y, from.mo - 1, from.d);
  var b = Date.UTC(to.y, to.mo - 1, to.d);
  return Math.round((b - a) / 86400000) + 1;
}

// Weekly pace in hundredths (integer ceiling division).
// remaining and daysLeft are both plain numbers.
function calcPaceUnits(remainingUnits, daysLeft) {
  if (daysLeft <= 0) return null;
  // pace_units = ceil(remainingUnits * 7 / daysLeft)
  var num = remainingUnits * 7;
  return Math.ceil(num / daysLeft);
}

// Format a credit unit count to display string (trailing zeros dropped).
function formatCredits(units) {
  var val = units / 100;
  // show up to 2 decimal places, strip trailing zeros
  var s = val.toFixed(2).replace(/\.?0+$/, '');
  // thousands separator
  var parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// Format a date object to "Dec 31, 2027".
function formatDate(str) {
  var d = parseDate(str);
  if (!d) return '';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.mo - 1] + ' ' + d.d + ', ' + d.y;
}

// Pluralise: singular(1) / plural(≠1).
function plural(n, word) {
  return n === 1 ? '1 ' + word : formatCredits(n * 100) + ' ' + word + 's';
}

// Plain number plural (days, not credits).
function pluralDays(n) {
  return n === 1 ? '1 day' : n + ' days';
}

// Validate the end date string. Returns { ok, error } (empty → ok:false, error:null).
function validateEndDate(str) {
  if (!str || String(str).trim() === '') {
    return { ok: false, error: null };
  }
  var s = String(str).trim();
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    return { ok: false, error: 'Cycle end date is not a valid calendar date.' };
  }
  var y = parseInt(m[1], 10);
  if (y < 2000 || y > 2100) {
    return { ok: false, error: 'Cycle end date must be between 2000 and 2100.' };
  }
  // Round-trip check catches impossible dates like Feb 30
  if (!parseDate(s)) {
    return { ok: false, error: 'Cycle end date is not a valid calendar date.' };
  }
  return { ok: true, error: null };
}

// Validate the calc-from date string. Returns { ok, error }.
function validateFromDate(str) {
  if (!str || String(str).trim() === '') {
    return { ok: false, error: 'Calculate-from date is required.' };
  }
  var d = parseDate(str);
  if (!d) {
    return { ok: false, error: 'Calculate-from date is required.' };
  }
  if (d.y < 2000 || d.y > 2100) {
    return { ok: false, error: 'Calculate-from date must be between 2000 and 2100.' };
  }
  return { ok: true, error: null };
}

/*
  Main calculation. Accepts plain strings as the UI would supply them.
  Returns a result object:
  {
    state: 'empty' | 'error' | 'met' | 'passed' | 'urgency' | 'pace',
    errors: { required: string|null, earned: string|null, endDate: string|null, fromDate: string|null },
    // when state is not 'empty' or 'error':
    pace: number (credits/week, as display number e.g. 3.84),
    remainingCredits: number (display, e.g. 40),
    daysLeft: number,
    isAtRisk: boolean,
    // for 'met':
    earnedDisplay: string,
    requiredDisplay: string,
    extraDisplay: string|null,
    // for 'passed':
    endDateDisplay: string,
    daysAgo: number,
    // for 'urgency':
    remainingDisplay: string,
    // for 'pace':
    paceDisplay: string,
  }
*/
function calculate(requiredStr, earnedStr, endDateStr, fromDateStr) {
  var vReq = validateRequired(requiredStr);
  var vEarn = validateEarned(earnedStr);
  var vEnd = validateEndDate(endDateStr);
  var vFrom = validateFromDate(fromDateStr);

  var errors = {
    required: vReq.error,
    earned: vEarn.error,
    endDate: vEnd.error,
    fromDate: vFrom.error,
  };

  var hasError = errors.required || errors.earned || errors.endDate || errors.fromDate;

  // Not ready to show a result: either an error or a required field is empty
  if (!vReq.ok || !vEnd.ok || !vFrom.ok || !vEarn.ok) {
    if (hasError) {
      return { state: 'error', errors: errors };
    }
    // No errors but missing required info → empty state
    return { state: 'empty', errors: errors };
  }

  var reqUnits = vReq.units;
  var earnUnits = vEarn.units;

  // 1. Requirement met
  if (earnUnits >= reqUnits) {
    var extra = earnUnits - reqUnits;
    return {
      state: 'met',
      errors: errors,
      earnedDisplay: formatCredits(earnUnits),
      requiredDisplay: formatCredits(reqUnits),
      extraDisplay: extra > 0 ? formatCredits(extra) : null,
    };
  }

  var daysLeft = calcDaysLeft(fromDateStr, endDateStr);

  // 2. Deadline passed
  if (daysLeft !== null && daysLeft <= 0) {
    var daysAgo = 1 - daysLeft; // e.g. daysLeft = 0 → 1 day ago, -30 → 31 days ago
    return {
      state: 'passed',
      errors: errors,
      endDateDisplay: formatDate(endDateStr),
      daysAgo: daysAgo,
    };
  }

  var remainingUnits = reqUnits - earnUnits;
  var paceUnits = calcPaceUnits(remainingUnits, daysLeft);
  var pace = paceUnits / 100;
  var isAtRisk = pace > 40;

  // 3. Urgency
  if (daysLeft < 7) {
    return {
      state: 'urgency',
      errors: errors,
      remainingUnits: remainingUnits,
      remainingDisplay: formatCredits(remainingUnits),
      daysLeft: daysLeft,
      pace: pace,
      isAtRisk: isAtRisk,
    };
  }

  // 4. Weekly pace
  return {
    state: 'pace',
    errors: errors,
    paceDisplay: formatCredits(paceUnits),
    remainingDisplay: formatCredits(remainingUnits),
    daysLeft: daysLeft,
    pace: pace,
    isAtRisk: isAtRisk,
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseCredits,
    decimalPlaces,
    validateRequired,
    validateEarned,
    validateEndDate,
    validateFromDate,
    calcDaysLeft,
    calcPaceUnits,
    formatCredits,
    formatDate,
    pluralDays,
    calculate,
  };
}
