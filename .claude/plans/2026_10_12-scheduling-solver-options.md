# Scheduling solver options: Claude API vs. backtracking

Research notes, not an implementation plan. They come from a discussion about how to improve the schedule suggestions described in [2026_08_05-scheduling-feature.md](2026_08_05-scheduling-feature.md), specifically the "Schedule Suggestion" and "Algorithm Notes (Phase 1)" sections, `computeSchedule` in particular. Use them as input when deciding what comes after the Phase 1 greedy pass.

## The problem with the current algorithm

`computeSchedule` is a greedy pass that works through the semester week by week, with no backtracking. In each week it sorts the students who are due, most constrained first, and gives each one its best non-conflicting candidate. A student can end up in `unscheduledStudentIds` because earlier picks took the slots they could have used, even when a full placement existed. The plan already accepts this for Phase 1; see Open Questions → "Algorithm sophistication".

Problem size: at most 20 students and at most 20 weeks. Lessons are assigned to specific dates, not a weekly template. The constraints are hard blocks (score 0), `MIN_BREAK_MINUTES = 10`, `SLOT_SNAP_MINUTES = 15`, week overrides, bi-weekly lessons and the gap penalty.

## Option A: a Cloud Function that calls the Claude API

**Feasibility: easy.**
- Fits the existing pattern: an HTTP `onRequest` function in `europe-west1`, Bearer ID-token auth, teacher-only through `authenticateAndAuthorizeTeacher`. Source lives in `/Users/florinc/dev/music-with-susanna-functions/functions/src`.
- Use `@anthropic-ai/sdk` and model `claude-opus-5-5`. Store the API key with `defineSecret` (Secret Manager).
- Input is about 10–30K tokens (20 students' blocks and overrides, the teacher template, the constants).
- Cost is about $0.30–$1 per run at Opus 5.5 pricing ($4 / $20 per million input/output tokens), which is negligible for a few runs per semester.
- Latency is 1–5 minutes. Either raise the gen-2 HTTP timeout, or write the result to `/scheduleSuggestions/.../rounds/{rid}/{strategy}` and let the client pick it up through its RTDB subscription.
- Privacy: send anonymized IDs (`s1…s20`), never student names, and map them back on the server. The repo is careful with student personal data, so this matters.

**Quality: weak as a solver.**
- Exact constraint satisfaction over about 400 dated lessons is where LLMs are unreliable. Expect occasional overlaps, broken minimum breaks, and lessons in slots marked Unavailable. Writing out 400 dated lessons is also slow and invites mistakes.
- If you build it anyway, two things are required:
  1. Have Claude return a **weekly template plus per-week exceptions**, then expand that into dates deterministically with existing code.
  2. Run the output through the **same conflict check and `computeTotalScore`** as the greedy result. Reject or repair invalid output, and compare scores objectively.
- Where to put it: as a 4th "AI suggestion" column next to the three strategies, validated and scored like the others. Keep it only if it wins on real data.

**Where Claude adds real value: as an assistant on top of the solver, not as the solver.**
- **Explanations:** "Why is Maria unplaced?" or "What would free up Tuesday afternoons?"
- **Natural-language edits:** "Keep Fridays free and move the kids under 10 earlier." Claude turns these into constraint or score changes, and the solver re-runs.
- **Free-text student notes** that the score tiers can't express, such as "Wednesdays only if school ends early."
- **A tool-use loop:** Claude proposes moves and calls `validate` and `score` as tools. This avoids the correctness problem, but it's more complex.

## Option B: backtracking or branch and bound (recommended next step)

This targets the real weakness of the greedy pass. Using `computeSchedule`'s existing week-by-week structure, run the search **per week** over the students due that week.

**Search size per week**
- Depth: up to 20 students.
- Branching: about 10–30 candidate start times per student per week (at least 3 availability windows of 1–3 hours, 15-minute snap, overlapped with teacher availability).
- The theoretical worst case is about 30^20, but pruning makes that irrelevant in practice.

**Expected runtimes in browser JS** (estimates, not yet benchmarked)

| Variant | What it finds | Per week | Whole semester (20 weeks × 3 strategies) |
|---|---|---|---|
| Feasibility backtracking: most constrained student first, and after each placement drop the remaining candidates that now conflict | A full placement if one exists | microseconds to about 1 ms | well under 100 ms |
| Branch and bound: bound = current score + each remaining student's best still-free candidate | The optimal weekly score | about 1 ms to a few hundred ms | usually under a few seconds |

The gap penalty only subtracts, so leaving it out of the bound keeps the bound valid, just looser.

**Worst-case guard**
- Very tight or infeasible weeks, such as crowded holiday weeks, can blow up exponentially.
- Cap each week with a node or time budget, for example 200k nodes or about 200 ms.
- Keep the best complete placement found so far, and fall back to the greedy result. The output is then never worse than what we have now.
- If the search finishes without a full placement, no full placement exists, so "unplaced" really means unplaceable.

**Implementation notes for speed**
- Precompute candidate lists **per student per week** once. The current sort comparator calls `candidates.filter(...)` over the whole semester's candidates on every comparison.
- Replace `hasConflict`'s scan of the whole `assigned` array with a per-date occupancy structure: a small list of booked intervals per date. Push when placing, pop when backtracking.
- Scope: this fixes collisions **within a week**. Cross-week logic, meaning the 0.8× target-spacing rule and the backfill loop, stays greedy. Within-week collisions are the main source of avoidable unplaced students.
- Alternatives to hand-written search: a small ILP model with `glpk.js` or `javascript-lp-solver`, or local search (random restarts plus swap/hill-climbing) seeded with the greedy result.

## Recommendation

1. **Phase 1:** keep the greedy pass as specified.
2. **Next:** add per-week backtracking (feasibility first, then optionally branch and bound), with a time cap and a greedy fallback. It's deterministic, free and fast.
3. **Later:** add Claude as an assistant layer for explanations, natural-language changes and free-text notes. Optionally add the "AI suggestion" column, always validated and scored by the same code.

## Open follow-ups

- Benchmark backtracking against `src/data/schedulingMocks.ts` and a generated 20-student cohort with realistic availability, to replace the estimated runtimes above with measurements.
- Add a Step L test case where greedy leaves a student unplaced and backtracking places them.
