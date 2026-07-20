
-- 1. Memories bucket: replace open policies with member-scoped policies.
DROP POLICY IF EXISTS "Public memory photos read access" ON storage.objects;
DROP POLICY IF EXISTS "Family members can upload memory photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own memory photos" ON storage.objects;

CREATE POLICY "House members can view memory photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'memories'
  AND public.is_house_member(
    auth.uid(),
    public.get_house_id_from_memory(((storage.foldername(name))[2])::uuid)
  )
);

CREATE POLICY "House members can upload memory photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'memories'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_house_member(
    auth.uid(),
    public.get_house_id_from_memory(((storage.foldername(name))[2])::uuid)
  )
);

CREATE POLICY "Owners can delete their memory photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'memories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. house-photos: require house admin for writes (bucket stays public-read for now).
DROP POLICY IF EXISTS "Authenticated users can upload house photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update house photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete house photos" ON storage.objects;

CREATE POLICY "House admins can upload house photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'house-photos'
  AND public.is_house_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "House admins can update house photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'house-photos'
  AND public.is_house_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "House admins can delete house photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'house-photos'
  AND public.is_house_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 3. Revoke EXECUTE on internal SECURITY DEFINER helpers from anon and public.
--   These helpers back RLS policies for authenticated users only; anonymous
--   visitors have no legitimate reason to call them directly.
REVOKE EXECUTE ON FUNCTION public.is_house_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_house_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_house_active_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_family_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_co_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_memory(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_vote(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_unit(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_expense(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_booking(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_checklist(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_checklist_item(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_house_id_from_pact(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_space_id_from_vote(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_family_id_from_house(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_house_by_code(text, uuid) FROM anon, public;
