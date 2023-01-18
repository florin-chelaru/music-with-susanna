import React from 'react'
import { Link, Typography } from '@mui/material'
import { SupportedLocale } from '../util/SupportedLocale'
import { LocalizedData } from '../store/LocaleProvider'

export interface Entry {
  dates: string
  content: React.ReactNode
}

export interface Section {
  title: string
  entries: Entry[]
}

export interface Resume {
  sections: Section[]
}

export const RESUME_EN_US: Resume = {
  sections: [
    {
      title: 'EDUCATION',
      entries: [
        {
          dates: '2018 — 2021',
          content: (
            <>
              <Typography variant="body2">
                <b>Post-Baccalaureate Public School Teaching License:</b> Music Education K-12
              </Typography>
              <Typography variant="overline">Gordon College, Boston</Typography>
            </>
          )
        },
        {
          dates: '2015 — 2016',
          content: (
            <>
              <Typography variant="body2">
                <b>Graduate Diploma:</b> Viola Performance
              </Typography>
              <Typography variant="overline">Boston Conservatory</Typography>
            </>
          )
        },
        {
          dates: '2013 — 2015',
          content: (
            <>
              <Typography variant="body2">
                <b>Master of Music:</b> Viola Performance
              </Typography>
              <Typography variant="overline">University of Maryland, College Park</Typography>
            </>
          )
        },
        {
          dates: '2009 — 2013',
          content: (
            <>
              <Typography variant="body2">
                <b>Bachelor of Music:</b> Viola Performance
              </Typography>
              <Typography variant="overline">Indiana University, Bloomington</Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'TEACHING EXPERIENCE',
      entries: [
        {
          dates: 'May 2022 — present',
          content: (
            <>
              <Typography variant="overline">
                <b>Centrul de zi pentru copii Sfânta Marina</b> Iași, Romania
              </Typography>
              <Typography variant="body2">Music Therapy Instructor (Volunteer)</Typography>
            </>
          )
        },
        {
          dates: 'Sep 2022',
          content: (
            <>
              <Typography variant="overline">
                <b>Casa Sonja Music School</b>
                <br />
                El Sistema Music Program, Hosman, SB, Romania
              </Typography>
              <Typography variant="body2">
                Visiting Violin and Viola Group Class and Private Instructor
              </Typography>
            </>
          )
        },
        {
          dates: 'Sep 2016 — Jun 2021',
          content: (
            <>
              <Typography variant="overline">
                <b>Bridge Boston Charter School</b>
                <br />
                El Sistema Music Program, Roxbury, MA
              </Typography>
              <Typography variant="body2">
                <b>Master Teacher:</b>
              </Typography>
              <Typography variant="body2" paragraph>
                Kindergarten general music, 1<sup>st</sup> and 2<sup>nd</sup> grade violin & cello
                ensemble and 1<sup>st</sup> and 2<sup>nd</sup> grade general music
              </Typography>
              <Typography variant="body2">
                <b>Assistant Teacher:</b>
              </Typography>
              <Typography variant="body2" paragraph>
                String orchestra, viola, violin and cello sectionals, 3<sup>rd</sup> through 8
                <sup>th</sup> grade
              </Typography>
              <Typography variant="body2">
                <b>Violin and Viola Teaching Artist:</b>
              </Typography>
              <Typography variant="body2">
                3<sup>rd</sup> through 8<sup>th</sup> grade
              </Typography>
            </>
          )
        },
        {
          dates: 'Aug 2015 – Oct 2018',
          content: (
            <>
              <Typography variant="overline">
                <b>South Shore Conservatory</b> Hingham, MA
              </Typography>
              <Typography variant="body2">Suzuki Violin Teacher</Typography>
              <Typography variant="body2">Traditional Violin and Viola Teacher</Typography>
            </>
          )
        },
        {
          dates: 'Sep 2013 — May 2015',
          content: (
            <>
              <Typography variant="overline">
                <b>University of Maryland,</b> College Park
              </Typography>
              <Typography variant="body2">
                Graduate Assistant: Orchestra Ensemble Assistant
              </Typography>
              <Typography variant="body2">
                University of Maryland Repertoire Orchestra Section Coach
              </Typography>
              <Typography variant="body2">Viola Technique Class Instructor</Typography>
            </>
          )
        },
        {
          dates: 'May 2014\nAug 2013',
          content: (
            <>
              <Typography variant="overline">
                <b>MusAid, El Salvador Project</b>
                <br />
                El Salvador Sistema, San Salvador
              </Typography>
              <Typography variant="body2">
                Viola Instructor: masterclasses, group classes and private instruction
              </Typography>
              <Typography variant="body2">Viola Pedagogy Instructor</Typography>
            </>
          )
        },
        {
          dates: 'Jan—Apr 2013\nSep—Dec 2012',
          content: (
            <>
              <Typography variant="overline">
                <b>Indiana University Fairview Elementary String Project</b> Bloomington, IN
              </Typography>
              <Typography variant="body2">
                Large Group Assistant Teacher: 2<sup>nd</sup> Grade
              </Typography>
              <Typography variant="body2">
                Small group violin teacher: 1<sup>st</sup>, 3<sup>rd</sup> & 4<sup>th</sup> grade
              </Typography>
            </>
          )
        },
        {
          dates: 'May 2012 — May 2013',
          content: (
            <>
              <Typography variant="overline">
                <b>Melody Music Shop</b> Bloomington, IN
              </Typography>
              <Typography variant="body2">
                Private Instructor: violin, viola, piano. Students ages 5-17
              </Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'PEDAGOGICAL TRAINING',
      entries: [
        {
          dates: 'Jan 2019',
          content: (
            <>
              <Typography variant="overline">
                <b>El Sistema Academy</b> Stockholm, Sweden
              </Typography>
              <Typography variant="body2">Ron Alvarez, Eva Nivbrant Wedin</Typography>
            </>
          )
        },
        {
          dates: 'Fall 2014',
          content: (
            <>
              <Typography variant="overline">
                <b>String Pedagogy</b>
                <br />
                University of Maryland, College Park
              </Typography>
              <Typography variant="body2">Rebecca Henry</Typography>
            </>
          )
        },
        {
          dates: 'Aug 2014',
          content: (
            <>
              <Typography variant="overline">
                <b>Japan-Seattle Suzuki Festival</b>
              </Typography>
              <Typography variant="body2">
                Teaching Certificate – Suzuki Violin Level 2, Allen Lieb
              </Typography>
            </>
          )
        },
        {
          dates: 'Aug 2012',
          content: (
            <>
              <Typography variant="overline">
                <b>IAM Suzuki Festival</b>
              </Typography>
              <Typography variant="body2">
                Teaching Certificate – Every Child Can and Suzuki Violin Level 1, Linda Stieg
              </Typography>
            </>
          )
        },
        {
          dates: 'Spring 2013\nFall 2009',
          content: (
            <>
              <Typography variant="overline">
                <b>Indiana University – Jacobs School of Music, String Academy</b>
              </Typography>
              <Typography variant="body2">Violin and Viola Pedagogy II, Mimi Zweig</Typography>
              <Typography variant="body2">Violin and Viola Pedagogy I, Brenda Brenner</Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'OTHER RELEVANT EXPERIENCE',
      entries: [
        {
          dates: 'Jan—Mar 2020',
          content: (
            <>
              <Typography variant="overline">
                <b>Introduction to Dalcroze for Music Teachers</b> Dalcroze School of Boston
              </Typography>
              <Typography variant="body2">Guy Mendilow</Typography>
            </>
          )
        },
        {
          dates: 'Feb 2020',
          content: (
            <>
              <Typography variant="overline">
                <b>Dream Orchestra El Sistema Sweden Visit</b> Gothenburg, Sweden
              </Typography>
              <Typography variant="body2">Ron Alvarez</Typography>
            </>
          )
        },
        {
          dates: '2018 — 2020',
          content: (
            <>
              <Typography variant="overline">
                <b>Mass Cultural Council META Fellowship</b> Boston, MA
              </Typography>
              <Typography variant="body2">
                Music Educators/Teaching Artist Fellowship Program
              </Typography>
            </>
          )
        },
        {
          dates: '2009 — 2013',
          content: (
            <>
              <Typography variant="overline">
                <b>Bachelor of Arts</b>
                <br />
                Spanish Language with High Distinction, Indiana University
              </Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'LANGUAGES',
      entries: [
        {
          dates: '',
          content: (
            <>
              <Typography variant="body2">
                English <i>Native</i>
                <br />
                Spanish <i>Conversational</i>
                <br />
                Romanian <i>Conversational</i>
              </Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'REFERENCES',
      entries: [
        {
          dates: '',
          content: (
            <>
              <Typography variant="overline">
                <b>Julie Davis</b>
              </Typography>
              <Typography variant="body2">
                Music Director, Bridge Boston Charter School
                <br />
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="mailto:jdavis@bridgebostoncs.org"
                  sx={{ textDecoration: 'none' }}>
                  jdavis@bridgebostoncs.org
                </Link>
                <br />
                (315) 345-0084
              </Typography>
            </>
          )
        },
        {
          dates: '',
          content: (
            <>
              <Typography variant="overline">
                <b>George Little</b>
              </Typography>
              <Typography variant="body2">
                Suzuki Department Chair, South Shore Conservatory
                <br />
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="mailto:g.little@sscmusic.org"
                  sx={{ textDecoration: 'none' }}>
                  g.little@sscmusic.org
                </Link>
                <br />
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="mailto:mynameisgeorgelittle@yahoo.com"
                  sx={{ textDecoration: 'none' }}>
                  mynameisgeorgelittle@yahoo.com
                </Link>
                <br />
                (617) 962-1655
              </Typography>
            </>
          )
        }
      ]
    }
  ]
}

export const RESUME_RO_RO: Resume = {
  sections: [
    {
      title: 'EDUCAȚIE',
      entries: [
        {
          dates: '2018 — 2021',
          content: (
            <>
              <Typography variant="body2">
                <b>
                  Licență de Predare a Muzicii în Sistemul de Învățământ Public din Statul
                  Massachusetts, SUA:
                </b>{' '}
                Educație Muzicală pentru elevi cu vârste de la grădiniță până la clasa a XII-a
              </Typography>
              <Typography variant="overline">Gordon College, Wenham, MA</Typography>
            </>
          )
        },
        {
          dates: '2015 — 2016',
          content: (
            <>
              <Typography variant="body2">
                <b>Diplomă de Master în Muzică:</b> Interpretare Violă
              </Typography>
              <Typography variant="overline">Boston Conservatory, MA</Typography>
            </>
          )
        },
        {
          dates: '2013 — 2015',
          content: (
            <>
              <Typography variant="body2">
                <b>Diplomă de Master în Muzica:</b> Interpretare de Violă
              </Typography>
              <Typography variant="overline">University of Maryland, College Park</Typography>
            </>
          )
        },
        {
          dates: '2009 — 2013',
          content: (
            <>
              <Typography variant="body2">
                <b>Licență în Muzică:</b> Interpretare Violă
              </Typography>
              <Typography variant="overline">Indiana University, Bloomington</Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'EXPERIENȚĂ PEDAGOGICĂ',
      entries: [
        {
          dates: 'Mai 2022 — present',
          content: (
            <>
              <Typography variant="overline">
                <b>Centrul de zi pentru copii Sfânta Marina</b> Iași, România
              </Typography>
              <Typography variant="body2">Instructor Terapie Muzicală</Typography>
            </>
          )
        },
        {
          dates: 'Sep 2022',
          content: (
            <>
              <Typography variant="overline">
                <b>
                  Școala de Muzică <i>Casa Sonja</i>
                </b>
                <br />
                Program de Muzică tip <i>El Sistema</i>, Hosman, Sibiu
              </Typography>
              <Typography variant="body2">
                Instructor invitat pentru ansambluri de vioară și violă și lecții particulare
              </Typography>
            </>
          )
        },
        {
          dates: 'Sep 2016 — Iun 2021',
          content: (
            <>
              <Typography variant="overline">
                <b>Bridge Boston Charter School</b>
                <br />
                Program de Muzică tip <i>El Sistema</i>, Roxbury, MA
              </Typography>
              <Typography variant="body2">
                <b>Profesor Principal:</b>
              </Typography>
              <Typography variant="body2" paragraph>
                Educație muzicală pentru grădiniță
                <br />
                Ansamblu de vioară și violoncel, clasele 0 și I<br />
                Educație muzicală generală, clasele 0 și I
              </Typography>
              <Typography variant="body2">
                <b>Profesor Asistent:</b>
              </Typography>
              <Typography variant="body2" paragraph>
                Orchestră de coarde: violă, vioară și violoncel, clasele a II-a până la a VIII-a
              </Typography>
              <Typography variant="body2">
                <b>Artist Didactic de Violă și Vioară:</b>
              </Typography>
              <Typography variant="body2">Clasele a II-a până la a VIII-a</Typography>
            </>
          )
        },
        {
          dates: 'Aug 2015 – Oct 2018',
          content: (
            <>
              <Typography variant="overline">
                <b>South Shore Conservatory</b>
                <br />
                Hingham, MA
              </Typography>
              <Typography variant="body2">Instructor de Vioară, metoda Suzuki</Typography>
              <Typography variant="body2">Instructor de Vioară și Violă, metodă clasică</Typography>
            </>
          )
        },
        {
          dates: 'Sep 2013 — Mai 2015',
          content: (
            <>
              <Typography variant="overline">
                <b>University of Maryland,</b> College Park
              </Typography>
              <Typography variant="body2">
                Asistent Didactic Masterand, Ansamblu Orchestră
              </Typography>
              <Typography variant="body2">
                Trainer, Secțiunea Violă a Orchestrei de Repertoriu, University of Maryland
              </Typography>
              <Typography variant="body2">Instructor de Tehnică pentru Violă</Typography>
            </>
          )
        },
        {
          dates: 'Mai 2014\nAug 2013',
          content: (
            <>
              <Typography variant="overline">
                <b>Programul MusAid, El Salvador</b>
                <br />
                Program tip <i>El Sistema</i>, El Salvador, San Salvador
              </Typography>
              <Typography variant="body2">
                Instructor de Violă: masterclasses, cursuri de grup și lecții particulare
              </Typography>
              <Typography variant="body2">Instructor de Pedagogie pentru Violă</Typography>
            </>
          )
        },
        {
          dates: 'Ian—Apr 2013\nSep—Dec 2012',
          content: (
            <>
              <Typography variant="overline">
                <b>
                  Proiectul Fairview Elementary pentru Instrumente cu Coardă, Indiana University
                </b>
                <br />
                Bloomington, IN
              </Typography>
              <Typography variant="body2">Profesor Asistent, Grupuri Mari: clasa I</Typography>
              <Typography variant="body2">
                Profesor Vioară Grupuri Mici: clasa 0, a II-a și a III-a
              </Typography>
            </>
          )
        },
        {
          dates: 'Mai 2012 — Mai 2013',
          content: (
            <>
              <Typography variant="overline">
                <b>Melody Music Shop</b> Bloomington, IN
              </Typography>
              <Typography variant="body2">
                Instructor Particular: vioară, violă, pian. Elevi cu vârste între 5 și 17 ani
              </Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'PREGĂTIRE PEDAGOGICĂ',
      entries: [
        {
          dates: 'Ian 2019',
          content: (
            <>
              <Typography variant="overline">
                <b>Academia El Sistema</b> Stockholm, Suedia
              </Typography>
              <Typography variant="body2">Instructori: Ron Alvarez, Eva Nivbrant Wedin</Typography>
            </>
          )
        },
        {
          dates: 'Toamna 2014',
          content: (
            <>
              <Typography variant="overline">
                <b>Pedagogia Instrumentelor de Coardă</b>
                <br />
                University of Maryland, College Park
              </Typography>
              <Typography variant="body2">Instructor: Rebecca Henry</Typography>
            </>
          )
        },
        {
          dates: 'Aug 2014',
          content: (
            <>
              <Typography variant="overline">
                <b>Festivalul Suzuki Japan-Seattle</b>
              </Typography>
              <Typography variant="body2">
                Atestat de Predare – Nivelul 2 Vioară Suzuki
                <br />
                Instructor: Allen Lieb
              </Typography>
            </>
          )
        },
        {
          dates: 'Aug 2012',
          content: (
            <>
              <Typography variant="overline">
                <b>Festivalul IAM Suzuki</b>
              </Typography>
              <Typography variant="body2">
                Atestat de Predare – <i>Every Child Can</i> și Nivelul 1 Vioară Suzuki
                <br />
                Instructor: Linda Stieg
              </Typography>
            </>
          )
        },
        {
          dates: 'Primăvara 2013\nToamna 2009',
          content: (
            <>
              <Typography variant="overline">
                <b>Indiana University – Jacobs School of Music, String Academy</b>
              </Typography>
              <Typography variant="body2">
                Pedagogie Vioară și Violă II, Instructor: Mimi Zweig
              </Typography>
              <Typography variant="body2">
                Pedagogie Vioară și Violă I, Instructor: Brenda Brenner
              </Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'ALTĂ EXPERIENȚĂ RELEVANTĂ',
      entries: [
        {
          dates: 'Ian—Mar 2020',
          content: (
            <>
              <Typography variant="body2">
                Urmat Cursul de <b>Introducere în Metoda Dalcroze pentru Instructori de Muzică</b>,
                Dalcroze School of Boston
              </Typography>
              <Typography variant="body2">Instructor: Guy Mendilow</Typography>
            </>
          )
        },
        {
          dates: 'Feb 2020',
          content: (
            <>
              <Typography variant="body2">
                Participant Invitat, <b>Dream Orchestra El Sistema Sweden</b>, Gothenburg, Suedia
              </Typography>
              <Typography variant="body2">Instructor: Ron Alvarez</Typography>
            </>
          )
        },
        {
          dates: '2018 — 2020',
          content: (
            <>
              <Typography variant="overline">
                <b>Fellowship Mass Cultural Council META</b> Boston, MA
              </Typography>
              <Typography variant="body2">
                Program de Fellowship pentru Instructori de Muzică/Artiști Didactici
              </Typography>
            </>
          )
        },
        {
          dates: '2009 — 2013',
          content: (
            <>
              <Typography variant="overline">
                <b>Diplomă de Licență</b>
                <br />
                Limba Spaniolă cu înaltă distincție, Indiana University
              </Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'COMPETENȚE LINGVISTICE',
      entries: [
        {
          dates: '',
          content: (
            <>
              <Typography variant="body2">
                Engleză <i>nativă</i>
                <br />
                Spaniolă <i>conversațională</i>
                <br />
                Română <i>conversațională</i>
              </Typography>
            </>
          )
        }
      ]
    },
    {
      title: 'REFERINȚE PROFESIONALE',
      entries: [
        {
          dates: '',
          content: (
            <>
              <Typography variant="overline">
                <b>Julie Davis</b>
              </Typography>
              <Typography variant="body2">
                Music Director, Bridge Boston Charter School
                <br />
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="mailto:jdavis@bridgebostoncs.org"
                  sx={{ textDecoration: 'none' }}>
                  jdavis@bridgebostoncs.org
                </Link>
                <br />
                (315) 345-0084
              </Typography>
            </>
          )
        },
        {
          dates: '',
          content: (
            <>
              <Typography variant="overline">
                <b>George Little</b>
              </Typography>
              <Typography variant="body2">
                Suzuki Department Chair, South Shore Conservatory
                <br />
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="mailto:g.little@sscmusic.org"
                  sx={{ textDecoration: 'none' }}>
                  g.little@sscmusic.org
                </Link>
                <br />
                <Link
                  rel="noreferrer"
                  target="_blank"
                  href="mailto:mynameisgeorgelittle@yahoo.com"
                  sx={{ textDecoration: 'none' }}>
                  mynameisgeorgelittle@yahoo.com
                </Link>
                <br />
                (617) 962-1655
              </Typography>
            </>
          )
        }
      ]
    }
  ]
}

export interface AboutTexts {
  resume: Resume
  subtitle: string
  intro: string
}

const EN_US: AboutTexts = {
  resume: RESUME_EN_US,
  subtitle: 'Viola • Violin • Music Teacher',
  intro:
    "I have a Bachelor's degree in Viola Performance from Indiana University's renowned Jacobs School of Music and a Master's degree in Viola Performance from University of Maryland, College Park in the United States. My teaching experience includes music programs across the United States as well as Sweden, El Salvador and Sibiu, Romania. I have studied string instrument pedagogy with Mimi Zweig and Rebecca Henry, the Suzuki Method for violin with Allen Lieb and Linda Stieg, the Dalcroze Method at the Dalcroze School of Boston and the First Steps in Music John Feierabend Method for general music at Gordon College in Massachusetts."
}

const RO_RO: AboutTexts = {
  resume: RESUME_RO_RO,
  subtitle: 'Violă • Vioară • Profesor de Muzică',
  intro:
    'Sunt licențiată în interpretare violă la renumita Jacobs School of Music, Indiana University, și am diplomă de master de la University of Maryland, College Park, Statele Unite. Experiența mea pedagogică include programe de predare a muzicii în numeroase locuri, atât din Statele Unite, cât și Suedia, El Salvador, și recent, Sibiu, România. Am studiat pedagogia instrumentelor de coardă cu Mimi Zweig și Rebecca Henry, metoda Suzuki pentru vioară cu Allen Lieb și Linda Stieg, metoda Dalcroze la Dalcroze School of Boston, și metoda First Steps in Music John Feierabend pentru educație muzicală generală la Gordon College, Massachusetts.'
}

export const ABOUT_TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])
