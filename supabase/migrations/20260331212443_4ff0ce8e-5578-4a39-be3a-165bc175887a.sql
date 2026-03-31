
-- Ownership shares table
CREATE TABLE public.ownership_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  percentage numeric NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(house_id, user_id)
);

ALTER TABLE public.ownership_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ownership shares"
  ON public.ownership_shares FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create ownership shares"
  ON public.ownership_shares FOR INSERT TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update ownership shares"
  ON public.ownership_shares FOR UPDATE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete ownership shares"
  ON public.ownership_shares FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

CREATE TRIGGER update_ownership_shares_updated_at
  BEFORE UPDATE ON public.ownership_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ownership history table
CREATE TABLE public.ownership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  old_percentage numeric,
  new_percentage numeric,
  changed_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ownership_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ownership history"
  ON public.ownership_history FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "System can insert ownership history"
  ON public.ownership_history FOR INSERT TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id));

-- Add property_mode to houses
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS property_mode text NOT NULL DEFAULT 'indivision';
