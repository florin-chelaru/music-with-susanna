import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Button, Container, IconButton, Stack, Toolbar, Typography } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ResourceCard from '../Components/ResourceCard'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import TableOfContents, { TocEntry } from '../TableOfContents'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, ResourceType } from '../util/resources'
import { MOCK_STUDENTS } from './TeacherResourcesPage'

interface StudentResourcesPageTexts {
  sharedWith: string
  expandAll: string
  collapseAll: string
  addFromLibrary: string
  backToLibrary: string
}

const EN_US: StudentResourcesPageTexts = {
  sharedWith: 'Shared with',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  addFromLibrary: 'Add from Library',
  backToLibrary: 'Back to Library'
}

const RO_RO: StudentResourcesPageTexts = {
  sharedWith: 'Partajat cu',
  expandAll: 'Extinde Toate',
  collapseAll: 'Restrânge Toate',
  addFromLibrary: 'Adaugă din Bibliotecă',
  backToLibrary: 'Înapoi la Bibliotecă'
}

const STUDENT_RESOURCES_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

const MOCK_ALL_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Invoice — Sample PDF',
    type: ResourceType.PDF,
    url: 'https://firebasestorage.googleapis.com/v0/b/music-with-susanna.appspot.com/o/users%2FCgOaIwnaE5TPVsiRrsB9krTaC092%2Ffiles%2F2026-07-27%20-%20Twinfog%20QC%20Ware%20Invoice_DkCHGYPUfD.pdf?alt=media&token=98aaf657-49b0-40b4-84cd-11919e2b9da8',
    fileName: 'invoice.pdf',
    tags: { scales: 'Scales', beginner: 'Beginner' },
    createdAt: 0
  },
  {
    id: '2',
    title: 'Minuet 3 — J. S. Bach',
    type: ResourceType.AUDIO,
    url: 'https://firebasestorage.googleapis.com/v0/b/music-with-susanna.appspot.com/o/users%2FCgOaIwnaE5TPVsiRrsB9krTaC092%2Ffiles%2F20%20Minuet%203%20%5BJ.%20S.%20Bach%5D_UAw3qRRVIN.mp3?alt=media&token=25c51400-6ed1-44f9-bfab-fe23f86d7c88',
    tags: { scales: 'Scales' },
    createdAt: 0
  },
  {
    id: '3',
    title: 'Lesson Photo',
    type: ResourceType.IMAGE,
    url: 'https://firebasestorage.googleapis.com/v0/b/music-with-susanna.appspot.com/o/users%2FCgOaIwnaE5TPVsiRrsB9krTaC092%2Ffiles%2F20240912_135617_BtXFvayhEC.jpg?alt=media&token=9d0899d1-e189-404c-bee6-a86649a08af5',
    tags: { technique: 'Technique', beginner: 'Beginner' },
    createdAt: 0
  },
  {
    id: '4',
    title: 'Violin Lesson — YouTube Demo',
    type: ResourceType.YOUTUBE,
    url: 'https://www.youtube.com/watch?v=FiZEZuCRTZI',
    tags: { suzuki: 'Suzuki', beginner: 'Beginner' },
    createdAt: 0
  }
]

// Mock: first two resources are shared with every student by default
const MOCK_DEFAULT_SHARED_IDS = new Set(['1', '2'])

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

export default function StudentResourcesPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()

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

  const student = MOCK_STUDENTS.find((s) => s.id === studentId) ?? {
    id: studentId,
    name: studentId
  }

  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set(MOCK_DEFAULT_SHARED_IDS))
  const sharedResources = MOCK_ALL_RESOURCES.filter((r) => sharedIds.has(r.id))

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK_ALL_RESOURCES.map((r) => [r.id, false]))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const handleRemove = (resource: Resource) => {
    setSharedIds((prev) => {
      const next = new Set(prev)
      next.delete(resource.id)
      return next
    })
  }

  const handleTagToggle = (slug: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const visibleResources = sharedResources.filter((r) => {
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedTags.size > 0 && !Array.from(selectedTags).some((slug) => slug in r.tags))
      return false
    return true
  })

  const allExpanded = sharedResources.every((r) => expandedMap[r.id])
  const toggleAll = () => {
    const next = !allExpanded
    setExpandedMap((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, next])))
  }
  const setExpanded = (id: string, value: boolean) =>
    setExpandedMap((prev) => ({ ...prev, [id]: value }))

  const resourceRefsMap = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(
    new Map(MOCK_ALL_RESOURCES.map((r) => [r.id, React.createRef<HTMLDivElement>()]))
  )

  const tagIndex = useMemo(() => buildTagIndex(sharedResources), [sharedResources])

  const tocEntries: TocEntry[] = tagIndex.map(({ slug, label, firstResourceId }) => ({
    key: slug,
    ref: resourceRefsMap.current.get(firstResourceId) as React.RefObject<HTMLDivElement | null>,
    primaryLabel: label,
    children: sharedResources
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

        <Grid2 xs={12} sm={9} md={10}>
          {/* Breadcrumb */}
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
            <IconButton size="small" onClick={() => navigate('/resources')}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {strings.backToLibrary}
            </Typography>
          </Stack>

          {/* Header row */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5">
              {strings.sharedWith}: <strong>{student.name}</strong>
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => console.log('add from library for', studentId)}>
                {strings.addFromLibrary}
              </Button>
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
                  expanded={expandedMap[resource.id] ?? false}
                  onExpandedChange={(v) => setExpanded(resource.id, v)}
                  onRemove={handleRemove}
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
    </Container>
  )
}
