# KJØR — Kan du lese trafikken?

Spillbar prototype av et nytt norsk læringsprodukt for førerkort klasse B.
Brukeren møter interaktive 3D-trafikksituasjoner, observerer, tar en beslutning
og ser konsekvensen — i stedet for å pugge flervalgsspørsmål.

> KJØR er et lærings- og treningsverktøy. Det erstatter **ikke** trafikalt grunnkurs,
> mørkekjøring, førstehjelp eller annen obligatorisk opplæring.

## Kom i gang

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + produksjonsbygg
npm test           # scenario-regresjonstester (alle grener, kollisjonssjekk)
```

Nyttige URL-er i dev:

| URL | Hva |
| --- | --- |
| `/` | Landingsside med levende 3D-hero |
| `/#/kart` | Progresjonskart (Verden 1: Byen) |
| `/#/kjor/s1-hoyreregel` | Hopp rett inn i et nivå (`s1`–`s5`) |
| `/#/faglig` | Faglig gjennomgang: alt innhold for trafikklærer |
| `?hq` | Slår av automatisk kvalitetsnedtrekk (for skjermbilder) |

## Arkitektur

```
src/
  engine/            Spillmotor — ren TypeScript, ingen React
    path.ts          Bane-bygger (turtle: forward/right/left), rundkjøringsruter
    sim.ts           Deterministisk trafikksimulering (fartsprogram, stopAt, IDM-følging, historikk for replay)
    runner.ts        Tilstandsmaskin per scenario: intro → kjøring → steg → utfall → replay → tilbakemelding → resultat
    scoring.ts       Kategorier, karakter A–F, stjerner, XP, nivåer
    types.ts         Datamodellen for scenario + faglig innhold
    headless.ts      Spiller et scenario uten grafikk (tester / tuning)
  scenarios/         Koreografi per nivå (aktører, baner, timing, grener)
    layouts.ts       Felles geometri for miljø og koreografi
  content/
    scenarios/       FAGLIG INNHOLD per nivå — tekster, regler, kilder, review-status
    world.ts         Verdener, merker, kategorinavn
  three/             React Three Fiber: miljøer, modeller, kamera, lys, highlights
  ui/                Skjermer (landing, kart, spill, faglig) og overlays
  audio/sfx.ts       Prosedyrisk WebAudio-lyd (motor, blinklys, horn, sykkelbjelle, feedback)
  state/             Zustand: progresjon (localStorage) og navigasjon
```

### Mekanikker (steg-typer)

| Type | Beskrivelse | Brukt i |
| --- | --- | --- |
| `choice` | Velg handling (tid går sakte / fryser) | Nivå 1, 4, 5 |
| `spot` | Trykk på faren i 3D-scenen | Nivå 3, 5 |
| `reaction` | Brems på riktig tidspunkt — tidlig reaksjon gir bonus | Nivå 2, 5 |

Nye typer (`route`, `lights`, `speed`, `scan`) legges til som nye `Step`-varianter i
`engine/types.ts` + håndtering i `runner.ts` + et overlay i `ui/play/`.

### Nytt scenario

1. Lag `src/content/scenarios/sX-navn.ts` (tekster, regler, review-status).
2. Lag `src/scenarios/sX-navn.ts` (aktører, baner, steg, utfall).
3. Registrer begge i `src/scenarios/index.ts` og legg id-en i `content/world.ts`.
4. Legg til policyer i `src/engine/scenarios.test.ts` — testen verifiserer at ingen
   aktører kolliderer i noen gren, og at alt innhold finnes.

### Faglig kvalitetssikring

Alt spilleren leser ligger i `src/content/scenarios/`. Hvert scenario har
`review.status` (`utkast` → `til-gjennomgang` → `godkjent`), og hvert regelutsagn
har kilde og om utvikler har sjekket det. Siden `/#/faglig` viser alt i én
utskriftsvennlig oversikt for trafikklærer.
