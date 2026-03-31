
-- Add join_code column to houses
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS join_code text UNIQUE;

-- Generate join codes for existing houses
UPDATE public.houses 
SET join_code = 'CASA-' || upper(substr(md5(random()::text || id::text), 1, 6))
WHERE join_code IS NULL;

-- Function to auto-generate join_code on new houses
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := 'CASA-' || upper(substr(md5(random()::text || NEW.id::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_join_code_on_insert
  BEFORE INSERT ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_join_code();

-- Security definer function to join a house by code
CREATE OR REPLACE FUNCTION public.join_house_by_code(_join_code text, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _house_id uuid;
BEGIN
  -- Find house by join code
  SELECT id INTO _house_id FROM public.houses WHERE join_code = upper(trim(_join_code));
  
  IF _house_id IS NULL THEN
    RAISE EXCEPTION 'Code invalide. Vérifiez le code et réessayez.';
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.house_members WHERE house_id = _house_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'Vous êtes déjà membre de cette maison.';
  END IF;

  -- Add as member
  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (_house_id, _user_id, 'member');

  RETURN _house_id;
END;
$$;
