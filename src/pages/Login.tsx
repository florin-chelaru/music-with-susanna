import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  DialogContent,
  DialogContentText,
  Link,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { auth } from '../store/Firebase'
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  UserCredential
} from 'firebase/auth'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { SupportedLocale } from '../util/SupportedLocale'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { useNavigate } from 'react-router-dom'
import { scrollToTop } from '../util/window'
import { UserRole } from '../util/User'
import MultiActionDialog from '../Components/MultiActionDialog'
import { isValidEmail } from '../util/string'

interface LoginTexts {
  signInTitle: string
  emailAddress: string
  password: string
  signIn: string
  forgotPassword: string
  authErrorUnknown: string
  authErrorInvalidEmail: string
  authErrorInvalidCredentials: string
  authErrorEmptyCredentials: string
  signOut: string

  recoverPasswordDialogTitle: string
  recoverPasswordDialogDescription: string
  cancel: string
  send: string

  close: string
  alertDialogTitle: string
  alertDialogDescription: string
}

const EN_US: LoginTexts = {
  signInTitle: 'Student or parent account sign in',
  emailAddress: 'Email Address',
  password: 'Password',
  signIn: 'Sign in',
  forgotPassword: 'Forgot password?',
  authErrorUnknown: 'There was a problem signing in. If the issue persists, please contact me!',
  authErrorInvalidEmail: 'Invalid email address',
  authErrorInvalidCredentials: 'Invalid username or password',
  authErrorEmptyCredentials: 'Empty email or password',
  signOut: 'Sign out',

  recoverPasswordDialogTitle: 'Recover password',
  recoverPasswordDialogDescription: 'Fill in your email address to recover your password',
  cancel: 'Cancel',
  send: 'Send',

  close: 'Close',
  alertDialogTitle: 'Error',
  alertDialogDescription: 'The password recovery email could not be sent'
}

const RO_RO: LoginTexts = {
  signInTitle: 'Intră în contul de student sau părinte',
  emailAddress: 'Adresa de Email',
  password: 'Parola',
  signIn: 'Intră în cont',
  forgotPassword: 'Ai uitat parola?',
  authErrorUnknown:
    'A apărut o eroare de autentificare. Dacă problema persistă, te rog să mă contactezi!',
  authErrorInvalidEmail: 'Adresă de email incorectă',
  authErrorInvalidCredentials: 'Emailul sau parola incorecte',
  authErrorEmptyCredentials: 'Emailul sau parola necompletate',
  signOut: 'Ieși din cont',

  recoverPasswordDialogTitle: 'Recuperează parola',
  recoverPasswordDialogDescription: 'Completează adresa de email pentru a recupera parola',
  cancel: 'Renunță',
  send: 'Trimite',

  close: 'Închide',
  alertDialogTitle: 'Eroare',
  alertDialogDescription: 'Emailul de recuperare a parolei nu a putut fi trimis'
}

const LOGIN_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

enum KnownAuthErrors {
  INVALID_EMAIL = 'auth/invalid-email',
  INVALID_CREDENTIALS = 'auth/invalid-login-credentials',
  EMPTY_EMAIL = 'validation/empty-email',
  EMPTY_PASSWORD = 'validation/empty-password'
}

function parseAuthError(errorCode: string, loginTexts: LoginTexts): string {
  switch (errorCode) {
    case KnownAuthErrors.INVALID_EMAIL:
      return loginTexts.authErrorInvalidEmail
    case KnownAuthErrors.INVALID_CREDENTIALS:
      return loginTexts.authErrorInvalidCredentials
    case KnownAuthErrors.EMPTY_EMAIL:
      return loginTexts.authErrorEmptyCredentials
    case KnownAuthErrors.EMPTY_PASSWORD:
      return loginTexts.authErrorEmptyCredentials
    default:
      return loginTexts.authErrorUnknown
  }
}

export interface LoginProps {}

export default function Login({}: LoginProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(Login.name, LOGIN_TEXTS), [])
  const componentStrings = localeManager.componentStrings(Login.name) as LoginTexts

  const { user } = useUser()
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const [passwordRecoveryDialogOpen, setDialogOpen] = useState(false)
  const handlePasswordRecoveryDialogClose = () => {
    setDialogOpen(false)
    setInvalidRecoveryEmail(false)
  }
  const recoveryEmailInputRef = useRef<HTMLInputElement | null>(null)
  const [invalidRecoveryEmail, setInvalidRecoveryEmail] = useState<boolean>(false)

  const [alertDialogOpen, setAlertDialogOpen] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = data.get('email') as string | null
    const password = data.get('password') as string | null
    if (!email?.length) {
      setError(KnownAuthErrors.EMPTY_EMAIL)
      return
    }
    if (!password?.length) {
      setError(KnownAuthErrors.EMPTY_PASSWORD)
      return
    }
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential: UserCredential) => {
        setError(null)
      })
      .catch((error) => {
        setError(error.code)
      })
  }

  const handleSendPasswordRecoveryEmail = () => {
    const email = recoveryEmailInputRef.current?.value ?? ''
    if (!isValidEmail(email)) {
      setInvalidRecoveryEmail(true)
      return
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        handlePasswordRecoveryDialogClose()
      })
      .catch((error) => {
        console.error(error)
        handlePasswordRecoveryDialogClose()
        setAlertDialogOpen(true)
      })
  }

  useEffect(() => {
    if (user.loading) {
      return
    }
    if (user.uid) {
      if (user.role === UserRole.TEACHER) {
        navigate('/students')
        scrollToTop()
      } else {
        navigate(`/subjects`)
        scrollToTop()
      }
    }
  }, [user])

  const signInForm = (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          m: 'auto'
        }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {componentStrings.signInTitle}
        </Typography>
      </Stack>
      {error && <Alert severity="error">{parseAuthError(error, componentStrings)}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label={componentStrings.emailAddress}
          name="email"
          autoComplete="email"
          autoFocus
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
          name="password"
          label={componentStrings.password}
          type="password"
          id="password"
          autoComplete="current-password"
          error={[KnownAuthErrors.INVALID_CREDENTIALS, KnownAuthErrors.EMPTY_PASSWORD].includes(
            error as KnownAuthErrors
          )}
        />
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
          {componentStrings.signIn}
        </Button>
        <Grid2 container>
          <Grid2 xs>
            <Link
              href="#"
              variant="body2"
              onClick={() => {
                setDialogOpen(true)
              }}>
              {componentStrings.forgotPassword}
            </Link>
          </Grid2>
        </Grid2>
      </Box>
    </>
  )

  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12} xsOffset={0} sm={8} smOffset={2} md={8} mdOffset={2}>
            <Card
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
              <CardContent>{signInForm}</CardContent>
            </Card>
          </Grid2>
        </Grid2>
      </Container>
      <MultiActionDialog
        open={passwordRecoveryDialogOpen}
        onClose={handlePasswordRecoveryDialogClose}
        title={componentStrings.recoverPasswordDialogTitle}
        aria-describedby="recover-email-dialog-description"
        actions={[
          {
            label: componentStrings.cancel,
            onClick: handlePasswordRecoveryDialogClose
          },
          {
            label: componentStrings.send,
            onClick: handleSendPasswordRecoveryEmail
          }
        ]}>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {componentStrings.recoverPasswordDialogDescription}
          </DialogContentText>
          <TextField
            error={invalidRecoveryEmail}
            InputProps={{ inputRef: recoveryEmailInputRef }}
            margin="normal"
            required
            fullWidth
            id="email"
            label={componentStrings.emailAddress}
            name="email"
            autoComplete="email"
            autoFocus
          />
        </DialogContent>
      </MultiActionDialog>
      <MultiActionDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        title={componentStrings.alertDialogTitle}
        aria-describedby="alert-dialog-description"
        actions={[
          {
            label: componentStrings.close,
            onClick: () => setAlertDialogOpen(false)
          }
        ]}>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {componentStrings.alertDialogDescription}
          </DialogContentText>
        </DialogContent>
      </MultiActionDialog>
    </>
  )
}
