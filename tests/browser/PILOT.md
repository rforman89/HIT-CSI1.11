# Lokale pilotwalkthrough

Gebruik de bestaande Node 24-omgeving en geïsoleerde LOCAL-backend uit tests/README.md. Geen gehoste target, load- of restoretest.

1. Zet CSI_BACKEND=local en gebruik de bestaande Docker/runtimepaden.
2. Draai npm run test:setup en npm run test:security:setup voor de fictieve rollen en een aangevraagde aanwijzing.
3. Draai npm run build met de lokale clientconfiguratie en start node tests/browser/serve.cjs.
4. Draai npm run test:pilot. Tien checks: login, deelnemer, vrijgave-status, verdachte, jury, admin en vier compacte responsivechecks.

De suite schrijft alleen naar de vaste lokale backend. Voer niet tegelijk andere fixturetests uit. Herhaal test:security:setup vóór een nieuwe walkthrough, omdat de jury een bestaande fictieve aanvraag vrijgeeft. De kooptest verwijdert zijn eigen aanwijzing; notities/correcties blijven in de lokale testgeschiedenis. Screenshots staan uitsluitend in .local/pilot. De suite doet geen backup of restore.
