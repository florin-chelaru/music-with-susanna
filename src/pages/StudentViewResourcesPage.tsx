import { Button, Container, Stack, Toolbar, Typography } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ResourceCard from '../Components/ResourceCard'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import TableOfContents, { TocEntry } from '../TableOfContents'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, useHomeworkResources } from '../util/resources'
import { get, ref } from 'firebase/database'

interface StudentViewResourcesPageTexts {
  resourcesFrom: string
  expandAll: string
  collapseAll: string
}

const EN_US: StudentViewResourcesPageTexts = {
  resourcesFrom: 'Resources from',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All'
}

const RO_RO: StudentViewResourcesPageTexts = {
  resourcesFrom: 'Resurse de la',
  expandAll: 'Extinde Toate',
  collapseAll: 'Restrânge Toate'
}

const STUDENT_VIEW_RESOURCES_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

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

export default function StudentViewResourcesPage() {
  const { teacherId } = useParams<{ teacherId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate('/login')
    }
  }, [user, navigate])

  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(
    () =>
      localeManager.registerComponentStrings(
        StudentViewResourcesPage.name,
        STUDENT_VIEW_RESOURCES_PAGE_TEXTS
      ),
    []
  )
  const strings = localeManager.componentStrings(
    StudentViewResourcesPage.name
  ) as StudentViewResourcesPageTexts

  const [teacherName, setTeacherName] = useState<string>(teacherId ?? '')

  useEffect(() => {
    if (!teacherId) return
    get(ref(database, `users/${teacherId}/name`))
      .then((snapshot) => {
        const name = snapshot.val()
        if (name) setTeacherName(name as string)
      })
      .catch(() => {})
  }, [teacherId])

  const { resources } = useHomeworkResources(teacherId, user?.uid)

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  useEffect(() => {
    setExpandedMap((prev) => {
      const newEntries = resources
        .filter((r) => !(r.id in prev))
        .map((r): [string, boolean] => [r.id, false])
      if (newEntries.length === 0) return prev
      return { ...prev, ...Object.fromEntries(newEntries) }
    })
  }, [resources])

  const resourceRefsMap = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map())
  for (const r of resources) {
    if (!resourceRefsMap.current.has(r.id)) {
      resourceRefsMap.current.set(r.id, React.createRef<HTMLDivElement>())
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const handleTagToggle = (slug: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const visibleResources = resources.filter((r) => {
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedTags.size > 0 && !Array.from(selectedTags).some((slug) => slug in r.tags))
      return false
    return true
  })

  const allExpanded = resources.every((r) => expandedMap[r.id])
  const toggleAll = () => {
    const next = !allExpanded
    setExpandedMap(Object.fromEntries(resources.map((r) => [r.id, next])))
  }
  const setExpanded = (id: string, value: boolean) =>
    setExpandedMap((prev) => ({ ...prev, [id]: value }))

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
        <Grid2 xs={12} display={{ xs: 'block', sm: 'none' }}>
          {toc}
        </Grid2>

        <Grid2 xs={12} sm={9} md={10}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5">
              {strings.resourcesFrom}: <strong>{teacherName}</strong>
            </Typography>
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
                  expanded={expandedMap[resource.id] ?? false}
                  onExpandedChange={(v) => setExpanded(resource.id, v)}
                />
              </Grid2>
            ))}
          </Grid2>
        </Grid2>

        <Grid2 xs={12} sm={3} md={2} display={{ xs: 'none', sm: 'block' }}>
          {toc}
        </Grid2>
      </Grid2>
    </Container>
  )
}
