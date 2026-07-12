/*
# Admin account designation

Updates handle_new_user so that the account signing up with email 'admin@wangdao.com'
is automatically assigned role = 'admin' in profiles. All other signups default to 'reader'
(unless later promoted to 'author' by consuming a registration code).

This keeps admin access tied to one specific account without any client-side role logic.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'reader');
  -- Auto-promote the designated admin email
  IF lower(NEW.email) = 'admin@wangdao.com' THEN
    assigned_role := 'admin';
  END IF;
  INSERT INTO public.profiles (user_id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    assigned_role
  )
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role WHERE public.profiles.role <> EXCLUDED.role;
  RETURN NEW;
END;
$$;
