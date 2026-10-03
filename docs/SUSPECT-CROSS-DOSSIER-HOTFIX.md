# Pilot-hotfix: verdachten lezen andere dossiers

3 oktober 2026. Basis: main `bb295455419689cbe635db619c466874eeebaabd`.
Uitsluitend lokale implementatie en validatie; geen hosted wijzigingen/deployment.

## Oorzaak en afbakening

Regressie bevestigd: selector en routing zijn aanwezig. `loadAppSnapshot` vraagt
alle door RLS toegestane verdachten op, inclusief ondertekende foto's. Security-
commit `ff6e40b` beperkte de eerdere actieve-verdachtenregel tot eigen verdachte,
actieve deelnemers en jury/admin. Daardoor ontving suspect maar één dossier,
verdween de selector en waren ook foto's van andere verdachten niet leesbaar.
Dit was expliciete security-hardening; de gewenste productfunctie vraagt een
gerichte uitzondering voor het profiel, niet voor andermans onderzoeksdata.

Twee aanvullende SELECT-policies: `suspect cross dossier read` op `suspects` en
`suspect cross dossier photo read` op `storage.objects`. Alleen een actieve
suspect met actieve eigen koppeling krijgt deze toegang; inactieve dossiers en
niet-gerefereerde foto's blijven gesloten. `is_own_suspect`, alle schrijfpolicies,
clue-entitlements, groepsrechten en jury/admin-RPC's blijven ongewijzigd.
Er worden geen functies, grants of rollen toegevoegd.

Leesbaar van andere actieve verdachten: naam, beschrijving, foto en technische
dossiermetadata (`id`, `is_active`, `sort_order`, `created_at`). Geen andere
notities, statussen, aankopen, clue-inhoud/bestanden, accounts, transacties,
finalegegevens of technisch beheer. Bestaande eigen onderzoeksinzage blijft.

De UI benoemt het bekeken dossier en heeft een gelabelde selector en terugknop.
Bij andere dossiers vervangt een uitleg over ontbrekende autorisatie de lege
onderzoeksstatistieken; er worden geen wijzigknoppen toegevoegd.

## Lokale validatie

Gebruik Node 24, `CSI_BACKEND=local` en zo nodig `CSI_DOCKER` voor de bestaande
lokale Docker-binary. Testhelper weigert elk ander API-adres dan 127.0.0.1:55421.

```text
npm run test:security:setup
node --test --test-concurrency=1 tests/security/suspect-dossiers.test.cjs tests/security/database.test.cjs tests/security/auth.test.cjs
npm run lint
npm run build
node tests/browser/serve.cjs
node --test --test-name-pattern="pilot suspect" tests/browser/pilot.test.cjs
git diff --check
npm run security:scan
```

De gerichte tests spiegelen A/B: profielen en foto's lezen, geen wijzigingen of
andermans onderzoek, geen participant/jury/adminacties. Ook deactivatie,
ontkoppeling, inactieve dossiers en verweesde foto's worden gecontroleerd.
De bestaande 27 database/auth-tests bewaken participant-, jury- en adminrechten.
Browsercontrole loopt via echte lokale Auth, RLS en Storage tot gerenderde foto,
selector, afschermingsmelding en terugkeer naar eigen onderzoek.

Resultaat: 4 gerichte RLS-tests, 27 bestaande database/auth-tests en 1 suspect-
browserflow geslaagd (32 totaal). Build, lint en `git diff --check` geslaagd;
secretscan: geen bevindingen. De browserflow is ook visueel gecontroleerd.

Hosted validation is hiervoor niet nodig. CSI HIT TEST blijft gepauzeerd.
Voor een latere production-release is afzonderlijke review en toepassing van
`20261003173654_suspect_cross_dossier_read.sql` plus frontend-release nodig.
Deze opdracht voert die stappen niet uit. Rollback van de rechten bestaat uit
het verwijderen van alleen deze twee toegevoegde policies; er is geen datamutatie.
