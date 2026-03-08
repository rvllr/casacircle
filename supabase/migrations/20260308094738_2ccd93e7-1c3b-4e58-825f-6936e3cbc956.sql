
-- Create blocked_periods table for admin calendar blocking
CREATE TABLE public.blocked_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view blocked periods"
  ON public.blocked_periods FOR SELECT
  TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create blocked periods"
  ON public.blocked_periods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete blocked periods"
  ON public.blocked_periods FOR DELETE
  TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

-- Add a storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

-- RLS for documents bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');
