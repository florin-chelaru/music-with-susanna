import { LocalizedData } from '../store/LocaleProvider'
import React from 'react'
import { Link, Typography } from '@mui/material'
import { SupportedLocale } from '../util/SupportedLocale'

export interface LessonsTexts extends LocalizedData {
  intro: React.ReactNode
  philosophyTitle: string
  philosophy: string
  suzukiTitle: string
  suzuki: React.ReactNode
  suzukiPhotoCaption: string
  elSistemaTitle: string
  elSistema: React.ReactNode
  elSistemaPhotoCaption: string
  firstStepsTitle: string
  firstSteps: React.ReactNode
  firstStepsPhotoCaption: string
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
  philosophyTitle: 'TEACHING PHILOSOPHY',
  philosophy:
    'Susanna’s teaching philosophy aims at having students leave every lesson feeling confident, accomplished and excited to practice at home. She introduces concepts in small pieces, reviews old concepts constantly, and builds up repertoire and technique on a strong foundation. ',
  suzukiTitle: 'THE SUZUKI METHOD',
  suzuki: (
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
      the &quot;mother-tongue approach&quot;. As an officially trained Suzuki teacher (Suzuki Violin
      Levels 1 & 2 Certification in 2012 and 2014), Susanna follows the mother-tongue approach that
      imitates natural native language acquisition. In the Suzuki Method, children start learning
      music at a very young age (as young as 3 years old). As part of the mother-tongue approach of
      music learning, Susanna implements listening, repetition and review, and delayed note-reading
      (as children learn to read after they speak the language).
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
  ),
  suzukiPhotoCaption: 'Dylan age six, just earned his 30-day practice trophy',
  elSistemaTitle: 'EL SISTEMA',
  elSistema: (
    <>
      Susanna has worked in various{' '}
      <Link
        underline="hover"
        href="https://elsistemausa.org/about/"
        rel="noreferrer"
        target="_blank">
        El Sistema
      </Link>{' '}
      music programs since 2012, in the United States, El Salvador, Sweden and Romania, teaching
      group violin and string ensemble classes. El Sistema is a music education philosophy that
      originated in Venezuela in 1975. The main philosophy behind El Sistema is that every child
      should have access to quality music education, and El Sistema programs are designed so that
      children learn together in a group setting.
      <br />
      <br />
      Susanna has adopted many of the principles and values from El Sistema music programs into her
      teaching. She believes that disadvantaged children should have access to quality music
      education. These music education programs should be local, convenient and very high quality.
      She also truly believes in and has seen the power and magic in group learning. Specifically,
      Susanna strives to teach group music classes the El Sistema way: with joyful and supportive
      group learning, using activities made for and made better when done in a group and making sure
      that children are able to participate in the group ensembles from the very beginning of their
      instrumental learning. El Sistema programs focus on intensive and joyful music making as a
      vehicle for social development. As such, when teaching group music, Susanna focuses on peer
      learning and using music as a tool for developing community and positive relationships in the
      group.
      <br />
      <br />
      One final very important aspect of El Sistema is the importance of performing in the community
      and performing often. Students in an El Sistema program should be performing within their
      first month of learning their instrument. Performing and sharing music with the community
      should be one of the main goals of an El Sistema program. Susanna believes that students
      should have as many opportunities to perform as possible, whether they are more informal or
      more formal. Frequent performances remove performance jitters and refocus the students on the
      joy of learning to play an instrument: through sharing it!
    </>
  ),
  elSistemaPhotoCaption:
    'Susanna teaching a group class at the El Sistema program in Sibiu, Romania',
  firstStepsTitle: 'FIRST STEPS IN MUSIC',
  firstSteps: (
    <>
      Since 2016, Susanna has been using John Feierabend&apos;s{' '}
      <Link
        underline="hover"
        href="https://www.feierabendmusic.org/first-steps-in-music-for-preschool-and-beyond/"
        rel="noreferrer"
        target="_blank">
        First Steps in Music
      </Link>{' '}
      method from the United States to teach general music to preschool, kindergarten and elementary
      students at Bridge Boston Charter School. In the summer of 2019, Susanna received special
      training in the method at Gordon College as part of her Music Education License degree that
      she received in 2021.
      <br />
      <br />
      Feierabend’s music learning philosophy says that students should learn to be
      &quot;tuneful&quot;, &quot;beatful&quot; and &quot;artful&quot;. Tuneful children learn to
      hear tunes in their heads and coordinate their vocal muscles to sing these tunes. Beatful
      children feel the pulse in the music and how the pulse is organized in groups of 2s and 3s.
      Artful children are moved by music in the many ways music can elicit a feelingful response.
      <br />
      <br />
      The goal of a teacher of this method is that children who learn in this way grow to be
      tuneful, beatful and artful adults. This means that they will have the ability to participate
      in music that is interwoven throughout their lives. Tuneful adults can sing happy birthday to
      friends and family, sing lullabies to their children and sing ceremonial songs at important
      events and holidays. Beatful adults can rock to the beat while they sing that lullaby, dance
      at weddings and clap to the beat at sporting events. Artful adults are moved by music, seek
      out artful events and enjoy being moved by music.
      <br />
      <br />
      Susanna believes that music education is valuable to all children as it gives them the ability
      to benefit from what music has to offer. Whether or not they seek to become professionals in
      the field of music, they will be enriched by their understanding and their ability to share in
      the language of music for the rest of their lives.
    </>
  ),
  firstStepsPhotoCaption: 'Susanna teaching a group class at the Bridge Boston Charter School'
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
      , și metoda{' '}
      <Link
        underline="hover"
        href="https://www.feierabendmusic.org/first-steps-in-music-for-preschool-and-beyond/"
        rel="noreferrer"
        target="_blank">
        First Steps in Music
      </Link>{' '}
      John Feierabend la universitatea{' '}
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
  philosophyTitle: 'FILOSOFIA PEDAGOGICĂ',
  philosophy:
    'Filozofia pedagogică a Susannei urmărește ca la sfârșitul fiecărei lecții, elevii să fie încrezători, împliniți, și entuziasmați de a exersa acasă. Conceptele sunt introduse în fragmente scurte, elementele cunoscute sunt periodic revizitate, iar repertoriul și tehnica sunt construite pe o fundație solidă.',
  suzukiTitle: 'METODA SUZUKI',
  suzuki: (
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
  ),
  suzukiPhotoCaption: 'Dylan de șase ani, cu trofeul pentru 30 de zile de exersat vioara',
  elSistemaTitle: 'EL SISTEMA',
  elSistema: (
    <>
      Susanna a lucrat, în calitate de instructor de ansambluri de coarde, cu numeroase programe de
      tip{' '}
      <Link
        underline="hover"
        href="https://elsistemausa.org/about/"
        rel="noreferrer"
        target="_blank">
        El Sistema
      </Link>
      , încă din 2012, atât în Statele Unite, cât și în El Salvador, Suedia, și mai recent, în
      România, la Sibiu. <i>El Sistema</i> este o filosofie a educației muzicale originând în
      Venezuela anului 1975. Ideea din spatele ei este că orice copil ar trebui să aibă acces la
      educație muzicală de calitate. Programele El Sistema sunt proiectate în așa fel încât elevii
      să învețe împreună în cadrul unui grup. Copiii provenind din medii dezavantajate economic și
      social trebuie să poată beneficia de educație muzicală ce întrunește standarde înalte,
      disponibilă local și în mod convenabil.
      <br />
      <br />
      Susanna a adoptat principii și valori izvorâte din această filozofie. De exemplu, ea crede cu
      tărie în puterea și importanța învățării în cadrul unui grup, și țintește spre a preda
      lecțiile la clasă într-un mod recreativ, folosind activități destinate grupurilor, și
      distractive mai ales în grup. Lecțiile sunt structurate în așa fel încât copiii pot participa
      în ansambluri instrumentale din primul moment al educației lor muzicale. Programele El Sistema
      folosesc învățarea intensivă a muzicii într-un cadru distractiv, ca un vehicul pentru
      dezvoltarea socială. Ca atare, când predă muzică ansamblurilor de copii, Susanna folosește
      învățarea reciprocă (fiecare elev de la ceilalți, și nu doar de la profesor) ca o unealtă
      pentru dezvoltarea unei comunități și a unor relații bine coagulate în cadrul grupului.
      <br />
      <br />
      Un ultim aspect esențial al programelor El Sistema este importanța interpretării cât mai dese
      în cadrul comunității. Elevii participă la primele concerte încă din prima lună de când au
      început să învețe un instrument. Folosirea instrumentului și împărtășirea muzicii sunt două
      din țelurile principale ale acestui program. Susanna crede că elevii ar trebui să aibă cât mai
      multe prilejuri de a cânta în public, fie că acestea sunt într-un cadru formal, sau unul
      informal. Cu cât copilul cântă mai des în public, cu atât dispar tracul și emoțiile cauzate de
      prezența pe scenă, și îi concentrează atenția la bucuria care vine la pachet cu învățarea unui
      instrument: împărtășirea muzicii cu lumea întreagă!
    </>
  ),
  elSistemaPhotoCaption:
    'Susanna predă o lecție de grup la programul Elijah tip El Sistema din Sibiu',
  firstStepsTitle: 'PRIMII PAȘI ÎN MUZICĂ',
  firstSteps: (
    <>
      Din 2016, Susanna a folosit metoda John Feierabend&apos;s{' '}
      <Link
        underline="hover"
        href="https://www.feierabendmusic.org/first-steps-in-music-for-preschool-and-beyond/"
        rel="noreferrer"
        target="_blank">
        First Steps in Music
      </Link>{' '}
      din Statele Unite, pentru predarea muzicii copiilor de grădiniță și școală primară de la
      liceul Bridge Boston Charter School. În vara lui 2019, Susanna a primit educație formală în
      această metodă la universitatea Gordon College în cadrul cursurilor pentru obținerea licenței
      pedagogice de predare în școlile publice din statul Massachusetts.
      <br />
      <br />
      Conform filosofiei acestei metode, elevii învață să fie <i>melodioși</i>, <i>frumoși</i> și{' '}
      <i>artistici</i>. Copiii <i>melodioși</i> învață să audă melodii în mintea lor și să
      coordoneze mușchii vocali pentru a cânta aceste melodii. Copii <i>frumoși</i> simt pulsul
      muzicii și felul în care pulsul este organizat în grupuri de două sau trei secunde. Copiii{' '}
      <i>artistici</i> se simt mișcați de muzică în numeroasele feluri în care muzica poate provoca
      un răspuns plin de sentimente.
      <br />
      <br />
      Scopul profesorului este să modeleze copiii în așa fel încât aceștia să crească în adulți{' '}
      <i>melodioși</i>, <i>frumoși</i> și <i>artistici</i>. Cu alte cuvinte, vor avea capacitatea să
      participe în muzica întrețesută în viața lor. Adulții <i>melodioși</i> vor fi în stare să
      cânte <i>Mulți ani trăiască</i> prietenilor și familiei, cântece de adormit copiilor lor, și
      cântece ceremoniale la evenimente și sărbători importante. Adulții <i>frumoși</i> vor putea
      suplimenta cântecele cu percuție, dansa la petreceri, și bate din palme în ritmul muzicii la
      evenimente sportive. Pentru adulții <i>artistici</i>, muzica va ocupa un loc intim în sufletul
      lor. Ei vor căuta întotdeauna și în permanență evenimente artistice în jurul lor și se vor
      bucura în profunzime de fiecare strop de muzică.
      <br />
      <br />
      Susanna consideră că educația muzicală este valoroasă pentru toți copiii, întrucât le oferă
      capacitatea de a beneficia de tot ce are de oferit muzica. Indiferent dacă ei vor decide să
      devină muzicieni profesioniști, sau vor prefera să păstreze cu ea o simplă relație amicală,
      vor rămâne îmbogățiți de înțelegerea și capacitatea de a împărtăși limbajul muzicii pentru tot
      restul vieților lor.{' '}
    </>
  ),
  firstStepsPhotoCaption: 'Susanna predă o lecție de vioară la liceul Bridge Boston Charter School'
}

export const LESSONS_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])
