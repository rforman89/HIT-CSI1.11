# Performance validation — checkpoint vóór hosted TEST

Deze tooling is voorbereid voor `hardening/performance-scale`. **Niet uitvoeren op Production.** De lokale fase hervat TEST niet en pauzeert IScout niet. Voor actuele resultaten en beperkingen: [rapport](../../docs/PERFORMANCE-SCALE-REPORT.md).

## Lokale herhaling

Gebruik Node 24.21.0 / npm 11.19.0, de bestaande geïsoleerde backend op `127.0.0.1:55421` en databasepoort 55422. Setup staat in [tests/README.md](../README.md). Houd alle tests die fixtures muteren sequentieel; niet tegelijk met profiling of load.

```powershell
$env:CSI_BACKEND='local'
npm ci
npm run check
npm run security:audit
npm run test:setup
npm run test:recovery:setup
npm run test:db
npm run test:setup
npm run test:security:setup
npm run test:security
npm run test:recovery:db
npm run test:recovery:handler
npm run test:setup
npm run test:security:setup
npm run build
# Start in een tweede terminal: node tests/browser/serve.cjs
npm run test:e2e
npm run test:security:setup
npm run test:security:browser
npm run test:recovery:browser
npm run test:performance
# Recoverytests verwijderen fotoverwijzingen; herstel vóór assetprofiling:
npm run test:security:setup
node tests/performance/compare-profile.mjs normal
node tests/performance/browser-profile.cjs final 4g
node tests/performance/browser-profile.cjs final slow
node tests/performance/bundle-profile.mjs
node tests/performance/large-profile.cjs
node tests/performance/load.mjs --target=local --profile=A --clients=10 --seconds=60 --reconnect
```

`compare-profile.mjs` bouwt de vijf gewijzigde applicatiemodules eerst vanuit Git `8ef8bee`, profileert en bouwt in `finally` de huidige bron terug. De bronbestanden/branch blijven intact. Geen andere tests of builds tegelijk draaien. Er blijft een lokale build van de huidige branch achter, geen deployartifact voor Production.

`npm run perf:seed -- seed` en `npm run perf:seed -- cleanup` werken uitsluitend lokaal. Deterministische fictieve data: 1.500 transacties (netto nul), 2.500 auditrecords, 1.200 notities, 1.100 clues, zes extra groepen. Bestaande lokale fixtures blijven bestaan. Cleanup verwijdert ook uitsluitend auditregels waarvan de target één van de deterministische eigen fixture-IDs is. Andere auditgeschiedenis blijft staan; het is geen volledige database-reset. De auditpagineringstest filtert op de 2.500 eigen performancefixture-rijen, zodat bestaande testgeschiedenis de proef niet verandert.

Alle ruwe output gaat naar genegeerde `.local/performance/`. Profiler logt geen querywaarden, requestbodies, headers of credentials. Requestfingerprints zijn hashes van methode/URL/body en blijven lokaal. De gepubliceerde samenvattingen bevatten alleen aantallen/tijden/groottes. `summarize.cjs` stelt het checkpointbewijs samen uit de vastgelegde meetnamen; het is geen extra test. De loopbackserver verstuurt assets ongecomprimeerd en met `no-store`; mobiele cijfers zijn een conservatieve labsimulatie, geen meting van Vercel-CDN-gebruik.

## Profielen en stopgrenzen

| Profiel | Refreshgedrag per API-sessie | Doel |
|---|---|---|
| A | metadata ongeveer elke 10 s; volledig na 60 s, plus gerichte events | normaal actief gebruik |
| B | volledige refresh elke 5 s | druk moment/handmatig vernieuwen |
| C | volledige refresh elke 2,5 s | korte piek, lage schrijfverhouding |
| D | volledige refresh elke 1,5 s | begrensde stress; alleen hosted TEST |

Per tien sessies: één admin, één jury, één suspect, zeven participants verdeeld over twee groepen. Vijf fictieve accounts dragen meerdere sessies: dit modelleert meerdere apparaten/tabs, niet tien unieke personen. Per sessie één echte Realtime-verbinding met zeven tabelbindings. Navigation zonder refresh is browserwerk, geen extra API-query. De browser-E2E vult het API-model aan. De grote fixture concentreert 1.500 transacties en 1.200 notities in groep A; de extra zes groepen hebben geen extra ingelogde accounts. Dit is een conservatief datavolumescenario, geen voorspelling van precies die spelverdeling. Leg normale versus grote fixturecapaciteit afzonderlijk vast en baseer planadvies niet uitsluitend op een uitzonderlijk grote fixture.

Exacte targetallowlist, JWT-projectrefcontrole voor hosted, database-marker, fictieve e-maildomeinen, geen redirects, geen URL-override. Lokaal maximaal tien leessessies en geen profiel D of loadwrites. Hosted maximaal honderd sessies. Run 10–1.800 seconden; watchdog begrenst inclusief setup tot maximaal 30 minuten. Requests max. 10 s, snapshots max. 30 s; join max. 10 s. Elke HTTP 4xx/5xx (dus ook 429), Realtime-fout, integriteitsfout of p95 >3 s over de laatste tien volledige snapshots stopt de test. Geen automatische retryflood. Cleanup wacht op lopende snapshots, verwijdert channels en logt alleen de betreffende sessie uit.

`--writes` is uitsluitend hosted toegestaan. Per run maximaal zes logische writes: twee notities, twee aankopen voor verschillende groepen, één jurycorrectie met dezelfde action-ID als retry en één clue-release via de bestaande RPC. Deze writes gebeuren in de tweede leescyclus, tussen voortdurend lezende admin/jury/participants. Saldo vóór/na, één transactie per action-ID, aankopen, notities, bestaande audittriggers en zichtbaarheid bij gerechtigde clients worden gecontroleerd. Notities hebben geen bestaande operation-audittrigger; daarvoor controleert de test de opgeslagen rij. De writes blijven fictief op TEST staan voor inspectie; geen verborgen cleanup/reset tijdens load.

De hotspot gebruikt een gerichte `group_clues`-vrijgave voor groep A. Het aantal verwachte ontvangers volgt de bestaande RLS. Groep B mag de aanwijzing niet ontvangen. Een globale metadata-vrijgave loopt via de bestaande polling (maximaal ongeveer 11 s + querytijd) en wordt apart in browser-E2E gecontroleerd. Coalescing vermindert REST-reloads, niet het aantal door Supabase afgeleverde events.

## Hosted draaiboek — pas na het checkpoint

1. Laat de operator bevestigen dat **CSI HIT TEST `ksnagauoufsriwplvvtd` ACTIVE_HEALTHY** is. Verifieer dit in de control plane vóór iedere run. Bespreek het korte IScout-venster; de scripts veranderen geen projectstatus.
2. Controleer schema/migrations met de bestaande databaseprocedure. Geen Productiondata kopiëren, geen blinde migration-history-repair. Alleen ontbrekende, gereviewde TEST-migraties toepassen.
3. Bewaar correcte TEST-credentials in genegeerde `.local/hosted-backend.json`; zet `CSI_BACKEND=hosted`. Draai `node tests/backend/setup-hosted.cjs`, `npm run test:recovery:setup`, `npm run test:security:setup`. Controleer database-marker en `game_mode=test`.
4. Provision uitsluitend fictieve fixtureaccounts. Voer functionele database/security/recoverybaseline uit; herstel fixtures na destructieve tests. Daarna `node tests/performance/seed-hosted.cjs --allow-hosted`. Inspecteer aantallen en saldo. Een falende baseline betekent geen loadtest.
5. Stel alleen branchspecifieke Preview-variabelen in op TEST; push `hardening/performance-scale`. Verifieer Preview READY, exacte commit en TEST-ref in build. Bewaar geverifieerde Preview-URL/branch in `.local/preview.json`; browserauthstate blijft lokaal. Zet `CSI_PREVIEW_BRANCH=hardening/performance-scale`. Geen main-merge of Productiondeployment.
6. Draai onderstaande stappen sequentieel. Inspecteer tussen stappen Supabase REST-/Realtime-/databasegrafieken, errors en quota. Een script kan control-planemetrics niet zelfstandig bewijzen. Stop bij stijgende disconnects, poolerwachttijd, resource-uitputting of budgetoverschrijding, ook als de process-exitcode nul is.

```powershell
# 12 minuten meetduur, plus setup; stopt bij de eerste mislukte trede.
node tests/performance/ramp.cjs --allow-hosted
# Alleen op de laatste gezonde trede; begin schrijftest bij 10.
node tests/performance/load.mjs --target=hosted --allow-hosted --profile=C --clients=10 --seconds=120 --writes --out=hosted-writes-10
# Herhaal writes bij 25/50 uitsluitend als vorige trede en quota gezond zijn.
node tests/performance/load.mjs --target=hosted --allow-hosted --profile=B --clients=25 --seconds=120 --reconnect --out=hosted-reconnect-25
# Apart: representatieve reads tijdens browser-E2E; géén gelijktijdige andere writes.
node tests/performance/load.mjs --target=hosted --allow-hosted --profile=A --clients=25 --seconds=300 --out=hosted-e2e-background
# In tweede terminal: relevante E2E/browser suites tegen geverifieerde TEST Preview.
# Na gezonde ramp/E2E: 15-minutensoak op de gekozen veilige trede.
node tests/performance/load.mjs --target=hosted --allow-hosted --profile=A --clients=50 --seconds=900 --out=hosted-soak-50
```

Ramp: 5 → 10 → 25 → 50 → 75 → 100; per trede 120 s. B tot 50, D daarboven. Stop vóór verdere verhoging zodra p95 snapshot >3 s of requests fouten vertonen. Honderd is een bovengrens, geen doel dat koste wat kost bereikt moet worden. Op een trage fixture kan de stage-timeout van vijf minuten eerder stoppen. Hard-limit, resource-exhaustion of integriteitsfout betekent afbreken en rapporteren, niet automatisch plan upgraden.

Meet per trede p50/p95/p99, requests/s, bytes, errors, joins, eventdelivery, hotspot-convergentie en admin/jury afzonderlijk. API-metingen omvatten response-bodymeting en lokale clientoverhead; gebruik daarnaast hosted querylogs. Throughput in de JSON-samenvatting gebruikt de totale run inclusief login/cleanup; `loadDurationSeconds` geeft de eigenlijke workloadduur. Kleine aantallen snapshots geven weinig betrouwbaar p99-bewijs.

Voer daarna mobiele browser-E2E met latency uit onder gezonde achtergrondload; controleer oorspronkelijke rollen, mutationfeedback en reconnect. Controleer na de soak channel counts, memorytrend, p95 per tijdvak en serverlogs/advisors. Hosteddetails en gecontroleerde metrics toevoegen aan het rapport. Capaciteit pas vaststellen als reads, writes, Realtime én browsergedrag op dezelfde trede slagen.

Verwachte hosted sessie: **45–60 minuten**, inclusief ramp, gerichte writes/reconnect, E2E en 15-minutensoak; setup-/herstelproblemen kunnen dit verlengen. Meld zodra gehost werk klaar is dat TEST weer gepauzeerd en IScout hervat kan worden. Geen automatische statuswisseling.

## Korte check vóór Pasen 2027

Op opnieuw geverifieerde TEST: functionele login/pegel-smoke, vijf sessies profiel A gedurende 120 s met reconnect, één gerichte schrijftest met vijf sessies en daarna de integriteitscontrole. Vergelijk met de uiteindelijk goedgekeurde hosted baseline, controleer actuele quota/plan en test mobiel. Stop bij regressie; niet opschalen. Production uitsluitend bestaande logs/health observeren. Deze pre-event check vervangt de nog openstaande hosted capaciteitsvalidatie niet.
