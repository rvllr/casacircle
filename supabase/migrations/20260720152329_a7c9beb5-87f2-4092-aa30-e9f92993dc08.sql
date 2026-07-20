DROP POLICY IF EXISTS "Members can add photos" ON public.memory_photos;
CREATE POLICY "Active members can add photos"
ON public.memory_photos
FOR INSERT
TO authenticated
WITH CHECK (public.is_house_active_member(auth.uid(), public.get_house_id_from_memory(memory_id)));