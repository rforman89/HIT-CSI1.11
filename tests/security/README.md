# Lokale securityvalidatie

Alle scripts in deze map gebruiken uitsluitend tests/backend/local.cjs: vaste lokale CSI HIT API 127.0.0.1:55421 en DB-container supabase_db_csi-hit-reliability op poort 55422. Geen CSI_BACKEND=hosted-adapter in deze nieuwe suite. Geen productie- of hosted TEST-writes.

## Voorbereiding

Gebruik de bestaande lokale stack uit tests/README.md. Daarna:
```powershell
npm run test:setup
npm run test:recovery:setup
npm run test:security:setup
npm run build
# In een aparte terminal:
node tests/browser/serve.cjs
```

Security setup past de nieuwe migration alleen toe wanneer private.has_game_access ontbreekt. Iteraties op een bestaande lokale migration moeten expliciet lokaal worden toegepast; een tweede setup is geen migrationsynchronisatie. De fictieve credentials blijven uitsluitend in .local/fixture.json.

## Suites

```powershell
npm run test:unit
node --test tests/config/build-guard.test.cjs tests/recovery/unit.test.mjs tests/recovery/cron.test.cjs
npm run test:db
npm run test:setup
npm run test:security:setup
npm run test:security
npm run test:security:browser
npm run test:recovery:db
npm run test:recovery:handler
npm run test:setup
npm run test:security:setup
npm run test:e2e
npm run test:recovery:browser
npm run lint
npm run security:scan
git diff --check
```

Niet parallel op dezelfde database uitvoeren: recovery/reset-tests wijzigen bewust de fictieve dataset. Herstel fixturedata tussen categorieën zoals hierboven. De test zonder profiel herstelt het fictieve profiel na afloop; Realtime-clients worden afgesloten. De security-suite heeft 22 directe API/Storage/Realtime/databasechecks, 5 Authchecks en 4 pure privacyplannertests; CSV/URL/upload-unittests zitten bij test:unit. Browsersecurity heeft 8 tests.

Lokale backup-browserchecks gebruiken de echte gedeelde Edge-handler met alleen transport naar de lokale handler aangepast, omdat lokale edge_runtime uitstaat. Dit is geen bewijs van hosted gatewayconfiguratie.

## Hosted vervolg — expliciete gate

Stop bij het lokale checkpoint. Hervat CSI HIT TEST niet automatisch. Pas na expliciete gebruikersbevestiging en ACTIVE_HEALTHY:
1. Verifieer exact TEST-ref ksnagauoufsriwplvvtd en snapshotschema/branch.
2. Pas uitsluitend de voorbereide nieuwe migration toe; deploy de bijgewerkte backup-handler naar TEST.
3. Maak fictieve rollen/accounts, inclusief jury, inactive, ongekoppeld en onbevestigd. Pas bestaande fixtures aan voor is_active en private foto's.
4. Draai dezelfde autorisatiematrix via een expliciet TEST-geallowliste adapter; voer e-mailbevestiging/recovery/refresh, signed URL-expiry en Realtime met echte hosted services uit.
5. Controleer Auth-beheerinstellingen en test het voorgestelde wachtwoordbeleid. Geen productie-authconfigwijziging.
6. Run security/performance advisors. Bekijk vooral de bewust authenticated maar intern geautoriseerde release-RPC.
7. Push alleen hardening/security-roles-product en maak Preview tegen TEST; bewijs deployment- en Supabase-ref. Bestaande browserhelpers accepteren deze nieuwe branch nog niet: voeg de concrete geverifieerde Preview toe aan de allowlist tijdens de hosted fase, zonder de Production-blokkade te versoepelen.
8. Test rollen, jurywrites, revocatie, Storage, headers/CSP, downloads, backupstatus en responsive UI.
9. Meld direct wanneer TEST weer gepauzeerd kan worden.

Verwachte hosted validatietijd na ACTIVE_HEALTHY: ongeveer 45–75 minuten inclusief Auth-config, adapter/fixturevoorbereiding, advisors en Preview; geen garantie als mail- of platformproblemen optreden.
