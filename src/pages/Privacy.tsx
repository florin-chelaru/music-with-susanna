import { Card, CardContent, Container, Link, Typography } from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useContext, useMemo } from 'react'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { SupportedLocale } from '../util/SupportedLocale'

export interface PrivacyProps {}

interface PrivacyTexts {
  privacyPolicyTitle: string
  privacyPolicyContent: React.ReactNode
}

const EN_US: PrivacyTexts = {
  privacyPolicyTitle: 'Privacy Policy',
  privacyPolicyContent: (
    <>
      This app is fetches posts from a Facebook page that I, Susanna Alice Johnson-Chelaru, own:{' '}
      <Link
        rel="noreferrer"
        target="_blank"
        href="https://www.facebook.com/MusicwithMsJohnson/"
        sx={{ textDecoration: 'none' }}>
        https://www.facebook.com/MusicwithMsJohnson/
      </Link>
      . It does not collect, store, or process any personal information. The app only accesses
      publicly available posts from the page and presents them to users. No sensitive or private
      data is used or stored by the app.
      <br />
      <br />
      By using this app, users are accessing publicly available content that can be viewed on
      Facebook. The app does not share or sell any data.
      <br />
      <br />
      For questions or concerns, please contact me at{' '}
      <Link
        rel="noreferrer"
        target="_blank"
        href="mailto:susanna.alice.j@gmail.com?subject=Violin%2Fviola%20lessons&body=Hello%2C%20I%20would%20like%20to%20find%20out%20more%20about%20the%20violin%2Fviola%20lessons.%20My%20name%20is"
        sx={{ textDecoration: 'none' }}>
        susanna.alice.j@gmail.com
      </Link>
      .
    </>
  )
}

const RO_RO: PrivacyTexts = {
  privacyPolicyTitle: 'Politica de confidențialitate',
  privacyPolicyContent: (
    <>
      Această aplicație preia postările de pe o pagină de Facebook pe care eu, Susanna Alice
      Johnson-Chelaru, o dețin:{' '}
      <Link
        rel="noreferrer"
        target="_blank"
        href="https://www.facebook.com/MusicwithMsJohnson/"
        sx={{ textDecoration: 'none' }}>
        https://www.facebook.com/MusicwithMsJohnson/
      </Link>
      . Aplicația nu colectează, nu stochează și nu procesează nicio informație personală. Aplicația
      accesează doar postările publice de pe pagină și le prezintă utilizatorilor. Nu se utilizează
      sau stochează date sensibile sau private.
      <br />
      <br />
      Prin utilizarea acestei aplicații, utilizatorii accesează conținut disponibil în mod public pe
      Facebook. Aplicația nu partajează și nu vinde nicio informație.
      <br />
      <br />
      Pentru întrebări sau nelămuriri, vă rog să mă contactați la{' '}
      <Link
        rel="noreferrer"
        target="_blank"
        href="mailto:susanna.alice.j@gmail.com?subject=Violin%2Fviola%20lessons&body=Hello%2C%20I%20would%20like%20to%20find%20out%20more%20about%20the%20violin%2Fviola%20lessons.%20My%20name%20is"
        sx={{ textDecoration: 'none' }}>
        susanna.alice.j@gmail.com
      </Link>
      .
    </>
  )
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function Privacy({}: PrivacyProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(Privacy.name, TEXTS), [])

  const componentStrings = localeManager.componentStrings(Privacy.name) as PrivacyTexts
  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Toolbar />
      <Grid2 container spacing={2}>
        <Grid2 xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5">{componentStrings.privacyPolicyTitle}</Typography>
              <br />
              <Typography variant="body1">{componentStrings.privacyPolicyContent}</Typography>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  )
}
