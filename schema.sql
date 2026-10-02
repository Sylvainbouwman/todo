-- Eindstand van de database, voor een nieuwe installatie. Run dit in de Supabase SQL Editor.
-- Een bestaande database met taken zet je om met migratie-eigenaar.sql, niet met dit bestand.

CREATE TABLE todos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  due_time time,
  duration_minutes integer,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  position float8 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Alleen de ingelogde eigenaar ziet en wijzigt zijn eigen taken. Zonder inlog (rol anon)
-- bestaat er geen beleid, dus komt er niets terug en lukt schrijven niet.
CREATE POLICY "Eigen taken" ON todos
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
