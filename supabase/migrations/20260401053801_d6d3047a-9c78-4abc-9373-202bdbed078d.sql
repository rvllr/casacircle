
-- Fix families INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families"
ON public.families
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Set default for created_by
ALTER TABLE public.families ALTER COLUMN created_by SET DEFAULT auth.uid();
