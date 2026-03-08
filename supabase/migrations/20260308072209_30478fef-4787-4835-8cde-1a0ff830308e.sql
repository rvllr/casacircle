
-- Step 1: Create enum and update function to use text casts (compatible with both text and enum)
DO $$ BEGIN
  CREATE TYPE public.house_role AS ENUM ('admin', 'member', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update is_house_admin to use text casts so it works regardless of column type
CREATE OR REPLACE FUNCTION public.is_house_admin(_user_id uuid, _house_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id AND house_id = _house_id AND role::text IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.houses h
    JOIN public.family_members fm ON fm.family_id = h.family_id
    WHERE h.id = _house_id AND fm.user_id = _user_id AND fm.role::text = 'admin' AND h.family_id IS NOT NULL
  );
END;
$$;

-- Also update is_house_member to use text casts
CREATE OR REPLACE FUNCTION public.is_house_member(_user_id uuid, _house_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id AND house_id = _house_id
  )
  OR EXISTS (
    SELECT 1 FROM public.houses h
    JOIN public.family_members fm ON fm.family_id = h.family_id
    WHERE h.id = _house_id AND fm.user_id = _user_id AND h.family_id IS NOT NULL
  );
END;
$$;
