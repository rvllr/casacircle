
-- Add is_public flag to houses
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Allow anonymous/public SELECT on houses when is_public = true
CREATE POLICY "Public can view public houses"
ON public.houses FOR SELECT TO anon
USING (is_public = true);

-- Allow public SELECT on house_guides for public houses
CREATE POLICY "Public can view guides of public houses"
ON public.house_guides FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.houses WHERE id = house_id AND is_public = true));

-- Allow public SELECT on house_units for public houses
CREATE POLICY "Public can view units of public houses"
ON public.house_units FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.houses WHERE id = house_id AND is_public = true));
