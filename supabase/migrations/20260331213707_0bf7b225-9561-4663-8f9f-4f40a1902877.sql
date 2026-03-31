
-- Family pacts for governance
CREATE TABLE public.family_pacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.family_pacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view pacts" ON public.family_pacts
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create pacts" ON public.family_pacts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update pacts" ON public.family_pacts
  FOR UPDATE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete pacts" ON public.family_pacts
  FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

-- Pact signatures
CREATE TABLE public.pact_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pact_id uuid NOT NULL REFERENCES public.family_pacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(pact_id, user_id)
);

ALTER TABLE public.pact_signatures ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_house_id_from_pact(_pact_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT house_id FROM public.family_pacts WHERE id = _pact_id LIMIT 1;
$$;

CREATE POLICY "Members can view signatures" ON public.pact_signatures
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), get_house_id_from_pact(pact_id)));

CREATE POLICY "Members can sign" ON public.pact_signatures
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_house_active_member(auth.uid(), get_house_id_from_pact(pact_id)));
