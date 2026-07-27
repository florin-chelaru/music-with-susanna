---
name: testing
description: Testing conventions for this repo — what to test, how to structure tests, and how to mock Firebase. Use when writing any new test file or deciding what to test for a feature.
version: 0.1.0
---

# Testing in music-with-susanna

## Philosophy

**Test the happy path and critical corner cases only.** Do not test every branch or every edge. Ask: "would a real user hit this, or would a real bug be invisible without this?" If no, skip it.

This means:
- One test for the main flow working correctly
- One test per critical safety gate (role checks, null data, error state)
- Skip testing internal implementation details (state variables, private methods)
- Skip testing MUI component behavior (e.g. that a Dialog opens on click) — test what your code does *to* MUI, not MUI itself

---

## Infrastructure

**Stack:** Jest + jsdom (`testEnvironment: "jsdom"`) + ts-jest + React Testing Library

**Key packages:**
- `@testing-library/react` — `render`, `screen`, `renderHook`
- `@testing-library/user-event` — realistic user interactions
- `@testing-library/jest-dom` — matchers like `toBeInTheDocument()`

**Known gap to fix before writing React tests:** `setupFilesAfterEnv` is commented out in `jest.config.js`. Uncomment it to load `src/setupTests.ts` (which imports jest-dom matchers).

---

## Testing layers

| What you're testing | Approach | Firebase mock? |
|---|---|---|
| Pure functions, utilities | Plain Jest, no React | No |
| Context providers (logic) | `renderHook` + real provider | Yes — mock `firebase/database` |
| Components with context | RTL `render` + `renderWithProviders` helper | Only if the component uses a provider that touches Firebase |

---

## Firebase mock

**Two separate mocks are needed — they solve different problems:**

### 1. `__mocks__/firebase/database.ts` (project root, adjacent to `node_modules`)

Mocks RTDB operations (`onValue`, `ref`, `set`, etc.) used at runtime by providers and pages. Jest auto-picks it up for `import ... from 'firebase/database'` — activate it in test files with `jest.mock('firebase/database')`.

### 2. Mock `src/store/Firebase.ts` inline in each test file

`Firebase.ts` calls `initializeApp()`, `getDatabase()`, `getAuth()`, etc. at **module-load time**. If anything in the import chain touches this file (even transitively), the test suite fails with "not a function". Mock it explicitly wherever the chain reaches it:

```ts
jest.mock('../store/Firebase', () => ({ database: {}, auth: {}, storage: {}, analytics: {} }))
```

The path must be relative to the test file. This replaces the whole module, so none of the Firebase initialization code runs. Do **not** add Firebase init functions (`getDatabase`, `getAuth`…) to `__mocks__/firebase/database.ts` — that file is for RTDB operations only.

**Rule of thumb:**
- Test directly uses RTDB functions → add `jest.mock('firebase/database')`
- Test imports anything whose transitive deps touch `Firebase.ts` → add `jest.mock('../store/Firebase', ...)`
- Provider tests usually need both; component tests using a mocked context usually only need the `Firebase.ts` one

**Pattern:**
```ts
// src/__mocks__/firebase/database.ts
export const ref = jest.fn(() => ({}))
export const set = jest.fn(() => Promise.resolve())
export const remove = jest.fn(() => Promise.resolve())
export const get = jest.fn(() => Promise.resolve({ val: () => null }))

// onValue: calls the callback synchronously so tests don't need to await
export const onValue = jest.fn((_, callback) => {
  callback({ val: () => null })
  return jest.fn() // unsubscribe no-op
})
```

To push specific data in a test:
```ts
import { onValue } from 'firebase/database'
const mockOnValue = onValue as jest.Mock
mockOnValue.mockImplementationOnce((_, cb) => {
  cb({ val: () => ({ visible: true, enUS: { title: 'Test', body: 'Body' }, roRO: { title: 'Test RO', body: 'Body RO' } }) })
  return jest.fn()
})
```

---

## Provider wrapper helper

Many components need locale + announcement + user contexts. Create `src/test-utils.tsx`:

```tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AnnouncementContext, AnnouncementHandler, AnnouncementData } from './store/AnnouncementProvider'
import LocaleProvider from './store/LocaleProvider'
import { UserContext } from './store/UserProvider'
import { User } from './util/User'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: Partial<User>
  announcement?: Partial<AnnouncementHandler>
}

const DEFAULT_ANNOUNCEMENT: AnnouncementHandler = {
  hidden: false,
  loading: false,
  data: null,
  hide: jest.fn(),
  update: jest.fn(() => Promise.resolve()),
}

export function renderWithProviders(
  ui: ReactElement,
  { user, announcement, ...options }: RenderWithProvidersOptions = {}
) {
  const mockAnnouncement = { ...DEFAULT_ANNOUNCEMENT, ...announcement }
  const mockUserContext = user
    ? { user: { uid: 'u1', email: 'test@test.com', role: undefined, ...user }, dispatch: jest.fn() }
    : undefined

  return render(
    <MemoryRouter>
      <LocaleProvider>
        {mockUserContext ? (
          <UserContext.Provider value={mockUserContext}>
            <AnnouncementContext.Provider value={mockAnnouncement}>
              {ui}
            </AnnouncementContext.Provider>
          </UserContext.Provider>
        ) : (
          <AnnouncementContext.Provider value={mockAnnouncement}>
            {ui}
          </AnnouncementContext.Provider>
        )}
      </LocaleProvider>
    </MemoryRouter>,
    options
  )
}
```

---

## File naming

Co-locate tests with the file they test:
- `src/store/AnnouncementProvider.test.tsx` → tests for `AnnouncementProvider.tsx`
- `src/Components/Announcement.test.tsx` → tests for `Announcement.tsx`

---

## Running tests

```bash
npm test                              # all tests
npx jest src/Components/Announcement  # one file
npx jest --watch                      # watch mode
```
