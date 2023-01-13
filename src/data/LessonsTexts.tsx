import { LocalizedData } from '../store/LocaleProvider'
import React from 'react'
import { Link, Typography } from '@mui/material'
import { SupportedLocale } from '../util/SupportedLocale'

export interface LessonsTexts extends LocalizedData {
  intro: React.ReactNode
  philosophy: string
  suzukiMethod: React.ReactNode
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
    'Susanna’s teaching philosophy aims at having students leave every lesson feeling confident, accomplished and excited to practice at home. She introduces concepts in small pieces, reviews old concepts constantly, and builds up repertoire and technique on a strong foundation. ',
  suzukiMethod: (
    <>
      The{' '}
      <Link
        underline="hover"
        href="https://suzukiassociation.org/about/suzuki-method/"
        rel="noreferrer"
        target="_blank">
        Suzuki
      </Link>{' '}
      Method has a long established history of success of more than fifty years originating from
      Japan, and spreading to the United States, to Europe and worldwide. Suzuki teachers believe
      every child can learn music. Founder of the method, Shinichi Suzuki, described the method as
      the “mother-tongue approach”. As an officially trained Suzuki teacher (Suzuki Violin Levels 1
      & 2 Certification in 2012 and 2014), Susanna follows the mother-tongue approach that imitates
      natural native language acquisition. In the Suzuki Method, children start learning music at a
      very young age (as young as 3 years old). As part of the mother-tongue approach of music
      learning, Susanna implements listening, repetition and review, and delayed note-reading (as
      children learn to read after they speak the language).
      <br />
      <br />
      Another very important aspect of the Suzuki Method when children are very young is parental
      participation. Parents sit in on lessons, participate in the activities with the child during
      the lesson and assist the children with practice at home. This is no burden as every lesson is
      joyful, and full of games and activities that ease the learning. At the same time, Susanna
      believes in holding every child to a high standard and promoting motivation through
      achievement.
      <br />
      <br />
      Susanna uses a combination of the Suzuki Method repertoire and repertoire collected throughout
      her 15+ years of teaching experience in schools and music programs that give students a sense
      of accomplishment and achievement after every lesson. The trick is small and deliberate steps.
    </>
  )
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
    'Filozofia pedagogică a Susannei urmărește ca la sfârșitul fiecărei lecții, elevii să fie încrezători, împliniți, și entuziasmați de a exersa acasă. Conceptele sunt introduse în fragmente scurte, elementele cunoscute sunt periodic revizitate, iar repertoriul și tehnica sunt construite pe o fundație solidă.',
  suzukiMethod: (
    <>
      Metoda{' '}
      <Link
        underline="hover"
        href="https://suzukiassociation.org/about/suzuki-method/"
        rel="noreferrer"
        target="_blank">
        Suzuki
      </Link>{' '}
      este consacrată ca o metodă pedagogică de succes cu o istorie de mai bine de cinzeci de ani,
      pornind din Japonia, răspândindu-se apoi în SUA și Europa, și în cele din urmă în întreaga
      lume. Instructorii Suzuki sunt de părere că <b>orice copil</b> poate învăța muzică. Fondatorul
      metodei, Shinichi Suzuki, descria metoda ca <i>metoda limbii materne</i>. În calitate de
      profesor certificat Suzuki (a obținut certificările pentru nivelurile 1 și 2 în 2012 și 2014),
      Susanna urmează abordarea <i>limbii materne</i>, care constă din imitarea felului în care
      copiii învață să vorbească, în procesul de predare a muzicii. În metoda Suzuki, copiii încep
      să învețe muzică de la vârste foarte fragede (chiar și de la trei ani). În cadrul filozofiei
      de imitare a învățării limbii materne, Susanna învață copiii mai întâi să cânte, să asculte,
      să repete și să reviziteze conceptele predate, și abia mai târziu să citească notele muzicale,
      în același fel în care copiii învață să citească abia după învață să vorbească.
      <br />
      <br />
      Un alt concept important caracteristic metodei Suzuki este, atunci când copiii sunt foarte
      mici, participarea părinților la procesul de învățare. Părinții pot asista la lecții,
      participa la activitățile muzicale cu copilul în timpul lecției, și sunt încurajați să îl
      ajute acasă în timp ce exersează. Aceasta nu reprezintă o povară pentru părinți, întrucât
      fiecare lecție este jovială și plină de jocuri și activități care înlesnesc învățarea. În
      același timp, Susanna crede în ridicarea fiecărui copil la un înalt standard și motivarea prin
      realizări.
      <br />
      <br />
      Susanna folosește o combinație de repertoriu specific metodei Suzuki, și repertoriu acumulat
      în cei mai bine de 15 ani de experiență pedagogică în școli și programe muzicale, care oferă
      elevilor un sentiment de realizare la sfârșitul fiecărei lecții. Esențial este ca fiecare pas
      în drumul învățării să fie mic și să aibă un scop binedefinit.
    </>
  )
}

export const LESSONS_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])
