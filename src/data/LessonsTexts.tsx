import { LocalizedData } from '../store/LocaleProvider'
import React from 'react'
import { Link, Typography } from '@mui/material'
import { SupportedLocale } from '../util/SupportedLocale'

export interface LessonsTexts extends LocalizedData {
  intro: React.ReactNode
  philosophy: string
}

const EN_US: LessonsTexts = {
  intro: (
    <Typography variant="body1" paragraph>
      Susanna is an American music teacher and violist, graduate of one of the most prestigious
      music schools in the United States:{' '}
      <Link underline="hover" href="https://music.indiana.edu/" rel="noreferrer" target="_blank">
        Indiana University, Bloomington
      </Link>
      . She has graduate studies at the{' '}
      <Link
        underline="hover"
        href="https://bostonconservatory.berklee.edu/"
        rel="noreferrer"
        target="_blank">
        Boston Conservatory at Berklee
      </Link>{' '}
      and{' '}
      <Link underline="hover" href="https://music.umd.edu/" rel="noreferrer" target="_blank">
        University of Maryland, College Park
      </Link>
      . Her teaching method uses the Suzuki Method repertoire and learning sequence, technical
      exercises from the Mimi Zweig String Pedagogy, as well as music learning methods from El
      Sistema, Dalcroze and First Steps in Music.
      <br />
      <br />
      In the United States, she was a music teacher at{' '}
      <Link
        underline="hover"
        href="https://www.bridgebostoncs.org/"
        rel="noreferrer"
        target="_blank">
        Bridge Boston Charter School
      </Link>{' '}
      and{' '}
      <Link underline="hover" href="https://sscmusic.org/" rel="noreferrer" target="_blank">
        South Shore Conservatory
      </Link>
      . Her teaching experience also includes music programs across the United States as well as
      Sweden, El Salvador and Sibiu, Romania.
      <br />
      <br />
      Susanna studied string instrument pedagogy with{' '}
      <Link
        underline="hover"
        href="https://music.indiana.edu/faculty/current/zweig-mimi.html"
        rel="noreferrer"
        target="_blank">
        Mimi Zweig
      </Link>{' '}
      and{' '}
      <Link
        underline="hover"
        href="https://peabody.jhu.edu/preparatory/faculty/rebecca-henry/"
        rel="noreferrer"
        target="_blank">
        Rebecca Henry
      </Link>
      , the Suzuki Method for violin with{' '}
      <Link
        underline="hover"
        href="https://suzukiassociation.org/news/author/allen-lieb/"
        rel="noreferrer"
        target="_blank">
        Allen Lieb
      </Link>{' '}
      and{' '}
      <Link
        underline="hover"
        href="https://suzukiassociation.org/news/author/linda-stieg/"
        rel="noreferrer"
        target="_blank">
        Linda Stieg
      </Link>
      , the Dalcroze Method at the{' '}
      <Link
        underline="hover"
        href="https://dalcrozeschoolofboston.org/"
        rel="noreferrer"
        target="_blank">
        Dalcroze School of Boston{' '}
      </Link>
      and the First Steps in Music John Feierabend Method for general music at{' '}
      <Link underline="hover" href="https://www.gordon.edu/music" rel="noreferrer" target="_blank">
        Gordon College
      </Link>{' '}
      in Massachusetts.
      <br />
      <br />
      She has moved from Boston to Iași, Romania, with a desire to give back to the home community
      of her Romanian husband, Florin, and offer a new perspective for the pedagogy of art, and
      music in particular.
    </Typography>
  ),
  philosophy:
    'Susanna’s teaching philosophy aims at having students leave every lesson feeling confident, accomplished and excited to practice at home. She introduces concepts in small pieces, reviews old concepts constantly, and builds up repertoire and technique on a strong foundation. '
}

const RO_RO: LessonsTexts = {
  intro: (
    <Typography variant="body1" paragraph>
      Susanna este profesoară de muzică și violistă americancă, educată la una din cele mai
      prestigioase universități de muzică din SUA:{' '}
      <Link underline="hover" href="https://music.indiana.edu/" rel="noreferrer" target="_blank">
        Indiana University, Bloomington
      </Link>
      . Are studii masterale la{' '}
      <Link
        underline="hover"
        href="https://bostonconservatory.berklee.edu/"
        rel="noreferrer"
        target="_blank">
        Boston Conservatory at Berklee
      </Link>{' '}
      și{' '}
      <Link underline="hover" href="https://music.umd.edu/" rel="noreferrer" target="_blank">
        University of Maryland, College Park
      </Link>
      . Susanna combină etapele învățării și repertoriul metodei pedagogice Suzuki cu exerciții
      tehnice concepute în Pedagogia Coardelor de Mimi Zweig, și elemente de predare/învățare a
      muzicii preluate din programele El Sistema, Dalcroze, și First Steps in Music.
      <br />
      <br />
      În Statele Unite, Susanna a fost profesoară de muzică în Boston, la liceul{' '}
      <Link
        underline="hover"
        href="https://www.bridgebostoncs.org/"
        rel="noreferrer"
        target="_blank">
        Bridge Boston Charter School
      </Link>{' '}
      și conservatorul de muzică pentru copii{' '}
      <Link underline="hover" href="https://sscmusic.org/" rel="noreferrer" target="_blank">
        South Shore Conservatory
      </Link>
      . Experiența sa pedagogică include și o varietate de programe de muzică din SUA, Suedia și El
      Salvador. Recent, Susanna a participat în calitate de profesor invitat, la programul de muzică
      pentru copii tip El Sistema,{' '}
      <Link
        underline="hover"
        href="https://elijah.ro/ro/projekte/activitatea-noastra/scoli-de-muzica/"
        rel="noreferrer"
        target="_blank">
        Elijah
      </Link>{' '}
      din Sibiu.
      <br />
      <br />
      Susanna a studiat pedagogia instrumentelor de coarde cu{' '}
      <Link
        underline="hover"
        href="https://music.indiana.edu/faculty/current/zweig-mimi.html"
        rel="noreferrer"
        target="_blank">
        Mimi Zweig
      </Link>{' '}
      și{' '}
      <Link
        underline="hover"
        href="https://peabody.jhu.edu/preparatory/faculty/rebecca-henry/"
        rel="noreferrer"
        target="_blank">
        Rebecca Henry
      </Link>
      , metoda Suzuki cu{' '}
      <Link
        underline="hover"
        href="https://suzukiassociation.org/news/author/allen-lieb/"
        rel="noreferrer"
        target="_blank">
        Allen Lieb
      </Link>{' '}
      și{' '}
      <Link
        underline="hover"
        href="https://suzukiassociation.org/news/author/linda-stieg/"
        rel="noreferrer"
        target="_blank">
        Linda Stieg
      </Link>
      , metoda Dalcroze la{' '}
      <Link
        underline="hover"
        href="https://dalcrozeschoolofboston.org/"
        rel="noreferrer"
        target="_blank">
        Dalcroze School of Boston
      </Link>
      , și metoda First Steps in Music John Feierabend la universitatea{' '}
      <Link underline="hover" href="https://www.gordon.edu/music" rel="noreferrer" target="_blank">
        Gordon College
      </Link>{' '}
      din Massachussets.
      <br />
      <br />
      S-a mutat din Boston în Iași, cu dorința de a oferi comunității de baștină a soțului ei român,
      Florin, o perspectivă diferită în ce privește pedagogia artei, și a muzicii în mod deosebit.
    </Typography>
  ),
  philosophy:
    'Filozofia pedagogică a Susannei urmărește ca la sfârșitul fiecărei lecții, elevii să fie încrezători, împliniți, și entuziasmați de a exersa acasă. Conceptele sunt introduse în fragmente scurte, elementele cunoscute sunt periodic revizitate, iar repertoriul și tehnica sunt construite pe o fundație solidă.'
}

export const LESSONS_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])
