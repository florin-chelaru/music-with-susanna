import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Grid2 from '@mui/material/Unstable_Grid2'
import InfiniteScroll from 'react-infinite-scroller'
import { ReactNode } from 'react'
import ResourceCard from './ResourceCard'
import { Resource } from '../util/resources'

interface ResourceListProps {
  resources: Resource[]
  hasMore: boolean
  loadMore: () => void
  expandedMap: Record<string, boolean>
  onExpandedChange: (id: string, value: boolean) => void
  editable?: boolean
  onEdit?: (resource: Resource) => void
  onDelete?: (resource: Resource) => void
  onDetails?: (resource: Resource) => void
  getFooter?: (resource: Resource) => ReactNode
}

export default function ResourceList({
  resources,
  hasMore,
  loadMore,
  expandedMap,
  onExpandedChange,
  editable,
  onEdit,
  onDelete,
  onDetails,
  getFooter
}: ResourceListProps) {
  return (
    <InfiniteScroll
      pageStart={0}
      loadMore={loadMore}
      hasMore={hasMore}
      loader={
        <Box key="loader" sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      }
      useWindow>
      <Grid2 container spacing={2} sx={{ mt: 1 }}>
        {resources.map((resource) => (
          <Grid2 xs={12} key={resource.id} data-resource-id={resource.id}>
            <ResourceCard
              resource={resource}
              editable={editable}
              expanded={expandedMap[resource.id] ?? false}
              onExpandedChange={(v) => onExpandedChange(resource.id, v)}
              onEdit={onEdit}
              onDelete={onDelete}
              onDetails={onDetails}
              footer={getFooter?.(resource)}
            />
          </Grid2>
        ))}
      </Grid2>
    </InfiniteScroll>
  )
}
