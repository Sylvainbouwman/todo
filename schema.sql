-- Run this in the Supabase SQL editor to set up the database

CREATE TABLE todos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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
CREATE POLICY "Allow all" ON todos FOR ALL USING (true) WITH CHECK (true);
