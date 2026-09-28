# Security-inventory — 28 september 2026

Productie is uitsluitend read-only geïnspecteerd. Bronnen: actuele pg_proc/pg_policies/pg_class/information_schema/storage.buckets, repository en lokale real-API-tests. Startcommit 352808e1cec7365f2f3fecee2600966c0b3ffba7. Ruwe schema-inventaris (zonder spelrijen) lokaal in .local/security-production-inventory.json.

## Architectuur vóór/na

Vóór: drie profielrollen, 20 public-tabellen met RLS, zes invoker-views (clues tevens security_barrier), 63 policies, 38 applicatiefuncties in public/private. Productie bevatte 7 participants, 2 suspects en 2 admins op het inspectiemoment; geen jury. Rollen komen uit profiles, niet uit app_metadata/custom JWTclaims.

Nieuwe signup kreeg participant via Auth-trigger. Eigen profiel lezen toegestaan; rollen wijzigen al admin-only. Maar zichtbare agenda/verdachten/categorieën en gratis clues waren ook beschikbaar zonder groep; is_group_member controleerde alleen de membershiprij. Storage clue-files vereiste exact pad maar de gratis-contenttak miste actieve deelname. Suspect kon alle actieve verdachteprofielen zien.

Na: vier rollen met expliciete jurybevoegdheden, actieve profielstatus en actieve deelname als servergrens. Bestaande admins blijven admin. Nieuwe helpers in private, één nieuwe publieke begrensde release-RPC. Geen extra opslagtabellen of dependency.

## Tabellen en views

| Tabellen | Belangrijk vóór | Na |
|---|---|---|
| profiles | Eigen/admin SELECT, admin UPDATE; eigen participant INSERT | Eigen/admin SELECT behouden, alleen admin UPDATE; client INSERT/DELETE ingetrokken; Auth-trigger beheert creatie; is_active en jury. |
| groups / group_members | Groepslid/admin; suspect actieve groepen | Membershiphelper vereist actieve participant/groep; restrictive game gate; jury groepen lezen maar geen membershiplijst. |
| suspects | Alle actieve rijen voor authenticated | Actieve participants, eigen actieve suspect, jury/admin. |
| clues_base / clues | Geen directe clientgrants op base; private definer-view maskeert inhoud | Filtert actieve deelname; jury volledig dossier, suspect eigen dossier; admin-only contentmutaties behouden. |
| clue_categories / agenda_items | Authenticated brede categorieën; zichtbare agenda | Actieve deelname, actieve categorieën; jury lezen. |
| group_clues | Eigen groep/admin of eigen verdachte SELECT | Actieve helper; jury SELECT + release-RPC. Geen jury directe UPDATE/INSERT/DELETE. |
| suspect_notes | Eigen groep/auteur, eigen suspect, admin | Zelfde ownership plus actieve deelname; jury SELECT, geen edit/delete. |
| suspect_statuses | Eigen groep R/W; eigen suspect/admin R | Zelfde plus actieve deelname; jury SELECT. |
| credit_transactions | Eigen groep/admin; mutaties via RPC | Jury SELECT en begrensde pegel-RPC; directe balanswrites niet toegestaan voor jury. |
| notifications | Eigen user of groep/admin | Actieve deelname én gecombineerde user/group-scope; geen jury notitie/meldingbeheer. |
| final_reports | Eigen groep als finale open/admin | Auteur moet eigen auth.uid zijn; jury alleen lezen. UI-feature blijft uit. |
| suspect_users | Eigen relatie/admin | Actieve gate; profielkoppeling blijft leidend voor autorisatie. |
| app_settings | Veilige spelvlaggen voor authenticated; admin beheer | Actieve gate; jury alleen veilige vlaggen; geen moduswijziging. |
| settings | Geen clienttoegang | Behouden. |
| backup_runs / operation_audit / restore_checks / client_diagnostics | Admin SELECT; geen client DML | is_admin sluit inactieve admin uit; jury heeft geen toegang. |
| private.backup_snapshots | Geen clienttoegang | Behouden. |

Alle bestaande views blijven security_invoker: admin_aankopen_overzicht, admin_groep_activiteit, admin_notities_overzicht, admin_statussen_overzicht, admin_eindrapporten_overzicht, clues. Onderliggende RLS blijft dus gelden, ook bij directe view-aanroepen. Geen privilege-escalerende nieuwe view.

Per actie geldt de [rechtenmatrix](SECURITY-AUTHORIZATION-MATRIX.md). Restrictive ALL-policies hebben zowel USING als WITH CHECK. Jury SELECT-policies verlenen geen DML. Bestaande auteur-/groepspredicates blijven behouden. Client TRUNCATE/REFERENCES/TRIGGER en CREATE op public worden ingetrokken. Geen algemene policyvervanging of historische indexcleanup.

## Functies

Deze tabel omvat alle 38 bij aanvang aangetroffen functies, met het beoogde gedrag na migration. Definer wordt gebruikt voor begrensde autorisatie-lookups, atomaire transacties, triggerintegriteit of serverbackups. Alle relevante clientparameters en auth actor zijn beoordeeld.

| Functie | Uitvoering | Autorisatie/doel |
|---|---|---|
| `purchase_clue(uuid,uuid)` | Definer | Actieve participant + eigen actieve groep; saldo/row locks. Geen rol uit JWT-metadata. |
| `is_own_suspect(uuid)` | Definer | Actief profiel, rol suspect en eigen actieve verdachte; boolean helper. |
| `is_test_mode()` | Definer | Actieve speltoegang plus actuele modus; geen toegang voor losse signup. |
| `are_final_reports_open()` | Definer | Actieve speltoegang plus spelvlag. |
| `private.reset_test_data_original()` | Definer | Private oorspronkelijke TEST+adminprocedure; geen client-EXECUTE. |
| `adjust_group_credits(uuid,integer)` | Definer | Legacy pad is geblokkeerd; actuele mutaties via idempotente RPC. |
| `clues_view_delete()` | Definer | Trigger: admin en bestaande TEST-deleteguard. |
| `clues_view_insert()` | Definer | Trigger: actieve admin; geen jury contentbeheer. |
| `remove_group_clue(uuid)` | Definer | Actieve admin en TEST-mode lock. |
| `clues_view_update()` | Definer | Trigger: actieve admin; schrijft gecontroleerde velden. |
| `private.delete_demo_data_original()` | Definer | Private TEST+adminprocedure, geen client-EXECUTE. |
| `private.can_read_clue_file(text)` | Definer | Actieve toegang plus exact ontgrendeld pad; jury alleen gekoppelde bestanden. |
| `private.get_visible_clues()` | Definer | Private definer achter invoker/barrier-view; filtert actieve deelname, maskeert betaalde inhoud. |
| `handle_new_user()` | Definer | Auth-trigger, role altijd participant; metadata alleen display name, niet autorisatie. |
| `is_admin()` | Definer | Actief profiel met rol admin; jury is geen admin. |
| `is_group_member(uuid)` | Definer | Actieve participant + membership + actieve groep. |
| `private.clue_is_for_own_suspect(uuid)` | Definer | Eigen actieve verdachte via versterkte helper; alleen boolean. |
| `mutate_group_credits(uuid,integer,text,uuid)` | Definer | Actieve admin/jury, actor uit auth.uid, reden/bedragcontrole, idempotency-ID en row locks. |
| `private.require_test_admin()` | Definer | Private guard: actuele admin en TEST-modus met lock. |
| `private.guard_test_delete()` | Definer | Interne trigger, gebruikt TEST+admin guard. |
| `private.guard_demo_write()` | Definer | Interne trigger, bestaande LIVE/TEST-guards. |
| `reset_test_data()` | Definer | Actieve admin/TEST via private original + audit; geen jury. |
| `delete_demo_data()` | Definer | Actieve admin/TEST via private original + audit; geen jury. |
| `record_client_diagnostic(text,text,text)` | Definer | Auth UID, vaste categorie/scherm/release, rate limit; geen vrij payload. |
| `backup_health()` | Definer | Actieve admin, geen writes, geen jury. |
| `backup_begin(uuid,text,uuid)` | Definer | Service-only; UUID, bron/modus, mutex; niet rechtstreeks frontend. |
| `backup_capture(uuid)` | Definer | Service-only; gefixeerde datasets en omvangcontrole. |
| `backup_finish(uuid,boolean,integer,text)` | Definer | Service-only; beperkt statuspad. |
| `backup_maintenance()` | Definer | Service-only; bestaande retentionregels. |
| `backup_page(uuid,text,integer,integer)` | Definer | Service-only; vaste datasetnamen/pagination. |
| `restore_database(text,text,jsonb,text)` | Definer | Service-only, preflight vóór writes, schema/constraints/transactie; Production hard geweigerd. |
| `restore_preflight(text)` | Definer | Service-only; targetallowlist + marker + harde Production-blokkade. |
| `private.audit_change()` | Definer | Interne trigger; beperkte before/aftervelden, auth actor. |
| `private.audit_fields(jsonb)` | Invoker | Pure allowlist, geen vrije tekst/secrets. |
| `private.backup_tables()` | Invoker | Interne vaste exporttabel-lijst. |
| `private.capture_backup()` | Definer | Interne expliciete Auth-allowlist, geen passwordhash/sessie/keys. |
| `private.schema_fingerprint()` | Invoker | Interne schemafingerprint; schema-only. |
| `backup_storage_inventory()` | Definer | Service-only; bucket/objectmetadata, geen clientgrants. |

Nieuwe functies: private.is_jury(), private.has_game_access(), private.photo_path(text), private.can_read_suspect_photo(text), public.release_group_clue(uuid).
Nieuwe helper-EXECUTE expliciet authenticated/service_role, geen PUBLIC/anon; private is geen Data API-schema. release_group_clue is authenticated-only met interne actuele rolcontrole. Nieuwe definers gebruiken lege search_path en gekwalificeerde objectnamen. Bestaande nieuwe helpers is_admin/is_group_member/is_own_suspect/is_test_mode/are_final_reports_open eveneens. handle_new_user gebruikt pg_catalog,public.

Lokale catalogustests controleren: geen anon EXECUTE op public/private definers, geen tabel zonder RLS, geen invoker-loze public-view, geen client-DDL-tabelrechten. Guards en grantchecks in de bestaande recoverytests blijven actief.

## Storage

| Bucket | Voor | Na | Uploadgrenzen |
|---|---|---|---|
| suspect-photos | Public; 1 gekoppelde public-URL, geen externe foto-URLs gevonden | Private; rijgebonden signed URL, maximaal 300 s | Admin; JPEG/PNG/WebP; 10 MiB |
| clue-files | Private; exact pad, betaalde/free entitlement | Zelfde plus actieve deelname; eigen suspect/jury gekoppelde dossiers | Admin; PDF/DOC/DOCX/JPEG/PNG/WebP; 25 MiB |
| backups | Private, servertoegang | Behouden; downloadhandler eist actieve admin | Server; JSON; 50 MiB bucket, 40 MiB bundellimiet |

Frontend uploads gebruiken random UUID-pad, gecontroleerde extensie/MIME/size en geen upsert. Backendbucketlimieten en policies blijven leidend. Admin kan via Storage API bestaande bestanden vervangen/verwijderen; jury/participant/suspect niet. Geen wildcard publieke leespolicy toegevoegd.

## UI, XSS, sessies en headers

Admin behoudt beheerschermen; nieuwe accounttoegangskaart. Jury krijgt een eigen scherm met verhoordossiers, pegelcorrectie en vrijgeven. Geen reset/backup/accountnavigatie. Los/inactief account krijgt expliciete melding, geen lege dossiers.

React blijft tekst escapen. Geen dangerouslySetInnerHTML, Markdown-HTML of nieuwe sanitizer. Dynamische foto/bijlagebronnen gaan via eigen Storage; bestaande signed URL wordt niet als bron opgeslagen. Externe navigatielinks zijn vaste eigen domeinen/Instagram.

Accountwisseling remount de appdata/formulieren/modals; requestgeneraties blokkeren oude snapshots. Late file-open/download en geplande exports worden op sessie/mount gecontroleerd. Opgeslagen idempotencyreceipt blijft afgeschermd per actor in dezelfde tab; zie privacydocument voor deze bewuste betrouwbaarheidseigenschap.

Vercelheaders voorbereid: CSP, frame-ancestors none, X-Frame-Options DENY, nosniff, no-referrer, Permissions-Policy en HSTS 1 jaar. Script alleen self, geen unsafe-inline/eval. Inline styles nodig voor bestaande Reactstijlobjecten. Backendconnecties uitsluitend eigen Production/TEST-Supabase-origins plus wss. Lokale testserver vervangt expliciet TEST-origin door loopback. Platformtoepassing op echte Preview blijft te bewijzen.

Browserflows testen ingelogde jury/admin, foto/modal, CSV-download, framing, CSP-events en accountwisseling. Hostingheaders zijn niet op Production gezet.

## Auth en privacy

Zie [Privacy, Auth en retentie](SECURITY-PRIVACY-RETENTION.md) voor actuele public Auth-instellingen, ongeverifieerde beheerinstellingen, lifecycle, FK-risico's, accountplan en orphan-detector. Geen nieuwe Auth-config of automatische retentietaak is in productie toegepast.
