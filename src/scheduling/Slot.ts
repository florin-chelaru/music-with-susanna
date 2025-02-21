import { v4 as uuidv4 } from 'uuid'

export const ONE_MINUTE = 60
export const ONE_HOUR = 60 * ONE_MINUTE

export enum SlotStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled'
}

class Feedback {
  accepted: boolean = false
  comment?: string
}

export class Slot {
  public id: string = uuidv4()
  public start?: Date
  public durationSeconds: number = ONE_HOUR
  public get end(): Date | undefined {
    if (!this.start) {
      return undefined
    }
    return new Date(this.start.getTime() + this.durationSeconds * 1000)
  }
  public maxStudentPreferences: number = 3

  public teacher?: string
  public students: string[] = []

  public teacherTimePreferences: Date[] = []
  public studentTimePreferences: Map<string, Date[]> = new Map()

  public teacherAccepted: Feedback = new Feedback()
  public studentsAccepted: Map<string, Feedback> = new Map()

  public pendingTeacherChoice: boolean = false
  public pendingStudentChoices: Map<string, boolean> = new Map()

  public locked: boolean = false

  public status: SlotStatus = SlotStatus.PENDING

  // no cancellation policy means the slot can be cancelled at any time
  public cancellationPolicy?: string
  public notes?: string

  // Constructor with partial properties
  constructor(init?: Partial<Slot>) {
    if (init) {
      Object.assign(this, init) // Copy over the provided properties
    }
  }

  public static create(obj: Partial<Slot>) {
    return new Slot(obj)
  }
}

export class AvailabilityInterval {
  public userId: string
  public start: Date
  public durationSeconds: number
  public get end(): Date {
    return new Date(this.start.getTime() + this.durationSeconds * 1000)
  }

  constructor(userId: string, start: Date, durationSeconds: number) {
    this.userId = userId
    this.start = start
    this.durationSeconds = durationSeconds
  }

  public static create(obj: Partial<AvailabilityInterval>) {
    if (!obj.userId || !obj.start || !obj.durationSeconds) {
      throw new Error(
        'userId, start, and durationSeconds are required to create AvailabilityInterval'
      )
    }
    return new AvailabilityInterval(obj.userId, obj.start, obj.durationSeconds)
  }
}
