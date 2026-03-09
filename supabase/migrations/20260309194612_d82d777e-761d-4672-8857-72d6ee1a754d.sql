ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS fetched_rows integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_rows integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_rows integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text;