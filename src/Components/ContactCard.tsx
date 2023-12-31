import { Card, CardContent, CardMedia, Link, Typography } from '@mui/material'
import Grid2 from '@mui/material/Unstable_Grid2'
import React, { useContext, useMemo } from 'react'
import EmailIcon from '@mui/icons-material/Email'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import FacebookIcon from '@mui/icons-material/Facebook'
import YouTubeIcon from '@mui/icons-material/YouTube'
import InstagramIcon from '@mui/icons-material/Instagram'
import { SupportedLocale } from '../util/SupportedLocale'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { withBaseURL } from '../util/string'

interface ContactTexts {
  title: string
  content: React.ReactNode
  whatsAppLinkWithMessage: string
  emailLinkWithMessage: string
}

const EN_US: ContactTexts = {
  title: 'CONTACT ME',
  content: (
    <>
      Please send me a message in the chat window, or{' '}
      <Link
        rel="noreferrer"
        target="_blank"
        href="mailto:susanna.alice.j@gmail.com?subject=Violin%2Fviola%20lessons&body=Hello%2C%20I%20would%20like%20to%20find%20out%20more%20about%20the%20violin%2Fviola%20lessons.%20My%20name%20is"
        sx={{ textDecoration: 'none' }}>
        send me an email{' '}
      </Link>
      to schedule a trial lesson or ask me a question. The lessons are taught in my apartment in
      Iași, on Strada Nicolae Gane behind Palatului Copiilor (see map below).
    </>
  ),
  whatsAppLinkWithMessage:
    'https://wa.me/40724261320?text=Hello%2C%20I%20would%20like%20to%20find%20out%20more%20about%20the%20violin%2Fviola%20lessons.%20My%20name%20is',
  emailLinkWithMessage:
    'mailto:susanna.alice.j@gmail.com?subject=Violin%2Fviola%20lessons&body=Hello%2C%20I%20would%20like%20to%20find%20out%20more%20about%20the%20violin%2Fviola%20lessons.%20My%20name%20is'
}

const RO_RO: ContactTexts = {
  title: 'CONTACTEAZĂ-MĂ',
  content: (
    <>
      Dacă vrei să programezi o lecție de probă sau să întrebi ceva, îmi poți trimite un mesaj în
      fereastra de chat. Sau îmi poți scrie un email la{' '}
      <Link
        rel="noreferrer"
        target="_blank"
        href="mailto:susanna.alice.j@gmail.com?subject=Lec%C8%9Bii%20de%20vioar%C4%83%2Fviol%C4%83&body=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20"
        sx={{ textDecoration: 'none' }}>
        susanna.alice.j@gmail.com
      </Link>
      . Lecțiile sunt ținute în Iași, pe Strada Nicolae Gane, în spatele Palatului Copiilor (vezi
      harta mai jos).
    </>
  ),
  whatsAppLinkWithMessage:
    'https://wa.me/40724261320?text=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20',
  emailLinkWithMessage:
    'mailto:susanna.alice.j@gmail.com?subject=Lec%C8%9Bii%20de%20vioar%C4%83%2Fviol%C4%83&body=Bun%C4%83%20ziua%2C%20a%C8%99%20vrea%20s%C4%83%20aflu%20detalii%20despre%20lec%C8%9Biile%20de%20vioar%C4%83%2Fviol%C4%83.%20Numele%20meu%20este%20'
}

const CONTACT_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function ContactCard() {
  const localeManager = useContext<LocaleHandler>(LocaleContext)

  useMemo(() => localeManager.registerComponentStrings(ContactCard.name, CONTACT_TEXTS), [])

  const componentStrings = localeManager.componentStrings(ContactCard.name) as ContactTexts
  return (
    <Card>
      <Grid2 container>
        <Grid2 xs={12} sm={6}>
          <CardMedia
            component="img"
            // TODO: Breakpoints
            image={withBaseURL('/static/img/contact-large.jpeg')}
            alt="Susanna Johnson-Chelaru"
            // For getting the image to stretch to the available space.
            // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
            sx={{
              flexShrink: 0,
              minHeight: '100%'
            }}
          />
        </Grid2>
        <Grid2
          xs={12}
          sm={6}
          sx={{
            display: 'flex',
            direction: 'vertical',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
          <CardContent>
            <Typography variant="h5">{componentStrings.title}</Typography>

            <Typography variant="body1" paragraph>
              {componentStrings.content}
            </Typography>

            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                href={componentStrings.whatsAppLinkWithMessage}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <WhatsAppIcon fontSize="small" sx={{ mr: 1 }} /> 0724-261-320
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                href={componentStrings.emailLinkWithMessage}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <EmailIcon fontSize="small" sx={{ mr: 1 }} /> susanna.alice.j@gmail.com
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                href="https://www.facebook.com/MusicwithMsJohnson"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <FacebookIcon fontSize="small" sx={{ mr: 1 }} /> MusicwithMsJohnson
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                href="https://www.instagram.com/music.with.ms.johnson"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <InstagramIcon fontSize="small" sx={{ mr: 1 }} /> Insta: music.with.ms.johnson
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link
                rel="noreferrer"
                target="_blank"
                href="https://www.youtube.com/channel/UCrxcoyBWhGaf-xYNzutQzeg/videos"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  textDecoration: 'none'
                }}>
                <YouTubeIcon fontSize="small" sx={{ mr: 1 }} /> YouTube Channel
              </Link>
            </Typography>
          </CardContent>
        </Grid2>
      </Grid2>
      <CardMedia sx={{ mb: '-7px' }}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1356.123225821133!2d27.5774722!3d47.1726111!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x32da219e24d22664!2zNDfCsDEwJzIxLjQiTiAyN8KwMzQnMzguOSJF!5e0!3m2!1sen!2sro!4v1674318932988!5m2!1sen!2sro"
          width="100%"
          height="450"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </CardMedia>
    </Card>
  )
}
