import type { ScenarioContent } from '../../engine/types'

/**
 * FAGLIG INNHOLD — Nivå 5 (BOSS): Rushtrafikk
 * Må kvalitetssikres av godkjent trafikklærer før offentlig lansering.
 */
export const s5Content = {
  id: 's5-rushtrafikk',
  title: 'Rushtrafikk',
  tagline: 'Rundkjøring. Ettermiddagsrush. Alt skjer samtidig.',
  learningObjective: 'Kombinere observasjon, vikeplikt, blinklys og reaksjon i en kompleks situasjon.',
  steps: {
    scan: {
      prompt: 'Finn de to farene',
      hint: 'Før du kjører inn.',
      labels: {
        ped: 'fotgjengeren',
        circ: 'bilen i rundkjøringen',
        walker: 'personen på fortauet',
        cyc2: 'syklisten på sykkelveien',
      },
      outcomes: {
        all: {
          title: 'Begge funnet',
          body: 'Gående på vei ut i gangfeltet — og en bil i rundkjøringen du må vike for.',
        },
        'missed-circ': {
          title: 'Du fant fotgjengeren',
          missed: 'bilen i rundkjøringen',
          body: 'Du har vikeplikt for trafikk som allerede er i rundkjøringen. Hold øye med den.',
        },
        'missed-ped': {
          title: 'Hun var på vei ut.',
          saw: 'bilen',
          missed: 'fotgjengeren',
          body: 'Gangfeltet ligger før rundkjøringen. Mange ser bare til venstre — og glemmer de gående.',
        },
        none: {
          title: 'For mye på en gang.',
          missed: 'fotgjengeren',
          body: 'Skann i faste soner: gangfelt, vikelinje, trafikken i rundkjøringen.',
        },
      },
    },
    blinker: {
      prompt: 'Den blinker høyre. Kjører du?',
      hint: 'Bil fra venstre i rundkjøringen',
      options: {
        trust: 'Kjør – den skal ut',
        wait: 'Vent til du er sikker',
        rush: 'Kjør raskt inn foran',
      },
      outcomes: {
        wait: {
          title: 'Klokt. Den skulle ikke ut.',
          body: 'Et blinklys er bare et signal. Vent til du ser at bilen faktisk svinger ut.',
        },
        trust: {
          title: 'Blinklyset lurte deg.',
          saw: 'blinklyset',
          missed: 'bilen',
          body: 'Du har vikeplikt for trafikk i rundkjøringen. Stol på det bilen gjør, ikke bare på blinklyset.',
        },
        rush: {
          title: 'Du hadde vikeplikt.',
          saw: 'bilen',
          missed: 'vikeplikten',
          body: 'Trafikk som allerede er i rundkjøringen kjører først. Mer fart løser ingenting.',
        },
      },
    },
    signal: {
      prompt: 'Hva gjør du nå?',
      hint: 'Neste avkjøring er din',
      options: {
        right: 'Blink høyre',
        left: 'Blink venstre',
        none: 'Ikke blink',
      },
      outcomes: {
        right: {
          title: 'Tydelig signal',
          body: 'Bilen som ventet skjønte at du skulle ut — og kunne kjøre inn.',
        },
        left: {
          title: 'Feil signal.',
          saw: 'avkjøringen',
          missed: 'retningen',
          body: 'Blink høyre når du er på høyde med siste avkjøring før du skal ut.',
        },
        none: {
          title: 'Ingen visste hva du skulle.',
          missed: 'bilen som ventet',
          body: 'Bilen som ventet måtte stå. Blink høyre før du kjører ut av rundkjøringen.',
        },
      },
    },
    exit: {
      prompt: 'Brems når du mener det trengs',
      outcomes: {
        perfect: {
          title: 'Lynrask lesing',
          body: 'Buss på holdeplass + gangfelt = folk som krysser bak bussen.',
        },
        late: {
          title: 'Du rakk det.',
          saw: 'joggeren',
          missed: 'bussen',
          body: 'En buss på holdeplass skjuler folk som skal krysse. Senk farten før du ser dem.',
        },
        fail: {
          title: 'Nesten.',
          saw: 'gangfeltet',
          missed: 'joggeren bak bussen',
          body: 'Du har vikeplikt for gående i gangfeltet. Bussen var faresignalet.',
        },
      },
    },
  },
  takeaway: 'Gangfelt, vikelinje, trafikken i ringen, blinklys ut. Én ting av gangen — men raskt.',
  rules: [
    {
      text: 'Når du kjører inn i rundkjøringen har du vikeplikt for trafikanter som er i rundkjøringen. Sett ned farten i god tid og stans eventuelt før vikelinja.',
      source: 'Statens vegvesen – «Vikeplikt i ulike trafikksituasjoner» / «Kjøring i rundkjøringer»',
      verifiedByDev: true,
    },
    {
      text: 'Begynn å blinke til høyre når du er på høyde med siste utkjøring før du kjører ut.',
      source: 'Statens vegvesen – «Kjøring i rundkjøringer»',
      verifiedByDev: true,
    },
    {
      text: 'Du har vikeplikt for gående som er i gangfeltet eller på vei ut i det.',
      source: 'Statens vegvesen – «Vikeplikt i ulike trafikksituasjoner» (trafikkreglene § 9)',
      verifiedByDev: true,
    },
    {
      text: 'Et blinklys alene er ikke et bevis på at kjøretøyet svinger.',
      source: 'Pedagogisk poeng — formulering bør godkjennes av trafikklærer.',
      verifiedByDev: false,
    },
  ],
  review: {
    status: 'utkast',
    reviewer: null,
    date: null,
    notes: 'Kontroller rundkjøringens geometri (vikelinje, trekantmarkering, gangfelt-avstand). Vurder om gangfeltet ved utkjøringen bør ligge nærmere rundkjøringen.',
  },
} satisfies ScenarioContent
