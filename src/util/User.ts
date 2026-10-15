import { SupportedLocale } from './SupportedLocale'

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher'
}

/**
 * Translations for the teaching subjects that actually occur.
 *
 * `subject` is free text on the teacher's user record, so no map can be complete. Only the
 * translations away from the stored wording are listed; anything unlisted falls through and is
 * shown exactly as the teacher typed it, which is the one answer that is never wrong.
 */
const SUBJECT_LABELS: Record<string, Record<string, string>> = {
  violin: { [SupportedLocale.RO_RO]: 'vioară' },
  'computer science': { [SupportedLocale.RO_RO]: 'informatică' }
}

/** The subject in the reader's language, or the teacher's own wording when it is not known. */
export function subjectLabel(subject: string, locale: string): string {
  return SUBJECT_LABELS[subject.trim().toLowerCase()]?.[locale] ?? subject
}

/**
 * The first word of a full name — what you call someone.
 *
 * A free function as well as a `User` getter because most places holding a name hold only the
 * name: the scheduling pages read a teacher's directory entry, not a `User`, and constructing one
 * just to take the first word of it would be a strange way to ask.
 */
export function firstName(name: string | undefined): string | undefined {
  return name ? name.split(' ')[0] : undefined
}

export class User {
  uid?: string
  email?: string
  password?: string
  loading?: boolean
  role?: UserRole
  name?: string
  subject?: string
  phone?: string
  parent?: string
  accessToken?: string

  get firstName(): string | undefined {
    return firstName(this.name)
  }

  get lastName(): string | undefined {
    if (!this.name) {
      return undefined
    }
    const names = this.name.split(' ')
    return names.length >= 2 ? names[1] : undefined
  }

  constructor(init?: Partial<User>) {
    if (init) {
      Object.assign(this, init)
    }
  }

  update(other?: Partial<User>) {
    if (other) {
      this.uid = other?.uid ?? this.uid
      this.email = other?.email ?? this.email
      this.password = other?.password ?? this.password
      this.loading = other?.loading ?? this.loading
      this.role = other?.role ?? this.role
      this.name = other?.name ?? this.name
      this.subject = other?.subject ?? this.subject
      this.accessToken = other?.accessToken ?? this.accessToken
    }
  }
}

export const EMPTY_USER: User = new User()
export const LOADING_USER: User = new User({ loading: true })
export const SUSANNA_USER_ID = 'CgOaIwnaE5TPVsiRrsB9krTaC092'
