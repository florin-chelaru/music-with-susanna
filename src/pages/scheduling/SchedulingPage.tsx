import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SchedulingNav from '../../Components/scheduling/SchedulingNav'
import LocationDialog from '../../Components/scheduling/LocationDialog'
import SemesterDialog from '../../Components/scheduling/SemesterDialog'
import DeleteSemesterDialog from '../../Components/scheduling/DeleteSemesterDialog'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import { DEFAULT_TIMEZONE, Location, Semester, SemesterStatus } from '../../util/scheduling'
import { useLocations, useSemesters } from '../../util/schedulingHooks'
import {
  createLocation,
  createSemester,
  deleteSemester,
  NewSemester
} from '../../util/schedulingWrites'
import { loginPath } from '../../util/authRedirect'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface SchedulingPageTexts {
  addLocation: string
  addSemester: string
  open: string
  noSemesters: string
  noLocations: string
  saveFailed: string
  deleteSemester: string
  statusDraft: string
  statusScheduling: string
  statusActive: string
  statusCompleted: string
}

const EN_US: SchedulingPageTexts = {
  deleteSemester: 'Delete',
  noLocations: 'No locations yet. Add one to start a semester.',
  saveFailed: 'Could not save:',
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
  deleteSemester: 'Șterge',
  noLocations: 'Nicio locație încă. Adaugă una ca să începi un semestru.',
  saveFailed: 'Nu s-a putut salva:',
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

  // Keyed on the signed-in teacher, never a constant: the studio has two teachers, and the
  // rules refuse any path that is not the caller's own.
  const { locations, loading: locationsLoading } = useLocations(user.uid)
  const { semesters, loading: semestersLoading } = useSemesters(user.uid)
  const loading = user.loading === true || locationsLoading || semestersLoading
  const [saveError, setSaveError] = useState<string | null>(null)

  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [semesterDialogOpen, setSemesterDialogOpen] = useState<string | null>(null) // locationId
  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null)

  useEffect(() => {
    if (user.loading) return
    if (!user.uid) {
      navigate(loginPath())
      return
    }
    if (user.role !== UserRole.TEACHER) {
      navigate('/')
    }
  }, [user.loading, user.uid, user.role])

  // The subscription delivers the new record, so nothing is appended to local state here — the
  // list updating is how the teacher learns the write actually landed.
  function handleAddLocation(data: Pick<Location, 'name' | 'address'>) {
    if (!user.uid) return
    setLocationDialogOpen(false)
    void createLocation(user.uid, data).catch((error) => {
      setSaveError(String(error))
    })
  }

  function handleAddSemester(locationId: string, data: NewSemester) {
    if (!user.uid) return
    setSemesterDialogOpen(null)
    void createSemester(user.uid, locationId, data, DEFAULT_TIMEZONE).catch((error) => {
      setSaveError(String(error))
    })
  }

  function handleDeleteSemester() {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target || !user.uid) return
    void deleteSemester(user.uid, target.id).catch((error) => {
      setSaveError(String(error))
    })
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
      <SchedulingNav />
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

      {saveError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => {
            setSaveError(null)
          }}>
          {t.saveFailed} {saveError}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!loading && locations.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t.noLocations}
        </Typography>
      )}

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
                    <IconButton
                      size="small"
                      aria-label={`${t.deleteSemester} ${sem.name}`}
                      onClick={() => {
                        setDeleteTarget(sem)
                      }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )
        })}
      </Stack>

      <DeleteSemesterDialog
        open={deleteTarget !== null}
        teacherId={user.uid ?? ''}
        semester={deleteTarget}
        onClose={() => {
          setDeleteTarget(null)
        }}
        onConfirm={() => {
          handleDeleteSemester()
        }}
      />

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
