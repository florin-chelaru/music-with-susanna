# Resources Feature Spec

## Context

Currently, each student's workspace is completely isolated. A teacher with 5 students who all work on the same material must upload the same PDF, audio, or image file separately for each student. This feature introduces a **Teacher Resource Library** — a central store of uploaded files and links that the teacher can share selectively with individual students and embed directly into homework entries.

---

## Summary of Decisions

| Dimension | Decision |
|---|---|
| Resource types | PDF, audio, image, YouTube/external link |
| Storage | Single upload, shared by URL reference — no per-student copies |
| Organization | Tags + search bar + sort dropdown (Name A→Z, Date Added newest/oldest) |
| Sharing | Either direction: per-resource (pick students) or per-student (pick resources) |
| Insert into homework | Image toolbar button in Quill opens unified `InsertMediaDialog` (Library tab + Upload tab) |
| Auto-share on insert | Yes — inserting a resource into a student's homework also shares it with them |
| Auto-add on upload | Yes — every teacher file upload in homework editor also creates a Resource entry (title = cleaned filename) |
| Revoke access | Yes, teacher can unshare at any time |
| Student view | Resources page per teacher (from Subjects card) |

---

## Firebase RTDB Schema (additions)

```
/resources/teachers/{teacherId}/{resourceId}:
  title: string
  type: 'pdf' | 'audio' | 'image' | 'youtube'
  url: string          # Firebase Storage download URL or YouTube/external URL
  fileName?: string    # original filename (display only)
  storagePath?: string # Storage path for file-backed resources; omitted for YouTube
  tags: { [tagSlug]: tagLabel }  # e.g. { "etude": "Etude" } — slug→label map
  createdAt: string    # ISO 8601

/shared-resources/{teacherId}/students/{studentId}/{resourceId}: true

# Added in B7 — tracks which library resources are embedded in each homework entry
# Stored as resourceId → downloadUrl (not true) so the URL is available without a second lookup
/homework/teachers/{teacherId}/students/{studentId}/{homeworkId}/resources/{resourceId}: url (string)
```

`resources` lives inside `HomeworkInfo` as `Record<string, string>` (resourceId → URL). It is saved as part of the regular `saveHomeworkDraft` / `publishHomework` writes (no separate path management). `removeUndefinedKeys` strips it when absent. The DB→local sync in `handleHomeworkFromDb` copies it alongside the other fields.

> **Note**: a `/resource-tags/{teacherId}/{tagSlug}: tagLabel` registry (for persistent tag autocomplete independent of resources) is planned but not yet implemented. Currently tags are derived client-side from the resources list via `buildTagIndex`. See B milestones for when this will be wired up.

**Soft-delete**: deletions move `resources/teachers/{teacherId}/{resourceId}` to `/deleted/resources/teachers/{teacherId}/{resourceId}` before removal, consistent with existing pattern. **Hard-delete Storage**: after the RTDB soft-delete, also call `deleteObject` on the Firebase Storage file — requires `storagePath` in the RTDB entry.

---

## Firebase Storage (additions)

New path for teacher-owned shared resources:
```
resources/{teacherUid}/{resourceId}/{originalFilename}
```
Uploaded once; all sharing is by URL reference. This is separate from the existing per-homework upload path (`users/{uid}/files/…`), which remains unchanged.

**`storagePath` field**: every file-backed Resource stores the Storage path (`resources/{uid}/{resourceId}/{filename}`) in RTDB so `deleteResource` can call `deleteObject(ref(storage, storagePath))` after the RTDB soft-delete. YouTube resources omit this field.

**Storage rules**: `db-snapshots/2026-07-28 - storage.rules` — apply via Firebase Console → Storage → Rules. Adds `match /resources/{teacherUid}/{resourceId}/{fileName}` (read: any authenticated user; write: owner only). The existing `users/{$uid}/files/` and `users/{$uid}/images/` rules are also preserved in this file.

---

## New Routes

| Path | Who sees it | Purpose |
|---|---|---|
| `/resources` | Teacher only | Full resource library |
| `/resources/:resourceId` | Teacher only | Resource details — all homework references, safe-delete |
| `/resources/student/:studentId` | Teacher only | Resources shared with a specific student |
| `/resources/teacher/:teacherId` | Student only | Resources a teacher shared with current student |

These mirror the existing `/homework/:teacherId/:studentId` pattern.

---

## Navigation Changes

### `src/data/RouteInfo.tsx`
- Add three new route entries (with `hiddenFromAppBar` handling — see below).

### `src/Components/DrawerAppBar.tsx`
- No changes — Resources is not in the main nav bar.

### `src/Components/UserPopover.tsx`
- Teacher's dropdown menu has a **Resources** item (with `LibraryBooksIcon`) below **Students**, navigating to `/resources`.

### `src/pages/StudentsPage.tsx`
- Add a third action link in each student accordion: **"Resources"** → `/resources/student/:studentId`.
- Sits alongside the existing Homework and Delete actions.

### `src/pages/SubjectsPage.tsx`
- Add a second action link in each teacher accordion: **"Resources"** → `/resources/teacher/:teacherId`.
- Sits alongside the existing Homework action.

---

## New Pages

### Auth guards ✅
All four resource pages redirect unauthenticated users to `/login` (logging out while on the page also triggers the redirect). Teacher-only pages additionally redirect non-teachers to `/`. Implemented via `useEffect` watching `user`, following the same pattern as `StudentsPage`.

### `src/pages/ResourceDetailsPage.tsx`
Teacher-only view at `/resources/:resourceId`. Accessible via a "Details" button on each `ResourceCard`.

Purpose: safe-deletion workflow. A resource **cannot be deleted while it is referenced in any homework entry**. This page shows all references so the teacher can remove them before deleting.

Layout:
- Resource header: title, type icon, tags, preview embed (collapsed by default)
- **"Used in homework"** section: list grouped by student, showing homework title + status (draft / published) + a link to open that homework. Teacher navigates to each homework and manually removes the embedded resource from the editor.
- **Delete button**: disabled (with tooltip "Remove this resource from all homework entries first") while any references remain; enabled and shows a standard "are you sure?" confirmation once the list is empty.
- **Back** link → `/resources`

Data: `findResourceUsageInHomework(teacherId, resourceId)` (live-polling not needed — one-shot `get()` on page load, with a manual Refresh button).

### `src/pages/TeacherResourcesPage.tsx` ✅
Full library view for the teacher. Accessible at `/resources`.

Layout (two-column, mirrors Homework page):
- **Left column** (`sm=9 md=10`): page header row (title + sort dropdown + Expand All / Collapse All), resource list one card per row
- Sort dropdown: Name A→Z, Newest first, Oldest first — default Newest first
- Cards start expanded
- **Right column** (`sm=3 md=2`, hidden on mobile): sticky `TableOfContents` with nested entries (tag → resource titles)
- **Mobile**: TOC at top of page
- FAB opens `ResourceUploadDialog`

### `src/pages/StudentResourcesPage.tsx` ✅
Teacher's per-student view at `/resources/student/:studentId` — shows resources shared with that student; teacher can add/remove.
- Student name fetched from Firebase (`users/${studentId}`) at load time (not from mock list)

### `src/pages/StudentViewResourcesPage.tsx`
Student read-only view at `/resources/teacher/:teacherId` — shows resources teacher shared with current student; no edit actions.

---

## New / Updated Components

### `src/Components/ResourceCard.tsx` ✅
Displays a single resource:
- Type icon (PictureAsPdf, Audiotrack, Image, YouTube)
- Title + tag chips + date (`createdAt` formatted via `localeManager.formatLongDate`)
- Expand/collapse chevron (controlled via `expanded` + `onExpandedChange` props); pages default cards to **expanded**
- Embedded preview inside a `Collapse`: `<audio controls>`, `<object type="application/pdf">`, `<img>`, or `<iframe>` (YouTube)
- **Teacher library actions**: Share, Edit title/tags, Details (→ `/resources/:resourceId`), Delete
- **Delete flow**: clicking Delete checks for homework references via `findResourceUsageInHomework`. If any exist, shows a blocking dialog: "This resource is used in N homework entries — open the Details page to remove them first" (no "delete anyway" option). If none exist, shows standard "are you sure?" confirmation.
- **Teacher per-student actions**: Remove (unshare)
- **Student view**: Open-in-new-tab button only

### `src/Components/ResourceUploadDialog.tsx` ✅
Dialog for creating a new resource (form UI):
- YouTube URL mode or file upload mode
- Title input (defaults to filename)
- Tag input (autocomplete from existing tags, free-form new tags)

### `src/Components/InsertMediaDialog.tsx` ✅
Unified two-tab dialog opened by the Quill image toolbar button in `EditorCard`:
- **Library tab**: `ResourceTagFilter` + sort dropdown + resource list with Insert buttons (rows separated by dividers); on insert calls `insertResource(quill, resource)`
- **New Resource tab** (renamed from "Upload File"): inline form with ToggleButtonGroup (File / YouTube), file picker or YouTube URL field, YouTube auto-fetch preview (16:9 iframe embed via `useYouTubeMetadata`, title auto-populated), title field, tags autocomplete; on Upload builds a `Resource` and calls `onResourceUploaded`
- Tag chips displayed as filled (no border)
- Props: `{ open, resources, onClose, onInsert, onResourceUploaded: (resource: Resource) => void }`

### `src/Components/ShareResourceDialog.tsx` ✅
Dialog for sharing a resource with one or more students:
- Checkbox list of students (no "Shared with" label)
- Pre-checks students who already have access
- On confirm: writes/removes entries in `/shared-resources/…`

### `src/TableOfContents.tsx` (extended) ✅
`TocEntry.ref` is now optional; new optional `children?: TocEntry[]` added. Children render indented with lighter font weight. Homework page is unaffected.

### `src/Components/ResourceTagFilter.tsx` ✅
Reusable search + tag filter bar.

---

## Homework Editor Changes

### `src/Components/EditorCard.tsx` ✅
- Quill image toolbar button now opens `InsertMediaDialog` (instead of directly opening a file picker)
- `onPickFromLibrary` prop removed; dialog is self-contained inside the component
- `insertResource` + `PHASE_A_LIBRARY_RESOURCES` mock data live inside EditorCard for Phase A

### `src/util/quill.ts` ✅
- `handleFileUpload` accepts optional `file?: File` — skips browser file picker when provided
- `insertResource(quill, resource)` — inserts a Resource into the editor using the correct blot; converts YouTube watch URLs to embed format (`/watch?v=ID` → `/embed/ID`)

---

## Data Hooks / Utilities

### `src/util/youtube.ts` ✅
Shared YouTube utilities:
- `extractYouTubeVideoId(url)` — parses `youtube.com/watch?v=` and `youtu.be/` formats
- `toYouTubeEmbedUrl(url)` — converts watch URL to embed URL
- `fetchYouTubeVideo(videoId, accessToken?)` — calls cloud function at `europe-west1-music-with-susanna.cloudfunctions.net/fetchYoutubeVideo`
- `useYouTubeMetadata(url, accessToken?)` — 400ms debounced hook, cancellation-safe

### `src/data/MockResources.ts` ✅
Single source of truth for Phase A mock data — 4 resources (PDF, AUDIO, IMAGE, YOUTUBE) with real ISO date strings. All pages import from here instead of inline arrays.

### `src/util/resources.ts`

| Function | Description |
|---|---|
| `useTeacherResources(teacherId)` | RTDB subscription to `/resources/teachers/{teacherId}` |
| `useSharedResources(teacherId, studentId)` | Subscription to `/shared-resources/{teacherId}/students/{studentId}` |
| `useResourceTags(teacherId)` | Subscription to `/resource-tags/{teacherId}` |
| `uploadResource(teacherId, file, metadata)` | Uploads file to Storage path `resources/{uid}/{resourceId}/{filename}`, writes RTDB entry (with `storagePath`), returns resourceId |
| `addYouTubeResource(teacherId, url, metadata)` | Writes RTDB entry (no file upload, no `storagePath`) |
| `shareResource(teacherId, studentId, resourceId)` | Writes `true` to shared-resources path |
| `unshareResource(teacherId, studentId, resourceId)` | Removes entry from shared-resources |
| `deleteResource(teacherId, resourceId)` | Soft-deletes RTDB entry, removes all `/shared-resources/…/{resourceId}` refs, then calls `deleteObject(ref(storage, storagePath))` if `storagePath` is present |
| `updateResourceMetadata(teacherId, resourceId, patch)` | Updates title/tags |
| `importExistingUploads(teacherId)` | One-time migration: lists all files under `users/{uid}/files/` in Storage, infers ResourceType from MIME/extension, creates Resource entries in RTDB. Skips files already imported (idempotent via URL match). |
| `deduplicateResources(teacherId)` | Finds Resource entries backed by files with identical content (matched by a hash stored at upload time, or by filename+size heuristic), keeps the earliest entry as canonical, re-points all `/shared-resources/…` refs and all homework HTML URLs to the canonical download URL, then hard-deletes the duplicate Storage files and RTDB entries. |

---

## Localization

New string keys needed in `src/store/LocaleSettings.ts` and per-component `registerComponentStrings`:

- `resources`, `myResources`, `studentResources`, `addResource`, `uploadResource`
- `insertFromLibrary`, `shareWithStudents`, `unshare`
- `resourceTitle`, `resourceType`, `resourceTags`
- `searchResources`, `filterByTag`, `allTags`
- `pdf`, `audio`, `image`, `youtubeLink`
- `resourceShared`, `resourceUnshared`, `resourceDeleted`

Both EN_US and RO_RO translations required.

---

## Implementation Milestones

Work proceeds in small, independently reviewable increments. Each page and component is built **UI-first with mock/hardcoded data** so design and UX can be reviewed before any Firebase wiring. **Pause for review after every milestone.**

### Phase A — Static UI (mock data, no Firebase)

| # | Status | Milestone | How to see it |
|---|---|---|---|
| A1 | ✅ | `TeacherResourcesPage` + `ResourceCard` — hardcoded mock resources, embed previews, expand/collapse | `/resources` |
| A2 | ✅ | `ResourceTagFilter` — search bar + tag chips with working filter | `/resources` |
| A3 | ✅ | `ResourceUploadDialog` — FAB opens it; form UI only | Click FAB on `/resources` |
| A4 | ✅ | `ShareResourceDialog` — Share action on card opens it; mock students | Click Share on any card |
| A5 | ✅ | `/resources/student/:studentId` — teacher per-student view; mock add/remove | `/resources/student/mock-id` |
| A6 | ✅ | `/resources/teacher/:teacherId` — student read-only view | `/resources/teacher/mock-id` |
| A7 | ✅ | `InsertMediaDialog` — Quill image button opens two-tab dialog (Library + New Resource); library Insert wired to `insertResource`; New Resource tab: inline form with file/YouTube toggle, YouTube auto-fetch with 16:9 iframe preview + title auto-populate, tags; `src/util/youtube.ts` + `src/data/MockResources.ts` extracted as shared utilities | Open any homework draft as teacher, click image button in toolbar |
| A8 | ✅ | Navigation wiring: Resources item in teacher's `UserPopover` dropdown (below Students); Resources link in each student accordion (Students page); Resources link in each teacher accordion (Subjects page) | Click through from nav and page links |

### Phase B — Data layer + Firebase wiring

| # | Milestone | What to review |
|---|---|---|
| B1 | ✅ `src/util/resources.ts` — hooks and CRUD functions with unit tests (no UI changes) | Tests pass |
| B2 | ✅ Teacher Resources page: replace mock data with real RTDB subscription; upload dialog writes to Storage + RTDB; `storagePath` stored in RTDB entry; auth guard added | Upload a real file, see it appear |
| B3 | ✅ Tag filter + search + **sort dropdown** (by Name A→Z, by Date Added newest/oldest) — wire up real filtering and sorting against live data | Filter/search/sort works on real resources |
| B4 | ✅ Share/unshare: wire `ShareResourceDialog` and per-resource share actions to RTDB | Share with a student, confirm in DB |
| B5 | ✅ Teacher per-student view: wire to real shared-resources data | Correct resources shown per student |
| B6 | ✅ Student view: wire to real shared-resources data | Student sees only what teacher shared |
| B7 | ✅ Homework editor: wire `InsertMediaDialog` — insert real resource from library (inserts into Quill + auto-shares with current student); Upload tab calls `uploadResource` so file lands in `resources/` path and appears in library immediately. `hw.resources` (`Record<string, string>` in `HomeworkInfo`) updated on insert; next auto-save persists it. `video` Quill toolbar button removed (YouTube now handled via InsertMediaDialog). | Full insert + auto-share flow end-to-end; file appears in library after upload; resource map persisted in homework record |
| B8 | ✅ **Auto-add on homework upload**: already satisfied by B7 — the Upload tab in InsertMediaDialog calls `uploadResource`, creating a Resource entry | Upload a file in a homework draft → check Resources page → entry visible |
| B9 | **Resource Details page** (`/resources/:resourceId`): shows all homework references (grouped by student); Delete button blocked with tooltip until list is empty; clicking Delete on `ResourceCard` while references exist shows a blocking dialog linking to this page instead of a "delete anyway" prompt | Navigate to details page; confirm delete is blocked while refs exist; clears and deletes successfully once refs removed |
| B9b | **Import existing uploads**: run `importExistingUploads` for the teacher's `users/{uid}/files/` Storage prefix — creates Resource entries for all previously-uploaded files | All historic uploads visible in Resources page |
| B10 | ✅ **Hard-delete on resource delete**: already implemented in B1 — `deleteResource` calls `deleteObject` after RTDB soft-delete | Delete a resource → Storage file disappears |
| B11 | **Deduplication**: run `deduplicateResources` — detect duplicate Storage files (by `fileName` + file size), keep earliest entry as canonical, re-point all shared-resource refs and homework HTML `src`/`data` URLs, hard-delete duplicate Storage files | Duplicate resources consolidated; homework content still renders correctly |
| B12 | Localization: add RO_RO strings for all new components | Switch to Romanian, all text translated |

---

## Verification

1. **Teacher upload flow**: Go to `/resources`, upload a PDF → confirm it appears in the list with correct title and tag.
2. **Tag filter + search + sort**: Upload several resources with different tags → filter, search, sort → correct subsets shown.
3. **Share per-resource**: On a resource card, open Share dialog, select students A and B → navigate to `/resources/student/{A}` and `/resources/student/{B}` → resource appears for both.
4. **Share per-student**: From Students page, click Resources for student C → add a resource → verify at `/resources/teacher/{teacherId}` while logged in as student C.
5. **Revoke**: Unshare resource from student A → confirm it disappears from their view.
6. **Homework insert from library**: Open a student's homework draft → click image button in Quill toolbar → Library tab → Insert a PDF → confirm PdfBlot appears in editor → confirm resource is now shared with that student (auto-share).
7. **Homework upload via dialog**: Open homework draft → click image button → Upload tab → choose a file → confirm upload progress dialog shows → file embedded in editor → file appears in Resources page library.
8. **Student view**: Log in as student → go to Subjects page → click Resources on a teacher card → confirm only shared resources are visible; no edit actions.
9. **Delete resource**: Delete a resource from the library → confirm it's gone from all students' shared views, soft-deleted in RTDB, and the Storage file is removed.
10. **Import existing uploads**: Run `importExistingUploads` → confirm all historic files appear in the Resources page.
11. **Deduplication**: Upload the same file twice → run `deduplicateResources` → confirm only one entry remains; any homework entries that referenced the duplicate URL still render.
12. **Run `npm test`** — write tests for `uploadResource`, `shareResource`, `unshareResource`, `deleteResource`, `importExistingUploads`, `deduplicateResources` mocking Firebase.
