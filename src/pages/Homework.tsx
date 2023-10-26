import { Collapse, Container, DialogContent, DialogContentText, Toolbar } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { DataSnapshot, Unsubscribe, get, onValue, ref, remove, set } from 'firebase/database'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TransitionGroup } from 'react-transition-group'
import EditorCard from '../Components/EditorCard'
import FabCreate from '../Components/FabCreate'
import HomeworkCard from '../Components/HomeworkCard'
import MultiActionDialog from '../Components/MultiActionDialog'
import TableOfContents, { TocEntry } from '../TableOfContents'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import HomeworkInfo, {
  HomeworkStatus,
  generateHomeworkTemplate,
  removeUndefinedKeys
} from '../util/HomeworkInfo'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import { dateStringToPrettyDate } from '../util/date'
import { convertHtmlStringToPlain } from '../util/string'
import { scrollToTop } from '../util/window'

interface HomeworkTexts {
  homeworkTemplateTitle: string
  homeworkTemplateBody: string
  areYouSure: string
  areYouSureDescription: string
  yes: string
  no: string
}

const EN_US: HomeworkTexts = {
  homeworkTemplateTitle: 'Title',
  homeworkTemplateBody: 'Write your notes here...',
  areYouSure: 'Are you sure?',
  areYouSureDescription: 'Are you sure you want to delete the homework?',
  yes: 'Yes',
  no: 'No'
}

const RO_RO: HomeworkTexts = {
  homeworkTemplateTitle: 'Titlu',
  homeworkTemplateBody: 'Introdu aici notițele...',
  areYouSure: 'Sigur?',
  areYouSureDescription: 'Sigur vrei să ștergi tema?',
  yes: 'Da',
  no: 'Nu'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface HomeworkProps {}

export default function Homework({}: HomeworkProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(Homework.name, TEXTS), [])
  const componentStrings = localeManager.componentStrings(Homework.name) as HomeworkTexts

  const { teacherId, studentId } = useParams()
  const { user } = useUser()
  const homework = useRef<Map<string, HomeworkInfo>>(new Map())
  const drafts = useRef<Map<string, HomeworkInfo>>(new Map())
  const [homeworkChanged, setHomeworkChanged] = useState<number>(0)
  const homeworkChangedRef = useRef<number>(homeworkChanged)
  const navigate = useNavigate()
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const dialogYesActionRef = useRef<() => void>(() => {})
  const homeworkUnsubscriberRef = useRef<Unsubscribe>()
  const homeworkDraftsUnsubscriberRef = useRef<Unsubscribe>()
  const sectionRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map())
  const homeworkDraftsToSave = useRef<Set<string>>(new Set())

  const saveHomeworkDraft = useMemo(
    () => async (hw: HomeworkInfo) => {
      hw.updatedAt = new Date().toISOString()
      await set(
        ref(database, `homework/teachers/${teacherId}/drafts/students/${studentId}/${hw.id}`),
        removeUndefinedKeys(hw)
      )
      console.log(`saved draft for homework id ${hw.id}`)
    },
    [teacherId, studentId]
  )

  const createNewHomework = useMemo(
    () => async () => {
      const hw = generateHomeworkTemplate(
        componentStrings.homeworkTemplateTitle,
        componentStrings.homeworkTemplateBody
      )
      homework.current.set(hw.id, hw)
      setHomeworkChanged(++homeworkChangedRef.current)
      await saveHomeworkDraft(hw)
    },
    [componentStrings]
  )

  const deleteHomework = useMemo(
    () => async (hw: HomeworkInfo) => {
      hw.updatedAt = new Date().toISOString()
      hw.deletedAt = new Date().toISOString()
      homework.current.delete(hw.id)
      await set(
        ref(database, `deleted/homework/teachers/${teacherId}/students/${studentId}/${hw.id}`),
        removeUndefinedKeys(hw)
      )
      await remove(ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`))
      await remove(
        ref(database, `homework/teachers/${teacherId}/drafts/students/${studentId}/${hw.id}`)
      )
      setHomeworkChanged(++homeworkChangedRef.current)
    },
    [teacherId, studentId]
  )

  const publishHomework = useMemo(
    () => async (hw: HomeworkInfo) => {
      const content = hw.editContent ?? ''
      hw.updatedAt = new Date().toISOString()
      hw.content = content
      hw.editContent = ''
      const titleRegex = /^<h1>(.*?)<\/h1>/
      const titleMatch = content.match(titleRegex)
      if (titleMatch) {
        hw.title = convertHtmlStringToPlain(titleMatch[1])
        hw.content = content.replace(titleRegex, '')
      } else {
        hw.title = 'Untitled'
      }

      hw.status = HomeworkStatus.PUBLISHED
      await set(
        ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`),
        removeUndefinedKeys(hw)
      )
      await remove(
        ref(database, `homework/teachers/${teacherId}/drafts/students/${studentId}/${hw.id}`)
      )
    },
    [teacherId, studentId]
  )

  const turnToDraft = useMemo(
    () => async (hw: HomeworkInfo) => {
      hw.updatedAt = new Date().toISOString()
      const content = hw.content ?? ''
      const title = `<h1>${hw.title ?? ''}</h1>`
      hw.editContent = title + content
      hw.content = ''
      hw.title = ''
      hw.status = HomeworkStatus.EDITING
      setHomeworkChanged(++homeworkChangedRef.current)
      await set(
        ref(database, `homework/teachers/${teacherId}/drafts/students/${studentId}/${hw.id}`),
        removeUndefinedKeys(hw)
      )
      await remove(ref(database, `homework/teachers/${teacherId}/students/${studentId}/${hw.id}`))
    },
    [teacherId, studentId]
  )

  const handleHomeworkFromDb = useMemo(
    () =>
      (homeworkRef: React.MutableRefObject<Map<string, HomeworkInfo>>) =>
      (snapshot: DataSnapshot) => {
        const dbHomework = snapshot.val()
        if (!dbHomework) {
          homeworkRef.current = new Map()
          setHomeworkChanged(++homeworkChangedRef.current)
          return
        }

        const hwMap = homeworkRef.current
        for (const id in dbHomework) {
          const hw = dbHomework[id]
          hw.id = id

          // Compare with locally stored homework. If we have a newer version, then we're using that,
          // not the one from the database.
          const localHw = hwMap.get(id)
          if (!localHw) {
            hwMap.set(id, hw)
          } else {
            if (
              !localHw.updatedAt ||
              (hw.updatedAt &&
                new Date(localHw.updatedAt).getTime() < new Date(hw.updatedAt).getTime())
            ) {
              // It's important to keep the old reference of the object, otherwise the cards get messed up
              localHw.content = hw.content
              localHw.editContent = hw.editContent
              localHw.status = hw.status
              localHw.updatedAt = hw.updatedAt
              localHw.deletedAt = hw.deletedAt
              localHw.title = hw.title
            }
          }

          // Update section references for the ToC
          if (!sectionRefs.current.has(id)) {
            sectionRefs.current.set(id, React.createRef())
          }
        }

        // Remove homework that's no longer in the db
        const dbIds = new Set(Object.keys(dbHomework))
        const idsToRemove = []
        for (const id of hwMap.keys()) {
          if (!dbIds.has(id)) {
            idsToRemove.push(id)
          }
        }
        for (const id of idsToRemove) {
          hwMap.delete(id)
        }

        setHomeworkChanged(++homeworkChangedRef.current)
      },
    []
  )

  useEffect(() => {
    homeworkUnsubscriberRef.current?.()
    homeworkDraftsUnsubscriberRef.current?.()

    if (user.loading) {
      return
    }

    if (!user.uid) {
      navigate('/login')
      return
    }

    if (!studentId) {
      if (user.role === UserRole.TEACHER) {
        navigate('/students')
      }
      navigate(`/homework/${teacherId}/${user.uid}`)
      scrollToTop()
      return
    }

    if (!teacherId || teacherId === '-') {
      if (user.role === UserRole.TEACHER) {
        navigate(`/homework/${user.uid}/${studentId}`)
        scrollToTop()
        return
      }

      get(ref(database, `students/${studentId}/teachers`))
        .then((snapshot) => {
          const teachersIds = Object.keys(snapshot.val())
          if (teachersIds.length === 0) {
            console.error(`No teachers found for student ${studentId}`)
            return
          }
          navigate(`/homework/${teachersIds[0]}/${studentId}`)
          scrollToTop()
        })
        .catch((error) =>
          console.error(`Could not load teachers for student ${studentId}: ${error}`)
        )
      return
    }

    // Subscribe to changes in homework
    homeworkUnsubscriberRef.current = onValue(
      ref(database, `homework/teachers/${teacherId}/students/${studentId}`),
      (snapshot) => handleHomeworkFromDb(homework)(snapshot),
      (error) => {
        console.error(
          `Could not retrieve homework for teacher ${teacherId} and student ${studentId}: ${error}`
        )
      }
    )

    if (user.role === UserRole.TEACHER) {
      homeworkDraftsUnsubscriberRef.current = onValue(
        ref(database, `homework/teachers/${teacherId}/drafts/students/${studentId}`),
        (snapshot) => handleHomeworkFromDb(drafts)(snapshot),
        (error) => {
          console.error(
            `Could not retrieve homework drafts for teacher ${teacherId} and student ${studentId}: ${error}`
          )
        }
      )
    }

    const saveAtInterval = setInterval(() => {
      const draftsToSave = homeworkDraftsToSave.current
      homeworkDraftsToSave.current = new Set()
      for (const id of draftsToSave) {
        const hw = homework.current.get(id)
        if (hw && hw.status !== HomeworkStatus.PUBLISHED && draftsToSave.has(hw.id)) {
          void saveHomeworkDraft(hw)
        }
      }
    }, 3000)

    return () => {
      clearInterval(saveAtInterval)
      homeworkUnsubscriberRef.current?.()
      homeworkDraftsUnsubscriberRef.current?.()
    }
  }, [user, teacherId, studentId])

  // sort homework descending by date
  const hwList = useMemo(() => {
    const hwMap = new Map<string, HomeworkInfo>(homework.current)
    for (const hw of drafts.current.values()) {
      const publishedUpdatedAt = new Date(hwMap.get(hw.id)?.updatedAt ?? 0)
      const draftUpdatedAt = new Date(hw.updatedAt ?? 0)
      if (draftUpdatedAt.getTime() > publishedUpdatedAt.getTime()) {
        hwMap.set(hw.id, hw)
      }
    }

    const result = Array.from(hwMap.values())
    result.sort(
      (h1, h2) => new Date(h2.createdAt ?? 0).getTime() - new Date(h1.createdAt ?? 0).getTime()
    )
    return result
  }, [homeworkChanged])

  const toc = (
    <TableOfContents
      entries={hwList.map((hw: HomeworkInfo): TocEntry => {
        return {
          key: `entry-${hw.id}`,
          ref: sectionRefs.current.get(hw.id) as React.RefObject<HTMLDivElement | null>,
          primaryLabel: hw.title,
          secondaryLabel: localeManager.formatLongDate(hw.createdAt, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      })}
    />
  )

  return (
    <>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12} display={{ xs: 'block', sm: 'none' }}>
            {toc}
          </Grid2>
          <Grid2 xs={12} sm={9} md={10}>
            <TransitionGroup>
              {hwList.map((hw: HomeworkInfo, i) => (
                <Collapse key={`hw-${hw.id}-${hw.createdAt}`}>
                  <Grid2
                    xs={12}
                    id={`section-${i}`}
                    ref={
                      sectionRefs.current.get(
                        hw.id
                      ) as React.MutableRefObject<HTMLDivElement | null>
                    }>
                    {hw.status === HomeworkStatus.PUBLISHED && (
                      <HomeworkCard
                        homework={hw}
                        onDelete={() => {
                          dialogYesActionRef.current = () => {
                            void deleteHomework(hw)
                          }
                          setOpenDialog(true)
                        }}
                        onEdit={() => {
                          void turnToDraft(hw)
                        }}
                        defaultExpanded={!i}
                        readonly={user.role !== UserRole.TEACHER}
                      />
                    )}
                    {user.role === UserRole.TEACHER && hw.status !== HomeworkStatus.PUBLISHED && (
                      <EditorCard
                        value={hw.editContent}
                        onValueChange={(v) => {
                          hw.editContent = v
                          homeworkDraftsToSave.current.add(hw.id)
                          setHomeworkChanged(++homeworkChangedRef.current)
                        }}
                        onPublish={() => {
                          void publishHomework(hw)
                        }}
                        onSave={() => {
                          void saveHomeworkDraft(hw)
                        }}
                        onDiscard={() => {
                          dialogYesActionRef.current = () => {
                            void deleteHomework(hw)
                          }
                          setOpenDialog(true)
                        }}
                      />
                    )}
                  </Grid2>
                </Collapse>
              ))}
            </TransitionGroup>
          </Grid2>
          <Grid2
            xs={12}
            sm={3}
            md={2}
            rowSpacing={0}
            sx={{ padding: 0 }}
            display={{ xs: 'none', sm: 'block' }}>
            {toc}
          </Grid2>
        </Grid2>
      </Container>
      {user.role === UserRole.TEACHER && (
        <FabCreate
          onClick={() => {
            void createNewHomework()
          }}
        />
      )}
      <MultiActionDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-describedby="alert-dialog-description"
        title={componentStrings.areYouSure}
        actions={[
          { label: componentStrings.no, onClick: () => setOpenDialog(false) },
          {
            label: componentStrings.yes,
            onClick: () => {
              setOpenDialog(false)
              dialogYesActionRef.current?.()
            }
          }
        ]}>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {componentStrings.areYouSureDescription}
          </DialogContentText>
        </DialogContent>
      </MultiActionDialog>
    </>
  )
}
