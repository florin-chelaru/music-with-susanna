import { get, ref, set } from 'firebase/database'
import { auth, database } from '../store/Firebase'
import { SupportedLocale } from './SupportedLocale'
import { userLocalePath } from './schedulingPaths'

// Which language to write to someone in.
//
// The app has always kept the chosen locale in localStorage, which is per-browser and invisible
// to anyone else — fine while the only reader was the same tab, useless the moment we send mail.
// An email composed in the sender's language is a coin flip: Susanna working in English would
// write to a Romanian parent in English.
//
// So the choice is mirrored to `/userLocales/{uid}`, readable by any signed-in user and writable
// only by its owner. localStorage stays the source of truth for the UI — it works signed out and
// needs no round trip — and this is the copy other people read.

/** English, when nobody has said otherwise. */
export const FALLBACK_LOCALE = SupportedLocale.EN_US

/**
 * Remember the signed-in user's language.
 *
 * Deliberately not awaited by callers and never throws: someone switching language must not be
 * made to wait for a write, and must not see an error if it fails. Losing it costs one email in
 * the wrong language, which is what we had before.
 */
export function saveMyLocale(locale: SupportedLocale): void {
  const uid = auth.currentUser?.uid
  if (!uid) return
  void set(ref(database, userLocalePath(uid)), locale).catch(() => {})
}

/**
 * Record a language for someone who has never changed one.
 *
 * Without this, nobody has a stored locale until the day they touch the language switch, and
 * every Romanian reader gets English mail until then. Seeding from the browser they are actually
 * using is a better guess than the fallback, and it only ever fills a gap — an explicit choice
 * made later overwrites it, and is never overwritten by it.
 */
export function seedMyLocale(uid: string, locale: SupportedLocale): void {
  void get(ref(database, userLocalePath(uid)))
    .then(async (snapshot) => {
      if (snapshot.exists()) return
      await set(ref(database, userLocalePath(uid)), locale)
    })
    .catch(() => {})
}

/** The language to write to someone in, falling back to English. */
export async function localeOf(uid: string): Promise<SupportedLocale> {
  try {
    const snapshot = await get(ref(database, userLocalePath(uid)))
    const stored = snapshot.val() as string | null
    return stored === SupportedLocale.RO_RO || stored === SupportedLocale.EN_US
      ? stored
      : FALLBACK_LOCALE
  } catch {
    return FALLBACK_LOCALE
  }
}
