import {
  Box,
  Button,
  CircularProgress,
  Container,
  DialogContent,
  DialogContentText,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import MultiActionDialog from '../Components/MultiActionDialog'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FabCreate from '../Components/FabCreate'
import ResourceCard from '../Components/ResourceCard'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import EditResourceDialog from '../Components/EditResourceDialog'
import ResourceUploadDialog, { UploadConfirmData } from '../Components/ResourceUploadDialog'
import TableOfContents, { TocEntry } from '../TableOfContents'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import {
  Resource,
  addYouTubeResource,
  deleteResource,
  findResourceUsageInHomework,
  updateResourceMetadata,
  uploadResource,
  useTeacherResources
} from '../util/resources'

type SortOption = 'name' | 'date-desc' | 'date-asc'

interface TeacherResourcesPageTexts {
  resources: string
  expandAll: string
  collapseAll: string
  sortBy: string
  sortName: string
  sortDateNewest: string
  sortDateOldest: string
  deleteConfirmTitle: string
  deleteConfirmBody: string
  deleteBlockedTitle: string
  deleteBlockedBody: string
  viewDetails: string
  yes: string
  no: string
}

const EN_US: TeacherResourcesPageTexts = {
  resources: 'Resources',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  sortBy: 'Sort',
  sortName: 'Name',
  sortDateNewest: 'Newest first',
  sortDateOldest: 'Oldest first',
  deleteConfirmTitle: 'Delete resource?',
  deleteConfirmBody: 'This will permanently delete the resource and remove it from all students.',
  deleteBlockedTitle: 'Cannot delete resource',
  deleteBlockedBody:
    'This resource is still referenced in homework assignments. Please remove it from there first and then try again.',
  viewDetails: 'View details',
  yes: 'Delete',
  no: 'Cancel'
}

const RO_RO: TeacherResourcesPageTexts = {
  resources: 'Resurse',
  expandAll: 'Extinde Toate',
  collapseAll: 'Restrânge Toate',
  sortBy: 'Sortare',
  sortName: 'Nume',
  sortDateNewest: 'Recente',
  sortDateOldest: 'Vechi',
  deleteConfirmTitle: 'Ștergi resursa?',
  deleteConfirmBody: 'Resursa va fi ștearsă definitiv și eliminată de la toți elevii.',
  deleteBlockedTitle: 'Resursa nu poate fi ștearsă',
  deleteBlockedBody:
    'Această resursă este încă referențiată în teme. Elimină-o mai întâi de acolo și încearcă din nou.',
  viewDetails: 'Vezi detalii',
  yes: 'Șterge',
  no: 'Anulează'
}

const TEACHER_RESOURCES_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

/** Unique tags in order of first appearance, each mapped to the first resource that has it. */
function buildTagIndex(
  resources: Resource[]
): Array<{ slug: string; label: string; firstResourceId: string }> {
  const seen = new Set<string>()
  const result: Array<{ slug: string; label: string; firstResourceId: string }> = []
  for (const resource of resources) {
    for (const [slug, label] of Object.entries(resource.tags)) {
      if (!seen.has(slug)) {
        seen.add(slug)
        result.push({ slug, label, firstResourceId: resource.id })
      }
    }
  }
  return result
}

export interface TeacherResourcesPageProps {}

export default function TeacherResourcesPage({}: TeacherResourcesPageProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(
        TeacherResourcesPage.name,
        TEACHER_RESOURCES_PAGE_TEXTS
      ),
    []
  )
  const strings = localeManager.componentStrings(
    TeacherResourcesPage.name
  ) as TeacherResourcesPageTexts

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

  const { resources } = useTeacherResources(user?.uid)

  // Expand map: new resources start expanded
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  useEffect(() => {
    setExpandedMap((prev) => {
      const newEntries = resources
        .filter((r) => !(r.id in prev))
        .map((r): [string, boolean] => [r.id, true])
      if (newEntries.length === 0) return prev
      return { ...prev, ...Object.fromEntries(newEntries) }
    })
  }, [resources])

  // Stable ref map that grows as resources arrive
  const resourceRefsMap = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map())
  for (const r of resources) {
    if (!resourceRefsMap.current.has(r.id)) {
      resourceRefsMap.current.set(r.id, React.createRef<HTMLDivElement>())
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Resource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null)
  const [deleteRefsLoading, setDeleteRefsLoading] = useState(false)
  const [deleteBlocked, setDeleteBlocked] = useState(false)

  useEffect(() => {
    if (!deleteTarget || !user?.uid) return
    setDeleteRefsLoading(true)
    setDeleteBlocked(false)
    findResourceUsageInHomework(user.uid, deleteTarget.id)
      .then((refs) => {
        setDeleteBlocked(refs.length > 0)
        setDeleteRefsLoading(false)
      })
      .catch(() => setDeleteRefsLoading(false))
  }, [deleteTarget, user?.uid])

  const handleEditConfirm = (patch: { title: string; tags: Record<string, string> }) => {
    const teacherId = user?.uid
    if (!teacherId || !editTarget) return
    void updateResourceMetadata(teacherId, editTarget.id, patch).catch(console.error)
  }

  const handleDeleteConfirm = () => {
    const teacherId = user?.uid
    if (!teacherId || !deleteTarget) return
    void deleteResource(teacherId, deleteTarget.id).catch(console.error)
    setDeleteTarget(null)
  }

  const handleTagToggle = (slug: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  const handleUploadConfirm = (data: UploadConfirmData) => {
    const teacherId = user?.uid
    if (!teacherId) return
    const { title, tags } = data
    if (data.mode === 'youtube') {
      void addYouTubeResource(teacherId, data.url, { title, tags }).catch(console.error)
    } else {
      void uploadResource({ teacherId, file: data.file, metadata: { title, tags } }).catch(
        console.error
      )
    }
    setUploadOpen(false)
  }

  const visibleResources = resources
    .filter((r) => {
      if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedTags.size > 0 && !Array.from(selectedTags).some((slug) => slug in r.tags))
        return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      if (sortBy === 'date-desc')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const allExpanded = resources.every((r) => expandedMap[r.id])

  const toggleAll = () => {
    const next = !allExpanded
    setExpandedMap(Object.fromEntries(resources.map((r) => [r.id, next])))
  }

  const setExpanded = (id: string, value: boolean) => {
    setExpandedMap((prev) => ({ ...prev, [id]: value }))
  }

  const tagIndex = useMemo(() => buildTagIndex(resources), [resources])

  const tocEntries: TocEntry[] = tagIndex.map(({ slug, label, firstResourceId }) => ({
    key: slug,
    ref: resourceRefsMap.current.get(firstResourceId) as React.RefObject<HTMLDivElement | null>,
    primaryLabel: label,
    children: resources
      .filter((r) => slug in r.tags)
      .map((r) => ({
        key: `${slug}-${r.id}`,
        ref: resourceRefsMap.current.get(r.id) as React.RefObject<HTMLDivElement | null>,
        primaryLabel: r.title
      }))
  }))

  const toc = <TableOfContents entries={tocEntries} />

  return (
    <Container maxWidth="lg" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        {/* Mobile-only TOC at top */}
        <Grid2 xs={12} display={{ xs: 'block', sm: 'none' }}>
          {toc}
        </Grid2>

        {/* Header, filter, and resource cards — constrained to cards column width */}
        <Grid2 xs={12} sm={9} md={10}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5">{strings.resources}</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" color="text.secondary" component="span">
                {strings.sortBy}
              </Typography>
              <Select
                size="small"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                sx={{ fontSize: '0.8125rem' }}>
                <MenuItem value="name">{strings.sortName}</MenuItem>
                <MenuItem value="date-desc">{strings.sortDateNewest}</MenuItem>
                <MenuItem value="date-asc">{strings.sortDateOldest}</MenuItem>
              </Select>
              <Button size="small" onClick={toggleAll}>
                {allExpanded ? strings.collapseAll : strings.expandAll}
              </Button>
            </Stack>
          </Stack>
          <ResourceTagFilter
            tags={tagIndex.map(({ slug, label }) => ({ slug, label }))}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            onSearchChange={setSearchQuery}
            onTagToggle={handleTagToggle}
          />
          <Grid2 container spacing={2} sx={{ mt: 1 }}>
            {visibleResources.map((resource) => (
              <Grid2
                xs={12}
                key={resource.id}
                ref={
                  resourceRefsMap.current.get(
                    resource.id
                  ) as React.MutableRefObject<HTMLDivElement | null>
                }>
                <ResourceCard
                  resource={resource}
                  editable
                  expanded={expandedMap[resource.id] ?? false}
                  onExpandedChange={(v) => setExpanded(resource.id, v)}
                  onEdit={(r) => setEditTarget(r)}
                  onDelete={(r) => setDeleteTarget(r)}
                  onDetails={(r) => navigate(`/resources/${r.id}`)}
                />
              </Grid2>
            ))}
          </Grid2>
        </Grid2>

        {/* Sticky TOC sidebar */}
        <Grid2 xs={12} sm={3} md={2} display={{ xs: 'none', sm: 'block' }}>
          {toc}
        </Grid2>
      </Grid2>

      <FabCreate onClick={() => setUploadOpen(true)} />

      <ResourceUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        existingTags={tagIndex.map(({ label }) => label)}
        onConfirm={handleUploadConfirm}
      />

      <EditResourceDialog
        open={editTarget !== null}
        resource={editTarget}
        existingTags={tagIndex.map(({ label }) => label)}
        onClose={() => setEditTarget(null)}
        onConfirm={handleEditConfirm}
      />

      <MultiActionDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteBlocked ? strings.deleteBlockedTitle : strings.deleteConfirmTitle}
        actions={
          deleteRefsLoading
            ? [{ label: strings.no, onClick: () => setDeleteTarget(null) }]
            : deleteBlocked
            ? [
                { label: strings.no, onClick: () => setDeleteTarget(null) },
                {
                  label: strings.viewDetails,
                  onClick: () => {
                    if (deleteTarget) navigate(`/resources/${deleteTarget.id}`)
                    setDeleteTarget(null)
                  },
                  autoFocus: true
                }
              ]
            : [
                { label: strings.no, onClick: () => setDeleteTarget(null) },
                { label: strings.yes, onClick: handleDeleteConfirm, autoFocus: true }
              ]
        }>
        <DialogContent>
          {deleteRefsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <DialogContentText>
              {deleteBlocked ? strings.deleteBlockedBody : strings.deleteConfirmBody}
            </DialogContentText>
          )}
        </DialogContent>
      </MultiActionDialog>
    </Container>
  )
}
