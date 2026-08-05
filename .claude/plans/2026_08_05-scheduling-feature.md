# Scheduling Feature

> Status: Design complete — not yet implemented

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

## RTDB Schema Extensions

```
/locations/{locationId}
  teacherId: string
  name: string
  address: string (optional)
  createdAt: timestamp

/semesters/{semesterId}
  teacherId: string
  locationId: string
  name: string
  startDate: string (YYYY-MM-DD)
  endDate: string (YYYY-MM-DD)
  status: "draft" | "scheduling" | "active" | "completed"
  defaultCancellationWindowHours: number
  timezone: string (e.g. "Europe/Bucharest")
  createdAt: timestamp

/teacherAvailability/{semesterId}
  weeklyTemplate
    blocks: [ { dayOfWeek, startTime, endTime, label, score } ]
  weekOverrides
    {weekStartDate}: { blocks: [...] }

/studentEnrollments/{semesterId}/{studentId}
  lessonDurationMinutes: number
  lessonsPerWeek: number
  cancellationWindowHours: number (optional — falls back to semester default)

/schedulingRounds/{roundId}
  semesterId: string
  roundNumber: number
  status: "collecting" | "ready" | "suggested" | "finalized"
  deadline: timestamp
  createdAt: timestamp
  createdBy: teacherId

/studentSubmissions/{roundId}/{studentId}
  status: "pending" | "submitted"
  submittedAt: timestamp (optional)
  recurringPreferences: [ { dayOfWeek, startTime, endTime, label, score } ]
  weekOverrides: { {weekStartDate}: { blocks: [...] } }

/scheduleSuggestions/{roundId}/{strategy}   // strategy: teacher_best | student_best | balanced
  slots: [ { studentId, dayOfWeek, startTime, endTime, teacherScore, studentScore, combinedScore } ]
  unscheduledStudents: [ studentId ]
  totalScore: number

/confirmedSchedules/{semesterId}
  roundId: string
  strategy: string
  confirmedAt: timestamp
  confirmedBy: teacherId
  editedFromSuggestion: boolean

/lessonInstances/{semesterId}/{lessonId}
  studentId: string
  teacherId: string
  locationId: string
  scheduledStart: timestamp (with tz)
  scheduledEnd: timestamp (with tz)
  timezone: string
  status: "scheduled" | "canceled" | "completed" | "rescheduled"
  isAdHoc: boolean
  isMakeup: boolean
  parentLessonId: string (optional)
  createdAt: timestamp

/cancellations/{cancellationId}
  lessonId: string
  semesterId: string
  canceledBy: uid
  canceledAt: timestamp
  withinWindow: boolean
  charged: boolean           // always false in Phase 1 (billing external)
  makeupOffered: boolean
  makeupLessonId: string (optional)
  acknowledgmentStatus: "pending" | "acknowledged"
  acknowledgmentAt: timestamp (optional)
  bundleId: string (optional — groups "cancel all forward" cancellations)

/cancellationBundles/{bundleId}
  semesterId: string
  canceledBy: uid
  lessonCount: number
  fromDate: string
  acknowledgmentStatus: "pending" | "acknowledged"
  acknowledgmentAt: timestamp (optional)

/notifications/{notificationId}
  type: string
  recipientId: uid
  semesterId: string
  lessonId: string (optional)
  cancellationId: string (optional)
  roundId: string (optional)
  channel: "email" | "in_app"
  status: "pending" | "sent" | "failed"
  createdAt: timestamp
  sentAt: timestamp (optional)
```

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

The scheduling problem for Phase 1 is small enough (typically < 15 students, each needing 1–3 weekly slots) that a greedy or backtracking approach is feasible.

### Input
- Teacher's continuous availability windows per day, with scores
- Each student's recurring preference blocks with scores
- Lesson durations and lessons-per-week counts

### Slot generation
For each (student, dayOfWeek) pair:
1. Find overlap between teacher's available windows and student's available windows (exclude combined_score = 0)
2. Enumerate all valid start times at `SLOT_SNAP_MINUTES` granularity where the lesson fits
3. Compute combined_score for each candidate slot

### Assignment (per strategy)
- Sort all candidate (student, slot) pairs by their objective score (descending)
- Greedily assign, checking: no two students overlap + min break respected
- Apply gap penalty: for each day, if total gap between assigned lessons exceeds `GAP_PENALTY_THRESHOLD_MINUTES`, reduce the schedule's overall score
- If a student has no feasible slot: flag as unscheduled, continue

### Output
For each strategy: list of (studentId, dayOfWeek, startTime, endTime) + list of unscheduled students + total score.

### Week overrides
Applied after recurring slots are assigned: for each override week, per-student, substitute or remove the instance based on that week's availability.

---

## Open Questions / Deferred Decisions

- **Algorithm sophistication**: greedy works for small cohorts but may produce suboptimal results as student count grows. A constraint solver (e.g., or-tools) could be introduced in a later phase without changing the data model.
- **"Balanced" strategy weights**: currently an equal blend; worth exposing as a teacher-adjustable slider in Phase 2.
- **Notification delivery timing**: reminder cadence (e.g., 48h before deadline, 24h before deadline) is a detail for the Cloud Function implementation phase.
- **Student-to-teacher linking across locations**: currently handled by existing `/students` and `/teachers` RTDB paths; scheduling feature adds enrollment per semester without changing that mapping.
