# CSI HIT herstelprocedure

**Huidig checkpoint: alleen lokaal bewezen. Hosted CSI HIT TEST en Preview moeten nog worden gevalideerd. Geen productierelease goedgekeurd.**

Production `uhfcrskkgutlqqogahbr` is een verboden restoretarget, zowel in Node als in SQL. Er bestaat geen force-optie. Deze opdracht autoriseert uitsluitend de lokale teststack en, na hervatting, CSI HIT TEST `ksnagauoufsriwplvvtd`. Een toekomstig nieuw herstelproject vraagt afzonderlijke operationele autorisatie.

## 1. Incident starten

1. Noteer UTC-tijd, incidentleider, symptomen en laatste bekende goede actie. Stop verdere spelmutaties organisatorisch; TEST-modus is **geen onderhoudsmodus** en blokkeert normale spelacties niet.
2. Sluit de herstelomgeving voor spelers: gebruik een nog niet gepubliceerde omgeving/Preview en laat organisatieaccounts uitloggen. Geen restore terwijl anderen schrijven.
3. Behoud de beschadigde bron voor onderzoek. Geen reset om te kijken of het helpt. Bewaar audit-/transactie-ID's en maak zo mogelijk een aanvullende export.
4. Kies een volledige bundle van vóór het incident. Controleer tijd, bronproject, release en volledigheid. Start de stopwatch; registreer hieronder iedere fase.

## 2. Backup vinden en controleren

Admin → **Klaar** → **Systeem / Backupstatus** → **Portable backup downloaden**. Alleen een succesvolle bundle levert een tijdelijke admin-downloadlink (60 seconden). Gebruik bij uitval de eerder buiten Supabase opgeslagen kopie. Een browser-CSV/JSON-schermoverzicht of oude nachtbackup zonder nieuw manifest is geen restorebundle.

```powershell
node scripts/recovery/cli.mjs verify --bundle 'D:\Herstel\csi-hit-backup.json'
```

Deze controle gebruikt geen backend en geen credentials. Bij fout: bestand behouden, een andere kopie zoeken, niet handmatig hashes aanpassen.

## 3. Doelomgeving en schema voorbereiden

1. Controleer het project in Supabase en noteer ref/URL. Production blijft verboden. Voor de oefening geldt uitsluitend CSI HIT TEST.
2. Checkout de gereviewde repositoryversie die bij de bundle hoort. Bewaar daarom naast de off-project bundle ook de Git-commit/repositoryrelease.
3. Op een **lege** omgeving: gebruik de schema-only legacy-testbootstrap gevolgd door alle repositorymigraties. `node tests/backend/migration-plan.cjs` schrijft het plan naar `.local/hosted-bootstrap.sql`. Inspecteer dit plan vóór toepassing. Het weigert een bestaande public database. Het is een TEST-bootstrap, nooit een productiemigratie.
4. CSI HIT TEST heeft de eerdere schema-opbouw al. Pas daar uitsluitend de nieuwe operationsmigratie toe, met expliciet projectref. Geen blinde `db push`: de rootconfig verwijst historisch naar Production. Controleer RLS, grants, functions, Storage-policies en security/performance advisors.
5. Marker: `app_settings.test_environment` moet exact het gekozen doel zijn. Op lokaal gebruikt `npm run test:recovery:setup` de vaste marker. Op een toekomstig ander, leeg herstelproject moet de beheerder na ref-verificatie bewust de juiste marker instellen. Wijzig nooit de marker van Production.
6. De buckets/policies moeten al bestaan en exact overeenkomen met het manifest. De restore weigert afwijkende public/private-status, MIME-allowlist of bestandsgroottelimiet. Standaard is `clue-files` privé en `suspect-photos` publiek.
7. De tool controleert schema-versie en kolomfingerprint; dat vervangt geen migratie-/policycontrole. Voer geen SQL uit die uit een onbekende backup afkomstig is.

## 4. Credentials klaarzetten

Gebruik een lokaal, genegeerd bestand met `PROJECT_REF`, `API_URL`, `ANON_KEY` en `SERVICE_ROLE_KEY` van **het doel**. Een bestaand `.local/hosted-backend.json` kan uitsluitend na verificatie voor CSI HIT TEST worden gebruikt. De restore verlangt een verifieerbare legacy service-role JWT met bijpassende projectclaim; opaque secret keys worden bewust geweigerd. Geef secrets niet als shellargument mee en zet ze nooit onder `REACT_APP_*`.

## 5. Accounts controleren en data herstellen

```powershell
node scripts/recovery/cli.mjs restore `
  --config .local/hosted-backend.json `
  --target ksnagauoufsriwplvvtd `
  --bundle 'D:\Herstel\csi-hit-backup.json' `
  --confirm 'RESTORE ksnagauoufsriwplvvtd' `
  --out .local/restore-report.json
```

Het doel wordt vóór elke wijziging getoond. Reeds bestaande records worden bewust vervangen; geen merge met oude spelstate. De outputnaam moet nieuw zijn. De tool valideert bundle, schema en buckets vóór datawijzigingen, controleert accounts, herstelt database atomisch, herstelt Storage en leest alles terug. PostgreSQL-FK's blijven actief. Bij een databasefout rolt de volledige data-import terug. Usertriggers zijn alleen gedurende die gecontroleerde import tijdelijk uit; DDL en data zitten in dezelfde transactie en worden samen teruggedraaid.

Accountmapping gebruikt bestaand ID én gecontroleerd e-mailadres, of één uniek bestaand account met dezelfde e-mail. Botsende ID/e-mail, dubbele of ontbrekende mappings blokkeren herstel. Profielen, groepsleden, suspect_users, notitie-auteurs, transactiemakers, notificatievelden, eindrapportindieners en settingsactors worden op de nieuwe IDs aangesloten. Historische auditactors zonder nog bestaand account blijven als historische UUID bewaard.

Ontbrekende accounts: herhaal met **`--recreate-accounts`** alleen na controle van de vertrouwde identiteitsinventaris. De tool maakt uitsluitend eerder bevestigde e-mailaccounts opnieuw aan via de Admin API, zonder wachtwoord en zonder uitnodiging te verzenden. [Supabase createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser). Niet-bevestigde, anonieme, phone-only of provider-only accounts vereisen een beoordeeld handmatig traject; geen stille reconstructie.

Na creatie zijn wachtwoorden, sessies, MFA en OAuth-identiteiten niet terug. Regel via het gecontroleerde Supabase-beheerproces nieuwe toegang/wachtwoordherstel met de juiste eigenaar. Test per rol een echte login. Verstuur uitnodigingen alleen wanneer de incidentleider dat expliciet autoriseert. Het restoreverslag bevat oude→nieuwe UUID's; bewaar dit vertrouwelijk. Een mislukte herstelpoging kan al accounts hebben aangemaakt; opnieuw uitvoeren hergebruikt ze na dezelfde e-mailcontroles.

## 6. Bestanden en verificatie

Storage wordt na de database teruggezet via de Storage API, inclusief gecontroleerd vervangen van bestaande bestanden en verwijderen van extra bestanden uit de twee herstelde spelbuckets. Dit deel is niet atomisch. Bij fout: omgeving gesloten houden en dezelfde geldige bundle opnieuw herstellen. Nooit halverwege spelers laten inloggen.

De rapportage geeft `17/17 datasets`, aantallen en inhoudshashes, bestanden met checksums, accounts/mapping en gemeten tijden. Alle FK's zijn door PostgreSQL afgedwongen. Toegangsbeleid is via migraties en roltests te verifiëren. De restore zet het spel altijd naar TEST. Bewuste verschillen: doelmarker, nieuwe Auth-IDs, Storage-project-URL's, modus/tijdmetadata en weglaten van de oude `latest_auto_backup`-verwijzing.

## 7. Frontend, configuratie en heropening

1. Stel alleen de betreffende **Preview-branch** in: `REACT_APP_ENVIRONMENT=test`, `REACT_APP_TEST_PROJECT_ID=ksnagauoufsriwplvvtd`, de test-URL en publieke test-anon-key. Backendkeys alleen server-side; de cronservicekey moet hetzelfde testproject bevatten. Stel `CSI_RELEASE` op de Edge Function in op de gereviewde commit indien beschikbaar.
2. Deploy de backupfunctie uitsluitend op het expliciete testproject. De functie omvat `index.ts` en de gedeelde `.mjs`-modules. Houd de eigen bearer/admincontrole actief (`verify_jwt=false` is geen publieke toegang).
3. Build de Preview en bewijs het daadwerkelijk ingebouwde endpoint/key. Geen Production-omgeving, domein of DNS wijzigen in deze opdracht.
4. Controleer login voor admin/deelnemer/verdachte, exact pegelbedrag en transactiehistorie, aanwijzing/vrijgave, notities/status, bestand/foto, rolafscherming en backupstatus. Een groene data-import is nog geen bruikbare applicatie.
5. Alleen na afzonderlijke releasegoedkeuring: productiegerichte configuratie, eventuele domein-/DNS-omschakeling, TLS, redirects en Auth site/redirect URLs controleren. Bewaar oude DNS-waarden en houd rekening met TTL. Geen DNS-wijziging als alleen een Vercel frontenddeployment wordt vervangen.
6. Incidentleider bevestigt de controles, maakt een nieuwe backup, registreert de werkelijke eindtijd en geeft heropening vrij. LIVE wordt bewust via de bestaande adminprocedure geactiveerd; nooit automatisch tijdens restore.

## 8. Gehoste oefening na het checkpoint

CSI HIT TEST moet eerst actief zijn en de hervatting moet in deze taak worden bevestigd. IScout hoeft niet tijdens lokale ontwikkeling gepauzeerd te zijn. Hervat/verplaats projecten niet zelfstandig.

Na migratie en `node tests/backend/setup-hosted.cjs`:

```powershell
node scripts/recovery/drill.mjs --target ksnagauoufsriwplvvtd --confirm 'DRILL ksnagauoufsriwplvvtd'
```

De drill heeft onafhankelijk van de algemene restoretool een vaste TEST/LOCAL-allowlist. Hij verlangt uitsluitend fictieve accounts/groepen, maakt herkenbare voortgang (saldo 142, 1205 notities, vrijgegeven aanwijzing, status, verdachtekoppeling en bestanden), schrijft verwachtingen en bundle, wist applicatiedata en bestanden, bewijst nul groepen, herstelt, controleert alles en test drie logins. Rapporten blijven in `.local/drill-<UUID>-*.json`. Daarna volgt de echte Preview-browserproef. Voer ook het afzonderlijke Auth-reconstructiescenario uit op hosted TEST; de lokale proef vervangt dit bewijs niet.

Na de eerste succesvolle hosted datadrill kan de branch worden gepusht en de Preview worden gebouwd. Controleer daarna de herstelde omgeving:

```powershell
node scripts/recovery/drill-smoke.mjs --target ksnagauoufsriwplvvtd --report .local/drill-<UUID>-report.json --url https://<verified-preview>.vercel.app --state .local/preview-browser-state.json
```

`--state` is alleen nodig voor Preview-toegangsbeveiliging. Het bestand bevat tijdelijke sessiegegevens en blijft lokaal. De smoke weigert een gebouwde frontend met het verkeerde endpoint/key. Voor een aaneengesloten tweede meting tegen een bestaande gereviewde Preview kun je `--smoke-url <Preview-URL>` en eventueel `--state <bestand>` aan de drill toevoegen. Geen nieuwe build/deployment verbergen in een technische restoreduur.

## 9. RPO en RTO bijhouden

Dagelijkse succesvolle backup betekent normaal maximaal ongeveer 24 uur dataverlies; mislukte jobs vergroten dit. Health waarschuwt na 30 uur (24 uur + 6 uur tolerantie), met dezelfde aanlooptermijn na LIVE-activatie. Off-project RPO is de leeftijd van de laatste **extern opgeslagen** bundle; een download die alleen in dezelfde dienst staat telt niet.

Noteer incidentstart, gekozen backup, laden/validatie, accounts, database, Storage, controle, eerste bruikbare login en vrijgave. Toolrapporten meten technische fasen; menselijk onderzoek, nieuwe omgeving, wachtwoordherstel en DNS horen óók bij operationele RTO. Lokale milliseconden zijn geen gehoste weekend-RTO. Gehoste RTO is op dit checkpoint nog onbekend.
