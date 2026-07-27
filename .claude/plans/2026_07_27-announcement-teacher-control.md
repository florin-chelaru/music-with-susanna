# Plan: Teacher-Controlled Announcement Banner

## Context

The announcement banner is currently driven by a hardcoded `SHOW_ANNOUNCEMENT: boolean = true` constant and text hardcoded in `Announcement.tsx`. The teacher has no way to toggle visibility or change the text without a code deploy. This plan moves the announcement state and content to Firebase RTDB so the logged-in teacher can manage it from the UI.

---

## RTDB Schema (new path)

Keys for the per-locale objects use the `SupportedLocale` enum values (`'enUS'`, `'roRO'`).

```
/announcement:
  visible: boolean          # global on/off toggle
  enUS:
    title: string           # e.g. "NOW ACCEPTING STUDENTS FOR 2025-2026"
    body:  string           # e.g. "Click here to contact me and schedule a trial lesson."
  roRO:
    title: string
    body:  string
```

The `body` field supports inline HTML (e.g. `<a href="...">text</a>`). It is rendered via `dangerouslySetInnerHTML` — safe because only teachers (trusted single user) can write to this field.

---

## Firebase Security Rules (manual step)

Add to `rules.json` alongside the existing `posts`, `videos`, etc. entries:

```json
"announcement": {
  ".read": true,
  ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'teacher'"
}
```

Must be applied in the Firebase console (rules are not in the repo).

---

## Files to modify

### 1. `src/store/AnnouncementProvider.tsx`

- **Remove** `SHOW_ANNOUNCEMENT` constant.
- **Add** `AnnouncementData` type (locale keys match `SupportedLocale` values):
  ```ts
  export interface AnnouncementLocaleData {
    title: string
    body: string
  }
  export interface AnnouncementData {
    visible: boolean
    [SupportedLocale.EN_US]: AnnouncementLocaleData  // key = 'enUS'
    [SupportedLocale.RO_RO]: AnnouncementLocaleData  // key = 'roRO'
  }
  ```
- **Expand** `AnnouncementHandler` interface:
  ```ts
  loading: boolean
  data: AnnouncementData | null
  update(data: AnnouncementData): Promise<void>  // teacher only
  ```
- **`hidden` logic** in `AnnouncementProvider`: `AnnouncementProvider` is inside `UserProvider` in `App.tsx`, so it can call `useUser()`.
  - For **teachers**: `hidden = false` (always render the component so they can manage it)
  - For **others**: `hidden = !data?.visible || localStorage cookie || loading`
- **RTDB subscription**: `onValue(ref(database, 'announcement'), snap => setData(snap.val()))` in a `useEffect`.
- **`update` function**: `await set(ref(database, 'announcement'), newData)` — same pattern as `VideoChannel.tsx:302`.
- Keep `hide()` (per-user localStorage dismiss) for non-teachers.

### 2. `src/Components/Announcement.tsx`

- **Remove** hardcoded `EN_US` / `RO_RO` text objects.
- **Render** title and body from `announcementManager.data[localeManager.currentLocale]` — e.g. `data[SupportedLocale.EN_US]` — falling back to empty strings gracefully while loading.
- **Body rendered as HTML**: `<span dangerouslySetInnerHTML={{ __html: localeData.body }} />` — the teacher can embed `<a href="...">` links directly in the body text. The old hardcoded `<Link>` wrapping the entire body is removed.
- **Teacher edit UI** (only when `user.role === UserRole.TEACHER`):
  - Add an edit icon button (`EditIcon`) in the Alert's `action` prop area.
  - If `!data?.visible`: render the Alert with `severity="warning"` and a label like "(hidden from public)" so the teacher can see and edit even when the banner is off.
  - Clicking the edit button opens a MUI `Dialog` with:
    - `Switch` — "Show announcement" (controls `visible`)
    - `TextField` (multiline) — EN Title
    - `TextField` (multiline) — EN Body (accepts plain text or inline HTML)
    - `TextField` (multiline) — RO Title
    - `TextField` (multiline) — RO Body
    - Save / Cancel `Button`s
  - On Save: call `announcementManager.update(editedData)`.
- Localize the dialog UI labels (edit button tooltip, dialog title, field labels, save/cancel) via the existing `localeManager.registerComponentStrings` pattern already in this file.

### 3. No changes needed in other pages

All five places that render `!announcementManager.hidden && <Announcement />` continue to work as-is because:
- For teachers, `hidden` is now always `false`, so the component always renders and handles its own teacher-only display logic internally.
- For visitors/students, `hidden` reflects the RTDB `visible` flag.

---

## Seed / initial state

On first load with no `/announcement` node in RTDB:
- `data === null`, `loading: false`
- `hidden` = `true` for non-teachers (no banner shown)
- Teacher sees the Alert in warning/"hidden" state with an edit button; saving for the first time creates the node.

Pre-populate the RTDB node manually (or via the save flow) with the current hardcoded text:
- `enUS.title`: `"NOW ACCEPTING STUDENTS FOR SCHOOL YEAR 2025-2026 IN VALEA LUPULUI AND IN IAȘI!"`
- `enUS.body`: `"Click here to contact me and schedule a trial lesson."`
- `roRO.title`: `"AU ÎNCEPUT ÎNSCRIERILE PENTRU ANUL ȘCOLAR 2025-2026, ÎN VALEA LUPULUI ȘI ÎN IAȘI!"`
- `roRO.body`: `"Contactează-mă pentru a programa o lecție de probă."`
- `visible: true`

---

## Verification

1. Run `npm start`.
2. Logged out — banner shows normally if `visible: true` in RTDB; hidden if `visible: false`.
3. Log in as teacher — banner always visible with edit (pencil) icon.
4. Click edit icon — dialog opens with current text populated.
5. Toggle "Show announcement" off → Save → banner disappears for logged-out users; teacher still sees it in warning style.
6. Edit text fields → Save → banner text updates live (RTDB subscription).
7. Per-user dismiss (X button) still works via localStorage for non-teachers.
