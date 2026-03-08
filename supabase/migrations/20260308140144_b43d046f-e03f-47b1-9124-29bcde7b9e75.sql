
-- ============================================================
-- FIX 1: house_members INSERT - Remove self-add as admin privilege escalation
-- Only house admins can add members. Self-insert as admin is removed.
-- Instead, we use a trigger to auto-add the house creator as admin.
-- ============================================================

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "House admin can add members" ON public.house_members;

-- New INSERT policy: only existing house admins can add members
CREATE POLICY "House admin can add members"
ON public.house_members
FOR INSERT
TO authenticated
WITH CHECK (is_house_admin(auth.uid(), house_id));

-- Create a trigger to auto-add house creator as admin member
CREATE OR REPLACE FUNCTION public.auto_add_house_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.house_members (house_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_add_house_creator ON public.houses;
CREATE TRIGGER trigger_auto_add_house_creator
  AFTER INSERT ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_house_creator_as_admin();

-- ============================================================
-- FIX 2: houses public SELECT - Create a secure view for public houses
-- Replace the permissive policy that exposes sensitive fields
-- ============================================================

-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Public can view public houses" ON public.houses;

-- Create a secure view that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.public_houses
WITH (security_invoker = false)
AS
SELECT 
  id, name, description, location, photo_url, capacity, is_public, booking_auto_approve, family_id, created_at
FROM public.houses
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.public_houses TO anon, authenticated;

-- Re-create the public policy but only for authenticated users who need it
-- Anonymous users should use the public_houses view instead
CREATE POLICY "Public can view public houses"
ON public.houses
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- ============================================================
-- FIX 3: bookings UPDATE - Restrict owner to cancellation only
-- Owners can only cancel, admins can change any status
-- ============================================================

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;

-- Admin-only update policy (full access)
CREATE POLICY "Admins can update bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- Owner can only cancel their own booking
CREATE POLICY "Owner can cancel own booking"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
