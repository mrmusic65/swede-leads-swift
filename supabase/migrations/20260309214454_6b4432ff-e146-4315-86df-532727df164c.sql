
-- Event types enum
CREATE TYPE public.company_event_type AS ENUM (
  'company_registered',
  'vat_registered',
  'f_tax_registered',
  'employer_registered',
  'address_changed',
  'industry_changed'
);

-- Company events table
CREATE TABLE public.company_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type company_event_type NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_source TEXT,
  event_label TEXT,
  event_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved watchlists table
CREATE TABLE public.saved_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alert runs table
CREATE TABLE public.alert_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID NOT NULL REFERENCES public.saved_watchlists(id) ON DELETE CASCADE,
  matched_count INTEGER NOT NULL DEFAULT 0,
  run_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_runs ENABLE ROW LEVEL SECURITY;

-- company_events: all authenticated users can read, service role inserts
CREATE POLICY "Authenticated users can view events"
  ON public.company_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert events"
  ON public.company_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- saved_watchlists: user-scoped
CREATE POLICY "Users can view own watchlists"
  ON public.saved_watchlists FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create watchlists"
  ON public.saved_watchlists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists"
  ON public.saved_watchlists FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists"
  ON public.saved_watchlists FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- alert_runs: viewable by watchlist owner
CREATE POLICY "Users can view own alert runs"
  ON public.alert_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_watchlists w
      WHERE w.id = alert_runs.watchlist_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert alert runs"
  ON public.alert_runs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_watchlists w
      WHERE w.id = alert_runs.watchlist_id AND w.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_company_events_company_id ON public.company_events(company_id);
CREATE INDEX idx_company_events_type_date ON public.company_events(event_type, event_date DESC);
CREATE INDEX idx_company_events_created_at ON public.company_events(created_at DESC);
CREATE INDEX idx_alert_runs_watchlist_id ON public.alert_runs(watchlist_id);

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_events;
