// Manual mock for firebase/auth.
// onAuthStateChanged reports "signed out" synchronously and hands back a no-op unsubscribe, so a
// component that watches auth — LocaleProvider does, to remember the reader's language — can
// mount against the stubbed `auth` object the tests provide.
export const onAuthStateChanged = jest.fn((_auth, listener: (user: unknown) => void) => {
  listener(null)
  return jest.fn() // unsubscribe no-op
})
export const getAuth = jest.fn(() => ({}))
