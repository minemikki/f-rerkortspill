# KJØR — Visual Production Masterplan

## Suksessdefinisjon

Et troverdig, skarpt og attraktivt norsk kjøreopplæringsspill som kan anbefales som supplerende trening av trafikklærere. Gameplay må være korrekt og morsomt; grafikken må holde fra flere kameravinkler, ikke bare i ett statisk AI-bilde.

### Dette er ikke en ny spillmotor

- Behold all eksisterende S1–S5-koreografi, tidsgrenser, braking/spot/choice, scoring, replay, X-Ray, læringsinnhold og testorakler.
- Three.js-repoet her er et selvstendig fungerende webprosjekt og kilde/referanse; Unreal `MyProject` er separat og må verifiseres lokalt.
- Behold alle lisenser og `SourceArt`-proveniens i Unreal-prosjektet.

## Fase 0 — nåtilstand og sikker baseline

**Ingen kodeendringer.**

1. Inspiser både denne GitHub-klonen og lokalt Unreal-prosjekt.
2. Kjør `git status` i riktig katalog; ikke gjør irreversible reset/clean.
3. Verifiser dokumenterte freeze-punkter, testkommandorer, eksisterende assets og S1–S5-kvalitet.
4. Lag representative *før-bilder* fra eksisterende Unreal-runtime, dokumenter FPS/quality profile og kameraer.
5. Skill konseptbilder fra faktiske engine-captures.

**Ferdig når:** eksisterende system er kartlagt, nye endringer kan A/B-testes og baseline-bilder er tatt.

## Fase 1 — kanonisk kjøretøy: 8 vinkler

Bruk **nåværende lys SUV-mesh**, ikke bytt den med en Volvo-konsepttegning.

Dokumenter fysisk bounding box, hjulsentre, mesh-/materialoppsett og lisens. Ta de samme åtte vinklene fra samme faktiske mesh:

V01 front ortho · V02 bak ortho · V03 venstre ortho · V04 høyre ortho · V05 topp ortho · V06 front 3/4 · V07 bak 3/4 · V08 cockpit.

Deretter tester dere billige forbedringer i lys, materialer, glass, hjul, dekk, lys og kontakt mot asfalt.

**Ferdig når:** samme silhuett/materialer fungerer fra alle vinkler og kameraene er reproduserbare.

## Fase 2 — S2 gate: 8 konsistente storyboardbilder

Bruk frosset S2 fra Unreal; ikke flytt barn/ball/parkert bil for å passe et konseptbilde.

1. Tilnærming i normal chase
2. Første synlige ball
3. Barn skjult, fare kan utledes
4. Førerpanelet / førerperspektiv
5. Barn blir synlig
6. Tidlig trygg respons
7. For sen respons og pedagogisk near-miss
8. Replay/X-Ray fra høy vinkel

Ta også et rent top-down plot med faktiske mål og konfliktpunkter.

**Ferdig når:** hazard er like lett å oppfatte på Laptop og High, og testen viser at timing/occlusion er uendret.

## Fase 3 — S2 VisualProof (ikke-destruktiv)

Opprett separat `VisualProof_S2`-nivå/testmodus; ikke endre frosset S2. Prioriter tiltak:

A. **Render chain:** anti-aliasing, screen percentage, TAA/TSR, motion blur, DOF, bloom, exposure, fog og texture streaming.
B. **Veitextur:** veggrep-visuelt, normal/roughness-variasjon, troverdig våthet, kontrollert speilblikk.
C. **Biler/figurer:** riktige proporsjoner, glass, hjul, bevegelser, kontakt med underlag.
D. **Hus/vegetasjon:** variasjon, materialer, liten skala; behold eksisterende bygg/geometri når den holder.
E. **Fjord/lys:** atmosfærisk dybde, klar nærgate, korrekt gradvis dis.

**Ikke** last ned store pakker, krev betaling, erstatt lisenser eller flytt scenarioaktører automatisk.

**Ferdig når:** samme kamera før/etter viser dokumentert forbedring fra flere vinkler.

## Fase 4 — sammenlign og avgjør

Lag:
- `CAR_8VIEWS_BEFORE_AFTER`
- `S2_STORYBOARD_8FRAMES`
- `LAPTOP_vs_BALANCED_vs_HIGH`
- `VISUAL_GAP_REPORT` med maks fem viktige punkter
- FPS (varmkjørt) og minne-/diskstatus
- Resultat fra frosne regresjoner

La eieren godkjenne én visuell retning. Ikke automatisk «polish forever».

## Fase 5 — rull ut delte forbedringer kontrollert

Først når VisualProof er godkjent:
- delte materialer/lys/kamera/karakter-assets kan tas i bruk i S1–S5
- regressjoner kjøres etter hver gruppe endringer
- all uventet atferdsendring rulles tilbake
- oppdater nye skjermbilder, dokumenter lisenser

## Fase 6 — full produktopplevelse senere

Separat roadmap: LÆR · KJØR · TEORI · TEST · DAILY · KJØR BRAIN · lærerportal. Ingen av disse funksjonene skal distrahere fra VisualProof-testen nå.

## Kvalitetskriterier

- **Visuelt:** realistisk nok i bevegelse og fra driver-eye / chase / ortho / replay.
- **Pedagogisk:** faresignal synlig rettferdig, trygg handling korrekt, høy kvalitet i replay.
- **Teknisk:** ingen skader på S1–S5; testgrønne frosne scenarier.
- **Mobil:** hazard/knapper lesbare ved lavere kvalitet; faktisk mobilbuild må testes før man lover mobil-FPS.
- **Etisk/juridisk:** kun lovlige assets; fotoreferanser er ikke mesher; ikke kopi av konkurrents UI eller spørsmål.
