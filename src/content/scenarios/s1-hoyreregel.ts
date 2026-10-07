import type { ScenarioContent } from '../../engine/types'

/**
 * FAGLIG INNHOLD — Nivå 1: Hvem kjører først?
 * Må kvalitetssikres av godkjent trafikklærer før offentlig lansering.
 */
export const s1Content = {
  id: 's1-hoyreregel',
  title: 'Hvem kjører først?',
  tagline: 'Et kryss uten skilt i et boligfelt.',
  learningObjective: 'Kjenne igjen et uregulert kryss og bruke høyreregelen.',
  steps: {
    priority: {
      prompt: 'Hva gjør du?',
      hint: 'Ingen skilt. Ingen forkjørsvei.',
      options: {
        wait: 'Brems og vent',
        go: 'Fortsett',
        speed: 'Øk farten',
      },
      outcomes: {
        wait: {
          title: 'Riktig. Du viker.',
          body: 'Uten skilt har du vikeplikt for trafikk fra høyre.',
        },
        go: {
          title: 'Bilen kom fra høyre.',
          saw: 'bilen',
          missed: 'høyreregelen',
          body: 'Uten skilt eller lyssignal gjelder høyreregelen. Den andre sjåføren måtte bråbremse for deg.',
        },
        speed: {
          title: 'Farlig. Du presset deg fram.',
          saw: 'bilen',
          missed: 'vikeplikten',
          body: 'Mer fart gir mindre tid til å stoppe. I et kryss uten skilt viker du for trafikk fra høyre.',
        },
      },
    },
  },
  takeaway: 'Ingen skilt? Se til høyre. Den som kommer fra høyre kjører først.',
  rules: [
    {
      text: 'Høyreregelen: Du har vikeplikt for kjøretøy som kommer fra høyre når skilt eller lyssignal ikke bestemmer noe annet.',
      source: 'Statens vegvesen – «Vikeplikt i ulike trafikksituasjoner» (trafikkreglene § 7)',
      verifiedByDev: true,
    },
    {
      text: 'Den som har vikeplikt skal vise tydelig, i god tid, at den vil vike (f.eks. ved å senke farten).',
      source: 'Trafikkreglene § 7 (vikeplikt – generelt)',
      verifiedByDev: false,
    },
  ],
  review: {
    status: 'utkast',
    reviewer: null,
    date: null,
    notes: 'Sjekk at krysset i 3D tydelig fremstår som uregulert (ingen skilt, ingen oppmerking). Vurder om «Øk farten» er et realistisk distraksjonsvalg.',
  },
} satisfies ScenarioContent
