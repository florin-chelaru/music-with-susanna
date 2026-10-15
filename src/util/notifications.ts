import { get, ref } from 'firebase/database'
import { auth, database } from '../store/Firebase'
import { SupportedLocale } from './SupportedLocale'
import { Email, notificationTexts } from './notificationTexts'
import { formatDateTime } from './schedulingDates'
import { userPath } from './schedulingPaths'
import { localeOf } from './userLocale'

// Sending the scheduling notifications.
//
// Everything goes through the `sendEmail` cloud function, which holds the Gmail credentials and
// decides who may write to whom: it reads `teachers/{uid}/students` or `students/{uid}/teachers`
// and refuses any address outside that set. So a notification can only ever reach someone the
// sender already has a teaching relationship with, and there is nothing to check here.
//
// Every send is best-effort. A lesson that was cancelled is cancelled whether or not the mail
// went out, and an error here must never roll back or obscure what the database already accepted
// — the caller decides whether a failure is worth showing. See `notifyQuietly`.

const SEND_EMAIL_ENDPOINT = 'https://europe-west1-music-with-susanna.cloudfunctions.net/sendEmail'

/** The iCalendar part, when a message is about one specific lesson. */
export interface CalendarEvent {
  /** The lesson id, so a client can match a cancellation to the invite it received. */
  uid: string
  title: string
  /** ISO strings — the function parses them with `new Date()`. */
  start: string
  end: string
  location?: string
  description?: string
  method?: 'request' | 'cancel'
  /** Must rise with each message about the same `uid`, or clients ignore the later one. */
  sequence?: number
}

export interface EmailMessage {
  to: string
  subject: string
  text?: string
  html?: string
  calendarEvent?: CalendarEvent
}

/**
 * Posts one message to the cloud function.
 *
 * The token is fetched per call rather than taken from `user.accessToken`, which `UserProvider`
 * captures once at sign-in. Firebase ID tokens last an hour, so a tab left open all afternoon
 * holds a stale one — and the first thing anyone would notice is a cancellation notice that
 * never arrived. `getIdToken()` hands back the cached token and refreshes it near expiry.
 *
 * Failures are thrown, not swallowed: this is the layer that knows what went wrong, and the
 * callers are the ones that know whether the user should hear about it.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Not signed in')

  const response = await fetch(SEND_EMAIL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(message)
  })

  if (!response.ok) {
    // The function sends plain text on failure, not JSON — reading it as JSON would replace the
    // real reason with a parse error.
    throw new Error(`sendEmail ${response.status}: ${await response.text()}`)
  }
}

/**
 * Send and forget, logging anything that goes wrong.
 *
 * Used wherever the database write has already succeeded. The alternative — surfacing every mail
 * failure — would tell a student their cancellation failed when it did not.
 */
function notifyQuietly(send: Promise<unknown>): void {
  void send.catch((error) => {
    console.error(`Notification not sent: ${String(error)}`)
  })
}

// ─── Recipients ───────────────────────────────────────────────────────────────

interface Recipient {
  uid: string
  name: string
  email: string
  locale: SupportedLocale
}

/**
 * Who to write to and in which language.
 *
 * Returns null when there is no address to write to, which is the one failure worth being quiet
 * about: an account with no email is a studio bookkeeping matter, not something to interrupt
 * whoever happens to be cancelling a lesson.
 */
async function recipientOf(uid: string): Promise<Recipient | null> {
  const [snapshot, locale] = await Promise.all([get(ref(database, userPath(uid))), localeOf(uid)])
  const user = snapshot.val() as { name?: string; email?: string } | null
  if (!user?.email) return null
  return { uid, name: user.name ?? user.email, email: user.email, locale }
}

/** Looks the recipient up, writes in their language, sends. */
async function writeTo(
  uid: string,
  compose: (texts: ReturnType<typeof notificationTexts>, recipient: Recipient) => Email,
  calendarEvent?: CalendarEvent
): Promise<void> {
  const recipient = await recipientOf(uid)
  if (!recipient) return
  const { subject, text } = compose(notificationTexts(recipient.locale), recipient)
  await sendEmail({ to: recipient.email, subject, text, calendarEvent })
}

// ─── The notifications ────────────────────────────────────────────────────────

/** Every date in an email carries its weekday — it is read away from any calendar. */
const when = (at: number, locale: SupportedLocale): string =>
  formatDateTime(at, locale, { weekday: true })

/** A round has opened: ask every enrolled student for their availability. */
export function notifyRoundOpened(
  studentIds: string[],
  teacherName: string,
  semesterName: string,
  deadline: number
): void {
  studentIds.forEach((studentId) => {
    notifyQuietly(
      writeTo(studentId, (texts, to) =>
        texts.roundOpened(to.name, teacherName, semesterName, when(deadline, to.locale))
      )
    )
  })
}

/** A student has answered: tell their teacher, who is waiting on the last of them. */
export function notifySubmissionReceived(
  teacherId: string,
  studentName: string,
  semesterName: string
): void {
  notifyQuietly(writeTo(teacherId, (texts) => texts.submissionReceived(studentName, semesterName)))
}

/** The timetable is settled: tell each student what they got. */
export function notifyScheduleConfirmed(
  lessonsByStudent: Record<string, { count: number; firstStart: number }>,
  semesterName: string
): void {
  Object.entries(lessonsByStudent).forEach(([studentId, summary]) => {
    notifyQuietly(
      writeTo(studentId, (texts, to) =>
        texts.scheduleConfirmed(
          to.name,
          semesterName,
          summary.count,
          when(summary.firstStart, to.locale)
        )
      )
    )
  })
}

export interface CanceledLessonNotice {
  /** The lesson the person actually clicked on; any others were swept up behind it. */
  lessonId: string
  start: number
  end: number
  /** How many *further* lessons went with it, from "cancel all remaining". */
  alsoAfter: number
  reason?: string
  /** What the invite carried, so the cancellation supersedes it rather than being ignored. */
  calendarSequence: number
}

/**
 * A lesson was called off: tell whoever did not do it.
 *
 * One message however many lessons went, rather than twenty: a student who cancels the rest of
 * their term should not bury their teacher. The count travels in the text instead.
 *
 * The iCalendar part only rides along for a single lesson, for the same reason — and because one
 * message can carry one event. A swept-up bundle leaves those later lessons in the recipient's
 * calendar; `Step R`'s export is what will eventually clear them.
 */
export function notifyLessonCanceled(
  recipientId: string,
  notice: CanceledLessonNotice,
  by: { teacherName: string; studentName: string; canceledByTeacher: boolean },
  options: { subject: string; makeupOffered: boolean; withinWindow: boolean }
): void {
  const calendarEvent: CalendarEvent | undefined =
    notice.alsoAfter === 0
      ? {
          uid: notice.lessonId,
          title: options.subject,
          start: new Date(notice.start).toISOString(),
          end: new Date(notice.end).toISOString(),
          method: 'cancel',
          // One past whatever the invite carried. A client ignores a cancellation that does not
          // outrank the event it already holds.
          sequence: notice.calendarSequence + 1
        }
      : undefined

  notifyQuietly(
    writeTo(
      recipientId,
      (texts, to) =>
        by.canceledByTeacher
          ? texts.canceledByTeacher(
              to.name,
              by.teacherName,
              when(notice.start, to.locale),
              notice.alsoAfter,
              notice.reason,
              options.makeupOffered
            )
          : texts.canceledByStudent(
              by.studentName,
              when(notice.start, to.locale),
              notice.alsoAfter,
              notice.reason,
              options.withinWindow
            ),
      calendarEvent
    )
  )
}
