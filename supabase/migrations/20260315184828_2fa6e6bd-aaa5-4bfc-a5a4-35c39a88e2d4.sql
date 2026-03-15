-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'starter',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL DEFAULT 'member',
  invited_email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Add team_id to companies
ALTER TABLE public.companies ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add team_id to saved_filters
ALTER TABLE public.saved_filters ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add team_id to saved_watchlists
ALTER TABLE public.saved_watchlists ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add team_id to profiles
ALTER TABLE public.profiles ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Helper function: get user's team_id (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members
  WHERE user_id = _user_id AND status = 'active'
  LIMIT 1;
$$;

-- Helper: check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id AND status = 'active'
  );
$$;

-- Helper: check if user is team admin/owner
CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id AND role IN ('owner', 'admin') AND status = 'active'
  );
$$;

-- RLS for teams
CREATE POLICY "Team members can view their team"
ON public.teams FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid(), id));

CREATE POLICY "Only owner can update team"
ON public.teams FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- RLS for team_members
CREATE POLICY "Team members can view team members"
ON public.team_members FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Admins can insert team members"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (public.is_team_admin(auth.uid(), team_id) OR user_id = auth.uid());

CREATE POLICY "Admins can update team members"
ON public.team_members FOR UPDATE TO authenticated
USING (public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Admins can delete team members"
ON public.team_members FOR DELETE TO authenticated
USING (public.is_team_admin(auth.uid(), team_id));

-- Auto-create team for existing users
DO $$
DECLARE
  r RECORD;
  new_team_id uuid;
BEGIN
  FOR r IN SELECT id, email FROM public.profiles LOOP
    INSERT INTO public.teams (name, owner_id, plan)
    VALUES (COALESCE(split_part(r.email, '@', 1), 'Mitt team') || '''s team', r.id, 'starter')
    RETURNING id INTO new_team_id;

    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (new_team_id, r.id, 'owner', 'active');

    UPDATE public.profiles SET team_id = new_team_id WHERE id = r.id;

    UPDATE public.companies SET team_id = new_team_id
    WHERE team_id IS NULL;

    UPDATE public.saved_filters SET team_id = new_team_id WHERE user_id = r.id;
    UPDATE public.saved_watchlists SET team_id = new_team_id WHERE user_id = r.id;
  END LOOP;
END;
$$;

-- Update handle_new_user to auto-create team
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $func$
DECLARE
  new_team_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.teams (name, owner_id, plan)
  VALUES (COALESCE(split_part(NEW.email, '@', 1), 'Mitt team') || '''s team', NEW.id, 'starter')
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (new_team_id, NEW.id, 'owner', 'active');

  UPDATE public.profiles SET team_id = new_team_id WHERE id = NEW.id;

  RETURN NEW;
END;
$func$;