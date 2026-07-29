import { Button, Container, MenuItem, Select, Stack, Toolbar, Typography } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ResourceCard from '../Components/ResourceCard'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, useHomeworkResources } from '../util/resources'
import { get, ref } from 'firebase/database'

type SortOption = 'name' | 'date-desc' | 'date-asc'

interface StudentViewResourcesPageTexts {
  resourcesFrom: string
  expandAll: string
  collapseAll: string
  back: string
  sortBy: string
  sortName: string
  sortDateNewest: string
  sortDateOldest: string
}

const EN_US: StudentViewResourcesPageTexts = {
  resourcesFrom: 'Resources from',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  back: 'Back',
  sortBy: 'Sort',
  sortName: 'Name',
  sortDateNewest: 'Newest first',
  sortDateOldest: 'Oldest first'
}

const RO_RO: StudentViewResourcesPageTexts = {
  resourcesFrom: 'Resurse de la',
  expandAll: 'Extinde Toate',
  collapseAll: 'Restrânge Toate',
  back: 'Înapoi',
  sortBy: 'Sortare',
  sortName: 'Nume',
  sortDateNewest: 'Recente',
  sortDateOldest: 'Vechi'
}

const STUDENT_VIEW_RESOURCES_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

function buildTagIndex(resources: Resource[]): Array<{ slug: string; label: string }> {
  const seen = new Set<string>()
  const result: Array<{ slug: string; label: string }> = []
  for (const resource of resources) {
    for (const [slug, label] of Object.entries(resource.tags)) {
      if (!seen.has(slug)) {
        seen.add(slug)
        result.push({ slug, label })
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

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')

  const handleTagToggle = (slug: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
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
  const setExpanded = (id: string, value: boolean) =>
    setExpandedMap((prev) => ({ ...prev, [id]: value }))

  const tagIndex = useMemo(() => buildTagIndex(resources), [resources])

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button size="small" onClick={() => navigate(-1)}>
            {strings.back}
          </Button>
          <Typography variant="h5">
            {strings.resourcesFrom}: <strong>{teacherName}</strong>
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
        onSearchChange={setSearchQuery}
        onTagToggle={handleTagToggle}
      />

      <Grid2 container spacing={2} sx={{ mt: 1 }}>
        {visibleResources.map((resource) => (
          <Grid2 xs={12} key={resource.id}>
            <ResourceCard
              resource={resource}
              expanded={expandedMap[resource.id] ?? false}
              onExpandedChange={(v) => setExpanded(resource.id, v)}
              onDetails={(r) => navigate(`/resources/${r.id}`)}
            />
          </Grid2>
        ))}
      </Grid2>
    </Container>
  )
}
