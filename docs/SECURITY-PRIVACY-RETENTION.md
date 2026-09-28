# Privacy, Auth en retentie — technisch ontwerp

Dit is een technisch ontwerp, geen juridisch oordeel. Er wordt in deze opdracht geen productieaccount, bestand of historische rij verwijderd. Voorgestelde termijnen hieronder zijn operatorbeleid ter beoordeling, geen automatisch ingeschakelde taken.

## Persoonsgegevens

| Type | Bron/opslag | Toegang na hardening | Noodzaak/verwijderroute |
|---|---|---|---|
| E-mail, naam | Auth + profiles; registratie/admin | Eigen profiel en admin; Auth alleen serverbeheer | Login/contact; gecontroleerde Auth-verwijdering na FK-plan. Display name kan gepseudonimiseerd. |
| Rollen/actiefstatus | profiles | Eigen + admin | Autorisatie; is_active=false trekt speltoegang direct in. Geen rechten uit user_metadata. |
| Membership | group_members, suspect_users; profiles.suspect_id is verdachte-autorisatiebron | Eigen gekoppelde deelnemer/verdachte en admin | Groepsrechten; verwijderen trekt deelname in zonder spelhistorie te wissen. |
| Notities | suspect_notes.note, auteur-UUID | Eigen actieve groep, eigen verdachte, jury, admin | Verhoor/spel; vrijetekst kan persoonsgegevens bevatten. Review/anonymiseer tekst; niet blind user cascade. |
| Verdachtenfoto/omschrijving | suspects + private suspect-photos | Actieve deelnemers; eigen verdachte; jury/admin | Spel; verwijder bronverwijzing en object uitsluitend na referentiecontrole. |
| Aanwijzingen/uploads | clues_base + private clue-files | Entitlement volgens matrix; admin schrijft | Geen openbare public URLs; exact objectpad + korte signed URL. |
| Transacties | credit_transactions met actor, bedrag, reden | Eigen groep, jury, admin | Financiële spelintegriteit; totalen behouden, actor na review pseudonimiseren/set null. Reden geen onnodige persoonsgegevens. |
| Audit | operation_audit, backup_runs | Admin; serverbeheer | Actor-UUID + allowlist van IDs, rollen, bedragen/statussen; geen e-mail, notitietekst, foto, token of stack in audit. |
| Diagnostiek | client_diagnostics | Eigen authenticated schrijft via begrensde RPC; admin leest | Categorie/scherm/release/actor; rate limit. Geen foutpayload of URL. |
| Backups | Private backups; externe portable kopie | Geautoriseerde actieve admin/server | Bevat accountcontactgegevens en speldata. Geen passwords/hashes/sessies/MFA of servicekeys. Externe kopie vertrouwelijk bewaren. |
| Sessies | Supabase Auth; browserlocalStorage | Auth client, platformbeheer | Uitloggen beëindigt refreshsessie; bestaande JWT kan tot expiratie bestaan. Database hercontroleert actuele profiel/membershipstatus. |
| Openstaande pegelactie | sessionStorage, per project + actor | Zelfde browsertab/origin | Opgeslagen idempotencyreceipt blijft tot afhandeling/sluiten tab, om onbekende transacties niet dubbel te boeken. Niet als onopgeslagen formulier behandelen; geen wachtwoord/token. Gebruik geen persoonsgegevens in reden. |
| Platform-IP/technische logs | Supabase/Vercel beheerde logs | Platformbeheerders | Incidentdiagnose. Platformretentie/quota afzonderlijk controleren; niet gekopieerd naar appaudit. |

Jury krijgt geen andere profile-e-mails of membershiplijst. Reacttekst blijft escaped; geen dangerouslySetInnerHTML of HTML-sanitizer nodig. URL's voor foto's/bijlagen worden als eigen Storage-paden gecontroleerd. Console-renderlogging bevat voortaan alleen een vaste foutcategorie.

## Auth-inventaris en keuze

Read-only productiecontrole op 28 september: email-login enabled, disable_signup=false, mailer_autoconfirm=false (e-mailbevestiging vereist), anonymous_users_enabled=false, phone=false. Deze instellingen zijn niet gewijzigd.

Production-wachtwoordminimum, concrete serverratelimits en sessieduur zijn niet via de beschikbare read-only public settings te verifiëren. Ze worden niet als gecontroleerd geclaimd. TEST is later via het ingelogde dashboard gecontroleerd: minimum 6 naar 12, JWT 3600 seconden, refresh replay detection aan met 10 seconden reuse. Limieten per vijf minuten: refresh 150, verify 30, login/signup 30. Leaked-password protection staat uit; het dashboard vereist hiervoor Pro. Production-configuratie is niet gewijzigd.

Op TEST getest: minimaal 12 tekens voor nieuwe/gewijzigde wachtwoorden; e-mailbevestiging aan; anonymous sign-ins uit; Site URL exact de gevalideerde Preview, zonder wildcardredirects; refresh-tokenrotatie aan. Standaardratelimits en sessieduur zijn behouden. Geen bestaande accounts automatisch gereset. Een eventuele latere productieaanpassing vereist een aparte configuratievergelijking en releasebesluit.

Lokale en hosted tests bewijzen: onbevestigde login geweigerd, bevestigde login zonder game entitlement, geldig recovery-token/password-update, oude password geweigerd, refresh vóór en geweigerd na logout, anonieme signin en te kort password geweigerd. Een echte signupbevestigingslink is in de Preview-browser gevolgd, met exact toegestane redirect en zonder achterblijvende Auth-tokens in het URL-fragment. Fictieve .test-adressen worden voor mailaanvragen door de provider geweigerd; confirmationtokens zijn daarom servermatig gegenereerd zonder SMTP. Mailbezorging is niet bewezen. Password recovery is een ondersteunde Auth-procedure; de applicatie heeft geen eigen resetwachtwoordscherm. Organisatie gebruikt de Auth-beheerflow. Geen wachtwoorden mailen of in logs tonen.

[Supabase password security](https://supabase.com/docs/guides/auth/password-security)
— [Sessions](https://supabase.com/docs/guides/auth/sessions)
— [Sign out](https://supabase.com/docs/guides/auth/signout)

## Retentievoorstel

- Evenement eindigt: admin zet groepen of betrokken accounts inactief. Er bestaat geen round/evenement-entiteit met einddatum; geen automatische datum aannemen.
- Accountcontacten en persoonlijke vrijetekst: voorstel review/verwijderen of pseudonimiseren binnen 90 dagen na vastgesteld einde. Operator stelt datum en eventuele uitzonderingen vast.
- Spelresultaten: geaggregeerde scores/statistiek kan na verwijdering van persoonskoppelingen blijven. Niet impliciet ruwe notities/foto's behouden.
- Audit: voorstel 90 dagen na einde/afsluiting incident; eventueel langere afgebakende incidentbewaring. Geen nieuwe automatische auditpurge.
- Diagnostiek: bestaande maintenance verwijdert na 30 dagen.
- Backups: bestaande maintenance ruimt herkende oude objecten na 30 dagen op, maar bewaart de laatste succesvolle bundle. Die laatste kan dus ouder worden; expliciet externe kopieën en laatste bundle meenemen in privacyafhandeling.
- Geen verwijdering starten op basis van alleen het ontbreken van een DB-verwijzing: een bestand kan nog in een lopende upload zitten.

## Accountverwijdering

1. Dry-run met account-ID, verwijzingen en FK-acties; noem geen accountcontactgegevens in het rapport.
2. Maak profiel inactief; trek refreshsessies in. Dit is de onmiddellijke toegangsmaatregel, los van historische anonimisering.
3. Controleer memberships, suspectkoppeling, notities, notificaties, transacties, app_settings.updated_by en final_reports.submitted_by.
4. Voorkom de bestaande CASCADE van profile-verwijdering naar auteursnotities. Kies expliciet tekst verwijderen versus auteur pseudonimiseren; behoud score en transactiehistorie.
5. Nullable actor-FK's eerst gecontroleerd ontkoppelen; harde Auth-deletion kan anders worden geblokkeerd. Audit-UUID zonder FK blijft pseudoniem en kan in backups opnieuw gekoppeld worden.
6. Verwijder Auth pas na referentieplan en operatorbevestiging; geen generieke cascade-script aanbieden.
7. Storage apart via API verwijderen na referentie- en retentionreview; user-deletion ruimt objecten niet betrouwbaar als productflow op.
8. Houd rekening met terugkeer van accounts uit oudere bundles. Pas na herstel de geldende blokkade-/verwijderadministratie opnieuw toe.

Er is bewust geen destructieve executor. De bestaande cascade/restrict/set-null-relaties worden door het read-only plan live uit de lokale catalogus gehaald.

## Tooling

`node scripts/privacy/inspect-local.cjs` rapporteert ontbrekende bestanden, verweesde kandidaten en ongeldige externe referenties. `node scripts/privacy/inspect-local.cjs <account-uuid>` voegt een accountverwijderplan en FK-inventaris toe. Alleen de vast ingestelde CSI HIT-stack op 55421/55422 is toegestaan, zonder productieoptie. Geen credentials of bestandsinhoud in output; paden en UUID's zijn operationele metadata.

Pure planner heeft tests voor deduplicatie, ontbrekende/verweesde objecten, uitsluiten van backupbucket en niet-destructief accountplan. `node scripts/privacy/inspect-hosted.cjs` gebruikt de expliciet geverifieerde TEST-adapter. Laatste hosted inventaris: nul ontbrekende bestanden, nul ongeldige referenties, vijf orphan-kandidaten uit fictieve fixtures. Geen automatische verwijdering of productiecleanup.

## Grenzen en releasevolgorde

Signed foto-/clue-URLs zijn maximaal 300 seconden bruikbaar, backup-downloadlinks 60 seconden. Intrekken voorkomt nieuwe links, maar maakt al uitgegeven links/gedownloade bytes niet ongedaan.

Bij een latere release moeten nieuwe migration, actieve-admincontrole in de Edge Function en frontend bij elkaar passen. Oud frontend gebruikt publieke foto-URLs; na private maken kan dat tijdelijk afbeeldingen verliezen. Plan een gecontroleerde omschakeling. Schemafingerprint verandert door is_active: oude bundles vereisen een passend schemaspoor in herstelomgeving, geen guard omzeilen. De volledige lokale restore-regressie is met het nieuwe schema getest.
