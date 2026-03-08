
-- Fix the security definer view by using security_invoker = true
-- and instead making it a simple view that filters columns
DROP VIEW IF EXISTS public.public_houses;

CREATE OR REPLACE VIEW public.public_houses
WITH (security_invoker = true)
AS
SELECT 
  id, name, description, location, photo_url, capacity, is_public, booking_auto_approve, family_id, created_at
FROM public.houses
WHERE is_public = true;

GRANT SELECT ON public.public_houses TO anon, authenticated;
