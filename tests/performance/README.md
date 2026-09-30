# Performance validation — lokaal en hosted TEST

Deze tooling is gevalideerd op `hardening/performance-scale`. Het actuele doel is maximaal circa twintig gebruikers met marge richting 25 actieve sessies. **Niet uitvoeren op Production.** De tooling hervat TEST niet en pauzeert IScout niet. Voor actuele resultaten en beperkingen: [rapport](../../docs/PERFORMANCE-SCALE-REPORT.md).

## Actuele acceptatie: twintig gebruikers

De oorspronkelijke 40–50-sessieaanname is vervallen. De historische ramp hieronder documenteert de eerdere meting en wordt voor deze acceptatie **niet opnieuw uitgevoerd**. Geen nieuwe 50/75/100-tests of grote seed. Gebruik de normale fictieve fixture, herstel die na core/security-baseline en controleer aantallen voordat load begint. De recovery-databasesuite voegt veel notificatiehistorie toe; voer die niet tussen fixtureherstel en deze meting uit.

Controleer vóór iedere run exact TEST `ksnagauoufsriwplvvtd` ACTIVE_HEALTHY via `hosted-stage.cjs`. Gebruik Node 24.21.0, `CSI_BACKEND=hosted` en `CSI_PREVIEW_BRANCH=hardening/performance-scale`. Voor de reproduceerbare acceptatie staat `.local/preview.json` op de geverifieerde READY-Preview van applicatiebasis `453a5e03f1bfa92b8fe29421c7d8c96d6ec3a648`; geldige Preview-cookies staan uitsluitend in `.local/preview-browser-state.json`.

```powershell
node tests/performance/server-metrics.cjs --allow-hosted --samples=28 --out=acceptance-metrics
# In tweede terminal, na gezonde baseline en fixturecontrole:
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=A --clients=20 --seconds=900 --writes --acceptance --out=acceptance-20
# Alleen na volledig groene 20-sessiesrun:
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=A --clients=25 --seconds=300 --out=acceptance-margin-25
node tests/performance/summarize-acceptance.cjs
```

`--acceptance` vereist exact hosted/A/20/900/writes. Rollen: twaalf participants (zes per groep), drie suspects, drie jury, twee admins. Twee echte mobiele Preview-browsers (participant/jury) lopen gedurende de gehele workload mee: maximaal **22 gelijktijdige sessies**. De participant heeft 100 ms latency, 200 kB/s download, 100 kB/s upload en 4× CPU-vertraging. De vijf bestaande fictieve accounts worden hergebruikt; dit is geen proef met twintig unieke Auth-identiteiten.

Het schema is begrensd: participantnotitie via UI rond minuut 1, jurycorrectie via UI rond minuut 3, aankoop A op 5, notitie B op 7, vijf gelijktijdige API-reconnects op 7,5, vrijgave op 9, jurycorrectie op 11 en aankoop B op 13. De mobiele browser gaat daarnaast kort offline/online. Beide correcties worden met hun oorspronkelijke action-ID herhaald en mogen geen tweede transactie maken. De bestaande aankoop-RPC voorkomt dubbele aankopen. Iedere mutatie wordt achteraf via saldi, rijen, transacties, audit en groepsisolatie gecontroleerd. Geen fixture-reset tijdens of na de load; bewaar lokaal de runstate voor reconstructie. Eindregressies draaien op de geïsoleerde lokale backend.

De vijftienminuten-p95 van volledige **workload**-snapshots moet ≤2.000 ms blijven, met nul onverwachte HTTP-/browser-/Realtime-fouten en volledige integriteit. De bestaande stopgrens >3 s over de laatste tien volledige snapshots blijft actief, evenals alle target- en foutguards. De 25-sessiesmarge is vijf minuten profiel A zonder writes of extra browsers. Inspecteer servermetrics tussen runs; stop ook bij pooluitputting of aanhoudende resourceproblemen.

`realistic-capacity.json` publiceert alleen meetgegevens; `.local` bevat de ruwe samples, accounts, toegangscookies en write-state. Throughput in de nieuwe workloadvelden sluit setup/cleanup uit. De historische `summary` omvat die wel. Heapmetingen van de twee acceptatiebrowsers gebruiken geen geforceerde garbage collection; vergelijk die niet rechtstreeks met de oude GC-soak. De browser-hotspotmeting begint na de vrijgave-RPC; API-convergentie begint vóór die RPC. Sluit na afloop alle browsers/channels en de eigen metricscollector; verifieer nul server-subscriptions voordat TEST wordt vrijgegeven.

De eerste acceptatieversie controleerde alleen het participantlabel Ontgrendeld, dat al bij een pending assignment bestaat. Dat bewijst geen nieuwe browserupdate. De helper vereist nu een nieuwe mobiele group_clues-response met released-status én het verdwijnen van de pending jurykaart. Het oorspronkelijke meetbestand blijft intact; dit ontbrekende bewijs is afzonderlijk aangevuld met een korte gerichte proef op dezelfde applicatiebasis, zonder extra optimalisatie:

```powershell
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=A --clients=20 --seconds=120 --out=acceptance-browser-background
# Na bevestiging dat alle twintig API-clients geabonneerd zijn, in tweede terminal:
node tests/performance/browser-release-check.mjs --allow-hosted
```

Deze aanvullende browserproef gebruikt één nieuwe fictieve clue/assignment en één juryvrijgave via UI; saldi blijven gelijk, precies één release-auditregel. Twee browsers bovenop twintig API-clients. De end-to-endtijd loopt vanaf de UI-klik tot de participant de released-rij heeft verwerkt in zijn netwerkresponse en de jurykaart is verdwenen. Geen nieuwe volledige soak of capaciteitstrap; de afzonderlijke meetbestanden documenteren de aanvulling.

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

## Historisch hosted draaiboek — stressonderzoek van 29 september

Onderstaande hoge treden zijn historische onderzoeksinstructies, geen huidig acceptatie- of pre-eventprotocol. De actuele opdracht gebruikt uitsluitend de twintig-/25-sessiestests hierboven.

1. Laat de operator bevestigen dat **CSI HIT TEST `ksnagauoufsriwplvvtd` ACTIVE_HEALTHY** is. Verifieer dit in de control plane vóór iedere run. Bespreek het korte IScout-venster; de scripts veranderen geen projectstatus.
2. Controleer schema/migrations met de bestaande databaseprocedure. Geen Productiondata kopiëren, geen blinde migration-history-repair. Alleen ontbrekende, gereviewde TEST-migraties toepassen.
3. Bewaar correcte TEST-credentials in genegeerde `.local/hosted-backend.json`; zet `CSI_BACKEND=hosted`. Draai `node tests/backend/setup-hosted.cjs`. `test:recovery:setup` is uitsluitend lokaal; controleer het bestaande hosted recoveryschema read-only. Controleer database-marker en `game_mode=test`.
4. Provision uitsluitend fictieve fixtureaccounts. Voer `test:db` uit en herstel daarna met `setup-hosted.cjs` én `test:security:setup` vóór `test:security`; de core-reset verwijdert ook securityfixtures. Voer vervolgens `test:recovery:db` uit en herstel beide fixtures opnieuw. Een falende baseline betekent geen loadtest. Meet eerst de kleine fixture apart; daarna `node tests/performance/seed-hosted.cjs --allow-hosted`, controleer aantallen/saldo en meet de grote fixture. Geen seed tijdens een loadrun.
5. Stel alleen branchspecifieke Preview-variabelen in op TEST; push `hardening/performance-scale`. Verifieer Preview READY, exacte commit en TEST-ref in build. Bewaar geverifieerde Preview-URL/branch in `.local/preview.json`; browserauthstate blijft lokaal. Zet `CSI_PREVIEW_BRANCH=hardening/performance-scale`. Geen main-merge of Productiondeployment.
6. Draai onderstaande stappen sequentieel. Inspecteer tussen stappen Supabase REST-/Realtime-/databasegrafieken, errors en quota. Een script kan control-planemetrics niet zelfstandig bewijzen. Stop bij stijgende disconnects, poolerwachttijd, resource-uitputting of budgetoverschrijding, ook als de process-exitcode nul is.

```powershell
# 12 minuten meetduur, plus setup; stopt bij de eerste mislukte trede.
node tests/performance/ramp.cjs --allow-hosted
# Alleen op de laatste gezonde trede; begin schrijftest bij 10.
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=C --clients=10 --seconds=120 --writes --out=hosted-writes-10
# Herhaal writes bij 25/50 uitsluitend als vorige trede en quota gezond zijn.
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=B --clients=10 --seconds=120 --reconnect --out=hosted-reconnect-10
# Apart: representatieve reads tijdens browser-E2E; géén gelijktijdige andere writes.
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=A --clients=10 --seconds=300 --out=hosted-e2e-background
# In tweede terminal: relevante E2E/browser suites tegen geverifieerde TEST Preview.
# Na gezonde ramp/E2E: 15-minutensoak op de gekozen veilige trede.
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=A --clients=10 --seconds=900 --out=hosted-soak-10
```

Ramp: 5 → 10 → 25 → 50 → 75 → 100; per trede 120 s. B tot 50, D daarboven. Stop vóór verdere verhoging zodra p95 snapshot >3 s of requests fouten vertonen. Honderd is een bovengrens, geen doel dat koste wat kost bereikt moet worden. De rampwrapper begrenst iedere korte trede op 330 seconden; de workloadwatchdog begrenst langere duurproeven afzonderlijk. Hard-limit, resource-exhaustion of integriteitsfout betekent afbreken en rapporteren, niet automatisch plan upgraden.

Meet per trede p50/p95/p99, requests/s, bytes, errors, joins, eventdelivery, hotspot-convergentie en admin/jury afzonderlijk. API-metingen omvatten response-bodymeting en lokale clientoverhead; gebruik daarnaast hosted querylogs. Throughput in de JSON-samenvatting gebruikt de totale run inclusief login/cleanup; `loadDurationSeconds` geeft de eigenlijke workloadduur. Kleine aantallen snapshots geven weinig betrouwbaar p99-bewijs.

Voer daarna mobiele browser-E2E met latency uit onder gezonde achtergrondload; controleer oorspronkelijke rollen, mutationfeedback en reconnect. Controleer na de soak channel counts, memorytrend, p95 per tijdvak en serverlogs/advisors. Hosteddetails en gecontroleerde metrics toevoegen aan het rapport. Capaciteit pas vaststellen als reads, writes, Realtime én browsergedrag op dezelfde trede slagen.

De browserprofiler kan de geverifieerde TEST Preview gebruiken met `CSI_BACKEND=hosted` en `node tests/performance/browser-profile.cjs hosted normal a,suspect,jury,admin --allow-hosted` (ook `4g`/`slow`). Hij verifieert buildmetadata en de gebundelde TEST-URL vóór login en schrijft uitsluitend lokale meetbestanden. De volledige E2E-suite met logout/accountwissels hoort buiten de gedeelde-accountload: globale logout kan de andere sessies bewust intrekken. Kies onder load de niet-destructieve spelacties; geen reset, herstel of membershipwijziging tegelijk met de integriteitsproef.

`hosted-stage.cjs` gebruikt de ingelogde Supabase CLI (`CSI_SUPABASE_CLI` of `supabase`) om vóór elke run de TEST-status opnieuw te controleren. `node tests/performance/server-metrics.cjs --allow-hosted --samples=30` verzamelt maximaal één uur Metrics API-samples, één per minuut, uitsluitend van TEST. CPU is de delta van de aangeboden node-counters; dit is geen dedicated-CPUgarantie. Ruimteseries, poolwachttijd/timeouts en Realtime-tabelbindings blijven in lokale ruwe bestanden. `node tests/performance/soak-browser.cjs --allow-hosted --seconds=900` observeert daarnaast één echte adminbrowser, met minuutmetingen van sockets/DOM en heap na expliciete garbage collection. Tel die browser bovenop de API-sessies. `summarize-hosted.cjs` exporteert alleen gesanitiseerde meetgegevens naar `docs/performance/hosted-measurements.json`.

De grote hosted seed voegt een deterministisch gegenereerde private PNG van 480.613 bytes toe (400 × 400 fictieve ruispixels). Hiermee wordt bestandsoverdracht in dezelfde orde als de geïnventariseerde Productionfoto gemeten, zonder productiecontent over te nemen. Het model bewijst geen rendering van zeer hoge-resolutiefoto's. Herstel `test:security:setup` voordat tests draaien die specifiek `security/own.png` verwachten.

`seed-hosted.cjs --allow-hosted --cleanup` verwijdert uitsluitend de deterministische grote fixture-IDs en de eigen synthetische foto op geverifieerde TEST. De willekeurige run-IDs van loadwrites blijven behouden. `--photo-only` zet alleen de fictieve foto terug voor mobiele metingen met de kleine dataset. Een voortijdig gestopte schrijftest telt nooit als volledige integriteitsproef: de tool controleert de afgeronde writes apart, vereist alle zes acties plus convergentie voor succes en bewaart de runstate lokaal voor inspectie.

Verwachte hosted sessie: **45–60 minuten**, inclusief ramp, gerichte writes/reconnect, E2E en 15-minutensoak; setup-/herstelproblemen kunnen dit verlengen. Meld zodra gehost werk klaar is dat TEST weer gepauzeerd en IScout hervat kan worden. Geen automatische statuswisseling.

## Korte check vóór Pasen 2027

Op opnieuw geverifieerde TEST: normale fictieve fixture en functionele login/pegel-smoke, daarna tien sessies profiel A gedurende drie minuten met zes begrensde writes, Realtime-hotspot en reconnect:

```powershell
node tests/performance/hosted-stage.cjs --target=hosted --allow-hosted --profile=A --clients=10 --seconds=180 --writes --reconnect --out=pre-event-10
```

Laat één mobiele browser meelopen voor bruikbaarheid en private foto; rapporteer die als elfde sessie. Vergelijk workload-p95 (streef ≤2 s), errors, integriteit en hotspot met de twintiggebruikersbaseline. Controleer actuele quota/plan, datasetomvang en verwachte apparaten/tabs. Stop bij regressie; niet opschalen en geen load op Production. Deze korte check signaleert veranderingen vlak vóór Pasen 2027 en vervangt geen nieuwe acceptatie bij wezenlijk gewijzigde code, data of infrastructuur.
