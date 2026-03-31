
-- Create space document type enum
CREATE TYPE public.space_document_type AS ENUM ('statuts_sci', 'pacte_familial', 'juridique', 'assemblee_generale', 'fiscal', 'other');

-- Create space_documents table
CREATE TABLE public.space_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  type public.space_document_type NOT NULL DEFAULT 'other',
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.space_documents ENABLE ROW LEVEL SECURITY;

-- RLS for space_documents
CREATE POLICY "Members can view space documents"
  ON public.space_documents FOR SELECT TO authenticated
  USING (is_family_member(auth.uid(), space_id));

CREATE POLICY "Admins can create space documents"
  ON public.space_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by AND is_family_admin(auth.uid(), space_id));

CREATE POLICY "Admins can update space documents"
  ON public.space_documents FOR UPDATE TO authenticated
  USING (is_family_admin(auth.uid(), space_id));

CREATE POLICY "Admins can delete space documents"
  ON public.space_documents FOR DELETE TO authenticated
  USING (is_family_admin(auth.uid(), space_id));

-- Add space_id to votes (nullable, for space-level votes)
ALTER TABLE public.votes ADD COLUMN space_id uuid REFERENCES public.families(id) ON DELETE CASCADE;

-- Make house_id nullable on votes (space-level votes have no house)
ALTER TABLE public.votes ALTER COLUMN house_id DROP NOT NULL;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_space_id_from_vote(_vote_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT space_id FROM public.votes WHERE id = _vote_id
$$;

-- Allow space members to view space-level votes
CREATE POLICY "Space members can view space votes"
  ON public.votes FOR SELECT TO authenticated
  USING (space_id IS NOT NULL AND is_family_member(auth.uid(), space_id));

-- Allow space members to create space-level votes
CREATE POLICY "Space members can create space votes"
  ON public.votes FOR INSERT TO authenticated
  WITH CHECK (space_id IS NOT NULL AND auth.uid() = created_by AND is_family_member(auth.uid(), space_id));

-- Allow space vote creator to update
CREATE POLICY "Space vote creator can update"
  ON public.votes FOR UPDATE TO authenticated
  USING (space_id IS NOT NULL AND auth.uid() = created_by);

-- Allow space vote creator to delete
CREATE POLICY "Space vote creator can delete"
  ON public.votes FOR DELETE TO authenticated
  USING (space_id IS NOT NULL AND auth.uid() = created_by);

-- Allow space members to vote on space votes
CREATE POLICY "Space members can vote on space votes"
  ON public.vote_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND get_space_id_from_vote(vote_id) IS NOT NULL AND is_family_member(auth.uid(), get_space_id_from_vote(vote_id)));

-- Allow space members to view space vote responses
CREATE POLICY "Space members can view space vote responses"
  ON public.vote_responses FOR SELECT TO authenticated
  USING (get_space_id_from_vote(vote_id) IS NOT NULL AND is_family_member(auth.uid(), get_space_id_from_vote(vote_id)));
