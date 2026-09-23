# CSI HIT — weekendchecklist

## Dag vóór het evenement

- [ ] Gereviewde release, migraties en Edge Function horen bij elkaar; build/tests groen.
- [ ] Gehoste herstelproef recent geslaagd: data, Storage, Auth-koppelingen én browsergebruik; verslag beschikbaar.
- [ ] Handmatige complete backup gemaakt, offline gevalideerd en buiten Supabase opgeslagen.
- [ ] Incidentleider en vervanger kennen bewaarplek en hebben eigen beheerrechten; geen gedeelde wachtwoorden.
- [ ] Deelnemer-, verdachte- en organisatieaccounts getest; belangrijke groeps-/verdachtekoppelingen gecontroleerd.
- [ ] LIVE-switchprocedure en veilige pegelretry bekend.
- [ ] Echte Android/iOS-telefoons, bestanden en zwakker netwerk getest.

## Vóór start

- [ ] Juiste domein, backend en release; geen Preview/testverwarring.
- [ ] Supabase/Vercel gezond; cron en servicecredentials horen bij dezelfde omgeving.
- [ ] Spelmodus bewust LIVE; nieuwe handmatige backup en off-project kopie.
- [ ] Backupstatus zichtbaar; eventuele aanlooptermijn betekent nog niet dat er al een backup is.
- [ ] Organisatieaccounts kunnen inloggen; saldo en laatste sync op twee apparaten kloppen.
- [ ] Offline noodregistratie en incident-/recoveryrunbook bereikbaar zonder de app.

## Tijdens het spel

- [ ] Organisatie controleert backupstatus op afgesproken momenten. Geen automatische externe alarmdienst: iemand moet kijken.
- [ ] Na grote speelfases extra handmatige backup/download; dagcron kan tot circa 24 uur voortgang verliezen.
- [ ] Foutmeldingen, verouderde sync en onbekende transactie-uitkomsten meteen onderzoeken.
- [ ] Eén eigenaar per incident; geen ongecontroleerde productiewijzigingen of hersteltests.

## Na het spel

- [ ] Finale complete backup plus gecontroleerde externe kopie; UUID en bewaarlocatie vastgelegd.
- [ ] Benodigde speloverzichten geëxporteerd; geen verwarring met restorebundle.
- [ ] Spelmodus bewust teruggezet; accounts/toegang volgens afspraken afbouwen.
- [ ] Retentie: in-project backups circa 30 dagen; externe kopieën en audit-/uitvoeringshistorie volgens afgesproken bewaartermijn beoordelen. Geen automatische verwijdering van bewijs tijdens een incident.
- [ ] Incidenten en herstelduur evalueren vóór volgend evenement.
