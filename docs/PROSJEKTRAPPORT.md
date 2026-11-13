# KJØR – prosjektrapport

*Status per 13. november 2026. Nettversjonen (React/Three.js) i repoet `minemikki/f-rerkortspill`.*

---

## 1. Kort oppsummert

KJØR er et nettbasert læringsspill for førerkort klasse B. I stedet for å pugge flervalgsspørsmål kjører
spilleren gjennom realistiske norske trafikksituasjoner i 3D, tar et valg, ser konsekvensen, får en
replay som forklarer hva som skjedde, og lærer regelen bak.

| | |
|---|---|
| **Spill det** | https://f-rerkortspill.vercel.app/ (oppdateres automatisk ved hver endring) |
| **Plattform** | Nettleser, fra en lenke. Mobil og PC, ingen nedlasting. |
| **Innhold** | 5 nivåer (S1–S5), 21 teorispørsmål, øvelseskjøring, simulert prøvekjøring, teoritrening |
| **Kode** | ≈ 19 200 linjer TypeScript, 32 commits, 61 automatiske tester (alle grønne) |
| **Faglig status** | Alt fagstoff er **utkast** og ikke godkjent av trafikklærer |

Spillet erstatter **ikke** obligatorisk opplæring, kjøretimer, mørkekjøring, førstehjelp eller den
offisielle teori- eller førerprøven, og påstår det heller ikke noe sted.

---

## 2. Produktidéen

**«Ikke bare lær svaret. Lær å se situasjonen.»**

Hvert nivå følger samme læringssløyfe:

```
KJØR → SE → VELG → KONSEKVENS → REPLAY (hva du så / hva du overså) → REGELEN → PRØV IGJEN → HUSK
```

To ting skiller KJØR fra vanlige teoriapper:

1. **Du øver i situasjonen, ikke på teksten.** Høyreregelen læres ved å stå i et kryss uten skilt mens
   en bil kommer fra høyre bak en hekk.
2. **Spillet skiller mellom det du *vet* og det du *gjør*.** Mestring måles i to spor: *Teori* (svar på
   spørsmål) og *I trafikken* (hva du faktisk gjorde i 3D). Mange kan regelen, men handler feil.

---

## 3. Hva som finnes i spillet nå

### 3.1 De fem nivåene (Verden 1: Byen)

| Nivå | Tittel | Hva det lærer | Mekanikk |
|---|---|---|---|
| S1 | Hvem kjører først? | Høyreregelen i et uregulert kryss i boligfelt, med en hekk som skjuler trafikk | Velg handling |
| S2 | Ballen | Forutse barn: ballen er varselet, barnet kommer etter, bak en parkert varebil | Brems i tide |
| S3 | Se syklisten | Høyresving over sykkelfelt i bygate, syklist bakfra | Trykk på faren |
| S4 | Fotgjengeren | Gangfelt med fotgjenger som nøler, bil bak deg | Velg handling |
| S5 | Rushtrafikk (boss) | Rundkjøring med flere farer: fotgjenger, buss, blinklys som lyver, utkjøring | Flere steg på rad |

Hvert nivå har flere utfall (riktig, nesten, feil) med egne tilbakemeldinger, stjerner, XP og en replay
som fryser øyeblikket, viser det fra førerens øyne og så ovenfra med en tolinjers forklaring, for
eksempel *«Ballen var varselet. / Barnet kom etter.»*

### 3.2 Læringsdelen

- **Lær regelen:** ett regelkort per nivå med tegning og kilde (trafikkreglene / skiltforskriften).
- **Læringssløyfe etter hvert nivå:** regelen, 3 korte spørsmål og én variant av situasjonen. Mestring
  oppdateres etterpå. 3D-gata fortsetter å gå i bakgrunnen, så det føles ikke som å forlate spillet.
- **Teoritrening** (`/#/teori`): 10 eller 21 spørsmål, med eller uten tid, resultat per tema (for
  eksempel «Vikeplikt 67 %») og knappen **«Tren dette»**, som åpner riktig 3D-nivå.
- **21 teorispørsmål** i 6 temaer: myke trafikanter (6), vikeplikt (5), skilt (3), kryss og
  rundkjøring (3), fart og avstand (2), risiko (2). Situasjonstegningene viser aldri svaret før du har
  svart (sikret med test).
- **Dagsplan** på kartet: anbefaler neste nivå eller teori ut fra hva du er svakest på.
- **Øvelseskjøring** (`/#/ovelse`): kjør selv i S1-krysset med ratt, gass, brems, blinklys og «se
  venstre/høyre». Instruktørstemme gir veibeskrivelse.
- **Simulert prøvekjøring** (`/#/provekjoring`): samme kjøring uten hint. Etterpå får du en
  **kjørevurdering** i fire områder (observasjon, fartstilpasning, plassering, trafikkregler). Hver feil
  forklares med **hva som skjedde, hvorfor det betyr noe og hva du bør øve på**. Rekkefølgen på blikkene
  dine vises også.
- **Faglig gjennomgang** (`/#/faglig`): utskriftsvennlig side for trafikklærer med alt fagstoff, alle
  svar, kilder og status, og eksport til JSON. Bare her vises «utkast»-merkingen.

### 3.3 Skjermer og flyt

Landingsside med levende 3D-gate, progresjonskart (bilen din kjører til neste nivå), spill,
resultatskjerm, teori, øvelse og faglig gjennomgang. Mørk stil med gult og mintgrønt, store knapper,
fungerer med tastatur, og respekterer «redusert bevegelse».

---

## 4. Hvordan prosjektet er lagt opp

### 4.1 Teknologi

| Del | Valg | Hvorfor |
|---|---|---|
| Språk | TypeScript | Feil fanges før spillet kjører |
| UI | React 19 + Tailwind 4 + Motion | Raskt å bygge skjermer, gode animasjoner |
| 3D | Three.js 0.186 via React Three Fiber, postprocessing (N8AO, bloom, SMAA, AgX) | Kjører i nettleseren på mobil, uten installasjon |
| Tilstand | Zustand (lagres i nettleseren) | Enkel lagring av progresjon og mestring |
| Bygg / test | Vite 8 + Vitest | Rask utvikling og automatiske tester |
| Hosting | Vercel, bygges automatisk fra branchen | Alltid oppdatert lenke |

### 4.2 Mappestruktur

```
src/
  engine/      SPILLMOTOREN – ren TypeScript, ingen grafikk
               sim.ts (trafikksimulering), runner.ts (nivåets tilstandsmaskin),
               scoring.ts (stjerner, XP, karakter), headless.ts (spiller nivåer uten grafikk)
  scenarios/   KOREOGRAFI per nivå: aktører, baner, timing, steg og utfall (s1–s5)
               layouts.ts = felles geometri som både 3D-gata og koreografien bruker
  content/     ALT SPILLEREN LESER: tekster, regler, kilder og faglig status per nivå
  learning/    teorimotor: spørsmålsbank, regelkort, mestring, dagsplan, skiltregister
  practice/    øvelseskjøring: bilfysikk, instruktørrute, evaluator → kjørevurdering
  three/       3D: kamera-regissør, modeller, miljøer, lys, post-effekter
    env/         de fem gatene (boliggate-kryss, boliggate rett, bygate, gangfelt, rundkjøring)
    render/      grafikk-pipeline: materialer, kvalitetsnivåer, trær, gatekit, bykit,
                 figurer (prosedyriske + AI-genererte), biler
  ui/          skjermer (landing, kart, spill, teori, øvelse, faglig) og overlegg
  audio/       lyd (motor, dekk, omgivelser, UI) og instruktørstemme
  state/       lagret progresjon, mestring og navigasjon
public/assets/ teksturer (JPG + komprimert KTX2), himmel (HDRI), 3D-figurer (GLB)
scripts/       verktøy: bygg KTX2-teksturer, behandle GLB-figurer, ta skjermbilder
docs/          dokumentasjon (se kapittel 9)
```

### 4.3 Det viktigste designvalget: motoren er skilt fra grafikken

```
scenarios/sX.ts  ──►  engine/runner + sim  ──►  three/ (tegner)   ──►  skjermen
 (data: hva skjer)     (regner: hvor er alt)     (viser det i 3D)
content/sX.ts    ──►  ui/ (tekster, valg, tilbakemelding)
                       │
                       └──►  tester spiller hvert nivå uten grafikk
```

- **Deterministisk:** samme valg gir alltid samme utfall, ned til tidelen av et sekund. Derfor kan
  replay, tester og faglig gjennomgang vise nøyaktig det spilleren opplevde.
- **Nivåer er data, ikke kode:** et nytt nivå er to filer (koreografi + tekst). Motoren, replay, poeng og
  læringssløyfe gjenbrukes.
- **Fagstoff er samlet ett sted** (`content/` og `learning/`), så en trafikklærer kan gå gjennom alt
  uten å lete i koden.
- **Grafikken kan byttes ut** uten at læringen endres. Det gjør overgang til bedre modeller trygt.

### 4.4 Grafikk-pipelinen

- **Lys:** ekte himmelbilde (HDRI fra Poly Haven, CC0), sol med skygger, AgX-fargetone.
- **Materialer:** 12 overflatetyper med fototeksturer (asfalt, fortau, granitt, gress, kledning, puss,
  murstein, takstein …), delt på tvers av alle gater.
- **Teksturkomprimering (KTX2):** grafikkminnet for teksturer gikk fra 64 MB til 16 MB uten synlig
  forskjell.
- **Tre kvalitetsnivåer** (høy / middels / lav), med automatisk nedtrekk hvis mobilen sliter. Nedtrekket
  er sikret så det ikke skjer midt i en kjøring på grunn av ett enkelt hikk.
- **Gatekit og bykit:** norske trehus med veranda, trapper, gardiner og husnummer; bygårder i puss og
  murstein med butikkfasader; hager, hekker, steinmurer, postkassestativ, busskur, sykkelstativ,
  slitt veioppmerking.
- **Figurer:** to AI-genererte voksne (Higgsfield) med ansikt, hår og klær, som står og går. Barn,
  jogger og syklist er fortsatt kodede figurer. Syklistens bein følger pedalene.
- **Kjøretøy:** kodede modeller av kombi, varebil og 12 m bybuss, med bremselys, blinklys og norske
  skilt. Ingen bilmerker.
- **Skilt og oppmerking:** sjekket mot skiltforskriften på Lovdata (202, 362, 512, 516, oppmerking
  1002/1004/1008/1012/1022/1024/1039). En feil i fagstoffet ble rettet (skilt 208 → 206 Forkjørsveg).

### 4.5 Ytelse (målt i S1, inkludert skygger)

| Nivå | Tegnekall | Trekanter | Skygger | Effekter |
|---|---|---|---|---|
| Høy | 271 | 428 k | 2048² | AO, bloom, AgX, kantutjevning |
| Middels | 255 | 384 k | 1024² | AgX, kantutjevning |
| Lav | 146 | 202 k | av | av |

FPS på ekte telefoner er **ikke målt ennå**. Åpne spillet med `?fps` for å se det på din egen telefon.

### 4.6 Lyd og stemme

Lyden lages i koden: motor med gir og belastning, dekkstøy, bremser, bylyd med fugler, blinklys, en
«spol tilbake»-lyd ved replay, og UI-lyder. Ingen arkade- eller casino-lyder.
Instruktørstemmen spiller en innspilt fil hvis den finnes, ellers en norsk talestemme i nettleseren,
ellers bare tekst. Teksten vises alltid.

---

## 5. Kvalitetssikring

- **61 automatiske tester** (alle grønne):
  - Hvert nivå spilles i alle grener, og testene sjekker at ingen aktører kolliderer og at alt innhold
    finnes.
  - Mestring, dagsplan og teori.
  - Øvelseskjøring: forsiktig sjåfør får ingen feil, uforsiktig får riktige feil.
  - Skilthenvisninger stemmer med skiltforskriften.
  - Situasjonstegningene avslører aldri svaret før du har svart.
  - De AI-genererte figurene lastes med riktige animasjoner.
- **Automatisk gjennomspilling i nettleser:** alle fem nivåene spilt til ende, både riktig og feil vei,
  uten feil.
- **Lisenser:** alle teksturer og himmelbilder er CC0 (`public/assets/LICENSES.json`). De to figurene er
  laget på brukerens Higgsfield-konto.
- **Faglig:** alt er merket utkast og må gjennomgås av trafikklærer før lansering.

---

## 6. Slik ble det bygget (historikk)

| Fase | Når | Hovedinnhold |
|---|---|---|
| 1. Prototype | 7. okt | Motor, 5 nivåer, 3D-miljøer, UI og tester |
| 2. Digital kjøreskole | 7.–8. okt | Ny grafikk-pipeline (HDRI, PBR), læringssløyfe, mestring, teoritrening, øvelseskjøring, faglig side |
| 3. Produksjonsrunde | 8. okt | Kodede figurer og kjøretøy, bykit og nye gater for S2–S5, ny replay, lyd og stemme, KTX2, skiltrevisjon, kart |
| Live | 21. okt | Vercel-prosjekt opprettet; sykkelsymbol, lysere S3, fikser fra testing |
| 4. Opprydding og figurer | 21.–23. okt | Fjernet «utkast»-merking i spillet, tegninger som ikke avslører svar, jevnere ytelse, FPS-måler, AI-figurer fra Higgsfield, fikset hvite prikker på figurene |
| Codex-dokumenter | 31. okt | Visuell produksjonsplan og referansebilder for et eget Unreal-prosjekt (se kapittel 8) |

---

## 7. Viktige beslutninger

| Spørsmål | Beslutning | Begrunnelse |
|---|---|---|
| Three.js eller Unreal? | **Three.js** for nettversjonen | Spilles fra en lenke på mobil. Det som manglet visuelt var modeller, ikke motoren. Se `docs/THREEJS_VS_UNREAL.md`. |
| Bygge om med Higgsfield Games / Wan 3.0? | **Nei** | Wan 3.0 lager video, ikke spill. Higgsfield Games gir enklere, stiliserte spill og ville kastet læringsdelen. |
| Bruke Higgsfield til modeller? | **Ja, for voksne** | 99 av 100 credits brukt, 2 av 3 figurer godkjent. Barnet ble avvist (hetta ødela skjelettet). |
| Realistisk eller stilisert stil? | **Åpen** | Realistisk er valgt så langt. Stilisert ville vært lettere å få helhetlig med AI-modeller. |

---

## 8. Forholdet til Unreal-prosjektet (Codex)

Det finnes et **eget Unreal-prosjekt** på PC-en din
(`C:\Users\lukas\Documents\Unreal Projects\MyProject`). Ifølge dokumentene har det S1–S5, en
Windows-versjon (`KJOR.exe`) og ferdige modeller fra andre. Codex tok bilder og gjorde en lys- og
fargefinpuss der. Ingen Unreal-filer ligger i dette repoet. Codex-dokumentene ligger i
`docs/visual-production/` og bruker samme branch som nettversjonen. En egen branch for Codex anbefales,
så vi ikke skriver over hverandre.

---

## 9. Dokumentasjon i repoet

| Dokument | Innhold |
|---|---|
| `README.md` | Kom i gang, URL-er, arkitektur |
| `docs/PROSJEKTRAPPORT.md` | Denne rapporten |
| `docs/VISUAL_PIPELINE.md` | Grafikk-pipeline, kamera, ytelse, KTX2 |
| `docs/LEARNING_SYSTEMS.md` | Teori, mestring, øvelse, replay, lyd, stemme |
| `docs/ASSET_AUDIT.md` | Karakter A/B/C for hver modelltype og hva som trengs |
| `docs/SIGNAGE_AUDIT.md` | Skilt og oppmerking mot skiltforskriften |
| `docs/THREEJS_VS_UNREAL.md` | Motorvalg og Higgsfield-vurdering |
| `docs/CRITIQUE_PHASE3.md` | Egenkritikk: hva som så billig ut, og hva som er fikset |
| `docs/screenshots/` | 19 skjermbilder (PC + mobil), pluss fase-2-bilder til sammenligning |
| `docs/visual-production/` | Codex / Unreal: produksjonsplan, storyboard, asset bible |

**Nyttige adresser:** `/#/kart`, `/#/kjor/s1-hoyreregel` (s1–s5), `/#/teori`, `/#/ovelse`,
`/#/provekjoring`, `/#/faglig`, `?fps` (FPS-måler), `?quality=high|medium|low`, `?procedural` (gamle figurer).

---

## 10. Kjente svakheter

1. **Barnet** i S2 er fortsatt en kodet figur. Det første AI-forsøket ble avvist.
2. **Bare to voksne ansikter.** De gjentar seg når mange fotgjengere er i bildet.
3. **Spillerbilen og trafikken** er kodede, firkantede modeller uten interiør.
4. **FPS på ekte telefoner er ikke målt.**
5. **Fagstoffet er ikke gjennomgått** av trafikklærer.
6. **Lyden er syntetisk,** og instruktørstemmen er ikke spilt inn.
7. **Lyset er nøytral dagsol.** En kveldssol-runde (varmere lys, våt asfalt, strømstolper, dis) er
   foreslått for å komme nærmere Unreal-bildene.

## 11. Anbefalte neste steg

1. **Kveldssol-runde på S1** (gratis, kode): varmere lys, våt asfalt, strømstolper, dis. Før/etter fra
   samme kamera, deretter alle nivåer.
2. **Nytt barn uten hette** (≈ 33 credits) og **2–3 voksne til** (≈ 33 credits hver).
3. **Én god bilmodell** som spillerbil (Higgsfield ≈ 25 credits, eller lisensiert modell), med
   bremselys og blinklys.
4. **Mål FPS på din egen telefon** med `?fps` og send tallene.
5. **Faglig gjennomgang** med trafikklærer via `/#/faglig`.
6. **Egen branch for Codex**, og en beslutning om hva som er hovedproduktet: nettversjonen eller Unreal.
