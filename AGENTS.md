# ToDo_tool

Aanvulling op de globale en de `AI_kopgroep`-instructies. Wat de README al uitlegt staat hier niet.

## Wat dit is en hoe het uitrolt

Persoonlijke takenlijst in losse HTML, CSS en JavaScript met Supabase als database. Geen tool op
bouwman.tools en niet in `tools.json`. De repository is `Sylvainbouwman/todo`, **openbaar**, met
`master` als hoofdbranch.

- **Elke push naar `master` publiceert.** `.github/workflows/deploy.yml` (trigger: push op
  `master`) uploadt de hele wortel van de repository (`path: '.'`) naar GitHub Pages. Een merge
  zet de wijziging dus live op `sylvainbouwman.github.io/todo/`.
- Alles wat in de wortel staat wordt daarmee ook openbaar geserveerd, dus ook dit bestand en
  `OPENSTAAND.md`. Zet er niets in dat niet publiek mag zijn.
- `config.js` staat in Git en draagt de Supabase-gegevens die de pagina nodig heeft. Open of
  citeer hem niet. Zet nooit een andere sleutel in de wortel.
- Bouw op een eigen branch en laat Sylvain het voorstel mergen.

## Test

Er is geen testset en geen bouwstap (gemeten 02-10-2026: geen testbestand of `package.json`).
Controleer door `index.html` lokaal te openen. Dat laadt SortableJS en supabase-js van een CDN, dus
het vraagt internet. Er is geen aparte testdatabase: lokaal en live praten met dezelfde Supabase.
Maak, wijzig of verwijder dus geen taken om iets te proberen.

## Valkuilen

- `schema.sql` voer je eenmalig uit in de Supabase SQL Editor. Het beleid daarin staat alles toe
  (`OPENSTAAND.md` punt 1). Wijzig het niet zonder overleg, want de live pagina leunt erop.
- De regel "Laatste update" in de footer van `index.html` wordt bij een commit door de globale
  pre-commit hook gestempeld. Typ hem niet met de hand.
- Taken zijn persoonlijke gegevens van Sylvain. Haal ze niet op en neem ze niet over in
  voorbeelden of logs.
