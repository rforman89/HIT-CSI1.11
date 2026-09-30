# CSI HIT – Pilot Run Sheet

Huidige lijn: **HIT-CSI 1.11**. Pilotbasis: `bb29545`. Gebruik deze run sheet als draaiboek, de [checklist](PILOT-CHECKLIST.md) voor aftekenen en het [feedbacktemplate](PILOT-FEEDBACK-TEMPLATE.md) per bevinding. Plan circa 30–45 minuten met vier rollen en minimaal twee apparaten. Geen capaciteitstest.

## Pilot code freeze en versiebeleid

**Pilot code freeze is actief.** Vóór de pilot alleen een wijziging overwegen voor:

- **P0:** pilotblocker, dataverlies, securityprobleem of kritieke crash.
- **P1:** serieuze bug die pilotgebruik blokkeert of sterk verstoort.

Bij een blocker: stop de betrokken flow, noteer probleem, impact, component en minimale voorgestelde fix. Voer die niet automatisch op Production door. Geen algemene polish, refactors, nieuwe features, technische optimalisatie, nieuwe architectuur of nice-to-haves vóór de pilot. Wensen verzamelen.

Doelversie is **HIT-CSI 1.20**, pas na alle vier voorwaarden:

1. De echte pilot is succesvol afgerond.
2. Noodzakelijke BLOCKER/BUG-fixes zijn verwerkt.
3. Regressietests zijn groen.
4. De finale pilotreview is akkoord.

Tot die tijd geen packageversie 1.20, Git-tag `v1.20.0`, release 1.20 of UI-versienummer 1.20 toekennen.

## 1. Voorbereiding – Ronald / spelleiding

- [ ] Noteer datum, build, omgeving en verantwoordelijke. Production moet READY zijn; uitgangspunt is `bb29545`, backend `uhfcrskkgutlqqogahbr`.
- [ ] **Handmatige ingelogde Production-smoke blijft voor Ronald over.** Controleer bestaande participant-, suspect-, jury- en adminaccounts, hun rol en dossier-/groepskoppeling. Als een rolaccount ontbreekt: noteer dit als voorbereidingsactie; geen account aanmaken of resetten als onderdeel van de smoke.
- [ ] Doorloop met elk beschikbaar account read-only de onderstaande rolpunten en log daarna uit. Geen echte aankoop, vrijgave, pegelcorrectie, reset, mode-switch of accountwijziging voor deze voorbereidende smoke.
- [ ] Lees backupstatus, auditstatus via de bestaande beheerprocedure en spelmodus. Geen restore of backupbeheeractie. Een overgeslagen nachtbackup in TEST is iets anders dan een mislukte LIVE-backup.
- [ ] Controleer groepen/beginsaldi, aanwijzingen/prijzen/vrijgave, verdachten/foto's en agenda.
- [ ] Leg vooraf vast welke herkenbare pilotdata voor de echte kernflows gebruikt mag worden, wie toestemming geeft en wie de resultaten na afloop controleert. Geen echte speldata gebruiken voor verstoringsproeven. Zonder geschikte data de schrijvende flow niet uitvoeren.
- [ ] Telefoons/browser gereed: 390×844, 360×800 en één landscapevariant waar instelbaar. Controleer vooral navigatie, modals, feedback en toetsenbord. Geen volledige responsive suite.
- [ ] CSI HIT TEST niet hervatten en IScout ongemoeid laten voor deze voorbereiding.

## 2. Rollen

| Rol | Read-only smoke / aandachtspunt |
|---|---|
| Participant | Dashboard, klikbare kaarten, onderbalk, verdachte, aanwijzingen, saldo, notitiescherm, agenda en logout |
| Suspect | Eigen dashboard/dossier en beschikbare informatie; onderscheid tussen leeg, geen toegang en nog niet beschikbaar; navigatie en logout |
| Jury | Dossiers en navigatie; geen accountbeheer, reset, LIVE/TEST, backupbeheer of audit/technisch beheer bereikbaar |
| Admin | Dashboard, mobiele kaarten/onderbalk, groepen, aanwijzingen, verhoor, spelmodusweergave en read-only backup/audit |

Laat testers eerst zonder uitleg handelen. Een observator noteert waar hulp nodig is, zonder de gebruiker direct de weg te wijzen.

## 3. Kernflows – tijdens de echte pilot

Alle schrijvende acties hieronder uitsluitend met vooraf afgesproken pilotdata.

- [ ] Iedereen: login met Enter, rol herkennen, navigeren, overzicht terugvinden en logout.
- [ ] Participant: verdachte openen, notitie schrijven/opslaan/terugvinden; aanwijzing vinden; prijs en saldo lezen; één afgesproken aankoop uitvoeren; nieuw saldo en eventuele wachtstatus begrijpen.
- [ ] Jury: juiste groep en dossier kiezen, afgesproken testaanvraag vrijgeven, resultaat laten zien op het participantapparaat. Alleen bij een expliciet afgesproken testgroep een pegelcorrectie met reden uitvoeren en saldo controleren.
- [ ] Suspect: eigen dossier/verhoorinformatie en beschikbare groepsinformatie bekijken; beperkingen en lege toestanden uitleggen in eigen woorden.
- [ ] Admin: spel monitoren en relevante beheerschermen bereiken; backup- en auditstatus alleen lezen.
- [ ] Twee apparaten: notitie, vrijgave en pegelstand volgen via Realtime. Bij reconnect de stand opnieuw controleren voordat iemand een actie herhaalt.

## 4. Bewuste verstoringen

- [ ] Dubbelklik één vooraf afgesproken schrijfactie; controleer dat het resultaat niet dubbel is.
- [ ] Refresh en tab sluiten/openen: vind dezelfde stand en notitie terug.
- [ ] Korte netwerkonderbreking: lees de melding, herstel verbinding en controleer of de actie al verwerkt is. Niet blind opnieuw aankopen.
- [ ] Twee apparaten in dezelfde groep: controleer dezelfde stand en begrijpelijke updates.
- [ ] Verkeerd scherm kiezen en terugvinden; wissel portrait/landscape. Controleer sluitknop van een modal en zichtbare actiefeedback met toetsenbord open.

## 5. Technische observatie en classificatie

Noteer tijdstip, rol, scherm, apparaat, handeling en waargenomen resultaat bij errors, onverwachte vertraging, Realtime/reconnectproblemen en incidenten. Lees backupstatus; start geen hersteltest. Deel geen tokens, wachtwoorden of echte dossierinhoud.

| Categorie | Betekenis / vervolg |
|---|---|
| **BLOCKER** | Pilot kan niet betrouwbaar doorgaan. Stop de betrokken flow en leg minimale oplossing ter beoordeling voor. |
| **BUG** | Functionaliteit werkt aantoonbaar verkeerd. Bepaal impact; alleen urgente P0/P1 rechtvaardigt een fix vóór de pilot. |
| **FRICTION** | Gebruiker kan verder maar raakt serieus verward of vertraagd. Vastleggen voor review; niet automatisch bouwen. |
| **POLISH** | Verbetering zonder directe pilotimpact. Uitstellen. |
| **FEATURE IDEA** | Nieuwe wens. Alleen verzamelen, niet tijdens de pilot bouwen. |

Categorie en urgentie zijn afzonderlijk: een BUG is niet automatisch P0/P1. De freeze-regels bovenaan bepalen of een wijziging noodzakelijk is.

## 6. Na de pilot

- [ ] Verzamel feedback met het [template](PILOT-FEEDBACK-TEMPLATE.md), inclusief categorie, ernst en reproduceerstappen.
- [ ] Bespreek bevindingen met testers; selecteer uitsluitend noodzakelijke fixes en wijs eigenaar en vervolgactie toe.
- [ ] Controleer resultaten van afgesproken pilotacties. Geen algemene opruimactie of reset van Productiondata.
- [ ] Laat noodzakelijke fixes en regressieresultaten reviewen. Pas na finale goedkeuring beslissen over HIT-CSI 1.20.
- [ ] Overige wensen bewaren. Stop met bouwen totdat echte pilotbevindingen daar aanleiding toe geven.
