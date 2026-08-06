# Scheduling Feature

> Status: Implementation in progress — Steps A, B, and C complete

---

## Overview

A scheduling system for music lessons between teachers and students. Supports individual and group lessons, semester-scoped availability negotiation, cancellations with acknowledgment, and email notifications via Firebase Cloud Functions.

Key design principles:
- Teacher-driven: teachers control all scheduling decisions
- Location-partitioned: each teaching location runs its own independent semester/schedule
- Phased rollout: Phase 1 covers individual lessons; group lessons, student confirmation, and notification settings come in later phases
- Time zone aware: all timestamps stored with full tz info; UI renders in a single configured time zone (expandable later)

---

## Core Concepts

### Location

A physical place where a teacher teaches. Each location runs fully independent semesters — same system, different partition. Students are tied to a location.

### Semester

A date-range scheduling period within one location. The teacher sets start/end dates and manages the full lifecycle: collecting availability → negotiating → confirming schedule → running lessons.

Semesters do not overlap (within the same location). A student can be enrolled in semesters across multiple locations/teachers simultaneously; the app does not enforce cross-teacher conflicts.

### Scheduling Round (Negotiation Pass)

A round is one cycle of: teacher requests availability → students submit → system suggests → teacher reviews. If unsatisfied, the teacher opens another round. Students amend (not re-enter) their previous submission in subsequent rounds.

### Availability

Both teachers and students express availability as **free-form time blocks** on a weekly template, each labeled with a score tier. Availability is set per semester; the previous semester's template pre-populates the next one.

**Score tiers:**

| Label | Score | Meaning |
|---|---|---|
| Preferred | 10 | Actively want this |
| Available | 6 | Works fine, no preference |
| Last Resort | 2 | Would rather not, but could |
| Unavailable | 0 | Hard block — never |

Design note: labels map to numeric scores. New labels can be inserted at any score value later without breaking existing logic.

**Combined slot score formula:**

```
if teacher_score == 0: combined = 0  (hard block)
else if student_score == 0: combined = 0  (student hard block)
else: combined = (teacher_score × TEACHER_WEIGHT + student_score × STUDENT_WEIGHT) / 10
```

Weights are configurable constants: `TEACHER_WEIGHT = 0.7`, `STUDENT_WEIGHT = 0.3`.

**Gap penalty:** after satisfying the minimum break constraint, the algorithm penalizes days where the gap between consecutive lessons exceeds `GAP_PENALTY_THRESHOLD_MINUTES`. This encourages compact scheduling.

**Configurable constants (all in one place in code):**

```
SLOT_SNAP_MINUTES = 15          // lesson start times snap to this grid
MIN_BREAK_MINUTES = 10          // minimum gap between consecutive lessons
GAP_PENALTY_THRESHOLD_MINUTES = 30  // gaps longer than this are penalized
GAP_PENALTY_PER_MINUTE = 0.05   // score deducted per minute over the threshold
                                //   (30min excess → -1.5 pts, comparable to one slot score)
TEACHER_WEIGHT = 0.7
STUDENT_WEIGHT = 0.3
MIN_STUDENT_PREFERENCES = 3     // minimum recurring preferences a student must submit
MIN_PREFERRED_PREFERENCES = 1   // at least this many must be Preferred
```

### Student Availability Submission

A student submits:
1. **Recurring preferences** — at least `MIN_STUDENT_PREFERENCES` (e.g., 3) time windows (day + time range + label), at least `MIN_PREFERRED_PREFERENCES` labeled Preferred. These repeat every week as the baseline.
2. **Week overrides** — per-week modifications. E.g., "Week of March 10: fully unavailable" or "Week of April 7: available Monday instead of Wednesday."

### Schedule Suggestion

After all students submit (or the deadline passes), the system generates **3 candidate schedules simultaneously**, one per optimization strategy:

| Strategy | Objective |
|---|---|
| Best for Teacher | Maximize sum of teacher scores across all placed slots |
| Best for Students | Maximize number of students placed in their Preferred slots |
| Balanced | Weighted combination of teacher and student scores |

All three strategies treat "include every student" as a hard constraint first. Only if a student genuinely cannot be fit into any slot is that student dropped and the teacher notified.

The teacher sees all three side-by-side, picks one as a starting point, edits manually, then confirms.

### Lesson Instance

Once confirmed, the system generates individual `LessonInstance` records for every occurrence in the semester (e.g., 16 Wednesdays). Each has its own status and can be independently canceled, rescheduled, or marked complete.

### Cancellation

- Either teacher or student cancels a specific lesson instance in-app.
- The lesson is **immediately canceled** (not held pending acknowledgment).
- The other party is notified and must **acknowledge** — this is informational only, not a gate.
- Until acknowledged (or the original lesson time passes), the system sends reminder notifications.
- **"Cancel all going forward"**: creates N individual cancellation records, sends **one bundled notification** to the other party.

**Student cancellation policy:**
- If canceled outside the cancellation window: no charge, no makeup.
- If canceled inside the window (or no-show): lesson is charged, no makeup.
- Cancellation window is configurable globally per semester, with a per-student override.

**Teacher cancellation:**
- Teacher can cancel any lesson.
- Teacher has the option to offer a makeup lesson (a new ad-hoc `LessonInstance` created separately).

**Acknowledgment:** the acknowledging party simply confirms receipt. No further action is required from them.

### Makeup / Ad-hoc Lessons

Any teacher-created lesson instance outside the confirmed recurring schedule. Stored with `isAdHoc: true`; makeup lessons also set `isMakeup: true` and reference the original canceled lesson via `parentLessonId`.

### Notifications

All notifications go through a no-op stub in Phase 1, wired to a Firebase Cloud Function later.

**Events that trigger notifications:**

| Event | Notifies Teacher | Notifies Student |
|---|---|---|
| Availability request sent | — | ✓ |
| Availability reminder (auto) | — | ✓ |
| Student submitted availability | ✓ | — |
| Schedule confirmed | — | ✓ |
| Lesson reminder (24h before) | ✓ | ✓ |
| Student cancels lesson | ✓ | — |
| Teacher cancels lesson | — | ✓ |
| Cancellation acknowledgment due | reminder to acknowledger | reminder to acknowledger |
| Makeup lesson proposed | — | ✓ |
| Student not schedulable | ✓ | — |

---

## RTDB Schema

### Design rationale

All top-level scheduling paths embed `teachers/{teacherId}` so that ownership is always derivable from the path itself — this is the same pattern the existing app uses for `/homework/teachers/{teacherId}/...`. RTDB security rules can then express most access checks as simple path-variable comparisons (`auth.uid === $teacherId`), with a cross-reference lookup only when a student needs access to a teacher-keyed path.

Path segments use explicit collection names at every level (e.g., `/semesters/{semesterId}/students/{studentId}` rather than `/semesters/{semesterId}/{studentId}`) for readability and to reduce ambiguity when nesting grows deep.

Student-initiated writes that need field-level validation (cancellation requests, lesson status changes) go through a **separate request path** rather than writing directly to the authoritative record. A Cloud Function processes the request and updates the authoritative record. This avoids the impossibility of per-field write validation in RTDB rules.

### Schema

```
/locations/teachers/{teacherId}/{locationId}
  name: string
  address: string (optional)
  createdAt: timestamp

/semesters/teachers/{teacherId}/{semesterId}
  locationId: string
  name: string
  startDate: string (YYYY-MM-DD)
  endDate: string (YYYY-MM-DD)
  status: "draft" | "scheduling" | "active" | "completed"
  defaultCancellationWindowHours: number
  timezone: string (e.g. "Europe/Bucharest")
  createdAt: timestamp

/teacherAvailability/teachers/{teacherId}/semesters/{semesterId}
  weeklyTemplate
    blocks: [ { dayOfWeek, startTime, endTime, label, score } ]
  weekOverrides
    {weekStartDate}: { blocks: [...] }

/studentEnrollments/teachers/{teacherId}/semesters/{semesterId}/students/{studentId}
  lessonDurationMinutes: number
  totalLessons: number              // total for the semester; UI derives from frequency shorthand
                                    // (Every week / Every 2 weeks / Twice a week) + semester length
  cancellationWindowHours: number (optional — falls back to semester default)

/schedulingRounds/teachers/{teacherId}/semesters/{semesterId}/rounds/{roundId}
  roundNumber: number
  status: "collecting" | "ready" | "suggested" | "finalized"
  deadline: timestamp
  createdAt: timestamp

/studentSubmissions/teachers/{teacherId}/semesters/{semesterId}/rounds/{roundId}/students/{studentId}
  status: "pending" | "submitted"
  submittedAt: timestamp (optional)
  recurringPreferences: [ { dayOfWeek, startTime, endTime, label, score } ]
  weekOverrides: { {weekStartDate}: { blocks: [...] } }

/scheduleSuggestions/teachers/{teacherId}/semesters/{semesterId}/rounds/{roundId}/{strategy}
  // strategy: teacher_best | student_best | balanced — teacher-only, never shown to students
  slots: [ { studentId, dayOfWeek, startTime, endTime, teacherScore, studentScore, combinedScore } ]
  unscheduledStudents: [ studentId ]
  totalScore: number

/confirmedSchedules/teachers/{teacherId}/semesters/{semesterId}
  roundId: string
  strategy: string
  confirmedAt: timestamp
  editedFromSuggestion: boolean

/lessonInstances/teachers/{teacherId}/semesters/{semesterId}/lessons/{lessonId}
  studentId: string
  locationId: string
  scheduledStart: timestamp (with tz)
  scheduledEnd: timestamp (with tz)
  timezone: string
  status: "scheduled" | "canceled" | "completed" | "rescheduled"
  isAdHoc: boolean
  isMakeup: boolean
  parentLessonId: string (optional)
  calendarSequence: number  // incremented each time a calendar invite/cancel is emailed; starts at 0
  createdAt: timestamp

// Authoritative cancellation records — written only by the teacher or by Cloud Function
/cancellations/teachers/{teacherId}/semesters/{semesterId}/{cancellationId}
  lessonId: string
  canceledBy: uid
  otherParty: uid          // explicit field so other-party read rule needs no join
  canceledAt: timestamp
  withinWindow: boolean
  charged: boolean         // always false in Phase 1 (billing external)
  makeupOffered: boolean
  makeupLessonId: string (optional)
  acknowledgmentStatus: "pending" | "acknowledged"
  acknowledgmentAt: timestamp (optional)
  bundleId: string (optional — groups "cancel all forward" cancellations)

/cancellationBundles/teachers/{teacherId}/semesters/{semesterId}/{bundleId}
  studentId: string
  lessonCount: number
  fromDate: string
  acknowledgmentStatus: "pending" | "acknowledged"
  acknowledgmentAt: timestamp (optional)

// Student-initiated cancellation requests — written by students, processed by Cloud Function
/cancellationRequests/teachers/{teacherId}/semesters/{semesterId}/{requestId}
  studentId: string
  lessonId: string
  requestedAt: timestamp
  reason: string (optional)
  cancelAllForward: boolean
  status: "pending" | "processed" | "rejected"

/notifications/teachers/{teacherId}/{notificationId}
  type: string
  recipientId: uid         // may be teacherId or a studentId
  semesterId: string
  lessonId: string (optional)
  cancellationId: string (optional)
  roundId: string (optional)
  channel: "email" | "in_app"
  status: "pending" | "sent" | "failed"
  createdAt: timestamp
  sentAt: timestamp (optional)
```

### Access rules

| Path | Teacher read | Teacher write | Student read | Student write |
|---|---|---|---|---|
| `/locations/teachers/$tid/$lid` | own | own | enrolled with $tid | — |
| `/semesters/teachers/$tid/$sid` | own | own | enrolled in $sid | — |
| `/teacherAvailability/teachers/$tid/semesters/$sid` | own | own | enrolled in $sid | — |
| `/studentEnrollments/teachers/$tid/semesters/$sid/students/$uid` | own | own | self | — |
| `/schedulingRounds/teachers/$tid/semesters/$sid/rounds/$rid` | own | own | enrolled in $sid | — |
| `/studentSubmissions/teachers/$tid/semesters/$sid/rounds/$rid/students/$uid` | own | own | self | self, while round status == "collecting" |
| `/scheduleSuggestions/teachers/$tid/semesters/$sid/rounds/$rid/$strat` | own | own | — | — |
| `/confirmedSchedules/teachers/$tid/semesters/$sid` | own | own | enrolled in $sid | — |
| `/lessonInstances/teachers/$tid/semesters/$sid/lessons/$lid` | own | own | `data.studentId == uid` | — |
| `/cancellations/teachers/$tid/semesters/$sid/$cid` | own | own | `data.otherParty == uid` or `data.canceledBy == uid` | — |
| `/cancellationBundles/teachers/$tid/semesters/$sid/$bid` | own | own | `data.studentId == uid` | — |
| `/cancellationRequests/teachers/$tid/semesters/$sid/$rid` | own | — | self (`data.studentId == uid`) | self (create only) |
| `/notifications/teachers/$tid/$nid` | own | own | `data.recipientId == uid` | — |

**"Enrolled in $sid" cross-reference** (used in rules where a student needs access to semester-level data):

```javascript
root.child('studentEnrollments')
    .child('teachers').child($teacherId)
    .child('semesters').child($semesterId)
    .child('students').child(auth.uid)
    .exists()
```

**"Enrolled with $tid" cross-reference** (used for location-level access — reuses the existing mapping):

```javascript
root.child('teachers').child($teacherId)
    .child('students').child(auth.uid)
    .exists()
```

### Cancellation write flow (student path)

```
Student writes /cancellationRequests/teachers/{tid}/semesters/{sid}/{requestId}
  ↓
Cloud Function triggers on write:
  1. Validates lesson belongs to that student
  2. Computes withinWindow from cancellationWindowHours
  3. Writes /cancellations/teachers/{tid}/semesters/{sid}/{cancellationId}
  4. Updates /lessonInstances/.../lessons/{lid}/status = "canceled"
  5. Writes /notifications/.../  for the teacher
  6. Updates /cancellationRequests/.../status = "processed"
```

This keeps all authoritative records teacher-write-only while still allowing students to initiate cancellations.

---

## Phase 1 — MVP (Individual Lessons)

### Scope

- Individual lessons only (no group lessons)
- Teacher finalizes the schedule (no student confirmation of assigned slot)
- Single-pass OR multi-pass negotiation (teacher triggers additional rounds)
- Calendar export (.ics)
- Notifications via no-op stub
- No configurable notification preferences
- No billing tracking

### User Flows

#### Teacher: Create a Location

1. Teacher navigates to Scheduling section
2. Creates a location (name, optional address)

#### Teacher: Create a Semester

1. Teacher selects a location
2. Creates a semester: name, start date, end date, default cancellation window (hours)
3. Sets weekly availability template — draws blocks on a weekly calendar, assigns label to each
4. Optionally adds week overrides (e.g., "Week of Dec 23: fully unavailable")

#### Teacher: Enroll Students

1. Within a semester, teacher adds existing students (from their student list)
2. Per student: lesson duration (minutes), lessons per week, optional custom cancellation window

#### Teacher: Open Scheduling Round

1. Teacher clicks "Request Availability" — sets a submission deadline
2. System sends notification to all enrolled students with status "pending"

#### Student: Submit Availability

1. Student opens the scheduling request
2. Sees a weekly calendar with teacher's availability blocks (all labels visible)
3. When student selects a Last Resort or Unavailable slot from teacher's perspective, they see a soft warning: *"This slot may not be available. Select a Preferred slot to maximize your chances."*
4. Student draws their own recurring preference blocks, assigns labels
5. System validates: must have ≥ `MIN_STUDENT_PREFERENCES` blocks, ≥ `MIN_PREFERRED_PREFERENCES` Preferred
6. Student submits. Can add/edit week overrides before submitting.
7. After deadline: submissions locked. Students who didn't submit are marked; teacher notified.

#### Teacher: Review Suggestions

1. After deadline (or once all submitted), teacher clicks "See Suggested Schedules"
2. System runs algorithm for all 3 strategies, presents 3 calendars side-by-side
3. Each suggested calendar shows:
   - Each student's assigned recurring slot, color-coded by combined score
   - Students who couldn't be scheduled (highlighted)
   - Overall schedule score
4. Teacher picks one strategy's output as starting point
5. Teacher can manually drag/adjust slots on the confirmed view
6. Teacher clicks "Confirm Schedule"
7. System generates individual `LessonInstance` records for all weeks in the semester (respecting week overrides)
8. Students notified via email + in-app: schedule confirmed

#### Student/Teacher: Cancel a Lesson

**Student cancels:**
1. Student finds lesson in their calendar, clicks Cancel, enters optional reason
2. System computes whether cancellation is within the window
3. System creates `CancellationRecord`, marks lesson as canceled immediately
4. Student sees a message: within window → "No refund or makeup lesson"; outside window → "No charge; you may request a makeup lesson from your teacher"
5. Teacher receives notification, must acknowledge
6. If student selects "Cancel all going forward": creates a `CancellationBundle` + N `CancellationRecord`s; teacher receives one bundled notification

**Teacher cancels:**
1. Teacher finds lesson in calendar, clicks Cancel, optionally offers a makeup lesson
2. System creates `CancellationRecord`, marks lesson as canceled immediately
3. Student notified; must acknowledge
4. If makeup offered, teacher creates an ad-hoc lesson at a new time (separate flow); makeup `LessonInstance` references original

#### Calendar Export

1. Teacher or student can download `.ics` file from their schedule view
2. Contains all `LessonInstance` records for the semester with correct timestamps and timezone

---

## Phase 2

- **Group lessons**: teacher creates a lesson with multiple enrolled students and a single duration/frequency. Group cancellation is teacher-decides-case-by-case. Group rescheduling restarts availability negotiation using the latest individual availability of all group members.
- **Student slot confirmation**: after teacher proposes, each student must confirm their assigned slot before the schedule is locked
- **Configurable notification preferences**: teacher and student can toggle individual notification types on/off
- **Student availability editable any time**: changes take effect for any subsequent rescheduling; confirmed recurring lessons are not affected

---

## Phase 3+

- **Multiple time zones**: currently single-tz per semester; stored data is already tz-aware
- **Billing status tracking**: mark lessons as charged/refunded within the app; possibly integrate with payment provider
- **Ad-hoc lessons outside a semester**: one-off lessons not tied to a semester or negotiation
- **Mobile push notifications**: currently email + in-app only
- **Student self-enrollment request**: student requests to join a semester; teacher approves

---

## Algorithm Notes (Phase 1)

Up to 20 students, up to 20-week semester. The algorithm schedules **specific dates** across the entire semester — not a recurring weekly template. This allows two students to genuinely share a Monday 10am slot on alternating weeks, handles bi-weekly lessons naturally, and makes week overrides (spring break, holidays) first-class inputs rather than post-processing.

### Types

```typescript
// stored in StudentEnrollment
interface StudentEnrollment {
  studentId: string
  lessonDurationMinutes: number
  totalLessons: number           // UI populates via frequency shorthand + semester length
  cancellationWindowHours?: number
}

// one feasible (student, date, time) triple before assignment
interface CandidateSlot {
  studentId: string
  date: string          // "YYYY-MM-DD"
  startTime: string     // "HH:mm"
  endTime: string       // "HH:mm"
  teacherScore: number
  studentScore: number
  combinedScore: number
}

// one assigned lesson after the algorithm runs
interface LessonSlot {
  studentId: string
  date: string
  startTime: string
  endTime: string
  teacherScore: number
  studentScore: number
  combinedScore: number
}

interface SchedulingResult {
  slots: LessonSlot[]
  unscheduledStudentIds: string[]
  totalScore: number
}

type SuggestionStrategy = 'teacher_best' | 'student_best' | 'balanced'

// week overrides: weekStartDate → blocks (empty array = fully unavailable that week)
type WeekOverrides = Record<string, AvailabilityBlock[]>

interface SchedulingInput {
  semesterStart: string                                   // "YYYY-MM-DD"
  semesterEnd: string                                     // "YYYY-MM-DD"
  teacherWeeklyBlocks: AvailabilityBlock[]
  teacherWeekOverrides: WeekOverrides
  enrollments: StudentEnrollment[]
  studentWeeklyBlocks: Record<string, AvailabilityBlock[]>    // studentId → blocks
  studentWeekOverrides: Record<string, WeekOverrides>         // studentId → week overrides
}
```

### Helper functions

Date-level operations use `date-fns` (installed with `react-big-calendar`). "HH:mm" time strings use plain arithmetic — `date-fns` works on `Date` objects, so converting "HH:mm" through a Date reference introduces timezone hazards (confirmed: `addMinutes(new Date(0), 570)` formats as "11:30" on a UTC+2 machine). `snapUp` uses `Math.ceil` directly since `roundToNearestMinutes` operates on `Date` objects, not raw minute integers.

```typescript
import { startOfWeek, getDay, format, eachDayOfInterval, eachWeekOfInterval, differenceInDays } from 'date-fns'

// ─── Time string helpers ───────────────────────────────────────────────────────

// "HH:mm" → total minutes since midnight.  e.g. "09:30" → 570
function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Minutes since midnight → "HH:mm".  e.g. 570 → "09:30"
function formatMinutes(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

// Round minutes up to the nearest snap-grid point.  e.g. snapUp(67, 15) → 75
function snapUp(minutes: number, snap: number): number {
  return Math.ceil(minutes / snap) * snap
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

// "YYYY-MM-DD" → day-of-week where 0=Mon … 6=Sun (AvailabilityBlock convention).
// date-fns getDay returns 0=Sun, so we remap.
function getDayOfWeek(date: string): number {
  const dow = getDay(new Date(date))   // 0=Sun, 1=Mon … 6=Sat
  return dow === 0 ? 6 : dow - 1      // remap to 0=Mon … 6=Sun
}

// ─── Availability queries ─────────────────────────────────────────────────────

// Return the effective availability blocks for a specific date.
//
// Finds the Monday of the week containing `date` (via date-fns startOfWeek).
// If weekOverrides has an entry keyed by that Monday string, returns those blocks
// filtered to the matching dayOfWeek. An empty override array means the entire
// week is unavailable → returns [].
// Otherwise falls back to weeklyBlocks filtered to that dayOfWeek.
//
// Example: weeklyBlocks = [{dayOfWeek:0, startTime:"09:00", endTime:"12:00", score:10}]
//   date = "2026-03-09" (Mon, normal week)    → [{Mon, 09:00-12:00, score:10}]
//   date = "2026-03-16" (Mon, override = []) → []   ← spring break
function getEffectiveBlocksForDate(
  weeklyBlocks: AvailabilityBlock[],
  weekOverrides: WeekOverrides,
  date: string
): AvailabilityBlock[] {
  const weekStart = format(startOfWeek(new Date(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const dow = getDayOfWeek(date)
  if (weekStart in weekOverrides) {
    return weekOverrides[weekStart].filter(b => b.dayOfWeek === dow)
  }
  return weeklyBlocks.filter(b => b.dayOfWeek === dow)
}

// Return the score of whichever block covers startTime (point lookup).
// A block covers a point if block.startTime <= t < block.endTime.
// Returns 0 if no block covers it.
//
// Use this when you already know the slot fits within one block.
// When a slot may span a block boundary, use getScoreForSpan instead.
function getScoreAtTime(blocks: AvailabilityBlock[], startTime: string): number {
  const t = parseMinutes(startTime)
  for (const b of blocks) {
    if (parseMinutes(b.startTime) <= t && t < parseMinutes(b.endTime)) return b.score
  }
  return 0
}

// Return the duration-weighted average score for a slot [startTime, startTime+duration].
// Returns 0 if any part of the slot falls outside all blocks (gap = unavailable time).
//
// Handles consecutive blocks of different scores (assumes blocks are non-overlapping).
//
// Example (two consecutive blocks: 09:00-10:00 score 10, 10:00-11:00 score 6):
//   getScoreForSpan(blocks, "09:30", 45)
//   → 30 min × 10 + 15 min × 6 = 390 → 390 / 45 ≈ 8.67
//
//   getScoreForSpan(blocks, "09:30", 90)  // slot ends 11:00, no block after 11:00
//   → gap detected at 11:00 → 0
function getScoreForSpan(
  blocks: AvailabilityBlock[],
  startTime: string,
  durationMinutes: number
): number {
  const start = parseMinutes(startTime)
  const end = start + durationMinutes

  const relevant = blocks
    .filter(b => parseMinutes(b.startTime) < end && parseMinutes(b.endTime) > start)
    .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))

  // any gap in coverage → slot straddles unavailable time → invalid
  let covered = start
  for (const b of relevant) {
    if (parseMinutes(b.startTime) > covered) return 0
    covered = Math.max(covered, parseMinutes(b.endTime))
  }
  if (covered < end) return 0

  let weightedSum = 0
  for (const b of relevant) {
    const overlap =
      Math.min(parseMinutes(b.endTime), end) - Math.max(parseMinutes(b.startTime), start)
    weightedSum += overlap * b.score
  }
  return weightedSum / durationMinutes
}
```

### Candidate generation

```typescript
import { eachDayOfInterval, format } from 'date-fns'

// Generate all feasible (student, date, startTime) triples for the semester.
// A triple is feasible if both teacher and student are available for the full
// lesson duration and the combined score > 0.
//
// Iteration strategy: loop over teacher blocks (not the full day) because a
// candidate can only exist where the teacher is available. This is the tightest
// outer bound. If a future requirement adds student-only time windows not tied
// to teacher availability, this decision would need revisiting.
function generateAllCandidates(input: SchedulingInput): CandidateSlot[] {
  const candidates: CandidateSlot[] = []

  const dates = eachDayOfInterval({
    start: new Date(input.semesterStart),
    end: new Date(input.semesterEnd)
  }).map(d => format(d, 'yyyy-MM-dd'))

  for (const date of dates) {
    const teacherBlocks = getEffectiveBlocksForDate(
      input.teacherWeeklyBlocks, input.teacherWeekOverrides, date
    )

    for (const enrollment of input.enrollments) {
      const studentBlocks = getEffectiveBlocksForDate(
        input.studentWeeklyBlocks[enrollment.studentId],
        input.studentWeekOverrides[enrollment.studentId] ?? {},
        date
      )

      for (const tb of teacherBlocks) {
        let t = snapUp(parseMinutes(tb.startTime), SCHEDULING_CONFIG.SLOT_SNAP_MINUTES)
        const blockEnd = parseMinutes(tb.endTime)

        while (t + enrollment.lessonDurationMinutes <= blockEnd) {
          const startTime = formatMinutes(t)
          const sScore = getScoreForSpan(studentBlocks, startTime, enrollment.lessonDurationMinutes)
          if (sScore > 0) {
            candidates.push({
              studentId: enrollment.studentId,
              date,
              startTime,
              endTime: formatMinutes(t + enrollment.lessonDurationMinutes),
              teacherScore: tb.score,
              studentScore: sScore,
              combinedScore: computeCombinedScore(tb.score, sScore)
            })
          }
          t += SCHEDULING_CONFIG.SLOT_SNAP_MINUTES
        }
      }
    }
  }

  return candidates
}
```

**Computation estimate — 20 students, 20-week semester:**
- 140 dates × 20 students = 2,800 (date, student) pairs
- Per pair, ~4 start times on average (teacher available ~5 days/week at ~5 hrs/day; averaged across all 140 days including unavailable ones)
- → ~11,000 inner iterations; each does a 2-block scan → **well under 1ms**

`computeSchedule` (called 3 times): 20 weeks × 20 students × ~10 candidates per student per week × conflict check against ~10 same-day assignments → ~120,000 comparisons total across all 3 calls → **under 10ms**.

### Assignment (per strategy)

```typescript
function computeSchedule(
  input: SchedulingInput,
  candidates: CandidateSlot[],   // pre-generated; shared across all 3 strategies
  strategy: SuggestionStrategy
): SchedulingResult

function generateAllSuggestions(
  input: SchedulingInput
): Record<SuggestionStrategy, SchedulingResult>
```

Candidates are generated once and passed into all three `computeSchedule` calls.

**`computeSchedule` — week-by-week greedy:**

```typescript
import { eachWeekOfInterval, eachDayOfInterval, differenceInDays, format } from 'date-fns'

function computeSchedule(
  input: SchedulingInput,
  candidates: CandidateSlot[],
  strategy: SuggestionStrategy
): SchedulingResult {
  const semesterDays = differenceInDays(new Date(input.semesterEnd), new Date(input.semesterStart))
  const targetSpacing = (e: StudentEnrollment) => semesterDays / e.totalLessons

  const assigned: LessonSlot[] = []
  const remaining = Object.fromEntries(input.enrollments.map(e => [e.studentId, e.totalLessons]))
  const lastDate: Record<string, string> = {}   // studentId → most recently assigned date

  const weeks = eachWeekOfInterval(
    { start: new Date(input.semesterStart), end: new Date(input.semesterEnd) },
    { weekStartsOn: 1 }
  )

  for (const weekStart of weeks) {
    const datesThisWeek = eachDayOfInterval({
      start: weekStart,
      end: new Date(Math.min(
        new Date(input.semesterEnd).getTime(),
        weekStart.getTime() + 6 * 24 * 60 * 60 * 1000
      ))
    }).map(d => format(d, 'yyyy-MM-dd'))

    // students who need a lesson this week
    const due = input.enrollments.filter(e => {
      if (remaining[e.studentId] <= 0) return false
      const last = lastDate[e.studentId]
      if (!last) return true   // no lesson yet → always due on first opportunity
      return differenceInDays(new Date(weekStart), new Date(last)) >= targetSpacing(e) * 0.8
    })

    // most constrained first: fewest candidates this week per remaining lesson
    due.sort((a, b) => {
      const countA = candidates.filter(c => c.studentId === a.studentId && datesThisWeek.includes(c.date)).length
      const countB = candidates.filter(c => c.studentId === b.studentId && datesThisWeek.includes(c.date)).length
      return (countA / remaining[a.studentId]) - (countB / remaining[b.studentId])
    })

    for (const enrollment of due) {
      const weekCandidates = candidates
        .filter(c => c.studentId === enrollment.studentId && datesThisWeek.includes(c.date))
        .filter(c => !hasConflict(c, assigned, SCHEDULING_CONFIG.MIN_BREAK_MINUTES))
        .sort(bySortKey(strategy))

      if (weekCandidates.length > 0) {
        const pick = weekCandidates[0]
        assigned.push(pick)
        remaining[enrollment.studentId]--
        lastDate[enrollment.studentId] = pick.date
      }
      // no candidates this week → student carries to next week automatically
    }
  }

  // backfill: students with lessons remaining after all weeks
  for (const enrollment of input.enrollments) {
    while (remaining[enrollment.studentId] > 0) {
      const next = candidates
        .filter(c => c.studentId === enrollment.studentId)
        .filter(c => !hasConflict(c, assigned, SCHEDULING_CONFIG.MIN_BREAK_MINUTES))
        .sort(bySortKey(strategy))[0]
      if (!next) break
      assigned.push(next)
      remaining[enrollment.studentId]--
    }
    if (remaining[enrollment.studentId] > 0)
      result.unscheduledStudentIds.push(enrollment.studentId)
  }

  // gap penalty
  const totalScore = computeTotalScore(assigned)
  return { slots: assigned, unscheduledStudentIds, totalScore }
}

// Conflict: two lessons conflict if they overlap or their gap is less than minBreak.
function hasConflict(candidate: CandidateSlot, assigned: LessonSlot[], minBreak: number): boolean {
  const cs = parseMinutes(candidate.startTime), ce = parseMinutes(candidate.endTime)
  return assigned
    .filter(a => a.date === candidate.date)
    .some(a => {
      const as = parseMinutes(a.startTime), ae = parseMinutes(a.endTime)
      return !(ce + minBreak <= as || ae + minBreak <= cs)
    })
}

// Score key for sorting candidates by strategy.
function bySortKey(strategy: SuggestionStrategy) {
  return (a: CandidateSlot, b: CandidateSlot) => {
    const score = (c: CandidateSlot) =>
      strategy === 'teacher_best' ? c.teacherScore
      : strategy === 'student_best' ? c.combinedScore
      : SCHEDULING_CONFIG.TEACHER_WEIGHT * c.teacherScore + SCHEDULING_CONFIG.STUDENT_WEIGHT * c.studentScore
    return score(b) - score(a)   // descending
  }
}

// Gap penalty: for each date, subtract proportionally for gaps > threshold.
function computeTotalScore(slots: LessonSlot[]): number {
  const base = slots.reduce((sum, s) => sum + s.combinedScore, 0)
  const byDate = Map.groupBy(slots, s => s.date)   // or Object.groupBy in ES2024
  let penalty = 0
  for (const [, daySlots] of byDate) {
    const sorted = [...daySlots].sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))
    for (let i = 1; i < sorted.length; i++) {
      const gap = parseMinutes(sorted[i].startTime) - parseMinutes(sorted[i - 1].endTime)
      if (gap > SCHEDULING_CONFIG.GAP_PENALTY_THRESHOLD_MINUTES)
        penalty += (gap - SCHEDULING_CONFIG.GAP_PENALTY_THRESHOLD_MINUTES) * SCHEDULING_CONFIG.GAP_PENALTY_PER_MINUTE
    }
  }
  return base - penalty
}
```

**Strategy differences** (same algorithm, different sort key for "highest-scoring"):

| Strategy | Candidate sort key |
|---|---|
| `teacher_best` | `teacherScore` descending |
| `student_best` | `combinedScore` descending |
| `balanced` | `TEACHER_WEIGHT × teacherScore + STUDENT_WEIGHT × studentScore` descending |

All strategies enforce "include every student" as the primary objective — unscheduled students only appear when no feasible slot exists.

**Gap penalty:** after assignment, for each date that has ≥ 2 lessons, sort by start time and subtract from `totalScore` for every gap > `GAP_PENALTY_THRESHOLD_MINUTES` between consecutive lessons. Penalty is proportional: `(gapMinutes - GAP_PENALTY_THRESHOLD_MINUTES) × GAP_PENALTY_PER_MINUTE` where `GAP_PENALTY_PER_MINUTE = 0.05` (so a 30-minute excess gap costs 1.5 points — comparable to one slot's score). This lets the optimizer distinguish a barely-too-large gap from a multi-hour hole.

### No `applyWeekOverrides`

This function is no longer needed. Week overrides are consumed directly by `generateAllCandidates` — dates in an override week with no available blocks simply produce no candidates, so those dates are naturally skipped during assignment.

---

### Worked example

A small scenario that highlights the key benefit of semester-level scheduling: two bi-weekly students genuinely sharing the same recurring time slot on alternating weeks — impossible with a weekly recurring template.

**Setup:**
- Semester: Mon Jan 5 – Fri Jan 16 (2 weeks)
- Teacher: Mon 09:00–12:00, Preferred. No other days.
- Slot snap: 60 min (for readability). Lesson duration: 45 min. Min break: 10 min.
- 3 students: Ana (weekly, 2 lessons), Barbara (bi-weekly, 1 lesson, away week 2), Chris (bi-weekly, 1 lesson, away week 1)

**Input:**

```typescript
const input: SchedulingInput = {
  semesterStart: "2026-01-05",
  semesterEnd:   "2026-01-16",

  teacherWeeklyBlocks: [
    { dayOfWeek: 0, startTime: "09:00", endTime: "12:00", label: "preferred", score: 10 }
  ],
  teacherWeekOverrides: {},

  enrollments: [
    { studentId: "ana",     lessonDurationMinutes: 45, totalLessons: 2 },
    { studentId: "barbara", lessonDurationMinutes: 45, totalLessons: 1 },
    { studentId: "chris",   lessonDurationMinutes: 45, totalLessons: 1 }
  ],

  studentWeeklyBlocks: {
    ana:     [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00", label: "preferred", score: 10 }],
    barbara: [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00", label: "preferred", score: 10 }],
    chris:   [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00", label: "preferred", score: 10 }]
  },

  studentWeekOverrides: {
    barbara: { "2026-01-12": [] },  // fully unavailable week 2
    chris:   { "2026-01-05": [] }   // fully unavailable week 1
  }
}
```

**`generateAllCandidates` output** (12 slots — only Mondays produce candidates):

```
Jan 5  (Mon, Week 1): ana @ 09:00, 10:00, 11:00  — combinedScore 10 each
                      barbara @ 09:00, 10:00, 11:00 — combinedScore 10 each
                      chris: no candidates (week override blocks entire week)

Jan 12 (Mon, Week 2): ana @ 09:00, 10:00, 11:00  — combinedScore 10 each
                      chris @ 09:00, 10:00, 11:00 — combinedScore 10 each
                      barbara: no candidates (week override blocks entire week)
```

**`computeSchedule` trace (`teacher_best`):**

```
targetSpacingDays:
  ana:     12 days / 2 lessons = 6 days
  barbara: 12 days / 1 lesson  = 12 days
  chris:   12 days / 1 lesson  = 12 days

── Week 1 (Jan 5–9) ──────────────────────────────────────────────────────

Due: ana (first week), barbara (first week). Chris has no candidates → skip.

Sort by most constrained (fewest candidates per remaining lesson):
  ana:     3 candidates / 2 lessons = 1.5  ← most constrained
  barbara: 3 candidates / 1 lesson  = 3.0

1. Ana     → Jan 5 09:00 (score 10) → no conflicts → assigned ✓
2. Barbara → Jan 5 09:00 → conflict (Ana ends 09:45 + 10 min break → next 09:55, snap to 10:00)
           → Jan 5 10:00 (score 10) → no conflict → assigned ✓

── Week 2 (Jan 12–16) ────────────────────────────────────────────────────

Due: ana (7 days since Jan 5 ≥ target 6 days ✓), chris (first available week).
Barbara: 1/1 lessons assigned → done.

Sort by most constrained:
  ana:   3 candidates / 1 lesson = 3.0  (tie)
  chris: 3 candidates / 1 lesson = 3.0  (tie → alphabetical)

1. Ana   → Jan 12 09:00 (score 10) → no conflicts on this date → assigned ✓
2. Chris → Jan 12 09:00 → conflict (Ana ends 09:45 + 10 min → 10:00)
         → Jan 12 10:00 (score 10) → no conflict → assigned ✓
```

**Output:**

```typescript
{
  slots: [
    { studentId: "ana",     date: "2026-01-05", startTime: "09:00", endTime: "09:45",
      teacherScore: 10, studentScore: 10, combinedScore: 10 },
    { studentId: "barbara", date: "2026-01-05", startTime: "10:00", endTime: "10:45",
      teacherScore: 10, studentScore: 10, combinedScore: 10 },
    { studentId: "ana",     date: "2026-01-12", startTime: "09:00", endTime: "09:45",
      teacherScore: 10, studentScore: 10, combinedScore: 10 },
    { studentId: "chris",   date: "2026-01-12", startTime: "10:00", endTime: "10:45",
      teacherScore: 10, studentScore: 10, combinedScore: 10 }
  ],
  unscheduledStudentIds: [],
  totalScore: 40
}
```

**Key observation:** Barbara (week 1) and Chris (week 2) both teach in the Mon 09:00–10:00 window — on alternating weeks. With a weekly recurring template, that slot would be permanently occupied by whichever student claimed it first, leaving the other without a Mon morning lesson. The semester-level approach assigns specific dates, so the slot is genuinely shared.

---

## Open Questions / Deferred Decisions

- **Algorithm sophistication**: greedy works for small cohorts but may produce suboptimal results as student count grows. A constraint solver (e.g., or-tools) could be introduced in a later phase without changing the data model.
- **"Balanced" strategy weights**: currently an equal blend; worth exposing as a teacher-adjustable slider in Phase 2.
- **Notification delivery timing**: reminder cadence (e.g., 48h before deadline, 24h before deadline) is a detail for the Cloud Function implementation phase.
- **Student-to-teacher linking across locations**: currently handled by existing `/students` and `/teachers` RTDB paths; scheduling feature adds enrollment per semester without changing that mapping.

---

## Phase 1 — Implementation Plan

### Build strategy

All phases follow the same incremental pattern:

1. **UI first with mock data** — build every page and component against static data in `src/data/schedulingMocks.ts`. Each step produces something visually reviewable and discussable before moving on.
2. **RTDB wiring last** — once all UI is signed off, replace mock data with real Firebase hooks. This keeps each step fast and avoids debugging data and UI simultaneously.
3. **One step at a time** — each step below is a natural review checkpoint. Implement it, run the app, review in the browser, discuss any design changes, then move to the next step.

`src/data/schedulingMocks.ts` is a temporary file deleted entirely once the RTDB wiring phase is complete. Pages and components receive data via props during the mock phase; those props are populated from hooks in the wiring phase — the component signatures do not change.

---

### Phase 1 incremental steps

#### ~~Step A — Foundation (no visible UI)~~ ✅ DONE

- `src/util/scheduling.ts` — all types, `SCHEDULING_CONFIG`, `schedulingPaths`, `computeCombinedScore`
- `src/data/schedulingMocks.ts` — rich mock data covering: 2 locations, 2 semesters (one per location), 3 enrolled students per semester, teacher weekly availability, 3 student submissions, 3 lesson instances per student, 1 active scheduling round with mock suggestions
- All new routes in `src/App.tsx` (placeholder stubs) and `RouteInfo.tsx`
- **Scheduling** link (teacher) and **My Schedule** link (student) added to `UserPopover`
- Unit tests for `computeCombinedScore` (8 tests, all passing) in `src/util/scheduling.test.ts`
- `date-fns` installed

---

#### ~~Step B — SchedulingPage (teacher hub)~~ ✅ DONE

- `src/pages/scheduling/SchedulingPage.tsx` — location cards with semesters, status chips, "Open" navigates to stub SemesterPage
- `src/Components/scheduling/LocationDialog.tsx` — create/edit location (name required, address optional)
- `src/Components/scheduling/SemesterDialog.tsx` — create/edit semester (name, start/end dates, cancellation window hours)
- `src/App.tsx` updated to use `SchedulingPage` instead of placeholder div

---

#### ~~Step C — AvailabilityCalendar component~~ ✅ DONE

- `src/Components/scheduling/AvailabilityCalendar.tsx` — `react-big-calendar` week view + DnD addon; editable mode with compact menu-card label popover on slot select/click; `overlayBlocks` rendering for read-only teacher layer
- Uses `dayjsLocalizer` (not `dateFnsLocalizer` — date-fns v4 is ESM-only and incompatible with CRA)
- MUI X Scheduler–inspired styling: rounded container, light-tinted events with 3 px left accent bar, theme-aware borders, custom day-column headers
- Popover positioning: drag → `bounds.top/left - window.scrollY/scrollX` (page→viewport coords); click → `box.clientY/X`; both clamped to container top
- Test route `/scheduling/availability-test` still present — remove before shipping

---

#### Step D — SemesterPage: Availability tab

- `src/pages/scheduling/SemesterPage.tsx` — tab shell (Availability / Students / Scheduling / Calendar)
- Availability tab renders `AvailabilityCalendar` with mock teacher availability; week-override section below with a date picker + per-week calendar instance
- Auto-save on change (debounced, no RTDB yet — just local state)

*Review: navigate from SchedulingPage into a semester; draw and adjust availability blocks; add a week override.*

---

#### Step E — SemesterPage: Students tab

- Students tab renders the enrolled students table (mock data: name, duration, lessons/week, cancellation window)
- `EnrollmentDialog` — add student form (dropdown from mock student list, duration, frequency, optional cancellation window override)
- Remove / soft-delete row action

*Review: see enrolled students, open the Add dialog, remove a student from the list.*

---

#### Step F — LessonCalendar component + SemesterPage: Calendar tab

- `src/Components/scheduling/LessonCalendar.tsx` — `react-big-calendar` month view (toggle to week/agenda); read-only events from mock lesson instances; click event → details popover with Cancel button (wired to `CancelLessonDialog` but no RTDB write yet)
- `CancelLessonDialog` — reason field, "cancel all going forward" checkbox, policy message (within/outside window)
- Calendar tab in `SemesterPage` renders `LessonCalendar` + Export .ics button (no-op for now)

*Review: browse the semester calendar, click a lesson to see details, open the cancel dialog.*

---

#### Step G — SemesterPage: Scheduling tab + SchedulingRoundPage (collecting state)

- Scheduling tab: list of rounds (mock: one round in `collecting` status), "New Round" button opens a deadline-picker dialog
- `src/pages/scheduling/SchedulingRoundPage.tsx` — collecting state: table showing each student's submission status (submitted / pending), deadline countdown, "Close Round & Generate Suggestions" button (disabled until deadline passed or all submitted — mock the condition)

*Review: see the round in the scheduling tab, click through to the round page, see submission statuses.*

---

#### Step H — SchedulingRoundPage: suggested state

- `SuggestedScheduleCard` component — strategy label, total score, student → slot list, unscheduled students (if any)
- `SchedulingRoundPage` suggested state: 3 cards side by side (or stacked on mobile); "Use This" button on each

*Review: see all three strategy suggestions, compare scores and student placements.*

---

#### Step I — SchedulingRoundPage: editable confirmed view (DnD)

- After "Use This": load the selected suggestion slots into a `react-big-calendar` week view with DnD enabled; one event per student (colored by combined score)
- On drop/resize: validate no overlap + min-break; show inline error if violated, snap back if invalid
- "Confirm Schedule" button (no RTDB write yet — just advances mock state and shows a success banner)

*Review: drag student slots around, see conflict detection, confirm the schedule.*

---

#### Step J — StudentSchedulePage

- `src/pages/scheduling/StudentSchedulePage.tsx` — two sections:
  1. Pending availability requests (mock: one open round with deadline); "Submit Availability" navigates to `StudentAvailabilityPage`
  2. Upcoming lessons: `LessonCalendar` in student mode (no student names, cancel button visible)

*Review: student sees their pending request and their lesson calendar.*

---

#### Step K — StudentAvailabilityPage

- `src/pages/scheduling/StudentAvailabilityPage.tsx` — full submission UI: `AvailabilityCalendar` in overlay mode (teacher blocks as background), student draws their own blocks, week-override section, validation banner (preference count, Preferred minimum), Submit button

*Review: student sees teacher's availability, draws their own, sees the warning when hovering over Last Resort slots, can submit.*

---

**[UI complete — all pages and components reviewed and approved]**

---

#### Step L — Algorithm

- `src/util/schedulingAlgorithm.ts` — `getEffectiveBlocksForDate`, `getScoreAtTime`, `generateAllCandidates`, `computeSchedule` (all 3 strategies), `generateAllSuggestions`
- Unit tests: happy path, conflict resolution, bi-weekly slot sharing, unschedulable student, week override (spring break), gap penalty
- No UI changes — runs client-side in `SchedulingRoundPage` when teacher triggers suggestion generation

---

#### Step M — RTDB hooks

- `src/util/schedulingHooks.ts` — all `onValue` hooks listed in Step 4 of the detailed plan
- Unit tests following the existing pattern (mock `onValue`, inject snapshots)

---

#### Step N — Wire teacher pages to RTDB

- `SchedulingPage`: `useLocations` + `useSemesters`; dialogs write to RTDB
- `SemesterPage` Availability tab: `useTeacherAvailability`; auto-save writes to RTDB
- `SemesterPage` Students tab: `useStudentEnrollments`; `EnrollmentDialog` writes to RTDB
- `SemesterPage` Scheduling tab: `useSchedulingRounds`; New Round writes to RTDB + sends availability request notifications
- `SemesterPage` Calendar tab: `useLessonInstances`

---

#### Step O — Wire SchedulingRoundPage to RTDB + integrate algorithm

- `useStudentSubmissions` for collecting state
- "Generate Suggestions" button: runs `generateAllSuggestions` client-side, writes results to `scheduleSuggestions` path, updates round status to `suggested`
- `useScheduleSuggestions` for suggested state
- "Confirm Schedule" button: writes `confirmedSchedule`, converts `LessonSlot[]` directly to `LessonInstance` records (batch `update`), updates round status to `finalized`, sends confirmation notifications

---

#### Step P — Wire student pages to RTDB

- `StudentSchedulePage`: queries open rounds across the student's teachers; `useMyLessonInstances` per semester
- `StudentAvailabilityPage`: `useTeacherAvailability` for overlay; `useMySubmission` to pre-populate; writes submission on submit + sends notification to teacher

---

#### Step Q — Cancellation flow

- Student cancel: write `Cancellation` record + update `LessonInstance` status; send notification to teacher
- Teacher cancel: same, reversed; optionally create makeup `LessonInstance`
- Bundle flow: "cancel all going forward" creates `CancellationBundle` + N `Cancellation` records, sends one bundled notification
- Acknowledgment: write `acknowledgmentStatus: "acknowledged"` on the other party's action

---

#### Step R — ICS export

- `src/util/icsExport.ts` — wire the Export button in `LessonCalendar` to generate and download the `.ics` file

---

#### Step S — Firebase security rules

- Update `database.rules.json` with all new scheduling paths per the access table in the Schema section

---

### Codebase conventions to follow

Patterns established in this repo that new scheduling code must follow:

- **Auth guard:** every protected page reads `user.loading` → wait; `!user.uid` → redirect to `/login`; wrong role → redirect to `/`. No HOC or wrapper — inline `useEffect` per page (see `StudentsPage`, `TeacherResourcesPage`).
- **RTDB subscriptions:** `onValue(ref(database, path), cb)` with the unsubscribe stored in `useRef<Unsubscribe>` and called in cleanup.
- **Locale:** `localeManager.registerComponentStrings(ComponentName, TEXTS)` inside `useMemo(() => ..., [])` at the top of each component.
- **Routing:** add the `<Route>` in `src/App.tsx` and a `RouteInfo` entry (with `hiddenFromAppBar: true`) in `src/data/RouteInfo.tsx`.
- **No Redux / Zustand** — React context only.
- **Prettier config:** no trailing commas, `jsxBracketSameLine: true`, `singleQuote: true`, `semi: false`. Run `npx prettier --write <changed file>` after editing.

### Phase 1 simplification: cancellation write path

The full design uses a separate `/cancellationRequests/...` path processed by a Cloud Function so that field-level validation is enforced server-side. For Phase 1, Cloud Functions are not yet wired for this. Instead:
- Students write cancellation records directly (simplified RTDB rules accept writes from the involved student)
- The teacher writes cancellation records for teacher-initiated cancellations
- Cloud Function integration (and proper request path) is deferred to Phase 2

This does not affect the data model — the same `Cancellation` type and RTDB paths are used; only the write authorization is relaxed temporarily.

### Email notifications: `sendEmail` Cloud Function

The `sendEmail` Cloud Function at `europe-west1-music-with-susanna.cloudfunctions.net/sendEmail` is already fully operational — this is **not** a stub or deferred work. It sends real Gmail emails and supports iCalendar invite/cancellation attachments via the optional `calendarEvent` field in the request body.

**Notification utility** (`src/util/notifications.ts`) calls this endpoint with the caller's Firebase ID token:

```typescript
const token = await auth.currentUser!.getIdToken()
await fetch('https://europe-west1-music-with-susanna.cloudfunctions.net/sendEmail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ to, subject, html, calendarEvent? })
})
```

**When to include `calendarEvent`:**

| Event | calendarEvent.method | Notes |
|---|---|---|
| Schedule confirmed (summary email) | omit | One email with a text summary; no per-lesson calendar invite |
| Lesson reminder (24h before) | `"request"` | Single-lesson invite; `sequence` from `lessonInstance.calendarSequence` |
| Lesson canceled by teacher | `"cancel"` | Must pass same `uid` (lessonId) and incremented `sequence` |
| Lesson canceled by student | `"cancel"` | Same as above, sent to teacher |
| Makeup lesson proposed | `"request"` | New lessonId as `uid`, sequence starts at 0 |

`calendarEvent.uid` should be the `lessonId` (the RTDB push key) — stable and unique per lesson. `calendarSequence` on `LessonInstance` tracks how many times a calendar message has been sent for that lesson; increment it in RTDB before calling `sendEmail`.

**Authorization:** `sendEmail` verifies the Bearer token and checks the `to` email is a known related user (via `/teachers/{tid}/students` or `/students/{uid}/teachers` mappings). This works naturally for teacher↔student notifications.

### New packages

```bash
npm install react-big-calendar @types/react-big-calendar   # calendar UI (availability + lessons)
npm install ics                                             # client-side .ics download
```

`react-big-calendar`'s drag-and-drop addon ships with the package (`react-big-calendar/lib/addons/dragAndDrop`) — no extra install needed. It requires a peer dep on either `moment` or `date-fns` as the localizer; use `date-fns` (check `package.json` first — if not present, add it).

---

### Step 1 — Types, RTDB paths, and config

**New file:** `src/util/scheduling.ts`

All scheduling domain types, the single config object, RTDB path helpers, and score computation utilities. Everything else imports from here.

```
AvailabilityLabel enum        (PREFERRED | AVAILABLE | LAST_RESORT | UNAVAILABLE)
LABEL_SCORES                  Record<AvailabilityLabel, number>
SCHEDULING_CONFIG             { SLOT_SNAP_MINUTES, MIN_BREAK_MINUTES, GAP_PENALTY_THRESHOLD_MINUTES,
                                TEACHER_WEIGHT, STUDENT_WEIGHT, MIN_STUDENT_PREFERENCES,
                                MIN_PREFERRED_PREFERENCES }

AvailabilityBlock interface   { dayOfWeek, startTime, endTime, label, score }
WeeklyAvailability interface  { weeklyTemplate: { blocks }, weekOverrides: Record<weekStartDate, { blocks }> }
Location interface
Semester interface + SemesterStatus type
StudentEnrollment interface
SchedulingRound interface + RoundStatus type
StudentSubmission interface
ScheduleSuggestion interface + SuggestionStrategy type
SuggestedSlot interface
ConfirmedSchedule interface
LessonInstance interface + LessonStatus type
Cancellation interface
CancellationBundle interface
SchedulingNotification interface + NotificationType enum

schedulingPaths object        — one function per RTDB path, e.g.:
  locations(tid)              → "locations/teachers/{tid}"
  semester(tid, sid)          → "semesters/teachers/{tid}/{sid}"
  teacherAvailability(tid, sid)
  studentEnrollments(tid, sid)
  studentEnrollment(tid, sid, uid)
  schedulingRounds(tid, sid)
  schedulingRound(tid, sid, rid)
  studentSubmissions(tid, sid, rid)
  studentSubmission(tid, sid, rid, uid)
  scheduleSuggestions(tid, sid, rid)
  scheduleSuggestion(tid, sid, rid, strategy)
  confirmedSchedule(tid, sid)
  lessonInstances(tid, sid)
  lessonInstance(tid, sid, lid)
  cancellations(tid, sid)
  cancellation(tid, sid, cid)
  cancellationBundles(tid, sid)
  cancellationBundle(tid, sid, bid)
  notifications(tid)

computeCombinedScore(teacherScore, studentScore) → number
```

**Tests:** `src/util/scheduling.test.ts` — unit tests for `computeCombinedScore` (hard block cases, weight formula).

---

### Step 2 — Scheduling algorithm

**New file:** `src/util/schedulingAlgorithm.ts`

Pure functions only — no RTDB, no React. Full type definitions and algorithm description in the Algorithm Notes section above. Summary of exports:

```
getEffectiveBlocksForDate(weeklyBlocks, weekOverrides, date)  → AvailabilityBlock[]
getScoreAtTime(blocks, startTime)                             → number
generateAllCandidates(input)                                  → CandidateSlot[]
computeSchedule(input, candidates, strategy)                  → SchedulingResult
generateAllSuggestions(input)                                 → Record<SuggestionStrategy, SchedulingResult>
```

No `applyWeekOverrides` — week overrides are consumed inside `generateAllCandidates`.

**Tests:** `src/util/schedulingAlgorithm.test.ts` — at minimum:
- Single student, happy path — correct date and time assigned
- Two students wanting the same slot — conflict resolved, both get a slot
- Bi-weekly student shares a time slot with a weekly student on alternating dates
- Student with no feasible slot — appears in `unscheduledStudentIds`
- Week override (spring break) — no lessons generated for that week
- Gap penalty applied when two lessons are far apart on the same day

---

### Step 3 — Notification utility

**New file:** `src/util/notifications.ts`

Follows the same pattern as `src/util/youtube.ts` (`fetchYouTubeVideo`): a plain `fetch` POST to the Cloud Function endpoint, with `accessToken: string` passed in by the caller (from `user.accessToken`) as `Authorization: Bearer <token>`.

```typescript
export interface CalendarEventPayload {
  uid: string           // lessonId — stable across updates
  title: string
  start: string         // ISO datetime
  end: string
  location?: string
  description?: string
  method?: 'request' | 'cancel'
  sequence?: number     // calendarSequence from LessonInstance
}

export interface SendNotificationParams {
  recipientEmail: string
  subject: string
  html: string
  calendarEvent?: CalendarEventPayload
  accessToken: string
}

export async function sendNotification(params: SendNotificationParams): Promise<void>
```

Include `calendarEvent` for lesson-related emails that should deliver a calendar invite or cancellation to the recipient's calendar app.

Also export per-event helper functions that compose the correct subject, HTML body, and `calendarEvent` payload for each notification type (e.g., `notifyScheduleConfirmed`, `notifyLessonCanceled`, `notifyAvailabilityRequested`, `notifyLessonReminder`). Callers invoke the helper, not `sendNotification` directly.

---

### Step 4 — RTDB hooks

**New file:** `src/util/schedulingHooks.ts`

One hook per RTDB subscription, following the `onValue` + `useRef<Unsubscribe>` + cleanup pattern used throughout the codebase.

```
useLocations(teacherId)                           → { locations: Location[], loading }
useSemester(teacherId, semesterId)                → { semester: Semester | null, loading }
useSemesters(teacherId)                           → { semesters: Semester[], loading }
useTeacherAvailability(teacherId, semesterId)     → { availability: WeeklyAvailability | null, loading }
useStudentEnrollments(teacherId, semesterId)      → { enrollments: StudentEnrollment[], loading }
useSchedulingRounds(teacherId, semesterId)        → { rounds: SchedulingRound[], loading }
useStudentSubmissions(teacherId, semesterId, rid) → { submissions: Record<uid, StudentSubmission>, loading }
useMySubmission(teacherId, semesterId, rid, uid)  → { submission: StudentSubmission | null, loading }
useScheduleSuggestions(teacherId, semesterId, rid)→ { suggestions: Record<strategy, ScheduleSuggestion>, loading }
useConfirmedSchedule(teacherId, semesterId)       → { schedule: ConfirmedSchedule | null, loading }
useLessonInstances(teacherId, semesterId)         → { lessons: LessonInstance[], loading }
useMyLessonInstances(teacherId, semesterId, uid)  → { lessons: LessonInstance[], loading }  // filters client-side
useCancellations(teacherId, semesterId)           → { cancellations: Cancellation[], loading }
useMyNotifications(teacherId, uid)                → { notifications: SchedulingNotification[], loading }
```

---

### Step 5 — AvailabilityCalendar component

**New file:** `src/Components/scheduling/AvailabilityCalendar.tsx`

Wraps `react-big-calendar` in its weekly `"week"` view with the drag-and-drop addon enabled. Availability blocks map directly to calendar events; the library handles all time-grid rendering and interaction.

**Library setup:**
- Localizer: `dateFnsLocalizer` from `react-big-calendar/lib/localizers/date-fns`
- Addon: `withDragAndDrop` from `react-big-calendar/lib/addons/dragAndDrop` — wraps the `Calendar` component to enable drag-to-create, drag-to-move, and resize
- Import both CSS files: `react-big-calendar/lib/css/react-big-calendar.css` and `react-big-calendar/lib/addons/dragAndDrop/styles.css`

**Interaction (editable mode):**
- `selectable` prop + `onSelectSlot` callback → drag on empty space creates a new block; open a small MUI `Popover` to choose label (Preferred / Available / Last Resort), then add to state
- `onEventDrop` + `onEventResize` callbacks → update block start/end in state
- Click existing event → show label popover to change label or delete

**Overlay mode (student view):**
- Teacher's blocks passed as a separate event list, rendered with `eventPropGetter` as semi-transparent background events in a distinct style
- Student cannot drag teacher events (they are in a non-selectable resource layer or flagged `isTeacher: true` and excluded from DnD callbacks)
- When student creates a slot that overlaps a teacher Last Resort or Unavailable block → show an inline warning via a custom event wrapper component

**Props:**
```typescript
interface AvailabilityCalendarProps {
  blocks: AvailabilityBlock[]
  onChange?: (blocks: AvailabilityBlock[]) => void  // undefined → read-only
  overlayBlocks?: AvailabilityBlock[]               // teacher's blocks (student view)
  displayStartHour?: number                         // default 8
  displayEndHour?: number                           // default 20
}
```

**Colors per label** (MUI palette tokens via `eventPropGetter`, not hardcoded hex):
- Preferred → `success.main`
- Available → `primary.main`
- Last Resort → `warning.main`
- Unavailable → `error.main` (overlay only; students can't create Unavailable blocks)

---

### Step 6 — LessonCalendar component

**New file:** `src/Components/scheduling/LessonCalendar.tsx`

Also uses `react-big-calendar` (same localizer and import, no DnD addon needed). Reuses the library already in the bundle — no additional cost.

**View:** defaults to `"month"` (gives semester-level overview); toggle to `"week"` for detail. The `"agenda"` view is available as a compact list fallback.

**Events:** each `LessonInstance` maps to one calendar event, colored by status (`scheduled` → primary, `canceled` → error, `completed` → success). Teacher view shows the student's name in the event title; student view shows "Lesson" or the teacher's name.

**Interaction:** read-only (`selectable={false}`, no DnD). Clicking an event opens a details popover with: time, location, status, and — where permitted — a Cancel button that triggers `onCancel`.

**Props:**
```typescript
interface LessonCalendarProps {
  lessons: LessonInstance[]
  students?: Record<string, { name: string }>  // teacher view: show student names
  onCancel?: (lessonId: string) => void         // undefined → no cancel affordance
  onExportIcs?: () => void                      // show export button when provided
}
```

---

### Step 7 — Supporting forms and dialogs

Small, focused components. Each is a MUI `Dialog` or inline form section.

**`src/Components/scheduling/LocationDialog.tsx`**
Fields: name (required), address (optional). Used in `SchedulingPage`.

**`src/Components/scheduling/SemesterDialog.tsx`**
Fields: name, start date, end date, default cancellation window (hours). Used in `SchedulingPage`.

**`src/Components/scheduling/EnrollmentDialog.tsx`**
Dropdown: pick from teacher's existing students (fetched from `/teachers/{tid}/students`). Fields: lesson duration (minutes), lessons per week, custom cancellation window (optional). Used in `SemesterPage`.

**`src/Components/scheduling/CancelLessonDialog.tsx`**
Fields: reason (optional text), "cancel all going forward" checkbox. Shows the policy message inline (within window / outside window) based on computed `withinWindow`. Used in both teacher and student lesson views.

---

### Step 8 — Teacher pages

#### `src/pages/scheduling/SchedulingPage.tsx`
Route: `/scheduling`

Teacher-only (redirect non-teachers to `/`).

**Layout:**
- Header: "Scheduling" + "Add Location" button
- List of locations. Each location is an expandable card showing its semesters.
- Per semester: name, date range, status chip, "Open" button → navigates to `SemesterPage`.
- "Add Semester" button within each location card.

**RTDB reads:** `useLocations(tid)`, `useSemesters(tid)`.
**RTDB writes:** `push` to `schedulingPaths.locations(tid)` (create location); `push` to `schedulingPaths.semesters(tid)` (create semester).

---

#### `src/pages/scheduling/SemesterPage.tsx`
Route: `/scheduling/semesters/:semesterId`

Teacher-only.

**Layout:** MUI `Tabs` — four tabs:

1. **Availability** — renders `AvailabilityCalendar` (editable) with the teacher's weekly template. "Add week override" button opens a date-picker + another `AvailabilityCalendar` instance for that week. Auto-saves on change (debounced 1s, similar to homework draft auto-save pattern — `setTimeout` ref cleared on each change).

2. **Students** — table of enrolled students: name, duration, lessons/week, cancellation window. "Add Student" button opens `EnrollmentDialog`. "Remove" soft-deletes the enrollment.

3. **Scheduling** — shows the list of `SchedulingRound`s with status. "New Round" button (only if no round in `collecting` status): opens a dialog to set the deadline, then creates the round and updates all enrolled students' submission status to `pending`. If a round is `finalized`, shows a "Start New Round" button.

4. **Calendar** — renders `LessonCalendar` with all `LessonInstance`s for this semester. Shows "Export .ics" button.

---

#### `src/pages/scheduling/SchedulingRoundPage.tsx`
Route: `/scheduling/semesters/:semesterId/rounds/:roundId`

Teacher-only.

**States (driven by round status):**

- **`collecting`**: show submission status per student (submitted / pending), deadline countdown, "Close Round & Generate Suggestions" button (active once deadline passed or all submitted).
- **`suggested`**: show 3 side-by-side `SuggestedScheduleCard` components. Teacher clicks "Use This" on one → loads it into an editable `AvailabilityCalendar`-style weekly view (DnD addon enabled, one event per enrolled student showing their assigned recurring slot). Teacher drags events to move them; the system validates no overlap + min-break constraint on each drop. "Confirm Schedule" button → writes `confirmedSchedule`, generates all `LessonInstance` records, sends notifications, advances round to `finalized`.
- **`finalized`**: read-only view of the confirmed schedule; link back to semester calendar tab.

**`src/Components/scheduling/SuggestedScheduleCard.tsx`** — displays one strategy's result: strategy label, total score, list of student → assigned slot, list of unscheduled students. "Use This" button.

**Algorithm trigger:** when teacher clicks "Generate Suggestions", the client runs `generateAllSuggestions(input)` (Step 2), writes the 3 results to `schedulingPaths.scheduleSuggestions(tid, sid, rid)`, and updates round status to `suggested`. No Cloud Function needed.

**Lesson instance generation:** on confirm, iterate the semester date range week by week, apply week overrides per student, create one `LessonInstance` record per occurrence with a `push` per record (or a single `update` with the full batch — prefer `update` to reduce round-trips).

---

### Step 9 — Student pages

#### `src/pages/scheduling/StudentSchedulePage.tsx`
Route: `/schedule`

Student-only (redirect non-students to `/`).

**Layout:**
- **Pending submissions section**: list of open rounds across all the student's teachers. Each item shows: teacher name, semester name, deadline, "Submit Availability" button → navigates to `StudentAvailabilityPage`.
- **Upcoming lessons section**: renders `LessonCalendar` for confirmed lessons across all semesters. Cancel button on each lesson opens `CancelLessonDialog`.

**RTDB reads:** For each teacher the student is linked to (from existing `/students/{uid}/teachers`), query `useSemesters(tid)` and `useSchedulingRounds(tid, sid)` to find active rounds; `useMyLessonInstances(tid, sid, uid)` per semester.

---

#### `src/pages/scheduling/StudentAvailabilityPage.tsx`
Route: `/schedule/rounds/:teacherId/:semesterId/:roundId`

Student-only.

**Layout:**
1. Read-only display of round deadline and brief instructions.
2. `AvailabilityCalendar` with `overlayBlocks` = teacher's weekly template, `blocks` = student's in-progress submission, `onChange` = update local state.
3. "Add week override" section: date-picker + per-week `AvailabilityCalendar`.
4. Validation banner: shows current count of preferences and whether the minimum is met.
5. "Submit" button (disabled until valid): writes submission to RTDB, sends notification to teacher, marks student submission status as `submitted`.

**RTDB reads:** `useTeacherAvailability(tid, sid)`, `useMySubmission(tid, sid, rid, uid)`, `useSchedulingRounds(tid, sid)`.
**RTDB writes:** `set` to `schedulingPaths.studentSubmission(tid, sid, rid, uid)`.

---

### Step 10 — ICS download utility

**New file:** `src/util/icsExport.ts`

Client-side `.ics` file generation for the in-app calendar download button. Separate from email calendar invites, which are handled by `sendEmail` server-side.

```typescript
import { createEvents } from 'ics'

export function exportSemesterIcs(
  lessons: LessonInstance[],
  studentNames: Record<string, string>,  // uid → display name; omit in student view
  semesterName: string
): void {
  // map LessonInstance[] → ics EventAttributes[]
  // use lessonId as uid so events match any previously emailed invites
  // call createEvents(), trigger browser download via Blob + <a> click
}
```

Called from `LessonCalendar`'s `onExportIcs` prop handler. Uses `lessonId` as the event `uid` so the downloaded `.ics` entries are recognized by calendar apps as the same events already delivered via email invite.

---

### Step 11 — Routing

**`src/App.tsx`** — add imports and routes:

```tsx
import SchedulingPage from './pages/scheduling/SchedulingPage'
import SemesterPage from './pages/scheduling/SemesterPage'
import SchedulingRoundPage from './pages/scheduling/SchedulingRoundPage'
import StudentSchedulePage from './pages/scheduling/StudentSchedulePage'
import StudentAvailabilityPage from './pages/scheduling/StudentAvailabilityPage'

// inside <Routes>:
<Route path="/scheduling" element={<SchedulingPage />} />
<Route path="/scheduling/semesters/:semesterId" element={<SemesterPage />} />
<Route path="/scheduling/semesters/:semesterId/rounds/:roundId" element={<SchedulingRoundPage />} />
<Route path="/schedule" element={<StudentSchedulePage />} />
<Route path="/schedule/rounds/:teacherId/:semesterId/:roundId" element={<StudentAvailabilityPage />} />
```

**`src/data/RouteInfo.tsx`** — add two entries (both `hiddenFromAppBar: true`; nav links are injected via `UserPopover` or a dedicated scheduling nav item):

```typescript
{ key: 'scheduling', path: '/scheduling', hiddenFromAppBar: true, ... }  // teacher entry point
{ key: 'schedule',   path: '/schedule',   hiddenFromAppBar: true, ... }  // student entry point
```

Surface the entry points in `UserPopover` (the existing nav menu component) alongside the existing teacher/student role-conditional links.

---

### Step 12 — Firebase security rules

**File:** `database.rules.json` (or wherever the current rules live — check root of repo).

Add rules for all new scheduling paths following the access table in the Schema section. Key patterns:

```json
"locations": {
  "teachers": {
    "$teacherId": {
      ".read": "auth.uid === $teacherId || root.child('teachers').child($teacherId).child('students').child(auth.uid).exists()",
      ".write": "auth.uid === $teacherId"
    }
  }
},
"studentEnrollments": {
  "teachers": {
    "$teacherId": {
      "semesters": {
        "$semesterId": {
          "students": {
            "$studentId": {
              ".read": "auth.uid === $teacherId || auth.uid === $studentId",
              ".write": "auth.uid === $teacherId"
            }
          }
        }
      }
    }
  }
},
"studentSubmissions": {
  "teachers": {
    "$teacherId": {
      "semesters": {
        "$semesterId": {
          "rounds": {
            "$roundId": {
              "students": {
                "$studentId": {
                  ".read": "auth.uid === $teacherId || auth.uid === $studentId",
                  ".write": "auth.uid === $studentId"
                  // Phase 1: student writes directly (no round-status guard in rules;
                  // UI enforces the deadline — tighten with Cloud Function in Phase 2)
                }
              }
            }
          }
        }
      }
    }
  }
}
// ... remaining paths follow the same pattern
```

---

### Implementation order and dependencies

```
Step 1  (scheduling.ts types)
  ↓
Step 2  (algorithm)        Step 3  (notification stub)
  ↓                              ↓
Step 4  (RTDB hooks) ←──────────┘
  ↓
Step 5  (AvailabilityCalendar)     Step 6  (LessonCalendar)
  ↓                                        ↓
Step 7  (forms/dialogs) ←──────────────────┘
  ↓
Step 8  (teacher pages)    Step 9  (student pages)    Step 10  (ics export)
  ↓                              ↓                         ↓
Step 11 (routing) ←──────────────┴─────────────────────────┘
  ↓
Step 12 (security rules)
```

Steps 2 and 3 can be done in parallel with each other. Steps 5 and 6 can be done in parallel. Steps 8, 9, and 10 can be done in parallel once their dependencies are in place.
