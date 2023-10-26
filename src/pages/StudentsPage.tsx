import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Link,
  Toolbar,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { Unsubscribe, get, onValue, ref } from 'firebase/database'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import { User, UserRole } from '../util/User'
import { scrollToTop } from '../util/window'

interface StudentsPageTexts {
  homework: string
}

const EN_US: StudentsPageTexts = {
  homework: 'Homework'
}

const RO_RO: StudentsPageTexts = {
  homework: 'Teme pe acasă'
}

const STUDENTS_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface StudentsPageProps {}

export default function StudentsPage({}: StudentsPageProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(StudentsPage.name, STUDENTS_PAGE_TEXTS), [])
  const componentStrings = localeManager.componentStrings(StudentsPage.name) as StudentsPageTexts

  const { user } = useUser()
  const navigate = useNavigate()

  const studentsUnsubscriberRef = useRef<Unsubscribe>()

  async function getStudentInfo(studentId: string): Promise<User | undefined> {
    try {
      const snapshot = await get(ref(database, `users/${studentId}`))
      const { email, name } = snapshot.val()

      return new User({ email, name })
    } catch (e) {
      console.error(`Could not retrieve name of student id ${studentId}: ${e}`)
      return undefined
    }
  }

  const studentCache = useRef<Map<string, User>>(new Map())
  const [students, setStudents] = useState<User[]>([])

  useEffect(() => {
    if (studentsUnsubscriberRef.current) {
      studentsUnsubscriberRef.current()
    }

    if (user.loading) {
      return
    }
    if (!user.uid) {
      navigate('/login')
      return
    }

    if (user.role !== UserRole.TEACHER) {
      navigate('/')
      return
    }

    studentsUnsubscriberRef.current = onValue(
      ref(database, `teachers/${user.uid}/students`),
      async (snapshot) => {
        const studentIds = Object.keys(snapshot.val())
        const students: User[] = []

        const studentNamePromises = new Map<string, Promise<User | undefined>>()
        for (const studentId of studentIds) {
          const student = studentCache.current.get(studentId)
          if (!student) {
            studentNamePromises.set(studentId, getStudentInfo(studentId))
            continue
          }
          students.push(student)
        }
        for (const p of studentNamePromises) {
          const student = await p[1]
          if (student) {
            student.uid = p[0]
            studentCache.current.set(p[0], student)
            students.push(student)
          }
        }
        setStudents(students)
      },
      (error) => {
        console.error(`Could not fetch students: ${error}`)
        setStudents([])
      }
    )
  }, [user])

  const [value, setValue] = useState('')
  const valueChanged = (v: any) => {
    setValue(v)
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        {students.map((student) => (
          <Grid2 xs={12} sm={6} md={3} key={student.uid}>
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header">
                <Typography>{student.firstName}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Link
                  underline="hover"
                  color="inherit"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/homework/${user.uid}/${student.uid}`)
                    scrollToTop()
                  }}>
                  <Typography variant="body1" gutterBottom component="h2">
                    {componentStrings.homework}
                  </Typography>
                </Link>
              </AccordionDetails>
            </Accordion>
          </Grid2>
        ))}
      </Grid2>
    </Container>
  )
}
