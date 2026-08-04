import { Button, Container, MenuItem, Select, Stack, Toolbar, Typography } from '@mui/material'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ResourceList from '../Components/ResourceList'
import ResourceTagFilter from '../Components/ResourceTagFilter'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { Resource, useHomeworkResources } from '../util/resources'
import { get, ref } from 'firebase/database'
import { SortOption, useResourcePageState } from './useResourcePageState'

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

  const storageKey = `resources-state:teacher-view:${teacherId ?? ''}`
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
        onDetails={(r) => {
          bookmarkResource(r.id)
          navigate(`/resources/${r.id}`)
        }}
      />
    </Container>
  )
}
