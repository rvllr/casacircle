
-- Drop all existing RESTRICTIVE policies on houses
DROP POLICY IF EXISTS "Users can create houses" ON public.houses;
DROP POLICY IF EXISTS "Members can view houses" ON public.houses;
DROP POLICY IF EXISTS "Admins can update houses" ON public.houses;
DROP POLICY IF EXISTS "Admins can delete houses" ON public.houses;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can create houses" ON public.houses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR (family_id IS NOT NULL AND is_family_admin(auth.uid(), family_id)));

CREATE POLICY "Members can view houses" ON public.houses
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), id) OR auth.uid() = owner_id);

CREATE POLICY "Admins can update houses" ON public.houses
  FOR UPDATE TO authenticated
  USING (is_house_admin(auth.uid(), id));

CREATE POLICY "Admins can delete houses" ON public.houses
  FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), id));

-- Also fix house_members so the owner can insert themselves after creating a house
DROP POLICY IF EXISTS "House owner can add members" ON public.house_members;
DROP POLICY IF EXISTS "House members can view members" ON public.house_members;
DROP POLICY IF EXISTS "House owner can remove members" ON public.house_members;

CREATE POLICY "House owner can add members" ON public.house_members
  FOR INSERT TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id) OR (auth.uid() = user_id AND role = 'owner'));

CREATE POLICY "House members can view members" ON public.house_members
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id) OR auth.uid() = user_id);

CREATE POLICY "House owner can remove members" ON public.house_members
  FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));
