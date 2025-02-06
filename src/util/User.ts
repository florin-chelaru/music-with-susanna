export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher'
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
    if (!this.name) {
      return undefined
    }
    return this.name.split(' ')[0]
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
