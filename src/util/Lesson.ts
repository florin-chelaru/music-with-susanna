export type LessonStatus =
  | 'requested'
  | 'scheduled'
  | 'cancellation_requested'
  | 'cancelled'
  | 'completed'
export type RecurringPattern = 'weekly' | 'biweekly' | 'monthly'

export interface Lesson {
  id: string
  teacherId: string
  studentId: string
  startTime: number // ms timestamp
  durationMinutes: number
  notes?: string
  status: LessonStatus
  requestedBy: 'teacher' | 'student'
  recurring: boolean
  recurringPattern?: RecurringPattern
  recurringGroupId?: string
}

export interface GroupClass {
  id: string
  teacherId: string
  title: string
  description?: string
  startTime: number // ms timestamp
  durationMinutes: number
  maxStudents?: number
  enrolledStudents?: Record<string, boolean>
  status: 'scheduled' | 'cancelled' | 'completed'
  recurring: boolean
  recurringPattern?: RecurringPattern
  recurringGroupId?: string
}

export function recurringOffsetMs(pattern: RecurringPattern): number {
  switch (pattern) {
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000
    case 'biweekly':
      return 14 * 24 * 60 * 60 * 1000
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000
  }
}
