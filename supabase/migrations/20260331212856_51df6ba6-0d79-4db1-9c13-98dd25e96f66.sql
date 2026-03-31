
-- Add voting mode and majority rule to votes table
ALTER TABLE public.votes 
  ADD COLUMN IF NOT EXISTS voting_mode text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS majority_rule text NOT NULL DEFAULT 'simple';

-- Create decision register table
CREATE TABLE public.decision_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid REFERENCES public.votes(id) ON DELETE SET NULL,
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  decision text NOT NULL DEFAULT 'approved',
  decided_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  yes_count integer DEFAULT 0,
  no_count integer DEFAULT 0,
  abstain_count integer DEFAULT 0,
  yes_weighted numeric DEFAULT 0,
  no_weighted numeric DEFAULT 0,
  majority_rule text DEFAULT 'simple',
  voting_mode text DEFAULT 'simple'
);

ALTER TABLE public.decision_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view decisions" ON public.decision_register
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create decisions" ON public.decision_register
  FOR INSERT TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete decisions" ON public.decision_register
  FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));
