
-- Create search_usage table
CREATE TABLE public.search_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.search_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search usage" ON public.search_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own search usage" ON public.search_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search usage" ON public.search_usage
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
