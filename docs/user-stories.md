# Renewal Runway — User Stories

## Calculation Rules

These rules govern every result the app produces. All stories are written against them.

**Credit precision**  
Credits are stored as integer hundredths (1.5 credits = 150 units). All arithmetic uses integers, eliminating floating-point errors.

**Credits remaining**  
`remaining = max(required − earned, 0)`. When earned ≥ required the result is 0 for pace purposes; the panel shows the requirement-met state instead.

**Days left**  
`days_left = end_date − calculate_from_date + 1` (both dates inclusive).  
Example: Dec 29 → Dec 31 = 3 days. This reflects that credits can be earned on the last day of the cycle.

**Weekly pace**  
`pace = remaining ÷ days_left × 7`, rounded **up** to 2 decimal places. Rounding up ensures that sustaining the shown pace always finishes on time.

**Date display**  
Calendar dates only; no time-of-day or time-zone handling. Shown as "Dec 31, 2027".

**Number display**  
Up to 2 decimal places; trailing zeros dropped (4.00 → 4, 3.90 → 3.9); thousands separators applied. Exactly 1 uses the singular form ("1 credit", "1 day"); all other quantities use the plural.

**Live updates**  
Results update as fields change. There is no separate calculate button.

**Panel display**  
In the Urgency and Weekly pace states, the panel shows four items below any at-risk warning: a progress bar labelled "X of Y credits earned", the main result line, then "X credits remaining" (or "1 credit remaining"), then "X days left" (or "1 day left"). The progress bar fill is capped at 100%. These items are not shown in the Requirement met or Deadline passed states.

The results card is colour-coded by severity: blue border for normal weekly pace; amber border and amber main text for urgency (< 7 days, not at risk); red border, red banner, and red main text for at-risk (pace > 40); green for requirement met; grey for deadline passed. Colour is never the only signal — the text and layout communicate each state independently.

**Certification presets**  
Selecting a preset fills credits required. Manually editing credits required switches the selector to Custom.

| Preset | Credits required |
|---|---|
| SHRM-CP / SHRM-SCP | 60 |
| HRCI PHR / SPHR | 60 |
| PMI PMP | 60 |
| PMI CAPM | 15 |
| Custom | (user-entered) |

Presets cover totals only; category or activity-type breakdowns are out of scope.

**Field limits**

| Field | Valid range |
|---|---|
| Credits required | > 0 and ≤ 500, up to 2 decimal places |
| Credits earned | ≥ 0 and ≤ 1,000, up to 2 decimal places |
| Cycle end date | Valid calendar date, year 2000–2100 |
| Calculate-from date | Valid calendar date, year 2000–2100 |

**Default state (on load and after reset)**  
Preset: Custom. Credits required: empty. Credits earned: 0. Cycle end date: empty. Calculate-from date: current date. No result is shown until credits required and cycle end date are both filled with valid values.

**UI text — error messages**

| Condition | Message |
|---|---|
| Credits required empty | (no error; result not shown until a valid value is entered) |
| Credits required = 0 or negative | "Credits required must be greater than 0." |
| Credits required > 500 | "Credits required cannot exceed 500." |
| Credits required non-numeric | "Credits required must be a number." |
| Credits required more than 2 decimal places | "Credits required cannot have more than 2 decimal places." |
| Credits earned negative | "Credits earned cannot be negative." |
| Credits earned > 1,000 | "Credits earned cannot exceed 1,000." |
| Credits earned non-numeric | "Credits earned must be a number." |
| Credits earned more than 2 decimal places | "Credits earned cannot have more than 2 decimal places." |
| Cycle end date empty | (no error; result not shown until a valid value is entered) |
| Cycle end date is a calendar-impossible date (e.g. Feb 30) | "Cycle end date is not a valid calendar date." |
| Cycle end date year < 2000 or > 2100 | "Cycle end date must be between 2000 and 2100." |
| Calculate-from date cleared | "Calculate-from date is required." |

**UI text — result states**

| State | Panel content |
|---|---|
| Empty (credits required or end date not yet filled) | "Enter credits required and your cycle end date to see your pace." |
| Error (one or more fields are invalid) | "Fix the highlighted field to see your pace." |
| Requirement met (earned > required) | "Requirement met. You have {earned} of {required} credits ({extra} extra)." |
| Requirement met (earned = required) | "Requirement met. You have {earned} of {required} credits." |
| Deadline passed | "Cycle ended on {date} ({N} day[s] ago)." |
| Urgency, days > 1 | "You need {remaining} credits in the next {N} days." |
| Urgency, days = 1 | "You need {remaining} credits today." |
| Weekly pace | "{pace} credits per week" |
| At-risk warning (above state 3 or 4) | "At risk: this pace exceeds 40 credits per week." |

---

## Results panel — priority order

When credits required and cycle end date are both valid, the panel shows exactly one of these states, checked in this order:

1. **Requirement met** — earned ≥ required. Shown even if the deadline has passed.
2. **Deadline passed** — cycle end date is before the calculate-from date and requirement not met.
3. **Urgency** — days left < 7 and requirement not met.
4. **Weekly pace** — all other cases.

An at-risk warning appears above the result for states 3 and 4 when the weekly pace exceeds 40. A pace of exactly 40 is not at risk.

---

Each story below names the job it serves. Status reflects what the app does today. Implemented stories are listed first.

---

## S-1 · Enter certification details and see weekly pace
**Role:** Certified Professional | **Job:** J-1 | **Status:** Implemented

As a Certified Professional, I want to enter my total credits required, credits already earned, and certification cycle end date and see the weekly pace I need from today, so that I can plan how many hours of training to schedule each week.

**Acceptance criteria**

- Given calc-from = Jan 1, 2027; end = Mar 11, 2027 (70 days inclusive); required = 60; earned = 20, then the panel shows **"4 credits per week"**, **"40 credits remaining"**, **"70 days left"** (remaining 40 ÷ 70 × 7 = 4.0, trailing zero dropped).
- Given calc-from = Jan 1, 2027; end = Mar 14, 2027 (73 days inclusive); required = 60; earned = 20, then the panel shows **"3.84 credits per week"**, **"40 credits remaining"**, **"73 days left"** (40 ÷ 73 × 7 = 3.836…, rounded up to 3.84).
- Given calc-from = Jan 1, 2027; end = Mar 11, 2027 (70 days); required = 60; earned = 59.99, then the panel shows **"0.01 credits per week"**, **"0.01 credits remaining"**, **"70 days left"** (remaining 0.01 ÷ 70 × 7 = 0.001…, rounded up to 0.01).
- Given calc-from = Jan 1, 2027; end = Dec 30, 2027 (364 days); required = 500; earned = 0, then the panel shows **"9.62 credits per week"**, **"500 credits remaining"**, **"364 days left"** (500 ÷ 364 × 7 = 9.615…, rounded up), confirming the app handles maximum field values without error.
- Given credits required = 500; calc-from = Jan 1, 2027; end = Mar 11, 2027 (70 days); earned = 0, then the at-risk warning appears and the panel shows **"50 credits per week"**, **"500 credits remaining"**, **"70 days left"** (500 ÷ 70 × 7 = 50.0; 50 > 40).
- Given credits earned is left empty; calc-from = Jan 1, 2027; end = Mar 11, 2027; required = 60, then earned is treated as 0 and the panel shows **"6 credits per week"**, **"60 credits remaining"**, **"70 days left"** (60 ÷ 70 × 7 = 6.0).
- Given calc-from = Jan 1, 2027; end = Mar 11, 2027; required = 60; earned = 20 (result showing), when earned changes to 30, then the result updates immediately to **"3 credits per week"**, **"30 credits remaining"**, **"70 days left"** (remaining 30 ÷ 70 × 7 = 3.0).
- Given credits required is empty (and no other errors are present), then the panel shows **"Enter credits required and your cycle end date to see your pace."** — no error, no result.

---

## S-2 · See an urgency message when fewer than 7 days remain
**Role:** Certified Professional | **Job:** J-2 | **Status:** Implemented

As a Certified Professional, I want to see the credits I still need stated in days rather than weeks when my deadline is very close, so that I can judge immediately whether catching up is still feasible.

**Acceptance criteria**

- Given calc-from = Dec 26, 2027; end = Dec 31, 2027 (6 days inclusive); required = 60; earned = 50, then the panel shows **"You need 10 credits in the next 6 days."**, **"10 credits remaining"**, **"6 days left"**, with no at-risk warning (equivalent pace 10 ÷ 6 × 7 = 11.67, which is ≤ 40).
- Given calc-from = Dec 30, 2027; end = Dec 31, 2027 (2 days inclusive); required = 60; earned = 50, then the panel shows **"You need 10 credits in the next 2 days."**, **"10 credits remaining"**, **"2 days left"**, with no at-risk warning (equivalent pace 10 ÷ 2 × 7 = 35, which is ≤ 40).
- Given calc-from = Dec 31, 2027; end = Dec 31, 2027 (1 day inclusive); required = 60; earned = 50, then the at-risk warning appears and the panel shows **"You need 10 credits today."**, **"10 credits remaining"**, **"1 day left"** (equivalent pace 10 ÷ 1 × 7 = 70, which is > 40).
- Given calc-from = Dec 25, 2027; end = Dec 31, 2027 (7 days inclusive); required = 60; earned = 50, then the panel shows the weekly pace **"10 credits per week"**, **"10 credits remaining"**, **"7 days left"** (10 ÷ 7 × 7 = 10.0) — urgency is not triggered at exactly 7 days.

---

## S-3 · Confirm that the credit requirement is met
**Role:** Certified Professional | **Job:** J-3 | **Status:** Implemented

As a Certified Professional, I want to see a clear confirmation when my earned credits meet or exceed the total required, so that I can submit my renewal without second-guessing the numbers.

**Acceptance criteria**

- Given calc-from = Jan 1, 2027; end = Dec 31, 2027; required = 60; earned = 60, then the panel shows **"Requirement met. You have 60 of 60 credits."**
- Given calc-from = Jan 1, 2027; end = Dec 31, 2027; required = 60; earned = 65, then the panel shows **"Requirement met. You have 65 of 60 credits (5 extra)."**
- Given calc-from = Jan 1, 2028; end = Dec 31, 2027; required = 60; earned = 60 (deadline already passed), then the panel shows the requirement-met message — not the deadline-passed message.
- Given calc-from = Jan 1, 2027; end = Mar 11, 2027 (70 days); required = 60; earned = 59.99, then the requirement-met message is **not** shown and the panel shows **"0.01 credits per week"** instead (59.99 < 60).

---

## S-4 · Know when the cycle has ended without the requirement being met
**Role:** Certified Professional | **Job:** J-2 | **Status:** Implemented

As a Certified Professional, I want to know clearly when my certification cycle has ended without my having met the credit requirement, so that I understand my situation and can decide what to do next.

**Acceptance criteria**

- Given calc-from = Jan 1, 2028; end = Dec 31, 2027; required = 60; earned = 50, then the panel shows **"Cycle ended on Dec 31, 2027 (1 day ago)."** with no pace shown (Jan 1, 2028 − Dec 31, 2027 = 1 day).
- Given calc-from = Jan 31, 2028; end = Dec 31, 2027; required = 60; earned = 50, then the panel shows **"Cycle ended on Dec 31, 2027 (31 days ago)."**
- Given calc-from = Jan 1, 2028; end = Dec 31, 2027; required = 60; earned = 60, then the requirement-met message is shown — not the deadline-passed message.

---

## S-5 · See an at-risk warning when the required pace is unsustainable
**Role:** L&D Manager | **Job:** J-4 | **Status:** Implemented

As an L&D Manager, I want to see a prominent at-risk warning when the credits-per-week pace exceeds 40, so that I can immediately identify a team member who needs intervention before it is too late.

**Acceptance criteria**

- Given calc-from = Jan 1, 2027; end = Mar 11, 2027 (70 days); required = 500; earned = 100, then the panel shows **"40 credits per week"**, **"400 credits remaining"**, **"70 days left"** with **no at-risk warning** (remaining 400 ÷ 70 × 7 = 40.0; exactly 40 is not at risk).
- Given calc-from = Jan 1, 2027; end = Mar 11, 2027 (70 days); required = 500; earned = 99, then the **at-risk warning "At risk: this pace exceeds 40 credits per week."** appears above **"40.1 credits per week"**, **"401 credits remaining"**, **"70 days left"** (remaining 401 ÷ 70 × 7 = 40.1).
- Given calc-from = Dec 31, 2027; end = Dec 31, 2027 (1 day); required = 60; earned = 50, then the **at-risk warning** appears above **"You need 10 credits today."**, **"10 credits remaining"**, **"1 day left"** (equivalent pace 10 ÷ 1 × 7 = 70).
- Given calc-from = Jan 1, 2027; end = Dec 31, 2027; required = 60; earned = 60, then no at-risk warning appears (requirement already met).
- Given calc-from = Jan 31, 2028; end = Dec 31, 2027; required = 60; earned = 50, then no at-risk warning appears (deadline-passed state).

---

## S-6 · Set a future calculate-from date to model a later start
**Role:** L&D Manager | **Job:** J-5 | **Status:** Implemented

As an L&D Manager, I want to set the calculate-from date to a future date, so that I can model the pace a team member would need if their dedicated training time started next quarter and decide where to commit budget before the quarter begins.

**Acceptance criteria**

- Given calc-from = Dec 1, 2027; end = Jan 9, 2028 (40 days inclusive); required = 60; earned = 20, then the panel shows **"7 credits per week"**, **"40 credits remaining"**, **"40 days left"** (40 ÷ 40 × 7 = 7.0) — this is the reference result showing calculate-from affects days_left.
- Given calc-from = Apr 1, 2027; end = Jun 29, 2027 (90 days inclusive); required = 60; earned = 24, then the panel shows **"2.8 credits per week"**, **"36 credits remaining"**, **"90 days left"** (remaining 36 ÷ 90 × 7 = 2.8). With calc-from = Jan 1, 2027 instead (180 days inclusive), the same end date and credits yield **"1.4 credits per week"**, **"36 credits remaining"**, **"180 days left"** (36 ÷ 180 × 7 = 1.4), showing how a later start doubles the required pace.
- Given calc-from = Jan 1, 2028; end = Dec 31, 2027; required = 60; earned = 50, then the deadline-passed state is shown — a calculate-from date after the cycle end is valid input, not an error.
- Given calc-from = Feb 28, 2028; end = Mar 1, 2028; required = 60; earned = 57, then the panel shows **"You need 3 credits in the next 3 days."**, **"3 credits remaining"**, **"3 days left"** (Feb 28, Feb 29, Mar 1 = 3 days inclusive — 2028 is a leap year). With calc-from = Feb 28, 2027 and end = Mar 1, 2027 instead, the panel shows **"You need 3 credits in the next 2 days."**, **"3 credits remaining"**, **"2 days left"** (Feb 28, Mar 1 = 2 days — 2027 has no Feb 29), confirming that Feb 29 is counted when it exists.

---

## S-7 · Input validation
**Role:** Certified Professional | **Job:** J-1 | **Status:** Implemented

As a Certified Professional, I want the app to flag invalid entries immediately with a clear message, so that I am never shown a result based on nonsense inputs and I know exactly what to fix.

**Acceptance criteria**

- Given credits required = 0, then the error **"Credits required must be greater than 0."** appears and no result is shown.
- Given credits required = 501, then the error **"Credits required cannot exceed 500."** appears and no result is shown.
- Given credits required = "abc" (non-numeric), then the error **"Credits required must be a number."** appears and no result is shown.
- Given credits required = 60.555, then the error **"Credits required cannot have more than 2 decimal places."** appears and no result is shown.
- Given credits earned = −1, then the error **"Credits earned cannot be negative."** appears and no result is shown.
- Given credits earned = 1,001, then the error **"Credits earned cannot exceed 1,000."** appears and no result is shown.
- Given credits earned = "abc" (non-numeric), then the error **"Credits earned must be a number."** appears and no result is shown.
- Given credits earned = 60.555, then the error **"Credits earned cannot have more than 2 decimal places."** appears and no result is shown.
- Given cycle end date year = 1999, then the error **"Cycle end date must be between 2000 and 2100."** appears and no result is shown.
- Given cycle end date year = 2101, then the error **"Cycle end date must be between 2000 and 2100."** appears and no result is shown.
- Given the calculate-from date is cleared, then the error **"Calculate-from date is required."** appears and no result is shown.
- Given cycle end date is empty and credits required = 60 and calc-from = Jan 1, 2027, then no error appears for the end date field and no result is shown.
- Given credits required = 501 (error showing), when credits required is corrected to 60 and end = Mar 11, 2027 and calc-from = Jan 1, 2027 and earned = 20, then the error clears and **"4 credits per week"** appears.
- Given calc-from = Jan 1, 2027; end = Mar 11, 2027; required = 60; earned = 20 (result "4 credits per week" is showing), when cycle end date is cleared, then the result disappears immediately and no error is shown for the end date field.

---

## S-8 · Select a certification preset to fill credits required
**Role:** Certified Professional | **Job:** J-1 | **Status:** Implemented

As a Certified Professional, I want to pick my credential from a list and have the total credits required filled in automatically, so that I do not have to look up the number for my specific certification.

**Acceptance criteria**

- Given I select SHRM-CP / SHRM-SCP, then credits required is set to 60.
- Given I select PMI CAPM, then credits required is set to 15.
- Given I select a preset and then manually edit credits required, then the selector switches to Custom.
- Given I select a preset, manually edit credits required, and then select the same preset again, then credits required returns to the preset value.

---

## S-9 · Reset all fields to the default state
**Role:** Certified Professional | **Job:** J-1 | **Status:** Implemented

As a Certified Professional, I want to clear all inputs and return to the starting state, so that I can run a fresh calculation without reloading the page.

**Acceptance criteria**

- Given any fields have been changed, when I activate reset, then credits required is cleared, credits earned returns to 0, cycle end date is cleared, calculate-from date returns to the current date (read at reset time, not page-load time), and the preset selector returns to Custom.
- Given a result or error is currently shown, when I activate reset, then it is cleared immediately and no result is shown.

---

## S-10 · Compare renewal status across multiple team members
**Role:** L&D Manager | **Job:** J-4 | **Status:** Implemented

As an L&D Manager, I want to enter details for several team members in one view and see them ranked by risk, so that I can prioritise training budget across the team without running separate calculations.

**Acceptance criteria**

**Ranking order**
- Given calc-from = Jan 1, 2027 and five members — Alice (req 60, earned 60, end Mar 11 2027), Bob (req 60, earned 10, end Dec 20 2026), Carol (req 60, earned 50, end Jan 5 2027), Dave (req 60, earned 20, end Mar 11 2027), Eve (req 500, earned 0, end Mar 11 2027) — when the team list is shown, then the rank order is **Bob → Eve → Carol → Dave → Alice** with badges **Lapsed → At risk → Urgent → On track → Done**.

**Badge definitions**

| `calculate()` result | Badge |
|---|---|
| `state === 'met'` | Done |
| `state === 'passed'` | Lapsed |
| (`state === 'urgency'` or `state === 'pace'`) and `isAtRisk` | At risk |
| `state === 'urgency'` and not `isAtRisk` | Urgent |
| `state === 'pace'` and not `isAtRisk` | On track |
| `state === 'error'` | Invalid |
| `state === 'empty'` | Incomplete |

**Tie-breaks**
- Given calc-from = Jan 1, 2027 and two At-risk members — Frank (req 500, earned 0, end Mar 11 2027, pace 50/week) and Grace (req 430, earned 0, end Mar 11 2027, pace 43/week) — then **Frank appears before Grace** (highest pace first).
- Given calc-from = Jan 1, 2027 and two Urgent members — Hina (req 60, earned 47.5, end Jan 5 2027, pace 17.5/week) and Ivan (req 60, earned 55, end Jan 5 2027, pace 7/week) — then **Hina appears before Ivan** (highest pace first).
- Given calc-from = Jan 1, 2027 and two On-track members — Jana (req 60, earned 20, end Feb 8 2027, pace 7.18/week) and Karl (req 60, earned 48, end Mar 11 2027, pace 1.2/week) — then **Jana appears before Karl** (highest pace first).
- Given calc-from = Jan 1, 2027 and two Lapsed members — Leo (req 60, earned 10, end Dec 22 2026, 10 days ago) and Mia (req 60, earned 10, end Dec 27 2026, 5 days ago) — then **Leo appears before Mia** (most days ago first).
- Given two Done members entered in order Nora then Oscar with identical credits and dates, then **Nora appears before Oscar** (entry order preserved for exact ties across all badge groups).

**Incomplete and Invalid rows**
- Given a row with no required credits or end date entered (fields blank), then its badge is **Incomplete**, it appears at the bottom of the list, and no error message is shown for that row.
- Given a row with credits required = "abc", then its badge is **Invalid**, the first field error is shown, and it appears above Incomplete rows but below all result rows.
- Given three valid rows plus one Invalid row and one Incomplete row, then the order is: three result rows (ranked by status) → Invalid → Incomplete.

**Summary line**
- Given five valid members — Bob (Lapsed), Eve (At risk), Carol (Urgent), Dave (On track), Alice (Done) — then the summary reads **"2 of 5 at risk or lapsed"** (Urgent is not counted).
- Given no rows have results yet (all Incomplete or Invalid), then the summary reads **"Add team members to see who's at risk."**
- Given two valid members plus two Incomplete rows, then the summary counts only the two valid members.

**Empty name**
- Given a member row with no name entered and that row is at entry position 3, then its display name is **"Person 3"** regardless of its rank position.

**Live updates and limits**
- Given a team member's data changes, then their position in the ranked list updates immediately.
- Given 20 members are already entered, then the Add member button is disabled.
- Team data is not saved between page loads; the view displays a note to that effect.

---

## S-11 · Track credits by required category
**Role:** Certified Professional | **Job:** J-3 | **Status:** Not implemented

As a Certified Professional, I want to enter my credits broken down by required category so that I can confirm I have met each category minimum, not just the overall total.

**Acceptance criteria**

- Given a PMP credential with Ways of Working, Power Skills, and Business Acumen minimums, when I enter credits by category, then I see whether each minimum is satisfied alongside the overall total.
- Given an HRCI credential with an ethics credit requirement, when I enter my credits, then the ethics component is verified separately from the total.

---

## S-12 · Save inputs between visits
**Role:** Certified Professional | **Job:** J-1 | **Status:** Not implemented

As a Certified Professional, I want my certification details to be remembered when I return to the app, so that I do not have to re-enter them every time I check my pace.

**Acceptance criteria**

- Given I have entered credits required, credits earned, and a cycle end date, when I close and reopen the app, then those values are restored and the result is shown immediately.
- Given I activate reset, when I close and reopen the app, then no saved values are restored and the app shows the default state.

---

## S-13 · See how many courses to complete each week
**Role:** Certified Professional | **Job:** J-1 | **Status:** Not implemented

As a Certified Professional, I want to see my weekly pace expressed as a number of courses, not just credits, so that I can turn the target into a concrete item on my calendar.

**Acceptance criteria**

- Given a weekly pace of 2 credits and a typical course length of 1 credit, then the result shows "2 courses per week" alongside the credit pace.
- Given I can set a typical course length, when I change it, then the courses-per-week figure updates immediately.
