# CSI HIT: geïsoleerde betrouwbaarheidstests

De standaard lokale suite schrijft uitsluitend naar een eigen **lokale** Supabase-stack met project-ID `csi-hit-reliability`, API-poort 55421 en databasepoort 55422. De testhelper accepteert geen andere API-URL. De reguliere IScout-stack op 54321 blijft ongemoeid. Er worden geen productiegegevens gekopieerd: `backend/schema.sql` bevat alleen de relevante schemavorm, functies, grants, RLS en bucketdefinities, gevolgd door fictieve testdata.

## Voorbereiden (PowerShell)

Vereist: Node 24, npm, Docker Desktop, Supabase CLI. Voer vanuit de repository uit:

```powershell
npm ci
supabase start --workdir tests/backend --exclude studio,postgres-meta,edge-runtime,logflare,vector,supavisor
New-Item -ItemType Directory -Force .local | Out-Null
# Bevat lokale sleutels: nooit tonen, delen of committen.
supabase status --workdir tests/backend -o json | Set-Content -Encoding utf8 .local/test-backend.json
npm run test:setup
npx playwright install chromium
```

Als Docker niet in PATH staat, stel `CSI_DOCKER` in op het pad naar `docker.exe`. `test:setup` initialiseert alleen een lege eigen stack, past de hardeningmigratie toe wanneer deze ontbreekt en maakt vier fictieve accounts. Het schrijft de lokale clientconfiguratie naar genegeerde `.env.local` en lokale inloggegevens naar genegeerde `.local/fixture.json`. Gebruik deze credentials alleen voor deze lokale backend. Bij handmatige aanpassingen aan een reeds toegepaste migratie moet de lokale schema-versie bewust opnieuw worden gecontroleerd; setup doet geen automatische schema-reset.

## Uitvoeren

```powershell
npm run test:unit
npm run test:config
npm run test:db
# De DB-suite reset testspeldata. Herstel daarna de fictieve beginsaldi.
npm run test:setup
npm run build
node tests/browser/serve.cjs
```

Voer in een tweede terminal `npm run test:e2e` uit. De browser gebruikt de echte production build op `http://127.0.0.1:3100`. Voer DB- en E2E-suites **na elkaar** uit: ze delen fictieve data. De browsertests blokkeren externe hosts. Alleen de landingtest simuleert het publieke hostname en haalt alle bestanden expliciet van de lokale server; er vindt geen productiebezoek of productieschrijfactie plaats.

De tests verwachten opzettelijk afwijzingen bij een fout wachtwoord, RLS-overtreding, geblokkeerde testactie en geïnjecteerde netwerk-/uploadfout. Onverwachte JavaScriptfouten en React-waarschuwingen laten de browsertests falen. Screenshots en lokale sleutels blijven onder `.local/`, buiten Git.

Stop alleen deze stack indien nodig: `supabase stop --workdir tests/backend`. Gebruik geen globale Docker-cleanup.

## Gehoste CSI HIT TEST

Het geautoriseerde testproject is **ksnagauoufsriwplvvtd**. Productie **uhfcrskkgutlqqogahbr** is nooit een schrijftarget. `backend/hosted.cjs` controleert de exacte HTTPS-URL, beide key-projectclaims en vóór tests de database-marker. Geen impliciete omgevingsfallback. Gebruik uitsluitend fictieve data.

Bewaar de testcredentials lokaal in `.local/hosted-backend.json` met velden `PROJECT_REF`, `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`. Toon of commit dit bestand nooit. De service-role wordt uitsluitend door Node-testhelpers gebruikt.

### Reproduceerbare schema-opbouw

De acht historische repositorymigraties beginnen bij een reeds bestaande legacydatabase. Daarom bevat `backend/supabase/migrations/20260923171313_legacy_test_base.sql` alleen de ontbrekende testbasis (tabellen, constraints, RLS, grants, helpers, buckets en publication), zonder gebruikers of productiegegevens. Deze TEST-bootstrap hoort **niet** in de productiemigratiereeks.

`node tests/backend/migration-plan.cjs` genereert `.local/hosted-bootstrap.sql`: legacybasis, historische migraties, hardening en Storage-fix, gevolgd door een afgeschermd SHA-256-migratiemanifest en TEST-instellingen. De bundel weigert een niet-leeg public schema. Pas de bundel uitsluitend als één transactie/migratie toe op het hierboven genoemde, vooraf geverifieerde lege testproject, bijvoorbeeld via Supabase apply_migration met expliciet project_id. Niet via een blind db push en nooit op productie. Een bestaande testomgeving wordt niet automatisch verwijderd.

### Dataset en uitvoeren

`node tests/backend/setup-hosted.cjs` zet vaste testgroepen/aanwijzingen/notities en zes fictieve accounts klaar. Account-ID's en willekeurige wachtwoorden blijven in `.local/hosted-fixture.json`. Herhaalde setup herstelt vaste fixtures en saldi; de DB-suite test daarnaast de echte reset-RPC. Setup verwijdert niet blind alle testdata. Clientconfiguratie wordt apart geschreven naar `.local/hosted-client.env`.

Voer achtereenvolgens uit (niet parallel op dezelfde backend):

```powershell
node tests/backend/setup-hosted.cjs
$env:CSI_BACKEND='hosted'
# Zo nodig: CSI_SUPABASE_CLI = absoluut pad naar supabase.exe
npm run test:db
node tests/backend/setup-hosted.cjs
node --test --test-concurrency=1 tests/backend/hosted-services.test.cjs
Copy-Item .local/hosted-client.env .env.local
npm run build
# Lokale frontend met hosted backend: laat .local/preview.json afwezig.
# Preview: zet {"url":"https://<deployment>.vercel.app","branch":"hardening/core-reliability"}
# in .local/preview.json, uitsluitend na verificatie van Vercel deployment/commit.
npm run test:e2e
```

De browser controleert vóór login de werkelijk gebouwde endpoint/clientkey en weigert een service-role-key in de bundle. Netwerkverzoeken mogen uitsluitend naar de gekozen frontend en het vaste testendpoint. Landing wordt onder een gesimuleerde publieke hostname met dezelfde deploymentbestanden getest. Alle rollen, 16 E2E-flows en 48 responsive scenario's worden gecontroleerd. De aanvullende hosted-services-suite test RPC-autorisatie, metadata/RLS, twee Storage-flows en drie echte Realtime-scenario's.

Clue-inhoud loopt via de gemaskeerde view. Browserrollen krijgen geen SELECT op clues_base, ook admins niet. Supabase kan een lege 401-eventenvelop terugsturen bij een verboden subscription; geen rijgegevens mogen worden doorgegeven. Aanwijzingen, spelinstelling en groepslidmaatschap convergeren via de bestaande veilige snapshot/pollingroute. Pegels en overige gepubliceerde tabellen gebruiken echte Realtime-events. De test wacht op de serverbevestiging van de Postgres-subscriptie, niet alleen op het geopende kanaal.

### Preview-variabelen

Stel uitsluitend voor Preview + branch `hardening/core-reliability` deze waarden in: REACT_APP_ENVIRONMENT=test, REACT_APP_TEST_PROJECT_ID=ksnagauoufsriwplvvtd, REACT_APP_SUPABASE_URL=https://ksnagauoufsriwplvvtd.supabase.co, REACT_APP_SUPABASE_ANON_KEY=publieke testclientkey. Nooit service-role onder REACT_APP_*. Production-variabelen blijven ongewijzigd.

De buildguard blokkeert Preview met productie, onbekende configuratie of localhost. Als Vercel eerst een bestaande Git-branch verlangt, is vóór de eerste push expliciete toestemming nodig voor een bewust geblokkeerde eerste build. Configureer daarna de branch en bouw dezelfde commit opnieuw als Preview.

## Latere productie-review

Alle migraties zijn in deze opdracht uitsluitend op test toegepast. De hardening trekt toegang tot de oude adjust_group_credits-RPC in. Plan later een gecoördineerde migratie en frontend-release: oude geopende clients moeten verversen. Alleen de twee nieuwe rootmigraties zijn kandidaat voor latere productie-review; de testbootstrap nooit. Nieuwe guards blokkeren harde verwijdering van groepen, verdachten, aanwijzingen, toewijzingen en pegelhistorie buiten TEST; normale eigen notities blijven tijdens LIVE bewerkbaar/verwijderbaar. Geen productiemigratie, release of rollback uitvoeren als onderdeel van deze opdracht.
