import { notificationTexts } from './notificationTexts'
import { SupportedLocale } from './SupportedLocale'

// These are read in a mail client, by someone who may not have the site open, so the shape of the
// message matters as much as the words: a paragraph that is absent has to leave no gap, and an
// optional one that is present has to be separated like the rest.

const RO = notificationTexts(SupportedLocale.RO_RO)
const EN = notificationTexts(SupportedLocale.EN_US)

describe('cancellation by the teacher', () => {
  test('reads as a letter, with the makeup line when one is offered', () => {
    const { subject, text } = RO.canceledByTeacher(
      'Florin',
      'Susanna',
      'luni, 19 oct. 2026, 16:30',
      0,
      'I have a doctor’s appointment.',
      true
    )
    expect(subject).toBe('Lecția de luni, 19 oct. 2026, 16:30 a fost anulată')
    expect(text).toBe(
      [
        'Bună, Florin,',
        'Susanna a anulat lecția de luni, 19 oct. 2026, 16:30.',
        'Motiv: I have a doctor’s appointment.',
        'Susanna te va contacta pentru a programa o lecție de recuperare.',
        'https://vioara-cu-susanna.ro'
      ].join('\n\n')
    )
  })

  // The absent paragraphs are the interesting case: a blank "Motiv:" or a dangling empty line
  // would be the sort of thing nobody notices until a parent reads it.
  test('leaves no gap where a reason and a makeup are missing', () => {
    const { text } = EN.canceledByTeacher(
      'Ana',
      'Susanna',
      'Mon 19 Oct, 16:30',
      0,
      undefined,
      false
    )
    expect(text).toBe(
      [
        'Hello Ana,',
        'Susanna has cancelled the lesson on Mon 19 Oct, 16:30.',
        'https://vioara-cu-susanna.ro'
      ].join('\n\n')
    )
  })

  test('counts the lessons swept up behind the one that was clicked', () => {
    expect(EN.canceledByTeacher('Ana', 'Susanna', 'Mon', 1, undefined, false).text).toContain(
      '1 later lesson has been cancelled as well.'
    )
    expect(EN.canceledByTeacher('Ana', 'Susanna', 'Mon', 3, undefined, false).text).toContain(
      '3 later lessons have been cancelled as well.'
    )
  })
})

describe('cancellation by the student', () => {
  // The teacher is the only one told about billing — the student was told the terms before they
  // committed, and the app does not track payment.
  test('tells the teacher whether it was in good time', () => {
    expect(EN.canceledByStudent('Ana', 'Mon', 0, 'Flu', true).text).toContain(
      'This was inside the cancellation window.'
    )
    expect(EN.canceledByStudent('Ana', 'Mon', 0, 'Flu', false).text).toContain(
      'This was outside the cancellation window.'
    )
  })

  test('says so plainly when no reason was given', () => {
    expect(EN.canceledByStudent('Ana', 'Mon', 0, undefined, false).text).toContain(
      'No reason was given.'
    )
    expect(RO.canceledByStudent('Ana', 'luni', 0, undefined, false).text).toContain(
      'Nu a fost dat niciun motiv.'
    )
  })
})
