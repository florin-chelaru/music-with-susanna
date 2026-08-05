# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bilingual (Romanian/English) music lesson website for violin/viola teacher Susanna Johnson-Chelaru at vioara-cu-susanna.ro. Serves as a public portfolio and a private teacher-student homework portal.

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
- DB snapshots for version history are kept in [db-snapshots/](db-snapshots/)

### Cloud Functions

Source: `/Users/florinc/dev/music-with-susanna-functions/functions/src`
All functions are HTTP `onRequest` triggers deployed to `europe-west1`. Base URL: `https://europe-west1-music-with-susanna.cloudfunctions.net/`

All functions require `Authorization: Bearer <idToken>` (Firebase ID token). The three Facebook/YouTube functions are **teacher-only** (via `authenticateAndAuthorizeTeacher`). `sendEmail` allows **both teachers and students** but enforces that the `to` address belongs to a known related user (teacher's student or student's teacher).

| Function | Caller | Description |
|---|---|---|
| `sendEmail` | Teacher or student | Sends a Gmail email to a verified related user. Body: `{ to, subject, html?, text?, calendarEvent? }`. When `calendarEvent` is provided, attaches an iCalendar invite or cancellation. Used for all scheduling notifications. |
| `fetchYoutubeVideo` | Teacher only | Takes `?videoId=` query param, returns YouTube snippet metadata via the Data API v3. |
| `fetchFacebookPosts` | Teacher only | Fetches and prettifies the Facebook page feed. |
| `saveFacebookPostPhotos` | Teacher only | Downloads FB post images, uploads to Firebase Storage, saves records to RTDB. |

**`sendEmail` — `calendarEvent` field:**
- `uid`: stable lesson ID — lets calendar apps recognize updates/cancellations across emails
- `method`: `"request"` for invites/reminders, `"cancel"` for cancellations
- `sequence`: increment each time a calendar message is sent for the same lesson (tracked as `calendarSequence` on the lesson record in RTDB)
