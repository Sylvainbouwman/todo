-- Eenmalig draaien in de Supabase SQL Editor, voor de bestaande database met taken.
--
-- Volgorde: eerst staat de planner met inlogscherm live en bestaat jouw account onder
-- Authentication > Users. Pas daarna draai je dit. Het script doet alles in een transactie:
-- lukt een stap niet, dan blijft de database zoals hij was.
--
-- 1. Controleert dat er precies een gebruiker is (jij). Anders stopt het.
-- 2. Voegt de kolom user_id toe en vult die voor alle bestaande taken met jouw id.
-- 3. Vervangt het beleid "Allow all" door een beleid dat alleen jouw taken toelaat.

BEGIN;

DO $$
DECLARE
  aantal integer;
  eigenaar uuid;
BEGIN
  SELECT count(*) INTO aantal FROM auth.users;
  IF aantal <> 1 THEN
    RAISE EXCEPTION 'Verwacht precies 1 gebruiker in auth.users, gevonden: %. Niets gewijzigd.', aantal;
  END IF;
  SELECT id INTO eigenaar FROM auth.users;

  ALTER TABLE todos
    ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE;
  UPDATE todos SET user_id = eigenaar WHERE user_id IS NULL;
  ALTER TABLE todos ALTER COLUMN user_id SET NOT NULL;
END
$$;

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON todos;
DROP POLICY IF EXISTS "Eigen taken" ON todos;
CREATE POLICY "Eigen taken" ON todos
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

COMMIT;
