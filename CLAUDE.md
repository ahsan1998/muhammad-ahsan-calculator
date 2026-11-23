# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Renewal Runway — a browser-based recertification pace calculator for HR and project-management professionals tracking credits toward credential renewal (SHRM, HRCI, PMI). The product spec lives in `docs/`.

## Tech approach

Plain HTML + CSS + JavaScript, no framework, no build step. The app must open by double-clicking `src/index.html` in a browser — no server, no install. Keep everything in a single HTML file unless a natural split emerges (e.g. a separate `style.css` or `calc.js`). Do not introduce a bundler, package manager, or transpiler without asking first.

**Script style:** `calc.js` must be a classic script (no `import`/`export`) so it loads from `file://` without a server. Export symbols for Node.js tests via a conditional at the bottom of the file:

```js
if (typeof module !== 'undefined') {
  module.exports = { calcDaysLeft, calcPace, /* ... */ };
}
```

## Running and testing

No build step. Open `src/index.html` directly in Chrome, Edge, Firefox, or Safari.

Run the unit tests (Node.js built-in runner, no install required):

```
node --test src/calc.test.js
```

One test per acceptance criterion. Tests import `calc.js` via `require('./calc.js')` and check pure calculation functions — no DOM.

## Calculation rules (critical)

These rules are the source of truth for all arithmetic. They are also in `docs/user-stories.md` under "Calculation Rules".

- **Credit precision:** store credits as integer hundredths (1.5 credits → 150). Do all arithmetic in integers to avoid float errors. Only convert back to display units for output.
- **Credits remaining:** `max(required − earned, 0)`. Never negative.
- **Days left:** `end_date − calculate_from_date + 1` (both dates inclusive). Dec 29 → Dec 31 = 3 days.
- **Weekly pace:** `remaining / days_left × 7`, rounded **up** to 2 decimal places (`Math.ceil(x * 100) / 100`). Rounding up ensures the shown pace always finishes on time.
- **At-risk threshold:** pace **strictly greater than** 40. Exactly 40 is not at-risk.
- **Number display:** trailing zeros dropped (4.00 → "4", 3.90 → "3.9"), thousands separators, singular for exactly 1 ("1 credit", "1 day").
- **Date display:** "Dec 31, 2027" format.

## Results panel — priority order

Check these states in order and show the first that matches:

1. **Requirement met** — earned ≥ required (even if deadline has passed).
2. **Deadline passed** — cycle end date < calculate-from date and requirement not met.
3. **Urgency** — days left < 7 and requirement not met. Show credits needed in days, not weeks. Special-case days left = 1 as "today".
4. **Weekly pace** — all other cases.

At-risk warning appears above state 3 or 4 (never on 1 or 2) when pace > 40.

No result is shown until both credits required and cycle end date contain valid values.

## Inputs and defaults

| Field | Default | Limits |
|---|---|---|
| Preset selector | Custom | SHRM-CP/SCP 60, HRCI PHR/SPHR 60, PMI PMP 60, PMI CAPM 15, Custom |
| Credits required | empty | > 0 and ≤ 500, up to 2 decimal places |
| Credits earned | 0 | ≥ 0 and ≤ 1,000, up to 2 decimal places |
| Cycle end date | empty | valid date, year 2000–2100 |
| Calculate-from date | today | valid date, year 2000–2100 |

Selecting a preset overwrites credits required. Manually editing credits required switches preset to Custom. Reset restores all defaults; calculate-from date goes back to today (re-read at reset time, not page-load time).

Updates are live — there is no calculate button.

## Submission format

The assignment requires this layout:

```
muhammad-ahsan-calculator/
  README.md
  CLAUDE.md
  src/
  docs/
    app-roles.md
    jobs-to-be-done.md
    user-stories.md
  transcripts/
    session-01.md
```
