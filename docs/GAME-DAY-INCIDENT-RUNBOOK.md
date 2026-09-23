# CSI HIT — incidentkaart

**Eerst:** noteer tijd, scherm, groep/accountrol, laatste actie en actie-ID. Wijs één incidentleider aan. Geen gelijktijdige correcties door meerdere admins. Wachtwoorden, tokens en volledige notities horen niet in incidentmeldingen.

| Situatie | Doe nu | Daarna |
|---|---|---|
| App werkt nergens | Probeer een tweede apparaat/netwerk; controleer domein en TLS. Bekijk Vercel deploymentstatus/runtimefouten en Supabase projectstatus, API/Auth/Storage logs. | Bij platformstoring: spel organisatorisch pauzeren. Geen database-reset of blinde redeploy. |
| Eén gebruiker heeft een probleem | Controleer netwerk, accountrol/groepskoppeling en tijd van laatste sync. Laat de lopende actie eerst uitzoeken. | Bij onbekende pegeluitkomst eerst historie/actie-ID controleren; daarna verversen, opnieuw inloggen of ander apparaat. Nooit andermans account delen. |
| Data lijkt verkeerd | Stop correcties. Zoek de groep/target-ID in `operation_audit`, controleer transacties en backupstatus. | Vergelijk actor, tijd en before/after. Bepaal één bewuste correctie; bewaar oorspronkelijke historie. |
| Pegels verkeerd | Controleer `credit_transactions.action_id`, `amount`, `balance_after`, actor en groep. | Herhaal bij onbekende uitkomst de bestaande actie-ID via retry. Voor een echte correctie: één nieuwe adminmutatie met expliciete reden; saldo nooit los met SQL aanpassen en historie niet verwijderen. |
| Realtime loopt achter | Controleer foutmelding en ‘Bijgewerkt’-tijd bovenin; herstel verbinding, ga terug naar zichtbare tab. | Snapshotpolling loopt ongeveer iedere tien seconden; ververs veilig als gegevens achterblijven. Browser-online alleen is geen bewijs dat Supabase bereikbaar is. |
| Backup mislukt/achterstallig | Admin → Klaar → Systeem / Backupstatus: poging, foutcode, tijd, cleanupmelding en UUID vastleggen. | Nu backup maken; bij onduidelijke uitkomst dezelfde poging controleren. Download succesvolle portable bundle en bewaar elders. CLI-alternatief hieronder. |
| Browserfout | Noteer scherm, tijd, rol en release. Admin kan `client_diagnostics` bekijken; categorieën render/unhandled/promise/sync. | Serverlogs: Vercel `/api/keep-alive`, Supabase Edge `csi-hit-nightly-backup`, Postgres/Auth/Storage logs. Diagnostiek bevat bewust geen fouttekst of notitie-inhoud. Offline fouten kunnen niet worden verstuurd. |
| Ernstige corruptie | Stop het spel organisatorisch en sluit de herstelomgeving voor spelers. Bewaar brongegevens en logs. | Volg [DISASTER-RECOVERY.md](DISASTER-RECOVERY.md). Geen restore op Production; een gecontroleerde herstelomgeving en aparte releasebeslissing zijn nodig. |
| Supabase volledig onbereikbaar | Kondig pauze aan. Gebruik papieren/vertrouwelijke offline noodregistratie met tijd, groep, actie-ID en gewenste wijziging. | Geen transacties ‘op goed geluk’ blijven klikken. Bij herstel eerst vergelijken/reconciliëren; maak geen dubbele pegelacties. Bij langdurige uitval: off-project bundle en herstelrunbook. |

## Handmatige portable noodexport

Alleen wanneer de backend bereikbaar is en de operationsmigratie aanwezig is:

```powershell
node scripts/recovery/cli.mjs backup --config .local/verified-backend.json --target <geverifieerde-ref> --out .local/new-portable.json
node scripts/recovery/cli.mjs verify --bundle .local/new-portable.json
```

Deze opdracht schrijft ook de in-project backup. De operationsrelease van 23 september 2026 heeft dit backupmechanisme op Production gecontroleerd. Voer een productiebackup bewust uit met geverifieerde productieconfiguratie en beheerautorisatie; een restore naar Production blijft verboden. Kopieer de gecontroleerde download naar afgesproken externe opslag, met beperkte toegang. Leg tijd/UUID en bewaarplek vast, geen credentials.

## Frontend rollback

1. Controleer of het incident frontendcode betreft. Bewaar deployment-ID, commit en tijd. Kijk in Vercel welke eerdere deployment daadwerkelijk goed was.
2. Controleer databasecompatibiliteit vóór terugzetten. De oude frontend van vóór core hardening gebruikt een ingetrokken pegel-RPC: die terugzetten kan mutaties breken. Ook de nieuwe backupinterface vereist de operationsmigratie én Edge worker.
3. Na expliciete releasebeslissing: Vercel project → Deployments → gekozen compatibele Ready-deployment → rollback naar de bedoelde omgeving. Controleer domeinen, drie rollen en schrijfflows. Geen automatische down-migratie.
4. Previewproblemen los je op in Preview. Een verdere Production deployment vraagt een eigen releasebeslissing.

## Audit opzoeken (admin, read-only)

Gebruik Supabase Table Editor/SQL Editor met beperkte beheerrechten. Filter `operation_audit` op `target`, `actor`, `action_id` en tijd; newest first. Pegelacties bewaren hun UUID, andere gekoppelde mutaties delen een transactie-ID. Actietypen bevatten tabel en insert/update/delete; reset en demo-cleanup hebben daarnaast een expliciete actieregel, ook bij nul gewijzigde rijen. Serviceacties hebben een lege actor. Backupacties hebben hun eigen duurzame registratie in `backup_runs`: UUID, actor (of NULL voor servicebeheer), source, start/eindtijd, status en counts. Ze krijgen in deze versie geen dubbele regel in `operation_audit`. Geweigerde transacties rollen inclusief audit terug: zoek mislukte pogingen in platformlogs. Geen onbewezen ‘succes’ uit een clientlog afleiden.

Bij escalatie deel je alleen tijd, release, foutcategorie, request/actie-ID en betrokken groep-ID. Auth-support of ontvangen wachtwoordherstellinks gaan via het afgesproken privébeheerproces.
