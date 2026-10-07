import type { ScenarioContent } from '../../engine/types'

/**
 * FAGLIG INNHOLD — Nivå 3: Se syklisten
 * Må kvalitetssikres av godkjent trafikklærer før offentlig lansering.
 */
export const s3Content = {
  id: 's3-syklisten',
  title: 'Se syklisten',
  tagline: 'Bygate med sykkelfelt. Du skal svinge til høyre.',
  learningObjective: 'Oppdage syklister i sykkelfeltet før en høyresving, og vike for dem.',
  steps: {
    spot: {
      prompt: 'Hva må du følge ekstra med på?',
      hint: 'Trykk på det i bildet.',
      labels: {
        cyclist: 'syklisten',
        'ped-far': 'fotgjengeren',
        bus: 'bussen',
        'ped-bus': 'personen ved holdeplassen',
      },
      outcomes: {
        all: {
          title: 'Skarpt observert',
          body: 'Du skal svinge. Syklisten skal rett fram. Da har du vikeplikt.',
        },
        none: {
          title: 'Syklisten måtte bråstoppe.',
          missed: 'syklisten',
          body: 'Når du svinger, har du vikeplikt for syklende som skal rett fram. Sjekk speil og blindsone før svingen.',
        },
      },
    },
  },
  takeaway: 'Før du svinger til høyre: speil, blindsone, sykkelfelt.',
  rules: [
    {
      text: 'Hvis du som kjørende skal svinge, har du vikeplikt for gående, syklende og små elektriske kjøretøy som skal rett fram på kjørebanen eller veiskulderen.',
      source: 'Statens vegvesen – «Vikeplikt i ulike trafikksituasjoner»',
      verifiedByDev: true,
    },
    {
      text: 'Sjekk speil og blindsone før sving til høyre.',
      source: 'Pedagogisk anbefaling fra føreropplæringen — formulering bør godkjennes av trafikklærer.',
      verifiedByDev: false,
    },
  ],
  review: {
    status: 'utkast',
    reviewer: null,
    date: null,
    notes: 'Vurder om sykkelfeltets utforming (rød asfalt, heltrukken linje) er representativ. Vurder om bussen bør være distraksjon eller relevant objekt.',
  },
} satisfies ScenarioContent
