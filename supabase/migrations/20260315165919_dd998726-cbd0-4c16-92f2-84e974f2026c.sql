
-- Add notification columns to saved_watchlists
ALTER TABLE public.saved_watchlists
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS notify_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_frequency text NOT NULL DEFAULT 'instant';

-- Create notification_log table
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  watchlist_id uuid NOT NULL REFERENCES public.saved_watchlists(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  email_subject text,
  status text NOT NULL DEFAULT 'sent',
  UNIQUE(watchlist_id, lead_id)
);

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_log
CREATE POLICY "Users can view own notification logs"
  ON public.notification_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access on notification_log"
  ON public.notification_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add global notification preferences to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_notify_frequency text NOT NULL DEFAULT 'instant';
