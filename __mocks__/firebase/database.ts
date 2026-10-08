// Manual mock for firebase/database.
// onValue calls its listener synchronously with null data so tests don't hang.
// Individual tests can override with mockImplementationOnce to push specific data.
export const ref = jest.fn(() => ({}))
export const set = jest.fn(() => Promise.resolve())
export const remove = jest.fn(() => Promise.resolve())
export const get = jest.fn(() => Promise.resolve({ val: () => null }))
export const onValue = jest.fn((_, listener: (snap: { val: () => unknown }) => void) => {
  listener({ val: () => null })
  return jest.fn() // unsubscribe no-op
})
export const push = jest.fn(() => ({ key: 'mock-push-key' }))
export const update = jest.fn(() => Promise.resolve())
