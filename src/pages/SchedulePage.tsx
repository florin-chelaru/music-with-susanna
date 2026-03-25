import GroupsIcon from '@mui/icons-material/Groups'
import PersonIcon from '@mui/icons-material/Person'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { get, onValue, ref, set, Unsubscribe, update } from 'firebase/database'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import GroupClassDialog, {
  GROUP_CLASS_DIALOG_TEXTS,
  GroupClassDialogTexts,
  GroupClassFormData
} from '../Components/GroupClassDialog'
import FabCreate from '../Components/FabCreate'
import { GroupClassCard, LESSON_CARD_TEXTS, LessonCard } from '../Components/LessonCard'
import LessonDialog, {
  LESSON_DIALOG_TEXTS,
  LessonDialogTexts,
  LessonFormData
} from '../Components/LessonDialog'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { GroupClass, Lesson, recurringOffsetMs } from '../util/Lesson'
import { SupportedLocale } from '../util/SupportedLocale'
import { User, UserRole } from '../util/User'
import { scrollToTop } from '../util/window'

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

interface SchedulePageTexts {
  individualLessons: string
  groupClasses: string
  pendingRequests: string
  upcoming: string
  past: string
  noLessons: string
  noGroupClasses: string
  noPendingRequests: string
  cancellationRequests: string
  cancelLesson: string
  cancelLessonConfirm: string
  cancelThisOnly: string
  cancelAllFuture: string
  cancelGroup: string
  cancelGroupConfirm: string
  cancelGroupThisOnly: string
  cancelGroupAllFuture: string
  close: string
  showPast: string
  hidePast: string
}

const EN_US: SchedulePageTexts = {
  individualLessons: 'Individual Lessons',
  groupClasses: 'Group Classes',
  pendingRequests: 'Pending Requests',
  upcoming: 'Upcoming',
  past: 'Past',
  noLessons: 'No lessons scheduled.',
  noGroupClasses: 'No group classes.',
  noPendingRequests: 'No pending requests.',
  cancellationRequests: 'Cancellation Requests',
  cancelLesson: 'Cancel Lesson',
  cancelLessonConfirm: 'Are you sure you want to cancel this lesson?',
  cancelThisOnly: 'Cancel this lesson',
  cancelAllFuture: 'Cancel all future lessons in this series',
  cancelGroup: 'Cancel Class',
  cancelGroupConfirm: 'Are you sure you want to cancel this class?',
  cancelGroupThisOnly: 'Cancel this class',
  cancelGroupAllFuture: 'Cancel all future classes in this series',
  close: 'Close',
  showPast: 'Show past',
  hidePast: 'Hide past'
}

const RO_RO: SchedulePageTexts = {
  individualLessons: 'Lecții Individuale',
  groupClasses: 'Clase de Grup',
  pendingRequests: 'Cereri în Așteptare',
  upcoming: 'Viitoare',
  past: 'Trecute',
  noLessons: 'Nicio lecție programată.',
  noGroupClasses: 'Nicio clasă de grup.',
  noPendingRequests: 'Nicio cerere în așteptare.',
  cancellationRequests: 'Cereri de Anulare',
  cancelLesson: 'Anulează Lecția',
  cancelLessonConfirm: 'Ești sigur că vrei să anulezi această lecție?',
  cancelThisOnly: 'Anulează doar această lecție',
  cancelAllFuture: 'Anulează toate lecțiile viitoare din serie',
  cancelGroup: 'Anulează Clasa',
  cancelGroupConfirm: 'Ești sigur că vrei să anulezi această clasă?',
  cancelGroupThisOnly: 'Anulează doar această clasă',
  cancelGroupAllFuture: 'Anulează toate clasele viitoare din serie',
  close: 'Închide',
  showPast: 'Arată trecute',
  hidePast: 'Ascunde trecute'
}

const SCHEDULE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

const DEFAULT_LESSON_CARD_TEXTS = LESSON_CARD_TEXTS.get(SupportedLocale.EN_US) ?? {
  confirm: 'Confirm',
  edit: 'Edit',
  cancel: 'Cancel',
  delete: 'Delete',
  statusRequested: 'Pending',
  statusScheduled: 'Confirmed',
  statusCancellationRequested: 'Cancellation requested',
  statusCancelled: 'Cancelled',
  statusCompleted: 'Completed',
  proposeNewTime: 'Propose new time',
  approveCancel: 'Approve cancellation',
  recurring: 'Recurring',
  minutes: 'min',
  enrolledCount: 'enrolled'
}

const DEFAULT_LESSON_DIALOG_TEXTS: LessonDialogTexts = LESSON_DIALOG_TEXTS.get(
  SupportedLocale.EN_US
) ?? {
  titleCreate: 'Schedule Lesson',
  titleEdit: 'Edit Lesson',
  titleRequest: 'Request a Lesson',
  student: 'Student',
  teacher: 'Teacher',
  date: 'Date',
  time: 'Time',
  duration: 'Duration',
  notes: 'Notes',
  recurring: 'Recurring lesson',
  recurringPattern: 'Repeat',
  occurrences: 'Number of occurrences',
  patternWeekly: 'Every week',
  patternBiweekly: 'Every 2 weeks',
  patternMonthly: 'Every month',
  save: 'Save',
  cancel: 'Cancel',
  requestLesson: 'Send Request',
  pendingNote: 'The teacher will confirm your request.',
  errorStudentRequired: 'Please select a student.',
  errorTeacherRequired: 'Please select a teacher.',
  errorDateRequired: 'Please select a date.',
  errorTimeRequired: 'Please select a time.',
  errorPastDate: 'The lesson must be scheduled in the future.'
}

const DEFAULT_GROUP_CLASS_DIALOG_TEXTS: GroupClassDialogTexts = GROUP_CLASS_DIALOG_TEXTS.get(
  SupportedLocale.EN_US
) ?? {
  titleCreate: 'Create Group Class',
  titleEdit: 'Edit Group Class',
  title: 'Class title',
  description: 'Description',
  date: 'Date',
  time: 'Time',
  duration: 'Duration',
  students: 'Students',
  recurring: 'Recurring class',
  recurringPattern: 'Repeat',
  occurrences: 'Number of occurrences',
  patternWeekly: 'Every week',
  patternBiweekly: 'Every 2 weeks',
  patternMonthly: 'Every month',
  save: 'Save',
  cancel: 'Cancel',
  errorStudentsRequired: 'Please enroll at least one student.',
  errorDateRequired: 'Please select a date.',
  errorTimeRequired: 'Please select a time.',
  errorPastDate: 'The class must be scheduled in the future.'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStartTime(date: string, time: string): number {
  return new Date(`${date}T${time}`).getTime()
}

async function writeLessons(lessons: Array<Omit<Lesson, 'id'>>) {
  const writes: Array<Promise<void>> = []
  for (const lesson of lessons) {
    const id = uuidv4()
    const data = { ...lesson }
    writes.push(
      set(ref(database, `lessons/${id}`), data),
      set(ref(database, `teacherLessons/${lesson.teacherId}/${id}`), data),
      set(ref(database, `studentLessons/${lesson.studentId}/${id}`), data)
    )
  }
  await Promise.all(writes)
}

async function updateLesson(lesson: Lesson) {
  const { id, ...data } = lesson
  await Promise.all([
    update(ref(database, `lessons/${id}`), data),
    update(ref(database, `teacherLessons/${lesson.teacherId}/${id}`), data),
    update(ref(database, `studentLessons/${lesson.studentId}/${id}`), data)
  ])
}

async function cancelLesson(lesson: Lesson) {
  await updateLesson({ ...lesson, status: 'cancelled' })
}

async function writeGroupClasses(classes: Array<Omit<GroupClass, 'id'>>) {
  const writes: Array<Promise<void>> = []
  for (const cls of classes) {
    const id = uuidv4()
    const data = { ...cls }
    writes.push(
      set(ref(database, `groupClasses/${id}`), data),
      set(ref(database, `teacherGroupClasses/${cls.teacherId}/${id}`), data)
    )
  }
  await Promise.all(writes)
}

async function updateGroupClass(cls: GroupClass) {
  const { id, ...data } = cls
  await Promise.all([
    update(ref(database, `groupClasses/${id}`), data),
    update(ref(database, `teacherGroupClasses/${cls.teacherId}/${id}`), data)
  ])
}

async function cancelGroupClass(cls: GroupClass) {
  await updateGroupClass({ ...cls, status: 'cancelled' })
}

// ---------------------------------------------------------------------------
// SchedulePage
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(SchedulePage.name, SCHEDULE_TEXTS), [])
  const t = localeManager.componentStrings(SchedulePage.name) as SchedulePageTexts
  const locale = localeManager.locale as SupportedLocale

  const lessonCardTexts = LESSON_CARD_TEXTS.get(locale) ?? DEFAULT_LESSON_CARD_TEXTS
  const lessonDialogTexts = LESSON_DIALOG_TEXTS.get(locale) ?? DEFAULT_LESSON_DIALOG_TEXTS
  const groupClassDialogTexts =
    GROUP_CLASS_DIALOG_TEXTS.get(locale) ?? DEFAULT_GROUP_CLASS_DIALOG_TEXTS

  const { user } = useUser()
  const navigate = useNavigate()
  const isTeacher = user.role === UserRole.TEACHER

  // ── Data state ────────────────────────────────────────────────────────────
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [groupClasses, setGroupClasses] = useState<GroupClass[]>([])
  const [students, setStudents] = useState<Map<string, User>>(new Map())
  const [teachers, setTeachers] = useState<Map<string, User>>(new Map())
  const [loading, setLoading] = useState(true)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState(0)
  const [showPast, setShowPast] = useState(false)

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | undefined>()

  // Group class dialog
  const [groupClassDialogOpen, setGroupClassDialogOpen] = useState(false)
  const [editingGroupClass, setEditingGroupClass] = useState<Partial<GroupClass> | undefined>()

  // Propose new time (student counter-proposing a teacher-scheduled lesson)
  const [proposingForLesson, setProposingForLesson] = useState<Lesson | undefined>()

  // Cancel confirmation
  const [cancelLessonTarget, setCancelLessonTarget] = useState<Lesson | undefined>()
  const [cancelGroupTarget, setCancelGroupTarget] = useState<GroupClass | undefined>()

  // ── Firebase subscriptions ────────────────────────────────────────────────
  const unsubscribers = useRef<Unsubscribe[]>([])

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate('/login')
      return
    }

    const uid = user.uid
    unsubscribers.current.forEach((u) => u())
    unsubscribers.current = []

    if (isTeacher) {
      // Load students
      const studentsUnsub = onValue(ref(database, `teachers/${uid}/students`), async (snapshot) => {
        const ids = Object.keys(snapshot.val() ?? {})
        const map = new Map<string, User>()
        await Promise.all(
          ids.map(async (id) => {
            const snap = await get(ref(database, `users/${id}`))
            if (snap.exists()) {
              map.set(id, new User({ uid: id, ...snap.val() }))
            }
          })
        )
        setStudents(map)
      })
      unsubscribers.current.push(studentsUnsub)

      // Load lessons
      const lessonsUnsub = onValue(
        ref(database, `teacherLessons/${uid}`),
        (snapshot) => {
          const items: Lesson[] = []
          snapshot.forEach((child) => {
            const item: Lesson = { ...child.val(), id: child.key ?? '' }
            items.push(item)
          })
          setLessons(items.sort((a, b) => a.startTime - b.startTime))
          setLoading(false)
        },
        (error) => {
          console.error('Failed to load lessons:', error)
          setLoading(false)
        }
      )
      unsubscribers.current.push(lessonsUnsub)

      // Load group classes
      const groupUnsub = onValue(ref(database, `teacherGroupClasses/${uid}`), (snapshot) => {
        const items: GroupClass[] = []
        snapshot.forEach((child) => {
          const item: GroupClass = { ...child.val(), id: child.key ?? '' }
          items.push(item)
        })
        setGroupClasses(items.sort((a, b) => a.startTime - b.startTime))
      })
      unsubscribers.current.push(groupUnsub)
    } else {
      // Student: load all teachers
      const loadTeachers = async () => {
        const snap = await get(ref(database, `students/${uid}/teachers`))
        const tIds = Object.keys(snap.val() ?? {})
        const map = new Map<string, User>()
        await Promise.all(
          tIds.map(async (id) => {
            const uSnap = await get(ref(database, `users/${id}`))
            if (uSnap.exists()) map.set(id, new User({ uid: id, ...uSnap.val() }))
          })
        )
        setTeachers(map)
      }
      void loadTeachers()

      // Load student's lessons
      const lessonsUnsub = onValue(
        ref(database, `studentLessons/${uid}`),
        (snapshot) => {
          const items: Lesson[] = []
          snapshot.forEach((child) => {
            const item: Lesson = { ...child.val(), id: child.key ?? '' }
            items.push(item)
          })
          setLessons(items.sort((a, b) => a.startTime - b.startTime))
          setLoading(false)
        },
        (error) => {
          console.error('Failed to load lessons:', error)
          setLoading(false)
        }
      )
      unsubscribers.current.push(lessonsUnsub)

      // Load all group classes
      const groupUnsub = onValue(ref(database, 'groupClasses'), (snapshot) => {
        const items: GroupClass[] = []
        snapshot.forEach((child) => {
          const cls: GroupClass = { ...child.val(), id: child.key ?? '' }
          if (cls.status !== 'cancelled') {
            items.push(cls)
          }
        })
        setGroupClasses(items.sort((a, b) => a.startTime - b.startTime))
      })
      unsubscribers.current.push(groupUnsub)
    }

    return () => {
      unsubscribers.current.forEach((u) => u())
    }
  }, [user.uid, user.loading, user.role])

  // ── Lesson actions ────────────────────────────────────────────────────────

  const handleSaveLesson = async (data: LessonFormData) => {
    setLessonDialogOpen(false)
    const startTime = buildStartTime(data.date, data.time)

    // Student proposing a new time: cancel teacher's proposal, create a new student request
    if (proposingForLesson) {
      await cancelLesson(proposingForLesson)
      await writeLessons([
        {
          teacherId: proposingForLesson.teacherId,
          studentId: proposingForLesson.studentId,
          startTime,
          durationMinutes: data.durationMinutes,
          notes: data.notes,
          status: 'requested',
          requestedBy: 'student',
          recurring: false
        }
      ])
      setProposingForLesson(undefined)
      setEditingLesson(undefined)
      return
    }

    if (editingLesson?.id) {
      const base: Lesson = { ...(editingLesson as Lesson) }
      const updated: Lesson = {
        ...base,
        studentId: data.studentId ?? base.studentId,
        startTime,
        durationMinutes: data.durationMinutes,
        notes: data.notes
      }
      await updateLesson(updated)
    } else {
      const studentId = isTeacher ? data.studentId ?? '' : user.uid ?? ''
      const tId = isTeacher ? user.uid ?? '' : data.teacherId ?? teachers.keys().next().value ?? ''
      // Both teacher proposals and student requests start as 'requested' — the other party confirms
      const requestedBy = isTeacher ? 'teacher' : 'student'

      if (data.recurring && data.occurrences > 1) {
        const offset = recurringOffsetMs(data.recurringPattern)
        const groupId = uuidv4()
        const toCreate: Array<Omit<Lesson, 'id'>> = []
        for (let i = 0; i < data.occurrences; i++) {
          toCreate.push({
            teacherId: tId,
            studentId,
            startTime: startTime + i * offset,
            durationMinutes: data.durationMinutes,
            notes: data.notes,
            status: 'requested',
            requestedBy,
            recurring: true,
            recurringPattern: data.recurringPattern,
            recurringGroupId: groupId
          })
        }
        await writeLessons(toCreate)
      } else {
        await writeLessons([
          {
            teacherId: tId,
            studentId,
            startTime,
            durationMinutes: data.durationMinutes,
            notes: data.notes,
            status: 'requested',
            requestedBy,
            recurring: false
          }
        ])
      }
    }
    setEditingLesson(undefined)
  }

  const handleProposeNewTime = (lesson: Lesson) => {
    setProposingForLesson(lesson)
    // Pre-fill the dialog with the existing time so student just adjusts it
    setEditingLesson({ ...lesson, id: undefined })
    setLessonDialogOpen(true)
  }

  const handleConfirmLesson = async (lesson: Lesson) => {
    await updateLesson({ ...lesson, status: 'scheduled' })
  }

  const handleCancelLesson = (lesson: Lesson) => {
    setCancelLessonTarget(lesson)
  }

  const confirmCancelLesson = async (allFuture: boolean) => {
    if (!cancelLessonTarget) return
    // Students cancelling a confirmed lesson request teacher approval first
    const needsApproval = !isTeacher && cancelLessonTarget.status === 'scheduled'
    const applyStatus = async (lesson: Lesson) => {
      if (needsApproval) {
        await updateLesson({ ...lesson, status: 'cancellation_requested' })
      } else {
        await cancelLesson(lesson)
      }
    }
    if (allFuture && cancelLessonTarget.recurringGroupId) {
      const now = cancelLessonTarget.startTime
      const toCancel = lessons.filter(
        (l) =>
          l.recurringGroupId === cancelLessonTarget.recurringGroupId &&
          l.startTime >= now &&
          l.status !== 'cancelled'
      )
      await Promise.all(toCancel.map(applyStatus))
    } else {
      await applyStatus(cancelLessonTarget)
    }
    setCancelLessonTarget(undefined)
  }

  const handleApproveCancellation = async (lesson: Lesson) => {
    await cancelLesson(lesson)
  }

  // ── Group class actions ───────────────────────────────────────────────────

  const handleSaveGroupClass = async (data: GroupClassFormData) => {
    setGroupClassDialogOpen(false)
    const startTime = buildStartTime(data.date, data.time)
    const enrolledStudents = data.enrolledStudentIds.reduce<Record<string, boolean>>(
      (acc, id) => ({ ...acc, [id]: true }),
      {}
    )

    if (editingGroupClass?.id) {
      const base: GroupClass = { ...(editingGroupClass as GroupClass) }
      const updated: GroupClass = {
        ...base,
        title: data.title,
        description: data.description,
        startTime,
        durationMinutes: data.durationMinutes,
        enrolledStudents
      }
      await updateGroupClass(updated)
    } else {
      const teacherUid = user.uid ?? ''
      if (data.recurring && data.occurrences > 1) {
        const offset = recurringOffsetMs(data.recurringPattern)
        const groupId = uuidv4()
        const toCreate: Array<Omit<GroupClass, 'id'>> = []
        for (let i = 0; i < data.occurrences; i++) {
          toCreate.push({
            teacherId: teacherUid,
            title: data.title,
            description: data.description,
            startTime: startTime + i * offset,
            durationMinutes: data.durationMinutes,
            enrolledStudents,
            status: 'scheduled',
            recurring: true,
            recurringPattern: data.recurringPattern,
            recurringGroupId: groupId
          })
        }
        await writeGroupClasses(toCreate)
      } else {
        await writeGroupClasses([
          {
            teacherId: teacherUid,
            title: data.title,
            description: data.description,
            startTime,
            durationMinutes: data.durationMinutes,
            enrolledStudents,
            status: 'scheduled',
            recurring: false
          }
        ])
      }
    }
    setEditingGroupClass(undefined)
  }

  const handleCancelGroupClass = (cls: GroupClass) => {
    setCancelGroupTarget(cls)
  }

  const confirmCancelGroupClass = async (allFuture: boolean) => {
    if (!cancelGroupTarget) return
    if (allFuture && cancelGroupTarget.recurringGroupId) {
      const now = cancelGroupTarget.startTime
      const toCancel = groupClasses.filter(
        (c) =>
          c.recurringGroupId === cancelGroupTarget.recurringGroupId &&
          c.startTime >= now &&
          c.status !== 'cancelled'
      )
      await Promise.all(toCancel.map(cancelGroupClass))
    } else {
      await cancelGroupClass(cancelGroupTarget)
    }
    setCancelGroupTarget(undefined)
  }

  // ── Derived lists ─────────────────────────────────────────────────────────

  const now = Date.now()

  const cancellationRequestedLessons = lessons.filter((l) => l.status === 'cancellation_requested')
  const pendingLessons = lessons.filter((l) => l.status === 'requested')
  // Lessons the other party requested — current user can confirm (and student can also propose)
  const pendingFromOther = pendingLessons.filter((l) =>
    isTeacher ? l.requestedBy === 'student' : l.requestedBy === 'teacher'
  )
  // Lessons the current user requested — waiting for the other party
  const pendingFromSelf = pendingLessons.filter((l) =>
    isTeacher ? l.requestedBy === 'teacher' : l.requestedBy === 'student'
  )
  const upcomingLessons = lessons.filter((l) => l.status === 'scheduled' && l.startTime >= now)
  const pastLessons = lessons.filter(
    (l) =>
      (l.status === 'scheduled' && l.startTime < now) ||
      l.status === 'completed' ||
      l.status === 'cancelled'
  )

  const upcomingGroupClasses = groupClasses.filter(
    (c) => c.status !== 'cancelled' && c.startTime >= now
  )
  const pastGroupClasses = groupClasses.filter((c) => c.startTime < now || c.status === 'cancelled')

  // ── Section renderer ──────────────────────────────────────────────────────

  const renderLessonList = (
    items: Lesson[],
    actions: {
      onConfirm?: (l: Lesson) => void
      onPropose?: (l: Lesson) => void
      onEdit?: (l: Lesson) => void
      onCancel?: (l: Lesson) => void
      onApproveCancel?: (l: Lesson) => void
    }
  ) => (
    <Stack spacing={1.5}>
      {items.map((lesson) => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          texts={lessonCardTexts}
          participantName={
            isTeacher ? students.get(lesson.studentId)?.name : teachers.get(lesson.teacherId)?.name
          }
          onConfirm={actions.onConfirm}
          onPropose={actions.onPropose}
          onEdit={actions.onEdit}
          onCancel={actions.onCancel}
          onApproveCancel={actions.onApproveCancel}
        />
      ))}
    </Stack>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="md">
      <Toolbar />
      <Box sx={{ mt: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<PersonIcon />} iconPosition="start" label={t.individualLessons} />
          <Tab icon={<GroupsIcon />} iconPosition="start" label={t.groupClasses} />
        </Tabs>
        <Divider />

        {/* ── Individual Lessons Tab ── */}
        {tab === 0 && (
          <Box sx={{ mt: 2 }}>
            <Grid2 container spacing={3}>
              {isTeacher && cancellationRequestedLessons.length > 0 && (
                <Grid2 xs={12}>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    {t.cancellationRequests}
                  </Typography>
                  {renderLessonList(cancellationRequestedLessons, {
                    onApproveCancel: (l) => {
                      void handleApproveCancellation(l)
                    }
                  })}
                </Grid2>
              )}
              {pendingLessons.length > 0 && (
                <Grid2 xs={12}>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    {t.pendingRequests}
                  </Typography>
                  <Stack spacing={1.5}>
                    {pendingFromOther.length > 0 &&
                      renderLessonList(pendingFromOther, {
                        onConfirm: (l) => {
                          void handleConfirmLesson(l)
                        },
                        onPropose: !isTeacher ? handleProposeNewTime : undefined,
                        onEdit: isTeacher
                          ? (l) => {
                              setEditingLesson(l)
                              setLessonDialogOpen(true)
                            }
                          : undefined,
                        onCancel: handleCancelLesson
                      })}
                    {pendingFromSelf.length > 0 &&
                      renderLessonList(pendingFromSelf, { onCancel: handleCancelLesson })}
                  </Stack>
                </Grid2>
              )}

              <Grid2 xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t.upcoming}
                </Typography>
                {upcomingLessons.length === 0 ? (
                  <Alert severity="info">{t.noLessons}</Alert>
                ) : (
                  renderLessonList(upcomingLessons, {
                    onEdit: isTeacher
                      ? (l) => {
                          setEditingLesson(l)
                          setLessonDialogOpen(true)
                        }
                      : undefined,
                    onCancel: handleCancelLesson
                  })
                )}
              </Grid2>

              {pastLessons.length > 0 && (
                <Grid2 xs={12}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowPast((p) => !p)}
                    sx={{ mb: 1 }}>
                    {showPast ? t.hidePast : t.showPast} ({pastLessons.length})
                  </Button>
                  {showPast && renderLessonList(pastLessons, {})}
                </Grid2>
              )}
            </Grid2>
          </Box>
        )}

        {/* ── Group Classes Tab ── */}
        {tab === 1 && (
          <Box sx={{ mt: 2 }}>
            <Grid2 container spacing={2}>
              {upcomingGroupClasses.length === 0 && pastGroupClasses.length === 0 && (
                <Grid2 xs={12}>
                  <Alert severity="info">{t.noGroupClasses}</Alert>
                </Grid2>
              )}

              {upcomingGroupClasses.length > 0 && (
                <Grid2 xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {t.upcoming}
                  </Typography>
                  <Stack spacing={1.5}>
                    {upcomingGroupClasses.map((cls) => (
                      <GroupClassCard
                        key={cls.id}
                        groupClass={cls}
                        texts={lessonCardTexts}
                        isEnrolled={!isTeacher && !!cls.enrolledStudents?.[user.uid ?? '']}
                        enrolledStudentNames={
                          isTeacher
                            ? Object.keys(cls.enrolledStudents ?? {})
                                .map((id) => students.get(id)?.name ?? '')
                                .filter(Boolean)
                            : undefined
                        }
                        onEdit={
                          isTeacher
                            ? (c) => {
                                setEditingGroupClass(c)
                                setGroupClassDialogOpen(true)
                              }
                            : undefined
                        }
                        onCancel={isTeacher ? handleCancelGroupClass : undefined}
                      />
                    ))}
                  </Stack>
                </Grid2>
              )}

              {pastGroupClasses.length > 0 && (
                <Grid2 xs={12}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowPast((p) => !p)}
                    sx={{ mb: 1 }}>
                    {showPast ? t.hidePast : t.showPast} ({pastGroupClasses.length})
                  </Button>
                  {showPast && (
                    <Stack spacing={1.5}>
                      {pastGroupClasses.map((cls) => (
                        <GroupClassCard
                          key={cls.id}
                          groupClass={cls}
                          texts={lessonCardTexts}
                          isEnrolled={!isTeacher && !!cls.enrolledStudents?.[user.uid ?? '']}
                          enrolledStudentNames={
                            isTeacher
                              ? Object.keys(cls.enrolledStudents ?? {})
                                  .map((id) => students.get(id)?.name ?? '')
                                  .filter(Boolean)
                              : undefined
                          }
                        />
                      ))}
                    </Stack>
                  )}
                </Grid2>
              )}
            </Grid2>
          </Box>
        )}
      </Box>

      {/* ── FAB: hidden for students on the Group Classes tab ── */}
      {(tab === 0 || isTeacher) && (
        <FabCreate
          onClick={() => {
            setEditingLesson(undefined)
            setEditingGroupClass(undefined)
            if (tab === 0) {
              setLessonDialogOpen(true)
            } else {
              setGroupClassDialogOpen(true)
            }
            scrollToTop()
          }}
        />
      )}

      {/* ── Lesson Dialog ── */}
      <LessonDialog
        open={lessonDialogOpen}
        texts={lessonDialogTexts}
        lesson={editingLesson}
        students={isTeacher ? Array.from(students.values()) : undefined}
        teachers={!isTeacher ? Array.from(teachers.values()) : undefined}
        isTeacher={isTeacher}
        onSave={(data) => {
          void handleSaveLesson(data)
        }}
        onClose={() => {
          setLessonDialogOpen(false)
          setEditingLesson(undefined)
        }}
      />

      {/* ── Group Class Dialog ── */}
      {isTeacher && (
        <GroupClassDialog
          open={groupClassDialogOpen}
          texts={groupClassDialogTexts}
          groupClass={editingGroupClass}
          students={Array.from(students.values())}
          onSave={(data) => {
            void handleSaveGroupClass(data)
          }}
          onClose={() => {
            setGroupClassDialogOpen(false)
            setEditingGroupClass(undefined)
          }}
        />
      )}

      {/* ── Cancel Lesson Dialog ── */}
      <Dialog open={!!cancelLessonTarget} onClose={() => setCancelLessonTarget(undefined)}>
        <DialogTitle>{t.cancelLesson}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t.cancelLessonConfirm}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelLessonTarget(undefined)}>{t.close}</Button>
          {cancelLessonTarget?.recurringGroupId && (
            <Button
              color="warning"
              onClick={() => {
                void confirmCancelLesson(true)
              }}>
              {t.cancelAllFuture}
            </Button>
          )}
          <Button
            color="error"
            onClick={() => {
              void confirmCancelLesson(false)
            }}>
            {t.cancelThisOnly}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Cancel Group Class Dialog ── */}
      <Dialog open={!!cancelGroupTarget} onClose={() => setCancelGroupTarget(undefined)}>
        <DialogTitle>{t.cancelGroup}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t.cancelGroupConfirm}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelGroupTarget(undefined)}>{t.close}</Button>
          {cancelGroupTarget?.recurringGroupId && (
            <Button
              color="warning"
              onClick={() => {
                void confirmCancelGroupClass(true)
              }}>
              {t.cancelGroupAllFuture}
            </Button>
          )}
          <Button
            color="error"
            onClick={() => {
              void confirmCancelGroupClass(false)
            }}>
            {t.cancelGroupThisOnly}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
