# CSI HIT — technisch beheer

React-spelapp met Vite, Supabase en één Vercel serverless route. Node **24 LTS** is de enige ondersteunde major (`engines`); de geteste ontwikkel-/CI-patch staat in `.nvmrc`. npm **11.19.0**, één `package-lock.json`, installatie met `npm ci`. Gebruik geen yarn/pnpm of `--legacy-peer-deps`.

```
npm ci
npm run check
```

`check` draait lint, frontendtests, statische/config/privacy/backup-unitchecks, secretscan, `git diff --check`, build en bundlecheck. Geen Docker, `.local`, envbestand, Supabase of secrets nodig. De gate gebruikt een expliciete offline-clientconfig en overschrijft de buildmap; die output is niet voor deployment.

## Ontwikkelen en bouwen

Kopieer `.env.example` naar `.env.local` en vul de publieke clientkey van de **lokale** teststack in (zie [testsetup](tests/README.md)). Daarna:

```
npm run dev
npm test
npm run lint
npm run build
npm run security:audit
```

`start` is een alias voor `dev`. `npm test` is eindig, zonder watch. `npm run test:unit -- --watch` is niet bedoeld als standaard CI-route; gebruik `npx vitest` voor interactief testen. Een gewone build vereist expliciete backendconfiguratie en faalt gesloten. Vite luistert voor development alleen op loopback. Browserdoelen: Chrome/Android 107+, Safari/iOS 16+, Firefox 104+; geen IE/polyfill-laag. Bestaande componenten en domeinlogica zijn behouden.

## Canonical environment variables

| Naam | Waar | Betekenis |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | Browser; Production/Preview/local | Expliciete Supabase origin. Production-ref `uhfcrskkgutlqqogahbr`; Preview uitsluitend CSI HIT TEST `ksnagauoufsriwplvvtd`; lokaal 127.0.0.1:55421. |
| `REACT_APP_SUPABASE_ANON_KEY` | Browser; alle omgevingen | Publieke anon/publishable clientkey; nooit service-role/secret. |
| `REACT_APP_ENVIRONMENT` | Browser | `test` of `production`; Vercel Production zet dit expliciet op production. |
| `REACT_APP_TEST_PROJECT_ID` | Browser; test | Exacte testref, lokaal `csi-hit-reliability`. Geen productiewaarde. |
| `REACT_APP_RELEASE` | Browser | Door build afgeleid van `VERCEL_GIT_COMMIT_SHA`, lokaal `CSI_RELEASE` of `local`. Niet los beheren. |
| `SUPABASE_URL` | Server-only; Vercel Production/Edge | Serverbackend; Vercel-route behoudt bestaande fallback naar frontend-URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; Production/Edge/testharness | Privileged key; nooit onder frontendprefix. |
| `SUPABASE_ANON_KEY` | Edge/server testharness | Publieke clientkey voor Auth-validatie in backuphandler. |
| `CRON_SECRET` | Server-only; Vercel Production | Autoriseert geplande route. Preview krijgt deze niet. |
| `CSI_RELEASE` | Build/Edge/CLI | Optionele release-ID, geen secret. |
| `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` | Automatisch door Vercel | Buildomgeving en Git-identiteit. Geen handmatige duplicaten. |
| `CSI_BACKEND` | Testharness | Default local; hosted alleen bewust met aparte TEST-config. |
| `CSI_DOCKER`, `CSI_SUPABASE_CLI` | Lokale tooling | Optioneel executablepad, geen machinepad in scripts. |
| `CSI_PREVIEW_BRANCH` | Bestaande hosted E2E | Expliciet geverifieerde branch; hosted suites schrijven uitsluitend naar TEST. |
| `CSI_READONLY_PREVIEW` | Nieuwe browser-smoke | HTTPS Vercel Preview origin; geen backendverzoeken of login toegestaan. |

De vijf frontendnamen worden expliciet geïnjecteerd. Geen globale `process.env`-dump, automatische `VITE_*`-exposure of willekeurige `REACT_APP_*`-exposure. Vite envbestanden volgen mode en bestaande process-env heeft voorrang. Preview mag nooit terugvallen op Production. De bestaande globale Preview URL/key staan historisch op Production; branch-overrides zijn dus verplicht. Oude branchvars blijven voorlopig staan; geen Production-vars verwijderen tijdens onderhoud.

## Tests en database

[tests/matrix.json](tests/matrix.json) scheidt offline, lokaal, hosted en schrijvende suites. [tests/README.md](tests/README.md), [securitytests](tests/security/README.md) en [recoverytests](tests/recovery/README.md) beschrijven de bestaande fixtures en flows. Database-, security-, recovery- en browsersuites **na elkaar** uitvoeren; herstel fixtures tussen suites. Een DB-reset kan Storage-verwijzingen ongeldig maken. Gebruik nooit Productionaccounts of -credentials in deze suites.

[Databasebasis en drift](supabase/bootstrap/README.md) is de canonical instructie voor een lege applicatiedatabase, deterministische seed en read-only Productionvergelijking. `npm run test:database:build` gebruikt uitsluitend een tijdelijke database in de geïsoleerde lokale container. Het is geen Productionmigration. Hosted TEST blijft gepauzeerd zolang lokale bewijsvoering volstaat.

## GitHub → Vercel

Werk op een branch, review vóór merge naar `main`. Alleen GitHub is de deploybare bron; geen lokale Production-upload. GitHub Actions voert `npm ci`, de offline quality gate en audit uit, met read-only rechten en zonder deploy-/Productionsecrets. Vercel Git Integration verzorgt Preview en later Production.

`vercel.json` is leidend voor framework Vite, `npm ci`, `npm run build`, output `build`, SPA-rewrite, cron en beveiligingsheaders. `package.json engines.node=24.x` bepaalt de Vercel Node-major. Bij de latere release: dashboard Node 20 → 24 en de verouderde CRA/install-overrides gelijkzetten of verwijderen. In deze fase blijven de gedeelde projectsettings ongewijzigd.

Preview krijgt uitsluitend branchspecifieke publieke CSI HIT TEST-config. Een gepauzeerde backend volstaat voor `CSI_READONLY_PREVIEW=<url> npm run test:build:browser` (zet de variabele met de syntax van je shell). De test controleert assets, login/landing, direct load, hard refresh, CSP, 16 viewportscenario's en een ongeautoriseerde API-request. Hij logt niet in en blokkeert backendrequests.

Voor release: groene Actions en Preview, volledige lokale regressie, diff/secretscan, schema-driftcontrole, geen onverwachte envverschillen, daarna expliciete release-review. Databasehistorie niet blind repareren of opnieuw toepassen. Bestaande [game-day runbook](docs/GAME-DAY-INCIDENT-RUNBOOK.md) en [disaster recovery](docs/DISASTER-RECOVERY.md) blijven operationeel leidend.

`build-meta.json` en bestaande diagnostiek bevatten release-ID/omgeving; geen secrets. Productiesourcemaps worden niet meer gebouwd. Assets hebben contenthashes; HTML en metadata moeten herladen kunnen worden. Geen service worker aanwezig. Oude geopende CRA-clients blijven met hun geladen code werken; een refresh haalt de nieuwe entry/assets op. Een toekomstige dynamische-chunkarchitectuur vereist opnieuw een deploy-skewtest.

De audit, afwegingen, aantallen en resterende releasepunten staan in [het onderhoudsrapport](docs/BUILD-TOOLING-HARDENING-REPORT.md).
