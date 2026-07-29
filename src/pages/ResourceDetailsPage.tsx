import {
  Box,
  Button,
  CircularProgress,
  Container,
  DialogContent,
  DialogContentText,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { get, ref, remove, set } from 'firebase/database'
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EditResourceDialog from '../Components/EditResourceDialog'
import EditorCard from '../Components/EditorCard'
import HomeworkCard from '../Components/HomeworkCard'
import MultiActionDialog from '../Components/MultiActionDialog'
import ResourceCard from '../Components/ResourceCard'
import TableOfContents, { TocEntry } from '../TableOfContents'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import HomeworkInfo, { HomeworkStatus, removeUndefinedKeys } from '../util/HomeworkInfo'
import { convertHtmlStringToPlain } from '../util/string'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import {
  Resource,
  ResourceHomeworkReference,
  deleteResource,
  findResourceUsageInHomework,
  updateResourceMetadata,
  useTeacherResources
} from '../util/resources'
import { toYouTubeEmbedUrl } from '../util/youtube'

interface ResourceDetailsPageTexts {
  usedIn: string
  noReferences: string
  deleteResource: string
  deleteDisabledTooltip: string
  deleteConfirmTitle: string
  deleteConfirmBody: string
  cancel: string
  confirm: string
  back: string
  draft: string
}

const EN_US: ResourceDetailsPageTexts = {
  usedIn: 'Used in homework',
  noReferences: 'This resource is not used in any homework.',
  deleteResource: 'Delete resource',
  deleteDisabledTooltip: 'Remove this resource from all homework before deleting',
  deleteConfirmTitle: 'Delete resource?',
  deleteConfirmBody: 'This will permanently delete the resource.',
  cancel: 'Cancel',
  confirm: 'Delete',
  back: 'Back',
  draft: 'Draft'
}

const RO_RO: ResourceDetailsPageTexts = {
  usedIn: 'Folosit în teme',
  noReferences: 'Această resursă nu este folosită în nicio temă.',
  deleteResource: 'Șterge resursa',
  deleteDisabledTooltip: 'Elimină această resursă din toate temele înainte de a o șterge',
  deleteConfirmTitle: 'Ștergi resursa?',
  deleteConfirmBody: 'Resursa va fi ștearsă definitiv.',
  cancel: 'Anulează',
  confirm: 'Șterge',
  back: 'Înapoi',
  draft: 'Ciornă'
}

const RESOURCE_DETAILS_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

interface StudentGroup {
  studentId: string
  studentName: string
  refs: ResourceHomeworkReference[]
}

export default function ResourceDetailsPage() {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(ResourceDetailsPage.name, RESOURCE_DETAILS_PAGE_TEXTS),
    []
  )
  const strings = localeManager.componentStrings(
    ResourceDetailsPage.name
  ) as ResourceDetailsPageTexts

  const { resourceId } = useParams<{ resourceId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate('/login')
      return
    }
    if (user.role !== UserRole.TEACHER) {
      navigate('/')
    }
  }, [user, navigate])

  const teacherId = user?.uid

  // ── Resource card state ────────────────────────────────────────────────────
  const [resource, setResource] = useState<Resource | null>(null)
  const [resourceLoading, setResourceLoading] = useState(true)
  const [resourceExpanded, setResourceExpanded] = useState(false)
  const [editResourceTarget, setEditResourceTarget] = useState<Resource | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!teacherId || !resourceId) return
    get(ref(database, `resources/teachers/${teacherId}/${resourceId}`))
      .then((snap) => {
        if (snap.exists()) {
          setResource({ id: resourceId, ...(snap.val() as Omit<Resource, 'id'>) })
        }
        setResourceLoading(false)
      })
      .catch(() => setResourceLoading(false))
  }, [teacherId, resourceId])

  const handleEditResourceConfirm = (patch: { title: string; tags: Record<string, string> }) => {
    if (!teacherId || !editResourceTarget) return
    void updateResourceMetadata(teacherId, editResourceTarget.id, patch)
      .then(() => {
        setResource((prev) => (prev ? { ...prev, ...patch } : prev))
      })
      .catch(console.error)
  }

  // ── References + homework state ────────────────────────────────────────────
  const [references, setReferences] = useState<ResourceHomeworkReference[]>([])
  const [refsLoading, setRefsLoading] = useState(true)
  const [homeworks, setHomeworks] = useState<Map<string, HomeworkInfo>>(new Map())

  const loadReferences = useCallback(() => {
    if (!teacherId || !resourceId) return
    setRefsLoading(true)
    findResourceUsageInHomework(teacherId, resourceId)
      .then((refs) => {
        setReferences(refs)
        setRefsLoading(false)
        return Promise.all(
          refs.map((r) => {
            const path = r.isDraft
              ? `homework/teachers/${teacherId}/drafts/students/${r.studentId}/${r.homeworkId}`
              : `homework/teachers/${teacherId}/students/${r.studentId}/${r.homeworkId}`
            return get(ref(database, path)).then((snap) => {
              if (!snap.exists()) return null
              const hw: HomeworkInfo = {
                id: r.homeworkId,
                ...(snap.val() as Omit<HomeworkInfo, 'id'>)
              }
              return hw
            })
          })
        )
      })
      .then((hws) => {
        const hwMap = new Map<string, HomeworkInfo>()
        for (const hw of hws) {
          if (hw) hwMap.set(hw.id, hw)
        }
        setHomeworks(hwMap)
      })
      .catch(() => setRefsLoading(false))
  }, [teacherId, resourceId])

  useEffect(() => {
    loadReferences()
  }, [loadReferences])

  // ── Inline homework editing ────────────────────────────────────────────────
  const [inlineEdits, setInlineEdits] = useState<Map<string, string>>(new Map())
  const { resources: teacherResources } = useTeacherResources(teacherId)

  const handleEditHomework = (r: ResourceHomeworkReference) => {
    const hw = homeworks.get(r.homeworkId)
    if (!hw) return
    const content = r.isDraft ? hw.editContent ?? '' : hw.content ?? ''
    setInlineEdits((prev) => new Map(prev).set(r.homeworkId, content))
  }

  const handleSaveHomework = (r: ResourceHomeworkReference) => {
    const content = inlineEdits.get(r.homeworkId) ?? ''
    const hw = homeworks.get(r.homeworkId)
    if (!hw || !teacherId) return

    const kept: Record<string, string> = {}
    for (const [id, url] of Object.entries(hw.resources ?? {})) {
      const contentUrl = toYouTubeEmbedUrl(url)
      if (content.includes(contentUrl) || content.includes(contentUrl.replace(/&/g, '&amp;'))) {
        kept[id] = url
      }
    }
    const resources = Object.keys(kept).length > 0 ? kept : undefined

    const path = r.isDraft
      ? `homework/teachers/${teacherId}/drafts/students/${r.studentId}/${r.homeworkId}`
      : `homework/teachers/${teacherId}/students/${r.studentId}/${r.homeworkId}`

    const updatedHw: HomeworkInfo = {
      ...hw,
      ...(r.isDraft ? { editContent: content } : { content }),
      resources,
      updatedAt: new Date().toISOString()
    }

    void set(ref(database, path), removeUndefinedKeys({ ...updatedHw }))
      .then(() => {
        setInlineEdits((prev) => {
          const next = new Map(prev)
          next.delete(r.homeworkId)
          return next
        })
        loadReferences()
      })
      .catch(console.error)
  }

  const handlePublishHomework = (r: ResourceHomeworkReference) => {
    const content = inlineEdits.get(r.homeworkId) ?? ''
    const hw = homeworks.get(r.homeworkId)
    if (!hw || !teacherId) return

    const kept: Record<string, string> = {}
    for (const [id, url] of Object.entries(hw.resources ?? {})) {
      const contentUrl = toYouTubeEmbedUrl(url)
      if (content.includes(contentUrl) || content.includes(contentUrl.replace(/&/g, '&amp;'))) {
        kept[id] = url
      }
    }
    const resources = Object.keys(kept).length > 0 ? kept : undefined

    const titleRegex = /^<h1>(.*?)<\/h1>/
    const titleMatch = content.match(titleRegex)
    const title = titleMatch ? convertHtmlStringToPlain(titleMatch[1]) : 'Untitled'
    const publishedContent = titleMatch ? content.replace(titleRegex, '') : content

    const updatedHw: HomeworkInfo = {
      ...hw,
      title,
      content: publishedContent,
      editContent: '',
      status: HomeworkStatus.PUBLISHED,
      resources,
      updatedAt: new Date().toISOString()
    }

    const publishedPath = `homework/teachers/${teacherId}/students/${r.studentId}/${r.homeworkId}`
    const draftPath = `homework/teachers/${teacherId}/drafts/students/${r.studentId}/${r.homeworkId}`

    void set(ref(database, publishedPath), removeUndefinedKeys({ ...updatedHw }))
      .then(() => remove(ref(database, draftPath)))
      .then(() => {
        setInlineEdits((prev) => {
          const next = new Map(prev)
          next.delete(r.homeworkId)
          return next
        })
        loadReferences()
      })
      .catch(console.error)
  }

  const handleDiscardHomework = (homeworkId: string) => {
    setInlineEdits((prev) => {
      const next = new Map(prev)
      next.delete(homeworkId)
      return next
    })
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const studentGroups = useMemo<StudentGroup[]>(() => {
    const byStudent = new Map<string, StudentGroup>()
    for (const r of references) {
      if (!byStudent.has(r.studentId)) {
        byStudent.set(r.studentId, { studentId: r.studentId, studentName: r.studentName, refs: [] })
      }
      byStudent.get(r.studentId)?.refs.push(r)
    }
    return [...byStudent.values()]
  }, [references])

  const studentDivRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map())
  for (const group of studentGroups) {
    if (!studentDivRefs.current.has(group.studentId)) {
      studentDivRefs.current.set(group.studentId, React.createRef<HTMLDivElement>())
    }
  }

  const tocEntries: TocEntry[] = studentGroups.map((group) => ({
    key: group.studentId,
    ref: studentDivRefs.current.get(group.studentId) as React.RefObject<HTMLDivElement | null>,
    primaryLabel: group.studentName,
    children: group.refs.map((r) => ({
      key: r.homeworkId,
      ref: studentDivRefs.current.get(group.studentId) as React.RefObject<HTMLDivElement | null>,
      primaryLabel: r.isDraft ? `${r.homeworkTitle} (${strings.draft})` : r.homeworkTitle
    }))
  }))

  const canDelete = !refsLoading && references.length === 0

  const handleDeleteConfirm = () => {
    if (!teacherId || !resourceId) return
    void deleteResource(teacherId, resourceId)
      .then(() => navigate('/resources'))
      .catch(console.error)
    setDeleteOpen(false)
  }

  const toc = <TableOfContents entries={tocEntries} />

  return (
    <Container maxWidth="lg" sx={{ pt: 3 }}>
      <Toolbar />

      <Grid2 container spacing={2}>
        <Grid2 xs={12} display={{ xs: 'block', sm: 'none' }}>
          {toc}
        </Grid2>

        <Grid2 xs={12} sm={9} md={10}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Button size="small" onClick={() => navigate(-1)}>
              {strings.back}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Tooltip
              title={canDelete ? '' : strings.deleteDisabledTooltip}
              disableHoverListener={canDelete}>
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={!canDelete}
                  onClick={() => setDeleteOpen(true)}>
                  {strings.deleteResource}
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {resourceLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : resource ? (
            <Box sx={{ mb: 3 }}>
              <ResourceCard
                resource={resource}
                editable
                expanded={resourceExpanded}
                onExpandedChange={setResourceExpanded}
                onEdit={(r) => setEditResourceTarget(r)}
                onDelete={() => setDeleteOpen(true)}
              />
            </Box>
          ) : null}

          <Typography variant="h6" sx={{ mb: 2 }}>
            {strings.usedIn}
          </Typography>

          {refsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : studentGroups.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {strings.noReferences}
            </Typography>
          ) : (
            <Stack spacing={3}>
              {studentGroups.map((group) => (
                <Box
                  key={group.studentId}
                  ref={
                    studentDivRefs.current.get(
                      group.studentId
                    ) as React.MutableRefObject<HTMLDivElement | null>
                  }>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    {group.studentName}
                  </Typography>
                  <Stack spacing={1.5}>
                    {group.refs.map((r) => {
                      const hw = homeworks.get(r.homeworkId)
                      if (!hw) return null
                      return r.isDraft || inlineEdits.has(r.homeworkId) ? (
                        <EditorCard
                          key={r.homeworkId}
                          value={
                            inlineEdits.get(r.homeworkId) ?? (r.isDraft ? hw.editContent ?? '' : '')
                          }
                          resources={teacherResources}
                          teacherId={teacherId}
                          studentId={group.studentId}
                          onInsertResource={(res) => {
                            setHomeworks((prev) => {
                              const existing = prev.get(r.homeworkId)
                              if (!existing) return prev
                              const next = new Map(prev)
                              next.set(r.homeworkId, {
                                ...existing,
                                resources: { ...(existing.resources ?? {}), [res.id]: res.url }
                              })
                              return next
                            })
                          }}
                          onValueChange={(v) =>
                            setInlineEdits((prev) => new Map(prev).set(r.homeworkId, v))
                          }
                          onPublish={() => handlePublishHomework(r)}
                          onSave={() => handleSaveHomework(r)}
                          onDiscard={() => handleDiscardHomework(r.homeworkId)}
                        />
                      ) : (
                        <HomeworkCard
                          key={r.homeworkId}
                          homework={hw}
                          resources={teacherResources.filter(
                            (res) => res.id in (hw.resources ?? {})
                          )}
                          onEdit={() => handleEditHomework(r)}
                        />
                      )
                    })}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Grid2>

        <Grid2 xs={12} sm={3} md={2} display={{ xs: 'none', sm: 'block' }}>
          {toc}
        </Grid2>
      </Grid2>

      <MultiActionDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={strings.deleteConfirmTitle}
        actions={[
          { label: strings.cancel, onClick: () => setDeleteOpen(false) },
          { label: strings.confirm, onClick: handleDeleteConfirm, autoFocus: true }
        ]}>
        <DialogContent>
          <DialogContentText>{strings.deleteConfirmBody}</DialogContentText>
        </DialogContent>
      </MultiActionDialog>

      <EditResourceDialog
        open={editResourceTarget !== null}
        resource={editResourceTarget}
        existingTags={[]}
        onClose={() => setEditResourceTarget(null)}
        onConfirm={handleEditResourceConfirm}
      />
    </Container>
  )
}
