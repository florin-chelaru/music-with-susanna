import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/ro'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AvailabilityCalendar from '../../Components/scheduling/AvailabilityCalendar'
import { LocaleContext, LocaleHandler, LocalizedData } from '../../store/LocaleProvider'
import { SupportedLocale } from '../../util/SupportedLocale'
import { useUser } from '../../store/UserProvider'
import { UserRole } from '../../util/User'
import { AvailabilityBlock, SemesterStatus, WeeklyAvailability } from '../../util/scheduling'
import {
  MOCK_LOCATIONS,
  MOCK_SEMESTERS,
  MOCK_TEACHER_AVAILABILITY
} from '../../data/schedulingMocks'

// ─── Texts ────────────────────────────────────────────────────────────────────

interface SemesterPageTexts {
  tabAvailability: string
  tabStudents: string
  tabScheduling: string
  tabCalendar: string
  weeklyTemplate: string
  weekOverrides: string
  addOverride: string
  weekOf: string
  saving: string
  saved: string
  statusDraft: string
  statusScheduling: string
  statusActive: string
  statusCompleted: string
  comingSoon: string
}

const EN_US: SemesterPageTexts = {
  tabAvailability: 'Availability',
  tabStudents: 'Students',
  tabScheduling: 'Scheduling',
  tabCalendar: 'Calendar',
  weeklyTemplate: 'Weekly Template',
  weekOverrides: 'Week Overrides',
  addOverride: 'Add Override',
  weekOf: 'Week of',
  saving: 'Saving…',
  saved: 'Saved',
  statusDraft: 'Draft',
  statusScheduling: 'Scheduling',
  statusActive: 'Active',
  statusCompleted: 'Completed',
  comingSoon: 'Coming soon'
}

const RO_RO: SemesterPageTexts = {
  tabAvailability: 'Disponibilitate',
  tabStudents: 'Elevi',
  tabScheduling: 'Planificare',
  tabCalendar: 'Calendar',
  weeklyTemplate: 'Șablon săptămânal',
  weekOverrides: 'Excepții săptămânale',
  addOverride: 'Adaugă excepție',
  weekOf: 'Săptămâna din',
  saving: 'Se salvează…',
  saved: 'Salvat',
  statusDraft: 'Draft',
  statusScheduling: 'În planificare',
  statusActive: 'Activ',
  statusCompleted: 'Finalizat',
  comingSoon: 'În curând'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusChipColor(status: SemesterStatus): 'default' | 'primary' | 'success' {
  if (status === 'scheduling') return 'primary'
  if (status === 'active') return 'success'
  return 'default'
}

// Snap any date to the Monday of its ISO week (Mon=1 … Sun=7 convention).
function toWeekMonday(date: Dayjs): string {
  const jsDate = date.toDate()
  const day = jsDate.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(jsDate)
  monday.setDate(monday.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

// Format a YYYY-MM-DD week-start string for display.
function formatWeekStart(weekStart: string, locale: SupportedLocale): string {
  const fmt = new Intl.DateTimeFormat(locale === SupportedLocale.RO_RO ? 'ro-RO' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  return fmt.format(new Date(`${weekStart}T12:00:00`))
}

function statusLabel(status: SemesterStatus, t: SemesterPageTexts): string {
  switch (status) {
    case 'draft':
      return t.statusDraft
    case 'scheduling':
      return t.statusScheduling
    case 'active':
      return t.statusActive
    case 'completed':
      return t.statusCompleted
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function SemesterPage() {
  const { semesterId } = useParams<{ semesterId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(SemesterPage.name, TEXTS), [])
  const t = localeManager.componentStrings(SemesterPage.name) as SemesterPageTexts
  const isRo = localeManager.locale === SupportedLocale.RO_RO
  const dayjsLocale = isRo ? 'ro' : 'en'

  // ── Auth guard ───────────────────────────────────────────────────────────────

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

  // ── Mock data lookup ─────────────────────────────────────────────────────────

  const semester = MOCK_SEMESTERS.find((s) => s.id === semesterId)
  const location = semester ? MOCK_LOCATIONS.find((l) => l.id === semester.locationId) : null

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const [tab, setTab] = useState(0)

  // ── Availability state ───────────────────────────────────────────────────────

  const [availability, setAvailability] = useState<WeeklyAvailability>(MOCK_TEACHER_AVAILABILITY)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function triggerAutoSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      // TODO (Step N): write availability to RTDB
      setSaveStatus('saved')
      saveTimer.current = null
    }, 1000)
  }

  function handleTemplateChange(newBlocks: AvailabilityBlock[]) {
    setAvailability((prev) => ({ ...prev, weeklyTemplate: { blocks: newBlocks } }))
    triggerAutoSave()
  }

  function handleOverrideChange(weekStart: string, newBlocks: AvailabilityBlock[]) {
    setAvailability((prev) => ({
      ...prev,
      weekOverrides: { ...prev.weekOverrides, [weekStart]: { blocks: newBlocks } }
    }))
    triggerAutoSave()
  }

  function handleRemoveOverride(weekStart: string) {
    setAvailability((prev) => {
      const { [weekStart]: _removed, ...rest } = prev.weekOverrides
      return { ...prev, weekOverrides: rest }
    })
    triggerAutoSave()
  }

  // ── Week override picker ─────────────────────────────────────────────────────

  const [newOverrideDate, setNewOverrideDate] = useState<Dayjs | null>(null)
  const [showOverridePicker, setShowOverridePicker] = useState(false)

  // A week is valid if: it overlaps the semester AND it hasn't fully passed.
  function shouldDisableOverrideDate(date: Dayjs): boolean {
    if (!semester) return true
    const monday = dayjs(`${toWeekMonday(date)}T12:00:00`)
    const sunday = monday.add(6, 'day')
    if (sunday.isBefore(dayjs().startOf('day'))) return true
    return (
      monday.isAfter(dayjs(`${semester.endDate}T12:00:00`)) ||
      sunday.isBefore(dayjs(`${semester.startDate}T12:00:00`))
    )
  }

  function handleAddOverride() {
    if (!newOverrideDate) return
    const weekStart = toWeekMonday(newOverrideDate)
    if (!(weekStart in availability.weekOverrides)) {
      handleOverrideChange(weekStart, [...availability.weeklyTemplate.blocks])
    }
    setNewOverrideDate(null)
    setShowOverridePicker(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const sortedOverrides = useMemo(
    () => Object.entries(availability.weekOverrides).sort(([a], [b]) => a.localeCompare(b)),
    [availability.weekOverrides]
  )

  if (!semester) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Typography color="text.secondary">Semester not found.</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3, pb: 6 }}>
      <Toolbar />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Typography variant="h5">{semester.name}</Typography>
        <Chip
          label={statusLabel(semester.status, t)}
          color={statusChipColor(semester.status)}
          size="small"
        />
      </Stack>
      {location && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {location.name}
        </Typography>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => {
            setTab(v as number)
          }}>
          <Tab label={t.tabAvailability} />
          <Tab label={t.tabStudents} />
          <Tab label={t.tabScheduling} />
          <Tab label={t.tabCalendar} />
        </Tabs>
      </Box>

      {/* ── Availability tab ───────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          {/* Weekly template */}
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t.weeklyTemplate}
            </Typography>
            {saveStatus === 'saving' && (
              <Typography variant="caption" color="text.secondary">
                {t.saving}
              </Typography>
            )}
            {saveStatus === 'saved' && (
              <Typography variant="caption" color="success.main">
                {t.saved}
              </Typography>
            )}
          </Stack>
          <AvailabilityCalendar
            blocks={availability.weeklyTemplate.blocks}
            onChange={handleTemplateChange}
          />

          {/* Week overrides */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 4, mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t.weekOverrides}
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setShowOverridePicker((v) => !v)
              }}>
              {t.addOverride}
            </Button>
          </Stack>

          {showOverridePicker && (
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjsLocale}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <DatePicker
                  label={t.weekOf}
                  value={newOverrideDate}
                  onChange={(v) => {
                    setNewOverrideDate(v)
                  }}
                  format="D MMM YYYY"
                  shouldDisableDate={shouldDisableOverrideDate}
                  minDate={dayjs(semester.startDate)}
                  maxDate={dayjs(semester.endDate)}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <Button variant="contained" size="small" onClick={handleAddOverride}>
                  {t.addOverride}
                </Button>
              </Stack>
            </LocalizationProvider>
          )}

          {sortedOverrides.length === 0 && !showOverridePicker && (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}

          {sortedOverrides.map(([weekStart, { blocks }]) => (
            <Box key={weekStart} sx={{ mb: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  {t.weekOf} {formatWeekStart(weekStart, localeManager.locale as SupportedLocale)}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    handleRemoveOverride(weekStart)
                  }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
              <AvailabilityCalendar
                blocks={blocks}
                weekStart={weekStart}
                onChange={(newBlocks) => {
                  handleOverrideChange(weekStart, newBlocks)
                }}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* ── Placeholder tabs ───────────────────────────────────────────────── */}
      {tab !== 0 && <Typography color="text.secondary">{t.comingSoon}</Typography>}
    </Container>
  )
}
