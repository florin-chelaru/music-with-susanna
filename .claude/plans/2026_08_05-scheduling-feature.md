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
  lessonsPerWeek: number
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

---

## Phase 1 — Implementation Plan

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
npm install ics          # client-side .ics download only (email invites handled by sendEmail)
```

Check if `date-fns` is already installed (`package.json`) — needed for date arithmetic (week enumeration, offset calculations). If not present, add it.

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

Pure functions only — no RTDB, no React. Can be tested in isolation.

```
SchedulingInput interface     { teacherAvailability, enrollments, studentSubmissions }
SchedulingResult interface    { slots: SuggestedSlot[], unscheduledStudentIds: string[], totalScore: number }

generateCandidateSlots(       → CandidateSlot[]     enumerate all valid (student, day, startTime) triples
  enrollment, teacherBlocks,    snapped to SLOT_SNAP_MINUTES, within continuous windows,
  studentBlocks                 combined_score > 0
)

computeSchedule(              → SchedulingResult    greedy assignment for one strategy
  input, strategy
)

generateAllSuggestions(input) → Record<SuggestionStrategy, SchedulingResult>
                                runs computeSchedule for all 3 strategies

applyWeekOverrides(           → LessonInstance[]    takes the confirmed recurring slots +
  confirmedSlots,               semester date range + per-student week overrides,
  semesterDateRange,            expands to individual lesson instances,
  studentOverrides              skipping or substituting as needed
)
```

Strategy differences (all enforce "include everyone" as first priority):

| Strategy | Sort key for candidate slots |
|---|---|
| `teacher_best` | teacher score descending |
| `student_best` | combined score descending, then prefer student Preferred |
| `balanced` | `TEACHER_WEIGHT × teacher + STUDENT_WEIGHT × student` descending |

Gap penalty: after assignment, iterate each day's placed lessons sorted by start time; sum gaps > `GAP_PENALTY_THRESHOLD_MINUTES`; subtract from `totalScore`.

**Tests:** `src/util/schedulingAlgorithm.test.ts` — at minimum: single student happy path, conflict resolution (two students want the same slot), unschedulable student case, gap penalty applied.

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

The most complex UI piece. A weekly grid where users draw labeled time blocks.

**Layout:** CSS Grid — 8 columns (time gutter + 7 days) × N rows (one per `SLOT_SNAP_MINUTES` interval between `displayStartHour` and `displayEndHour` props). Each cell is a `<div>` identified by `(dayIndex, slotIndex)`.

**Interaction (editable mode):**
1. `mousedown` on a cell → record `dragStart`
2. `mousemove` → highlight cells between `dragStart` and current cell
3. `mouseup` → open a small popover to choose label (Preferred / Available / Last Resort); confirm → add block to state
4. Click existing block → select it; Delete key or trash icon removes it
5. Blocks are rendered as absolutely-positioned colored overlays on top of the grid using `position: absolute` + computed `top`/`height` from start/end times

**Overlay mode (student sees teacher's blocks):**
- Teacher's blocks rendered as semi-transparent background behind the grid
- Student draws their own blocks on top
- When student starts a drag over a teacher Last Resort or Unavailable cell → show inline warning tooltip

**Props:**
```typescript
interface AvailabilityCalendarProps {
  blocks: AvailabilityBlock[]           // current value
  onChange?: (blocks: AvailabilityBlock[]) => void  // undefined → read-only
  overlayBlocks?: AvailabilityBlock[]   // teacher's blocks shown as background (student view)
  displayStartHour?: number             // default 8
  displayEndHour?: number               // default 20
}
```

**Colors per label** (MUI palette tokens, not hardcoded hex):
- Preferred → `success.main`
- Available → `primary.main`
- Last Resort → `warning.main`
- Unavailable → `error.main` (only in overlay; students can't draw Unavailable)

---

### Step 6 — LessonCalendar component

**New file:** `src/Components/scheduling/LessonCalendar.tsx`

Simpler than `AvailabilityCalendar` — read-only display of confirmed `LessonInstance` records.

**Layout:** grouped list by week, within each week grouped by day. Each lesson shown as a card with: student name (or "Your lesson" from student view), time range, location, status badge, cancel button (conditionally shown).

**Props:**
```typescript
interface LessonCalendarProps {
  lessons: LessonInstance[]
  students?: Record<uid, { name: string }>  // teacher view: show names; omit in student view
  onCancel?: (lessonId: string) => void      // undefined → no cancel button
  onExportIcs?: () => void                   // show export button when provided
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
- **`suggested`**: show 3 side-by-side `SuggestedScheduleCard` components. Teacher clicks "Use This" on one → loads it into an editable confirmed-schedule view where they can drag/adjust. "Confirm Schedule" button → writes `confirmedSchedule`, generates all `LessonInstance` records, sends notifications, advances round to `finalized`.
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
