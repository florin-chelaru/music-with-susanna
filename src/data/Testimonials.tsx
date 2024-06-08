import React from 'react'
import { SupportedLocale } from '../util/SupportedLocale'
import Typography from '@mui/material/Typography'

export interface Testimonial {
  title: string
  subtitle?: string
  content?: string | React.ReactNode
  image?: string | string[]
  rating?: number
  ratingUrl?: string
  /** Only used if content is a node */
  expandable?: boolean
  featured?: boolean
}

type LocalizedTestimonial = {
  [locale in SupportedLocale]: Testimonial
}

export const TESTIMONIALS: LocalizedTestimonial[] = [
  {
    [SupportedLocale.EN_US]: {
      title: 'Cătălina Gubernat',
      subtitle: 'Mother of Natalia, age five',
      content: (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          My daughter, Natalia, is delighted to participate in the lessons taught by Ms. Susanna!
          Everything flowed naturally, without pressure or stress, but with the ease that opens the
          child&apos;s mind and curiosity. The musical instrument, correct posture, language, and
          notes were presented step by step, through songs, so that my child absorbed the concepts
          effortlessly and harmoniously. In each session, a new notion was introduced, dressed in
          another game, which increasingly sparked Natalia&apos;s desire for knowledge. Although we
          travel approximately 80 km (50 mi) to attend the classes, the effort is definitely worth
          it! I highly recommend these lessons!
        </Typography>
      ),
      rating: 5,
      image: '/static/img/natalia-large.jpeg',
      featured: true,
      expandable: true
    },
    [SupportedLocale.RO_RO]: {
      title: 'Cătălina Gubernat',
      subtitle: 'Mama Nataliei, de cinci ani',
      content: (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          Fetița mea, Natalia, este încântată să participe la lecțiile susținute de doamna Susanna!
          Totul a curs firesc, fără presiune sau stres, ci cu naturalețea care deschide mintea și
          curiozitatea copilului. Instrumentul muzical, poziția corectă, limbajul, notele au fost
          prezentate rând pe rând, prin cântec, asfel încât copilul și-a însușit noțiuni pe
          nesimțite și în armonie. În fiecare ședință a fost introdusă o noțiune noua, îmbrăcată
          într-un alt joc, fapt ce a stârnit din ce în ce mai mult dorința de cunoaștere a Nataliei.
          Deși parcurgem aproximativ 80 km pentru a participa la cursuri, efortul merită din plin!
          Recomand aceste lecții!
        </Typography>
      ),
      rating: 5,
      image: '/static/img/natalia-large.jpeg',
      featured: true,
      expandable: true
    }
  },
  {
    [SupportedLocale.EN_US]: {
      title: 'Andreea Teleche',
      subtitle: 'Mother of Tudor, age seven',
      content: (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {'In short: Susanna did an extraordinary job with these violin lessons! I greatly appreciate the way in which I was able to observe, gradually, how information was passed to Tudor. Everything seems like a game, all is fun and joyful, such that the child is captivated by what he is learning; at the same time, as an adult, you realize he is acquiring notions of great depth and complexity, which in his game he ends up mastering, leaving you as a parent in awe!\n' +
            '\n' +
            'Before the lessons with Susanna, I always thought to learn music you require a "musical ear" or some extraordinary talent, and interminable hours of study. But she showed me that play is one of the best ways of learning and that the joy of music is for '}
          <b>anybody</b>
          {' who has the curiosity of discovering a musical instrument!'}
        </Typography>
      ),
      rating: 5,
      image: '/static/img/tudor-large.jpeg',
      featured: false,
      expandable: true
    },
    [SupportedLocale.RO_RO]: {
      title: 'Andreea Teleche',
      subtitle: 'Mama lui Tudor, de șapte ani',
      content: (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {'Susanna a făcut o treabă extraordinară cu aceste cursuri de vioară! Apreciez foarte mult modul ' +
            'în care am văzut, gradual, cum informațiile i-au fost predate lui Tudor. Totul pare o joacă, totul e ' +
            'distractiv și vesel, astfel încât copilul să fie captivat de ceea ce învață. Totodată constați ca adult ' +
            'că sunt noțiuni cu mare profunzime și că în joaca lui ajunge să le stăpânească, uimindu-te!\n' +
            '\n' +
            'Muzica deschide un univers fantastic și mă bucur mult că am avut ocazia, prin munca Susannei, sa îi arat ' +
            'copilului meu această deschidere. Înainte de a începe cursurile cu Susanna, mă gândeam că ar fi necesară ' +
            'ureche muzicală", un anumit talent, ore interminabile de studiu, dar ea mi-a arătat că jocul e unul ' +
            'dintre cele mai frumoase moduri de a învăța și că bucuria muzicii este pentru '}
          <b>oricine</b>
          {' are curiozitatea de a descoperi un instrument muzical!'}
        </Typography>
      ),
      rating: 5,
      image: '/static/img/tudor-large.jpeg',
      featured: false,
      expandable: true
    }
  },

  {
    [SupportedLocale.EN_US]: {
      title: 'Viola Student, Iași, Romania',
      subtitle: 'age thirteen',
      content: (
        <>
          <Typography variant="body2" color="text.secondary" paragraph>
            I believe that Mrs. Susanna is an excellent viola instructor. She teaches very well and
            helps me understand things that I normally wouldn&apos;t. She has helped me convey
            emotions when I play a song, not just play it for the sake of playing. She has helped me
            maintain exemplary posture to present myself well at exams, competitions, etc. She has
            helped me create a pleasing sound to enchant anyone when I play. In conclusion, I love
            my teacher and hope to study with her until college or even beyond.
          </Typography>
        </>
      ),
      rating: 5,
      expandable: true
    },
    [SupportedLocale.RO_RO]: {
      title: 'Elev de violă, Iași',
      subtitle: 'treisprezece ani',
      content: (
        <>
          <Typography variant="body2" color="text.secondary" paragraph>
            Eu cred că doamna Susanna este o profesoară excelentă. Predă foarte bine și mă ajută să
            înțeleg unele lucruri pe care în mod normal nu le-aș înțelege. M-a ajutat să transmit
            emoții atunci când cânt o melodie, nu doar să o cânt pentru a fi cântată, m-a ajutat să
            am o postură exeplară pentru a mă prezenta bine la examene, concursuri etc.,m-a ajutat
            să creez un sunet favorabil pentru a putea încânta pe orice atunci când cant. În
            concluzie o iubesc pe doamna profesoară și sper să studiez cu ea până la facultate sau
            chiar după.
          </Typography>
        </>
      ),
      rating: 5,
      expandable: true
    }
  },

  {
    [SupportedLocale.EN_US]: {
      title: 'Ariel Roth',
      subtitle: 'Parent of Savi, age nine',
      content: (
        <>
          <Typography variant="body2" color="text.secondary" paragraph>
            Ms. Susanna, as she was known in our house, was our son&apos;s first violin teacher -
            and she was outstanding. Savi, who has some learning issues, needed a patient teacher,
            one who could tailor her teaching to his attentional needs and to what he would find
            interesting. Susanna was firm when she needed to be, but engaged with him on the
            subjects that he was interested in, like Star Wars and Harry Potter, even making up a
            &quot;Darth Vader&quot; song for him to play on the violin as a way of motivating him.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            As a parent, we loved Susanna because she kept us informed of what was happening in the
            lessons and took time at the end of each lesson to show us what she taught him and what
            he needed to practice and how so that we could help him develop his skills.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The payoff to working with Susanna was huge. In his school recital at the end of the
            year, Savi was the best string player in the bunch and his joy in playing the violin is
            clear. He just got back from a month at sleep away camp and the first thing he did when
            he got home was reach for his violin and play Song with the Wind.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            I would recommend Susanna without hesitation! If Savi&apos;s future teacher&apos;s are
            half as good, I&apos;ll consider myself truly fortunate.
          </Typography>
        </>
      ),
      rating: 5,
      expandable: true
    },
    [SupportedLocale.RO_RO]: {
      title: 'Ariel Roth',
      subtitle: 'Tatăl lui Savi, elev de nouă ani',
      content: (
        <>
          <Typography variant="body2" color="text.secondary" paragraph>
            Doamna Susanna, cum era cunoscută în casa noastră, a fost prima profesoară de vioară a
            fiului nostru — una cu adevărat remarcabilă! Savi, care are dificultăți de învățare,
            avea nevoie de un instructor cu răbdare, care să își adapteze metoda de predare la
            nivelul lui de atenție și la lucrurile pe care el le găsește interesante. Susanna a fost
            fermă la nevoie, dar s-a angajat în același timp în subiectele de interes pentru Savi,
            cum ar fi Războiul Stelelor și Harry Potter, ajungând până la a compune un întreg
            cântecel pe nume <i>Darth Vader</i> pentru el, pe care să îl cânte împreună la vioară și
            care să îl motiveze.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            În calitate de părinte, am iubit-o pe Susanna pentru că ne-a ținut la curent cu ce se
            petrecea în timpul lecțiilor și și-a alocat timp la sfârșitul fiecărei lecții să ne
            arate ce a predat, ce trebuie exersat, și cum îl putem ajuta pe Savi să își dezvolte
            abilitățile.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Rezultatele lecțiilor cu Susanna au fost impresionante. La recitalul susținut la școală
            în cadrul serbării de sfârșit de an, Savi a fost recunoscut ca cel mai bun violonist
            dintre toți copiii care făceau lecții de muzică, iar bucuria care i-a izvorât din
            cântatul la vioară a fost de necontestat. Recent, s-a întors dintr-o tabără școlară și
            primul lucru pe care l-a făcut când a ajuns acasă a fost să fugă la vioară și să cânte{' '}
            <i>Cântecul Vântului</i>.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Aș recomanda-o pe Susanna fără nicio ezitare! Dacă viitorii profesori ai lui Savi vor fi
            măcar pe jumătate atât de buni, mă voi considera cu adevărat norocos.
          </Typography>
        </>
      ),
      rating: 5,
      expandable: true
    }
  },
  {
    [SupportedLocale.EN_US]: {
      title: 'Evelyn',
      subtitle: 'Student, age five',
      content:
        'Thank you card: "Susannah, I love practicing. Thank you for teaching me violin. Love"',
      image: ['/static/img/evelyn-small.webp', '/static/img/evelyn-letter-square-bw-large.jpeg']
    },
    [SupportedLocale.RO_RO]: {
      title: 'Evelyn',
      subtitle: 'Elevă de cinci ani',
      content:
        'Scrisoare de mulțumire: "Susannah, I love practicing. Thank you for teaching me violin. Love"',
      image: ['/static/img/evelyn-small.webp', '/static/img/evelyn-letter-square-bw-large.jpeg']
    }
  },
  {
    [SupportedLocale.EN_US]: {
      title: 'Hari',
      subtitle: 'Father of Anjana, high school student',
      content:
        'Susanna has been teaching my daughter viola for 2 years. She is a fantastic teacher and my daughter is thriving under her tutelage. She knows exactly the pace at which to teach and what pieces to use, and her teaching of technique is very good. The most important endorsement I can make is that my daughter is so eager to go to her weekly lessons!',
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    },
    [SupportedLocale.RO_RO]: {
      title: 'Hari',
      subtitle: 'Tatăl lui Anjana, elevă de liceu',
      content:
        'Susanna i-a predat lecții de violă fiicei noastre timp de doi ani. Este o profesoară fantastică, iar fiica noastră a înflorit sub îndrumarea ei. Susanna știe exact în ce ritm să predea și ce piese să folosească, iar tehnica ei pedagogică este excelentă. Cea mai importantă apreciere/recomandare vine chiar din entuziasmul fiicei mele de a merge la lecțiile săptămânale de muzică!',
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    }
  },
  {
    [SupportedLocale.EN_US]: {
      title: 'Rawi',
      subtitle: 'Adult viola student',
      content:
        'Susanna is a very thoughtful and innovative instructor. I have learned a lot from her and am now able to play the viola piece within months after so many years of struggling with other instructors. The sadness that struck me as the months I have spent learning from her drew to a close derives from the fact that she has been one of my best instructors ever! It is sad to see her move to Boston but my loss is your gain. Highly recommended.',
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    },
    [SupportedLocale.RO_RO]: {
      title: 'Rawi',
      subtitle: 'Adult, student de violă',
      content:
        'Susanna este un instructor foarte grijuliu și inovator. Am învățat enorm de la ea, și numai după câteva luni, ' +
        'sunt în stare să cânt la violă. Asta în contextul în care am petrecut mulți ani "luptându-mă" cu alți ' +
        'profesori. Amărăciunea pe care am resimțit-o realizând că lecțiile de muzică vor lua sfârșit, izvorăște din ' +
        'faptul că a fost unul dintre cei mai buni profesori pe care i-am avut vreodată! Sunt trist să o văd plecând la ' +
        'Boston, dar pierderea mea este câștigul vostru. O recomand cu căldură!',
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    }
  },
  {
    [SupportedLocale.EN_US]: {
      title: 'Gracie',
      subtitle: 'Student, age nine',
      content:
        'Thank you card: "To: Susanna. Thank you for being an awesome viola teacher. I\'ve learned so much. Good luck in the future. Love, Gracie"',
      image: '/static/img/gracie-letter-bw-small.webp'
    },
    [SupportedLocale.RO_RO]: {
      title: 'Gracie',
      subtitle: 'Elevă de nouă ani',
      content:
        'Scrisoare de mulțumire: "Către: Susanna. Mulțumesc că ai fost o profesoară minunată de violă. Am învățat atât de mult. Mult noroc. Cu drag, Gracie"',
      image: '/static/img/gracie-letter-bw-small.webp'
    }
  },
  {
    [SupportedLocale.EN_US]: {
      title: 'Mariana',
      subtitle: 'Mother of Ema, high school student',
      content:
        'Susanna was a private teacher for my middle school/high school student and gave her private viola lessons. My daughter has played at an amateur level since the fourth grade and Susanna taught her for two years. She did a great job. She was punctual and was dedicated, often staying more than the allotted time. She was also very patient and pro-active looking for new music. She helped my daughter through many concerts and festivals. It was a great experience and we were sorry to see her leave but hope she can help other students in the Boston area.',
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    },
    [SupportedLocale.RO_RO]: {
      title: 'Mariana',
      subtitle: 'Mama lui Ema, elevă de liceu',
      content:
        'Susanna a fost profesoara de violă a fiicei mele adolescente. Fiica mea cântase la nivel începător din clasa ' +
        'a patra, iar Susanna a îndrumat-o mai departe timp de doi ani. A făcut o treabă excepțională. A fost ' +
        'întotdeauna punctuală și dedicată, petrecând adesea chiar mai mult timp decât intervalul orar alocat. ' +
        'Susanna a dat dovadă atât de răbdare, cât și de inițiativă, căutând în permanență muzică nouă care ' +
        'să îi extindă repertoriul. Pe lângă acestea, a ajutat-o și îndrumat-o pe fiica mea pe parcursul a multe ' +
        'concerte și festivaluri. A fost o experiență minunată și ne pare rău să o vedem părăsindu-ne, dar sperăm că ' +
        'va servi drept mentor altor elevi din Boston.',
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    }
  },
  {
    [SupportedLocale.EN_US]: {
      title: 'Joanna',
      subtitle: 'Mother of Myra, five year old girl',
      content:
        "Susanna is an amazingly patient instructor with my wiggly five year old. Children have short attention spans, but Susanna is able to refocus my daughter's attention to keep her engaged in the lesson. So happy to have been able to give my daughter a positive introduction to music.",
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    },
    [SupportedLocale.RO_RO]: {
      title: 'Joanna',
      subtitle: 'Mama lui Myra, de cinci ani',
      content:
        'Susanna a fost o profesoară extrem de răbdătoare cu fetița noastră neastâmpărată de cinci ani. Copiii au o limită ' +
        'redusă de atenție, dar Susanna a fost în stare să îi concentreze atenția fetiței noastre și să o mențină ' +
        'angajată în timpul lecției. Sunt tare bucuroasă că am putut să îi ofer fiicei mele o intrare plăcută în ' +
        'lumea muzicii.',
      rating: 5,
      ratingUrl: 'https://takelessons.com/profile/susanna-j#reviews'
    }
  }
]
