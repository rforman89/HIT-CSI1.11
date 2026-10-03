# Juryaccount – bestaande Production-flow

De juryrol bestaat al. Dezelfde login op https://app.csi-hit.nl/ gebruikt Supabase Auth. `public.profiles.role = 'jury'` en `is_active = true` geven toegang tot de juryomgeving; metadata uit registratie bepaalt geen rechten. Een juryaccount heeft geen groeps- of verdachtekoppeling nodig.

## Eén procedure voor Ronald en het nieuwe jurylid

1. Laat het jurylid op **app.csi-hit.nl → Registreren** een **nieuw, nog niet gebruikt e-mailadres**, naam en zelfgekozen uniek wachtwoord invoeren, en de bevestigingsmail volgen. Deel het wachtwoord niet in chat, logs of de repository. Controleer vooraf of dit e-mailadres niet al van een bestaand Production-account is.
2. Log als bestaande admin in. Kies **Beheer → Rollen en toegang**, controleer het e-mailadres van uitsluitend het zojuist gemaakte account, kies rol **jury** en controleer **Account actief**. Geef geen adminrol. Wijzig geen ander account.
3. Laat het jurylid opnieuw inloggen. Controleer **CSI HIT Jury**, dossiers, juryondernavigatie, pagina-refresh, uitloggen en opnieuw inloggen. Technisch beheer, accountbeheer, reset, LIVE/TEST en backupbeheer mogen niet beschikbaar zijn. Vrijgave en pegelcorrectie alleen op vooraf afgesproken veilige testdata.

Het registratieprofiel begint altijd als participant zonder groepsrechten. Bestaande accounts worden voor deze procedure niet omgezet of gereset. Ontbreekt de bevestigingsmail, controleer spam en laat Ronald de bestaande mailconfiguratie beoordelen; schakel bevestiging niet uit en maak geen tweede account aan.

De app heeft momenteel geen scherm om na een invite een wachtwoord te kiezen of om een wachtwoord te resetten. Daarom gebruikt deze procedure gewone registratie, geen invite of tijdelijk standaardwachtwoord. Er is geen nieuwe auth-flow of schemawijziging nodig.

## Rechten en controles

De actieve databaseprofielrol wordt bij login geladen. Jury leest dossiers, geeft aanwijzingen vrij via `release_group_clue` en corrigeert pegels via `mutate_group_credits`. RLS en controles in deze RPC's handhaven de rechten; frontendnavigatie alleen is niet de beveiliging. Profielwijzigingen vereisen `is_admin()`, zodat een jurylid zichzelf niet kan promoveren.

De applicatie kiest het dashboard op basis van het profiel, niet op basis van een admin-URL. Een direct bezoek aan `/admin` geeft een ingelogde jury daarom de juryomgeving, geen adminomgeving.

Lokale herhaalbare verificatie: bestaande `tests/security/auth.test.cjs`, `database.test.cjs` en `browser.test.cjs`, plus `jury-login.test.cjs` voor juryrefresh/relogin en directe URL-toegang. Gebruik LOCAL-fixtures en de lokale testserver volgens `tests/browser/PILOT.md`. `jury-login.test.cjs` weigert hosted targets. Gebruik geen Productioncredentials in testfixtures en hervat CSI HIT TEST hiervoor niet.
