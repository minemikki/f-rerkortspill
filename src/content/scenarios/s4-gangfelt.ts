import type { ScenarioContent } from '../../engine/types'

/**
 * FAGLIG INNHOLD — Nivå 4: Fotgjengeren
 * Må kvalitetssikres av godkjent trafikklærer før offentlig lansering.
 */
export const s4Content = {
  id: 's4-gangfelt',
  title: 'Fotgjengeren',
  tagline: 'Gangfelt foran. Bil tett bak deg.',
  learningObjective: 'Tolke tegn på at en gående skal krysse, og tilpasse farten i god tid.',
  steps: {
    approach: {
      prompt: 'Hva gjør du?',
      hint: 'Se på personen ved gangfeltet.',
      options: {
        hold: 'Hold farten',
        slow: 'Senk farten i god tid',
        brake: 'Bråbrems nå',
      },
      outcomes: {
        slow: {
          title: 'Rolig og riktig',
          body: 'Hun så på trafikken og snudde seg mot gangfeltet. Du ga henne tid — og bilen bak rakk å tilpasse seg.',
        },
        hold: {
          title: 'Hun var på vei ut.',
          saw: 'personen',
          missed: 'tegnene',
          body: 'Du har vikeplikt for gående som er i gangfeltet eller på vei ut i det. Blikk mot trafikken og et steg mot kanten er tydelige tegn.',
        },
        brake: {
          title: 'Riktig tanke. Feil timing.',
          saw: 'fotgjengeren',
          missed: 'bilen bak deg',
          body: 'Du stoppet — men så brått at bilen bak måtte bråbremse. Senk farten tidlig og jevnt.',
        },
      },
    },
  },
  takeaway: 'På vei ut = vikeplikt. Senk farten tidlig, ikke brått.',
  rules: [
    {
      text: 'Som kjørende har du vikeplikt for gående som befinner seg i et gangfelt eller er på vei ut i det, når trafikken ikke reguleres av politi eller lyssignal.',
      source: 'Statens vegvesen – «Vikeplikt i ulike trafikksituasjoner» (trafikkreglene § 9)',
      verifiedByDev: true,
    },
    {
      text: 'Kjørende som nærmer seg et gangfelt skal holde en fart som gjør det mulig å stoppe for gående.',
      source: 'Trafikkreglene § 9 nr. 2',
      verifiedByDev: false,
    },
  ],
  review: {
    status: 'utkast',
    reviewer: null,
    date: null,
    notes: 'Vurder om «Bråbrems nå» skal gi delvis uttelling. Vurder om tegnene på kryssing (blikk, kroppsretning, steg mot kanten) er tydelige nok i 3D.',
  },
} satisfies ScenarioContent
