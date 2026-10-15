import { nextPath } from './authRedirect'

// `next` arrives from a URL, which means it arrives from anyone who can get a link in front of
// someone. The only thing standing between that and an open redirect is this function.

describe('nextPath', () => {
  test('returns a path on this site', () => {
    expect(nextPath('?next=%2Fschedule%2Frounds%2Ft1%2Fs1%2Fr1')).toBe('/schedule/rounds/t1/s1/r1')
  })

  test('keeps a query string the destination needs', () => {
    expect(nextPath('?next=%2Fschedule%3Fhl%3DroRO')).toBe('/schedule?hl=roRO')
  })

  test('is null when there is nothing to resume', () => {
    expect(nextPath('')).toBeNull()
    expect(nextPath('?hl=roRO')).toBeNull()
  })

  // A login page that will forward anywhere is a login page worth phishing with: the link looks
  // like ours, asks for a password, and lands somewhere that is not us.
  test('refuses anywhere that is not this site', () => {
    expect(nextPath('?next=https%3A%2F%2Fevil.example')).toBeNull()
    expect(nextPath('?next=%2F%2Fevil.example')).toBeNull()
    expect(nextPath('?next=javascript%3Aalert(1)')).toBeNull()
  })
})
