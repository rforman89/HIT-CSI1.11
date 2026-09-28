# Security, Roles & Product Hardening — gevalideerde Preview

Datum: 28 september 2026.

**CSI HIT TEST kan nu veilig worden gepauzeerd en IScout kan worden hervat.**

## 1. Executive summary

Lokale en gehoste validatie zijn afgerond: 195 verschillende automatische tests gedekt, waarvan 116 tegen hosted services/Preview. Jury kan dossiers lezen, aangevraagde aanwijzingen vrijgeven en pegels corrigeren, zoals door de opdrachtgever bevestigd. Technisch beheer blijft bij actieve admins. Nieuwe, ongekoppelde en inactieve accounts krijgen geen speltoegang. Foto's zijn op TEST privé, exports zijn beschermd en browserheaders worden op de echte Preview afgedwongen.

Na het lokale checkpoint heeft de opdrachtgever het hosted vervolg beschikbaar gesteld. TEST is hervat en pas na ACTIVE_HEALTHY beschreven. Beide migrations en de backup-handler zijn uitsluitend op TEST toegepast. Preview is Ready en volledig gevalideerd. Production is ongewijzigd. Na het directe pauze-checkpoint is alleen lokale rapportage/Git-afronding uitgevoerd.

## 2. Securityarchitectuur voor/na

De read-only productie-inventaris omvat 20 RLS-tabellen, 6 security-invoker-views, 63 policies en 38 applicatiefuncties. De bestaande basis beschermde groepsmutaties en betaalde aanwijzingen, maar sommige leesrechten waren breder dan actieve deelname en foto's stonden publiek.

De nieuwe migrations voegen actieve deelname als aanvullende serverregel toe, beperken juryacties via gerichte RPC's en maken foto's privé. Bestaande eigendomsregels blijven behouden. UI-verbergen is geen autorisatiegrens. De tweede migration verhelpt nieuwe advisorbevindingen zonder de rechten te verruimen. Zie [volledige inventaris](SECURITY-INVENTORY.md).

## 3. Rechtenmatrix

De vooraf opgestelde [autorisatiematrix](SECURITY-AUTHORIZATION-MATRIX.md) is de specificatie voor anon, ongekoppeld/inactief, participant, suspect, jury en admin. Directe API-, Storage- en browserchecks toetsen deze scheiding.

## 4. Rollen

Nieuwe technische rol: `jury`. Jury leest operationele dossiers, geeft bestaande aangevraagde aanwijzingen vrij en corrigeert pegels met verplichte reden en idempotencycontrole. Jury krijgt geen accountbeheer, reset, LIVE/TEST-beheer, backup of auditlog. Organisatie gebruikt `admin`; een extra ownerrol is niet nodig. Bestaande admins worden niet automatisch omgezet. Admin kan rollen en accountstatus beheren; eigen bediening is in de UI geblokkeerd tegen onbedoelde uitsluiting.

## 5. Registratie

Open signup blijft beschikbaar met e-mailbevestiging in de huidige hosted configuratie. Een nieuw participantaccount ziet geen speldata totdat een actieve groep is gekoppeld. Eigen profielgegevens blijven beschikbaar. User-editable Auth-metadata verleent geen adminrechten; profielcreatie loopt via de Auth-trigger.

## 6. Inactive-account gedrag

`profiles.is_active` is standaard true voor bestaande accounts. Autorisatie controleert de actuele profielstatus en, voor deelnemers, actieve groep plus membership. Verwijderde membership of deactivering blokkeert verdere spelreads, writes, nieuwe downloadlinks en toegestane Realtime-events, ook bij een reeds uitgegeven JWT. De frontend toont expliciet ontbrekende speltoegang.

## 7. RLS

Aanvullende restrictive policies beveiligen 13 bestaande speltabellen. Eigen groep, eigen verdachte en juryrechten blijven afzonderlijk begrensd. Notificaties controleren gebruiker én groep. Eindrapporten binden de inzender aan de actor. Clientrechten voor TRUNCATE/REFERENCES/TRIGGER en CREATE in public zijn ingetrokken. Lokale cataloguscontrole: geen ontbrekende RLS, geen niet-invoker-publicviews en geen genoemde client-DDL-rechten.

## 8. RPC / SECURITY DEFINER

De oorspronkelijke 38 applicatiefuncties zijn afzonderlijk geïnventariseerd. Helpers hebben expliciete grants en veilige search paths. De publieke invoker-wrapper `release_group_clue` roept een private definer aan die actieve jury/admin controleert en uitsluitend een aangevraagde vrijgave verandert; herhalen wijzigt de vrijgavetijd niet. `mutate_group_credits` behoudt actorbinding, verplichte reden, locks en idempotency. Lokale en hosted checks vonden geen ongewenst anon-uitvoerbare definerfunctie. Privileged service-/restorefuncties blijven afgeschermd.

## 9. Storage

`suspect-photos` is op TEST private. De frontend gebruikt signed URLs en bewaart het oorspronkelijke objectpad; oude eigen Supabase-public-URLs worden zonder herschrijven van speldata als pad geïnterpreteerd. Clue-files vereisen exacte aanspraak; jury kan geen verweesde bestanden downloaden. Uploads hebben type-/groottelimieten, willekeurige paden en geen upsert. Padvalidatie weigert externe origins en traversal. Backups blijven private. Hosted tests omvatten ongeoorloofde toegang, uploads, delete en echte signed-URL-expiratie. Delete wordt via een verse request gecontroleerd, zodat een eerder gecachte response niet als nog bestaand object wordt behandeld.

## 10. CSV/export

CSV neutraliseert spreadsheetformules, inclusief voorafgaande whitespace/controltekens; quoting, regeleinden, UTF-8 BOM en delimiters zijn getest. JSON-export gebruikt oorspronkelijke fotopaden en verwijdert tijdelijke signed URLs, ook uit geneste relaties. Asynchrone downloads/exports controleren of de oorspronkelijke sessie nog actief is.

## 11. Browserheaders/CSP

Op de Ready Preview bevestigd: CSP, DENY, nosniff, no-referrer, Permissions-Policy en HSTS. Scripts komen van self, zonder unsafe-inline/eval; bestaande inline React-stijlen vereisen style-src unsafe-inline. Supabase-origins zijn expliciet. Een echte browser blokkeert externe framing. Login, foto's, modals, downloads en gewijzigde mobiele schermen werken. React escaping is met opgeslagen aanvalstekst getest. De laatste afzonderlijke controle van admin, participant, suspect en jury telde per rol nul consolefouten, netwerkfouten en onverwachte hosts.

## 12. Auth/passwords/sessions

TEST-dashboard en echte Auth-calls bevestigen open signup, e-mailbevestiging verplicht, anonymous sign-ins en phone uit. Het TEST-wachtwoordminimum is gecontroleerd verhoogd van 6 naar 12; een update met 11 tekens wordt geweigerd. Site URL is exact de gevalideerde Preview, zonder wildcardredirects. JWT-duur is 3600 seconden, refresh replay detection staat aan met 10 seconden hergebruikmarge. Limieten per 5 minuten: refresh 150, verification 30, login/signup 30. Secure email change staat aan; single-session, timebox en inactivity timeout zijn niet aangezet. Leaked-password protection staat uit en vereist volgens het dashboard Pro. Er is geen productie-Auth-instelling gewijzigd.

Hosted Auth-tests bewijzen confirmation, login, recovery-token/password-update, refresh en logout. De gereserveerde fictieve .test-adressen kunnen geen gewone signupmail ontvangen; de tests genereren een echte signupbevestigingslink zonder SMTP. De browser volgt GoTrue, bevestigt het account, blijft op de exacte Preview en krijgt na expliciete passwordlogin geen speltoegang. Een ongeautoriseerde redirect wordt niet overgenomen. Ongebruikte Auth-tokens worden uit de URL-fragmenten verwijderd. Mailbezorging aan echte mailboxen is niet getest. Er is geen nieuw resetwachtwoordscherm; de bestaande organisatie/Auth-beheerflow blijft van toepassing. Accountwisseling wist drafts/modals; oude requests kunnen geen oude gegevens terugzetten. Per actor gescheiden idempotencyreceipts blijven bewust in sessionStorage tot afhandeling of sluiten van de tab.

## 13. Privacy inventory

[Privacy- en retentieontwerp](SECURITY-PRIVACY-RETENTION.md) specificeert bron, opslag, toegang, noodzaak en verwijderroute voor contactgegevens, rollen, memberships, notities, foto's, uploads, transacties, audit, diagnostiek, backups, browsersessies en platformmetadata. Jury krijgt geen andere profiel-e-mails of membershiplijst. Console-renderfouten loggen alleen een vaste categorie.

## 14. Retentie/account removal

Voorstel: persoonsgebonden gegevens en audit beoordelen binnen 90 dagen na een vastgesteld evenementseinde; geen nieuwe automatische purge. Bestaande diagnostiekretentie is 30 dagen; backupcleanup bewaart de laatste succesvolle bundle ook als deze ouder is. Externe kopieën vereisen apart beheer.

Lokale en expliciet TEST-gebonden read-only detectors rapporteren ontbrekende en mogelijk verweesde Storage-bestanden. De laatste TEST-inventaris bevat nul ontbrekende bestanden, nul ongeldige referenties en vijf verweesde kandidaten uit fictieve herstel/testfixtures. Er is niets automatisch verwijderd. Een accountplan inventariseert FK's en referenties voordat Auth-verwijdering overwogen wordt. Bestaande cascades naar notities en nullable historische actoren vragen expliciete behandeling. Er is geen destructieve cleanup- of accountverwijderexecutor en geen productiecleanup.

## 15. Backup/audit-security

Backupstart en download vereisen nu ook een actieve admin in de gedeelde Edge-handler. Jury en inactieve admin zijn getest en geweigerd. Portable bundles bevatten geen service-role secrets, wachtwoordhashes, sessies of MFA. De Production-restoreguard blijft intact. Audit behoudt begrensde operationele velden zonder vrije notitietekst, tokens of volledige foutpayloads. Denials blijven via bestaande foutcodes en platformdiagnostiek te onderzoeken.

De bestaande herstelregressie slaagt ook op hosted TEST met het nieuwe schema: alle applicatierijen en bestanden zijn gewist en uit de portable bundle teruggezet. Automatisch geverifieerd: 17/17 applicatiedatasets, 6/6 bestanden, 10/10 accounts; 20 datasets in de volledige bundle inclusief Auth en Storage-metadata. Foreign keys, rollen, memberships en heraangemaakte Auth-UUID-mappings zijn getest. De gemeten herstelduur tot succesvolle login plus groepsread is **12,000 seconden**, waarvan restore en automatische verificatie **8,982 seconden**. Dit is een gemeten herstel-RTO voor deze fixture, exclusief projecthervatting/operatorbesluit. **RPO: geen verlies ten opzichte van de backupsnapshot**; dit bewijst geen nul seconden RPO voor een continu veranderende productieomgeving. De herstelrapportvlag application_usable_verified blijft bij dit API-testpad false; browserbruikbaarheid is afzonderlijk bewezen door de aansluitende Preview-E2E.

De twee hosted backupbrowser-tests gebruiken de werkelijke Edge-gateway, inclusief portable download. De laatste vierrollencontrole bevestigt actuele restorestatus en TEST-backupstatus voor admin; audit bevat actor, actie, target, tijd en resultaat en is voor de drie andere rollen leeg.

## 16. Tests

| Categorie | Geslaagd |
|---|---:|
| Frontend unit: 15 bestaande + 24 security | 39 |
| Build/config guard | 5 |
| Recovery pure | 22 |
| Cron | 3 |
| Privacyplanner | 4 |
| Bestaande database-integratie | 28 |
| Security API/RLS/Storage/Realtime | 22 |
| Auth | 5 |
| Recovery database/audit/health | 21 |
| Backup-handler | 6 |
| Bestaande browser-E2E | 22 |
| Securitybrowser | 8 |
| Recoverybrowser | 2 |
| **Lokale basis, zonder dubbeltellingen** | **187** |
| Aanvullend: hosted services | 7 |
| Aanvullend: hosted signupconfirmation via Preview | 1 |
| **Verschillende tests over lokaal/hosted samen** | **195** |

Hosted opnieuw uitgevoerd: database 28, security API/RLS/Storage/Realtime 22, Auth 5, services 7, recovery database/audit/health 21, bestaande browser-E2E 22, securitybrowser 8, recoverybrowser 2 en confirmationbrowser 1: **116 geslaagd**. Deze overlappen de lokale basis en worden niet daarbij opgeteld. De vierrollencontrole is aanvullend bewijs, niet als extra tests geteld. Na de advisorrefinement slaagden lokaal opnieuw 31 security/Auth/privacychecks; op de laatste applicatiecommit ook 39 frontendtests, 40 pure/config/handlerchecks, build en lint.

Geen failures of skips in de definitieve runs. Eerdere testharnasproblemen met Realtime-ready timing en foto-load timing zijn opgelost met expliciete readinesschecks, zonder assertions te schrappen. Secretscan van 35 gewijzigde bestanden: nul bevindingen; diffcheck schoon. Diff-/RLS-review controleerde onder andere beide migrations, helpergrants, private RPC-wrapper, actuele actorcontroles en browserdoelbinding. Geen nieuwe dependencies of lockfilewijziging. Credentials, logs, builds en screenshots blijven genegeerde lokale artefacten. [Reproduceerbare instructies](../tests/security/README.md) bevatten fixturevolgorde en veilige doelbinding.

## 17. Advisors

Beide hosted advisors zijn na beide migrations uitgevoerd. **Geen ERROR en geen nieuwe WARN door deze hardening.** Twee nieuwe initplanmeldingen, twee nieuwe multiple-policy-meldingen en de melding voor de nieuwe publieke definer zijn opgelost. Autorisatietests zijn daarna opnieuw groen.

Resterend, historisch: security 12 meldingen voor bewust authenticated-uitvoerbare, intern geautoriseerde definers en 1 voor uitgeschakelde leaked-password protection. Performance: 9 initplan-WARN (baseline 10), 19 multiple-permissive-WARN (baseline 19), 2 duplicate-index-WARN, 8 unindexed-FK-INFO en 4 unused-index-INFO. Indexgebruik verandert door testverkeer. Historisch onderhoud valt buiten scope; de advisors zijn dus niet waarschuwingvrij.

Remediatie: [definer grants](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), [duplicate indexes](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index).

## 18. Git

- Branch: `hardening/security-roles-product`.
- Bevestigde uitgangsbasis main/origin/main: `352808e1cec7365f2f3fecee2600966c0b3ffba7`.
- Commits: `ff6e40b` implementatie, `a6dad7b` lokaal checkpoint, `153467e` hosted adapters/advisorrefinement, `b742352` Auth-callback en echte confirmationtest.
- Gevalideerde applicatiecommit: `b742352bc9b2a8a9245e881b4b4168be4293bac8`.
- De afsluitende rapportcommit verandert uitsluitend documentatie; definitieve branch-HEAD staat in de eindmelding. De hieronder gekoppelde Preview blijft het bewijs voor b742352.
- Totaal: 35 gewijzigde bestanden ten opzichte van de uitgangsbasis. Alleen deze hardeningbranch gepusht; geen merge naar main.

## 19. Preview

[Gevalideerde Vercel Preview](https://hit-csi-1-11-6wcv1pr8h-rforman89s-projects.vercel.app), deployment `dpl_Bq15kGjRNFgVp3QMwvUDFpoknrhN`, status **READY**, commit b742352.

Vier clientconfigvariabelen zijn uitsluitend voor Preview op deze branch ingesteld. Via env pull, deploymentmetadata en de daadwerkelijk geladen frontendbundle is **ksnagauoufsriwplvvtd** bewezen; de public key hoort bij TEST en er is geen service-role key in de bundle. De buildguard blijft fail-closed. Vercel-deploymentbeveiliging kan aanmelden bij Vercel vereisen. Na pauzeren van TEST blijft het statische Preview bestaan, maar zijn backendfuncties niet beschikbaar tot TEST wordt hervat.

## 20. Production

Production blijft `CSI HIT ALPEN`, projectref **uhfcrskkgutlqqogahbr**. Geen productiedata, Auth-configuratie, Storage, migrations of deployments zijn gewijzigd; main/origin/main zijn opnieuw als 352808e bevestigd. Het Production-deploymenttarget `dpl_DCQWNfp3Qw8JaJ2uesCteyjCG2Px` en alle 13 bestaande Vercel-envrecords zijn ongewijzigd. Een read-only controle van de live frontend op app.csi-hit.nl bewijst de Production-ref en passende public key, zonder servicekey. Bundle-SHA256: f1b857abd48ee41cb18e886a68ecc6b253a87383262fe4113aeec5bb24fd4762.

TEST is voor deze geautoriseerde validatie hervat en aangepast. IScout is niet door deze run gewijzigd. TEST kan nu worden gepauzeerd; er staat geen hosted test meer open.

## 21. Resterende risico's

- SMTP-bezorging naar echte mailboxen is niet getest; bevestigingslink, redirect en recovery-tokenflow wel. Productie-wachtwoordbeleid moet in een latere release apart beoordeeld worden; alleen TEST heeft nu minimum 12.
- Leaked-password protection is plan-afhankelijk en staat uit; historische advisor- en dependencywaarschuwingen zijn niet met brede onderhoudswijzigingen weggewerkt.
- Reeds uitgegeven game-signed-URLs blijven maximaal 300 seconden bruikbaar; backupdownloadlinks 60 seconden. Gedownloade bytes zijn niet intrekbaar.
- Private foto's, nieuw schema, Edge-handler en frontend vereisen een gecoördineerde latere release; een oude frontend kan na bucketomschakeling tijdelijk foto's verliezen.
- De schemafingerprint verandert: oude bundles vereisen een passend schemaspoor. Bestaande grenzen van 40 MiB bundles en een niet-atomaire DB/Storage-snapshot blijven gelden.
- Retentietermijnen zijn voorstellen; accountverwijdering en cleanup zijn alleen voorbereid als read-only plannen. Vrije tekst en openstaande transactieredenen kunnen persoonsgegevens bevatten.
- Bestaande dependencywaarschuwingen zijn niet via brede upgrades opgelost.

## 22. Conclusie

**Gereed voor production-review.** Lokale regressies, hosted autorisatie/Auth/Storage/Realtime, backup/restore/audit, advisors en de echte Preview zijn gevalideerd. De genoemde beperkingen en gecoördineerde releasevolgorde horen bij die review; dit is geen toestemming voor een Production-release.

**CSI HIT TEST kan nu veilig worden gepauzeerd en IScout kan worden hervat.** Geen verdere werkzaamheden in deze opdracht vereisen een actieve TEST-omgeving.
