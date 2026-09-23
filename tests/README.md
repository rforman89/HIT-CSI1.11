# CSI HIT: geïsoleerde betrouwbaarheidstests

Deze suite schrijft uitsluitend naar een eigen **lokale** Supabase-stack met project-ID `csi-hit-reliability`, API-poort 55421 en databasepoort 55422. De testhelper accepteert geen andere API-URL. De reguliere IScout-stack op 54321 blijft ongemoeid. Er worden geen productiegegevens gekopieerd: `backend/schema.sql` bevat alleen de relevante schemavorm, functies, grants, RLS en bucketdefinities, gevolgd door fictieve testdata.

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

## Gehoste Preview: nog te doen

Op 23 september 2026 kon binnen CSI Alphen geen extra gratis project worden aangemaakt: de eigenaar heeft de limiet van twee actieve gratis projecten bereikt. Er is niets gepauzeerd, verwijderd of opgewaardeerd. De bestaande Preview deelt de productiebackend en mag daarom niet voor schrijvende tests worden gebruikt.

Een beheerder moet eerst een afzonderlijk Supabase-testproject beschikbaar stellen (en eventuele kosten afzonderlijk goedkeuren). Initialiseer uitsluitend dat lege project met het testschema en de hardeningmigratie; gebruik uitsluitend fictieve accounts/data. Laat vervolgens deze **Preview-only** variabelen naar dat project wijzen:

- `REACT_APP_ENVIRONMENT=test`
- `REACT_APP_TEST_PROJECT_ID=<testprojectref>`
- `REACT_APP_SUPABASE_URL=https://<testprojectref>.supabase.co`
- `REACT_APP_SUPABASE_ANON_KEY=<publieke testclientkey>`

Nooit een service-role-key in een `REACT_APP_*` variabele. Wijzig de Production-variabelen niet. De buildguard weigert een Preview met de productiebackend, een onbekende backend of localhost. Een productiebuild op Vercel kiest expliciet `production` uit `VERCEL_ENV=production` en vereist het bestaande productieproject. Er is geen automatische fallback van test naar productie.

Pas na verificatie van project-ID, backend-URL, schema en fictieve data kan de hardeningbranch gepusht worden en de Preview opnieuw worden getest. Deze lokale schrijf-tests zijn bewust niet op afstand configureerbaar; voeg voor een gehoste suite eerst een expliciete endpoint-allowlist en een controle van het testproject toe.

## Latere productie-review

De migratie is alleen lokaal toegepast. Zij trekt toegang tot de oude `adjust_group_credits`-RPC in. Plan een gecoördineerde migratie en frontend-release: oude geopende clients moeten verversen. Geen productie-migratie, release of rollback uitvoeren als onderdeel van deze opdracht. Nieuwe guards blokkeren harde verwijdering van groepen, verdachten, aanwijzingen, toewijzingen en pegelhistorie buiten TEST; normale eigen notities blijven tijdens LIVE bewerkbaar/verwijderbaar.
