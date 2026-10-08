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
scripts/assets/build_ktx2.sh   # bygg KTX2-teksturer på nytt fra public/assets/tex
```

Nyttige URL-er i dev:

| URL | Hva |
| --- | --- |
| `/` | Landingsside med levende 3D-hero |
| `/#/kart` | Progresjonskart (Verden 1: Byen) |
| `/#/kjor/s1-hoyreregel` | Hopp rett inn i et nivå (`s1`–`s5`) |
| `/#/faglig` | Faglig gjennomgang: scenarioer, teorispørsmål, regelkort, vurderingskriterier (+ JSON-eksport) |
| `/#/teori` | Teoritrening (demonstrator, med/uten tid, feilgjennomgang, «Tren dette») |
| `/#/ovelse` | Øvelseskjøring: kjør selv i S1-krysset, KJØREVURDERING etterpå |
| `/#/provekjoring` | Simulert prøvekjøring (exam-modus: bare veibeskrivelse, ingen hint) |
| `/#/lab?view=car\|rear\|side\|house\|trees\|people\|rider\|fleet` | (kun dev) Asset lab for look-dev |
| `?quality=high\|medium\|low`, `?hq` | Tving kvalitetsnivå (slår av automatisk nedtrekk) |
| `?ktx2=0` | Bruk JPG-teksturer i stedet for KTX2 (A/B-måling) |

Dokumentasjon: [docs/VISUAL_PIPELINE.md](docs/VISUAL_PIPELINE.md) · [docs/LEARNING_SYSTEMS.md](docs/LEARNING_SYSTEMS.md) ·
[docs/ASSET_AUDIT.md](docs/ASSET_AUDIT.md) · [docs/THREEJS_VS_UNREAL.md](docs/THREEJS_VS_UNREAL.md) ·
[docs/SIGNAGE_AUDIT.md](docs/SIGNAGE_AUDIT.md) · skjermbilder i [docs/screenshots](docs/screenshots/).

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
  learning/          Teorimotor (spørsmålsbank, skjema, review-status), mestring (teori vs i trafikken), dagsplan
  practice/          Øvelseskjøring: kinematisk bil, instruktørrute, evaluator → KJØREVURDERING
  three/             React Three Fiber: miljøer, modeller, kamera, lys, highlights
    render/          Visuell pipeline: kvalitetsnivåer, PBR-materialer, HDRI-lys, post FX, trær, gatekit, bil
    env/             Premium-miljøer: S1 ResidentialKryss, S2 ResidentialStraight, S3 CityStreet, S4 CrossingStreet, S5 Roundabout
    render/characters.tsx  Prosedyriske skinned mennesker (voksen/barn/jogger) og syklist med bein-IK
    render/citykit.tsx     Bygårder, butikkfasader, oppmerking, gatemøbler
  ui/                Skjermer (landing, kart, spill, faglig) og overlays
  audio/sfx.ts       Prosedyrisk WebAudio-lyd (motor med gir/last, dekkstøy, ambience, UI, replay)
  audio/voice.ts     Instruktørstemme: innspilt fil → norsk TTS → kun tekst
  state/             Zustand: progresjon, læring/mestring (localStorage) og navigasjon
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
