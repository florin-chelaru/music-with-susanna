import { SupportedLocale } from './SupportedLocale'
import { firstName, subjectLabel, User } from './User'

// Used in prose a student reads — "Susanna will be in touch" — so a missing name has to come back
// as nothing, leaving the caller to put the generic word there rather than an empty gap.
describe('firstName', () => {
  test('takes the first word of a full name', () => {
    expect(firstName('Susanna Johnson-Chelaru')).toBe('Susanna')
  })

  test('is undefined when there is no name', () => {
    expect(firstName(undefined)).toBeUndefined()
    expect(firstName('')).toBeUndefined()
  })

  test('the User getter answers the same', () => {
    expect(new User({ name: 'Ana Ionescu' }).firstName).toBe('Ana')
    expect(new User({}).firstName).toBeUndefined()
  })
})

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
