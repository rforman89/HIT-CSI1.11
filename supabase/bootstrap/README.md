# Databasebasis en drift

De bestaande 13 rootmigrations zijn **incrementeel** en worden niet hernoemd of opnieuw op Production afgespeeld. Voor een nieuwe lege applicatiedatabase is de volgorde:

1. Een lege Supabase Postgres 17-platformdatabase (Auth, Storage, rollen, extensions en `supabase_realtime`). Geen gewone kale Postgres zonder Supabase-platform.
2. De historische basis in `tests/backend/supabase/migrations/20260923171313_legacy_test_base.sql`.
3. Alle `supabase/migrations/*.sql`, oplopend op bestandsnaam.
4. Optioneel fictieve seed; nooit echte gebruikers/data kopiëren.

De historische bestandsnaam blijft behouden omdat bestaande TEST-manifests de inhoud hashen. De basis bevat schema/code en bucketdefinities, geen accounts of speldata. Het oude `tests/backend/schema.sql` blijft alleen voor de bestaande lokale fixturehelper; het is niet de canonical fresh-build-route.

## Veilige bewijsroute

Start de lokale stack zoals beschreven in [tests/README](../../tests/README.md). CLI tijdens deze fase: **2.114.0**, Postgres **17.6**. Controleer bij updates `supabase --help` en `supabase db query --help`.

```
npm run test:database:build
npm run schema:capture -- production
npm run schema:diff -- .local/build-hardening/schema-expected.json .local/build-hardening/schema-production.json
```

De eerste opdracht maakt alleen in container `supabase_db_csi-hit-reliability` een nieuwe willekeurig benoemde database. De Supabase-platformstructuur wordt lokaal **schema-only** gekopieerd; applicatietabellen, policies en public/private functies komen uitsluitend uit Git. `platform-defaults.sql` legt de benodigde historische Supabase-defaultgrants vast; de bestaande migrations trekken vervolgens browserrechten in. De proefdatabase wordt na afloop verwijderd, de bestaande lokale speldata blijven staan. Een externe URL of Productiontarget kan niet worden opgegeven.

De testseed weigert iedere database zonder de gegenereerde buildproof-naam, bevat vier fictieve rollen, groep, verdachte en aanwijzing, en wordt tweemaal uitgevoerd om herhaalbaarheid te toetsen. Storage-buckets komen uit het schema; de bestaande securityfixture uploadt fictieve bytes voor de echte Storage-tests. Seedmetadata zonder bijbehorende bytes wordt vermeden.

De tweede opdracht vereist een geauthenticeerde Supabase CLI in PATH of `CSI_SUPABASE_CLI`. Ze gebruikt een expliciete Production-ref en uitsluitend de repositoryquery `BEGIN READ ONLY`. Geen data, Auth-accounts of Storage-objecten worden geëxporteerd. Resultaten blijven in genegeerde `.local`. De comparator geeft exitcode 1 bij verschillen; alleen CRLF/LF en JSON-sleutelvolgorde worden genormaliseerd. Objectdefinities, grants, policies, buckets en publicaties blijven onderdeel van de vergelijking.

Een gelijke catalogus bewijst applicatieschema-pariteit, niet identieke Auth-dashboardinstellingen, Edge-deployments, platformversies of cronregistraties. De migratiehistorie zelf wordt apart beoordeeld in het eindrapport. Gebruik **geen blind `supabase db push` of `migration repair`** op Production: twee historische wijzigingen ontbreken als registratie en vijf geregistreerde versies verschillen van Git. Reparatie vereist een apart gereviewd releaseplan.
