import React, { useContext, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { auth } from '../store/Firebase'
import { signInWithEmailAndPassword, signOut, UserCredential } from 'firebase/auth'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { SupportedLocale } from '../util/SupportedLocale'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { useNavigate } from 'react-router-dom'
import { scrollToTop } from '../util/window'

interface UserPageTexts {}

const EN_US: UserPageTexts = {}

const RO_RO: UserPageTexts = {}

const USER_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export interface UserPageProps {}

export default function UserPage({}: UserPageProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(UserPage.name, USER_PAGE_TEXTS), [])
  const componentStrings = localeManager.componentStrings(UserPage.name) as UserPageTexts

  const { user, dispatch } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user.uid) {
      navigate('/login')
    }
  }, [user])

  return (
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
            <CardContent>Hello {user.firstName}</CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  )
}
