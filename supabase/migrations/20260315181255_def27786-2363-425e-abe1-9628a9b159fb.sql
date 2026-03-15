
-- Lead notes table
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'note' CHECK (note_type IN ('note', 'call', 'email', 'meeting')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead notes" ON public.lead_notes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own lead notes" ON public.lead_notes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own lead notes" ON public.lead_notes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own lead notes" ON public.lead_notes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Lead activity table
CREATE TABLE IF NOT EXISTS public.lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead activity" ON public.lead_activity
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert lead activity" ON public.lead_activity
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Trigger to update updated_at on lead_notes
CREATE TRIGGER update_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
