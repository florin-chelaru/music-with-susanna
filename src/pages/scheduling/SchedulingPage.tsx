import { Box, Button, Chip, Container, Paper, Stack, Toolbar, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LocationDialog from '../../Components/scheduling/LocationDialog'
import SemesterDialog from '../../Components/scheduling/SemesterDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import { Location, Semester, SemesterStatus } from '../../util/scheduling'
import { MOCK_LOCATIONS, MOCK_SEMESTERS } from '../../data/schedulingMocks'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface SchedulingPageTexts {
  addLocation: string
  addSemester: string
  open: string
  noSemesters: string
  statusDraft: string
  statusScheduling: string
  statusActive: string
  statusCompleted: string
}

const EN_US: SchedulingPageTexts = {
  addLocation: 'Add Location',
  addSemester: 'Add Semester',
  open: 'Open',
  noSemesters: 'No semesters yet',
  statusDraft: 'Draft',
  statusScheduling: 'Scheduling',
  statusActive: 'Active',
  statusCompleted: 'Completed'
}

const RO_RO: SchedulingPageTexts = {
  addLocation: 'Adaugă locație',
  addSemester: 'Adaugă semestru',
  open: 'Deschide',
  noSemesters: 'Niciun semestru încă',
  statusDraft: 'Draft',
  statusScheduling: 'În planificare',
  statusActive: 'Activ',
  statusCompleted: 'Finalizat'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusChipColor(status: SemesterStatus): 'default' | 'primary' | 'success' {
  switch (status) {
    case 'scheduling':
      return 'primary'
    case 'active':
      return 'success'
    default:
      return 'default'
  }
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
})

function formatDateRange(startDate: string, endDate: string): string {
  // Use noon to avoid midnight-UTC → previous day in UTC+offset timezones
  const parse = (d: string) => new Date(`${d}T12:00:00`)
  return `${DATE_FMT.format(parse(startDate))} – ${DATE_FMT.format(parse(endDate))}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulingPage() {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(SchedulingPage.name, TEXTS), [])
  const t = localeManager.componentStrings(SchedulingPage.name) as SchedulingPageTexts

  const navigate = useNavigate()
  const { user } = useUser()

  const [locations, setLocations] = useState<Location[]>(MOCK_LOCATIONS)
  const [semesters, setSemesters] = useState<Semester[]>(MOCK_SEMESTERS)

  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [semesterDialogOpen, setSemesterDialogOpen] = useState<string | null>(null) // locationId

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate('/login')
      return
    }
    if (user.role !== UserRole.TEACHER) {
      navigate('/')
    }
  }, [user.loading, user.uid, user.role])

  function handleAddLocation(data: Pick<Location, 'name' | 'address'>) {
    const newLoc: Location = {
      id: `loc-${Date.now()}`,
      name: data.name,
      address: data.address,
      createdAt: Date.now()
    }
    setLocations((prev) => [...prev, newLoc])
    setLocationDialogOpen(false)
  }

  function handleAddSemester(
    locationId: string,
    data: Pick<Semester, 'name' | 'startDate' | 'endDate' | 'defaultCancellationWindowHours'>
  ) {
    const newSem: Semester = {
      id: `sem-${Date.now()}`,
      locationId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'draft',
      defaultCancellationWindowHours: data.defaultCancellationWindowHours,
      timezone: 'Europe/Bucharest',
      createdAt: Date.now()
    }
    setSemesters((prev) => [...prev, newSem])
    setSemesterDialogOpen(null)
  }

  const statusLabel: Record<SemesterStatus, string> = {
    draft: t.statusDraft,
    scheduling: t.statusScheduling,
    active: t.statusActive,
    completed: t.statusCompleted
  }

  const semestersByLocation = useMemo(() => {
    const map = new Map<string, Semester[]>()
    for (const loc of locations) map.set(loc.id, [])
    for (const sem of semesters) {
      const list = map.get(sem.locationId)
      if (list) list.push(sem)
    }
    return map
  }, [locations, semesters])

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setLocationDialogOpen(true)
          }}>
          {t.addLocation}
        </Button>
      </Box>

      <Stack spacing={3}>
        {locations.map((loc) => {
          const locSemesters = semestersByLocation.get(loc.id) ?? []
          return (
            <Paper key={loc.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">{loc.name}</Typography>
                  {loc.address && (
                    <Typography variant="body2" color="text.secondary">
                      {loc.address}
                    </Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSemesterDialogOpen(loc.id)
                  }}>
                  {t.addSemester}
                </Button>
              </Stack>

              {locSemesters.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t.noSemesters}
                </Typography>
              )}

              <Stack spacing={1} sx={{ mt: 1 }}>
                {locSemesters.map((sem) => (
                  <Stack key={sem.id} direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1">{sem.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateRange(sem.startDate, sem.endDate)}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusLabel[sem.status]}
                      color={statusChipColor(sem.status)}
                      size="small"
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        navigate(`/scheduling/semesters/${sem.id}`)
                      }}>
                      {t.open}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )
        })}
      </Stack>

      <LocationDialog
        open={locationDialogOpen}
        onClose={() => {
          setLocationDialogOpen(false)
        }}
        onSave={handleAddLocation}
      />

      {semesterDialogOpen !== null && (
        <SemesterDialog
          open={true}
          locationId={semesterDialogOpen}
          onClose={() => {
            setSemesterDialogOpen(null)
          }}
          onSave={(data) => {
            handleAddSemester(semesterDialogOpen, data)
          }}
        />
      )}
    </Container>
  )
}
