# Resources Page State Persistence

## Goal

Persist the resources page state (search filters, sort order, scroll position, and loaded item count) in `localStorage` so that navigating away and back restores the exact same view. All three routes are unified to the same feature set and share logic via a common hook and component.

## Affected routes

| Route | Component |
|---|---|
| `/resources` | `TeacherResourcesPage` |
| `/resources/student/:studentId` | `StudentResourcesPage` |
| `/resources/teacher/:teacherId` | `StudentViewResourcesPage` |

## State to persist (same for all three pages)

| State | Type | localStorage format |
|---|---|---|
| `searchQuery` | `string` | string |
| `selectedTags` | `Set<string>` | `string[]` |
| `selectedTypes` | `Set<ResourceType>` | `ResourceType[]` |
| `sortBy` | `SortOption` | string |
| `visibleCount` | `number` | number |
| `pendingResourceId` | `string \| null` | string (saved on unmount) |

Storage keys are per-route and per-ID to keep each view independent:
- `/resources` → `resources-state:teacher`
- `/resources/student/:studentId` → `resources-state:student:${studentId}`
- `/resources/teacher/:teacherId` → `resources-state:teacher-view:${teacherId}`

---

## Phase 1 — Move `buildTagIndex` to `src/util/resources.ts`

The function is copy-pasted verbatim in all three page files. Move it to `resources.ts` and update imports in all three pages.

---

## Phase 2 — Shared hook: `src/pages/useResourcePageState.ts`

This hook owns all filter/sort/pagination state, the `visibleResources` computation, and localStorage persistence + scroll restoration. Pages import it instead of declaring any of this state themselves.

### Signature

```typescript
function useResourcePageState(resources: Resource[], storageKey: string): {
  searchQuery: string, setSearchQuery: (v: string) => void
  selectedTags: Set<string>, handleTagToggle: (slug: string) => void
  selectedTypes: Set<ResourceType>, handleTypeToggle: (type: ResourceType) => void
  sortBy: SortOption, setSortBy: (v: SortOption) => void
  visibleResources: Resource[]
  pagedResources: Resource[]
  hasMore: boolean
  loadMore: () => void
  tagIndex: Array<{ slug: string; label: string }>
  bookmarkResource: (id: string) => void
}
```

### Filter + sort + pagination

- `visibleResources`: filters `resources` by `searchQuery`, `selectedTags`, `selectedTypes`, then sorts by `sortBy`
- `pagedResources = visibleResources.slice(0, visibleCount)`
- `hasMore = visibleCount < visibleResources.length`
- `loadMore`: increments `visibleCount` by `PAGE_SIZE`
- Filter state is initialized from storage as starting values, so no filter-reset fires on mount and the persisted `visibleCount` is preserved. When the user changes any filter, the wrapped setter also resets `visibleCount` to `PAGE_SIZE`.
- `tagIndex`: computed from `resources`

### Persistence

- On mount, reads initial values from `localStorage[storageKey]` (try/catch, fallback to defaults)
- Writes `searchQuery`, `selectedTags`, `selectedTypes`, `sortBy`, `visibleCount` back to `localStorage` in a single `useEffect`; serializes `Set` values as arrays for JSON
- `pendingResourceId` is written separately on unmount only (see below)

### Scroll position — resource bookmark

Pixel-based scroll position (`scrollY`) is replaced entirely by a semantic resource bookmark. The mechanism:

**Tracking (on scroll):**
- A passive `window` `scroll` listener queries all `[data-resource-id]` DOM elements on each scroll event and finds the "top-most visible card": the last element whose `getBoundingClientRect().top <= TOOLBAR_HEIGHT` (hardcoded to 64px). If no element qualifies (user hasn't scrolled yet), use the first card.
- The found resource ID is stored in a `topResourceRef` (a ref, not state — no re-renders).

**Explicit bookmark (on Details click):**
- `bookmarkResource(id)` updates `topResourceRef.current = id`, overriding the scroll-based bookmark with the exact resource the user navigated to.
- Since the component unmounts immediately after `navigate()`, the cleanup below fires before anything else.

**Persisting (on unmount):**
- The scroll listener's cleanup writes `topResourceRef.current` to localStorage as `pendingResourceId`.
- Because `bookmarkResource` updates the same ref, Details-click bookmarks and scroll-based bookmarks are stored identically.

**Restoring (on data load):**
- A `useEffect` watching `resources.length` fires once data arrives. It reads `initial.current.pendingResourceId`, queries `document.querySelector('[data-resource-id="${id}"]')`, and calls:
  ```
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -TOOLBAR_HEIGHT)
  ```
  The `scrollBy` offset compensates for the sticky toolbar so the card is not hidden behind it.
- A `scrollRestored` ref prevents double-firing.
- If the element is not found (resource deleted or filtered out), restoration is silently skipped.

---

## Phase 3 — Extract `ResourceList` component: `src/Components/ResourceList.tsx`

The `InfiniteScroll` + `Grid2` + `ResourceCard` template is near-identical in all three pages. Extract it as a component.

Each `Grid2` card container carries `data-resource-id={resource.id}` so the scroll restoration hook can query it by ID.

### Props

```typescript
interface ResourceListProps {
  resources: Resource[]
  hasMore: boolean
  loadMore: () => void
  expandedMap: Record<string, boolean>
  onExpandedChange: (id: string, value: boolean) => void
  editable?: boolean
  onEdit?: (r: Resource) => void
  onDelete?: (r: Resource) => void
  onDetails?: (r: Resource) => void
  getFooter?: (r: Resource) => ReactNode
}
```

---

## Phase 4 — Wire up all three pages

Replace per-page filter/sort/pagination state and `buildTagIndex` calls with `useResourcePageState(resources, storageKey)`. Replace the `InfiniteScroll` + `Grid2` + `ResourceCard` block with `<ResourceList .../>`.

The `onDetails` handler in each page calls `bookmarkResource(r.id)` before `navigate()`:
```typescript
onDetails={(r) => {
  bookmarkResource(r.id)
  navigate(`/resources/${r.id}`)
}}
```

- `TeacherResourcesPage` → key `'resources-state:teacher'`; pre-filters duplicate resource IDs before passing to hook; retains upload/import/deduplicate dialogs
- `StudentResourcesPage` → key `` `resources-state:student:${studentId}` ``; retains edit/delete dialogs
- `StudentViewResourcesPage` → key `` `resources-state:teacher-view:${teacherId}` ``; no dialogs

---

## What is NOT persisted

- `expandedMap` — card expansion state is ephemeral
- All dialog/action state — clearly transient

## Why restoring `visibleCount` makes scroll restoration reliable

`pagedResources = visibleResources.slice(0, visibleCount)` — the page only renders as many items as `visibleCount` allows. Restoring `visibleCount` ensures the bookmarked card is actually in the DOM when `scrollIntoView` is called.
