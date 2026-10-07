import type { ScenarioContent } from '../../engine/types'

/**
 * FAGLIG INNHOLD — Nivå 2: Ballen
 * Må kvalitetssikres av godkjent trafikklærer før offentlig lansering.
 */
export const s2Content = {
  id: 's2-ballen',
  title: 'Ballen',
  tagline: 'Boligfelt. Parkerte biler. Ettermiddag.',
  learningObjective: 'Lese faresignaler og reagere på det som KAN skje — ikke bare det du ser nå.',
  steps: {
    react: {
      prompt: 'Brems når du mener det trengs',
      hint: 'Hold øynene på veien.',
      outcomes: {
        cautious: {
          title: 'Forutseende kjøring',
          body: 'Parkerte biler skjuler mye. Lav fart her gir deg tid når noe skjer.',
        },
        perfect: {
          title: 'Perfekt risikoforståelse',
          body: 'En ball i veien betyr ofte et barn rett bak. Du reagerte før barnet kom.',
        },
        late: {
          title: 'Du rakk det. Akkurat.',
          saw: 'barnet',
          missed: 'ballen',
          body: 'Ballen var varselet. Reagerer du på den, får du flere meter å bremse på.',
        },
        fail: {
          title: 'Altfor nære.',
          saw: 'barnet',
          missed: 'ballen',
          body: 'Ballen var faresignalet. Barn følger ballen — uten å se seg for.',
        },
      },
    },
  },
  takeaway: 'Les hva som KAN skje. En ball i veien = et barn på vei.',
  rules: [
    {
      text: 'Kjørende skal tilpasse farten etter forholdene og vise særlig aktsomhet der barn kan ferdes.',
      source: 'Vegtrafikkloven § 3 (grunnregel) og trafikkreglene § 5 (fart)',
      verifiedByDev: false,
    },
    {
      text: 'En ball eller leker i veien er et klassisk faresignal for at barn kan komme etter.',
      source: 'Faglig/pedagogisk poeng — ikke en regel. Bør formuleres av trafikklærer.',
      verifiedByDev: false,
    },
  ],
  review: {
    status: 'utkast',
    reviewer: null,
    date: null,
    notes: 'Vurder tidsvinduene for «tidlig», «perfekt» og «sen» reaksjon. Er det riktig å premiere bremsing før ballen som «forutseende»?',
  },
} satisfies ScenarioContent
