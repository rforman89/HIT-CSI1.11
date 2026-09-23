# Backup/restore tests

Recoverytests gebruiken standaard de lokale Supabase-stack op 55421/55422 (`.local/test-backend.json`). Met `CSI_BACKEND=hosted` gebruiken database-, handler- en browsertests uitsluitend het vaste CSI HIT TEST-project (`.local/hosted-backend.json`), na markercontrole; geen fallback naar Production. Hosted handler- en browsertests roepen de werkelijk gedeployde Edge Function aan. Voer suites **na elkaar** uit: ze delen fictieve gegevens. De database-/drilltests wissen en herstellen lokale speldata. Gebruik geen echte accounts/assets.

```powershell
npm run test:setup
npm run test:recovery:setup
npm run test:recovery
npm run test:recovery:db
npm run test:recovery:handler
node --test tests/recovery/cron.test.cjs
npm run build
# Start de lokale buildserver in een aparte terminal:
node tests/browser/serve.cjs
# Daarna:
npm run test:recovery:browser
node scripts/recovery/drill.mjs --target csi-hit-reliability --confirm 'DRILL csi-hit-reliability' --smoke-url http://127.0.0.1:3100
```

De recoverysetup past de nieuwe migratie alleen toe wanneer zij ontbreekt. Bij ontwikkeling aan een reeds toegepaste migratie moet de schemawijziging bewust lokaal worden verwerkt; setup doet geen stille reset. `test:setup` schrijft uitsluitend lokale frontendconfiguratie. Logs/bundles/rapporten/screenshots staan onder `.local/` en blijven buiten Git.

De handler en nieuwe browserflow roepen de echte gedeelde Edge-handler aan onder Node, met echte lokale Auth/database/Storage. De lokale Edge-runtime is uitgeschakeld; een transportadapter vervangt alleen de HTTP-aanroep, niet de datalaag of autorisatie. Hosted Deno-deployment moet apart worden gecontroleerd.

De bestaande suites staan in [../README.md](../README.md). Draai die bij voorkeur vóór de herstel-drill; zij veranderen op hun beurt de fixtures. De volledige drill laat de herkenbare herstelde spelset staan voor handmatige controle. Een losse herhaling van een test die een eerdere bundle gebruikt vereist de bijbehorende eerdere setup binnen dezelfde suite.

## Hosted checkpoint

Alleen uitvoeren wanneer CSI HIT TEST ACTIVE_HEALTHY is. Na bevestigde hervatting: [recoveryrunbook](../../docs/DISASTER-RECOVERY.md). Drill heeft expliciete vaste target/confirmation; productie wordt geweigerd.

Voor de nieuwe Preview: schrijf de geverifieerde URL en `branch: hardening/backup-restore-operations` in `.local/preview.json`. Zet `CSI_BACKEND=hosted` en, indien gewenst expliciet, `CSI_PREVIEW_BRANCH=hardening/backup-restore-operations`. De browser weigert de oude core Preview standaard. Alleen voor een bewuste eerdere core-herhaling kan `CSI_PREVIEW_BRANCH=hardening/core-reliability` worden gekozen. De werkelijk gebouwde frontend moet altijd het vaste testendpoint en de juiste publieke testkey bevatten.

De standalone drill-smoke controleert de herstelde set vóór de volledige E2E-suite deze verder verandert. Bewaar beide resultaten. Hosted Auth-reconstructie en advisors blijven verplichte afzonderlijke controles vóór production-review.
