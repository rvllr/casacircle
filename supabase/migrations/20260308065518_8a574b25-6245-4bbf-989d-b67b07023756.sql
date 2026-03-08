
-- Create unit_type enum
CREATE TYPE public.unit_type AS ENUM ('building', 'room');

-- Create house_units table
CREATE TABLE public.house_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.unit_type NOT NULL DEFAULT 'room',
  parent_id uuid REFERENCES public.house_units(id) ON DELETE CASCADE,
  capacity integer,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.house_units ENABLE ROW LEVEL SECURITY;

-- RLS: same access as the house
CREATE POLICY "Members can view units"
ON public.house_units FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create units"
ON public.house_units FOR INSERT TO authenticated
WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update units"
ON public.house_units FOR UPDATE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete units"
ON public.house_units FOR DELETE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- Add optional unit_id to bookings (null = whole house)
ALTER TABLE public.bookings ADD COLUMN unit_id uuid REFERENCES public.house_units(id) ON DELETE SET NULL;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_house_id_from_unit(_unit_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT house_id FROM public.house_units WHERE id = _unit_id
$$;
