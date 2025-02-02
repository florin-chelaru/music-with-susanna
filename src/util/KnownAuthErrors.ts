export enum KnownAuthErrors {
  INVALID_EMAIL = 'auth/invalid-email',
  INVALID_CREDENTIALS = 'auth/invalid-login-credentials',
  EMPTY_EMAIL = 'validation/empty-email',
  EMPTY_PASSWORD = 'validation/empty-password',
  PASSWORD_MISMATCH = 'validation/password-mismatch',
  EMPTY_STUDENT_NAME = 'validation/empty-student-name',
  EMPTY_PARENT_NAME = 'validation/empty-parent-name',
  EMPTY_PHONE_NUMBER = 'validation/empty-phone-number',
  INVALID_PHONE_NUMBER = 'validation/invalid-phone-number',
  UNAUTHORIZED = 'auth/unauthorized',
  STUDENT_NAME_MISMATCH = 'validation/student-name-mismatch'
}
