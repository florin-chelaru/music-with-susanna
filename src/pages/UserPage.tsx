import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Container, Toolbar } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import { SupportedLocale } from '../util/SupportedLocale'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill'

interface UserPageTexts {}

const EN_US: UserPageTexts = {}

const RO_RO: UserPageTexts = {}

const USER_PAGE_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

const EDITOR_MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }, { font: [] as string[] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ color: [] as string[] }, { background: [] as string[] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    ['link', 'image', 'video'],
    ['clean']
  ]
}

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

  const [value, setValue] = useState('')
  const valueChanged = (v: any) => {
    setValue(v)
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <Card
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'visible', // allow tooltips to span over the card
              minHeight: '300px',
              height: '100%'
            }}>
            <ReactQuill
              theme="snow"
              value={value}
              onChange={valueChanged}
              modules={EDITOR_MODULES}
              style={{
                float: 'none',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            />
            <CardContent>
              Hello {user.firstName}
              <div dangerouslySetInnerHTML={{ __html: value }} />
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  )
}
