# Resources Feature Spec

## Context

Currently, each student's workspace is completely isolated. A teacher with 5 students who all work on the same material must upload the same PDF, audio, or image file separately for each student. This feature introduces a **Teacher Resource Library** — a central store of uploaded files and links that the teacher can share selectively with individual students and embed directly into homework entries.

---

## Summary of Decisions

| Dimension | Decision |
|---|---|
| Resource types | PDF, audio, image, YouTube/external link |
| Storage | Single upload, shared by URL reference — no per-student copies |
| Organization | Tags + search bar |
| Sharing | Either direction: per-resource (pick students) or per-student (pick resources) |
| Insert into homework | From inside the homework editor, open a library picker |
| Auto-share on insert | Yes — inserting a resource into a student's homework also shares it with them |
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
  tags: { [tagSlug]: true }
  createdAt: number

/resource-tags/{teacherId}/{tagSlug}: tagLabel   # teacher's tag registry

/shared-resources/{teacherId}/students/{studentId}/{resourceId}: true
```

**Soft-delete**: deletions move `resources/teachers/{teacherId}/{resourceId}` to `/deleted/resources/teachers/{teacherId}/{resourceId}` before removal, consistent with existing pattern.

---

## Firebase Storage (additions)

New path for teacher-owned shared resources:
```
resources/{teacherUid}/{resourceId}/{originalFilename}
```
Uploaded once; all sharing is by URL reference. This is separate from the existing per-homework upload path (`users/{uid}/files/…`), which remains unchanged.

---

## New Routes

| Path | Who sees it | Purpose |
|---|---|---|
| `/resources` | Teacher only | Full resource library |
| `/resources/student/:studentId` | Teacher only | Resources shared with a specific student |
| `/resources/teacher/:teacherId` | Student only | Resources a teacher shared with current student |

These mirror the existing `/homework/:teacherId/:studentId` pattern.

---

## Navigation Changes

### `src/data/RouteInfo.tsx`
- Add three new route entries (with `hiddenFromAppBar` handling — see below).

### `src/Components/DrawerAppBar.tsx`
- Teacher sees a **Resources** nav item pointing to `/resources`.
- Students do not get a top-level nav item; they access resources via the Subjects page.

### `src/pages/StudentsPage.tsx`
- Add a third action link in each student accordion: **"Resources"** → `/resources/student/:studentId`.
- Sits alongside the existing Homework and Delete actions.

### `src/pages/SubjectsPage.tsx`
- Add a second action link in each teacher accordion: **"Resources"** → `/resources/teacher/:teacherId`.
- Sits alongside the existing Homework action.

---

## New Pages

### `src/pages/TeacherResourcesPage.tsx`
Full library view for the teacher. Accessible at `/resources`.

Layout (two-column, mirrors Homework page):
- **Left column** (`sm=9 md=10`): page header row (title + Expand All / Collapse All button), resource list one card per row
- **Right column** (`sm=3 md=2`, hidden on mobile): sticky `TableOfContents` with nested entries — each unique tag is a top-level entry with its resource titles as indented children; clicking any entry scrolls to that resource card. Reuses `TableOfContents` + `scrollToElement`.
- **Mobile**: TOC shown as a horizontal list at the top of the page before the cards
- Page manages `Record<resourceId, boolean>` expanded map + `useRef<Map<resourceId, RefObject<div>>>` for scroll targets
- FAB or top-right button to upload a new resource (`ResourceUploadDialog`)

### `src/pages/StudentResourcesPage.tsx`
Shared view rendered both for:
- Teacher visiting `/resources/student/:studentId` (sees what they shared with that student; can add/remove)
- Student visiting `/resources/teacher/:teacherId` (read-only view of what the teacher shared)

Internally, the component receives a `role` prop or detects it from `UserContext`, then enables/disables edit actions accordingly.

---

## New Components

### `src/Components/ResourceCard.tsx`
Displays a single resource:
- Type icon (PictureAsPdf, Audiotrack, Image, YouTube)
- Title
- Tag chips
- Expand/collapse chevron button (using existing `ExpandMoreButton`) — only shown when resource has a URL
- Embedded preview inside a `Collapse`: `<audio controls>`, `<object type="application/pdf">`, `<img>`, or `<iframe>` (YouTube)
- **Controlled expanded state** via `expanded: boolean` + `onExpandedChange` props (parent drives expand-all/collapse-all)
- **Teacher actions**: Share (pick students), Unshare (from student view), Edit title/tags, Delete
- **Student view**: Open-in-new-tab button only

### `src/Components/ResourceUploadDialog.tsx`
Dialog for creating a new resource:
- Type selector: PDF / Audio / Image / YouTube link
- File picker (for PDF/audio/image) or URL field (for YouTube)
- Title input (defaults to filename)
- Tag input (autocomplete from existing tags, free-form new tags)

Writes to Firebase Storage then RTDB on confirm.

### `src/Components/ResourcePickerDialog.tsx`
Used **inside the homework editor** to insert a resource from the library.
- Search bar + tag filters (same as library page)
- Resource list with Insert buttons
- On insert: embeds using the appropriate existing Quill blot (`PdfBlot`, `AudioBlot`, `ImageWithSize`) or a new `YouTubeBlot`
- Auto-shares the resource with the current student (writes to `/shared-resources/…`)

### `src/Components/ShareResourceDialog.tsx`
Dialog for sharing a resource with one or more students:
- Checkbox list of the teacher's students
- Pre-checks students who already have access
- On confirm: writes/removes entries in `/shared-resources/…`

### `src/TableOfContents.tsx` (extended, backwards-compatible)
`TocEntry.ref` made optional; new optional `children?: TocEntry[]` field added. Children render indented below their parent with lighter font weight. Clicking any entry (parent or child) scrolls to its ref. Homework page is unaffected.

### `src/Components/ResourceTagFilter.tsx`
Reusable search + tag filter bar used in both `TeacherResourcesPage` and `ResourcePickerDialog`.

---

## Homework Editor Changes

### `src/Components/EditorCard.tsx`
Add an **"Insert from Library"** button/icon to the Quill toolbar (or as a secondary button above the editor for the teacher role). Clicking it opens `ResourcePickerDialog`.

### `src/util/quill.ts`
Add a `YouTubeBlot` for embedding YouTube links inline (renders an `<iframe>` or a styled anchor with thumbnail). The existing three blots (PdfBlot, AudioBlot, ImageWithSize) cover the other resource types.

---

## Data Hooks / Utilities

New file: `src/util/resources.ts`

| Function | Description |
|---|---|
| `useTeacherResources(teacherId)` | RTDB subscription to `/resources/teachers/{teacherId}` |
| `useSharedResources(teacherId, studentId)` | Subscription to `/shared-resources/{teacherId}/students/{studentId}` |
| `useResourceTags(teacherId)` | Subscription to `/resource-tags/{teacherId}` |
| `uploadResource(teacherId, file, metadata)` | Uploads file to Storage, writes RTDB entry, returns resourceId |
| `addYouTubeResource(teacherId, url, metadata)` | Writes RTDB entry (no file upload) |
| `shareResource(teacherId, studentId, resourceId)` | Writes `true` to shared-resources path |
| `unshareResource(teacherId, studentId, resourceId)` | Removes entry from shared-resources |
| `deleteResource(teacherId, resourceId)` | Soft-deletes RTDB entry, removes Storage file, cleans up all shared-resource refs |
| `updateResourceMetadata(teacherId, resourceId, patch)` | Updates title/tags |

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

Each milestone is visible in the running app (`npm start`) on a real route. New routes are added from A1 onward. Components that aren't yet their own page are placed on the `/resources` stub so they can be reviewed immediately.

| # | Milestone | How to see it | What to review |
|---|---|---|---|
| A1 | Add `/resources` route + `TeacherResourcesPage` stub + `ResourceCard` component — renders a hardcoded list of 3–4 mock resources (one of each type), one card per row, each card with embedded inline preview (`<audio>`, `<object>` for PDF, `<img>`, YouTube `<iframe>`), expand/collapse chevron per card, and Expand All / Collapse All button in page header | Navigate to `/resources` | Card layout, embedded previews, expand/collapse UX |
| A2 | Add `ResourceTagFilter` to the `/resources` page — search bar + tag chips above the list (no-op filtering for now) | `/resources` | Search/filter bar UX |
| A3 | `ResourceUploadDialog` — FAB on `/resources` opens it; form UI only (no upload yet) | Click FAB on `/resources` | Form layout, field order, type selector, tag input |
| A4 | `ShareResourceDialog` — "Share" action on a mock `ResourceCard` opens it; mock student list; no writes | Click Share on any card on `/resources` | Checkbox list UX, confirm/cancel |
| A5 | Add `/resources/student/:studentId` route — same layout as `/resources` but with a "shared with [name]" header; mock add/remove actions | Navigate to `/resources/student/mock-id` (or link from Students page) | Distinguish from full library; remove button clarity |
| A6 | Add `/resources/teacher/:teacherId` route — same mock data, but no edit/share/delete actions (student perspective) | Navigate to `/resources/teacher/mock-id` | Confirm only open/download controls visible |
| A7 | `ResourcePickerDialog` — add a temporary "Pick from Library" button to the Homework page that opens it; mock resource list with Insert (no-op) | Open any homework entry as teacher | Picker UX inside the editor context |
| A8 | Navigation wiring: Resources nav item for teacher; Resources link in each student accordion (Students page); Resources link in each teacher accordion (Subjects page) — all routes now reachable by clicking | Click through from nav and page links | End-to-end navigation flow, correct pages load |

### Phase B — Data layer + Firebase wiring

| # | Milestone | What to review |
|---|---|---|
| B1 | `src/util/resources.ts` — hooks and CRUD functions with unit tests (no UI changes) | Tests pass |
| B2 | Teacher Resources page: replace mock data with real RTDB subscription; upload dialog writes to Storage + RTDB | Upload a real file, see it appear |
| B3 | Tag filter + search: wire up real filtering against live data | Filter/search works on real resources |
| B4 | Share/unshare: wire `ShareResourceDialog` and per-resource share actions to RTDB | Share with a student, confirm in DB |
| B5 | Teacher per-student view: wire to real shared-resources data | Correct resources shown per student |
| B6 | Student view: wire to real shared-resources data | Student sees only what teacher shared |
| B7 | Homework editor: wire `ResourcePickerDialog` — insert real resource into Quill + auto-share | Full insert + auto-share flow end-to-end |
| B8 | Localization: add RO_RO strings for all new components | Switch to Romanian, all text translated |

---

## Verification

1. **Teacher upload flow**: Go to `/resources`, upload a PDF → confirm it appears in the list with correct title and tag.
2. **Tag filter + search**: Upload two resources with different tags → filter by tag → correct subset shown; search by partial title → correct result.
3. **Share per-resource**: On a resource card, open Share dialog, select students A and B → navigate to `/resources/student/{A}` and `/resources/student/{B}` → resource appears for both.
4. **Share per-student**: From Students page, click Resources for student C → add a resource to their view → verify at `/resources/teacher/{teacherId}` while logged in as student C.
5. **Revoke**: Unshare resource from student A → confirm it disappears from their view.
6. **Homework insert**: Open a student's homework draft → click "Insert from Library" → pick a PDF → confirm PdfBlot appears in editor → confirm resource is now shared with that student (auto-share).
7. **Student view**: Log in as student → go to Subjects page → click Resources on a teacher card → confirm only shared resources are visible; no edit actions.
8. **Delete resource**: Delete a resource from the library → confirm it's gone from all students' shared views and soft-deleted in RTDB.
9. **Run `npm test`** — write tests for `uploadResource`, `shareResource`, `unshareResource`, `deleteResource` mocking Firebase.
