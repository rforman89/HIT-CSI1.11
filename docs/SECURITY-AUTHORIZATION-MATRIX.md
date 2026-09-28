# Security-specificatie — fase 3

Ontwerp vastgelegd vóór codewijzigingen, 28 september 2026. Basis: main 352808e1cec7365f2f3fecee2600966c0b3ffba7. Productieschema uitsluitend read-only geïnventariseerd. Geen hosted writes toegestaan in deze fase.

## Besluit

Vier rollen: participant, suspect, jury, admin. Jury leest verhoordossiers en groepsvoortgang, geeft bestaande aanwijzingstoewijzingen vrij en corrigeert pegels via begrensde RPC's (gebruikerskeuze). Geen aparte owner: admin blijft organisatie/technisch beheer. Bestaande accounts houden hun rol.

Databaseprofiles zijn de bron van rechten; user_metadata en tokenclaims bepalen geen spelrol. profiles.is_active maakt intrekken mogelijk zonder historische data te verwijderen. Participant vereist daarnaast actueel membership én actieve groep. Suspect vereist actieve toegewezen verdachte via profiles.suspect_id; suspect_users blijft legacyrelatie, geen tweede autorisatiebron.

Open signup blijft compatibel met het bestaande organisatieproces. Nieuwe participant zonder actieve groep heeft uitsluitend toegang tot eigen profiel, uitloggen en beperkte foutdiagnostiek; geen speldata/Storage. Een account zonder profiel krijgt eveneens geen speldata. Geen automatische toekenning uit metadata.

## Matrix

R = lezen, W = wijzigen; alle rollen behalve anonymous vereisen actief profiel. Participant vereist actieve deelname; suspect eigen actieve koppeling. Admin kan ook inactieve speldata beheren.

| Resource / actie | Anonymous | Participant | Suspect | Jury | Admin/organisatie |
|---|---|---|---|---|---|
| Publieke landing / login / signup | Ja | Ja | Ja | Ja | Ja |
| Eigen profiel | Nee | R (ook inactief) | R (ook inactief) | R (ook inactief) | R/W alle |
| Profiel/rol/membershipbeheer | Nee | Nee | Nee | Nee | Ja |
| Agenda/categorieën | Nee | Zichtbare/actieve R | Zichtbare/actieve R | R | R/W |
| Algemene gratis aanwijzingen | Nee | Zichtbare actieve R | Alleen eigen dossier | R | R/W |
| Betaalde aanwijzingen | Nee | Catalogus; inhoud/bestand na aankoop | Alleen eigen dossier | R | R/W |
| Groepsdata/pegels | Nee | Eigen R | Actieve groepen R voor verhoor | R alle | R/W |
| Andere groepsnotities/statussen/aankopen | Nee | Nee | Alleen eigen verdachte R | R | R/W |
| Eigen groepsnotities | Nee | R; eigen auteur W | Alleen eigen verdachte R | R | R/W |
| Verdachtestatus per groep | Nee | Eigen groep R/W | Alleen eigen verdachte R | R | R/W |
| Verdachten/foto's | Nee | Actieve R | Eigen actieve R | R | R/W |
| Aankoop | Nee | Eigen groep via RPC | Nee | Nee | Beheertoewijzing |
| Aanwijzing vrijgeven | Nee | Nee | Nee | RPC bestaande toewijzing | Ja |
| Pegelcorrectie | Nee | Nee | Nee | Idempotente RPC + reden | Idempotente RPC + reden |
| Transacties | Nee | Eigen R | Nee | R | R |
| Meldingen | Nee | Eigen/groep R | Nee | Nee | R/W |
| Finale, indien ingeschakeld | Nee | Eigen R/W als open | Nee | R | R/W |
| LIVE/TEST en overige instellingen | Nee | Alleen veilige spelvlaggen R | Idem | Idem | R/W |
| Backupstatus / portable backup / audit | Nee | Nee | Nee | Nee | Ja |
| Reset / delete / technisch beheer | Nee | Nee | Nee | Nee | Bestaande guards |
| Restore | Nee | Nee | Nee | Nee | Geen frontend; service-tooling, Production verboden |
| CSV/exports | Nee | Nee | Nee | Geen export-UI | Ja, formules geneutraliseerd |
| Storage upload/replace/delete | Nee | Nee | Nee | Nee | Begrensde buckets/types/size |
| Storage download | Nee | Zelfde entitlement als inhoud | Eigen dossier | Dossiers | Alle spelbestanden |
| Backupbucket | Nee | Nee | Nee | Nee | Via geautoriseerde serverflow |

Vrijgeven verandert alleen requested naar released en zet timestamp; het verleent geen recht tot aanpassen van group_id/clue_id of willekeurige content. Huidig product ontsluit een betaalde aanwijzing al bij aankoop; vrijgeven introduceert geen nieuwe betaalmuur en verandert dat gedrag niet.

## Implementatiegrenzen

Bestaande row predicates blijven behouden waar correct. Gedeelde actieve-deelnamecheck sluit brede leespaden, inclusief definer-view en Storage. Jury krijgt expliciete SELECT-policies en twee specifieke mutatiepaden, geen algemene adminvlag. is_admin blijft uitsluitend admin.

Private fotobucket met korte signed URLs; bestaande eigen Storage-public-URL's worden als objectpad geïnterpreteerd. Geen externe foto-origins nodig volgens actuele inventaris. Reeds uitgegeven signed URLs blijven tot hun korte vervaltijd bruikbaar: revocatie wist geen eerder gedownloade bytes.

Geen productie-authconfigwijziging. Hosted verificatie van signup/bevestiging/reset, RLS, Storage, Realtime en headers volgt pas na expliciet hervatten van TEST. Privacytooling werkt standaard alleen lokaal en read-only; geen automatische verwijdering.
