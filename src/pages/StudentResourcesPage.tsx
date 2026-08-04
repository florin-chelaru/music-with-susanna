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
import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EditResourceDialog from '../Components/EditResourceDialog'
import MultiActionDialog from '../Components/MultiActionDialog'
import ResourceList from '../Components/ResourceList'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import {
  Resource,
  deleteResource,
  findResourceUsageInHomework,
  updateResourceMetadata,
  useHomeworkResources
} from '../util/resources'
import { get, ref } from 'firebase/database'
import { SortOption, useResourcePageState } from './useResourcePageState'

interface StudentResourcesPageTexts {
  homeworkResourcesFor: string
  expandAll: string
  collapseAll: string
  back: string
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

const EN_US: StudentResourcesPageTexts = {
  homeworkResourcesFor: 'Homework resources for',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  back: 'Back',
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

const RO_RO: StudentResourcesPageTexts = {
  homeworkResourcesFor: 'Resurse din teme pentru',
  expandAll: 'Extinde Toate',
  collapseAll: 'Restrânge Toate',
  back: 'Înapoi',
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

const STUDENT_RESOURCES_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function StudentResourcesPage() {
  const { studentId } = useParams<{ studentId: string }>()
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

  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(
        StudentResourcesPage.name,
        STUDENT_RESOURCES_PAGE_TEXTS
      ),
    []
  )
  const strings = localeManager.componentStrings(
    StudentResourcesPage.name
  ) as StudentResourcesPageTexts

  const [studentName, setStudentName] = useState<string>(studentId ?? '')

  useEffect(() => {
    if (!studentId) return
    get(ref(database, `users/${studentId}`))
      .then((snapshot) => {
        const name = snapshot.val()?.name
        if (name) setStudentName(name as string)
      })
      .catch(() => {})
  }, [studentId])

  const { resources } = useHomeworkResources(user?.uid, studentId)

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

  const storageKey = `resources-state:student:${studentId ?? ''}`
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    handleTagToggle,
    selectedTypes,
    handleTypeToggle,
    sortBy,
    setSortBy,
    pagedResources,
    hasMore,
    loadMore,
    tagIndex,
    bookmarkResource
  } = useResourcePageState(resources, storageKey)

  const allExpanded = resources.every((r) => expandedMap[r.id])
  const toggleAll = () => {
    const next = !allExpanded
    setExpandedMap(Object.fromEntries(resources.map((r) => [r.id, next])))
  }
  const setExpanded = (id: string, value: boolean) =>
    setExpandedMap((prev) => ({ ...prev, [id]: value }))

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

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button size="small" onClick={() => navigate(-1)}>
            {strings.back}
          </Button>
          <Typography variant="h5">
            {strings.homeworkResourcesFor}: <strong>{studentName}</strong>
          </Typography>
        </Stack>
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
        selectedTypes={selectedTypes}
        onSearchChange={setSearchQuery}
        onTagToggle={handleTagToggle}
        onTypeToggle={handleTypeToggle}
      />

      <ResourceList
        resources={pagedResources}
        hasMore={hasMore}
        loadMore={loadMore}
        expandedMap={expandedMap}
        onExpandedChange={setExpanded}
        editable
        onEdit={(r) => setEditTarget(r)}
        onDelete={(r) => setDeleteTarget(r)}
        onDetails={(r) => {
          bookmarkResource(r.id)
          navigate(`/resources/${r.id}`)
        }}
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
