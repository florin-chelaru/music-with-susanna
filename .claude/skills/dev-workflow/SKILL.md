---
name: dev-workflow
description: Development workflow for this project — how to plan features and implement them in small, reviewable increments. Use before starting any non-trivial feature or when the user asks about the dev process.
version: 0.1.0
---

# Development Workflow

## Planning first

Before writing any code for a non-trivial feature:

1. Use plan mode (`/plan`) to design the spec.
2. Ask clarifying questions with `AskUserQuestion` — resource types, data model, UX flows, edge cases — before generating the plan.
3. Write the plan to `.claude/plans/YYYY_MM_DD-feature-name.md` (match the naming pattern of existing files in that directory).
4. The plan must include an **Implementation Milestones** section (see below).

## Implementation milestones

Work in small, independently reviewable increments. The user reviews each milestone before the next one starts.

### Phase A — Static UI (mock data, no Firebase)

Build every page and component UI-first with hardcoded mock data. No Firebase reads or writes in Phase A.

**Each milestone must be visible in the running app** (`npm start`). New routes are added from the very first milestone so the user can navigate to them directly.

Typical A milestones:
- A1: Route stub + first component with mock data
- A2: Next component added to the same page
- A3: Dialogs/overlays (open them from the page, form UI only — no writes)
- A4: Additional routes (different role views, per-student views, etc.)
- A5+: Navigation wiring (links from existing pages to new routes)

After each A milestone: **stop and wait for the user to review** design, layout, UX, and interactions before moving on.

### Phase B — Firebase wiring

Replace mock data with real RTDB subscriptions and wire up writes one piece at a time.

Typical B milestones:
- B1: Data hooks + CRUD utilities + unit tests (no UI changes)
- B2: Replace mock list with real subscription
- B3: Wire up first write action (e.g. upload/create)
- B4+: Wire up remaining actions (share, delete, etc.) one per milestone

After each B milestone: **stop and wait for the user to review** the live data flow.

## Rules

- Never skip to Phase B before the user has approved all Phase A milestones.
- Never implement multiple milestones at once unless the user explicitly asks.
- Always run `npm run lint` after each milestone and fix any errors before pausing for review.
- Follow the existing code style: no trailing commas, `jsxBracketSameLine`, single quotes, 100-char print width.
