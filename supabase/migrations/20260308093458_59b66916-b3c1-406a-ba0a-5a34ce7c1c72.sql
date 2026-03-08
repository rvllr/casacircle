
-- 1. Create a function to check if two users share at least one house or family
CREATE OR REPLACE FUNCTION public.is_co_member(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _viewer_id = _target_user_id
    OR EXISTS (
      -- Share a house via house_members
      SELECT 1 FROM public.house_members hm1
      JOIN public.house_members hm2 ON hm1.house_id = hm2.house_id
      WHERE hm1.user_id = _viewer_id AND hm2.user_id = _target_user_id
    )
    OR EXISTS (
      -- Share a family
      SELECT 1 FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = _viewer_id AND fm2.user_id = _target_user_id
    )
$$;

-- 2. Replace the overly permissive users_profiles SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users_profiles;
CREATE POLICY "Users can view co-member profiles"
  ON public.users_profiles FOR SELECT
  TO authenticated
  USING (public.is_co_member(auth.uid(), user_id));

-- 3. Remove the public INSERT policy on notifications (only triggers should create them)
DROP POLICY IF EXISTS "Insert own notifications" ON public.notifications;

-- 4. Add DELETE policies for creators on bookings
CREATE POLICY "Booking owner can cancel own booking"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Add DELETE/UPDATE policies for house_news creators
CREATE POLICY "Creator can update news"
  ON public.house_news FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete news"
  ON public.house_news FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 6. Add DELETE/UPDATE policies for house_memories creators
CREATE POLICY "Creator can update memories"
  ON public.house_memories FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete memories"
  ON public.house_memories FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 7. Add DELETE policy for votes creators
CREATE POLICY "Creator can delete votes"
  ON public.votes FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 8. Add UPDATE policy for votes creators
CREATE POLICY "Creator can update votes"
  ON public.votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);
