# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bilingual (Romanian/English) music lesson website for violin/viola teacher Susanna Johnson-Chelaru at vioara-cu-susanna.ro. Serves as a public portfolio and a private teacher-student homework portal.

## Changing the Live Database or Rules

**Never modify production data, RTDB security rules, or Storage rules without doing all three, in this order:**

1. **Ask first, and be specific.** State the exact change before making it — which paths, which fields, which rule clauses, what the before and after look like, and whether it is additive or destructive. "I'm going to update the rules" is not enough to approve. Wait for an explicit go-ahead.
2. **Snapshot first.** Save the current state into [db-snapshots/](db-snapshots/) *before* the change lands, following the existing naming convention:
   - `YYYY-MM-DD - music-with-susanna-default-rtdb-export.json` — RTDB data
   - `YYYY-MM-DD - rules.json` — RTDB security rules
   - `YYYY-MM-DD - storage.rules` — Storage rules
3. **Then apply it**, and report what actually changed.

This covers anything that reaches the live project: `firebase deploy --only database`, `firebase database:set` / `update` / `remove` / `import`, edits made in the Firebase console, and any script that writes using production credentials.

Reading is free and needs no approval: `firebase database:get`, fetching the current rules, and anything that stays local.

### Snapshots and backups

**This repository is public, and the RTDB data exports contain student and parent personal data.** Snapshots therefore live in the private repo [florin-chelaru/music-with-susanna-db-snapshots](https://github.com/florin-chelaru/music-with-susanna-db-snapshots), cloned alongside this one at `../music-with-susanna-db-snapshots`. `db-snapshots/` is gitignored here — never commit an export to this repo.

What the snapshot repo holds (see its README for restore instructions):

| File | What it is | Format |
|---|---|---|
| `YYYY-MM-DD - music-with-susanna-default-rtdb-export.json` | RTDB data | The console's "Export JSON": the raw data tree, no wrapper. Top-level keys are `announcement`, `deleted`, `homework`, `posts`, `resources`, `shared-resources`, `students`, `teachers`, `users`, `videos`. |
| `YYYY-MM-DD - rules.json` | RTDB security rules | The rules verbatim, wrapped in a top-level `"rules"` key — already in `database.rules.json` format. |
| `YYYY-MM-DD - storage.rules` | Cloud Storage security rules | Storage rules language (`rules_version = '2'; …`), not JSON. |

Taking a snapshot:

```bash
cd ../music-with-susanna-db-snapshots
firebase database:get "/" --project music-with-susanna > "$(date +%F) - music-with-susanna-default-rtdb-export.json"
firebase database:get "/.settings/rules" --project music-with-susanna > "$(date +%F) - rules.json"
```

Storage rules have no CLI read; copy them from the console when they change.

**RTDB rules are deployed from this repo**: [database.rules.json](database.rules.json) is the source of truth, referenced by [firebase.json](firebase.json), and deployed with `firebase deploy --only database`. It contains no personal data, so it stays here.

## No AI Attribution

**Never mention Claude, AI, or any assistant anywhere in this repository.** That includes:

- `Co-Authored-By:` trailers and "Generated with" lines in commit messages
- Pull request titles, descriptions and comments
- Code comments, JSDoc, TODOs, documentation and plan files

Everything here is the project's own work and reads that way. This overrides any default
attribution the tooling suggests.

## After Implementing

**Before verifying or committing, re-read what you just wrote and clean it up.** This is part of
the implementation, not optional polish:

- **Reuse what exists.** Look through `src/util/` and `src/Components/` before writing a helper,
  a component or a block of styles. This repo has repeatedly grown second copies — calendar
  styling, day-of-week conversion, `HH:mm` parsing — and they drift apart the moment one is
  fixed and the other is not.
- **Extract on the second occurrence.** As soon as the same logic exists twice, move it
  somewhere shared. Pure logic belongs in `src/util/`, where it can be tested without mounting
  a component.
- **Follow the established pattern** instead of inventing a parallel one: locale strings
  registered inside a `useMemo`, the two-call `useMediaQuery` mobile check, mock data keyed per
  semester or round, auth guards as an inline `useEffect`.
- **Delete what you replaced** — dead props, unused strings, superseded helpers, leftover
  imports.
- **Cut what nobody asked for** — speculative options, fields with no consumer, visual states
  invented rather than requested.

Report what you simplified. If nothing needed it, say so.

## Before Verifying

**Typechecking, tests, linting and builds are a final step, not a loop.** Do not run them while
implementing, and **ask before running any of them**:

```bash
npx tsc --noEmit     # typecheck
npm test             # or npx jest <file>
npm run lint
npm run build
```

When the implementation is ready, say so and wait. Do not verify and report results unprompted —
finish the work first, then check it once, deliberately.

## Before Committing

**Never run `git commit` without asking for review first.** When a change is ready:

1. Say what changed and why, and point at the files.
2. Wait for an explicit go-ahead.
3. Only then commit.

This applies to every change — code, tests, docs, config, plan files, everything. Editing files,
staging them, and showing a diff are all fine; `git commit` is the gate. Pushing, tagging and
deploying each need their own separate go-ahead.

## Commands

```bash
npm start          # dev server (localhost:3000)
npm run build      # production build → build/
npm test           # run tests (Jest, not react-scripts test)
npm run lint       # ESLint
npm run lint:fix   # ESLint with auto-fix
npm run format     # Prettier over all JS/TS/CSS/MD/JSON
npm run deploy     # build + standard-version + push tags + gh-pages deploy
npm run release    # standard-version only (bump version + changelog)
```

Run a single test file:
```bash
npx jest src/util/array.test.ts
```

Commits follow **conventional commits** (`feat:`, `fix:`, `chore:` etc.) — `standard-version` reads them to generate CHANGELOG entries and bump semver.

## Code Style

- Prettier (full config): `semi: false`, `singleQuote: true`, `printWidth: 100`, `tabWidth: 2`, `trailingComma: "none"`, `jsxBracketSameLine: true`
  - No trailing commas anywhere — not in objects, arrays, or function params
  - JSX closing `>` always goes on the same line as the last attribute/prop
  - **Never run `npm run format` (or `npm run lint:fix`) on the whole codebase** — it reformats hundreds of pre-existing files and introduces `jsxBracketSameLine` violations because `npm run format` uses Prettier directly (which ignores the deprecated setting) while the ESLint plugin enforces it. Only run targeted fixes on files you actually changed: `npx prettier --write src/path/to/file.tsx`
  - Note: `jsxBracketSameLine` is deprecated in Prettier 3+; the project still uses it and the ESLint plugin enforces it, so always confirm with `npm run lint` after editing JSX
- ESLint extends `standard-with-typescript` + `plugin:prettier/recommended`
  - `no-void` rule (from `standard`): `void expr` is **not** allowed as a return expression in concise arrow functions — use a block body: `(x) => { void asyncFn(x) }` ✓ vs `(x) => void asyncFn(x)` ✗
  - Floating promise pattern: wrap async event handlers with `void` inside a block body (see above); `@typescript-eslint/promise-function-async` is off
- TypeScript strict mode, target ES2015, `react-jsx` transform

## Architecture

### State Management

The app uses **React Context exclusively** — no Redux or Zustand. Six providers are stacked in [src/App.tsx](src/App.tsx):

| Provider | Purpose |
|---|---|
| `CustomThemeProvider` | MUI light/dark theme; detects OS preference |
| `LocaleProvider` | i18n locale (EN_US / RO_RO), persisted in localStorage |
| `UserProvider` | Firebase auth + user metadata via `useReducer` |
| `SelectedVideoProvider` | Currently playing video ID across pages |
| `AnnouncementProvider` | Banner content + global visibility from RTDB (`/announcement`); per-user dismiss in localStorage; teachers always see banner with edit UI |
| `FabPositionProvider` | Floating action button positions by route/role |

### Localization (i18n)

The `LocaleManager` class in [src/store/LocaleProvider.tsx](src/store/LocaleProvider.tsx) drives all i18n:
- Each component registers its own strings via `localeManager.registerComponentStrings(ComponentName, TEXTS_MAP)` inside a `useMemo`, then reads via `localeManager.componentStrings(ComponentName)`
- Global UI strings live in [src/store/LocaleSettings.ts](src/store/LocaleSettings.ts)
- Locale is persisted to localStorage and optionally reflected in `?hl=` URL params
- MUI locale adapters are applied dynamically so MUI labels also localize

**A text that takes a value is a function, never a placeholder string.** No `{n}` or `.replace()`
anywhere:

```ts
// in the texts interface
insideWindow: (hours: number) => string
// EN
insideWindow: (hours) => `It is less than ${hours} hours before the lesson.`,
// RO
insideWindow: (hours) => `Sunt mai puțin de ${hours} ore până la lecție.`,
// at the call site
t.insideWindow(cancellationWindowHours)
```

A placeholder string is unchecked twice over: drop the `.replace()` and the user reads a literal
`{n}`, and nothing makes the Romanian carry the same placeholders as the English. As functions,
both are the compiler's problem — a missing or mistyped argument will not build, and the two
locales cannot drift apart because they implement one signature.

Name parameters for what they are (`hours`, `name`, `count`), not after the placeholder they
replaced. Keep them positional, as `EditorCardTexts.uploadingDescription` does. Interpolation is
the only reason to reach for this — a text with nothing to substitute stays a plain string.

### Authentication & Authorization

Firebase email/password auth. User role is read from RTDB at `users/{uid}/role`:
- `UserRole.TEACHER` — manages videos, students, and homework
- `UserRole.STUDENT` — read-only access to their own homework

`SUSANNA_USER_ID` in [src/util/User.ts](src/util/User.ts) identifies the primary teacher account used throughout the app.

Post-login redirect: Teacher → `/students`, Student → `/subjects`.

### Firebase RTDB Schema

```
/homework/teachers/{teacherId}/students/{studentId}/{homeworkId}  # published
/homework/teachers/{teacherId}/drafts/students/{studentId}/{id}   # drafts
/deleted/                                                          # soft-deletes
/users/{uid}/                                                      # name, email, role, phone
/videos/teachers/{teacherId}/{videoId}                            # channel videos
/videos/showcase/teachers/{teacherId}/{videoId}                   # homepage recital videos
/students/{studentId}/teachers/{teacherId}                         # student→teacher mapping
/teachers/{teacherId}/students/{studentId}                         # teacher→student mapping
/posts/                                                            # saved Facebook posts
/announcement/                                                     # teacher-managed banner: { visible, enUS: {title,body}, roRO: {title,body} }
```

Deletes are always soft — items are copied to `/deleted/...` before removal from the active path.

### Homework Workflow

Draft auto-saves every 3 seconds to RTDB. Publishing moves the entry from `drafts/` to the student path and removes the draft. Teachers can revert published entries back to draft ("Edit"). The most complex page is [src/pages/Homework.tsx](src/pages/Homework.tsx), which manages real-time RTDB subscriptions, the draft/publish state machine, and a dynamically built table of contents.

### Rich Text Editor

`EditorCard` ([src/Components/EditorCard.tsx](src/Components/EditorCard.tsx)) wraps `ReactQuill`. Three custom Quill blots extend editor capabilities ([src/util/quill.ts](src/util/quill.ts)):
- `PdfBlot` — inline PDF via `<object>`
- `AudioBlot` — `<audio controls>`
- `ImageWithSize` — image with stored `width` for resizing

File uploads go to Firebase Storage at `users/{uid}/files/{name}_{randomSuffix}.{ext}`; the download URL is embedded directly into the Quill delta content.

### Infrastructure

- **CRA (Create React App)** — Webpack is managed by `react-scripts`; no custom webpack config
- **Deployed via `gh-pages`** to the `build/` directory; `build/CNAME` sets the custom domain
- Firebase config lives in [src/store/Firebase.ts](src/store/Firebase.ts) (app init, exports `auth`, `database`, `storage`, `analytics`)
- DB snapshots live in a separate private repo — see "Snapshots and backups" above

### Cloud Functions

Source: `/Users/florinc/dev/music-with-susanna-functions/functions/src`
All functions are HTTP `onRequest` triggers deployed to `europe-west1`. Base URL: `https://europe-west1-music-with-susanna.cloudfunctions.net/`

All functions require `Authorization: Bearer <idToken>` (Firebase ID token). The three Facebook/YouTube functions are **teacher-only** (via `authenticateAndAuthorizeTeacher`). `sendEmail` allows **both teachers and students** but enforces that the `to` address belongs to a known related user (teacher's student or student's teacher).

| Function | Caller | Description |
|---|---|---|
| `sendEmail` | Teacher or student | Sends a Gmail email to a verified related user. Used for all scheduling notifications — see below. |
| `fetchYoutubeVideo` | Teacher only | Takes `?videoId=` query param, returns YouTube snippet metadata via the Data API v3. |
| `fetchFacebookPosts` | Teacher only | Fetches and prettifies the Facebook page feed. |
| `saveFacebookPostPhotos` | Teacher only | Downloads FB post images, uploads to Firebase Storage, saves records to RTDB. |

**`sendEmail` body:** `{ to, subject, text?, html?, calendarEvent? }`. `to` and `subject` are
required, and **at least one of `text` / `html`** — each is optional alone, not together.

Returns `200 {success: true}`. Errors come back as a **plain-text body** with the status, not JSON:
401 (no or invalid token), 403 (wrong role, or `to` not an allowed recipient), 400 (missing
fields), 500 otherwise.

**Who you may email.** The function reads `teachers/{uid}/students` for a teacher or
`students/{uid}/teachers` for a student, collects those users' `users/{uid}/email` values, and
adds the caller's own address — so anyone may always email themselves. A `to` outside that set is
a 403. Note the check runs *before* the required-field validation, so a missing `to` surfaces as
403 rather than 400.

**The From header is built from the caller:** `Vioară cu Susanna [<caller's name>] <GMAIL_USER>`.
A student-initiated email arrives showing the student's name, not the teacher's.

**`calendarEvent`** — `uid`, `title`, `start` and `end` are **all required** when it is present;
omitting any is a 400.
- `uid`: stable lesson ID — lets calendar apps recognize updates/cancellations across emails
- `title`: the event summary
- `start` / `end`: ISO date strings
- `location`, `description`: optional
- `method`: `"request"` for invites/reminders, `"cancel"` for cancellations (default `"request"`)
- `sequence`: increment each time a calendar message is sent for the same lesson (tracked as `calendarSequence` on the lesson record in RTDB)

**Get the token at call time, not from `user.accessToken`.** `UserProvider` captures that once at
`onAuthStateChanged`, and a Firebase ID token expires after an hour — a tab left open sends a
stale one and gets a 401. Use `auth.currentUser?.getIdToken()`, which returns the cached token and
refreshes it when near expiry.
