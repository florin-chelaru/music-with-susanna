import { useEffect, useMemo, useRef, useState } from 'react'
import { Resource, ResourceType, buildTagIndex } from '../util/resources'

export type SortOption = 'name' | 'date-desc' | 'date-asc'

const PAGE_SIZE = 5
const TOOLBAR_HEIGHT = 64

interface StoredState {
  searchQuery?: string
  selectedTags?: string[]
  selectedTypes?: string[]
  sortBy?: SortOption
  visibleCount?: number
  pendingResourceId?: string
}

function readStorage(key: string): StoredState {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as StoredState) : {}
  } catch {
    return {}
  }
}

function writeStorage(key: string, update: Partial<StoredState>) {
  try {
    const existing = readStorage(key)
    localStorage.setItem(key, JSON.stringify({ ...existing, ...update }))
  } catch {}
}

export function useResourcePageState(resources: Resource[], storageKey: string) {
  const initial = useRef(readStorage(storageKey))

  const [searchQuery, setSearchQueryRaw] = useState(initial.current.searchQuery ?? '')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(initial.current.selectedTags ?? [])
  )
  const [selectedTypes, setSelectedTypes] = useState<Set<ResourceType>>(
    new Set((initial.current.selectedTypes ?? []) as ResourceType[])
  )
  const [sortBy, setSortByRaw] = useState<SortOption>(initial.current.sortBy ?? 'date-desc')
  const [visibleCount, setVisibleCount] = useState(initial.current.visibleCount ?? PAGE_SIZE)

  // Wrapped setters reset paging on filter changes so a stale visibleCount
  // is never applied to a different result set.
  const setSearchQuery = (v: string) => {
    setSearchQueryRaw(v)
    setVisibleCount(PAGE_SIZE)
  }

  const setSortBy = (v: SortOption) => {
    setSortByRaw(v)
    setVisibleCount(PAGE_SIZE)
  }

  const handleTagToggle = (slug: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
    setVisibleCount(PAGE_SIZE)
  }

  const handleTypeToggle = (type: ResourceType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
    setVisibleCount(PAGE_SIZE)
  }

  // Persist filter state whenever it changes
  useEffect(() => {
    writeStorage(storageKey, {
      searchQuery,
      selectedTags: Array.from(selectedTags),
      selectedTypes: Array.from(selectedTypes),
      sortBy,
      visibleCount
    })
  }, [storageKey, searchQuery, selectedTags, selectedTypes, sortBy, visibleCount])

  // topResourceRef tracks the top-most visible resource card as the user
  // scrolls. Flushed to localStorage on unmount as pendingResourceId.
  const topResourceRef = useRef<string | null>(initial.current.pendingResourceId ?? null)
  const scrollRestored = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      const cards = Array.from(document.querySelectorAll('[data-resource-id]'))
      if (cards.length === 0) return
      // Find the last card whose top edge is at or above the toolbar bottom.
      // That card is the topmost one visible in the scrollable area.
      const aboveOrAt = cards.filter((c) => c.getBoundingClientRect().top <= TOOLBAR_HEIGHT)
      const card = aboveOrAt.length > 0 ? aboveOrAt[aboveOrAt.length - 1] : cards[0]
      const id = card.getAttribute('data-resource-id')
      if (id) topResourceRef.current = id
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (topResourceRef.current) {
        writeStorage(storageKey, { pendingResourceId: topResourceRef.current })
      }
    }
  }, [storageKey])

  // Restore scroll position once data arrives and the target card is in the DOM.
  // Re-runs whenever visibleCount grows (InfiniteScroll loadMore) so that if the
  // target card wasn't rendered yet on the first attempt, we retry automatically.
  useEffect(() => {
    if (resources.length === 0 || scrollRestored.current) return
    const id = initial.current.pendingResourceId
    if (!id) {
      scrollRestored.current = true
      return
    }
    const el = document.querySelector(`[data-resource-id="${id}"]`)
    if (!el) return
    scrollRestored.current = true
    const rect = el.getBoundingClientRect()
    el.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -TOOLBAR_HEIGHT)
    if (window.scrollY === 0 && rect.top > TOOLBAR_HEIGHT) {
      window.scrollTo({ top: rect.top - TOOLBAR_HEIGHT, behavior: 'instant' as ScrollBehavior })
    }
  }, [resources.length, visibleCount])

  // Explicit bookmark for navigating to a resource's detail page. Updates
  // topResourceRef so the unmount cleanup persists the exact target.
  const bookmarkResource = (id: string) => {
    topResourceRef.current = id
  }

  const visibleResources = useMemo(
    () =>
      resources
        .filter((r) => {
          if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase()))
            return false
          if (selectedTags.size > 0 && !Array.from(selectedTags).some((slug) => slug in r.tags))
            return false
          if (selectedTypes.size > 0 && !selectedTypes.has(r.type)) return false
          return true
        })
        .sort((a, b) => {
          if (sortBy === 'name') return a.title.localeCompare(b.title)
          if (sortBy === 'date-desc')
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }),
    [resources, searchQuery, selectedTags, selectedTypes, sortBy]
  )

  const pagedResources = visibleResources.slice(0, visibleCount)
  const hasMore = visibleCount < visibleResources.length
  const loadMore = () => setVisibleCount((prev) => prev + PAGE_SIZE)

  const tagIndex = useMemo(() => buildTagIndex(resources), [resources])

  return {
    searchQuery,
    setSearchQuery,
    selectedTags,
    handleTagToggle,
    selectedTypes,
    handleTypeToggle,
    sortBy,
    setSortBy,
    visibleResources,
    pagedResources,
    hasMore,
    loadMore,
    tagIndex,
    bookmarkResource
  }
}
