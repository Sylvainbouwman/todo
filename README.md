# ToDo

Persoonlijke takenlijst-app, toegankelijk op desktop én telefoon.

**Live:** https://sylvainbouwman.github.io/todo/

## Functionaliteit

- Taken per dag gegroepeerd (te laat / vandaag / morgen / volgende dagen)
- Dag en tijdstip inplannen, tijdsduur schatten per taak
- Totale geschatte tijd per dag én bovenin de pagina
- Slepen om volgorde te wijzigen, ook tussen verschillende dagen
- Rondje rechts afvinken → bevestigingsdialog "Echt klaar?"
- Afgevinkte taken staan onderaan in de Klaar-sectie (inklapbaar)
- **Slimme zoekbalk** bovenin: live filteren op alle woorden, treffers worden geel gemarkeerd
- Sneltoets `/` om te zoeken, `Escape` om te wissen
- Real-time sync tussen apparaten (wijziging op telefoon → direct zichtbaar op laptop)
- Responsive: 3 kolommen op desktop, 2 op tablet, 1 op telefoon

## Techniek

| Onderdeel | Keuze |
|-----------|-------|
| Frontend | Vanilla HTML / CSS / JavaScript |
| Database | [Supabase](https://supabase.com) (PostgreSQL, real-time) |
| Hosting | GitHub Pages |
| Drag-and-drop | [SortableJS](https://sortablejs.github.io/Sortable/) |

## Lokaal draaien

Open `index.html` rechtstreeks in de browser — geen build-stap nodig.

## Configuratie

Vul je Supabase-credentials in `config.js`:

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

## Database

Voer `schema.sql` eenmalig uit in de Supabase SQL Editor om de `todos`-tabel aan te maken.
