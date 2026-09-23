# Productierelease — 23 september 2026

De functionele release uit commit `5e7f9878b2be520d0fc5741c59354670eb046357` is via fast-forward op main gebracht en in Production uitgerold. Operationsmigratie `backup_restore_operations` is toegepast als serverversie `20260923195452`; de Edge Function is versie 3. De eerste Production deployment is `dpl_24xSnwRmTtYcsHQNzPfeDZgAXbaf` (Ready).

Alle 16 bestaande applicatiedatasets bleven inhoudelijk identiek, evenals 10 accounts, 8 spelbestanden en spelmodus TEST. Eén server-side portable backup is geslaagd: `70e6c309-dc8b-439c-bccb-41ebe5bc93c6`, 20 exportdatasets (17 applicatiedatasets), 8 bestanden, geldig manifest en gecontroleerde download. Geen restore of kunstmatige spelmutaties op Production. Backupinhoud is niet lokaal opgeslagen.

Hercontrole: 74 lokale tests en build groen; productie-smoke 38 layoutscenario's en 18 aanvullende controles groen. Geen console-/netwerkfouten in deze flows. Echte productielogins en ingelogde adminweergaven zijn zonder beschikbare productie-inloggegevens niet uitgevoerd; hun eerdere gehoste acceptatiebewijs blijft van toepassing op de functioneel identieke code. Health en rechten zijn daarnaast read-only in een SQL-rolcontext gecontroleerd. De productiebackup is geregistreerd in backup_runs; operation_audit is voor spelmutaties en is niet met een kunstmatige actie gevuld.

CSI HIT TEST en IScout zijn tijdens de productierelease niet aangeraakt. De onderstaande ontwikkelcheckpoints zijn historische verslagen; hun uitspraken over ontbrekende hosted acceptatie of releasegoedkeuring zijn inmiddels achterhaald. De runbooks zijn bijgewerkt naar de productiesituatie, zonder wijzigingen in applicatiecode of migrations.

---

# Hosted vervolg � 23 september 2026

CSI HIT TEST (`ksnagauoufsriwplvvtd`) is v��r alle writes als ACTIVE_HEALTHY gecontroleerd. De operationsmigratie en Edge Function zijn uitsluitend daar toegepast. De eerste echte wipe/restore slaagt: 17/17 datasets, 2/2 bestanden en 6/6 accounts, met drie werkende API-rol-logins. De hosted suites slagen: 28 database/RLS-tests, 21 recoverytests en 6 tests tegen de werkelijk gedeployde Edge Function.

De hosted test vond een verschil tussen de servicecredential van de gateway en de runtime. De handler valideert alternatieve servicecredentials via PostgREST-signatuurvalidatie �n de service-only EXECUTE-grant van een read-only RPC. Een gedecodeerde claim is nooit voldoende. Ontbrekende/vervalste/anon credentials en onbevoegde rollen worden getest.

Advisors: geen ERROR; bestaande performancewaarschuwingen blijven 10 RLS-initplan, 19 overlappende policies en 2 dubbele indexen. De twee nieuwe security-advisories voor `backup_health` en `record_client_diagnostic` zijn beoordeeld: bewust aangeroepen door authenticated, met respectievelijk admincontrole en vaste actor/allowlist/rate limit. Alle andere nieuwe RPCs zijn service-only. Het ongebruikte auditindex-advies is informatief bij deze kleine testset. Historische onderhoudspunten blijven buiten scope.

Preview-validatie volgt op de branchcommit. De definitieve meetwaarden, Preview-URL en volledige resultaten worden in het opleverrapport van deze run vastgelegd. Production wordt niet gemigreerd, gedeployd of gewijzigd. Onderstaand document bewaart het **eerdere lokale checkpoint**; uitspraken over gepauzeerd TEST en ontbrekende hosted validatie beschrijven dat eerdere moment.

---

# Backup, restore & game-day operations — checkpoint

Datum: 23 september 2026. Repository: HIT-CSI1.11.

## 1. Executive summary

**Klaar voor hosted restore drill – CSI HIT TEST moet worden hervat.**

De lokale implementatie is gebouwd en gecontroleerd. Een echte lokale Supabase-database is gewist en vanuit de portable bundle teruggebracht: **17/17 applicatiedatasets, 3/3 bestanden en 4/4 accounts**, gevolgd door werkende browserlogins voor admin, deelnemer en verdachte. Een afzonderlijke echte Auth-proef verwijdert een fictief account, maakt het met een nieuwe UUID opnieuw aan en controleert groepskoppeling en login.

Er zijn **124 geslaagde runner-tests**: 70 bestaande en 54 nieuwe. De 22 bestaande browsertests omvatten 16 functionele flows en zes groepen van acht schermformaten (48 responsive controles). Daarnaast is de afzonderlijke volledige drill met drie browserrollen uitgevoerd. Build, ingebouwde lintcontrole, Node-syntaxchecks, migration-bootstrap, diffcontrole en credentialscan slagen.

Dit is nog geen gehost herstelbewijs. Supabase meldt voor CSI HIT TEST `ksnagauoufsriwplvvtd` **INACTIVE**, ook bij de eindcontrole. Conform fase 28 zijn geen gehoste writes, projecthervatting, push, Preview of productierelease uitgevoerd.

## 2. Bestaande backup versus nieuwe oplossing

| Onderdeel | Bestaand | Nieuw |
|---|---|---|
| Cron | 01:30 UTC, alleen LIVE | Zelfde frequentie; onderhoud ook in TEST |
| Tabellen | 14, eerste API-pagina | 17 applicatiedatasets + 3 identiteits/Storage-inventarissen; vastgelegde aantallen, pagina's van 500 en eindcontrole |
| Consistentie | Losse tabelqueries | Eén STABLE MVCC-databasesnapshot, daarna pagina's uit onveranderlijke staging |
| Naam | Dagdatum, upsert | Unieke UUID, geen overschrijven, idempotente actie-ID |
| Storage | Alleen databaseverwijzingen | Bytes, metadata, hashes en referentiecontrole |
| Auth | Geen expliciet herstelpad | Minimale identiteitsexport en gecontroleerde UUID-mapping/recreatie |
| Fouten | HTTP-fout, geen duurzame pogingstatus | Vooraf geregistreerde poging; running/success/failed/skipped_test; timeoutdetectie |
| Restore | Niet aangetroffen | Guarded CLI + atomaire DB-import + Storage + inhoudsverificatie |
| Externe kopie | Geen volledig pad | Admin-download en CLI-export van dezelfde zelfstandige bundle |

De productie-Edge Function is read-only vergeleken met de lokale oude bron. De bucket `backups` is privé, 50 MiB, application/json. Er waren twee oude backupobjecten; laatst geregistreerde objectcreatie 16 juni 2026. Dat is een inventarisatiefact, geen claim over actueel LIVE-gebruik of een geslaagde recente backup.

## 3. Backupformaat

[BACKUP-FORMAT.md](BACKUP-FORMAT.md) specificeert manifest, twintig datasets, checksums, bestandbytes, limieten en consistentie. `backup_format_version: 2` plus `kind: csi-hit-portable` onderscheidt dit van de bestaande anders opgebouwde `format_version: 2`-JSON. Alleen complete, gevalideerde bundles tellen als succesvol. Oude v2-bestanden worden niet stil als nieuw formaat behandeld.

## 4. Datadekking

De echte Production-catalogus bevat zestien public basistabellen, alle met RLS. Alle zestien worden geëxporteerd; de nieuwe auditdataset is de zeventiende. De oude ontbrekende `suspect_users` en `settings` zijn toegevoegd. Aanwijzingen komen uit `clues_base`, niet uit de gemaskeerde view. De volledige indeling en uitzonderingen staan in het formaatdocument.

Auth-FK's: `profiles.id`, `app_settings.updated_by`, `final_reports.submitted_by` verwijzen rechtstreeks naar auth.users. Via profiles lopen groepsleden, verdachtekoppelingen, notitie-auteurs, transactiemakers en notificatieactoren/-ontvangers. Profielen verwijzen tevens naar suspects. De restorevolgorde respecteert deze relaties. Statussen, notities en toewijzingen herstellen de verhoor-/spelvoortgang.

Niet geïmporteerd: Auth-interne tabellen, sessies/wachtwoorden, backuphistorie, tijdelijke snapshots, browserdiagnostiek, eerdere herstelrapporten en oude backupbucket. Views/RLS/functies/grants/indexen komen uit de migraties. Schema- en kolomfingerprint worden gecontroleerd; dit vervangt geen afzonderlijke migratie-/policyreview.

## 5. Storage

Read-only Production-inventaris: `clue-files` privé, 7 objecten/704.048 bytes; `suspect-photos` publiek, 1 object/490.446 bytes. De bestanden zelf zijn niet gedownload of gebruikt voor ontwikkeling. Alle ontwikkel-/herstelbestanden zijn fictief.

De nieuwe bundle bewaart alle objecten uit de spelbuckets, inclusief niet meer gekoppelde bestanden. De inventaris bevat bucket, pad, grootte, MIME en updated_at; bytes hebben SHA-256. Verwijzingen zonder werkelijk bestand blokkeren de backup. Onbekende buckets/externe asset-URL's verlangen expliciete classificatie/migratie. Voor/na-inventariscontrole detecteert wijzigingen tijdens export, maar Storage is geen gezamenlijk snapshot met PostgreSQL.

## 6. Auth

Uitsluitend ID, e-mail en bevestigingsstatus worden uit auth.users gelezen. Geen wachtwoordhashes, MFA, provideridentiteiten, refresh/access tokens of sessies in de bundle.

Bestaande doelaccounts worden op ID/e-mail gecontroleerd. Nieuwe IDs worden in alle relevante applicatie-FK's vervangen. Alleen met expliciete `--recreate-accounts` mogen ontbrekende, eerder bevestigde e-mailaccounts worden aangemaakt. Geen uitnodigingen verstuurd. Voor nieuwe accounts moet de organisatie gecontroleerd nieuwe toegang regelen. Lokale test: account werkelijk verwijderd → nieuwe UUID → rol/membership terug → willekeurig tijdelijk testwachtwoord ingesteld → echte login en groep gelezen. Hosted herhaling resteert.

## 7. Portable/off-project backup

Admin → Klaar → Systeem / Backupstatus: backup starten en portable JSON downloaden. Downloadlinks zijn admin-only en 60 seconden geldig. De browserdownload is met de echte handler en lokale Storage gecontroleerd. CLI-export, offline verify en CLI-restore zijn eveneens werkelijk uitgevoerd. Geen betaalde/externe dienst toegevoegd. Het handmatig bewaren van een externe kopie blijft een organisatiehandeling; er is geen onbewezen automatische off-site garantie.

## 8. Restoretooling

`scripts/recovery/cli.mjs`: backup, offline verify en restore. Expliciete config, target, output en bevestiging `RESTORE <ref>`. Geen omgevingsfallback. Production-ref/claim wordt onvoorwaardelijk geweigerd. HTTPS-project-URL, service-keyprojectclaim, database-marker, schema en buckets worden gecontroleerd. Een toekomstige andere herstelomgeving kan alleen met bijpassend project/key/marker worden gebruikt; de drill zelf blijft beperkt tot CSI HIT TEST/lokaal.

Accounts → atomaire databasevervanging met actieve FK's → Storage → teruglezen/hashvergelijking → rapport. De restore zet TEST en opent het spel nooit automatisch. Onderbreking tijdens Storage vereist gesloten houden en opnieuw herstellen; geen cross-service transactie geclaimd. De database houdt de expliciete tabellen onder lock en gebruikt geen TRUNCATE CASCADE. Onbekende inkomende FK's laten de transactie veilig mislukken.

## 9. Disaster-recovery drill

Definitieve lokale oefening: **88afaa6f-2498-4d76-9327-b3fb0064f400**. Bron en doel: alleen `csi-hit-reliability`, API 55421/database 55422.

1. Fictieve groepen/accounts, herkenbaar saldo **142**, **1206 notities** (waarvan 1205 vaste herstelnotities), **11 transacties**, vrijgegeven aanwijzing, status, verdachtekoppeling en **3 bestanden**.
2. Complete bundle gemaakt; verwachte waarden en bundle vóór de wisactie naar `.local/drill-<UUID>*.json` geschreven.
3. Alle zeventien applicatiedatasets gewist; nul groepen expliciet vastgesteld. De gebackupte Storage-objecten daadwerkelijk verwijderd.
4. Bundle vanaf bestand opnieuw gevalideerd; database en bestanden hersteld.
5. **17/17 datasets, 3/3 bestanden, 4/4 accounts** gecontroleerd. Saldo exact 142; aantallen en inhoudshashes stemmen overeen; FK's tijdens insert afgedwongen.
6. Drie rol-logins met echte Auth geslaagd. Browser tegen de herstelde backend: adminstatus, groep/saldo, vrijgegeven bestand met checksum, notities en verdachtedossier gecontroleerd. `application_usable_verified: true` in het lokale drillrapport.

Afzonderlijk getest: opnieuw herstellen over bestaande data, FK-fout met rollback, beschadigde bytes, ontbrekend bestand, accountrecreatie en verkeerde targets.

Hosted: **niet uitgevoerd**. Geen claim dat CSI HIT TEST al uit deze bundle is teruggebracht.

## 10. RPO / RTO

| Definitieve lokale drillfase | Gemeten |
|---|---:|
| Fictieve beginsituatie klaarzetten | 0,521 s |
| Backup incl. opslag lokaal bundlebestand | 0,831 s |
| Data-/bestandswipe | 0,098 s |
| Restore preflight | 0,018 s |
| Accounts controleren/koppelen (bestaande IDs) | 0,067 s |
| Database herstellen | 0,184 s |
| Storage herstellen | 0,120 s |
| Teruglezen en inhoud verifiëren | 0,906 s |
| Gehele restorefunctie | 1,318 s |
| Drie API-logins | 0,640 s |
| Drie browserrollen en gebruikscontrole | 2,676 s |
| Gehele aaneengesloten gescripte lokale oefening | **6,517 s** |

Dit is een meting op een reeds draaiende lokale omgeving met kleine fictieve bestanden. Het is **geen operationele gehoste RTO**: onderzoek, menselijke beslissingen, provisioning, eventuele accounttoegang en DNS ontbreken. Hosted RTO blijft onbekend totdat die oefening is uitgevoerd. De aparte reconstructietest bewijst het mechanisme, niet een weekendbrede tijd voor alle wachtwoordresets.

RPO: bij elke geslaagde dagjob circa maximaal 24 uur. Bij mislukking langer; waarschuwing na 30 uur met zes uur tolerantie. Off-project RPO is de leeftijd van de laatst werkelijk elders opgeslagen complete bundle. Tijdens het spel worden aanvullende handmatige exports aanbevolen op afgesproken momenten.

## 11. Audit trail

Database-triggers registreren wijzigingen in groepen, accounts/profielen, memberships, verdachtekoppelingen, aanwijzingspublicatie/toewijzingen, pegelhistorie, agenda en appsettings. Records: ID, actie-ID/transaction-ID, actor, type, target, tijd, beperkte before/after en resultaat. Geen notitieinhoud, e-mail, redenvrije tekst of secrets. Reset/demo-cleanup krijgen expliciete actieregels, ook bij nul gewijzigde rijen. Geweigerde transacties loggen geen vals succes; platformlogs bevatten de foutpogingen. Serviceacties hebben geen ingelogde actor.

Admins kunnen de audit read-only opvragen; anderen zien niets en kunnen geen records invoegen. Pegelactor/UUID/target/tijd en afwijzing van onbevoegde reset zijn werkelijk getest.

## 12. Monitoring / backup health

Nieuwe backup_runs-status en compacte adminsectie. LIVE-health onderscheidt actueel, aanlooptermijn, achterstallig, mislukt en onbekende modus; TEST-overslaan is apart zichtbaar. Ook een verlopen running-poging wordt als fout getoond. Laatste succesvolle LIVE-backup wordt apart van laatste bundle bewaard. Een gegevensherstelcontrole wordt niet als bewezen browserherstel gepresenteerd.

Clientdiagnostiek beperkt zich tot tijd, actor, allowlisted scherm/categorie en release; server-side één record per account per minuut, dertig dagen retentie. Geen message/stack, URL-query of notitieinhoud. Niet-ingelogde/offline fouten kunnen niet betrouwbaar worden ingestuurd; gebruik daarvoor browser/platformlogs.

Bestaande verbindingsstatus bleek al aanwezig: verversen, fout bij offline/mislukte snapshot en tijd laatste succesvolle sync, plus periodieke herlezing. Geen extra status toegevoegd die navigator.onLine verwart met succesvolle datasync. Geen externe automatische alarmdienst: iemand moet de adminstatus controleren.

## 13. Incidentprocedures

- [Incidentkaart](GAME-DAY-INCIDENT-RUNBOOK.md): app/gebruiker/data/pegels/sync/backup/platformuitval en compatibele frontendrollback.
- [Recoveryrunbook](DISASTER-RECOVERY.md): integriteit, omgeving, schema, Auth, Storage, secretsconfiguratie, Preview, DNS en heropening.
- [Weekendchecklist](GAME-DAY-CHECKLIST.md): dag ervoor, start, tijdens en na afloop.

## 14. Tests

| Suite | Definitieve uitslag |
|---|---:|
| Bestaande frontend-unit | 15/15 |
| Bestaande build/configguards | 5/5 |
| Bestaande database/RPC/RLS | 28/28 |
| Bestaande browserrunner | 22/22 = 16 flows + 48 responsive controles in 6 groepen |
| Nieuwe recovery-unit | 22/22 |
| Nieuwe echte database/recovery | 21/21 (20 volledige suite + 1 aanvullende grantscontrole) |
| Nieuwe backup-Edge-handler met echte backend | 6/6 |
| Nieuwe operations-browser | 2/2 |
| Nieuwe cron/security | 3/3 |
| **Totaal runner-tests** | **124/124** |

Extra bewijs: volledige lokale CLI-drill + drie herstelde browserrollen; portable CLI backup/verify; alle migraties vanaf lege public/private schema's gecontroleerd binnen een volledig teruggedraaide transactie op de lokale stack. Geen blijvende schema-/Storagewijziging door die bootstrapcontrole.

De lokale Edge-runtime staat uit. Handler-/browsertests gebruiken de ongewijzigde gedeelde productiehandler onder Node, met echte Supabase Auth/database/Storage; alleen HTTP-transport is aangepast. Deno-deployment, hosted looptijd en echte Preview moeten nog worden bewezen. De browser start met controle van het werkelijk ingebouwde lokale endpoint/anon-key en bevat geen service-role.

Tijdens ontwikkeling opgelost: een niet-beschikbare ESLint-ruleverwijzing, een testselector die Setup in plaats van Klaar zocht, een tijdelijke extra Auth-testgebruiker die de oude vaste accounttelling beïnvloedde, en bestaande lokale bucketdata in de lege-schema-testopstelling. De definitieve runs hierboven zijn groen; eerdere falende ontwikkelruns blijven lokaal bewaard waar beschikbaar.

## 15. Security / advisors

RLS op alle nieuwe exposed tabellen; admin-only SELECT, geen client-DML. Snapshots staan in private zonder client/service-DML. Backup/restore-RPC's alleen service_role. Private definerfuncties hebben vaste search_path en ingetrokken directe grants. Health/diagnostiek controleren ingelogde actor/rol; diagnostiek is server-side begrensd. Restore weigert Production in client én database. Geen service-role in frontend. Cron accepteert uitsluitend bearer-auth; querystringsecret verwijderd; Preview-cron weigert productie-endpoint vóór netwerkverkeer.

Lokale CLI-advisors na laatste schemawijzigingen: 10 auth_rls_initplan, 19 multiple_permissive_policies, 2 duplicate_index; dezelfde bestaande lokale categorieën/aantallen. Nul nieuwe meldingen voor operationsobjecten. Hosted security/performance-advisors blijven checkpointwerk; lokale resultaten dekken niet alle hosted Auth/platformadviezen. [Advisor-uitleg](https://supabase.com/docs/guides/database/database-linter).

Credentialscan van gewijzigde én nieuwe bronbestanden vergeleek echte lokale/hosted keys en fixturewachtwoorden zonder ze te printen: nul treffers. Geen tijdelijke logs, backups of credentials opgenomen in Git. Build bevat bestaande fs.F_OK-deprecation; geen compile- of lintfouten.

## 16. Git

Branch: **hardening/backup-restore-operations**. Basiscommit: `8b0a7242c50199b644b4223dd1b14d08c47c9cba` (bij aanvang lokale main). Geen nieuwe commit/push vóór het afgesproken hosted checkpoint; alle wijzigingen staan lokaal reviewbaar. Geen force push/merge/mainwijziging. Bestandslijst volgt onderaan.

## 17. Preview

Geen nieuwe Preview-URL/deployment; bewust uitgesteld tot succesvolle hosted drill volgens fase 29. De oude core-hardening Preview is geen bewijs voor deze code. Daarna uitsluitend branchspecifieke TEST-configuratie, endpointbewijs, deploy en E2E. Geen overname van productiecredentials of fallback naar Production.

## 18. Production

**Production is niet gewijzigd.** Alleen read-only catalogus-, bucketmetadata-, functiebron- en projectstatuscontroles. Geen productiedata/assetdownload, accountwijziging, backupaanroep, migratie, restore, release of deployment. CSI HIT TEST en IScout zijn niet hervat/gepauzeerd of aangepast.

## 19. Resterende risico's / vervolg

1. CSI HIT TEST hervatten en bevestigen; daarna operationsmigratie en Edge-deploy uitsluitend op TEST, hosted restore/lege-data-/Auth-reconstructieproef, advisors en Preview/E2E.
2. JSON-bundle is maximaal 40 MiB; grotere data/looptijden vragen beoordeelde uitbreiding. Hosted timeoutgedrag is nog niet gemeten.
3. Storage is niet transactioneel met PostgreSQL; uploads tijdens export zoveel mogelijk pauzeren. Restoreomgeving organisatorisch sluiten; TEST is geen onderhoudsslot.
4. Externe opslag is handmatig. Een groene in-project job bewijst geen off-project kopie; wijs hiervoor een eigenaar aan.
5. Nieuwe accounts vereisen veilige toegang/wachtwoordherstel; geen volledige Auth-systeembackup. Geen herstel van OAuth/MFA/sessies.
6. Bestaande frontendlijstqueries zijn niet uitgebreid tot algemene paginering; de backup/restore controleert wel alle rijen boven 1000. Grote lijsten kunnen in het huidige scherm dus begrensd zijn terwijl de database volledig hersteld is.
7. Audit/backupuitvoeringshistorie groeit; afspreken hoe die na het evenement wordt bewaard/opgeruimd. Oude backups zonder nieuw manifest hebben geen bewezen automatische restore.
8. Geen betaald monitoringplatform of automatische externe waarschuwingen; weekendorganisatie moet status daadwerkelijk controleren. Echte mobiele controle hoort na hosted Preview opnieuw bij de review.

## 20. Conclusie

**Nog niet gereed voor production-review.** Lokale implementatie en herstelbewijs zijn aanwezig; de verplichte hosted restoretest, hosted Auth/advisors en groene nieuwe Preview ontbreken doordat CSI HIT TEST gepauzeerd is.

**Klaar voor hosted restore drill – CSI HIT TEST moet worden hervat.** Hervat de testomgeving en bevestig dat in deze taak. Pas daarna volgen de gehoste destructieve tests; nooit tegen Production.

## Gewijzigde bestanden

Zie onderstaande exacte bestandslijst van dit checkpoint. Lokale bewijsbestanden staan uitsluitend onder genegeerde `.local/`.

- `api/keep-alive.js`
- `docs/BACKUP-FORMAT.md`
- `docs/BACKUP-RESTORE-HARDENING-REPORT.md`
- `docs/DISASTER-RECOVERY.md`
- `docs/GAME-DAY-CHECKLIST.md`
- `docs/GAME-DAY-INCIDENT-RUNBOOK.md`
- `package.json`
- `scripts/build.cjs`
- `scripts/recovery/cli.mjs`
- `scripts/recovery/drill-smoke.mjs`
- `scripts/recovery/drill.mjs`
- `scripts/recovery/restore.mjs`
- `src/App.js`
- `src/components/admin/AdminSetupCheck.jsx`
- `src/components/admin/BackupOperations.jsx`
- `src/components/shared/ErrorBoundary.jsx`
- `src/index.js`
- `src/services/diagnostics.js`
- `supabase/functions/_shared/backup.mjs`
- `supabase/functions/_shared/handler.mjs`
- `supabase/functions/csi-hit-nightly-backup/index.ts`
- `supabase/migrations/20260923182309_backup_restore_operations.sql`
- `tests/browser/e2e.test.cjs`
- `tests/recovery/README.md`
- `tests/recovery/browser.test.mjs`
- `tests/recovery/cron.test.cjs`
- `tests/recovery/database.test.mjs`
- `tests/recovery/handler.test.mjs`
- `tests/recovery/setup.cjs`
- `tests/recovery/unit.test.mjs`
