import React, { useEffect, useRef, useState } from 'react'
import { Button, Container, TextField, Toolbar, Typography } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { auth, database } from '../store/Firebase'
import { signInWithEmailAndPassword, UserCredential, User } from 'firebase/auth'
import { ref, onValue } from 'firebase/database'

export interface LoginProps {}

export default function Login({}: LoginProps) {
  const [user, setUser] = useState<User>()
  const [userData, setUserData] = useState<string | null>(null)
  const [userDataError, setUserDataError] = useState<string | null>(null)
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    if (!user) {
      setUserData('<no user data>')
      return
    }

    const r = ref(database, `users/${user.uid}/test_user_key`)
    onValue(
      r,
      (snapshot) => {
        setUserData(snapshot.val())
      },
      (error) => {
        setUserDataError(error.message)
      }
    )
  }, [user])

  const usernameRef = useRef<any>()
  const passwordRef = useRef<any>()
  const signIn = () => {
    if (usernameRef?.current?.value?.length && passwordRef?.current?.value?.length) {
      signInWithEmailAndPassword(auth, usernameRef.current.value, passwordRef.current.value)
        .then((userCredential: UserCredential) => {
          setUser(userCredential.user)
          setError(false)
        })
        .catch((error) => {
          console.log(`Error trying to log in: ${error.code} ${error.message}`)
          setError(true)
        })
    }
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <TextField
            id="username"
            inputRef={usernameRef}
            label="Email address"
            variant="standard"
          />
        </Grid2>
        <Grid2 xs={12}>
          <br />
          <TextField
            id="password"
            inputRef={passwordRef}
            label="Password"
            variant="standard"
            type="password"
          />
        </Grid2>
        <Grid2 xs={12}>
          <Button variant="contained" onClick={signIn}>
            Sign in
          </Button>
        </Grid2>
        <Grid2 xs={12}>
          {user && (
            <Typography variant="body1">
              Welcome {user.email} {user.uid}
            </Typography>
          )}
          {error && <Typography variant="body1">Couldn&apos;t sign in</Typography>}
          {userData && <Typography variant="body1">{userData}</Typography>}
          {userDataError && <Typography variant="body1">{userDataError}</Typography>}
        </Grid2>
      </Grid2>
    </Container>
  )
}
