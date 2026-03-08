
-- Create a public storage bucket for house cover photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('house-photos', 'house-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload house photos
CREATE POLICY "Authenticated users can upload house photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'house-photos');

-- Allow anyone to view house photos (public bucket)
CREATE POLICY "Anyone can view house photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'house-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update house photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'house-photos');

-- Allow authenticated users to delete house photos
CREATE POLICY "Authenticated users can delete house photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'house-photos');
