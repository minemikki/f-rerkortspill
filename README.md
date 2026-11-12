# TrafikkLab – spillpakken

En norsk 3D-leksjon om vikeplikt i et vinterkryss. Hele spillet ligger i `index.html`, med innebygde skript, stilark og skrifttyper. Du trenger ikke npm eller en byggkommando.

## Last ned fra GitHub

1. Åpne dette repositoriet på GitHub og velg grenen `codex/trafikklab-spillpakke-20261112` i grenvelgeren.
2. Trykk **Code → Download ZIP**.
3. Pakk ut ZIP-filen til en mappe på PC-en.
4. Åpne `index.html` fra den utpakkede mappen i en moderne nettleser, for eksempel Chrome, Edge eller Firefox.

Du kan også åpne filen [`trafikklab-spill.zip`](trafikklab-spill.zip) her på GitHub og bruke **Download raw file**. Den inneholder den samme `index.html` og en kort `LES-MEG.txt`.

## Spill på PC

Nettleseren og enheten må støtte **WebGL 2** for å vise 3D-verdenen. Dobbeltklikk `index.html`, eller bruk nettleserens funksjon for å åpne en fil. Velg **Innstillinger → Lett** hvis visningen går tregt.

I vinterkrysset velger du **Vent**, **Kjør** eller **Se regel**. Selve spillet trenger ikke internett. Kildelenken til Lovdata åpner en ekstern nettside og krever internett.

Fremgang lagres i nettleseren når den tillater lokal lagring. Lagring for lokale HTML-filer kan variere mellom nettlesere.

## Hvis lokale filer er blokkert

Enkelte nettleser- eller enhetspolicyer blokkerer lokale HTML-filer (`file://`). Da kan mappen med `index.html` lastes opp til en statisk netthost. Legg filen i nettstedets rotmappe; ingen byggkommando er nødvendig. Åpne deretter nettadressen vertstjenesten gir deg.

## Hva er kontrollert?

Den selvstendige HTML-filen er kontrollert i Chromium med WebGL og nettverk deaktivert: 3D-scenen lastes, og regeldialogen åpnes og lukkes. Testen leverte HTML-filen direkte på en lokal HTTP-adresse og blokkerte andre nettverkskall. Direkte åpning via `file://` kunne ikke testes fordi nettleserpolicyen i testmiljøet blokkerte lokale filer.

Denne grenen inneholder en ferdig spillpakke. Den setter ikke opp eller publiserer et nettsted.
