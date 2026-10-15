import { SupportedLocale } from './SupportedLocale'

// What the scheduling notifications say, in the reader's language.
//
// Not component strings: these are read in a mail client, by someone who may not have the site
// open, so each one has to stand on its own — who it is about, when, and what to do next. They
// are kept out of the components for the same reason the texts of a letter are not kept in the
// envelope: four different pages send these, and the wording should not depend on which.
//
// Plain text rather than HTML. It renders everywhere, it cannot break, and nothing here needs
// more than paragraphs.

const SITE = 'https://vioara-cu-susanna.ro'

export interface Email {
  subject: string
  text: string
}

export interface NotificationTexts {
  /** To a student: their teacher has opened a round and wants their availability. */
  roundOpened: (student: string, teacher: string, semester: string, deadline: string) => Email
  /** To the teacher: one student has answered. */
  submissionReceived: (student: string, semester: string) => Email
  /** To a student: the timetable is settled. */
  scheduleConfirmed: (
    student: string,
    semester: string,
    lessons: number,
    firstLesson: string
  ) => Email
  /** To the teacher: a student called off a lesson. Says whether it was in good time. */
  canceledByStudent: (
    student: string,
    when: string,
    alsoAfter: number,
    reason: string | undefined,
    withinWindow: boolean
  ) => Email
  /** To a student: their teacher called off a lesson. Never mentions money. */
  canceledByTeacher: (
    student: string,
    teacher: string,
    when: string,
    alsoAfter: number,
    reason: string | undefined,
    makeupOffered: boolean
  ) => Email
}

/** Joins the paragraphs that are present, so an absent one leaves no blank gap. */
function lines(...parts: Array<string | false | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join('\n\n')
}

const EN_US: NotificationTexts = {
  roundOpened: (student, teacher, semester, deadline) => ({
    subject: `When are you free? — ${semester}`,
    text: lines(
      `Hello ${student},`,
      `${teacher} is putting together the timetable for ${semester} and needs to know when you are free.`,
      `Please send your availability by ${deadline}. The more times you mark, the more likely you are to get one that suits you.`,
      SITE
    )
  }),

  submissionReceived: (student, semester) => ({
    subject: `${student} sent their availability`,
    text: lines(`${student} has sent their availability for ${semester}.`, SITE)
  }),

  scheduleConfirmed: (student, semester, lessons, firstLesson) => ({
    subject: `Your lessons for ${semester}`,
    text: lines(
      `Hello ${student},`,
      `Your timetable for ${semester} is settled: ${lessons} lessons, starting ${firstLesson}.`,
      'You can see them all here:',
      SITE
    )
  }),

  canceledByStudent: (student, when, alsoAfter, reason, withinWindow) => ({
    subject: `${student} cancelled a lesson`,
    text: lines(
      `${student} cancelled the lesson on ${when}.`,
      alsoAfter > 0 &&
        `${alsoAfter} later ${alsoAfter === 1 ? 'lesson was' : 'lessons were'} cancelled as well.`,
      reason ? `Reason given: ${reason}` : 'No reason was given.',
      withinWindow
        ? 'This was inside the cancellation window. You can decide whether to bill for it when you acknowledge it.'
        : 'This was outside the cancellation window.',
      SITE
    )
  }),

  canceledByTeacher: (student, teacher, when, alsoAfter, reason, makeupOffered) => ({
    subject: `Lesson on ${when} cancelled`,
    text: lines(
      `Hello ${student},`,
      `${teacher} has cancelled the lesson on ${when}.`,
      alsoAfter > 0 &&
        `${alsoAfter} later ${
          alsoAfter === 1 ? 'lesson has' : 'lessons have'
        } been cancelled as well.`,
      reason ? `Reason given: ${reason}` : undefined,
      makeupOffered ? `${teacher} will be in touch to arrange a makeup lesson.` : undefined,
      SITE
    )
  })
}

const RO_RO: NotificationTexts = {
  roundOpened: (student, teacher, semester, deadline) => ({
    subject: `Când ai timp? — ${semester}`,
    text: lines(
      `Bună, ${student},`,
      `${teacher} pregătește orarul pentru ${semester} și are nevoie să știe când ai timp.`,
      `Trimite-ți disponibilitatea până la ${deadline}. Cu cât marchezi mai multe intervale, cu atât sunt mai mari șansele să primești unul care ți se potrivește.`,
      SITE
    )
  }),

  submissionReceived: (student, semester) => ({
    subject: `${student} și-a trimis disponibilitatea`,
    text: lines(`${student} și-a trimis disponibilitatea pentru ${semester}.`, SITE)
  }),

  scheduleConfirmed: (student, semester, lessons, firstLesson) => ({
    subject: `Lecțiile tale pentru ${semester}`,
    text: lines(
      `Bună, ${student},`,
      `Orarul tău pentru ${semester} este gata: ${lessons} lecții, începând cu ${firstLesson}.`,
      'Le poți vedea pe toate aici:',
      SITE
    )
  }),

  canceledByStudent: (student, when, alsoAfter, reason, withinWindow) => ({
    subject: `${student} a anulat o lecție`,
    text: lines(
      `${student} a anulat lecția de ${when}.`,
      alsoAfter > 0 &&
        `${
          alsoAfter === 1
            ? 'A mai fost anulată 1 lecție ulterioară'
            : `Au mai fost anulate ${alsoAfter} lecții ulterioare`
        }.`,
      reason ? `Motiv: ${reason}` : 'Nu a fost dat niciun motiv.',
      withinWindow
        ? 'Anularea a fost în interiorul ferestrei de anulare. Poți decide dacă lecția se plătește atunci când confirmi anularea.'
        : 'Anularea a fost în afara ferestrei de anulare.',
      SITE
    )
  }),

  canceledByTeacher: (student, teacher, when, alsoAfter, reason, makeupOffered) => ({
    subject: `Lecția de ${when} a fost anulată`,
    text: lines(
      `Bună, ${student},`,
      `${teacher} a anulat lecția de ${when}.`,
      alsoAfter > 0 &&
        `${
          alsoAfter === 1
            ? 'A mai fost anulată 1 lecție ulterioară'
            : `Au mai fost anulate ${alsoAfter} lecții ulterioare`
        }.`,
      reason ? `Motiv: ${reason}` : undefined,
      makeupOffered
        ? `${teacher} te va contacta pentru a programa o lecție de recuperare.`
        : undefined,
      SITE
    )
  })
}

export function notificationTexts(locale: SupportedLocale): NotificationTexts {
  return locale === SupportedLocale.RO_RO ? RO_RO : EN_US
}
