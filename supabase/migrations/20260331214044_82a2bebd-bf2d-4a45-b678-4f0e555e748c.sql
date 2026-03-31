
-- House checklists (templates per house)
CREATE TABLE public.house_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'arrival',
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.house_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view checklists" ON public.house_checklists
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create checklists" ON public.house_checklists
  FOR INSERT TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update checklists" ON public.house_checklists
  FOR UPDATE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete checklists" ON public.house_checklists
  FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), house_id));

-- Checklist items
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.house_checklists(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_house_id_from_checklist(_checklist_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT house_id FROM public.house_checklists WHERE id = _checklist_id LIMIT 1;
$$;

CREATE POLICY "Members can view items" ON public.checklist_items
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), get_house_id_from_checklist(checklist_id)));

CREATE POLICY "Admins can create items" ON public.checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (is_house_admin(auth.uid(), get_house_id_from_checklist(checklist_id)));

CREATE POLICY "Admins can update items" ON public.checklist_items
  FOR UPDATE TO authenticated
  USING (is_house_admin(auth.uid(), get_house_id_from_checklist(checklist_id)));

CREATE POLICY "Admins can delete items" ON public.checklist_items
  FOR DELETE TO authenticated
  USING (is_house_admin(auth.uid(), get_house_id_from_checklist(checklist_id)));

-- Reservation checklist status (completion tracking)
CREATE TABLE public.reservation_checklist_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  completed_by_user_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(reservation_id, checklist_item_id)
);

ALTER TABLE public.reservation_checklist_status ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_house_id_from_checklist_item(_item_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hc.house_id FROM public.checklist_items ci
  JOIN public.house_checklists hc ON hc.id = ci.checklist_id
  WHERE ci.id = _item_id LIMIT 1;
$$;

CREATE POLICY "Members can view status" ON public.reservation_checklist_status
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), get_house_id_from_checklist_item(checklist_item_id)));

CREATE POLICY "Active members can complete items" ON public.reservation_checklist_status
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = completed_by_user_id
    AND is_house_active_member(auth.uid(), get_house_id_from_checklist_item(checklist_item_id))
  );

CREATE POLICY "Completer can uncomplete" ON public.reservation_checklist_status
  FOR DELETE TO authenticated
  USING (auth.uid() = completed_by_user_id);
