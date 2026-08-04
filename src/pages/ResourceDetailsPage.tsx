import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import YouTubeIcon from '@mui/icons-material/YouTube'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  DialogContent,
  DialogContentText,
  Divider,
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
  ResourceType,
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
  deleteHomeworkConfirmTitle: string
  deleteHomeworkConfirmBody: string
  cancel: string
  confirm: string
  back: string
  draft: string
  edit: string
}

const EN_US: ResourceDetailsPageTexts = {
  usedIn: 'Used in homework',
  noReferences: 'This resource is not used in any homework.',
  deleteResource: 'Delete resource',
  deleteDisabledTooltip: 'Remove this resource from all homework before deleting',
  deleteConfirmTitle: 'Delete resource?',
  deleteConfirmBody: 'This will permanently delete the resource.',
  deleteHomeworkConfirmTitle: 'Delete homework?',
  deleteHomeworkConfirmBody: 'This homework will be permanently deleted.',
  cancel: 'Cancel',
  confirm: 'Delete',
  back: 'Back',
  draft: 'Draft',
  edit: 'Edit'
}

const RO_RO: ResourceDetailsPageTexts = {
  usedIn: 'Folosit în teme',
  noReferences: 'Această resursă nu este folosită în nicio temă.',
  deleteResource: 'Șterge resursa',
  deleteDisabledTooltip: 'Elimină această resursă din toate temele înainte de a o șterge',
  deleteConfirmTitle: 'Ștergi resursa?',
  deleteConfirmBody: 'Resursa va fi ștearsă definitiv.',
  deleteHomeworkConfirmTitle: 'Ștergi tema?',
  deleteHomeworkConfirmBody: 'Această temă va fi ștearsă definitiv.',
  cancel: 'Anulează',
  confirm: 'Șterge',
  back: 'Înapoi',
  draft: 'Ciornă',
  edit: 'Editează'
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

function resourceTypeIcon(type: ResourceType) {
  switch (type) {
    case ResourceType.PDF:
      return <PictureAsPdfIcon color="error" fontSize="large" />
    case ResourceType.AUDIO:
      return <AudiotrackIcon color="primary" fontSize="large" />
    case ResourceType.IMAGE:
      return <ImageIcon color="success" fontSize="large" />
    case ResourceType.YOUTUBE:
      return <YouTubeIcon sx={{ color: '#FF0000', fontSize: '2rem' }} />
  }
}

function ResourcePreview({ resource }: { resource: Resource }) {
  switch (resource.type) {
    case ResourceType.AUDIO:
      return (
        <Box component="audio" controls sx={{ width: '100%', mt: 1.5, display: 'block' }}>
          <source src={resource.url} />
        </Box>
      )
    case ResourceType.PDF:
      return (
        <Box
          component="object"
          data={resource.url}
          type="application/pdf"
          sx={{ width: '100%', height: 500, mt: 1.5, display: 'block' }}>
          <Typography variant="body2" color="text.secondary">
            <a href={resource.url} target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </Typography>
        </Box>
      )
    case ResourceType.IMAGE:
      return (
        <Box
          component="img"
          src={resource.url}
          alt={resource.title}
          sx={{
            width: '100%',
            maxWidth: { md: '60%' },
            mt: 1.5,
            display: 'block',
            borderRadius: 1,
            mx: 'auto'
          }}
        />
      )
    case ResourceType.YOUTUBE: {
      try {
        const urlObj = new URL(resource.url)
        let videoId: string | null = null
        if (urlObj.hostname === 'youtu.be') {
          videoId = urlObj.pathname.slice(1)
        } else if (urlObj.hostname.includes('youtube.com')) {
          if (urlObj.pathname === '/watch') {
            videoId = urlObj.searchParams.get('v')
          } else if (urlObj.pathname.startsWith('/embed/')) {
            videoId = urlObj.pathname.split('/embed/')[1]
          }
        }
        if (!videoId) return null
        const embedUrl = `https://www.youtube.com/embed/${videoId}`
        return (
          <Box
            component="iframe"
            src={embedUrl}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sx={{ width: '100%', height: 400, mt: 1.5, display: 'block', border: 'none' }}
          />
        )
      } catch {
        return null
      }
    }
  }
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
    if (!user.uid) navigate('/login')
  }, [user, navigate])

  const isTeacher = user?.role === UserRole.TEACHER

  const [resolvedTeacherId, setResolvedTeacherId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) return
    if (!resourceId) return
    if (user.role === UserRole.TEACHER) {
      setResolvedTeacherId(user.uid)
      return
    }
    // Student: find which of their teachers owns this resource
    get(ref(database, `students/${user.uid}/teachers`))
      .then((snap) => {
        if (!snap.exists()) return []
        return Object.keys(snap.val() as Record<string, unknown>)
      })
      .then((teacherIds) =>
        Promise.all(
          teacherIds.map(async (tid) => {
            const snap = await get(ref(database, `resources/teachers/${tid}/${resourceId}`))
            return snap.exists() ? tid : null
          })
        )
      )
      .then((results) => {
        const found = results.find(Boolean)
        if (found) setResolvedTeacherId(found)
      })
      .catch(() => {})
  }, [user, resourceId])

  const teacherId = resolvedTeacherId

  // ── Resource card state ────────────────────────────────────────────────────
  const [resource, setResource] = useState<Resource | null>(null)
  const [resourceLoading, setResourceLoading] = useState(true)
  const [editResourceTarget, setEditResourceTarget] = useState<Resource | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteHomeworkTarget, setDeleteHomeworkTarget] =
    useState<ResourceHomeworkReference | null>(null)

  useEffect(() => {
    if (!teacherId || !resourceId) return
    get(ref(database, `resources/teachers/${teacherId}/${resourceId}`))
      .then((snap) => {
        if (snap.exists()) {
          const record = snap.val() as Omit<Resource, 'id'>
          setResource({ id: resourceId, ...record, tags: record.tags ?? {} })
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
    findResourceUsageInHomework(
      teacherId,
      resourceId,
      resource?.url,
      isTeacher ? undefined : user?.uid
    )
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
  }, [teacherId, resourceId, resource?.url])

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
  const visibleRefs = isTeacher ? references : references.filter((r) => r.studentId === user?.uid)

  const studentGroups = useMemo<StudentGroup[]>(() => {
    const byStudent = new Map<string, StudentGroup>()
    for (const r of visibleRefs) {
      if (!byStudent.has(r.studentId)) {
        byStudent.set(r.studentId, { studentId: r.studentId, studentName: r.studentName, refs: [] })
      }
      byStudent.get(r.studentId)?.refs.push(r)
    }
    return [...byStudent.values()]
  }, [visibleRefs])

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

  const handleDeleteHomeworkConfirm = () => {
    const r = deleteHomeworkTarget
    if (!r || !teacherId) return
    setDeleteHomeworkTarget(null)
    const hw = homeworks.get(r.homeworkId)
    const updatedHw = hw
      ? { ...hw, updatedAt: new Date().toISOString(), deletedAt: new Date().toISOString() }
      : null
    if (updatedHw) {
      void set(
        ref(
          database,
          `deleted/homework/teachers/${teacherId}/students/${r.studentId}/${r.homeworkId}`
        ),
        removeUndefinedKeys(updatedHw)
      ).catch(console.error)
    }
    void remove(
      ref(database, `homework/teachers/${teacherId}/students/${r.studentId}/${r.homeworkId}`)
    )
      .then(() =>
        remove(
          ref(
            database,
            `homework/teachers/${teacherId}/drafts/students/${r.studentId}/${r.homeworkId}`
          )
        )
      )
      .then(() => loadReferences())
      .catch(console.error)
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
            {isTeacher && (
              <>
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
              </>
            )}
          </Stack>

          {resourceLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : resource ? (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
                <Box sx={{ flexShrink: 0, mt: 0.5 }}>{resourceTypeIcon(resource.type)}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    spacing={1}>
                    <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
                      {resource.title}
                    </Typography>
                    {isTeacher && (
                      <Button
                        size="small"
                        sx={{ flexShrink: 0 }}
                        onClick={() => setEditResourceTarget(resource)}>
                        {strings.edit}
                      </Button>
                    )}
                  </Stack>
                  {resource.createdAt && (
                    <Typography variant="caption" color="text.secondary">
                      {localeManager.formatLongDate(resource.createdAt, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  )}
                  {Object.values(resource.tags ?? {}).length > 0 && (
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                      {Object.values(resource.tags ?? {}).map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
              {resource.url && <ResourcePreview resource={resource} />}
              <Divider sx={{ mt: 3 }} />
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
                      return isTeacher && (r.isDraft || inlineEdits.has(r.homeworkId)) ? (
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
                          onEdit={isTeacher ? () => handleEditHomework(r) : undefined}
                          onDelete={isTeacher ? () => setDeleteHomeworkTarget(r) : undefined}
                          readonly={!isTeacher}
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

      <MultiActionDialog
        open={deleteHomeworkTarget !== null}
        onClose={() => setDeleteHomeworkTarget(null)}
        title={strings.deleteHomeworkConfirmTitle}
        actions={[
          { label: strings.cancel, onClick: () => setDeleteHomeworkTarget(null) },
          { label: strings.confirm, onClick: handleDeleteHomeworkConfirm, autoFocus: true }
        ]}>
        <DialogContent>
          <DialogContentText>{strings.deleteHomeworkConfirmBody}</DialogContentText>
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
