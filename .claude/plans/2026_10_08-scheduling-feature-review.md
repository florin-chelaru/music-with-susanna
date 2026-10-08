# Scheduling Feature — Status Review & Findings

> Date: 2026-10-08
> Branch: `scheduling-feature-phase-1-wip` (3 commits ahead of `main`; merge-base `672b09a`)
> Reviews: [2026_08_05-scheduling-feature.md](./2026_08_05-scheduling-feature.md)
> Context: work was paused ~2 months, then leftover WIP was committed from another machine
> (`89413b8 add work in progress`) before it was finished. This document captures the state of
> that work, a full review of the plan, and the agreed next steps.

---

## 0. How to resume

The build was broken on checkout and is now **fixed** (see §1). Everything below §1 is analysis —
nothing else has been changed in the working tree.

Working tree at time of writing: `package.json` and `package-lock.json` modified (the build fix),
not yet committed. Everything else untouched.

Recommended resume order is in §5.

---

## 1. Build break — root cause and fix (DONE)

### Symptom

```
npm install
npm ERR! ERESOLVE could not resolve
npm ERR! While resolving: @mui/x-date-pickers@6.20.2
npm ERR! Found: date-fns@4.4.0
npm ERR! peerOptional date-fns@"^2.25.0 || ^3.2.0" from @mui/x-date-pickers@6.20.2
```

…and consequently, since the install never completed, a stale `node_modules` and 28 webpack errors:
`Can't resolve '@mui/x-date-pickers/AdapterDayjs'`, `Can't resolve 'dayjs'`,
`Can't resolve 'react-big-calendar'`, etc.

### Root cause

`date-fns@^4.4.0` was listed in `package.json` but is **imported by nothing** — it appears only in
`package.json` and in the plan document. `@mui/x-date-pickers@6.20.2` declares `date-fns` as an
*optional* peer capped at `^2.25.0 || ^3.2.0`, so npm 9 refused to resolve v4 and aborted the whole
install. Nothing scheduling-related ever landed in `node_modules`.

The dependency was added on a false premise. The plan (line 1192) states:

> `react-big-calendar`'s drag-and-drop addon … requires a peer dep on either `moment` or `date-fns`
> as the localizer; use `date-fns`

This is **not true for react-big-calendar v1.20.0**, which ships `dayjs`, `moment`, `luxon` and
`globalize` as *real dependencies*. Its only peers are `react` and `react-dom`. No localizer peer
dep is needed at all.

### Fix applied

1. Removed `"date-fns": "^4.4.0"` from `package.json` dependencies.
2. Re-ran `npm install --lockfile-version 2` (keeps lockfile v2 to match `main`).

npm now resolves `date-fns@3.6.0` automatically as x-date-pickers' optional peer — satisfied, no
conflict, and still imported by nothing.

### About the large `package-lock.json` diff

The diff is ~34k lines. This is expected and is a *repair*, not a regression:

- **245 packages were missing** from the committed lockfile (mostly jest's transitive tree) —
  consistent with the lockfile having been committed mid-flight from the other machine.
- **49 transitive build deps** moved up *within their existing caret ranges* (babel, jest,
  browserslist, caniuse-lite, electron-to-chromium).
- **No top-level runtime dependency changed**: react 18.2.0, firebase 10.5.0, react-scripts 5.0.1,
  @mui/material 5.10.13, typescript 4.8.4, react-quill 2.0.0 — all identical.

### Verification (all green)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, no errors |
| `npx jest` | 38/38 pass, 5 suites |
| `npm run build` | succeeds |
| `npm start` | compiles; only pre-existing quill source-map warnings |
| `npx eslint src/{util/scheduling.ts,data/schedulingMocks.ts,pages/scheduling,Components/scheduling}` | clean |

`npm run lint` still reports 17 errors, **all pre-existing** on `main` (Resources-feature test files:
`Announcement.test.tsx`, `AnnouncementProvider.test.tsx`, `resources.test.ts`) plus `build/` being
linted because the repo has no `.eslintignore`. None are in scheduling code.

### Side effect worth tracking

Bundle grew **+134 kB gzipped** (now 553 kB) from react-big-calendar + x-date-pickers + dayjs.
CRA already emits its bundle-size warning. Worth a lazy-route code split before shipping.

---

## 2. Where the work stands

Plan says Steps A–E complete; the code matches exactly. ~2,870 lines of scheduling code,
**all driven by mocks — zero RTDB wiring**.

| Step | Artifacts | Lines |
|---|---|---|
| A | `src/util/scheduling.ts` (types, `SCHEDULING_CONFIG`, `schedulingPaths`, `computeCombinedScore`) | 234 |
| A | `src/util/scheduling.test.ts` (8 tests, `computeCombinedScore` only) | 35 |
| A | `src/data/schedulingMocks.ts` | 360 |
| A | Routes in `App.tsx`, entries in `RouteInfo.tsx`, nav links in `UserPopover.tsx` | — |
| B | `src/pages/scheduling/SchedulingPage.tsx` | 249 |
| B | `src/Components/scheduling/LocationDialog.tsx` | 104 |
| B | `src/Components/scheduling/SemesterDialog.tsx` | 178 |
| C | `src/Components/scheduling/AvailabilityCalendar.tsx` | 957 |
| C | `src/pages/scheduling/AvailabilityCalendarTest.tsx` (temp, remove before ship) | 56 |
| D | `src/pages/scheduling/SemesterPage.tsx` — tab shell + Availability tab + week overrides | 519 |
| E | `src/Components/scheduling/EnrollmentDialog.tsx` + Students tab | 177 |

Next per the plan: **Step F** — `LessonCalendar` + Calendar tab + `CancelLessonDialog`.

---

## 3. Plan review — stale or incorrect

The overall architecture holds up: teacher-driven, location-partitioned, semester-level
*date-specific* scheduling (the alternating-weeks worked example genuinely justifies that over a
weekly recurring template), path-embedded ownership matching the existing
`/homework/teachers/{tid}/...` convention. The problems are localized.

### (a) Two of the three suggestion strategies are mathematically identical — HIGH

From the plan's strategy table:

| Strategy | Sort key as written |
|---|---|
| `teacher_best` | `teacherScore` desc |
| `student_best` | `combinedScore` desc |
| `balanced` | `TEACHER_WEIGHT × teacherScore + STUDENT_WEIGHT × studentScore` desc |

But `combinedScore` **is** `teacherScore × 0.7 + studentScore × 0.3` (see `computeCombinedScore`).
`student_best` and `balanced` are the same expression, so they will always produce the identical
schedule. Step H renders all three side by side — two cards would be duplicates.

**Fix:** `student_best` should sort by `studentScore` descending. That also matches the overview's
own description ("Maximize number of students placed in their Preferred slots").

### (b) The whole Algorithm Notes section is written against date-fns — HIGH

Plan lines ~481–700 use `startOfWeek`, `eachDayOfInterval`, `eachWeekOfInterval`,
`differenceInDays`, `getDay`, `format` from `date-fns`. But Step C already recorded the discovery
that *"date-fns v4 is ESM-only and incompatible with CRA"* and switched to `dayjsLocalizer` — and
date-fns is now removed from `package.json` entirely (§1).

Step L would walk straight into the same wall. **The section needs rewriting against dayjs.**

Also stale for the same reason:
- line 1192 — the react-big-calendar peer-dep claim (wrong, see §1)
- line 1345 — `dateFnsLocalizer` from `react-big-calendar/lib/localizers/date-fns`
- line 961 — "`date-fns` installed"

### (c) Two concrete landmines in the Step L pseudocode — MEDIUM

1. `computeSchedule` references `result.unscheduledStudentIds.push(...)` and returns
   `{ slots: assigned, unscheduledStudentIds, totalScore }` — **neither `result` nor
   `unscheduledStudentIds` is ever declared.**
2. `computeTotalScore` uses `Map.groupBy(slots, s => s.date)`. The repo is on TypeScript **4.8.4**
   targeting ES2015; `Map.groupBy` is not in that lib (added in TS 5.4) so it will not typecheck,
   and at runtime it needs Chrome 117+ / Node 21+, outside the project's browserslist.
   Use a plain `reduce` into a `Record<string, LessonSlot[]>`.

### (d) `computeCombinedScore`: plan says `/10`, code does not — LOW

Plan: `combined = (teacher × 0.7 + student × 0.3) / 10` → max 1.0.
Code: no division → max 10. The 8 existing tests assert the code's behaviour.

**The code is correct.** The gap penalty is tuned as "30 min excess → −1.5 pts, comparable to one
slot score", which only makes sense on a 0–10 scale. **Fix the plan text, not the code.**

### (e) Step S (security rules) has no file to edit, and is sequenced too late — HIGH

There is **no `database.rules.json` and no `firebase.json` in this repo.** The functions repo
(`/Users/florinc/dev/music-with-susanna-functions`) has a `firebase.json` that declares only
`functions` — no `database` section. RTDB rules exist **only in the Firebase console**, unversioned.

This feature adds ~13 new top-level RTDB paths with non-trivial cross-reference rules
(`studentEnrollments`, `studentSubmissions`, `lessonInstances`, `cancellations`, …).

Worse, Step S is sequenced **last**, after all RTDB wiring. From Step N onward you would be writing
real data to paths governed by whatever the console default is. If that default is `auth != null`,
every student can read every other student's submissions and lesson records.

**Fix:** move rules work to *before* Step N. First export the current console rules into this repo
as `database.rules.json` + a `firebase.json` with a `database` block, so nothing is lost.

### (f) "Students amend their previous submission in subsequent rounds" has no mechanism — MEDIUM

The phrase appears exactly once in the plan (line 33, Core Concepts) and is never implemented.
`studentSubmissions` is keyed per-round (`.../rounds/{roundId}/students/{studentId}`) and nothing
copies round N−1 → round N. Needs its own implementation step.

### (g) `ics` package was never installed — LOW

Step 10 / Step R imports `createEvents` from `'ics'`. Not in `package.json`.

---

## 4. Code & design findings (not flagged by the plan)

### (a) Real bug: `toWeekMonday` is off by one day in Europe/Bucharest — HIGH

`src/pages/scheduling/SemesterPage.tsx:147` — `toWeekMonday` ends with
`monday.toISOString().slice(0, 10)` applied to a **local-midnight** `Date`. `toISOString()` converts
to UTC, so in any timezone east of UTC the date rolls back a day. Verified:

```
TZ=Europe/Bucharest  picked 2026-03-09 (Mon) -> weekMonday 2026-03-08   WRONG
TZ=Europe/Bucharest  picked 2026-03-11 (Wed) -> weekMonday 2026-03-08   WRONG
TZ=Europe/Bucharest  picked 2026-03-15 (Sun) -> weekMonday 2026-03-08   WRONG
TZ=UTC               picked 2026-03-11 (Wed) -> weekMonday 2026-03-09   correct
TZ=America/New_York  picked 2026-03-11 (Wed) -> weekMonday 2026-03-09   correct
```

Europe/Bucharest is the app's own configured semester timezone, so this is always wrong in practice.

**Consequence:** every week-override key is written one day early (keyed on Sunday). The algorithm
looks overrides up by a true Monday (`startOfWeek(..., { weekStartsOn: 1 })`), so in Step L the
overrides would **silently never match** — spring break simply would not apply, with no error.

`AvailabilityCalendar.tsx` does its date math correctly (local `Date` constructors + `setHours`,
no `toISOString`), so the bug is isolated to this one helper. But it argues for pulling all
week/day math into a single dayjs-based `src/util/schedulingDates.ts` shared by UI and algorithm.

### (b) The greedy does not deliver the guarantee the plan claims — MEDIUM

Plan: *"All three strategies treat 'include every student' as a hard constraint first. Only if a
student genuinely cannot be fit into any slot is that student dropped."*

The algorithm sorts most-constrained-first but **never backtracks**. A student can end up in
`unscheduledStudentIds` purely because earlier picks consumed their only feasible slots — not
because no slot exists. For ≤20 students this is probably acceptable; recommend softening the claim
in the plan and adding a test that documents the failure mode, rather than introducing a solver.

### (c) `AvailabilityLabel.UNAVAILABLE` is unreachable dead code — LOW

`AvailabilityCalendar.tsx:330` — `labelOptions` offers only PREFERRED / AVAILABLE / LAST_RESORT.
Nothing in the UI can create an Unavailable block. The plan says it is "overlay only" and that
students cannot create them — but the overlay renders *teacher* blocks, which also cannot be
Unavailable. The label exists in the enum, `LABEL_SCORES`, the color map, and both translation
tables, and is unreachable. Either give it a purpose or remove it.

### (d) Student-facing nav link is live and leads to a stub — MEDIUM (ship blocker)

`UserPopover.tsx` now shows **"My Schedule" / "Orarul Meu" to every student**, routing to
`/schedule`, which `App.tsx` maps to `<div>My Schedule — coming soon</div>`. The teacher
"Scheduling" / "Programări" link at least lands on a real page.

**Do not merge to `main` before Step J**, or gate the student link behind a flag.

### (e) Smaller items

- `/scheduling/availability-test` route + `src/pages/scheduling/AvailabilityCalendarTest.tsx` must be
  removed before shipping (the plan already notes this).
- `src/store/Firebase.ts` has a commented-out `;(window as any)._auth = auth` marked
  "temporary — remove after testing".
- `EnrollmentDialog` free-types `totalLessons` (default `'15'`) with **no** derivation from the
  frequency shorthand the plan describes, and no validation against semester length. The
  `StudentEnrollment` type carries optional `lessonsPerPeriod` / `period` marked "UI-derived;
  display only". Decide which is authoritative.
- `removeOverlaps` (`AvailabilityCalendar.tsx`) has five documented branches — no overlap, left trim,
  right trim, split/punch-through, fully covered — and **zero tests**. Cheap, high-value coverage on
  genuinely fiddly pure logic.
- `AvailabilityCalendar.tsx` is 957 lines, by far the largest component in the repo. Step K adds
  overlay mode + warnings on top. Consider extracting the mobile view and the label popover first.
- `Semester.timezone` and `LessonInstance.timezone` are stored but never used — all UI date math is
  local-browser. Fine for a single-tz deployment, but finding 4(a) is the first symptom of having no
  single date utility.

---

## 5. Recommended next steps

Before resuming Step F — roughly half a day:

1. **Fix `toWeekMonday`** (§4a) and extract `src/util/schedulingDates.ts` — dayjs-based week/day
   helpers shared by UI and algorithm — with unit tests. Every override written before this fix is
   wrong, so it gets more expensive with time.
2. **Update the plan document**:
   - rewrite Algorithm Notes against dayjs (§3b)
   - fix the `student_best` sort key (§3a)
   - fix the `computeCombinedScore` `/10` formula to match the code (§3d)
   - fix the undeclared-variable and `Map.groupBy` pseudocode (§3c)
   - drop the date-fns / `dateFnsLocalizer` claims (§3b)
   - add an "amend previous round's submission" step (§3f)
   - move Step S before Step N (§3e)
   - soften the "every student is a hard constraint" claim (§4b)
3. **Decide where RTDB rules live** (§3e) and commit the current console rules into this repo.
4. **Add `removeOverlaps` tests** (§4e).

Then continue with **Step F** as planned.

---

## Appendix — verification commands used

```bash
npx tsc --noEmit                      # exit 0
npx jest                              # 38/38 pass
npm run build                         # succeeds
npx eslint src/pages/scheduling src/Components/scheduling src/util/scheduling.ts  # clean
npm ls --depth=0                      # clean tree, no UNMET/invalid
grep -rn "date-fns" --exclude-dir=node_modules --exclude=package-lock.json .   # only plan doc
```
