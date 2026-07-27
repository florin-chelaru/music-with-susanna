import { Button, Container, Stack, Toolbar, Typography } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useMemo, useRef, useState } from 'react'
import FabCreate from '../Components/FabCreate'
import ResourceCard from '../Components/ResourceCard'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import ResourceUploadDialog from '../Components/ResourceUploadDialog'
import ShareResourceDialog, { MockStudent } from '../Components/ShareResourceDialog'
import TableOfContents, { TocEntry } from '../TableOfContents'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, ResourceType } from '../util/resources'

export const MOCK_STUDENTS: MockStudent[] = [
  { id: 'student-1', name: 'Ana Pop' },
  { id: 'student-2', name: 'Mihai Ionescu' },
  { id: 'student-3', name: 'Elena Dumitrescu' }
]

interface TeacherResourcesPageTexts {
  resources: string
  expandAll: string
  collapseAll: string
}

const EN_US: TeacherResourcesPageTexts = {
  resources: 'Resources',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All'
}

const RO_RO: TeacherResourcesPageTexts = {
  resources: 'Resurse',
  expandAll: 'Extinde Toate',
  collapseAll: 'Restrânge Toate'
}

const TEACHER_RESOURCES_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

const MOCK_RESOURCES: Resource[] = [
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

function initExpandedMap(resources: Resource[]): Record<string, boolean> {
  return Object.fromEntries(resources.map((r) => [r.id, false]))
}

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

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() =>
    initExpandedMap(MOCK_RESOURCES)
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [uploadOpen, setUploadOpen] = useState(false)
  const [shareResource, setShareResource] = useState<Resource | null>(null)
  const [sharedMap, setSharedMap] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(MOCK_RESOURCES.map((r) => [r.id, new Set<string>()]))
  )

  const handleShareConfirm = (resourceId: string, selectedIds: Set<string>) => {
    setSharedMap((prev) => ({ ...prev, [resourceId]: selectedIds }))
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

  const visibleResources = MOCK_RESOURCES.filter((r) => {
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedTags.size > 0 && !Array.from(selectedTags).some((slug) => slug in r.tags))
      return false
    return true
  })

  const allExpanded = MOCK_RESOURCES.every((r) => expandedMap[r.id])

  const toggleAll = () => {
    const next = !allExpanded
    setExpandedMap(Object.fromEntries(MOCK_RESOURCES.map((r) => [r.id, next])))
  }

  const setExpanded = (id: string, value: boolean) => {
    setExpandedMap((prev) => ({ ...prev, [id]: value }))
  }

  // One ref per resource card, initialised once
  const resourceRefsMap = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(
    new Map(MOCK_RESOURCES.map((r) => [r.id, React.createRef<HTMLDivElement>()]))
  )

  const tagIndex = useMemo(() => buildTagIndex(MOCK_RESOURCES), [])

  const tocEntries: TocEntry[] = tagIndex.map(({ slug, label, firstResourceId }) => ({
    key: slug,
    ref: resourceRefsMap.current.get(firstResourceId) as React.RefObject<HTMLDivElement | null>,
    primaryLabel: label,
    children: MOCK_RESOURCES.filter((r) => slug in r.tags).map((r) => ({
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
            <Button size="small" onClick={toggleAll}>
              {allExpanded ? strings.collapseAll : strings.expandAll}
            </Button>
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
                  onShare={(r) => setShareResource(r)}
                  onEdit={(r) => console.log('edit', r.id)}
                  onDelete={(r) => console.log('delete', r.id)}
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
      />

      <ShareResourceDialog
        open={shareResource !== null}
        resource={shareResource}
        students={MOCK_STUDENTS}
        sharedWithIds={shareResource ? sharedMap[shareResource.id] ?? new Set() : new Set()}
        onClose={() => setShareResource(null)}
        onConfirm={handleShareConfirm}
      />
    </Container>
  )
}
