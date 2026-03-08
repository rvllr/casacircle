
-- Drop existing constraint that only allows owner/member
ALTER TABLE public.house_members DROP CONSTRAINT IF EXISTS house_members_role_check;

-- Convert owner to admin
UPDATE public.house_members SET role = 'admin' WHERE role = 'owner';

-- Add new constraint with 3 roles
ALTER TABLE public.house_members ADD CONSTRAINT house_members_role_check 
  CHECK (role IN ('admin', 'member', 'guest'));

ALTER TABLE public.house_members ALTER COLUMN role SET DEFAULT 'member';

-- Recreate policies
DROP POLICY IF EXISTS "House owner can add members" ON public.house_members;
DROP POLICY IF EXISTS "House admin can add members" ON public.house_members;
DROP POLICY IF EXISTS "House members can view members" ON public.house_members;
DROP POLICY IF EXISTS "House owner can remove members" ON public.house_members;
DROP POLICY IF EXISTS "House admin can remove members" ON public.house_members;
DROP POLICY IF EXISTS "House admin can update members" ON public.house_members;

CREATE POLICY "House admin can add members" ON public.house_members
  FOR INSERT TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id) OR (auth.uid() = user_id AND role = 'admin'));

CREATE POLICY "House members can view members" ON public.house_members
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id) OR auth.uid() = user_id);

CREATE POLICY "House admin can remove members" ON public.house_members
  FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "House admin can update members" ON public.house_members
  FOR UPDATE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

-- is_house_active_member function
CREATE OR REPLACE FUNCTION public.is_house_active_member(_user_id uuid, _house_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id AND house_id = _house_id AND role IN ('admin', 'member')
  )
  OR EXISTS (
    SELECT 1 FROM public.houses h
    JOIN public.family_members fm ON fm.family_id = h.family_id
    WHERE h.id = _house_id AND fm.user_id = _user_id AND h.family_id IS NOT NULL
  );
END;
$$;

-- Update RLS: only active members can create
DROP POLICY IF EXISTS "Members can create bookings" ON public.bookings;
CREATE POLICY "Members can create bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_house_active_member(auth.uid(), house_id));

DROP POLICY IF EXISTS "Members can create expenses" ON public.expenses;
CREATE POLICY "Members can create expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = paid_by AND is_house_active_member(auth.uid(), house_id));

DROP POLICY IF EXISTS "Members can create memories" ON public.house_memories;
CREATE POLICY "Members can create memories" ON public.house_memories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_house_active_member(auth.uid(), house_id));

-- Drop unused house_role enum type
DROP TYPE IF EXISTS public.house_role;
