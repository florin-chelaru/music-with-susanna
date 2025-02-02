import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Container,
  DialogContent,
  Link,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { initializeApp } from 'firebase/app'
import { UserCredential, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { Unsubscribe, get, onValue, ref, set } from 'firebase/database'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FabCreate from '../Components/FabCreate'
import MultiActionDialog from '../Components/MultiActionDialog'
import { database, firebaseConfig } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { KnownAuthErrors } from '../util/KnownAuthErrors'
import { isValidPhoneNumber } from '../util/string'
import { SupportedLocale } from '../util/SupportedLocale'
import { User, UserRole } from '../util/User'
import { scrollToTop } from '../util/window'

interface StudentsPageTexts {
  homework: string
  addStudent: string
  cancel: string
  add: string
  studentName: string
  parentName: string
  parentPhoneNumber: string
  emailAddress: string
  password: string
  repeatPassword: string
  authErrorInvalidEmail: string
  authErrorEmptyCredentials: string
  authErrorInvalidCredentials: string
  authErrorUnknown: string
  validationPasswordMismatch: string
  validationErrorEmptyStudentName: string
  validationErrorEmptyParentName: string
  validationErrorEmptyPhoneNumber: string
  validationErrorInvalidPhoneNumber: string
  authErrorUnauthorized: string
}

const EN_US: StudentsPageTexts = {
  homework: 'Homework',
  addStudent: 'Add student',
  cancel: 'Cancel',
  add: 'Add',
  studentName: 'Student name',
  parentName: 'Parent name',
  parentPhoneNumber: 'Parent phone number',
  emailAddress: 'Email address',
  password: 'Password',
  repeatPassword: 'Repeat password',
  authErrorInvalidEmail: 'Invalid email address',
  authErrorEmptyCredentials: 'Empty email or password',
  authErrorInvalidCredentials: 'Invalid username or password',
  authErrorUnknown: 'Unknown error',
  validationPasswordMismatch: 'Passwords do not match',
  validationErrorEmptyStudentName: 'Empty student name',
  validationErrorEmptyParentName: 'Empty parent name',
  validationErrorEmptyPhoneNumber: 'Empty phone number',
  validationErrorInvalidPhoneNumber: 'Invalid phone number',
  authErrorUnauthorized: 'Unauthorized'
}

const RO_RO: StudentsPageTexts = {
  homework: 'Teme pe acasă',
  addStudent: 'Adaugă student',
  cancel: 'Anulează',
  add: 'Adaugă',
  studentName: 'Numele studentului',
  parentName: 'Numele părintelui',
  parentPhoneNumber: 'Numărul de telefon al părintelui',
  emailAddress: 'Adresă de email',
  password: 'Parolă',
  repeatPassword: 'Repetă parola',
  authErrorInvalidEmail: 'Adresă de email invalidă',
  authErrorEmptyCredentials: 'Email sau parolă lipsă',
  authErrorInvalidCredentials: 'Nume de utilizator sau parolă incorecte',
  authErrorUnknown: 'Eroare necunoscută',
  validationPasswordMismatch: 'Parolele nu se potrivesc',
  validationErrorEmptyStudentName: 'Numele studentului lipsește',
  validationErrorEmptyParentName: 'Numele părintelui lipsește',
  validationErrorEmptyPhoneNumber: 'Numărul de telefon lipsește',
  validationErrorInvalidPhoneNumber: 'Număr de telefon invalid',
  authErrorUnauthorized: 'Neautorizat'
}

const STUDENTS_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

function parseAuthError(errorCode: string, texts: StudentsPageTexts): string {
  switch (errorCode) {
    case KnownAuthErrors.INVALID_EMAIL:
      return texts.authErrorInvalidEmail
    case KnownAuthErrors.INVALID_CREDENTIALS:
      return texts.authErrorInvalidCredentials
    case KnownAuthErrors.EMPTY_EMAIL:
      return texts.authErrorEmptyCredentials
    case KnownAuthErrors.EMPTY_PASSWORD:
      return texts.authErrorEmptyCredentials
    case KnownAuthErrors.PASSWORD_MISMATCH:
      return texts.validationPasswordMismatch
    case KnownAuthErrors.EMPTY_STUDENT_NAME:
      return texts.validationErrorEmptyStudentName
    case KnownAuthErrors.EMPTY_PARENT_NAME:
      return texts.validationErrorEmptyParentName
    case KnownAuthErrors.EMPTY_PHONE_NUMBER:
      return texts.validationErrorEmptyPhoneNumber
    case KnownAuthErrors.INVALID_PHONE_NUMBER:
      return texts.validationErrorInvalidPhoneNumber
    case KnownAuthErrors.UNAUTHORIZED:
      return texts.authErrorUnauthorized
    default:
      return texts.authErrorUnknown
  }
}

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
      const { email, name, phone, parent } = snapshot.val()

      return new User({ email, name, phone, parent })
    } catch (e) {
      console.error(`Could not retrieve name of student id ${studentId}: ${e}`)
      return undefined
    }
  }

  const studentCache = useRef<Map<string, User>>(new Map())
  const [students, setStudents] = useState<User[]>([])

  // Add student
  const [openAddStudentDialog, setOpenAddStudentDialog] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const submitStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError(null)

    if (user?.role !== UserRole.TEACHER) {
      setError(KnownAuthErrors.UNAUTHORIZED)
      return
    }

    const data = new FormData(event.currentTarget)
    const studentName = data.get('student-name') as string | null
    const parentName = data.get('parent-name') as string | null
    const parentPhoneNumber = data.get('parent-phone-number') as string | null
    const email = data.get('new-email') as string | null
    const password = data.get('new-password') as string | null
    const repeatPassword = data.get('repeat-new-password') as string | null

    if (!email?.length) {
      setError(KnownAuthErrors.EMPTY_EMAIL)
      return
    }
    if (!password?.length) {
      setError(KnownAuthErrors.EMPTY_PASSWORD)
      return
    }
    if (password !== repeatPassword) {
      setError(KnownAuthErrors.PASSWORD_MISMATCH)
      return
    }

    if (!studentName?.length) {
      setError(KnownAuthErrors.EMPTY_STUDENT_NAME)
      return
    }

    if (!parentName?.length) {
      setError(KnownAuthErrors.EMPTY_PARENT_NAME)
      return
    }

    if (!parentPhoneNumber?.length) {
      setError(KnownAuthErrors.EMPTY_PHONE_NUMBER)
      return
    }

    if (!isValidPhoneNumber(parentPhoneNumber)) {
      setError(KnownAuthErrors.INVALID_PHONE_NUMBER)
      return
    }

    // The following is necessary to ensure the current user is not signed out
    const config = firebaseConfig
    const secondaryApp = initializeApp(config, 'Secondary')
    const secondaryAuth = getAuth(secondaryApp)

    createUserWithEmailAndPassword(secondaryAuth, email, password)
      .then(async (userCredential: UserCredential) => {
        console.log('User created:', userCredential.user)

        await set(ref(database, `users/${userCredential.user.uid}`), {
          email: email,
          name: studentName,
          parent: parentName,
          phone: parentPhoneNumber,
          role: 'student'
        })
        await set(ref(database, `students/${userCredential.user.uid}`), {
          teachers: {
            [user?.uid as string]: ''
          }
        })
        await set(ref(database, `teachers/${user.uid}/students/${userCredential.user.uid}`), '')

        setOpenAddStudentDialog(false)
      })
      .catch((error) => {
        setError(error.code)
      })
  }

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
    <>
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
                  <Typography>{student.name}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {student.phone && (
                    <Link
                      underline="hover"
                      color="inherit"
                      rel="noreferrer"
                      target="_blank"
                      href={`https://wa.me/${student.phone.slice(1)}`}>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <WhatsAppIcon />
                        <Typography variant="body1" gutterBottom component="h2">
                          {student.parent ? `${student.parent}` : 'Message'}
                        </Typography>
                      </Stack>
                    </Link>
                  )}

                  <Link
                    underline="hover"
                    color="inherit"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(`/homework/${user.uid}/${student.uid}`)
                      scrollToTop()
                    }}>
                    <Stack direction="row" spacing={1}>
                      <MenuBookIcon />
                      <Typography variant="body1" gutterBottom component="h2">
                        {componentStrings.homework}
                      </Typography>
                    </Stack>
                  </Link>
                </AccordionDetails>
              </Accordion>
            </Grid2>
          ))}
        </Grid2>
      </Container>
      user.role === UserRole.TEACHER && (
      <MultiActionDialog
        open={openAddStudentDialog}
        onClose={() => setOpenAddStudentDialog(false)}
        aria-describedby="alert-dialog-description"
        title={componentStrings.addStudent}
        actions={[
          { label: componentStrings.cancel, onClick: () => setOpenAddStudentDialog(false) },
          {
            label: componentStrings.add,
            onClick: () => {
              formRef.current?.requestSubmit()
            }
          }
        ]}>
        <DialogContent>
          {error && <Alert severity="error">{parseAuthError(error, componentStrings)}</Alert>}
          <Box
            component="form"
            ref={formRef}
            onSubmit={submitStudent}
            noValidate
            autoComplete="off"
            sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="student-name"
              label={componentStrings.studentName}
              name="student-name"
              autoComplete="off"
              error={[KnownAuthErrors.EMPTY_STUDENT_NAME].includes(error as KnownAuthErrors)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="parent-name"
              label={componentStrings.parentName}
              name="parent-name"
              autoComplete="off"
              error={[KnownAuthErrors.EMPTY_PARENT_NAME].includes(error as KnownAuthErrors)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="parent-phone-number"
              label={componentStrings.parentPhoneNumber}
              name="parent-phone-number"
              autoComplete="off"
              error={[
                KnownAuthErrors.EMPTY_PHONE_NUMBER,
                KnownAuthErrors.INVALID_PHONE_NUMBER
              ].includes(error as KnownAuthErrors)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={componentStrings.emailAddress}
              name="new-email"
              autoComplete="off"
              error={[
                KnownAuthErrors.INVALID_EMAIL,
                KnownAuthErrors.INVALID_CREDENTIALS,
                KnownAuthErrors.EMPTY_EMAIL
              ].includes(error as KnownAuthErrors)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="new-password"
              label={componentStrings.password}
              type="password"
              id="new-password"
              autoComplete="off"
              error={[
                KnownAuthErrors.INVALID_CREDENTIALS,
                KnownAuthErrors.EMPTY_PASSWORD,
                KnownAuthErrors.PASSWORD_MISMATCH
              ].includes(error as KnownAuthErrors)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="repeat-new-password"
              label={componentStrings.repeatPassword}
              type="password"
              id="repeat-new-password"
              autoComplete="off"
              error={[
                KnownAuthErrors.INVALID_CREDENTIALS,
                KnownAuthErrors.EMPTY_PASSWORD,
                KnownAuthErrors.PASSWORD_MISMATCH
              ].includes(error as KnownAuthErrors)}
            />
          </Box>
        </DialogContent>
      </MultiActionDialog>
      )
      {user.role === UserRole.TEACHER && (
        <FabCreate
          onClick={() => {
            void setOpenAddStudentDialog(true)
          }}
        />
      )}
    </>
  )
}
