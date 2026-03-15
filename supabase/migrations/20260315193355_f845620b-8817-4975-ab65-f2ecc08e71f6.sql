
CREATE TABLE public.lead_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('cold_email', 'dm', 'sales_pitch')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead content" ON public.lead_content
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own lead content" ON public.lead_content
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own lead content" ON public.lead_content
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_lead_content_lead_user ON public.lead_content(lead_id, user_id);
