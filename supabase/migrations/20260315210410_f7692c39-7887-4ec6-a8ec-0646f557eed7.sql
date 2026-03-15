
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_team_id uuid;
  team_display_name text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  team_display_name := COALESCE(
    NULLIF(TRIM(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1)), ''),
    NULLIF(TRIM(split_part(NEW.email, '@', 1)), ''),
    'Mitt team'
  );

  INSERT INTO public.teams (name, owner_id, plan)
  VALUES (team_display_name || 's team', NEW.id, 'starter')
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (new_team_id, NEW.id, 'owner', 'active');

  UPDATE public.profiles SET team_id = new_team_id WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

UPDATE public.teams t
SET name = COALESCE(
  NULLIF(TRIM(p.display_name), ''),
  NULLIF(TRIM(split_part(COALESCE(p.full_name, ''), ' ', 1)), ''),
  NULLIF(TRIM(split_part(COALESCE(p.email, ''), '@', 1)), ''),
  'Mitt team'
) || 's team'
FROM public.profiles p
WHERE p.id = t.owner_id;
