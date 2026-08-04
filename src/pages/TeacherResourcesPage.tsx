import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import YouTubeIcon from '@mui/icons-material/YouTube'
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Container,
  DialogContent,
  DialogContentText,
  Divider,
  Link,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import MultiActionDialog from '../Components/MultiActionDialog'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import FabCreate from '../Components/FabCreate'
import ResourceList from '../Components/ResourceList'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import EditResourceDialog from '../Components/EditResourceDialog'
import ResourceUploadDialog, { UploadConfirmData } from '../Components/ResourceUploadDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import {
  DuplicateGroup,
  ImportResult,
  Resource,
  ResourceType,
  addYouTubeResource,
  deduplicateSingleGroup,
  deleteResource,
  findDuplicateGroups,
  findResourceUsageInHomework,
  importExistingUploads,
  updateResourceMetadata,
  uploadResource,
  useTeacherResources
} from '../util/resources'
import { SortOption, useResourcePageState } from './useResourcePageState'

function resourceTypeIcon(type: ResourceType) {
  switch (type) {
    case ResourceType.PDF:
      return <PictureAsPdfIcon color="error" />
    case ResourceType.AUDIO:
      return <AudiotrackIcon color="primary" />
    case ResourceType.IMAGE:
      return <ImageIcon color="success" />
    case ResourceType.YOUTUBE:
      return <YouTubeIcon sx={{ color: '#FF0000' }} />
  }
}

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
  importUploads: string
  importing: string
  importNone: string
  importDone: string
  duplicatesTitle: string
  duplicateLinks: string
  mergeGroup: string
  merging: string
  mergeConfirmTitle: string
  mergeCanonical: string
  mergeWillDelete: string
  mergeHomeworkNote: string
  youtubeAlreadyExistsTitle: string
  youtubeAlreadyExistsBody: string
  ok: string
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
  no: 'Cancel',
  importUploads: 'Import uploads',
  importing: 'Importing…',
  importNone: 'No new files found',
  importDone: 'files imported',
  duplicatesTitle: 'Duplicate groups',
  duplicateLinks: 'Duplicates:',
  mergeGroup: 'Merge',
  merging: 'Merging…',
  mergeConfirmTitle: 'Merge duplicates?',
  mergeCanonical: 'Canonical file (will be kept):',
  mergeWillDelete: 'Duplicates to delete:',
  mergeHomeworkNote:
    'All homework entries that embed these files will be updated to use the canonical file.',
  youtubeAlreadyExistsTitle: 'Video already in library',
  youtubeAlreadyExistsBody: 'This video is already in your library.',
  ok: 'OK'
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
  no: 'Anulează',
  importUploads: 'Importă fișiere',
  importing: 'Se importă…',
  importNone: 'Nu s-au găsit fișiere noi',
  importDone: 'fișiere importate',
  duplicatesTitle: 'Grupuri de duplicate',
  duplicateLinks: 'Duplicate:',
  mergeGroup: 'Unifică',
  merging: 'Se unifică…',
  mergeConfirmTitle: 'Unești duplicatele?',
  mergeCanonical: 'Fișier canonic (va fi păstrat):',
  mergeWillDelete: 'Duplicate de șters:',
  mergeHomeworkNote:
    'Toate temele care conțin aceste fișiere vor fi actualizate să folosească fișierul canonic.',
  youtubeAlreadyExistsTitle: 'Videoclip deja în bibliotecă',
  youtubeAlreadyExistsBody: 'Acest videoclip este deja în biblioteca ta.',
  ok: 'OK'
}

const TEACHER_RESOURCES_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

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

  const { resources, loading: resourcesLoading } = useTeacherResources(user?.uid)

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

  const [uploadOpen, setUploadOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Resource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null)
  const [deleteRefsLoading, setDeleteRefsLoading] = useState(false)
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [deduplicateTarget, setDeduplicateTarget] = useState<DuplicateGroup | null>(null)
  const [deduplicatingGroup, setDeduplicatingGroup] = useState(false)
  const [youtubeDupDialogOpen, setYoutubeDupDialogOpen] = useState(false)

  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  useEffect(() => {
    const teacherId = user?.uid
    if (!teacherId) return
    findDuplicateGroups(teacherId).then(setDuplicateGroups).catch(console.error)
  }, [user?.uid, resources.length])

  useEffect(() => {
    if (!importMessage) return
    const timer = setTimeout(() => setImportMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [importMessage])

  const handleImport = async () => {
    const teacherId = user?.uid
    if (!teacherId || importing) return
    setImporting(true)
    setImportMessage(null)
    try {
      const result: ImportResult = await importExistingUploads(teacherId, user.accessToken)
      if (result.imported === 0) {
        setImportMessage(strings.importNone)
      } else {
        setImportMessage(`${result.imported} ${strings.importDone}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setImporting(false)
    }
  }

  const handleMergeConfirm = () => {
    const teacherId = user?.uid
    if (!teacherId || !deduplicateTarget || deduplicatingGroup) return
    setDeduplicatingGroup(true)
    deduplicateSingleGroup(teacherId, deduplicateTarget)
      .then(() => setDeduplicateTarget(null))
      .catch(console.error)
      .finally(() => setDeduplicatingGroup(false))
  }

  useEffect(() => {
    if (!deleteTarget || !user?.uid) return
    setDeleteRefsLoading(true)
    setDeleteBlocked(false)
    findResourceUsageInHomework(user.uid, deleteTarget.id, deleteTarget.url)
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

  const handleUploadConfirm = (data: UploadConfirmData) => {
    const teacherId = user?.uid
    if (!teacherId) return
    const { title, tags } = data
    if (data.mode === 'youtube') {
      void addYouTubeResource(teacherId, data.url, { title, tags }, resources)
        .then((id) => {
          if (resources.some((r) => r.id === id)) setYoutubeDupDialogOpen(true)
        })
        .catch(console.error)
    } else {
      void uploadResource({ teacherId, file: data.file, metadata: { title, tags } }).catch(
        console.error
      )
    }
    setUploadOpen(false)
  }

  const duplicateIds = useMemo(
    () => new Set(duplicateGroups.flatMap((g) => g.duplicates.map((d) => d.id))),
    [duplicateGroups]
  )

  const canonicalGroupMap = useMemo(
    () => new Map(duplicateGroups.map((g) => [g.canonical.id, g])),
    [duplicateGroups]
  )

  // Pre-filter duplicates before passing to hook so they are excluded from
  // visibleResources and tagIndex. Canonical resources (the kept copies) are
  // still shown; only the duplicate entries are hidden.
  const nonDuplicateResources = useMemo(
    () => resources.filter((r) => !duplicateIds.has(r.id)),
    [resources, duplicateIds]
  )

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
  } = useResourcePageState(nonDuplicateResources, 'resources-state:teacher')

  const allExpanded = resources.every((r) => expandedMap[r.id])

  const toggleAll = () => {
    const next = !allExpanded
    setExpandedMap(Object.fromEntries(resources.map((r) => [r.id, next])))
  }

  const setExpanded = (id: string, value: boolean) => {
    setExpandedMap((prev) => ({ ...prev, [id]: value }))
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
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
          <Button
            sx={{ display: { xs: 'none', lg: 'block' } }}
            size="small"
            disabled={importing}
            onClick={() => {
              void handleImport()
            }}>
            {importing ? strings.importing : strings.importUploads}
          </Button>
        </Stack>
      </Stack>
      {importMessage !== null && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {importMessage}
        </Typography>
      )}
      <ResourceTagFilter
        tags={tagIndex.map(({ slug, label }) => ({ slug, label }))}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        selectedTypes={selectedTypes}
        onSearchChange={setSearchQuery}
        onTagToggle={handleTagToggle}
        onTypeToggle={handleTypeToggle}
      />
      {resourcesLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
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
        getFooter={(resource) => {
          const group = canonicalGroupMap.get(resource.id)
          if (!group) return undefined
          return (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 2, pt: 1.25, pb: 0.5, display: 'block' }}>
                {strings.duplicateLinks}
              </Typography>
              {group.duplicates.map((dup, i) => (
                <React.Fragment key={dup.id}>
                  {i > 0 && <Divider />}
                  <ButtonBase
                    onClick={() => navigate(`/resources/${dup.id}`)}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.25,
                      justifyContent: 'flex-start',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}>
                    {resourceTypeIcon(dup.type)}
                    <Typography variant="body2" noWrap>
                      {dup.title}
                    </Typography>
                  </ButtonBase>
                </React.Fragment>
              ))}
              <Box sx={{ px: 2, py: 1 }}>
                <Button size="small" variant="outlined" onClick={() => setDeduplicateTarget(group)}>
                  {strings.mergeGroup}
                </Button>
              </Box>
            </>
          )
        }}
      />

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

      <MultiActionDialog
        open={deduplicateTarget !== null}
        onClose={() => {
          if (!deduplicatingGroup) setDeduplicateTarget(null)
        }}
        title={strings.mergeConfirmTitle}
        actions={[
          {
            label: strings.no,
            onClick: () => setDeduplicateTarget(null),
            disabled: deduplicatingGroup
          },
          {
            label: deduplicatingGroup ? strings.merging : strings.mergeGroup,
            onClick: handleMergeConfirm,
            autoFocus: true,
            disabled: deduplicatingGroup
          }
        ]}>
        <DialogContent>
          <DialogContentText>{strings.mergeCanonical}</DialogContentText>
          {deduplicateTarget && (
            <Typography variant="body2" sx={{ mt: 0.5, mb: 1.5 }}>
              <Link href={deduplicateTarget.canonical.url} target="_blank" rel="noreferrer">
                {deduplicateTarget.canonical.title}
              </Link>
            </Typography>
          )}
          <DialogContentText>{strings.mergeWillDelete}</DialogContentText>
          <Stack spacing={0.25} sx={{ mt: 0.5, mb: 1.5 }}>
            {deduplicateTarget?.duplicates.map((dup) => (
              <Typography key={dup.id} variant="body2">
                <Link component={RouterLink} to={`/resources/${dup.id}`} target="_blank">
                  {dup.title}
                </Link>
              </Typography>
            ))}
          </Stack>
          <DialogContentText>{strings.mergeHomeworkNote}</DialogContentText>
        </DialogContent>
      </MultiActionDialog>

      <MultiActionDialog
        open={youtubeDupDialogOpen}
        onClose={() => setYoutubeDupDialogOpen(false)}
        title={strings.youtubeAlreadyExistsTitle}
        actions={[
          {
            label: strings.ok,
            onClick: () => {
              setYoutubeDupDialogOpen(false)
              setUploadOpen(true)
            }
          }
        ]}>
        <DialogContent>
          <DialogContentText>{strings.youtubeAlreadyExistsBody}</DialogContentText>
        </DialogContent>
      </MultiActionDialog>
    </Container>
  )
}
