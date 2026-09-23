# CSI HIT backup v2

Dit formaat wordt gebruikt door de nachtjob, handmatige adminbackup en portable CLI. Het is een zelfstandig JSON-bestand met databasegegevens én Base64-bestanden; geen verzameling downloadlinks. Het kan zonder Supabase worden bewaard en gecontroleerd. Oud `format_version: 2` zonder dit manifest is een ander, onvolledig legacyformaat en wordt geweigerd.

## Manifest

`backup_format_version: 2`, `kind: csi-hit-portable`, UUID `backup_id`, UTC `created_at` en `completed_at`, `game_mode`, `environment`, `project_ref`, `release` indien ingesteld, `schema_version`, schemafingerprint, MVCC `snapshot_id`, consistentiebeschrijving, datasets met aantallen en SHA-256, Storage-aantal, Auth-strategie, `status: complete`, lege foutenlijst en SHA-256 van het canonieke manifest.

De hele bundle moet geldig zijn vóór herstel. De validator controleert de exacte twintig datasets, unieke recordidentiteiten, aantallen, canonieke JSON-hashes, bestandsgrootten/-hashes, bucket/pad-inventaris en bestandsverwijzingen. Een incomplete/gewijzigde bundle is geen geslaagde backup. Checksums detecteren beschadiging, maar zijn geen digitale handtekening: vertrouw alleen bundles uit de eigen gecontroleerde opslag.

De bestandsnaam in de private bucket is `v2/<UUID>.json`, upload met `upsert: false`. Een actie-ID is idempotent; een nieuwe actie krijgt een nieuwe UUID. Een mislukte actie herhalen met dezelfde UUID start geen tweede export.

## Datadekking, vastgesteld uit Production-catalogus op 23 september 2026

| Categorie | Datasets / behandeling |
|---|---|
| A: spelstate | `groups`, `suspects`, `clue_categories`, `agenda_items`, `clues_base`, `group_clues`, `suspect_notes`, `suspect_statuses`, `notifications`, `credit_transactions`, `final_reports`, `settings`, `app_settings` |
| B: identiteit | `profiles`, `group_members`, `suspect_users`; daarnaast `auth_users` met uitsluitend ID, e-mail en bevestigingsstatus |
| C: bestanden | `storage_buckets`, `storage_objects` en daadwerkelijke bytes in `files`; private `clue-files` en publieke `suspect-photos` |
| Operationeel bewijs | `operation_audit`; actor-ID, actie/target/tijd en beperkte before/after metadata |
| D: opnieuw opbouwen | views, functies, RLS, indexen en triggers via repositorymigraties; Realtime via bootstrap/configuratie; frontend via build |
| Niet terugzetten | oude sessies, wachtwoorden, MFA, OAuth-identiteiten, serversecrets, bucket `backups`, tijdelijke snapshots, browserdiagnostiek, backupuitvoeringen en eerdere herstelrapporten |

Alle zestien bestaande public basistabellen zijn meegenomen; de vroegere job miste `suspect_users` en `settings`. `clues` is een gemaskeerde view; herstel gebruikt de basistabel. Verhoorgegevens zitten in notities/statussen/koppelingen, er bestaat geen afzonderlijke verhoortabel. Eindrapporten blijven opgenomen hoewel de huidige frontendfunctie uit staat. De legacy `settings` bevat acht oude notificatie/herinneringsinstellingen; meegenomen uit voorzichtigheid, niet als actief spelonderdeel gepresenteerd.

Nieuwe public tabellen, onbekende settings of buckets blokkeren de backup totdat hun classificatie is bijgewerkt. Hiermee kunnen nieuwe datasets of mogelijke secretsettings niet stil worden overgeslagen/geëxporteerd.

## Snapshot en paginering

Een geregistreerde `running`-poging wordt in een afzonderlijke databasecall vastgelegd. Vervolgens maakt `private.capture_backup()` één STABLE MVCC-snapshot van alle datasets. De private snapshot wordt via service-only RPC's in pagina's van maximaal 500 rijen gelezen. Iedere dataset eindigt met een extra lege pagina en wordt tegen zijn vastgelegde aantal gecontroleerd. De reguliere PostgREST-limiet van 1000 rijen kan hierdoor geen onopgemerkte afkapping veroorzaken.

Een PostgreSQL STABLE-functie ziet gedurende haar aanroep één databasebeeld, ook voor interne queries. [PostgreSQL snapshotgedrag](https://www.postgresql.org/docs/17/xfunc-volatility.html). Snapshotgegevens worden na afloop verwijderd; afgebroken pogingen worden na tien minuten als verlopen behandeld en bij onderhoud opgeruimd.

Storage-bytes vallen buiten de database-transactie. De objectinventaris wordt vóór en na downloaden vergeleken; wijzigingen, ontbrekende bestanden en afwijkende bestandsgrootten laten de backup mislukken. Een wijziging ná de eindcontrole blijft mogelijk. Plan belangrijke portable exports tijdens een korte pauze in uploads. Cross-service atomiciteit wordt niet geclaimd.

## Omvang en retentie

Maximaal 40 MiB per complete JSON-bundle, inclusief Base64-overhead. Bij overschrijding volgt een expliciete fout; geen gedeeltelijk succes. Dit voorkomt onbegrensd geheugengebruik binnen de Edge worker. De read-only inventarisatie telde 7 clue-bestanden (704.048 bytes) en 1 foto (490.446 bytes), dus circa 1,2 MB bronbestanden. Grotere toekomstige spellen vragen een beoordeelde streaming/chunkoplossing.

Nachtcron: dagelijks 01:30 UTC; alleen in LIVE wordt een bundle gemaakt. Admin/portable export werkt ook in TEST. Onderhoud loopt ook wanneer de cron TEST overslaat. Het verzamelt gepagineerd eerst alle objecten, verwijdert daarna alleen herkende eigen backupnamen ouder dan 30 dagen en bewaart de nieuwste succesvolle bundle. Onbekende bestandsnamen worden niet verwijderd. Cleanupfouten worden apart getoond. Audit- en uitvoeringshistorie wordt niet automatisch verwijderd; browserdiagnostiek na 30 dagen wel.

De in-project kopie blijft afhankelijk van hetzelfde Supabase-project. Alleen een werkelijk elders opgeslagen download biedt het beschreven off-project herstelpad. Bundles bevatten e-mailadressen en spelinhoud: beperkte toegang, versleutelde opslag waar beschikbaar, geen Git/mail/public bucket.
