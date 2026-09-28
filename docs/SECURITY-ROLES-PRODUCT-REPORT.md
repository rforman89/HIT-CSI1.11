# Security, Roles & Product Hardening — lokaal checkpoint

Datum: 28 september 2026.

**Klaar voor hosted security validation – CSI HIT TEST moet worden hervat.**

## 1. Executive summary

De lokale implementatie en regressievalidatie zijn afgerond: 187 verschillende tests geslaagd. Jury kan dossiers lezen, aangevraagde aanwijzingen vrijgeven en pegels corrigeren, zoals door de opdrachtgever bevestigd. Technisch beheer blijft bij actieve admins. Nieuwe, ongekoppelde en inactieve accounts krijgen geen speltoegang. Foto's zijn lokaal privé, exports zijn beschermd en browserheaders zijn voorbereid en lokaal getest.

Dit is uitsluitend het lokale checkpoint. CSI HIT TEST is niet hervat; er is niets gepusht of gedeployed. Gehoste validatie blijft een releasevoorwaarde.

## 2. Securityarchitectuur voor/na

De read-only productie-inventaris omvat 20 RLS-tabellen, 6 security-invoker-views, 63 policies en 38 applicatiefuncties. De bestaande basis beschermde groepsmutaties en betaalde aanwijzingen, maar sommige leesrechten waren breder dan actieve deelname en foto's stonden publiek.

De nieuwe migration voegt actieve deelname als aanvullende serverregel toe, beperkt juryacties via gerichte RPC's en maakt foto's privé. Bestaande eigendomsregels blijven behouden. UI-verbergen is geen autorisatiegrens. Zie [volledige inventaris](SECURITY-INVENTORY.md).

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

De oorspronkelijke 38 applicatiefuncties zijn afzonderlijk geïnventariseerd. Helpers hebben expliciete grants en veilige search paths. `release_group_clue` controleert actieve jury/admin en verandert uitsluitend een aangevraagde vrijgave; herhalen wijzigt de vrijgavetijd niet. `mutate_group_credits` behoudt actorbinding, verplichte reden, locks en idempotency. Lokale controle vond geen ongewenst anon-uitvoerbare definerfunctie. Privileged service-/restorefuncties blijven afgeschermd.

## 9. Storage

`suspect-photos` is in de lokale migration private. De frontend gebruikt signed URLs en bewaart het oorspronkelijke objectpad; oude eigen Supabase-public-URLs worden zonder herschrijven van speldata als pad geïnterpreteerd. Clue-files vereisen exacte aanspraak; jury kan geen verweesde bestanden downloaden. Uploads hebben type-/groottelimieten, willekeurige paden en geen upsert. Padvalidatie weigert externe origins en traversal. Backups blijven private. Tests omvatten ongeoorloofde toegang, uploads, delete en echte signed-URL-expiratie.

## 10. CSV/export

CSV neutraliseert spreadsheetformules, inclusief voorafgaande whitespace/controltekens; quoting, regeleinden, UTF-8 BOM en delimiters zijn getest. JSON-export gebruikt oorspronkelijke fotopaden en verwijdert tijdelijke signed URLs, ook uit geneste relaties. Asynchrone downloads/exports controleren of de oorspronkelijke sessie nog actief is.

## 11. Browserheaders/CSP

Voorbereid in vercel.json: CSP, DENY, nosniff, no-referrer, Permissions-Policy en HSTS. Scripts komen van self, zonder unsafe-inline/eval; bestaande inline React-stijlen vereisen style-src unsafe-inline. Supabase-origins zijn expliciet. Framing is in een echte browser geblokkeerd; login, foto's, modals, downloads en gewijzigde mobiele schermen werken lokaal. React escaping is met opgeslagen aanvalstekst getest. De lokale server gebruikt dezelfde headers met uitsluitend de TEST-origin vervangen door localhost en zonder lokale HSTS. Vercel-enforcement is nog niet bewezen.

## 12. Auth/passwords/sessions

Read-only hosted public settings bevestigen open signup, e-mailbevestiging verplicht, anonymous sign-ins uit en phone uit. Wachtwoordminimum, concrete ratelimits en sessieduur zijn daarmee niet verifieerbaar en blijven open hosted checks. Leaked-password protection was volgens eerdere advisor uit; beschikbaarheid is plan-afhankelijk. Er is geen productie-Auth-instelling gewijzigd.

Lokale echte Auth-tests bewijzen confirmation-status, login, recovery-token/password-update, refresh en logout. Mailbezorging en hosted redirectconfig zijn nog niet getest. Er is geen nieuw resetwachtwoordscherm; de bestaande organisatie/Auth-beheerflow blijft van toepassing. Accountwisseling remount applicatiestate en wist drafts/modals; oude requests kunnen geen oude gegevens terugzetten. Openstaande, per actor gescheiden idempotencyreceipts blijven bewust in sessionStorage tot afhandeling of sluiten van de tab.

## 13. Privacy inventory

[Privacy- en retentieontwerp](SECURITY-PRIVACY-RETENTION.md) specificeert bron, opslag, toegang, noodzaak en verwijderroute voor contactgegevens, rollen, memberships, notities, foto's, uploads, transacties, audit, diagnostiek, backups, browsersessies en platformmetadata. Jury krijgt geen andere profiel-e-mails of membershiplijst. Console-renderfouten loggen alleen een vaste categorie.

## 14. Retentie/account removal

Voorstel: persoonsgebonden gegevens en audit beoordelen binnen 90 dagen na een vastgesteld evenementseinde; geen nieuwe automatische purge. Bestaande diagnostiekretentie is 30 dagen; backupcleanup bewaart de laatste succesvolle bundle ook als deze ouder is. Externe kopieën vereisen apart beheer.

Een lokale read-only detector rapporteert ontbrekende en mogelijk verweesde Storage-bestanden. Een accountplan inventariseert FK's en referenties voordat Auth-verwijdering overwogen wordt. Bestaande cascades naar notities en nullable historische actoren vragen expliciete behandeling. Er is geen destructieve cleanup- of accountverwijderexecutor en geen productiecleanup.

## 15. Backup/audit-security

Backupstart en download vereisen nu ook een actieve admin in de gedeelde Edge-handler. Jury en inactieve admin zijn getest en geweigerd. Portable bundles bevatten geen service-role secrets, wachtwoordhashes, sessies of MFA. De Production-restoreguard blijft intact. Audit behoudt begrensde operationele velden zonder vrije notitietekst, tokens of volledige foutpayloads. Denials blijven via bestaande foutcodes en platformdiagnostiek te onderzoeken.

De bestaande lokale herstelregressie slaagt met het nieuwe schema; er is geen nieuwe hosted restore drill uitgevoerd of vereist voor deze fase. Lokale browsertests gebruiken de echte gedeelde handler met lokaal transport, niet de hosted Edge-gateway.

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
| **Totaal, zonder dubbeltellingen** | **187** |

Geen failures of skips in de afgeronde runs. Build en lint slagen. Secretscan van de 29 gewijzigde bestanden: nul bevindingen; diffcheck van de uiteindelijke branch: schoon. Geen nieuwe dependencies of lockfilewijziging. Testcredentials, lokale logs, builds en screenshots blijven genegeerde lokale artefacten. Responsieve screenshots zijn visueel gecontroleerd. [Reproduceerbare instructies](../tests/security/README.md) bevatten fixturevolgorde en veilige lokale doelbinding.

## 17. Advisors

Lokale catalogus- en migrationreview controleren RLS, grants, definer/search_path, views en relevante bestaande indexes. Hosted security/performance advisors zijn nog niet uitgevoerd voor deze migration en worden niet als groen geclaimd. Eventuele nieuwe relevante bevindingen moeten tijdens de hosted fase worden opgelost; historisch losstaand onderhoud blijft buiten scope.

## 18. Git

- Branch: `hardening/security-roles-product`.
- Bevestigde uitgangsbasis main/origin/main: `352808e1cec7365f2f3fecee2600966c0b3ffba7`.
- Functionele commit: `ff6e40b8bc8ffe303bca6e141d406a6616e8f0e4`.
- Volgende rapportcommit bevat dit rapport en uitsluitend normalisatie van afsluitende lege regels; definitieve HEAD staat in de checkpointmelding.
- Totaal: 29 gewijzigde bestanden ten opzichte van de uitgangsbasis. Geen push, merge of deployment.

## 19. Preview

Geen nieuwe Preview in deze lokale fase. Vervolg: uitsluitend deze branch pushen en Preview aantoonbaar koppelen aan `ksnagauoufsriwplvvtd`. De TEST-adapter en concrete Preview-allowlist worden pas na verificatie van de actieve TEST-omgeving aangesloten; de Production-blokkade blijft behouden.

## 20. Production

Production blijft `CSI HIT ALPEN`, projectref `uhfcrskkgutlqqogahbr`. Deze run heeft uitsluitend schema/configuratiemetadata en tellingen gelezen. Geen productiedata, Auth-configuratie, Storage, migrations of deployments zijn gewijzigd; main is niet gewijzigd. Hosted CSI HIT TEST en IScout zijn niet hervat, gepauzeerd of aangepast.

## 21. Resterende risico's

- Hosted Auth/RLS/Storage/Realtime, Edge-gateway, advisors en echte Preview-headers/E2E zijn nog vereist.
- Auth-managementinstellingen en mail/redirectgedrag moeten nog worden geverifieerd; het voorgestelde wachtwoordbeleid is niet live ingesteld.
- Reeds uitgegeven game-signed-URLs blijven maximaal 300 seconden bruikbaar; backupdownloadlinks 60 seconden. Gedownloade bytes zijn niet intrekbaar.
- Private foto's, nieuw schema, Edge-handler en frontend vereisen een gecoördineerde latere release; een oude frontend kan na bucketomschakeling tijdelijk foto's verliezen.
- De schemafingerprint verandert: oude bundles vereisen een passend schemaspoor. Bestaande grenzen van 40 MiB bundles en een niet-atomaire DB/Storage-snapshot blijven gelden.
- Retentietermijnen zijn voorstellen; accountverwijdering en cleanup zijn alleen voorbereid als read-only plannen. Vrije tekst en openstaande transactieredenen kunnen persoonsgegevens bevatten.
- Bestaande dependencywaarschuwingen zijn niet via brede upgrades opgelost.

## 22. Conclusie

**Nog niet gereed voor production-review.** De lokale implementatie en validatie zijn afgerond, maar hosted beveiliging en Vercel Preview moeten nog aantoonbaar slagen.

**Klaar voor hosted security validation – CSI HIT TEST moet worden hervat.** Na expliciete beschikbaarstelling en status ACTIVE_HEALTHY is naar schatting 45–75 minuten nodig voor TEST-migration/handler, fictieve accounts, hosted Auth/RLS/Storage/Realtime, advisors en Preview-E2E. Mail- of platformproblemen kunnen dit verlengen. TEST is op dit checkpoint niet nodig om actief te houden; stop hier totdat de gebruiker de omwisseling beschikbaar stelt.
