import { Card, CardContent, Container, Link, Typography } from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useMemo } from 'react'
import EmailIcon from '@mui/icons-material/Email'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import PublicIcon from '@mui/icons-material/Public'
import { withBaseURL } from '../util/string'
import { SupportedLocale } from '../util/SupportedLocale'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'

export interface CreditsProps {}

interface CreditsTexts {
  pageCreatedBy: string
  resources: string
}

const EN_US: CreditsTexts = {
  pageCreatedBy: 'Page conceived and created by',
  resources: 'Free third party resources used'
}

const RO_RO: CreditsTexts = {
  pageCreatedBy: 'Pagină realizată de',
  resources: 'Resurse folosite în crearea paginii'
}

const CREDITS_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function Credits({}: CreditsProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(Credits.name, CREDITS_TEXTS), [])

  const componentStrings = localeManager.componentStrings(Credits.name) as CreditsTexts
  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5">{componentStrings.pageCreatedBy}</Typography>
              <Typography variant="h6">Florin Chelaru</Typography>
              <Typography variant="body2">
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="https://florin-chelaru.github.io/"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    textDecoration: 'none'
                  }}>
                  <PublicIcon fontSize="small" sx={{ mr: 1 }} /> florin-chelaru.github.io
                </Link>
              </Typography>
              <Typography variant="body2">
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="mailto:florin.chelaru@gmail.com"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    textDecoration: 'none'
                  }}>
                  <EmailIcon fontSize="small" sx={{ mr: 1 }} /> florin.chelaru@gmail.com
                </Link>
              </Typography>
              <Typography variant="body2">
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="https://www.linkedin.com/in/florinchelaru/"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    textDecoration: 'none'
                  }}>
                  <LinkedInIcon fontSize="small" sx={{ mr: 1 }} /> florinchelaru
                </Link>
              </Typography>
              <br />
              <Typography variant="h5">{componentStrings.resources}</Typography>
              <Typography variant="body2">
                <img src={withBaseURL('/violin-32.png')} loading="lazy" alt="Violin icon" />
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="https://www.flaticon.com/free-icons/violin"
                  title="violin icons">
                  Violin icons created by Freepik - Flaticon
                </Link>
              </Typography>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  )
}
