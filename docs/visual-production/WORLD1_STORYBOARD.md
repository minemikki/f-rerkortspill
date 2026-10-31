# KJØR World 1 — Map og Storyboard

Dette er en **visuell plan**, ikke en eksakt geometriimport. Den lokale Unreal-byggen og faktisk scene-layout har forrang for veimål, trafikkregler, occlusion og triggerposisjoner.

## World 1: Byen / Boligområdet

Vurder om eksisterende områder kan fremstå som én sammenhengende norsk kystbydel ved hjelp av *vistas* og gjenbruk av hus, trær, veier og skilt. Kartet i referansebildene er konseptkunst — ikke et nøyaktig koordinatsett.

### Kartlag som Codex må utlede fra ekte scenarioer
- faktisk spillerposisjon/rute
- andre biler, syklister og fotgjengere med tidskurver
- ball-/barnets synlighetsområde
- hekker, parkerte biler og siktbarrierer
- konfliktsone, trygt bremsepunkt og eventuelle vikepliktslinjer
- kamera-posisjoner (gameplay/replay/top)
- plassering av viktige skilt og oppmerking

## S1 — Høyreregelen
**Lær:** uregulert kryss, trafikk fra høyre.
1. Intro: norsk rolig boliggate
2. Tilnærming: les kryss / sikt, ingen forkjørsvei
3. Beslutning: motgående/sidekommende trafikk vurderes
4. Korrekt: brems/vent i tråd med frosset scenario
5. Feil: pedagogisk frysing/konsekvens
6. Replay: trafikkbaner, siktlinjer og regel

## S2 — Ballen
**Lær:** ball er faresignal, mulig skjult barn.
1. Approach: bil kjører mot en drive-/hekkelomme
2. Ball: red/white ball blir synlig
3. Skjult risiko: barnet har ikke vist seg
4. Reaksjon: tidlig bremsehold vs sent
5. Reveal: barnet dukker opp
6. Sikker utgang vs beskyttet near-miss
7. Replay: BALL → RISIKO → BARN → BREMS
8. X-Ray: sikt, bremsestart, konfliktpunkt

## S3 — Se syklisten
**Lær:** observasjon og konflikt ved manøver.
1. Tilnærming og veivalg
2. Første mulige glimt av syklist
3. Speil/blindsone/spot
4. Trygg plassering og eventuell vikeplikt
5. Uheldig sen oppdagelse
6. Replay/X-Ray: syklistens og bilens baner

## S4 — Fotgjengeren
**Lær:** les intensjon, tilpass fart, ta hensyn til bil bak.
1. Tilnærming til fotgjengerfelt
2. Tegn på at noen kan krysse
3. Tidlig og kontrollert fartstilpasning
4. Sen brå brems / økt risiko
5. Fotgjenger passerer
6. Replay: observasjons- og bremsepunkt

## S5 — Rundkjøringen
**Lær:** kombinert observasjon, plassering, vikeplikt og flyt.
1. Innkjøring / hastighet / plassering
2. Flere aktører og vikeplikt
3. Usikre blinklys/signaler
4. Buss og jogger rundt utkjøring
5. Riktig gjennomføring
6. Boss-resultat / flertrinns X-Ray

## Kamerapakke (per scenario)

| ID | Kameratype | Mål |
|---|---|---|
| K1 | Chase (vanlig spiller) | lerretet må fremstå premium samtidig som fare er naturlig synlig |
| K2 | Driver-eye | faktisk trafikklæringsperspektiv; ikke skjul faresignal med dashbord |
| K3 | Low 3/4 | bilmodell, miljø og kontakt i høy kvalitet |
| K4 | True top | mål og baner; ikke bruk AI-art som koordinater |
| K5 | Sidewalk | møtet med ball/barn/syklist/fotgjenger |
| K6 | Replay high-angle | siktlinjer og tidsrekkefølge |
| K7 | Clean beauty | ingen UI, material- og lysreview |
| K8 | Result/HUD | produktets identitet og lesbarhet |

## Art direction

- Skandinavisk boligbyggeskikk, troverdige skilt, riktig vegbredde
- Fjord/skog/åser i langdistanse der scenen tillater det
- Våt asfalt og golden-hour for markedsføring, men ulike lysforhold senere
- Et konsistent, lisensiert sett med biler/figurer, ikke genererte lookalikes som bytter form mellom vinkler
- Dark navy/charcoal UI med signalgul fokus, kort norsk tekst

## Ikke-destruktiv regel

Denne planen erstatter ikke gamle scenariodata eller reviewed content. Storyboard-referanser må etterprøves mot de eksisterende S1–S5-testene før kamera-/sceneendringer.
