
-- Houses
CREATE TABLE public.houses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  capacity INTEGER,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view houses" ON public.houses
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can create houses" ON public.houses
FOR INSERT TO authenticated WITH CHECK (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can update houses" ON public.houses
FOR UPDATE TO authenticated USING (public.is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can delete houses" ON public.houses
FOR DELETE TO authenticated USING (public.is_family_admin(auth.uid(), family_id));

-- Booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'refused', 'cancelled');

-- Bookings
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Helper: get family_id from house_id
CREATE OR REPLACE FUNCTION public.get_family_id_from_house(_house_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.houses WHERE id = _house_id
$$;

CREATE POLICY "Family members can view bookings" ON public.bookings
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create bookings" ON public.bookings
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id))
);

CREATE POLICY "Admins can update bookings" ON public.bookings
FOR UPDATE TO authenticated USING (
  public.is_family_admin(auth.uid(), public.get_family_id_from_house(house_id))
  OR auth.uid() = user_id
);

-- House news
CREATE TABLE public.house_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.house_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view news" ON public.house_news
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create news" ON public.house_news
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = created_by AND
  public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id))
);

-- House memories
CREATE TABLE public.house_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visit_start DATE,
  visit_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.house_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view memories" ON public.house_memories
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create memories" ON public.house_memories
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = created_by AND
  public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id))
);

-- Memory photos
CREATE TABLE public.memory_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.house_memories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_photos ENABLE ROW LEVEL SECURITY;

-- Helper: get house_id from memory
CREATE OR REPLACE FUNCTION public.get_house_id_from_memory(_memory_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT house_id FROM public.house_memories WHERE id = _memory_id
$$;

CREATE POLICY "Family members can view memory photos" ON public.memory_photos
FOR SELECT TO authenticated USING (
  public.is_family_member(auth.uid(), public.get_family_id_from_house(public.get_house_id_from_memory(memory_id)))
);

CREATE POLICY "Memory creator can add photos" ON public.memory_photos
FOR INSERT TO authenticated WITH CHECK (
  public.is_family_member(auth.uid(), public.get_family_id_from_house(public.get_house_id_from_memory(memory_id)))
);
