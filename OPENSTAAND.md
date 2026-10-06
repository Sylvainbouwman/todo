# Openstaande punten ToDo_tool

## Open

### 2. Het Supabase-project wordt gedeeld met de kledingkast-app

- **Status:** open, gevonden op 02-10-2026
- **Eigenaar:** Sylvain
- **Vindplaats:** Supabase-project "Kledingkast"

Dezelfde database hoort ook bij de kledingkast-app. Haar tabellen zijn niet aangeraakt en het toegangsbeleid
daarvan moet in de repository van die app worden nagelopen. Het migratiescript gaat uit van precies een
gebruiker in dat project; komt er een tweede account bij (bijvoorbeeld voor die app), dan stopt het.

### 3. Het gratis project pauzeert na een week zonder gebruik

- **Status:** open, besluit 06-10-2026 van Sylvain: de workflow bouwen. Gebouwd in `.github/workflows/wakker.yml`
  (dagelijks 05:17 UTC, leest de openbare sleutel uit `config.js`, geen secret nodig). Sluit na de merge en een
  geslaagde eerste run (handmatig te starten via Actions, "Houd Supabase wakker").
- **Eigenaar:** Sylvain
- **Vindplaats:** `.github/workflows/wakker.yml`; Supabase-dashboard

Een gratis Supabase-project pauzeert na ongeveer een week zonder activiteit. Zolang het pauzeert kan de
planner geen taken laden, ook niet met een geldige sessie. Je blijft wel ingelogd: de sessie staat in de
browser en in de database van Supabase, en werkt weer na het hervatten. Let op: GitHub zet een geplande workflow in een openbare repository stil na 60 dagen zonder
activiteit in de repository; dan moet hij in Actions opnieuw worden ingeschakeld.

## Gesloten

### 1. De database stond voor iedereen open

- **Status:** gesloten op 02-10-2026
- **Eigenaar:** Sylvain
- **Vindplaats:** `schema.sql`, `migratie-eigenaar.sql`, `app.js`, `index.html`

Het beleid `Allow all` op `todos` liet iedereen met de publieke sleutel uit `config.js` alle taken lezen,
wijzigen en wissen. Opgelost met een inlogscherm (Supabase Auth, e-mail en wachtwoord) en een beleid dat
alleen de ingelogde eigenaar toelaat.

Bewijs op 02-10-2026: na de migratie geeft een telling zonder inlog 0 rijen terug; Sylvain logt in op de live
planner, ziet al zijn taken en kan afvinken; de openbare instelling `disable_signup` staat op `true`, dus
nieuwe registraties zijn uit. Niet gemeten: schrijven zonder inlog tegen een bestaande taak (dat zou de
echte taken raken).

Hermeting op 06-10-2026 22:36 CEST, zonder inlog en alleen met de openbare sleutel: lezen van `todos` geeft
0 rijen (status 200), een wijziging en een verwijdering tegen een niet-bestaande id geven elk een lege lijst
terug, `disable_signup` staat nog op `true` en de openbare sleutel ziet geen enkele tabel. Het beleid
"Eigen taken" in `schema.sql` geldt alleen voor de rol `authenticated`. Er is niets geschreven naar de echte
taken. Geen datalek gevonden.
