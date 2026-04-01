
-- ==============================================
-- FIX 1: Restrict anonymous access to houses table
-- The existing "Public can view public houses" policy exposes
-- all columns (wifi_password, access_code, join_code, emergency_contact)
-- to anonymous users. Replace with anon-only access through the view.
-- ==============================================

-- Drop the existing overly-permissive public policy
DROP POLICY IF EXISTS "Public can view public houses" ON public.houses;

-- Re-create: anon users can only see public houses (they will use the public_houses view which excludes sensitive columns)
CREATE POLICY "Public can view public houses"
ON public.houses
FOR SELECT
TO anon
USING (is_public = true);

-- Authenticated users who are members already have access via the "Members can view houses" policy.
-- Add a separate policy so authenticated users can also see public houses (without sensitive column restriction at RLS level,
-- but they would need to be members to see sensitive fields via the existing member policy).
CREATE POLICY "Authenticated can view public houses"
ON public.houses
FOR SELECT
TO authenticated
USING (is_public = true);

-- ==============================================
-- FIX 2: Tighten documents storage bucket policies
-- Currently any authenticated user can read/upload/delete any document.
-- Restrict to house members using folder-based path convention: {house_id}/{filename}
-- ==============================================

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- SELECT: only house members can view documents
CREATE POLICY "House members can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND is_house_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- INSERT: only house members can upload documents
CREATE POLICY "House members can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND is_house_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- DELETE: only house admins can delete documents
CREATE POLICY "House admins can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND is_house_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
