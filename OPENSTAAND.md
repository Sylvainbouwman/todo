# Openstaande punten ToDo_tool

## Open

### 1. De database staat voor iedereen open

- **Status:** open, gevonden op 02-10-2026
- **Eigenaar:** Sylvain
- **Vindplaats:** `schema.sql`, regel met `CREATE POLICY "Allow all"`; `config.js`

`schema.sql` zet row level security aan maar maakt een beleid met `USING (true)` en `WITH CHECK (true)`
voor alle bewerkingen. De pagina logt niet in (`app.js` gebruikt alleen de publieke sleutel uit
`config.js`), en de repository en de Pages-site zijn openbaar. Wie de pagina of de repository
opent, kan daarmee met dezelfde sleutel alle taken lezen, wijzigen en verwijderen.

Aangenomen op basis van het schema in de repository. Niet getest tegen de live database, want dat
zou de taken zelf aanraken. Of het beleid in Supabase echt zo staat, is in het Supabase-dashboard
na te kijken. Een oplossing vraagt een inlogstap of een privé hosting, en dus een eigen sessie.

**Aanvulling 02-10-2026:** er staat al een poging tot een oplossing op de branch
`claude/infallible-blackwell-3ea1e2` (lokaal en op GitHub), met twee commits die nergens anders
staan: inlog met Supabase Auth en een beperking van de taken tot de eigenaar. Die branch is nog niet
beoordeeld en niet gemerged. Hij wijkt af in alle zeven bestanden van de repository en raakt dus ook
`schema.sql`, waar de live pagina op leunt. Beoordeel hem in een eigen sessie in deze map voordat je
iets mergt, en verwijder hem niet voordat daarover is besloten.
