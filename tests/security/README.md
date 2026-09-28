# Securityvalidatie: lokaal en expliciet hosted TEST

Standaard gebruiken de suites uitsluitend de vaste lokale CSI HIT API 127.0.0.1:55421 en DB-container supabase_db_csi-hit-reliability op poort 55422. Alleen expliciet CSI_BACKEND=hosted selecteert de bestaande helper met exacte TEST-ref, beide keyclaims en database-marker. Productie wordt altijd geweigerd.

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

Security setup controleert beide migrations via private.has_game_access en private.release_group_clue. Ontbrekende migrations worden alleen lokaal toegepast; hosted setup stopt als ze ontbreken. Iteraties op een bestaande lokale migration moeten expliciet lokaal worden toegepast; een tweede setup is geen migrationsynchronisatie. Fictieve credentials blijven uitsluitend in genegeerde .local-fixturebestanden.

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
7. Push alleen hardening/security-roles-product en maak Preview tegen TEST; bewijs deployment- en Supabase-ref. De browserhelpers accepteren deze expliciete branch via de geverifieerde Preview-configuratie; de Production-blokkade blijft behouden.
8. Test rollen, jurywrites, revocatie, Storage, headers/CSP, downloads, backupstatus en responsive UI.
9. Meld direct wanneer TEST weer gepauzeerd kan worden.

Dit vervolg is uitgevoerd; zie het definitieve rapport in docs/SECURITY-ROLES-PRODUCT-REPORT.md. Geen actieve TEST-omgeving meer nodig voor afronding van deze opdracht.

## Geautoriseerd hosted vervolg op 28 september

Na ACTIVE_HEALTHY zijn beide securitymigrations en de backup-handler uitsluitend op TEST toegepast. Gebruik CSI_BACKEND=hosted, CSI_PREVIEW_BRANCH=hardening/security-roles-product en zo nodig CSI_SUPABASE_CLI met het absolute CLI-pad. Voer setup-hosted.cjs, test:security:setup en de suites achtereenvolgens uit; herstel fixtures na destructieve regressies. Preview vereist de geverifieerde branch/URL in .local/preview.json en een geldige lokale Vercel-browserstate.

Hosted signup weigert gereserveerde .test-adressen. De test verifieert deze weigering en doorloopt daarna een echte signup-tokenbevestiging via een servermatig gegenereerde link, zonder email te versturen. Recovery en het twaalftekensminimum worden via echte Auth-calls getest. Realtime wacht op de Postgres-system acknowledgement; delete-validatie gebruikt een verse Storage-request om CDN-cache te onderscheiden van een nog bestaand object.

node scripts/privacy/inspect-hosted.cjs inventariseert uitsluitend TEST en kan niets verwijderen. Nieuwe advisorbevindingen zijn verholpen in security_advisor_refinements; bestaande historische adviezen blijven expliciet gedocumenteerd.

`node --test tests/security/hosted-confirmation.test.cjs` volgt een echte signupconfirmationlink via de geverifieerde Preview. De test verwijdert zijn tijdelijke fictieve Auth-account na afloop. De definitieve runs tellen 116 hosted tests, inclusief 33 browserchecks; geen skips of failures. Draai ze alleen na een nieuwe expliciete beschikbaarstelling van TEST.
