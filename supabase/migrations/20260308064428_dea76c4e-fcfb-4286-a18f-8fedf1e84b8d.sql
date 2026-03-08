
-- Create memories storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO NOTHING;

-- Allow family members to upload photos to memories
CREATE POLICY "Family members can upload memory photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memories');

-- Allow public read access
CREATE POLICY "Public memory photos read access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'memories');

-- Allow uploaders to delete their own photos
CREATE POLICY "Users can delete own memory photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);
