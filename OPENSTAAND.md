# Openstaande punten ToDo_tool

## Open

### 1. De database staat voor iedereen open

- **Status:** in uitvoering, code klaar op 02-10-2026 op een eigen branch; wacht op de stappen van Sylvain
  hieronder. Pas gesloten als hij heeft bevestigd dat inloggen werkt en de controle van de toegang is gedaan.
- **Eigenaar:** Sylvain
- **Vindplaats:** `schema.sql`, `migratie-eigenaar.sql`, `app.js`, `index.html`

Oorzaak: het beleid `Allow all` op `todos` liet iedereen met de publieke sleutel uit `config.js` alle taken
lezen, wijzigen en wissen (bevestigd in het Supabase-dashboard op 02-10-2026).

Oplossing: de planner heeft een inlogscherm met e-mail en wachtwoord (Supabase Auth, sessie blijft in de
browser en wordt stil vernieuwd). `migratie-eigenaar.sql` voegt `user_id` toe, vult die voor de bestaande
taken en vervangt het open beleid door een beleid dat alleen de ingelogde eigenaar toelaat.

Volgorde van de uitrol:

1. Branch mergen (de nieuwe planner met inlog komt live; het oude beleid staat dan nog open).
2. Account aanmaken in het Supabase-dashboard en een keer inloggen op de live planner.
3. `migratie-eigenaar.sql` draaien in de SQL Editor.
4. Registratie van nieuwe gebruikers uitzetten.
5. Controle dat zonder inlog niets uit `todos` terugkomt.

### 2. Het Supabase-project wordt gedeeld met de kledingkast-app

- **Status:** open, gevonden op 02-10-2026
- **Eigenaar:** Sylvain
- **Vindplaats:** Supabase-project "Kledingkast"

Dezelfde database hoort ook bij de kledingkast-app. Haar tabellen zijn niet aangeraakt en het toegangsbeleid
daarvan moet in de repository van die app worden nagelopen. Het migratiescript gaat uit van precies een
gebruiker in dat project; komt er een tweede account bij (bijvoorbeeld voor die app), dan stopt het.

### 3. Het gratis project pauzeert na een week zonder gebruik

- **Status:** open, voorstel wacht op akkoord van Sylvain
- **Eigenaar:** Sylvain
- **Vindplaats:** Supabase-dashboard; voorstel: een geplande GitHub-workflow die dagelijks een lichte aanroep doet

Een gratis Supabase-project pauzeert na ongeveer een week zonder activiteit. Zolang het pauzeert kan de
planner geen taken laden, ook niet met een geldige sessie. Je blijft wel ingelogd: de sessie staat in de
browser en in de database van Supabase, en werkt weer na het hervatten.
