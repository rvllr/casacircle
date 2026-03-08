
-- Create price_type enum
CREATE TYPE public.price_type AS ENUM ('absolute', 'multiplier');

-- Create pricing_periods table
CREATE TABLE public.pricing_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  start_day INTEGER NOT NULL CHECK (start_day >= 1 AND start_day <= 31),
  end_month INTEGER NOT NULL CHECK (end_month >= 1 AND end_month <= 12),
  end_day INTEGER NOT NULL CHECK (end_day >= 1 AND end_day <= 31),
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  price_type public.price_type NOT NULL DEFAULT 'absolute',
  price_value NUMERIC NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view pricing periods"
  ON public.pricing_periods FOR SELECT
  TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create pricing periods"
  ON public.pricing_periods FOR INSERT
  TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update pricing periods"
  ON public.pricing_periods FOR UPDATE
  TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete pricing periods"
  ON public.pricing_periods FOR DELETE
  TO authenticated
  USING (is_house_admin(auth.uid(), house_id));
