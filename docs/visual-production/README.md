# KJØR — Visual Production (start her)

**Mål:** Gå fra fungerende S1–S5 til en visuelt førsteklasses norsk kjørelæringsopplevelse uten å kaste eksisterende kode.

## Viktig: to forskjellige prosjekter

Dette GitHub-repoet (`minemikki/f-rerkortspill`) er **React / TypeScript / Three.js-versjonen**. Det inneholder egen scenariomotor, teori/øvelse, UI og 3D-referanseimplementasjon. Det er **ikke** det samme som Unreal Engine-prosjektet `C:\Users\lukas\Documents\Unreal Projects\MyProject`.

Tidligere lokal Unreal-utvikling har ifølge handoff opprettet S1–S5, regresjoner og en pakket Windows-alpha. **Denne GitHub-committen inneholder ikke Unreal C++-koden, .uasset-filene eller KJOR.exe.** Codex må kontrollere Unreal-faktatilstanden lokalt, før den gjør endringer der.

## Dokumenter

- [KJOR_CODEX_HANDOFF.md](KJOR_CODEX_HANDOFF.md): helhetlig prosjektvisjon og arbeidsdeling
- [KJOR_ASSET_BIBLE_V1.md](KJOR_ASSET_BIBLE_V1.md): konkret S2 Asset Bible, bil, barn, miljø, materialer og kamerakrav
- [KJOR_CODEX_ASSET_BIBLE_PROMPT.txt](KJOR_CODEX_ASSET_BIBLE_PROMPT.txt): avgrenset lokal implementeringsprompt
- [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md): faseplan, akseptkrav og ikke-destruktiv Unreal-test
- [WORLD1_STORYBOARD.md](WORLD1_STORYBOARD.md): kart/scene/storyboard for World 1
- [REFERENCE_MANIFEST.md](REFERENCE_MANIFEST.md): katalog over konseptbilder og hva de **ikke** beviser
- [CODEX_START_HERE.md](CODEX_START_HERE.md): kort, trygg startprompt for Codex

## Produksjonsregel

**Design → dokumenter → én isolert 3D-test → samme kamera før/etter → godkjenning → gjenbruk forbedringen i scenarioene.**

Aldri: «bygg hele spillet på nytt». S1–S5 er eksisterende funksjonell investering.

## Referansebilder

De store PNG-designbildene er samlet som en separat `KJOR_VISUAL_REFERENCES.zip` i ChatGPT-leveransen. De må importeres til `docs/visual-production/references/` i den lokale GitHub-klonen og pushes av Codex fra PC-en; GitHub-integrasjonen som ble brukt for dokumentene støttet tekstfiler, men ikke overføring av de lokale binære PNG-filene.

Filer som nevnes i Asset Bible uten tilsvarende PNG i repoet, skal ikke behandles som «allerede lastet opp». Se [REFERENCE_MANIFEST.md](REFERENCE_MANIFEST.md).

## Faglig trygghet

Læringslogikk og norsk trafikkregelverk må faglig kontrolleres. Ikke markedsfør som offisielt godkjent opplæring. Scenariobilder er inspirasjon, ikke bevis for geometri eller faktisk spillfunksjon.

## Første godkjenningspunkt

Codex skal returnere:
1. repo-/lokal Unreal-status;
2. åtte faktiske vinkler av én og samme eksisterende bilmesh;
3. nåværende S2-lokasjon fra faste kameraer;
4. tydelig prioriterte visuelle gap mot bildene;
5. forslag til isolert `VisualProof_S2` uten endring av frosset gameplay.

Ikke sett i gang med stor ombygging før disse er vurdert.
