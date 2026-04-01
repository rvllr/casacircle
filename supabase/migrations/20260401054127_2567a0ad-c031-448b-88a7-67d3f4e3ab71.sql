-- Add SELECT policy for creators to see their own families
CREATE POLICY "Creators can view their families"
ON public.families
FOR SELECT
TO authenticated
USING (created_by = auth.uid());