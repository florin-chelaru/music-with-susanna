import { SupportedLocale } from './SupportedLocale'
import { subjectLabel } from './User'

// `subject` is free text on the teacher's user record, so the map can never be complete. What
// matters is that a known subject is translated and an unknown one is still shown.

describe('subjectLabel', () => {
  test('translates a subject it knows', () => {
    expect(subjectLabel('violin', SupportedLocale.RO_RO)).toBe('vioară')
  })

  test('falls back to the wording the teacher typed', () => {
    // English has no entries at all — the stored value is already English.
    expect(subjectLabel('violin', SupportedLocale.EN_US)).toBe('violin')
    // And a subject nobody anticipated survives intact rather than disappearing.
    expect(subjectLabel('Baroque lute', SupportedLocale.RO_RO)).toBe('Baroque lute')
  })

  test('matches regardless of how the teacher cased or spaced it', () => {
    expect(subjectLabel('  Violin ', SupportedLocale.RO_RO)).toBe('vioară')
  })
})
