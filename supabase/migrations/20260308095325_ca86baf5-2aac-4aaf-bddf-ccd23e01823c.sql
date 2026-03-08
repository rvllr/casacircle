
-- Create pricing mode enum
CREATE TYPE public.pricing_mode AS ENUM ('per_night', 'per_person', 'per_person_per_night');

-- Create house_pricing table
CREATE TABLE public.house_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  pricing_mode public.pricing_mode NOT NULL DEFAULT 'per_night',
  base_price numeric NOT NULL DEFAULT 0,
  cap_amount numeric DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(house_id)
);

ALTER TABLE public.house_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view house pricing"
  ON public.house_pricing FOR SELECT
  TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create house pricing"
  ON public.house_pricing FOR INSERT
  TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update house pricing"
  ON public.house_pricing FOR UPDATE
  TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete house pricing"
  ON public.house_pricing FOR DELETE
  TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

-- Add trigger for updated_at
CREATE TRIGGER update_house_pricing_updated_at
  BEFORE UPDATE ON public.house_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
