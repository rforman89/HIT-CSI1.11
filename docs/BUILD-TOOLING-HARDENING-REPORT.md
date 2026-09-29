# CSI HIT — Technical Maintenance & Build Hardening

Datum: 29 september 2026. Branch: `maintenance/build-tooling-hardening`.

## 1. Executive summary

CRA vervangen door een minimale Vite-buildketen. Dezelfde React 19.2.8, React DOM 19.2.8 en Supabase 2.105.4 blijven in gebruik. Geen componentarchitectuur, domeinlogica, CSS, serverless handler of autorisatieregel gewijzigd. Node 24 LTS, één lockfile, één offline quality gate en GitHub Actions maken installatie en verificatie zelfstandig reproduceerbaar. Een lege lokale applicatiedatabase speelt de bestaande basis plus 13 migrations af; de 790 gecontroleerde catalogusonderdelen zijn gelijk aan Production.

Production is alleen gelezen. CSI HIT TEST is INACTIVE en niet hervat. Geen merge, productie-instellingen, migration, Auth-, Storage- of dataschrijfactie op Production uitgevoerd.

## 2. Baseline versus eindtoestand

Bij aanvang bevestigen lokale HEAD én `git ls-remote origin refs/heads/main` commit `650a2cf9ee5693179aa98d1385dd28d9cb5b2db4`. De werkmap was schoon. De actuele Productiondeployment is `dpl_BvMcgdpPWc296d1ffQ15qjpsWcV3`, READY, met dezelfde Git-SHA.

| Onderdeel | Baseline | Eindtoestand |
|---|---|---|
| Lokale Node/npm | 24.19.0 / 11.17.0 | Geteste standaard 24.21.0 / 11.19.0 |
| Node engine | 24.x, dashboard 20.x | 24.x; `.nvmrc`/CI 24.21.0; dashboardreleasepunt |
| Build | CRA/react-scripts 5.0.1 | Vite 8.3.1 + React-plugin 6.1.1 |
| Test | CRA/Jest, standaard watch | Vitest 5.0.2 + bestaande Node-tests; eindig |
| Lint | Impliciete CRA ESLint + TS-parser; groen | Expliciete ESLint 10.11.0, zelfde no-undef-gate; groen |
| Install | Legacy peers; Vercel npm install | npm ci, engine-strict, exact direct versions |
| Audit | 36: 18 high / 9 moderate / 9 low | 0 critical/high/moderate/low |
| Fresh database | Legacybasis niet vanzelf in rootreeks | Veilige lokale lege-DB-proef + driftvergelijking |
| CI | Geen workflow | Eén read-only Actions-job, zonder backendsecrets |

Machineleesbaar bewijs staat in [build-hardening](build-hardening/): audit vóór/CRA-alternatief/na, dependencytrees, bundlemetingen en tijden. De oorspronkelijke package.json/lockfile zijn exact terug te halen via de genoemde baselinecommit; lokale ongewijzigde kopieën zijn aanvullend bewaard.

## 3. Node — besluit

**ADR Node:** behoud Node 24 als enige major en pin de actuele geteste LTS-patch 24.21.0 voor development/CI. npm 11.19.0 hoort bij deze Node-distributie. Node 26 is nog Current; een tweede major levert hier geen voordeel. [Node releasebeleid](https://nodejs.org/en/about/previous-releases), [Vercel Node-versies](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Vite vereisten](https://vite.dev/guide/).

Vercel beheert de beschikbare patch binnen 24.x. De gedeelde dashboardwaarde 20.x is bewust niet gewijzigd in deze Work-run; engines wint. Bij release dashboard gelijkzetten en de feitelijke buildlog controleren. De lokale machine-installatie is niet overschreven: de aanvullende 24.21.0-proef gebruikt een lokale officiële distributie met geverifieerde SHA-256.

## 4. Buildtool — besluit

**ADR Buildtool:** Route A is werkelijk doorgerekend met een kopie van de baseline-lockfile: compatibele `npm audit fix --package-lock-only --ignore-scripts`, zonder force. Dat reduceert 36 naar **28** findings: 14 high, 5 moderate, 9 low. De oude SVG/PostCSS/webpack-dev-server/Workbox/Jest-ketens blijven. Verdere majors onder CRA overriden vergt een eigen onderhouds- en compatibiliteitslaag.

Route B verandert één HTML-entrypoint, de scripts/configuratie en de testadapter. `App.js` en `index.js` zijn inhoudelijk ongewijzigd naar `.jsx` hernoemd. Geen routerpakket, service worker/PWA-build, SVG-componentloader of CSS-modules aangetroffen. De oorspronkelijke env-namen blijven via een exacte allowlist behouden; alle andere process-env blijft server-only. `build` blijft de outputmap. `/api`, cron, CSP en alle overige headers blijven behouden. SPA fallback sluit assets en API-routes uit. React-plugin gebruikt automatische JSX zoals de bestaande build.

Vite is gekozen omdat de legacy ketens verdwijnen, de code-impact beperkt is en echte lokale regressies beschikbaar zijn. Geen nieuwe applicatiearchitectuur. Browsers krijgen expliciete syntaxdoelen, geen toevallige standaardverschuiving.

## 5. Dependencies en advisories

| Audit | Critical | High | Moderate | Low | Totaal |
|---|---:|---:|---:|---:|---:|
| Ongewijzigde baseline | 0 | 18 | 9 | 9 | 36 |
| CRA + compatibele fixes | 0 | 14 | 5 | 9 | 28 |
| Vite-eindketen | 0 | 0 | 0 | 0 | 0 |

Ook `npm audit --omit=dev` is nul. `npm ls --all` sluit zonder ontbrekende/ongeldige dependencies. Dit is een registry-advisorymomentopname, geen bewijs dat alle code foutloos is. [Analyse per advisory](build-hardening/ADVISORIES.md) behandelt bereikbaarheid, direct/transitive, runtime/build/test en breaking risico. Geen force-fix gebruikt.

## 6. Direct dependencies — volledige inventaris

| Package | Baseline resolved | Gebruik/bewijs | Besluit |
|---|---|---|---|
| @supabase/supabase-js | 2.105.4 | Runtime src/supabase.js; tests/recovery CLI | Ongewijzigd exact |
| react | 19.2.8 | Componentimports | Range → exact, versie gelijk |
| react-dom | 19.2.8 | src/index.jsx createRoot | Range → exact, versie gelijk |
| react-scripts | 5.0.1 | start/build/test/eject en envloader | Verwijderd, Vite/Vitest |
| ajv | 8.20.0 | Geen app/test/scriptimport; legacy CRA schema-validatie | Direct workaround weg met CRA; moderne ESLint heeft eigen transitive AJV |
| loader-utils | 3.2.1 | Geen directe import; webpack-loader-hulp | Direct dependency verwijderd met webpack |
| @types/react | 19.0.0 | Geen TS/TSX frontend of typecheckscript | Verwijderd; geen consumptie in eigen code |
| @types/react-dom | 19.0.0 | Idem | Verwijderd |
| typescript | 5.7.2 | Geen frontend-tsconfig/tsc-script; Edge TS draait via Deno | Verwijderd uit npm; Edgefunctie ongewijzigd |
| playwright | 1.63.0 | Bestaande browsertests importeren deze | Ongewijzigd exact |
| vite | — | Nieuw build/dev/envloader | 8.3.1 dev |
| @vitejs/plugin-react | — | React JSX/devtransformatie | 6.1.1 dev |
| vitest | — | Bestaande 39 testcases; één expliciete vi-as-jest-import | 5.0.2 dev |
| jsdom | — | sessionStorage/browseromgeving frontendtests | 30.1.1 dev |
| eslint | Voorheen transitive | Expliciete lint-CLI | 10.11.0 dev |
| globals | Voorheen transitive | Browser/testglobal-definities lint | 17.12.0 dev |

De drie runtimedependencies zijn apart van de zeven devdependencies geplaatst. Alleen aantoonbare imports, scripts en configuratieconsumenten bepalen deze indeling; geen package is enkel op een 'unused'-heuristiek verwijderd.

## 7. Build

Baseline `npm run build`: **80,132 s** wall-clock, exit 0. Vite `npm run build`: **0,879 s** wall-clock (Node 24.21.0, inclusief npm/startup); compilatie circa 0,2–0,5 s. Exacte meting staat in `build-after-time.json`. Tijden zijn machine-/cacheafhankelijk en geen performancebelofte. Node 24.19 CRA meldde fs.F_OK-deprecatie; de vervangende keten meldt die niet.

## 8. Tests

Actuele lokale resultaten vóór de afsluitende fresh-clone-proef:

| Suite | Geslaagd |
|---|---:|
| Frontend reliability/security (Vitest) | 39 |
| Offline config/tooling/recovery-unit/cron/privacy | 38 |
| Core database | 28 |
| Security API/RLS/Storage/Realtime + Auth/privacy | 31 |
| Recovery database | 21 |
| Echte backuphandler met lokale services | 6 |
| Bestaande browser-E2E | 22 |
| Securitybrowser | 8 |
| Recoverybrowser | 2 |

Privacy (4) zit zowel in offline als security: **191 unieke runner-tests**, geen dubbele optelling. De 22 E2E-tests bevatten 48 responsive scenario's. De aanvullende read-only build-smoke heeft 16 layouts en wordt niet als 16 extra runner-tests meegeteld. Database-build/seed/drift zijn afzonderlijke bewijsopdrachten.

Een eerste securityrun na een reset vond ontbrekende fixturebestanden; opnieuw voorbereiden met de bestaande securitysetup gaf 31/31. Dit is een fixturevolgorde-eis, gedocumenteerd in de testmatrix. Geen productcodefix of onderdrukte assert. De oude handler-suite vereist echte lokale services en is daarom nadrukkelijk buiten de offline gate gehouden.

Hosted TEST-tests zijn niet herhaald: backend blijft gepauzeerd. De nieuwe build raakt geen SQL of backendimplementatie; lokale echte Auth/Storage/RLS en browserflows plus read-only Preview vormen de acceptatieroute. Geen claim van nieuwe hosted schrijftestresultaten.

## 9. CI / quality gate

`npm run check`: lint → unit/statische tests → volledige repositorycredentialscan → diffcheck → offline build → bundlecontrole. De scan hangt niet meer aan een oude Git-commit en werkt in een depth-1-checkout. Dummy-config overschrijft lokaal aanwezige envwaarden; secret-sentinels testen de public allowlist. Geen netwerk nodig behalve dependency-installatie en de aparte npm audit.

Actions: push/PR, Ubuntu hosted runner, 15-minutentimeout, concurrency cancellation, contents:read, geen persistente Gitcredentials, checkout/setup-node op gecontroleerde commits gepind. Geen deployjob, geen Productionsecrets. Standaard Actions op deze publieke GitHub-repository; geen betaald plan of billinginstelling gewijzigd.

## 10. Fresh clone

Geslaagd op commit `a594c08`: nieuwe depth-1-clone, zonder `.local`, `.env.local`, node_modules of Vercelcache bij aanvang. Node 24.21.0/npm 11.19.0: `npm ci` **5,095 s**, `npm run check` **21,590 s**, beide exit 0; 39 frontend + 38 offline tests, lint/secrets/diff/build/bundle groen. De clone blijft Git-schoon. Ook de databaseproof draait vanuit deze clone zonder bestaande testconfig: 14 SQL-bestanden, tweemaal seed, 790/790 catalogusonderdelen gelijk aan Production. Een eerdere proef ving een nog niet gecommitteerde vercel.json op; die is toegevoegd vóór de geslaagde nieuwe clone.

## 11. Database migration inventory

Alle onderstaande bestanden staan in Git. Productionhistorie is op 29 september read-only uitgelezen. 'Objecten aanwezig' betekent dat de complete gereplayde catalogus gelijk is; dit bewijst niet dat een historische data-normalisatie opnieuw nodig is of exact dezelfde statementtekst geregistreerd staat.

| Repo migration | Production history | TEST history nu | Objecten aanwezig |
|---|---|---|---|
| 20260730061759 restrict_clue_file_visibility | Zelfde versie/naam | Niet uitleesbaar, paused | Ja |
| 20260730061816 lock_down_clue_files_storage | Zelfde | Niet uitleesbaar | Ja |
| 20260730061831 fix_clue_view_trigger_search_path | Zelfde | Niet uitleesbaar | Ja |
| 20260730062723 remove_suspect_photos_listing_policy | Zelfde | Niet uitleesbaar | Ja |
| 20260730063136 exact_match_clue_file_path | Zelfde | Niet uitleesbaar | Ja |
| 20260730064457 normalize_legacy_clue_file_paths | Zelfde | Niet uitleesbaar | Schema ja; data niet onderzocht |
| 20260730071644 csi_security_and_backup_hardening | Ontbreekt als registratie | Niet uitleesbaar | Ja |
| 20260730141606 fix_group_clues_suspect_policy | Ontbreekt als registratie | Niet uitleesbaar | Ja |
| 20260923150822 core_reliability | 20260923175443, zelfde naam | Niet uitleesbaar | Ja |
| 20260923172139 admin_suspect_photo_select | 20260923175458 | Niet uitleesbaar | Ja |
| 20260923182309 backup_restore_operations | 20260923195452 | Niet uitleesbaar | Ja |
| 20260928182236 security_roles_product | 20260928200824 | Niet uitleesbaar | Ja |
| 20260928192617 security_advisor_refinements | 20260928200837 | Niet uitleesbaar | Ja |

De eerdere lokale TEST-manifestcapture registreert de historische basis en eerste tien rootmigrations; eerdere releaserapporten bewijzen latere TEST-validatie. Dit is historische informatie, geen vervanging voor een actuele TEST-query. De actuele query gaf connection timeout; status bleef INACTIVE.

## 12. Reproduceerbaarheid database — besluit

**ADR Migration strategy:** bewaar de uitgegeven incrementele migrations en hun bytes. Gebruik de bestaande ontbrekende legacybasis als expliciete eerste stap op een lege Supabase-applicatiedatabase. Geen nieuwe enorme productiedump of datakopie; geen hernoeming waarmee history ten onrechte consistent lijkt. [Canonical database-instructies](../supabase/bootstrap/README.md).

De proof gebruikt een nieuwe database met template0 binnen de geïsoleerde lokale CSI-container, schema-only Supabase-platformobjecten, vastgelegde platformdefaults, legacybasis, alle 13 migrations in volgorde en tweemaal de deterministische fictieve seed. De proof verwijdert alleen zijn eigen tijdelijke database. Deze methode veronderstelt een geïnstalleerd Supabase 17-platform; zij pretendeert geen Auth/Storage-platform uit applicatiecode na te bouwen.

## 13. Schema drift

790 verwachte catalogusonderdelen, 790 Productiononderdelen, **0 verschillen**. Vergelijking omvat public/private relations/kolommen/views/functies/RLS/policies/indexes/constraints/triggers/browser- en servicegrants, Storage-policies/buckets en Realtimepublicaties. CRLF/LF wordt genormaliseerd; SQL-inhoud niet. Comparator geeft exit 1 bij echte verschillen. Productiedata, users en objectnamen worden niet opgehaald.

Platform/Auth-config, Edge-deployment en cron zijn geen applicatieschema en worden niet door deze comparator gedekt. Bestaande migratiehistory-afwijkingen blijven expliciet zichtbaar; geen Production repair uitgevoerd.

## 14. Git/deployment hygiene

Één npm-lockfile; legacy peer escape verwijderd. `.local`, envfiles, authstate, backup/testartefacten, build/dist, browserprofiles, logs en coverage blijven genegeerd voor Git en Vercel. Editor-/Windowsartefacten toegevoegd. SQL en tooling krijgen expliciete LF-regels; uitgegeven migrations worden niet inhoudelijk aangepast. Secretscan onderzoekt alle tracked/new files en detecteert service-JWT/private-key/tokenpatronen. Hashes in audit/lockfiles zijn geen credentials.

## 15. Vercel Preview

Git Preview **READY** op commit `fdfd5093bfc2cb62c3c9e2f2440ec2d3ffbfedf2`: [gevalideerde Preview](https://hit-csi-1-11-1kt3pfn15-rforman89s-projects.vercel.app). Buildlog bevestigt `npm ci`, Vite, output build en Node 24.21.0; Vercel Build Completed 7 s. [GitHub Actions](https://github.com/rforman89/HIT-CSI1.11/actions/runs/36579573936) controleert dezelfde branch zonder secrets. De oorspronkelijke branchpush werd door de buildguard geblokkeerd omdat Vercel de nieuwe branch pas na die push accepteerde voor env-overrides. Daarna zijn uitsluitend vier Preview-branchvars toegevoegd en heeft de volgende Git-push groen gebouwd.

De beschermde Preview is met een tijdelijke geautoriseerde toegangscookie getest; deployment protection is behouden. Chromium: 16 viewports, landing/login, direct URL, hard refresh, contenthash-assets, metadata, CSP, 401 op ongeautoriseerde API en 404 voor ontbrekende assets/.local. Nul browserfouten of backendrequests. [Machinebewijs](build-hardening/preview-smoke.json). Geen lokale upload of Productiondeployment. Latere rapport-/testharnesscommits veranderen de applicatie niet; de laatste branchbuild wordt vóór afsluiting opnieuw op READY en browser-smoke gecontroleerd.

## 16. Environment/config

Volledige canonical lijst en scopes staan in [README](../README.md). De oorspronkelijke Vercel-global Preview URL/key delen Productionwaarden; branchspecifieke TEST-overrides zijn dus vereist. Oude core/backup/security-branchvars zijn alleen geïnventariseerd, niet opgeruimd. Server-only URL/servicekey/cronsecret bestaan alleen voor Production. Geen gevoelige frontendvariabele toegevoegd. Root `supabase/config.toml` gebruikt nu een herkenbare lokale project-ID; expliciete hosted refs blijven alleen in guarded tooling/configuratie.

## 17. Bundle

Baseline JS: **652.157 bytes**, gzip **166.062**; CSS **462**, gzip **287**; totale output **3.647.331 bytes**, inclusief sourcemaps. Vite: circa **607,6 kB JS**, gzip **160,8 kB**; CSS **401**, gzip **243**; totale output circa **688,7 kB**. Exacte laatste bestanden staan in de bundle-JSON. Geen onverwachte groei; totalereductie komt vooral door geen maps, JS daalt circa 6,8% raw / 3,1% gzip. Geen chunksplitsings-/performanceproject gestart. Een echte browser heeft ook de oude CRA-Productionclient geladen en een deploywissel naar Preview uitsluitend binnen zijn request-router gesimuleerd: geladen login bleef bedienbaar, hard refresh haalde de nieuwe Vite-entry; nul backendrequests/fouten. Zie `tests/browser/deployment-transition.cjs` en het bijbehorende machinebewijs. Er is geen externe alias omgezet.

## 18. Securityregressie, assets en browsers

CSP en overige beveiligingsheaders zijn behouden. De echte lokale browser valideert CSP, iframeblokkade, escaped user content, private signed photos, fonts, afbeeldingen, exports, rollen, pegels en backup/diagnostiek. Geen onverwachte JS/Reactfouten in geslaagde suites. Viewport-fit en public-directory blijven behouden. Moderne Chromium is werkelijk getest; daarnaast slaagt WebKit lokaal op dezelfde 16 landing/login-layouts en hard refresh. De smoke wacht op fonts/netwerk en twee frames na viewportwijziging; een directe meting vóór WebKit-layoutsettling gaf aanvankelijk een vals overflowresultaat. Firefox kon op deze Windows-host niet starten (`spawn UNKNOWN`), dus daarvoor geen geslaagde browserclaim. Echte fysieke iOS/Android-apparaten zijn niet getest.

Baseline genereert sourcemaps; Vercel `protectedSourcemaps=true`, externe ongeauthenticeerde mapprobe gaf 403. Nieuw beleid: geen openbare maps genereren, ook niet als toekomstige hostingprotectie wijzigt. Debug via Git-release-ID en lokale builds; geen extra monitoringplatform. Metadata bevat alleen release, environment, buildtool en Node-versie, bewust geen timestamp voor minder nondeterminisme.

## 19. Documentatie

README vervangt de CodeSandbox-placeholder; testmatrix scheidt targets; database-bootstrapdocument bevat reproduceerbare volgorde en driftcommando's; advisorymatrix en machineleesbare voor/na-evidence ondersteunen dit rapport. De drie ADR's staan kort bij Node/buildtool/migration strategy. Bestaande operationele runbooks blijven leidend.

## 20. Productiestatus

Eindcontrole: GitHub `main` blijft `650a2cf9ee5693179aa98d1385dd28d9cb5b2db4`; Productiondeployment blijft `dpl_BvMcgdpPWc296d1ffQ15qjpsWcV3`. Gedeelde Vercel Node/framework/build/install/output/sourcemapsettings en alle Production-envrecords zijn ongewijzigd. Herhaalde read-only schemacapture blijft 790/790 gelijk. CSI HIT TEST is nog INACTIVE. Geen Auth-/Storage-instellingen of echte gebruikersdata gewijzigd. [Paritybewijs](build-hardening/production-parity.json).

## 21. Resterende technische schuld

**Vóór Pasen 2027:** tijdens afzonderlijke release-review gedeelde Vercel-dashboardwaarden gelijkzetten; reguliere Node/dependency-audits herhalen; historisch migratiehistory-repairplan maken vóór ooit een hosted db push; fysiek mobiel testen bij spelrepetitie. Supabase kondigt Postgres 17.11-platformupdates aan; upgrade-impact op extensions/operators afzonderlijk beoordelen, geen platformupgrade in deze scope.

**Later:** oude branchgebonden Preview-envvars opruimen wanneer hun branches definitief klaar zijn; minimale lintset eventueel apart verbreden; hosted schema-capture bij hervatting TEST herhalen.

**Bewust geaccepteerd:** geen service worker, geen IE, geen publieke sourcemaps, audit is een momentopname, Vercel kan binnen Node 24.x een andere ondersteunde patch gebruiken. Eerdere advisors zijn geen nulmeting: security 12 intern geautoriseerde definers + uitgeschakelde leaked-password protection; performance 9 initplan/19 multiple-policy/2 duplicate-index WARN, 8 unindexed-FK/4 unused-index INFO volgens vorige securityrelease. Geen RLS-/indexrefactor of Auth-planwijziging binnen deze opdracht.

## 22. Conclusie

**Gereed voor production-review.** Schone installatie/build, 191 unieke lokale runner-tests, databaseopbouw met seed en driftcontrole, CI en read-only Preview zijn bewezen. Hosted TEST blijft gepauzeerd; de historische migratieregistratie en gedeelde Vercel-dashboardwaarden blijven expliciete release-reviewpunten. Dit is geen toestemming voor merge of Productionrelease.
